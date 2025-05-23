import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'twofa_mqtt.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoggedIn = false;
  TwoFAMQTT? _twoFaMqtt;

  @override
  void initState() {
    super.initState();
    _checkLoginStatusAndInit();
  }

  Future<void> _checkLoginStatusAndInit() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final userId = prefs.getString('user_id');

    print('DEBUG: HomePage - token: $token');
    print('DEBUG: HomePage - userId: $userId');

    if (token.isNotEmpty && userId != null) {
      print('DEBUG: Prijavljen uporabnik - inicializacija MQTT');
      setState(() => _isLoggedIn = true);
      _twoFaMqtt = TwoFAMQTT(context: context, userId: userId);
      await _twoFaMqtt!.connectAndListen();
    } else {
      print('DEBUG: Uporabnik ni prijavljen');
      setState(() => _isLoggedIn = false);
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
    await prefs.remove('user_id');
    setState(() {
      _isLoggedIn = false;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Uspešno ste se odjavili.')),
    );
    print('DEBUG: Odjava - token in userId odstranjena');
  }

  Future<void> _navigateToLogin() async {
    final result = await Navigator.pushNamed(context, '/login');

    print('DEBUG: Rezultat vrnitve iz login screena: $result');

    // Poizkusi vedno osvežiti stanje, ne glede na result
    await _checkLoginStatusAndInit();
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
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (!_isLoggedIn)
                ElevatedButton(
                  onPressed: _navigateToLogin,
                  child: const Text('Prijava / Registracija'),
                ),
              if (_isLoggedIn) ...[
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
              const SizedBox(height: 20),
              Text(
                'DEBUG: _isLoggedIn = $_isLoggedIn',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
