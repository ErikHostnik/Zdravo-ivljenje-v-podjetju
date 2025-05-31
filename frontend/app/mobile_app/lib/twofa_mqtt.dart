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
  static const String broker = '192.168.0.26';
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
        debugPrint(
            'MQTT connection failed: ${client.connectionStatus!.returnCode}');
      }
    } catch (e) {
      debugPrint('MQTT connection error: $e');
      client.disconnect();
    }
  }

  void _onDisconnected() {
    debugPrint('MQTT disconnected');
  }

  Future<void> _onMessageReceived(
      List<MqttReceivedMessage<MqttMessage>> messages) async {
    final recMess = messages[0].payload as MqttPublishMessage;
    final payloadStr =
        MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
    debugPrint('2FA Message Received: $payloadStr');

    try {
      final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
      final twoFaId = payload['requestId'] as String;

      // Prikaži dialog z enim gumbom "Avtenticiraj"
      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('2FA Preverjanje obraza'),
          content: const Text('Ali želite izvesti preverjanje obraza?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Prekliči'),
            ),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                await _triggerFacialVerification(twoFaId);
              },
              child: const Text('Avtenticiraj'),
            ),
          ],
        ),
      );
    } catch (e) {
      debugPrint('Error processing 2FA message: $e');
    }
  }

  Future<void> _triggerFacialVerification(String twoFaId) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    final uri = Uri.parse('http://192.168.0.26:3001/api/face/verify');

  debugPrint('🔑 JWT token: $token');


    try {
      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'userId': userId,
          'twoFaId': twoFaId,
        }),
      );

      if (response.statusCode == 200) {
        debugPrint("✅ Preverjanje obraza uspešno. 2FA odobreno.");
      } else {
        debugPrint(
            "❌ Preverjanje obraza ni uspelo. Status: ${response.statusCode}");
      }
    } catch (e) {
      debugPrint("❌ Napaka pri preverjanju obraza: $e");
    }
  }

  void disconnect() => client.disconnect();
}
