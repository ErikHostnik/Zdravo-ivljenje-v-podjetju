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
  final MapController _mapController = MapController();
  LatLng? _lastValidCenter;
  double _lastValidZoom = 15.0;

  bool _arePointsValid(List<LatLng> points) {
    return points.every((pt) =>
        pt.latitude >= -90 &&
        pt.latitude <= 90 &&
        pt.longitude >= -180 &&
        pt.longitude <= 180);
  }

  void _updateCamera() {
    if (widget.pathPoints.isEmpty || !_arePointsValid(widget.pathPoints)) return;

    try {
      if (widget.pathPoints.length == 1) {
        _mapController.move(widget.pathPoints.last, _lastValidZoom);
        _lastValidCenter = widget.pathPoints.last;
      } else {
        final bounds = LatLngBounds.fromPoints(widget.pathPoints);
        _mapController.fitBounds(
          bounds,
          options: const FitBoundsOptions(
            padding: EdgeInsets.all(32),
          ),
        );
        _lastValidCenter = _mapController.center;
        _lastValidZoom = _mapController.zoom;
      }
    } catch (e) {
      print("Camera update error: $e");
      if (_lastValidCenter != null) {
        _mapController.move(_lastValidCenter!, _lastValidZoom);
      }
    }
  }

  @override
  void didUpdateWidget(covariant SensorMapPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pathPoints != oldWidget.pathPoints) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _updateCamera());
    }
  }

  @override
  Widget build(BuildContext context) {
    final validPoints = widget.pathPoints.where((pt) =>
      pt.latitude >= -90 &&
      pt.latitude <= 90 &&
      pt.longitude >= -180 &&
      pt.longitude <= 180,
    ).toList();

    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(
        initialCenter: _lastValidCenter ?? const LatLng(46.5547, 15.6466),
        initialZoom: _lastValidZoom,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.example.mobile_app',
          maxZoom: 19,
          minZoom: 1,
        ),
        PolylineLayer(
          polylines: [
            Polyline(
              points: validPoints,
              strokeWidth: 4,
              color: Colors.blue,
            ),
          ],
        ),
        MarkerLayer(
          markers: validPoints
              .sublist(validPoints.length - (validPoints.length > 100 ? 100 : 0))
              .map((pt) => Marker(
                    width: 40,
                    height: 40,
                    point: pt,
                    child: Icon(
                      validPoints.first == pt 
                          ? Icons.radio_button_checked 
                          : Icons.location_on,
                      color: validPoints.first == pt ? Colors.green : Colors.red,
                      size: 24,
                    ),
                  ))
              .toList(),
        ),
      ],
    );
  }
}