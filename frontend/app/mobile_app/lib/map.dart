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
  final LatLng _fallbackCenter = const LatLng(46.5547, 15.6466);
  final double _fallbackZoom = 15.0;
  double _currentZoom = 15.0; // Track current zoom

  @override
  void initState() {
    super.initState();
    _currentZoom = _fallbackZoom;
  }

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
      // 1) Center camera on the latest point with current zoom
      final last = points.last;
      mapController.move(last, _currentZoom);

      // 2) If more than one point, fit bounds to show full path
      if (points.length > 1) {
        final bounds = LatLngBounds.fromPoints(points);
        mapController.fitCamera(
          CameraFit.bounds(
            bounds: bounds,
            padding: const EdgeInsets.all(32),
          ),
        );
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
        // Base map layer
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.app',
        ),

        // Live marker at the latest position
        if (widget.pathPoints.isNotEmpty)
          MarkerLayer(
            markers: [
              Marker(
                point: widget.pathPoints.last,
                width: 40,
                height: 40,
                builder: (_) => const Icon(
                  Icons.my_location,
                  size: 30,
                  color: Colors.red,
                ),
              ),
            ],
          ),

        // Polyline layer showing the path
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
