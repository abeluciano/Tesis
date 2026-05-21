import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'report_screen.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final _apiService = ApiService();
  List<dynamic> _reportes = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadReportes();
  }

  Future<void> _loadReportes() async {
    final reportes = await _apiService.getReportes();
    setState(() {
      _reportes = reportes;
      _isLoading = false;
    });
  }

  Color _getColorForUrgencia(String? urgencia) {
    switch (urgencyKey(urgencia)) {
      case 'alto':
        return Colors.red;
      case 'medio':
        return Colors.orange;
      case 'bajo':
        return Colors.green;
      default:
        return Colors.blue;
    }
  }

  String urgencyKey(String? urgencia) {
    return (urgencia ?? '').trim().toLowerCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mapa de Reportes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadReportes();
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await _apiService.logout();
              if (context.mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : FlutterMap(
              options: const MapOptions(
                initialCenter: LatLng(-16.4290, -71.5330), // José Luis Bustamante y Rivero, Arequipa
                initialZoom: 14.0,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.example.app',
                ),
                MarkerLayer(
                  markers: _reportes.map((reporte) {
                    final geojson = reporte['geojson'];
                    if (geojson != null && geojson['type'] == 'Point') {
                      final coords = geojson['coordinates'];
                      final lng = coords[0];
                      final lat = coords[1];
                      return Marker(
                        point: LatLng(lat, lng),
                        width: 40,
                        height: 40,
                        child: Icon(
                          Icons.location_on,
                          color: _getColorForUrgencia(reporte['urgencia']),
                          size: 40,
                        ),
                      );
                    }
                    return null;
                  }).whereType<Marker>().toList(),
                ),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const ReportScreen()),
          );
          if (result == true) {
            setState(() => _isLoading = true);
            _loadReportes();
          }
        },
        label: const Text('Reportar Incidente'),
        icon: const Icon(Icons.add_location_alt),
      ),
    );
  }
}
