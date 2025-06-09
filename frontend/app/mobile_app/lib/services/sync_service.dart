import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class SyncService {
  static final SyncService instance = SyncService._internal();
  SyncService._internal();

  static const _key = 'pending_sessions';
  Timer? _poller;

  Future<void> init() async {
    _poller = Timer.periodic(const Duration(seconds: 30), (_) async {
      try {
        final result = await InternetAddress.lookup('example.com');
        if (result.isNotEmpty && result.first.rawAddress.isNotEmpty) {
          await syncAll();
        }
      } catch (_) {
        // no connection
      }
    });
  }

  Future<void> dispose() async {
    _poller?.cancel();
  }

  Future<void> addSession(List<Map<String, dynamic>> session) async {
    if (session.isEmpty) return; // ⛔ Skip empty sessions

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
    final pending = await getPending();
    if (pending.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final uri = Uri.parse('http://192.168.0.242:3001/api/sensordata');

    for (var session in pending) {
      try {
        final payload = {'activity': session};
        debugPrint('🔄 SyncService: sending payload → ${jsonEncode(payload)}');
        final res = await http.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(payload),
        );
        debugPrint('🔄 SyncService: got ${res.statusCode} → ${res.body}');
        if (res.statusCode != 201) {
          // abort on any error
          return;
        }
      } catch (e) {
        debugPrint('🔄 SyncService: error → $e');
        return;
      }
    }

    // all batches succeeded
    debugPrint('🔄 SyncService: all sessions synced, clearing queue.');
    await prefs.remove(_key);
  }

  Future<int> pendingCount() async {
    final list = await getPending();
    return list.length;
  }
}
