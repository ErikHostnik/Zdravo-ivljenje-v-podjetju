import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FaceAuthenticationScreen extends StatefulWidget {
  final String twoFaId; // Dodan parameter za 2FA ID

  const FaceAuthenticationScreen({super.key, required this.twoFaId});

  @override
  State<FaceAuthenticationScreen> createState() => _FaceAuthenticationScreenState();
}

class _FaceAuthenticationScreenState extends State<FaceAuthenticationScreen> {
  File? _capturedImage;
  bool _isLoading = false;
  bool _isVerifying = false;
  String? _verificationResult;

  Future<void> _captureFace() async {
    // Implementacija zajema slike s kamero (dodajte svojo kodo)
  }

  Future<void> _verifyFace() async {
    if (_capturedImage == null) return;

    setState(() {
      _isVerifying = true;
      _verificationResult = null;
    });

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final userId = prefs.getString('user_id') ?? '';

    final url = Uri.parse('http://192.168.0.26:3001/api/2fa/verify');

    try {
      final request = http.MultipartRequest('POST', url)
        ..headers['Authorization'] = 'Bearer $token'
        ..fields['userId'] = userId
        ..fields['twoFaId'] = widget.twoFaId // Uporaba twoFaId iz parametra
        ..files.add(await http.MultipartFile.fromPath(
          'image',
          _capturedImage!.path,
        ));

      final response = await request.send();
      final responseBody = await response.stream.bytesToString();
      final data = json.decode(responseBody);

      if (response.statusCode == 200) {
        setState(() {
          _verificationResult = data['match'] 
              ? 'Uspešna avtentikacija!'
              : 'Avtentikacija ni uspela. Poskusite znova.';
        });

        if (data['match']) {
          // Vrnitev uspešnega rezultata nazaj v TwoFAMQTT
          if (mounted) Navigator.pop(context, true);
        }
      } else {
        setState(() {
          _verificationResult = 'Napaka pri preverjanju: ${data['message']}';
        });
      }
    } catch (e) {
      setState(() {
        _verificationResult = 'Napaka pri povezavi s strežnikom: $e';
      });
    } finally {
      setState(() => _isVerifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Face ID Avtentikacija'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (_capturedImage != null)
              Image.file(_capturedImage!, height: 200),
              
            const SizedBox(height: 20),
            
            ElevatedButton(
              onPressed: _captureFace,
              child: const Text('Zajemi obraz'),
            ),
            
            const SizedBox(height: 20),
            
            if (!_isVerifying && _verificationResult != null)
              Text(
                _verificationResult!,
                style: TextStyle(
                  color: _verificationResult!.contains('Uspešna')
                      ? Colors.green
                      : Colors.red,
                ),
              ),
            
            const SizedBox(height: 20),
            
            ElevatedButton(
              onPressed: _capturedImage != null ? _verifyFace : null,
              child: const Text('Preveri obraz'),
            ),
          ],
        ),
      ),
    );
  }
}