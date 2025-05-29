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
  LatLng _fallbackCenter = const LatLng(46.5547, 15.6466);
  double _fallbackZoom = 15.0;

  @override
  void didUpdateWidget(covariant SensorMapPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pathPoints != oldWidget.pathPoints) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _updateCamera());
    }
  }

  void _updateCamera() {
    final points = widget.pathPoints;
    if (points.isEmpty) return;

    try {
      final last = points.last;
      mapController.move(last, mapController.zoom);

      if (points.last > 1){
        final.bounds = LatLngBounds.fromPoints(points);
        mapController.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(32)));
      }
    } catch (e) {
      print("Camera update error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return FlutterMap(
      mapController: mapController,
      options: MapOptions(
        initialCenter: _fallbackCenter,
        initialZoom: _fallbackZoom,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.app',
        ),
        if (widget.pathPoints.isNotEmpty)
          PolylineLayer(
            polylines: [
              Polyline(
                points: widget.pathPoints,
                strokeWidth: 4.0,
                color: Colors.blue,
              ),
            ],
          ),
      ],
    );
  }
}
