import 'dart:async';
import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' show join;
import 'package:path_provider/path_provider.dart';

class FaceCaptureScreen extends StatefulWidget {
  /// Ta callback se klice, ko je slika uspešno zajeta.
  /// V argumentu vrne pot do posnete slike: `imagePath`.
  final void Function(String imagePath) onImageCaptured;

  const FaceCaptureScreen({Key? key, required this.onImageCaptured})
      : super(key: key);

  @override
  State<FaceCaptureScreen> createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen> {
  CameraController? _controller;
  late Future<void> _initializeControllerFuture;
  List<CameraDescription>? cameras;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    // Pridobi vse kamere
    cameras = await availableCameras();

    // Privzeto uporabimo prvo zadnjo nameščeno (zadnja prenosna kamera)
    final firstCamera = cameras!.first;

    _controller = CameraController(
      firstCamera,
      ResolutionPreset.medium,
      enableAudio: false,
    );
    _initializeControllerFuture = _controller!.initialize();
    setState(() {});
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

      // Dobimo direktorij, kjer shranimo
      final tempDir = await getTemporaryDirectory();
      final imagePath = join(
        tempDir.path,
        '${DateTime.now().millisecondsSinceEpoch}.jpg',
      );

      // Posnemi fotografijo
      await _controller!.takePicture().then((XFile file) {
        file.saveTo(imagePath);
      });

      // Kliči callback s potjo do posnetka
      widget.onImageCaptured(imagePath);
    } catch (e) {
      debugPrint('Napaka pri zajemu slike: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<void>(
        future: _initializeControllerFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          return Stack(
            children: [
              CameraPreview(_controller!),
              // Polprozoren kvadrat (bounding‐box) na sredini
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
              // Spodaj gumb za zajem
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: ElevatedButton(
                    onPressed: _captureFace,
                    style: ElevatedButton.styleFrom(
                      shape: const CircleBorder(),
                      padding: const EdgeInsets.all(20),
                      backgroundColor: Colors.white70,
                    ),
                    child: const Icon(
                      Icons.camera,
                      color: Colors.black,
                      size: 32,
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}