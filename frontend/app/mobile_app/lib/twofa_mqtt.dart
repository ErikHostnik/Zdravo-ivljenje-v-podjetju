import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class TwoFAMQTT {
  final BuildContext context;
  final String userId;

  late final MqttServerClient client;
  static const String broker = '192.168.0.11';
  static const int port = 1883;
  late final String topic;

  TwoFAMQTT({required this.context, required this.userId}) {
    topic = '2fa/request/$userId';
    client = MqttServerClient(broker, 'flutter_2fa_$userId');
    client.port = port;
    client.keepAlivePeriod = 20;
    client.secure = false;
    client.logging(on: false);
    client.onDisconnected = _onDisconnected;

    final connMessage = MqttConnectMessage()
        .withClientIdentifier('flutter_2fa_$userId')
        .startClean()
        .withWillQos(MqttQos.atLeastOnce);

    client.connectionMessage = connMessage;
  }

  Future<void> connectAndListen() async {
    try {
      await client.connect();
      if (client.connectionStatus!.state == MqttConnectionState.connected) {
        debugPrint('Connected to MQTT broker for 2FA');
        client.subscribe(topic, MqttQos.atLeastOnce);
        client.updates!.listen(_onMessageReceived);
      } else {
        debugPrint(' MQTT connection failed: ${client.connectionStatus!.returnCode}');
      }
    } catch (e) {
      debugPrint(' MQTT connection error: $e');
      client.disconnect();
    }
  }

  void _onDisconnected() {
    debugPrint(' MQTT disconnected');
  }

  Future<void> _onMessageReceived(List<MqttReceivedMessage<MqttMessage>> messages) async {
    final recMess = messages[0].payload as MqttPublishMessage;
    final payloadStr = MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
    debugPrint(' 2FA Message Received: $payloadStr');

    try {
      final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
      final twoFaId = payload['requestId'] as String;

      final bool? decision = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('2FA Potrditev'),
          content: const Text('Ali želite potrditi prijavo?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Zavrni')),
            ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Potrdi')),
          ],
        ),
      );

      if (decision != null) await _sendVerification(twoFaId, decision);
    } catch (e) {
      debugPrint(' Error processing 2FA message: $e');
    }
  }

  Future<void> _sendVerification(String id, bool allow) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    final uri = Uri.parse('http://192.168.0.11:3001/api/2fa/$id/${allow ? 'approve' : 'reject'}'); //10.0.2.2 - GLEDE NA SVOJO NAPRAVO - fizicno napravo DRUGACE localhost oziroma 10.0.2.2

    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      debugPrint(' 2FA Verification response: ${response.statusCode}');
    } catch (e) {
      debugPrint(' HTTP error sending 2FA verification: $e');
    }
  }

  void disconnect() => client.disconnect();
}