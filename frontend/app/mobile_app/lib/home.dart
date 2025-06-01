import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'twofa_mqtt.dart';
import 'camera_capture.dart';

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

    if (token.isNotEmpty && userId != null) {
      setState(() => _isLoggedIn = true);
      _twoFaMqtt = TwoFAMQTT(context: context, userId: userId);
      await _twoFaMqtt!.connectAndListen();
    } else {
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
  }

  Future<void> _navigateToLogin() async {
    await Navigator.pushNamed(context, '/login');
    await _checkLoginStatusAndInit();
  }

  Future<void> _setup2FA() async {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const CameraCaptureScreen()),
    );
  }

  @override
  void dispose() {
    _twoFaMqtt?.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FitOffice Domov'),
        centerTitle: true,
        backgroundColor: Colors.teal[700],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo na vrhu
              SizedBox(
                height: 250,
                child: Image.asset(
                  'assets/FitOffice_logo_new.jpeg',
                  fit: BoxFit.contain,
                ),
              ),

              const SizedBox(height: 24),

              // Naslov
              const Text(
                'Dobrodošli v FitOffice',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.teal,
                ),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 12),

              // Opis
              const Text(
                'FitOffice je vaša platforma za spremljanje aktivnosti in motivacijo za zdrav življenjski slog na delovnem mestu. '
                'Začni svojo aktivnost z enim klikom in spremljaj svoje korake, prehojene razdalje ter izkoristi personalizirane izzive!',
                style: TextStyle(fontSize: 16, color: Colors.black87),
                textAlign: TextAlign.center,
              ),

              const SizedBox(height: 36),

              // Gumbi za prijavo ali aktivnosti
              if (!_isLoggedIn)
                ElevatedButton.icon(
                  onPressed: _navigateToLogin,
                  icon: const Icon(Icons.login),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14.0),
                    child: Text('Prijava / Registracija', style: TextStyle(fontSize: 18)),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              if (_isLoggedIn) ...[
                ElevatedButton.icon(
                  onPressed: () => Navigator.pushNamed(context, '/sensor'),
                  icon: const Icon(Icons.directions_run),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14.0),
                    child: Text('Začni aktivnost', style: TextStyle(fontSize: 18)),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[700],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),

                ElevatedButton.icon(
                  onPressed: _setup2FA,
                  icon: const Icon(Icons.verified_user),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14.0),
                    child: Text('Nastavi 2FA', style: TextStyle(fontSize: 18)),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueGrey[700],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),

                const SizedBox(height: 16),

                ElevatedButton.icon(
                  onPressed: _logout,
                  icon: const Icon(Icons.logout),
                  label: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 14.0),
                    child: Text('Odjava', style: TextStyle(fontSize: 18)),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[700],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    minimumSize: const Size(double.infinity, 50),
                  ),
                ),
              ],

              const SizedBox(height: 40),

              // Debug info (lahko odstraniš pozneje)
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