// lib/core/models/transaction.dart

import 'package:intl/intl.dart';

enum TransactionType { expense, income }

class Transaction {
  final String? id;
  final DateTime date;
  final TransactionType type;
  final String category;
  final String description;
  final double amount;
  final String userId;

  const Transaction({
    this.id,
    required this.date,
    required this.type,
    required this.category,
    required this.description,
    required this.amount,
    required this.userId,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String?,
      date: DateTime.parse(json['date'] as String),
      type: (json['type'] as String) == 'income'
          ? TransactionType.income
          : TransactionType.expense,
      category: json['category'] as String? ?? 'lainnya',
      description: json['description'] as String? ?? '',
      amount: (json['amount'] as num).toDouble(),
      userId: json['user_id'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    if (id != null) 'id': id,
    'date': DateFormat('yyyy-MM-dd').format(date),
    'type': type == TransactionType.income ? 'income' : 'expense',
    'category': category,
    'description': description,
    'amount': amount,
    'user_id': userId,
  };

  String get formattedAmount {
    final f = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    return f.format(amount);
  }

  String get typeLabel => type == TransactionType.income ? 'Pemasukan' : 'Pengeluaran';
}
