import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class Challenge {
  final String title;
  final int current;
  final int goal;

  Challenge(this.title, this.current, this.goal);
}

class Challenges extends StatefulWidget {
  const Challenges({super.key});

  @override
  State<Challenges> createState() => _ChallengesState();
}

class _ChallengesState extends State<Challenges> {
  late Future<List<Challenge>> _challengesFuture;

  @override
  void initState() {
    super.initState();
    _challengesFuture = _fetchChallenges();
  }

  Future<List<Challenge>> _fetchChallenges() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('jwt_token') ?? '';
    final userId = prefs.getString('user_id') ?? '';
    final url = Uri.parse('http://192.168.0.26:3001/api/users/$userId');
    final response = await http.get(
      url,
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (response.statusCode != 200) {
      throw Exception('Failed to load user data: ${response.statusCode}');
    }
    
    final data = jsonDecode(response.body);
    final dailyStats = data['dailyStats'] as List<dynamic>? ?? [];

    final now = DateTime.now();
    final todayKey = DateTime(now.year, now.month, now.day).toIso8601String();

    // Find today's stats
    Map<String, dynamic> todayStats = {};
    for (var entry in dailyStats) {
      final dateString = entry['date'] as String?;
      if (dateString != null && dateString.startsWith(todayKey)) {
        todayStats = entry;
        break;
      }
    }

    // Get values from today's stats
    final dailySteps = (todayStats['stepCount'] as num?)?.toInt() ?? 0;
    final dailyAltitude = (todayStats['altitudeDistance'] as num?)?.toInt() ?? 0;
    
    // Calculate weekly stats
    int weeklySteps = 0;
    int weeklyAltitude = 0;
    final weekStart = now.subtract(const Duration(days: 6));
    
    for (var entry in dailyStats) {
      final dateString = entry['date'] as String?;
      if (dateString != null) {
        try {
          final entryDate = DateTime.parse(dateString);
          if (entryDate.isAfter(weekStart)) {
            weeklySteps += (entry['stepCount'] as num?)?.toInt() ?? 0;
            weeklyAltitude += (entry['altitudeDistance'] as num?)?.toInt() ?? 0;
          }
        } catch (e) {
          debugPrint('Error parsing date: $dateString');
        }
      }
    }

    // Improved calorie calculation (steps + altitude)
    final dailyCalories = (dailySteps * 0.04 + dailyAltitude * 0.1).round();
    final weeklyCalories = (weeklySteps * 0.04 + weeklyAltitude * 0.1).round();

    return [
      // Daily challenges
      Challenge('Naredi 8000 korakov', dailySteps, 8000),
      Challenge('Porabi 8000 kalorij', dailyCalories, 8000),
      Challenge('Dosezi 1000 m nadmorske višine', dailyAltitude, 1000),
      
      // Weekly challenges
      Challenge('Naredi 24000 korakov', weeklySteps, 24000),
      Challenge('Porabi 24000 kalorij', weeklyCalories, 24000),
      Challenge('Dosezi 3000 m nadmorske višine', weeklyAltitude, 3000),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Izzivi'),
        backgroundColor: Colors.orange[700],
      ),
      body: FutureBuilder<List<Challenge>>(
        future: _challengesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Napaka: ${snapshot.error}'));
          }
          final challenges = snapshot.data!;

          // Ločimo na dnevne in tedenske izzive
          final dailyChallenges = challenges.sublist(0, 3);
          final weeklyChallenges = challenges.sublist(3);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Dnevni izzivi',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
                const SizedBox(height: 10),
                ...dailyChallenges.map((c) => _buildChallengeCard(c)),
                const SizedBox(height: 30),
                const Text(
                  'Tedenski izzivi',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
                const SizedBox(height: 10),
                ...weeklyChallenges.map((c) => _buildChallengeCard(c)),
              ],
            ),
          );
        },
      ),
    );
  }

  // Helper za gradnjo kartice izziva
  Widget _buildChallengeCard(Challenge c) {
    final progress = (c.current / c.goal).clamp(0.0, 1.0);
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.only(bottom: 15),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              c.title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '${c.current} / ${c.goal}',
              style: const TextStyle(
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 12,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(
                  progress >= 1.0 ? Colors.green : Colors.teal,
                ),
              ),
            ),
            const SizedBox(height: 5),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${(progress * 100).toStringAsFixed(1)}%',
                style: TextStyle(
                  fontSize: 12,
                  color: progress >= 1.0
                      ? Colors.green
                      : Colors.grey[700],
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
