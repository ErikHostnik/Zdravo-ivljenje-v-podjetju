import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

//Glavni widget za prijavo in registracijo
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

  final String baseUrl = 'http://localhost:3001/api/users'; // zamenjaj z IP ce se bo testiral na fizični napravi cuj ne pozabit cors

//Funkcija ki se izvede ob kliko na gumb za prijavo ali registracjo
  Future<void> _submit() async {
    final username = usernameCtrl.text;
    final email = emailCtrl.text;
    final password = passwordCtrl.text;

    try {
      final url = isLogin ? '$baseUrl/login' : '$baseUrl';
      final response = await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(isLogin
            ? {'username': username, 'password': password}
            : {
                'username': username,
                'email': email,
                'password': password,
              }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${isLogin ? 'Prijava' : 'Registracija'} uspešna!')),
        );
        print(data);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Napaka: ${response.body}')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Napaka pri povezavi: $e')),
      );
    }
  }
  

  //Tukaj se določi UI (spremeni gleden na isLogin)
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
            )
          ],
        ),
      ),
    );
  }
}
