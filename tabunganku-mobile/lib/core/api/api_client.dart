// lib/core/api/api_client.dart

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final Duration timeout;

  const ApiClient({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 30),
  });

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http
        .get(Uri.parse('$baseUrl$path'), headers: _headers)
        .timeout(timeout);
    return _handle(response);
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> body) async {
    final response = await http
        .post(Uri.parse('$baseUrl$path'), headers: _headers, body: jsonEncode(body))
        .timeout(timeout);
    return _handle(response);
  }

  Map<String, dynamic> _handle(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw ApiException(response.statusCode, response.body);
  }
}
