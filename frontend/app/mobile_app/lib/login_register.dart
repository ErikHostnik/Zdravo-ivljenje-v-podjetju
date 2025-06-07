import 'package:flutter/material.dart';
import 'sensor_mqtt.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:async';
import 'package:mqtt_client/mqtt_client.dart';
import 'package:mqtt_client/mqtt_server_client.dart';

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
  final String baseUrl = 'http://192.168.0.11:3001/api/users';

  late MqttServerClient _mqttClient;
  Timer? _heartbeatTimer;
  String? _currentUserId;

  static const String _broker = '192.168.0.26';
  static const int _port = 1883;

  Future<void> _submit() async {
    final username = usernameCtrl.text.trim();
    final email = emailCtrl.text.trim();
    final password = passwordCtrl.text.trim();

    try {
      final url = isLogin ? '$baseUrl/login' : baseUrl;
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
            const SnackBar(content: Text('Dvojna avtentikacija je potrebna.')),
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
          _currentUserId = data['user']['_id'];
        } else {
          print('DEBUG: user_id manjka!');
        }

        if (_currentUserId != null) {
          await _connectToMqttBroker(_currentUserId!);
          if (_mqttClient.connectionStatus?.state == MqttConnectionState.connected) {
            _startHeartbeatTimer();
          } else {
            _mqttClient.onConnected = () {
              _startHeartbeatTimer();
            };
          }
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


  Future<void> _connectToMqttBroker(String userId) async {
    _mqttClient = MqttServerClient(_broker, userId);
    _mqttClient.port = _port;
    _mqttClient.logging(on: false);
    _mqttClient.keepAlivePeriod = 20;
    _mqttClient.onDisconnected = _onMqttDisconnected;
    _mqttClient.onConnected = _onMqttConnected;
    _mqttClient.onSubscribed = _onMqttSubscribed;

    final connMess = MqttConnectMessage()
        .withClientIdentifier(userId)
        .startClean()
        .withWillQos(MqttQos.atLeastOnce);
    _mqttClient.connectionMessage = connMess;

    try {
      await _mqttClient.connect();
    } catch (e) {
      print('MQTT konekcija neuspešna: $e');
      _mqttClient.disconnect();
    }
  }

  void _onMqttConnected() {
    print('MQTT: Povezan na $_broker:$_port');
    if (_heartbeatTimer == null || !_heartbeatTimer!.isActive) {
      _startHeartbeatTimer();
    }
  }

  void _onMqttDisconnected() {
    print('MQTT: Odklopljen');
  }

  void _onMqttSubscribed(String topic) {
    print('MQTT: Subscribed na $topic');
  }

  void _sendHeartbeat() {
    if (_mqttClient.connectionStatus?.state == MqttConnectionState.connected &&
        _currentUserId != null) {
      final topic = 'status/heartbeat/$_currentUserId';
      final payloadMap = {
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      };
      final builder = MqttClientPayloadBuilder()..addString(jsonEncode(payloadMap));

      _mqttClient.publishMessage(
        topic,
        MqttQos.atLeastOnce,
        builder.payload!,
        retain: false,
      );
      print('[HEARTBEAT] Poslano za uporabnika $_currentUserId');
    }
  }

  void _startHeartbeatTimer() {
    _sendHeartbeat();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      _sendHeartbeat();
    });
  }

  @override
  void dispose() {
    _heartbeatTimer?.cancel();
    if (_mqttClient.connectionStatus?.state == MqttConnectionState.connected) {
      _mqttClient.disconnect();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(isLogin ? 'Prijava' : 'Registracija')),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'FitOffice',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.primaryColorDark,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                isLogin
                    ? 'Prijavite se, da začnete z vadbo in spremljanjem aktivnosti.'
                    : 'Ustvarite račun in pridružite se FitOffice skupnosti.',
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: usernameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Uporabniško ime',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              if (!isLogin)
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                ),
              if (!isLogin) const SizedBox(height: 16),
              TextField(
                controller: passwordCtrl,
                decoration: const InputDecoration(
                  labelText: 'Geslo',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  isLogin ? 'Prijava' : 'Registracija',
                  style: const TextStyle(fontSize: 18),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () {
                  setState(() => isLogin = !isLogin);
                  usernameCtrl.clear();
                  emailCtrl.clear();
                  passwordCtrl.clear();
                },
                child: Text(
                  isLogin ? 'Nimate računa? Registracija' : 'Imate račun? Prijava',
                  style: TextStyle(color: theme.primaryColor),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
