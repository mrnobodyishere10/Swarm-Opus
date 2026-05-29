// lib/features/transactions/transaction_list_page.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/keuanganku_service.dart';
import '../../core/models/transaction.dart';

class TransactionListPage extends StatefulWidget {
  final String userId;
  const TransactionListPage({super.key, required this.userId});

  @override
  State<TransactionListPage> createState() => _TransactionListPageState();
}

class _TransactionListPageState extends State<TransactionListPage> {
  final _service = KeuanganKuService();
  List<Transaction> _transactions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final now = DateTime.now();
      final items = await _service.getTransactions(
        userId: widget.userId,
        startDate: DateTime(now.year, now.month, 1),
      );
      setState(() { _transactions = items; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Transaksi', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF58A6FF)))
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _transactions.isEmpty
                      ? const Center(child: Text('Belum ada transaksi bulan ini',
                          style: TextStyle(color: Color(0xFF8B949E))))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _transactions.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (_, i) => _TransactionTile(tx: _transactions[i]),
                        ),
                ),
    );
  }
}

class _TransactionTile extends StatelessWidget {
  final Transaction tx;
  const _TransactionTile({required this.tx});

  @override
  Widget build(BuildContext context) {
    final isIncome = tx.type == TransactionType.income;
    final color = isIncome ? const Color(0xFF3FB950) : const Color(0xFFF85149);
    final icon = isIncome ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded;
    final dateFmt = DateFormat('dd MMM', 'id_ID');

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF30363D)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(tx.description.isNotEmpty ? tx.description : tx.category,
              style: const TextStyle(color: Colors.white, fontSize: 14)),
            Text(tx.category,
              style: const TextStyle(color: Color(0xFF8B949E), fontSize: 12)),
          ],
        )),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(tx.formattedAmount,
            style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14)),
          Text(dateFmt.format(tx.date),
            style: const TextStyle(color: Color(0xFF8B949E), fontSize: 11)),
        ]),
      ]),
    );
  }
}
