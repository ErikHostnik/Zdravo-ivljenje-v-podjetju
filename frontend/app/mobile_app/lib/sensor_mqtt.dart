import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:geolocator/geolocator.dart';
import 'package:pedometer/pedometer.dart';

class SensorMQTTPage extends StatefulWidget {
  const SensorMQTTPage({super.key});

  @override
  State<SensorMQTTPage> createState() => _SensorMQTTPageState();
}

class _SensorMQTTPageState extends State<SensorMQTTPage> {
  late MqttServerClient client;
  String status = 'Povezovanje...';

  int stepCount = 0;
  double temperature = 36.5;

  Timer? _timer;
  StreamSubscription<StepCount>? _stepSubscription;

  static const broker = 'test.mosquitto.org';
  static const port = 1883;
  static const topic = 'sensors/test';

  bool _isPublishing = false;

  @override
  void initState() {
    super.initState();
    _startSetup();
  }

  Future<void> _startSetup() async {
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
      (event) => stepCount = event.steps,
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
        _startPublishing();
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

  void _startPublishing() {
    _isPublishing = true;
    _timer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await _publishSensorData();
    });
  }

  Future<void> _publishSensorData() async {
    if (!_isPublishing || client.connectionStatus?.state != MqttConnectionState.connected) return;

    try {
      final position = await Geolocator.getCurrentPosition();

      final payload = jsonEncode({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'speed': position.speed,
        'steps': stepCount,
        'temperature': temperature,
      });

      final builder = MqttClientPayloadBuilder();
      builder.addString(payload);
      client.publishMessage(topic, MqttQos.atLeastOnce, builder.payload!);

      _updateStatus('Podatki poslani ob ${DateTime.now().toIso8601String()}');
    } catch (e) {
      _updateStatus('Napaka pri zajemu ali pošiljanju: $e');
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
          child: Text(
            status,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18),
          ),
        ),
      ),
    );
  }
}
