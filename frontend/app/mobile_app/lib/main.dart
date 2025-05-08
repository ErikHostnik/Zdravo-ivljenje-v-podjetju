import 'package:flutter/material.dart';

void main() {
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
          inversePrimary: const Color(0xFFBB86FC),
        ),
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('FitOffice'),
      ),
      body: const Center(
        child: Text(
          'Dobrodošli v FitOffice!',
          style: TextStyle(fontSize: 20),
        ),
      ),
    );
  }
}
