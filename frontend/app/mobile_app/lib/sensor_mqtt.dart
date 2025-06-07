import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:latlong2/latlong.dart';
import 'package:sensors_plus/sensors_plus.dart';
import 'map.dart';

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
  StreamSubscription<AccelerometerEvent>? _accelSubscription;

  static const broker = '192.168.0.26';
  static const port = 1883;
  static const topic = 'sensors/test';
  final _maxPathPoints = 5000;


  static const _heartbeatPrefix = 'status/heartbeat/';
  static const _heartbeatTopic = 'status/heartbeat/#';
  static const Duration _heartbeatTimeout = Duration(seconds: 90);

  final Map<String, DateTime> _activeUsers = {};

  Timer? _heartbeatCleanupTimer;
  Timer? _heartbeatPublishTimer;

  bool _isPublishing = false;
  final List<Map<String, dynamic>> _collectedData = [];
  final List<LatLng> _path = [];
  String? _userId;

  double _prevMagnitude = 0;
  int _stepThreshold = 18;

  bool _stepDetected = false;

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
      _initializeAccelerometer();
      await _initializeMqttClient();
      await _connectToBroker();

      _heartbeatCleanupTimer =
          Timer.periodic(const Duration(seconds: 30), (_) {
        _cleanupHeartbeatEntries();
      });
    } else {
      _updateStatus('Dovoljenja za lokacijo ali senzorje zavrnjena.');
    }
  }

  void _initializeAccelerometer() {
    _accelSubscription = accelerometerEvents.listen(
      (event) {
        final double magnitude =
            sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
        if (!_stepDetected &&
            magnitude > _stepThreshold &&
            _prevMagnitude <= _stepThreshold) {
          setState(() {
            stepCount++;
          });
          _stepDetected = true;
        }
        if (magnitude < _stepThreshold) {
          _stepDetected = false;
        }
        _prevMagnitude = magnitude;
      },
      onError: (error) =>
          _updateStatus('Napaka pri branju akcelerometra: $error'),
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

        client.subscribe(_heartbeatTopic, MqttQos.atLeastOnce);

        client.updates!.listen((List<MqttReceivedMessage<MqttMessage>> c) {
          for (final msg in c) {
            final recTopic = msg.topic;
            if (recTopic.startsWith(_heartbeatPrefix)) {
              final userId = recTopic.substring(_heartbeatPrefix.length);
              setState(() {
                _activeUsers[userId] = DateTime.now();
              });
            }
          }
        });

        _sendHeartbeat();
        _heartbeatPublishTimer =
            Timer.periodic(const Duration(seconds: 60), (_) {
          _sendHeartbeat();
        });
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
    _heartbeatCleanupTimer?.cancel();
    _heartbeatPublishTimer?.cancel();
  }

  void _sendHeartbeat() {
    if (client.connectionStatus?.state == MqttConnectionState.connected &&
        _userId != null) {
      final topicHb = '${_heartbeatPrefix}$_userId';
      final payloadMap = {
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };
      final builder = MqttClientPayloadBuilder()..addString(jsonEncode(payloadMap));
      client.publishMessage(topicHb, MqttQos.atLeastOnce, builder.payload!);
    }
  }

  void _cleanupHeartbeatEntries() {
    final now = DateTime.now();
    final toRemove = <String>[];
    _activeUsers.forEach((userId, lastTime) {
      if (now.difference(lastTime) > _heartbeatTimeout) {
        toRemove.add(userId);
      }
    });
    if (toRemove.isNotEmpty) {
      setState(() {
        for (final u in toRemove) {
          _activeUsers.remove(u);
        }
      });
    }
  }

  void _startCollecting() {
    _collectedData.clear();
    _path.clear();
    _isPublishing = true;
    _updateStatus("Zajemanje podatkov ...");

    _timer = Timer.periodic(const Duration(seconds: 1), (_) async {
      try {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.bestForNavigation,
        );

        if (position.latitude.isNaN ||
            position.longitude.isNaN ||
            position.latitude.abs() > 90 ||
            position.longitude.abs() > 180) {
          throw Exception('Neveljavne koordinate');
        }

        final dataPoint = {
          'timestamp': DateTime.now().toUtc().toIso8601String(),
          'latitude': position.latitude,
          'longitude': position.longitude,
          'altitude': position.altitude,
          'speed': position.speed,
          'steps': stepCount,
        };

        setState(() {
          _collectedData.add(dataPoint);
          _path.add(LatLng(position.latitude, position.longitude));
          if (_path.length > _maxPathPoints) {
            _path.removeRange(0, _path.length - _maxPathPoints);
          }
        });

        _updateStatus('Zbranih točk: ${_collectedData.length}');
      } catch (e) {
        _updateStatus('Napaka pri lokaciji: $e');
      }
    });
  }

  void _stopAndSendData() {
    _isPublishing = false;
    _timer?.cancel();

    if (client.connectionStatus?.state == MqttConnectionState.connected &&
        _collectedData.isNotEmpty) {
      final payload = jsonEncode({
        'userId': _userId,
        'session': _collectedData,
      });

      final builder = MqttClientPayloadBuilder();
      builder.addString(payload);

      client.publishMessage(topic, MqttQos.atLeastOnce, builder.payload!);
      _updateStatus("Podatki poslani: ${_collectedData.length} točk");
      setState(() {
        _collectedData.clear();
        _path.clear();
        stepCount = 0;
      });
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

    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  void _updateStatus(String newStatus) {
    if (mounted && status != newStatus) {
      setState(() => status = newStatus);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _accelSubscription?.cancel();
    client.disconnect();
    _heartbeatCleanupTimer?.cancel();
    _heartbeatPublishTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Senzorji'), centerTitle: true),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: Center(
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
                    const SizedBox(height: 10),
                    Text(
                      'Število korakov: $stepCount',
                      style: const TextStyle(fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed:
                      _isPublishing || _userId == null ? null : _startCollecting,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text("Začni zajemanje"),
                ),
                const SizedBox(width: 12),
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

          Padding(
            padding: const EdgeInsets.symmetric(vertical: 0),
            child: Text(
              '${_activeUsers.length} Online',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),

          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 25),
            child: Center(
              child: ClipOval(
                child: Container(
                  width: 500,
                  height: 500,
                  color: Colors.grey.shade200,
                  child: AspectRatio(
                    aspectRatio: 1,
                    child: SensorMapPage(pathPoints: _path),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
