import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import 'login_screen.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _apiService = ApiService();
  final _descripcionController = TextEditingController();
  
  String _selectedCategory = 'robo';
  String _selectedUrgency = 'medio';
  
  Position? _currentPosition;
  String _locationStatus = 'Obteniendo ubicación GPS...';
  bool _isGettingLocation = true;
  bool _isSubmitting = false;

  final List<Map<String, String>> _categories = [
    {'value': 'robo', 'label': 'Robo'},
    {'value': 'asalto', 'label': 'Asalto'},
    {'value': 'vandalismo', 'label': 'Vandalismo'},
    {'value': 'extorsion', 'label': 'Extorsión'},
    {'value': 'alumbrado_deficiente', 'label': 'Alumbrado Deficiente'},
    {'value': 'infraestructura_danada', 'label': 'Infraestructura Dañada'},
  ];

  final List<String> _urgencies = ['bajo', 'medio', 'alto'];

  @override
  void initState() {
    super.initState();
    _determinePosition();
  }

  @override
  void dispose() {
    _descripcionController.dispose();
    super.dispose();
  }

  Future<void> _determinePosition() async {
    setState(() {
      _isGettingLocation = true;
      _locationStatus = 'Obteniendo ubicación GPS...';
    });

    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _locationStatus = 'El servicio de ubicación está desactivado.';
          _isGettingLocation = false;
        });
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() {
            _locationStatus = 'Permisos de ubicación denegados.';
            _isGettingLocation = false;
          });
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _locationStatus = 'Los permisos de ubicación están denegados permanentemente.';
          _isGettingLocation = false;
        });
        return;
      }

      Position position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );

      setState(() {
        _currentPosition = position;
        _locationStatus = 'Ubicación GPS obtenida con éxito.';
        _isGettingLocation = false;
      });
    } catch (e) {
      setState(() {
        _locationStatus = 'Error al obtener ubicación: $e';
        _isGettingLocation = false;
      });
    }
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency) {
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

  void _submitReport() async {
    if (_currentPosition == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, espera a que se obtenga la ubicación GPS.')),
      );
      return;
    }

    if (_descripcionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, ingresa una descripción del incidente.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final result = await _apiService.createReport(
      categoria: _selectedCategory,
      urgencia: _selectedUrgency,
      descripcion: _descripcionController.text.trim(),
      latitud: _currentPosition!.latitude,
      longitud: _currentPosition!.longitude,
    );

    setState(() => _isSubmitting = false);

    if (!mounted) return;

    if (result != null && !result.containsKey('error')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reporte enviado con éxito.')),
      );
      _descripcionController.clear();
      _determinePosition();
    } else {
      final errorMsg = result?['error'] ?? 'Error al enviar reporte';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMsg)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nuevo Reporte de Incidente'),
        automaticallyImplyLeading: false,
        actions: [
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
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // GPS Location Card
            Card(
              elevation: 2,
              color: _currentPosition != null ? Colors.green.shade50 : Colors.orange.shade50,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Icon(
                      _currentPosition != null ? Icons.gps_fixed : Icons.gps_off,
                      color: _currentPosition != null ? Colors.green : Colors.orange,
                      size: 32,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _currentPosition != null ? 'GPS Listo' : 'Obteniendo GPS',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: _currentPosition != null ? Colors.green.shade900 : Colors.orange.shade900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _currentPosition != null
                                ? 'Lat: ${_currentPosition!.latitude.toStringAsFixed(6)}, Lng: ${_currentPosition!.longitude.toStringAsFixed(6)}'
                                : _locationStatus,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: _currentPosition != null ? Colors.green.shade800 : Colors.orange.shade800,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_isGettingLocation)
                      const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.5),
                      )
                    else if (_currentPosition == null)
                      IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: _determinePosition,
                        color: Colors.orange.shade900,
                      )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Category Selection
            Text(
              'Categoría del Incidente',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat['value'];
                return ChoiceChip(
                  label: Text(cat['label']!),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedCategory = cat['value']!);
                    }
                  },
                  selectedColor: theme.colorScheme.primaryContainer,
                  labelStyle: TextStyle(
                    color: isSelected ? theme.colorScheme.onPrimaryContainer : theme.colorScheme.onSurface,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Urgency Selection
            Text(
              'Nivel de Urgencia',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: _urgencies.map((urg) {
                final isSelected = _selectedUrgency == urg;
                final color = _getUrgencyColor(urg);
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: ChoiceChip(
                      label: Center(
                        child: Text(
                          urg.toUpperCase(),
                          style: TextStyle(
                            color: isSelected ? Colors.white : color,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) {
                          setState(() => _selectedUrgency = urg);
                        }
                      },
                      selectedColor: color,
                      backgroundColor: Colors.white,
                      side: BorderSide(color: color, width: 1.5),
                      showCheckmark: false,
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),

            // Description Input
            Text(
              'Detalles del Incidente',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _descripcionController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Describe lo que está ocurriendo (referencias, número de personas, etc.)...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: theme.colorScheme.primary, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Submit Button
            _isSubmitting
                ? const Center(child: CircularProgressIndicator())
                : ElevatedButton(
                    onPressed: _submitReport,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 3,
                    ),
                    child: const Text(
                      'ENVIAR REPORTE',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
