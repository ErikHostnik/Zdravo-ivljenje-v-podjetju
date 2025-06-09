import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/sync_service.dart';
import '../change_password_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int _interval = 0; // minutes
  int _pending = 0;

  @override
  void initState() {
    super.initState();
    _loadPrefs();
    _updatePending();
  }

  Future<void> _loadPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _interval = prefs.getInt('reminder_interval') ?? 0;
    });
  }

  Future<void> _saveInterval(int minutes) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('reminder_interval', minutes);
    setState(() => _interval = minutes);
  }

  Future<void> _updatePending() async {
    final count = await SyncService.instance.pendingCount();
    setState(() => _pending = count);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nastavitve Sinhronizacije')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text('Časovna razporeditev sinhronizacije: $_interval min'),
            Slider(
              min: 0,
              max: 120,
              divisions: 4,
              label: _interval == 0 ? 'Izklopljeno' : '$_interval min',
              value: _interval.toDouble(),
              onChanged: (v) => _saveInterval(v.toInt()),
            ),
            const SizedBox(height: 24),
            Text('Čaka na sinhronizacijo: $_pending sej'),
            ElevatedButton(
              onPressed: () async {
                await SyncService.instance.syncAll();
                await _updatePending();
              },
              child: const Text('Sinhroniziraj zdaj'),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.lock_open),
              label: const Text('Spremeni geslo'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const ChangePasswordScreen(),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
