import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:geolocator/geolocator.dart';
import 'package:pedometer/pedometer.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SensorMQTTPage extends StatefulWidget {
  const SensorMQTTPage({super.key});

  @override
  State<SensorMQTTPage> createState() => _SensorMQTTPageState();
}

class _SensorMQTTPageState extends State<SensorMQTTPage> {
  late MqttServerClient client;
  String status = 'Povezovanje...';

  int stepCount = 0;

  Timer? _timer;
  StreamSubscription<StepCount>? _stepSubscription;

// SPREMENI IP NASLOV!!! GLEDE NA SVOJO NAPRAVO!!!
  static const broker = '192.168.0.29';
  static const port = 1883;
  static const topic = 'sensors/test';

  bool _isPublishing = false;
  List<Map<String, dynamic>> _collectedData = [];

  String? _userId; // Shranimo user_id

  @override
  void initState() {
    super.initState();
    _loadUserIdAndSetup();
  }

  Future<void> _loadUserIdAndSetup() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getString('user_id');
    if (_userId == null) {
      _updateStatus('User ID ni najden. Prosim, prijavite se.');
      return;
    }

    final granted = await _requestPermissions();
    if (granted) {
      _initializeStepCounter();
      await _initializeMqttClient();
      await _connectToBroker();
    } else {
      _updateStatus('Dovoljenja za lokacijo ali pedometer zavrnjena.');
    }
  }

  void _initializeStepCounter() {
    _stepSubscription = Pedometer.stepCountStream.listen(
      (event) => setState(() {
        stepCount = event.steps;
      }),
      onError: (error) => _updateStatus('Napaka pri branju pedometra: $error'),
      cancelOnError: true,
    );
  }

  Future<void> _initializeMqttClient() async {
    client = MqttServerClient(broker, '');
    client.port = port;
    client.secure = false;
    client.logging(on: false);
    client.keepAlivePeriod = 20;
    client.onDisconnected = _onDisconnected;

    final connMessage = MqttConnectMessage()
        .withClientIdentifier('flutter_client_${Random().nextInt(10000)}')
        .startClean()
        .withWillQos(MqttQos.atLeastOnce);

    client.connectionMessage = connMessage;
  }

  Future<void> _connectToBroker() async {
    try {
      await client.connect();
      if (client.connectionStatus!.state == MqttConnectionState.connected) {
        _updateStatus('Povezan na MQTT strežnik!');
      } else {
        _updateStatus('Napaka: ${client.connectionStatus!.returnCode}');
      }
    } catch (e) {
      _updateStatus('Napaka pri povezavi: $e');
      client.disconnect();
      _retryConnection();
    }
  }

  void _retryConnection() {
    Future.delayed(const Duration(seconds: 5), () {
      if (client.connectionStatus?.state != MqttConnectionState.connected) {
        _updateStatus('Ponovno povezovanje...');
        _connectToBroker();
      }
    });
  }

  void _onDisconnected() {
    _updateStatus('Povezava prekinjena.');
    _isPublishing = false;
    _timer?.cancel();
  }

  void _startCollecting() {
    _collectedData.clear(); // Reset
    _isPublishing = true;
    _updateStatus("Zajemanje podatkov ...");

    _timer = Timer.periodic(const Duration(seconds: 1), (_) async {
      try {
        final position = await Geolocator.getCurrentPosition();
        final dataPoint = {
          'timestamp': DateTime.now().toIso8601String(),
          'latitude': position.latitude,
          'longitude': position.longitude,
          'speed': position.speed,
          'steps': stepCount,
        };
        _collectedData.add(dataPoint);
        _updateStatus('Zbranih točk: ${_collectedData.length}');
      } catch (e) {
        _updateStatus('Napaka pri lokaciji: $e');
      }
    });
  }

  void _stopAndSendData() {
    _isPublishing = false;
    _timer?.cancel();

    if (client.connectionStatus?.state == MqttConnectionState.connected && _collectedData.isNotEmpty) {
      final payload = jsonEncode({
        'session': _collectedData,
        'userId': _userId,
      });

      final builder = MqttClientPayloadBuilder();
      builder.addString(payload);

      client.publishMessage(topic, MqttQos.atLeastOnce, builder.payload!);
      _updateStatus("Podatki poslani: ${_collectedData.length} točk");

      _collectedData.clear();
    } else {
      _updateStatus("Ni podatkov za pošiljanje ali ni povezave.");
    }
  }

  Future<bool> _requestPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    return permission == LocationPermission.always || permission == LocationPermission.whileInUse;
  }

  void _updateStatus(String newStatus) {
    if (mounted && status != newStatus) {
      setState(() => status = newStatus);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _stepSubscription?.cancel();
    client.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Senzorji')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                status,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _isPublishing || _userId == null ? null : _startCollecting,
                icon: const Icon(Icons.play_arrow),
                label: const Text("Začni zajemanje"),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _isPublishing ? _stopAndSendData : null,
                icon: const Icon(Icons.stop),
                label: const Text("Ustavi in pošlji"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
