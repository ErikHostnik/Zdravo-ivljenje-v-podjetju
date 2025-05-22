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
  final mapController = MapController();

  @override
  void didUpdateWidget(covariant SensorMapPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pathPoints.length >= 2) {
      final bounds = LatLngBounds.fromPoints(widget.pathPoints);
      mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.all(32),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: widget.pathPoints.isNotEmpty
            ? widget.pathPoints.first
            : LatLng(0, 0),
        initialZoom: 15,
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
