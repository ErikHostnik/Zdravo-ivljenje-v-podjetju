import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:path/path.dart' as path;
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

import 'face_capture_screen.dart';

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
        debugPrint('Povezan na MQTT broker za 2FA');
        client.subscribe(topic, MqttQos.atLeastOnce);
        client.updates!.listen(_onMessageReceived);
      } else {
        debugPrint(
            'MQTT povezava ni uspela: ${client.connectionStatus!.returnCode}');
      }
    } catch (e) {
      debugPrint('Napaka pri MQTT povezavi: $e');
      client.disconnect();
    }
  }

  void _onDisconnected() {
    debugPrint('MQTT povezava prekinjena');
  }

  Future<void> _onMessageReceived(
      List<MqttReceivedMessage<MqttMessage>> messages) async {
    final recMess = messages[0].payload as MqttPublishMessage;
    final payloadStr =
        MqttPublishPayload.bytesToStringAsString(recMess.payload.message);
    debugPrint('Prejeto 2FA sporočilo: $payloadStr');

    try {
      final payload = jsonDecode(payloadStr) as Map<String, dynamic>;
      final twoFaId = payload['requestId'] as String;

      await showDialog<void>(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Preverjanje obraza'),
          content: const Text('Ali želite izvesti preverjanje z obrazom?'),
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
      debugPrint('Napaka pri obdelavi sporočila: $e');
    }
  }

  Future<void> _openFaceCapture(String twoFaId) async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ni na voljo kamere')),
        );
        return;
      }

      final imagePath = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (context) => FaceCaptureScreen(
            onImageCaptured: (path) => Navigator.of(context).pop(path),
          ),
        ),
      );

      if (imagePath == null || imagePath.isEmpty) {
        debugPrint("Uporabnik ni posnel slike");
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('jwt_token');
      
      final uri = Uri.parse('http://192.168.0.26:3001/api/2fa/verify');
      final request = http.MultipartRequest('POST', uri);

      // Dodaj sliko
      request.files.add(await http.MultipartFile.fromPath(
        'image',
        imagePath,
        filename: path.basename(imagePath),
      ));

      // Dodaj podatke
      request.fields['userId'] = userId;
      request.fields['twoFaId'] = twoFaId;

      // Dodaj avtorizacijo
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();

      if (response.statusCode == 200) {
        final jsonResponse = jsonDecode(responseBody);
        if (jsonResponse['success'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Avtentikacija uspešna!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Avtentikacija ni uspela: ${jsonResponse['message']}')),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Napaka strežnika: ${response.statusCode}')),
        );
      }
    } catch (e) {
      debugPrint("Napaka pri preverjanju obraza: $e");
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Napaka: ${e.toString()}')),
      );
    }
  }

  void disconnect() {
    client.disconnect();
  }
}