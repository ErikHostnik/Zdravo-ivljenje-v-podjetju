import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class SensorMapPage extends StatefulWidget {
  final List<LatLng> pathPoints;
  const SensorMapPage({Key? key, required this.pathPoints}) : super(key: key);

  @override
  State<SensorMapPage> createState() => _SensorMapPageState();
}

class _SensorMapPageState extends State<SensorMapPage> {
  @override
  Widget build(BuildContext context) {
    final center = widget.pathPoints.isNotEmpty
        ? widget.pathPoints.first
        : LatLng(0.0, 0.0);

    return FlutterMap(
      options: MapOptions(
        initialCenter: center,
        initialZoom: 16.0,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          subdomains: const ['a', 'b', 'c'],
        ),
        if (widget.pathPoints.length > 1)
          PolylineLayer(
            polylines: [
              Polyline(
                points: widget.pathPoints,
                strokeWidth: 4.0,
                color: Colors.blue,
              ),
            ],
          ),
        if (widget.pathPoints.isNotEmpty)
          MarkerLayer(
            markers: widget.pathPoints.map((pt) {
              final isStart = pt == widget.pathPoints.first;
              return Marker(
                width: 50,
                height: 50,
                point: pt,
                child: Icon(
                  isStart ? Icons.radio_button_checked : Icons.location_on,
                  color: isStart ? Colors.green : Colors.red,
                  size: 32,
                ),
              );
            }).toList(),
          ),
      ],
    );
  }
}