import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController newPassCtrl = TextEditingController();
  final TextEditingController confirmCtrl = TextEditingController();
  bool _isSaving = false;

  Future<void> _savePassword() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final userId = prefs.getString('user_id') ?? '';
    final uri = Uri.parse('http://192.168.0.242:3001/api/users/$userId');

    print('🔑 changePassword userId="$userId"');
    print('🔗 PUT to: ${uri.toString()}');

    final res = await http.put(
      uri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({'password': newPassCtrl.text.trim()}),
    );

    setState(() => _isSaving = false);
    if (res.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Geslo uspešno spremenjeno.')),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Napaka: ${res.statusCode}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Spremeni geslo')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: newPassCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Novo geslo',
                  border: OutlineInputBorder(),
                ),
                validator:
                    (v) => (v == null || v.isEmpty) ? 'Vnesite geslo.' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: confirmCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Potrdi novo geslo',
                  border: OutlineInputBorder(),
                ),
                validator:
                    (v) =>
                        v != newPassCtrl.text ? 'Gesli se ne ujemata.' : null,
              ),
              const SizedBox(height: 24),
              _isSaving
                  ? const CircularProgressIndicator()
                  : ElevatedButton(
                    onPressed: _savePassword,
                    child: const Text('Shrani geslo'),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
