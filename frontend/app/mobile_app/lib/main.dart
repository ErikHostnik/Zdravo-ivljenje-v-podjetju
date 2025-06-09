import 'package:flutter/material.dart';
import 'services/sync_service.dart';
import 'home.dart';
import 'sensor_mqtt.dart';
import 'login_register.dart';

void main() {

  WidgetsFlutterBinding.ensureInitialized();
  await SyncService.instance.init();

  runApp(const FitOfficeApp());
}

class FitOfficeApp extends StatelessWidget {
  const FitOfficeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FitOffice',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6750A4),
          brightness: Brightness.light,
          primary: const Color(0xFF6750A4),
          secondary: const Color(0xFF03DAC6),
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const HomePage(),
        '/login': (context) => const LoginRegisterPage(),
        '/sensor': (context) => const SensorMQTTPage(),
      },
    );
  }
}
