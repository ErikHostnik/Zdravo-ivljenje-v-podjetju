import 'package:flutter/material.dart';
import 'sensor_mqtt.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class LoginRegisterPage extends StatefulWidget {
  const LoginRegisterPage({super.key});

  @override
  State<LoginRegisterPage> createState() => _LoginRegisterPageState();
}

class _LoginRegisterPageState extends State<LoginRegisterPage> {
  bool isLogin = true;
  final TextEditingController usernameCtrl = TextEditingController();
  final TextEditingController emailCtrl = TextEditingController();
  final TextEditingController passwordCtrl = TextEditingController();

  // SPREMENI IP NASLOV!!! GLEDE NA SVOJO NAPRAVO!!!
  final String baseUrl = 'http://192.168.0.26:3001/api/users';

  Future<void> _submit() async {
    final username = usernameCtrl.text.trim();
    final email = emailCtrl.text.trim();
    final password = passwordCtrl.text.trim();

    try {
      final url = isLogin ? '$baseUrl/login' : '$baseUrl';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json', 'x-mobile-client': 'true'},
        body: jsonEncode(isLogin
            ? {'username': username, 'password': password, 'isMobile': true}  
            : {
                'username': username,
                'email': email,
                'password': password,
                'isMobile': true,
              }),
      );

      print('DEBUG: status code = ${response.statusCode}');
      print('DEBUG: response body = ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);

        if (data['pending2FA'] == true) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Dvojna avtentikacija je potrebna.')),
          );
          return;
        }

        final prefs = await SharedPreferences.getInstance();

        if (data['token'] != null) {
          await prefs.setString('jwt_token', data['token']);
          print('DEBUG: token shranjen: ${data['token']}');
        } else {
          print('DEBUG: token manjka!');
        }

        if (data['user'] != null && data['user']['_id'] != null) {
          await prefs.setString('user_id', data['user']['_id']);
          print('DEBUG: user_id shranjen: ${data['user']['_id']}');
        } else {
          print('DEBUG: user_id manjka!');
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${isLogin ? 'Prijava' : 'Registracija'} uspešna!')),
        );

        Navigator.pop(context, true);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Napaka: ${response.body}')),
        );
      }
    } catch (e) {
      print('DEBUG: Exception: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Napaka pri povezavi: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(isLogin ? 'Prijava' : 'Registracija')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(controller: usernameCtrl, decoration: const InputDecoration(labelText: 'Uporabniško ime')),
            if (!isLogin)
              TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email')),
            TextField(
              controller: passwordCtrl,
              decoration: const InputDecoration(labelText: 'Geslo'),
              obscureText: true,
            ),
            const SizedBox(height: 20),
            ElevatedButton(onPressed: _submit, child: Text(isLogin ? 'Prijava' : 'Registracija')),
            TextButton(
              onPressed: () {
                setState(() => isLogin = !isLogin);
              },
              child: Text(isLogin ? 'Nimate računa? Registracija' : 'Imate račun? Prijava'),
            ),
          ],
        ),
      ),
    );
  }
}
