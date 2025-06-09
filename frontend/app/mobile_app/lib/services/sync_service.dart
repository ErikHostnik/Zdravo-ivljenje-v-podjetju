import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

class SyncService {
  static final SyncService instance = SyncService._internal();
  SyncService._internal();

  static const _key = 'pending_sessions';
  late StreamSubscription<ConnectivityResult> _sub;

  Future<void> init() async {
    _sub = Connectivity().onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        syncAll();
      }
    });
  }

  Future<void> addSession(List<Map<String, dynamic>> session) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    final List<dynamic> list = raw == null ? [] : json.decode(raw);
    list.add(session);
    await prefs.setString(_key, json.encode(list));
  }

  Future<List<List<Map<String, dynamic>>>> getPending() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_key);
    if (raw == null) return [];
    return (json.decode(raw) as List)
        .map<List<Map<String, dynamic>>>(
          (e) => List<Map<String, dynamic>>.from(e),
        )
        .toList();
  }

  Future<void> syncAll() async {
    final prefs = await SharedPreferences.getInstance();
    final pending = await getPending();
    if (pending.isEmpty) return;

    final token = prefs.getString('jwt_token') ?? '';
    final uri = Uri.parse('http://192.168.0.242:3001/api/sensordata');

    for (var session in pending) {
      try {
        final res = await http.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: json.encode({'activity': session}),
        );
        if (res.statusCode != 201) {
          return;
        }
      } catch (_) {
        return;
      }
    }

    await prefs.remove(_key);
  }

  Future<int> pendingCount() async {
    final list = await getPending();
    return list.length;
  }

  void dispose() => _sub.cancel();
}
