import 'package:flutter/material.dart';

class challanges extends StatelessWidget {
  const challanges({super.key});

  @override
  Widget build(BuildContext context) {
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
            _buildChallengeTile('Naredi 8000 korakov'),
            _buildChallengeTile('Porabi 8000 kalorij'),
            _buildChallengeTile('Dosezi 1000 m nadmorske višine'),

            const SizedBox(height: 32),

            const Text(
              'Tedenski izzivi',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.teal),
            ),
            const SizedBox(height: 12),
            _buildChallengeTile('Naredi 24000 korakov'),
            _buildChallengeTile('Porabi 24000 kalorij'),
            _buildChallengeTile('Dosezi 3000 m nadmorske višine'),
          ],
        ),
      ),
    );
  }

  Widget _buildChallengeTile(String title) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const Icon(Icons.check_circle_outline, color: Colors.grey),
        title: Text(title),
      ),
    );
  }
}
