import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:geolocator/geolocator.dart';

class SensorMQTTPage extends StatefulWidget {
  const SensorMQTTPage({super.key});

  @override
  State<SensorMQTTPage> createState() => _SensorMQTTPageState();
}

class _SensorMQTTPageState extends State<SensorMQTTPage> {
  late MqttServerClient client;
  String status = 'Povezovanje...';

  double speed = 0.0;
  double steps = 0;
  double temperature = 36.5;
  double lat = 0;
  double lon = 0;

  Timer? _timer;

  static const broker = 'test.mosquitto.org';
  static const port = 1883;
  static const topic = 'sensors/test'; 

  @override
  void initState() {
    super.initState();
    _requestPermissions().then((granted) {
      if (granted) {
        _initializeMqttClient().then((_) => _connectToBroker());
      } else {
        setState(() => status = 'Dovoljenja zavrnjena.');
      }
    });
  }

  Future<void> _initializeMqttClient() async {
    client = MqttServerClient(broker, '');
    client.port = port;
    client.secure = false; // Brez TLS
    client.logging(on: false);
    client.keepAlivePeriod = 20;
    client.onDisconnected = _onDisconnected;

    final connMessage = MqttConnectMessage()
        .withClientIdentifier('flutter_client_${Random().nextInt(10000)}')
        .startClean()
        .withWillQos(MqttQos.atLeastOnce);

    client.connectionMessage = connMessage;
  }

  void _connectToBroker() async {
    try {
      await client.connect();
      if (client.connectionStatus!.state == MqttConnectionState.connected) {
        setState(() => status = 'Povezan na MQTT!');
        _startPublishing();
      } else {
        setState(() => status = 'Napaka pri povezavi: ${client.connectionStatus!.returnCode}');
      }
    } catch (e) {
      setState(() => status = 'Neuspela povezava: $e');
      client.disconnect();
      _retryConnection();
    }
  }

  void _retryConnection() {
    Future.delayed(const Duration(seconds: 5), () {
      if (client.connectionStatus!.state != MqttConnectionState.connected) {
        setState(() => status = 'Poskus ponovne povezave...');
        _connectToBroker();
      }
    });
  }

  void _onDisconnected() {
    setState(() => status = 'Povezava prekinjena.');
  }

  void _startPublishing() {
    _timer = Timer.periodic(const Duration(seconds: 5), (_) async {
      try {
        final position = await Geolocator.getCurrentPosition();
        lat = position.latitude;
        lon = position.longitude;
        speed = position.speed;
        steps += Random().nextDouble() * 2;

        final payload = jsonEncode({
          'latitude': lat,
          'longitude': lon,
          'speed': speed,
          'steps': steps.toStringAsFixed(2),
          'temperature': temperature
        });

        final builder = MqttClientPayloadBuilder();
        builder.addString(payload);
        client.publishMessage(topic, MqttQos.atLeastOnce, builder.payload!);
        setState(() => status = 'Podatki poslani: $payload');
      } catch (e) {
        setState(() => status = 'Napaka pri pošiljanju: $e');
      }
    });
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

  @override
  void dispose() {
    _timer?.cancel();
    client.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('MQTT Sensor App')),
      body: Center(child: Text(status, textAlign: TextAlign.center)),
    );
  }
}
