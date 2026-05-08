import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  final storage = const FlutterSecureStorage();

  String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000';
    }
    // Android emulator uses 10.0.2.2 to reach host localhost
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    // Windows desktop, iOS simulator, etc.
    return 'http://localhost:3000';
  }

  Future<Map<String, dynamic>?> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storage.write(key: 'jwt', value: data['token']);
        return data;
      } else {
        final body = jsonDecode(response.body);
        return {'error': body['error'] ?? 'Login failed'};
      }
    } catch (e) {
      print('Login error: $e');
      return {'error': 'No se pudo conectar al servidor'};
    }
  }

  Future<Map<String, dynamic>?> register(String nombre, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'nombre': nombre, 'email': email, 'password': password}),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        final body = jsonDecode(response.body);
        return {'error': body['error'] ?? 'Registration failed'};
      }
    } catch (e) {
      print('Register error: $e');
      return {'error': 'No se pudo conectar al servidor'};
    }
  }

  Future<String?> getToken() async {
    return await storage.read(key: 'jwt');
  }

  Future<void> logout() async {
    await storage.delete(key: 'jwt');
  }

  Future<List<dynamic>> getReportes() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/reportes'));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Reportes error: $e');
    }
    return [];
  }
}
