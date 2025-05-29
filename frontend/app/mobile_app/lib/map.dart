import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class SensorMapPage extends StatefulWidget {
  final List<LatLng> pathPoints;

  const SensorMapPage({Key? key, required this.pathPoints}) : super(key: key);

  @override
  State<SensorMapPage> createState() => _SensorMapPageState();
}

class _SensorMapPageState extends State<SensorMapPage> with SingleTickerProviderStateMixin {
  final mapController = MapController();
  final LatLng _fallbackCenter = const LatLng(46.5547, 15.6466);
  final double _defaultZoom = 15.0;

  late final AnimationController _animController;
  late Animation<double> _latAnim;
  late Animation<double> _lngAnim;
  late Animation<double> _zoomAnim;

  LatLng _currentCenter;
  double _currentZoom;

  _SensorMapPageState()
      : _currentCenter = const LatLng(46.5547, 15.6466),
        _currentZoom = 15.0;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..addListener(_onAnimate);
  }

  @override
  void didUpdateWidget(covariant SensorMapPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.pathPoints != oldWidget.pathPoints && widget.pathPoints.isNotEmpty) {
      _animateCameraTo(widget.pathPoints.last, _defaultZoom);
    }
  }

  void _animateCameraTo(LatLng targetCenter, double targetZoom) {
    _animController.reset();

    _latAnim = Tween<double>(begin: _currentCenter.latitude, end: targetCenter.latitude)
        .animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOut));
    _lngAnim = Tween<double>(begin: _currentCenter.longitude, end: targetCenter.longitude)
        .animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOut));
    _zoomAnim = Tween<double>(begin: _currentZoom, end: targetZoom)
        .animate(CurvedAnimation(parent: _animController, curve: Curves.easeInOut));

    _animController.forward().whenComplete(() {
      _currentCenter = targetCenter;
      _currentZoom = targetZoom;
    });
  }

  void _onAnimate() {
    final lat = _latAnim.value;
    final lng = _lngAnim.value;
    final zoom = _zoomAnim.value;
    mapController.move(LatLng(lat, lng), zoom);
  }

  @override
  void dispose() {
    _animController.removeListener(_onAnimate);
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 300, // Določi višino karte
      child: Stack(
        children: [
          FlutterMap(
            mapController: mapController,
            options: MapOptions(
              // Če ni še nobene točke, gremo na rezervno lokacijo
              center: widget.pathPoints.isNotEmpty
                  ? widget.pathPoints.last
                  : _fallbackCenter,
              zoom: _defaultZoom,
              interactiveFlags: InteractiveFlag.all & ~InteractiveFlag.rotate, 
              // onemogočiš rotacijo, če želiš
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.example.app',
              ),
              // Če želiš narisati polilinijo tudi v ozadju
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