// lib/features/dashboard/dashboard_page.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/keuanganku_service.dart';
import '../../core/models/summary.dart';
import '../../core/config/app_config.dart';
import '../transactions/transaction_list_page.dart';
import '../transactions/add_transaction_page.dart';

class DashboardPage extends StatefulWidget {
  final String userId;
  const DashboardPage({super.key, required this.userId});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final _service = KeuanganKuService();
  MonthlySummary? _summary;
  bool _loading = true;
  String? _error;

  static const _bg = Color(0xFF0D1117);
  static const _surface = Color(0xFF161B22);
  static const _border = Color(0xFF30363D);
  static const _green = Color(0xFF3FB950);
  static const _red = Color(0xFFF85149);
  static const _blue = Color(0xFF58A6FF);
  static const _muted = Color(0xFF8B949E);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final now = DateTime.now();
      final s = await _service.getMonthlySummary(
        userId: widget.userId,
        year: now.year,
        month: now.month,
      );
      setState(() { _summary = s; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final monthLabel = DateFormat('MMMM yyyy', 'id_ID').format(now);

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _surface,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('TabunganKu 💰',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            Text(monthLabel,
              style: const TextStyle(color: _muted, fontSize: 12)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _load,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: _blue))
          : _error != null
              ? _buildError()
              : RefreshIndicator(onRefresh: _load, child: _buildContent()),
      floatingActionButton: FloatingActionButton(
        backgroundColor: _blue,
        foregroundColor: Colors.white,
        onPressed: () async {
          final added = await Navigator.push<bool>(
            context,
            MaterialPageRoute(builder: (_) => AddTransactionPage(userId: widget.userId)),
          );
          if (added == true) _load();
        },
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildError() => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.error_outline, color: _red, size: 48),
        const SizedBox(height: 12),
        Text('Gagal memuat data', style: const TextStyle(color: Colors.white, fontSize: 16)),
        const SizedBox(height: 4),
        Text(_error!, style: const TextStyle(color: _muted, fontSize: 12)),
        const SizedBox(height: 16),
        ElevatedButton(onPressed: _load, child: const Text('Coba Lagi')),
      ],
    ),
  );

  Widget _buildContent() {
    final s = _summary!;
    final fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Balance card utama
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [_blue.withOpacity(0.3), _surface],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: _blue.withOpacity(0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Saldo Bulan Ini', style: TextStyle(color: _muted, fontSize: 13)),
              const SizedBox(height: 8),
              Text(
                fmt.format(s.balance),
                style: TextStyle(
                  color: s.balance >= 0 ? _green : _red,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text('${s.transactionCount} transaksi',
                style: const TextStyle(color: _muted, fontSize: 12)),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Income & Expense cards
        Row(
          children: [
            Expanded(child: _StatCard(
              label: 'Pemasukan',
              amount: s.totalIncome,
              color: _green,
              icon: Icons.arrow_downward_rounded,
            )),
            const SizedBox(width: 12),
            Expanded(child: _StatCard(
              label: 'Pengeluaran',
              amount: s.totalExpense,
              color: _red,
              icon: Icons.arrow_upward_rounded,
            )),
          ],
        ),

        const SizedBox(height: 16),

        // Top category
        if (s.byCategory.isNotEmpty) ...[
          _SectionHeader('Kategori Terbesar'),
          const SizedBox(height: 8),
          ...s.byCategory.entries
            .toList()
            ..sort((a, b) => b.value.compareTo(a.value))
            ..take(5).toList().map((e) => _CategoryRow(
              category: e.key,
              amount: e.value,
              total: s.totalExpense,
            )),
          const SizedBox(height: 16),
        ],

        // Feature flag: budget alert
        if (AppConfig.instance.featureBudgetAlert)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1107),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFD29922)),
            ),
            child: const Row(children: [
              Icon(Icons.warning_amber, color: Color(0xFFD29922)),
              SizedBox(width: 12),
              Text('Budget alert aktif', style: TextStyle(color: Color(0xFFD29922))),
            ]),
          ),

        const SizedBox(height: 16),

        // Lihat semua transaksi
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: _blue,
            side: const BorderSide(color: _border),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: () => Navigator.push(context, MaterialPageRoute(
            builder: (_) => TransactionListPage(userId: widget.userId),
          )),
          icon: const Icon(Icons.list),
          label: const Text('Lihat Semua Transaksi'),
        ),

        const SizedBox(height: 80),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;
  final IconData icon;

  const _StatCard({required this.label, required this.amount, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF30363D)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(color: Color(0xFF8B949E), fontSize: 12)),
        ]),
        const SizedBox(height: 8),
        Text(fmt.format(amount),
          style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
          overflow: TextOverflow.ellipsis),
      ]),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader(this.title);

  @override
  Widget build(BuildContext context) {
    return Text(title,
      style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600));
  }
}

class _CategoryRow extends StatelessWidget {
  final String category;
  final double amount;
  final double total;

  const _CategoryRow({required this.category, required this.amount, required this.total});

  @override
  Widget build(BuildContext context) {
    final pct = total > 0 ? amount / total : 0.0;
    final fmt = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(category,
            style: const TextStyle(color: Colors.white, fontSize: 13))),
          Text(fmt.format(amount),
            style: const TextStyle(color: Color(0xFF8B949E), fontSize: 12)),
        ]),
        const SizedBox(height: 4),
        LinearProgressIndicator(
          value: pct.clamp(0.0, 1.0),
          backgroundColor: const Color(0xFF30363D),
          valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF58A6FF)),
          borderRadius: BorderRadius.circular(4),
        ),
      ]),
    );
  }
}
