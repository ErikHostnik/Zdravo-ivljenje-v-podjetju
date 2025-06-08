import 'package:flutter/material.dart';

class Challenge {
  final String title;
  final int current;
  final int goal;

  Challenge(this.title, this.current, this.goal);
}

class challanges extends StatelessWidget {
  const challanges({super.key});

  @override
  Widget build(BuildContext context) {
    final dailyChallenges = [
      Challenge('Naredi 8000 korakov', 3450, 8000),
      Challenge('Porabi 8000 kalorij', 4200, 8000),
      Challenge('Dosezi 1000 m nadmorske višine', 500, 1000),
    ];

    final weeklyChallenges = [
      Challenge('Naredi 24000 korakov', 15000, 24000),
      Challenge('Porabi 24000 kalorij', 11000, 24000),
      Challenge('Dosezi 3000 m nadmorske višine', 1200, 3000),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dnevni in Tedenski Izzivi'),
        backgroundColor: Colors.orange[700],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          children: [
            const Text(
              'Dnevni izzivi',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.teal),
            ),
            const SizedBox(height: 12),
            ...dailyChallenges.map(_buildChallengeTile),

            const SizedBox(height: 32),

            const Text(
              'Tedenski izzivi',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.teal),
            ),
            const SizedBox(height: 12),
            ...weeklyChallenges.map(_buildChallengeTile),
          ],
        ),
      ),
    );
  }

  Widget _buildChallengeTile(Challenge challenge) {
    final progress = (challenge.current / challenge.goal).clamp(0.0, 1.0);

    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(challenge.title, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('${challenge.current} / ${challenge.goal}',
                style: const TextStyle(fontSize: 14, color: Colors.black87)),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 10,
                backgroundColor: Colors.grey[300],
                valueColor: AlwaysStoppedAnimation<Color>(Colors.teal),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
