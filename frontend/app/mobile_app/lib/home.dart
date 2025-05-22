import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Future<bool> _isLoggedIn;

  @override
  void initState() {
    super.initState();
    _isLoggedIn = _checkLoginStatus();
  }

  Future<bool> _checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token');
    return token != null && token.isNotEmpty;
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_id');
    setState(() {
      _isLoggedIn = Future.value(false);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Uspešno ste se odjavili.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FitOffice Domov'),
        centerTitle: true,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FutureBuilder<bool>(
            future: _isLoggedIn,
            builder: (context, snapshot) {
              if (snapshot.connectionState != ConnectionState.done) {
                return const CircularProgressIndicator();
              }

              final loggedIn = snapshot.data ?? false;
              return Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: () async {
                      await Navigator.pushNamed(context, '/login');
                      setState(() {
                        _isLoggedIn = _checkLoginStatus();
                      });
                    },
                    child: const Text('Prijava / Registracija'),
                  ),
                  const SizedBox(height: 16),
                  if (loggedIn) ...[
                    ElevatedButton(
                      onPressed: () => Navigator.pushNamed(context, '/sensor'),
                      child: const Text('Začni aktivnost'),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _logout,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Odjava'),
                    ),
                  ],
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}