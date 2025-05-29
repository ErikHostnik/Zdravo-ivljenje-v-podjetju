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
  final double _defaultZoom = 15.0;

  @override
  void didUpdateWidget(covariant SensorMapPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pathPoints != oldWidget.pathPoints && widget.pathPoints.isNotEmpty) {
      mapController.move(widget.pathPoints.last, _defaultZoom);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 300,
      child: Stack(
        children: [
          FlutterMap(
            mapController: mapController,
            options: MapOptions(
              center: widget.pathPoints.isNotEmpty
                  ? widget.pathPoints.last
                  : _fallbackCenter,
              zoom: _defaultZoom,
              interactiveFlags: InteractiveFlag.drag | InteractiveFlag.pinchZoom,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.app',
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
            ],
          ),

          // Fiksni marker na sredini
          const Align(
            alignment: Alignment.center,
            child: Icon(
              Icons.my_location,
              size: 36,
              color: Colors.redAccent,
            ),
          ),
        ],
      ),
    );
  }
}