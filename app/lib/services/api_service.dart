import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:firebase_auth/firebase_auth.dart';

class ApiService {
  final storage = const FlutterSecureStorage();
  final _auth = FirebaseAuth.instance;

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
      final userCredential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      final user = userCredential.user;
      if (user == null) {
        return {'error': 'No se pudo iniciar sesión'};
      }

      final token = await user.getIdToken();
      if (token == null) {
        return {'error': 'No se pudo obtener el token de autenticación'};
      }

      await storage.write(key: 'jwt', value: token);
      
      return {
        'token': token,
        'user': {
          'id': user.uid,
          'nombre': user.displayName ?? email.split('@')[0],
          'email': user.email,
        }
      };
    } on FirebaseAuthException catch (e) {
      print('Firebase Login error: ${e.code} - ${e.message}');
      String errorMessage = 'Error al iniciar sesión';
      if (e.code == 'user-not-found' || e.code == 'wrong-password' || e.code == 'invalid-credential') {
        errorMessage = 'Credenciales incorrectas';
      } else if (e.code == 'invalid-email') {
        errorMessage = 'Formato de correo inválido';
      }
      return {'error': errorMessage};
    } catch (e) {
      print('Login error: $e');
      return {'error': 'No se pudo conectar al servicio de autenticación'};
    }
  }

  Future<Map<String, dynamic>?> register(String nombre, String email, String password) async {
    try {
      final userCredential = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      final user = userCredential.user;
      if (user == null) {
        return {'error': 'No se pudo crear el usuario'};
      }

      await user.updateDisplayName(nombre);
      await user.reload();

      return {
        'id': user.uid,
        'nombre': nombre,
        'email': email,
      };
    } on FirebaseAuthException catch (e) {
      print('Firebase Register error: ${e.code} - ${e.message}');
      String errorMessage = 'Error al registrar usuario';
      if (e.code == 'email-already-in-use') {
        errorMessage = 'El correo ya está registrado';
      } else if (e.code == 'weak-password') {
        errorMessage = 'La contraseña es muy débil';
      } else if (e.code == 'invalid-email') {
        errorMessage = 'Formato de correo inválido';
      }
      return {'error': errorMessage};
    } catch (e) {
      print('Register error: $e');
      return {'error': 'No se pudo conectar al servicio de autenticación'};
    }
  }

  Future<String?> getToken() async {
    // Refresh token if user is signed in to make sure it's valid
    final currentUser = _auth.currentUser;
    if (currentUser != null) {
      final token = await currentUser.getIdToken(true);
      await storage.write(key: 'jwt', value: token);
      return token;
    }
    return await storage.read(key: 'jwt');
  }

  Future<void> logout() async {
    await _auth.signOut();
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

  Future<Map<String, dynamic>?> createReport({
    required String categoria,
    required String urgencia,
    required String descripcion,
    required double latitud,
    required double longitud,
  }) async {
    try {
      final token = await getToken();
      if (token == null) {
        return {'error': 'No hay sesión activa'};
      }

      final response = await http.post(
        Uri.parse('$baseUrl/reportes'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'categoria': categoria,
          'urgencia': urgencia,
          'descripcion': descripcion,
          'latitud': latitud,
          'longitud': longitud,
        }),
      );

      if (response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        final body = jsonDecode(response.body);
        return {'error': body['error'] ?? 'No se pudo crear el reporte'};
      }
    } catch (e) {
      print('Create report error: $e');
      return {'error': 'No se pudo conectar al servidor'};
    }
  }
}
