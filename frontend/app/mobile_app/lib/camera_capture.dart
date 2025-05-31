import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class CameraCaptureScreen extends StatefulWidget {
  const CameraCaptureScreen({super.key});

  @override
  State<CameraCaptureScreen> createState() => _CameraCaptureScreenState();
}

class _CameraCaptureScreenState extends State<CameraCaptureScreen> {
  CameraController? _cameraController;
  List<File> _capturedImages = [];
  bool _isLoading = false;
  bool _isCapturing = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    final cameras = await availableCameras();
    final camera = cameras.firstWhere(
      (cam) => cam.lensDirection == CameraLensDirection.front,
      orElse: () => cameras.first,
    );

    _cameraController = CameraController(
      camera,
      ResolutionPreset.medium,
      enableAudio: false,
    );

    await _cameraController!.initialize();
    if (!mounted) return;
    setState(() {});
  }

  // Zajame eno sliko
  Future<File?> _captureSingleImage() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return null;

    try {
      final tempDir = await getTemporaryDirectory();
      final path = '${tempDir.path}/${DateTime.now().millisecondsSinceEpoch}.jpg';
      final file = await _cameraController!.takePicture();
      final savedImage = await File(file.path).copy(path);
      return savedImage;
    } catch (e) {
      debugPrint('Error capturing image: $e');
      return null;
    }
  }

  // Funkcija za zajem 100 slik zaporedoma z intervalom (v tej verziji: 5 slik kot primer)
  Future<void> _captureMultipleImages() async {
    if (_isCapturing) return; // prepreči sočasno zajemanje
    setState(() {
      _isCapturing = true;
      _capturedImages.clear(); // počisti stare slike pred zajemom
    });

    for (int i = 0; i < 5; i++) {
      final image = await _captureSingleImage();
      if (image != null) {
        setState(() {
          _capturedImages.add(image);
        });
      }
      await Future.delayed(const Duration(milliseconds: 50)); // časovni zamik med zajemi
    }

    setState(() {
      _isCapturing = false;
    });
  }

  // Pošlje slike na backend
  Future<void> _uploadImages() async {
    setState(() => _isLoading = true);

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final userId = prefs.getString('user_id') ?? '';

    // Endpoint za nalaganje slik
    final uploadUri = Uri.parse('http://192.168.0.26:3001/api/2fa/setup/$userId');

    final request = http.MultipartRequest('POST', uploadUri)
      ..headers['Authorization'] = 'Bearer $token';

    // Dodaj vsako sliko posebej
    for (var i = 0; i < _capturedImages.length; i++) {
      final imageFile = _capturedImages[i];
      request.files.add(
        await http.MultipartFile.fromPath('images', imageFile.path),
      );
    }

    try {
      final response = await request.send();
      if (response.statusCode == 200) {
        // Če upload uspe:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Slike uspešno poslane za 2FA!')),
        );
        setState(() {
          _capturedImages.clear();
        });

        // PO USPEŠNEM UPLOADU: kliči funkcijo, ki sproži recognition_model.py
        _runRecognition(userId, token);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Napaka pri pošiljanju: ${response.statusCode}')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Napaka pri pošiljanju: $e')),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  // Nova funkcija: pošljemo zahtevo na backend, da zažene recognition_model.py
  Future<void> _runRecognition(String userId, String token) async {
    final recogUri = Uri.parse('http://192.168.0.26:3001/api/2fa/recognize/$userId');
    try {
      final response = await http.post(
        recogUri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Prepoznavanje obrazov sproženo uspešno.')),
        );
        // Lahko tu tudi navigirate nazaj ali storite kaj drugega
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Napaka pri sprožitvi prepoznave: ${response.statusCode}')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('HTTP napaka pri sprožitvi prepoznave: $e')),
      );
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Zajem obrazov za 2FA'),
        backgroundColor: Colors.teal,
      ),
      body: Column(
        children: [
          AspectRatio(
            aspectRatio: _cameraController!.value.aspectRatio,
            child: CameraPreview(_cameraController!),
          ),
          const SizedBox(height: 12),
          Text(
            'Zajetih slik: ${_capturedImages.length} / 100',
            style: const TextStyle(fontSize: 16),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.all(8),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: _capturedImages.length,
              itemBuilder: (context, index) {
                return Image.file(_capturedImages[index], fit: BoxFit.cover);
              },
            ),
          ),
          if (_isLoading) const CircularProgressIndicator(),
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton.icon(
                    onPressed: _isCapturing ? null : _captureMultipleImages,
                    icon: const Icon(Icons.camera),
                    label: Text(_isCapturing ? 'Zajemanje ...' : 'Zajemi 100 slik'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                  ),
                  ElevatedButton.icon(
                    onPressed: _capturedImages.isNotEmpty ? _uploadImages : null,
                    icon: const Icon(Icons.cloud_upload),
                    label: const Text('Pošlji slike'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blueGrey),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
