// lib/core/config/app_config.dart
// Sovereign Pattern: Remote config dengan fallback berlapis

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AppConfig {
  static AppConfig? _instance;
  static AppConfig get instance {
    if (_instance == null) throw StateError('AppConfig belum diinisialisasi. Panggil AppConfig.initialize() di main()');
    return _instance!;
  }

  final String apiBaseUrl;
  final String appVersion;
  final bool featureBudgetAlert;
  final bool featureWeeklySummary;
  final int maxTransactionsPerPage;

  const AppConfig._({
    required this.apiBaseUrl,
    required this.appVersion,
    this.featureBudgetAlert = false,
    this.featureWeeklySummary = true,
    this.maxTransactionsPerPage = 50,
  });

  static const String _defaultApiUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://keuanganku-api.railway.app',
  );

  static AppConfig get _defaults => const AppConfig._(
    apiBaseUrl: _defaultApiUrl,
    appVersion: '1.0.0',
  );

  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final remoteConfigUrl = '$_defaultApiUrl/api/config';

    try {
      final response = await http
          .get(Uri.parse(remoteConfigUrl))
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        await prefs.setString('remote_config_cache', response.body);
        _instance = AppConfig._(
          apiBaseUrl: data['api_base_url'] as String? ?? _defaults.apiBaseUrl,
          appVersion: data['app_version'] as String? ?? _defaults.appVersion,
          featureBudgetAlert: data['feature_budget_alert'] as bool? ?? false,
          featureWeeklySummary: data['feature_weekly_summary'] as bool? ?? true,
          maxTransactionsPerPage: data['max_transactions_per_page'] as int? ?? 50,
        );
        return;
      }
    } catch (_) {
      // Remote gagal, coba cache
    }

    final cached = prefs.getString('remote_config_cache');
    if (cached != null) {
      try {
        final data = jsonDecode(cached) as Map<String, dynamic>;
        _instance = AppConfig._(
          apiBaseUrl: data['api_base_url'] as String? ?? _defaults.apiBaseUrl,
          appVersion: data['app_version'] as String? ?? _defaults.appVersion,
          featureBudgetAlert: data['feature_budget_alert'] as bool? ?? false,
          featureWeeklySummary: data['feature_weekly_summary'] as bool? ?? true,
          maxTransactionsPerPage: data['max_transactions_per_page'] as int? ?? 50,
        );
        return;
      } catch (_) {}
    }

    // Fallback ke default
    _instance = _defaults;
  }
}
