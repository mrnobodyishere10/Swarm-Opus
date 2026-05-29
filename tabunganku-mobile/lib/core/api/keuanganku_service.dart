// lib/core/api/keuanganku_service.dart
// Integrasi TabunganKu Mobile ↔ KeuanganKu Backend

import '../models/transaction.dart';
import '../models/summary.dart';
import 'api_client.dart';
import '../config/app_config.dart';

class KeuanganKuService {
  late final ApiClient _client;

  KeuanganKuService() {
    _client = ApiClient(baseUrl: AppConfig.instance.apiBaseUrl);
  }

  Future<List<Transaction>> getTransactions({
    required String userId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    final params = <String, String>{
      'user_id': userId,
      'limit': (limit ?? AppConfig.instance.maxTransactionsPerPage).toString(),
    };
    if (startDate != null) params['start_date'] = startDate.toIso8601String().split('T')[0];
    if (endDate != null) params['end_date'] = endDate.toIso8601String().split('T')[0];

    final query = params.entries.map((e) => '${e.key}=${e.value}').join('&');
    final response = await _client.get('/api/transactions?$query');

    final list = response['data'] as List<dynamic>;
    return list.map((e) => Transaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Transaction> addTransaction(Transaction transaction) async {
    final response = await _client.post('/api/transactions', transaction.toJson());
    return Transaction.fromJson(response['data'] as Map<String, dynamic>);
  }

  Future<MonthlySummary> getMonthlySummary({
    required String userId,
    required int year,
    required int month,
  }) async {
    final response = await _client.get(
      '/api/summary?user_id=$userId&year=$year&month=$month',
    );
    return MonthlySummary.fromJson(response['data'] as Map<String, dynamic>);
  }
}
