import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String baseUrl = 'http://10.0.2.2:3000'; // For Android emulator, use 10.0.2.2. For iOS/Web use localhost.
  final storage = const FlutterSecureStorage();

  Future<String> get _apiUrl async {
    // Basic fallback for development
    return baseUrl; 
  }

  Future<bool> login(String email, String password) async {
    final url = await _apiUrl;
    try {
      final response = await http.post(
        Uri.parse('$url/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await storage.write(key: 'jwt', value: data['token']);
        return true;
      }
    } catch (e) {
      print(e);
    }
    return false;
  }

  Future<bool> register(String nombre, String email, String password) async {
    final url = await _apiUrl;
    try {
      final response = await http.post(
        Uri.parse('$url/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'nombre': nombre, 'email': email, 'password': password}),
      );

      if (response.statusCode == 201) {
        return true;
      }
    } catch (e) {
      print(e);
    }
    return false;
  }

  Future<String?> getToken() async {
    return await storage.read(key: 'jwt');
  }

  Future<void> logout() async {
    await storage.delete(key: 'jwt');
  }
}
