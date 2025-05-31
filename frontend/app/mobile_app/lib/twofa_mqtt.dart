import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:camera/camera.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

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
            TextButton(
              onPressed: () => Navigator.pop(context, false), 
              child: const Text('Zavrni')
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true), 
              child: const Text('Potrdi')
            ),
          ],
        ),
      );

      if (decision == true) {
        await _openFaceCapture(twoFaId);
      } else if (decision == false) {
        await _sendVerification(twoFaId, false);
      }
    } catch (e) {
      debugPrint(' Error processing 2FA message: $e');
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

      final imagePath = await Navigator.of(context, rootNavigator: true).push<String>(
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
      
      final uri = Uri.parse('http://$broker:3001/api/2fa/verify');
      final request = http.MultipartRequest('POST', uri);

      request.files.add(await http.MultipartFile.fromPath(
        'image',
        imagePath,
      ));

      request.fields['userId'] = userId;
      request.fields['twoFaId'] = twoFaId;

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

  Future<void> _sendVerification(String id, bool allow) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    final uri = Uri.parse('http://$broker:3001/api/2fa/$id/${allow ? 'approve' : 'reject'}');

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

class FaceCaptureScreen extends StatefulWidget {
  final ValueChanged<String> onImageCaptured;

  const FaceCaptureScreen({Key? key, required this.onImageCaptured})
      : super(key: key);

  @override
  _FaceCaptureScreenState createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen> {
  CameraController? _controller;
  late Future<void> _initializeControllerFuture;
  List<CameraDescription> cameras = [];

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      cameras = await availableCameras();
      if (cameras.isEmpty) {
        throw Exception('No cameras available');
      }

      // Najdi sprednjo kamero
      CameraDescription? frontCamera;
      for (var camera in cameras) {
        if (camera.lensDirection == CameraLensDirection.front) {
          frontCamera = camera;
          break;
        }
      }

      // Če ni sprednje kamere, uporabi prvo
      final selectedCamera = frontCamera ?? cameras.first;

      _controller = CameraController(
        selectedCamera,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      _initializeControllerFuture = _controller!.initialize();
      await _initializeControllerFuture;
      setState(() {});
    } catch (e) {
      print('Camera initialization error: $e');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _captureFace() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    try {
      await _initializeControllerFuture;
      final tempDir = await getTemporaryDirectory();
      final imagePath = p.join(
        tempDir.path,
        'face_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );

      // Posnemi fotografijo
      final imageFile = await _controller!.takePicture();
      await imageFile.saveTo(imagePath);

      // Kliči callback s potjo do posnetka
      widget.onImageCaptured(imagePath);
    } catch (e) {
      print('Error capturing image: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_controller == null || !_controller!.value.isInitialized) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 20),
              Text('Inicializacija kamere...'),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          CameraPreview(_controller!),
          Align(
            alignment: Alignment.center,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 3),
                color: Colors.white.withOpacity(0.12),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.only(bottom: 40.0),
              child: ElevatedButton(
                onPressed: _captureFace,
                style: ElevatedButton.styleFrom(
                  shape: CircleBorder(),
                  padding: EdgeInsets.all(20),
                  backgroundColor: Colors.white70,
                ),
                child: Icon(
                  Icons.camera_alt,
                  color: Colors.black,
                  size: 32,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}