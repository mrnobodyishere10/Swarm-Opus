// lib/core/models/summary.dart

class MonthlySummary {
  final double totalIncome;
  final double totalExpense;
  final Map<String, double> byCategory;
  final int transactionCount;

  const MonthlySummary({
    required this.totalIncome,
    required this.totalExpense,
    required this.byCategory,
    required this.transactionCount,
  });

  double get balance => totalIncome - totalExpense;

  factory MonthlySummary.fromJson(Map<String, dynamic> json) {
    final catRaw = json['byCategory'] as Map<String, dynamic>? ?? {};
    return MonthlySummary(
      totalIncome: (json['totalIncome'] as num? ?? 0).toDouble(),
      totalExpense: (json['totalExpense'] as num? ?? 0).toDouble(),
      byCategory: catRaw.map((k, v) => MapEntry(k, (v as num).toDouble())),
      transactionCount: json['transactionCount'] as int? ?? 0,
    );
  }

  // Kategori dengan pengeluaran terbesar
  String get topCategory {
    if (byCategory.isEmpty) return '-';
    return byCategory.entries.reduce((a, b) => a.value > b.value ? a : b).key;
  }
}
