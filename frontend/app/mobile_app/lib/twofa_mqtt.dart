import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:camera/camera.dart';       // za `FaceCaptureScreen`
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

import 'face_capture_screen.dart';         // POT do prej ustvarjenega widgeta

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
              onPressed: () {
                Navigator.pop(context);
                _openFaceCapture(twoFaId);
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

  Future<void> _openFaceCapture(String twoFaId) async {
    // 1) Pridobi seznam kamer (moraš jih navesti preden odpreš)
    final cameras = await availableCameras();

    // 2) Preusmeri na FaceCaptureScreen, ki bo vrnil pot do slike
    final imagePath = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => FaceCaptureScreen(
          onImageCaptured: (String path) {
            Navigator.pop(context, path);
          },
        ),
      ),
    );

    // Če uporabnik ni posnel slike, imagePath == null
    if (imagePath == null) {
      debugPrint("❌ Uporabnik ni posnel slike.");
      return;
    }

    // 3) Pretvori posneto datoteko v Base64
    final File imageFile = File(imagePath);
    final bytes = await imageFile.readAsBytes();
    final String base64Image = base64Encode(bytes);

    // 4) Pridobi JWT token
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    debugPrint('🔑 JWT token: $token');

    // 5) Pošlji POST na backend
    final uri = Uri.parse('http://192.168.0.26:3001/api/face/verify');
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
          'imageBase64': base64Image,
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