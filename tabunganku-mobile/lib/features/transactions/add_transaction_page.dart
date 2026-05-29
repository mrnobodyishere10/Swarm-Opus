// lib/features/transactions/add_transaction_page.dart

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/api/keuanganku_service.dart';
import '../../core/models/transaction.dart';

class AddTransactionPage extends StatefulWidget {
  final String userId;
  const AddTransactionPage({super.key, required this.userId});

  @override
  State<AddTransactionPage> createState() => _AddTransactionPageState();
}

class _AddTransactionPageState extends State<AddTransactionPage> {
  final _service = KeuanganKuService();
  final _amountCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  TransactionType _type = TransactionType.expense;
  String _category = 'makan';
  DateTime _date = DateTime.now();
  bool _saving = false;

  static const _expenseCategories = [
    'makan', 'transport', 'belanja', 'hiburan', 'kesehatan', 'tagihan', 'lainnya'
  ];
  static const _incomeCategories = [
    'gaji', 'freelance', 'bisnis', 'investasi', 'lainnya'
  ];

  List<String> get _categories =>
      _type == TransactionType.expense ? _expenseCategories : _incomeCategories;

  Future<void> _save() async {
    final amountStr = _amountCtrl.text.replaceAll(RegExp(r'[^0-9]'), '');
    if (amountStr.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Jumlah tidak boleh kosong')));
      return;
    }

    setState(() => _saving = true);
    try {
      await _service.addTransaction(Transaction(
        date: _date,
        type: _type,
        category: _category,
        description: _descCtrl.text,
        amount: double.parse(amountStr),
        userId: widget.userId,
      ));
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _saving = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal: $e'), backgroundColor: const Color(0xFFF85149)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF161B22),
        title: const Text('Tambah Transaksi', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Type selector
          Row(children: [
            Expanded(child: _TypeBtn(
              label: 'Pengeluaran', icon: Icons.arrow_upward_rounded,
              color: const Color(0xFFF85149),
              selected: _type == TransactionType.expense,
              onTap: () => setState(() { _type = TransactionType.expense; _category = 'makan'; }),
            )),
            const SizedBox(width: 12),
            Expanded(child: _TypeBtn(
              label: 'Pemasukan', icon: Icons.arrow_downward_rounded,
              color: const Color(0xFF3FB950),
              selected: _type == TransactionType.income,
              onTap: () => setState(() { _type = TransactionType.income; _category = 'gaji'; }),
            )),
          ]),

          const SizedBox(height: 24),

          // Amount field
          _Label('Jumlah (Rp)'),
          const SizedBox(height: 8),
          TextField(
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            decoration: _inputDeco('Contoh: 25000'),
          ),

          const SizedBox(height: 20),

          // Category
          _Label('Kategori'),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: _categories.map((cat) => GestureDetector(
              onTap: () => setState(() => _category = cat),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: _category == cat
                      ? const Color(0xFF58A6FF)
                      : const Color(0xFF161B22),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _category == cat
                        ? const Color(0xFF58A6FF)
                        : const Color(0xFF30363D),
                  ),
                ),
                child: Text(cat, style: TextStyle(
                  color: _category == cat ? Colors.white : const Color(0xFF8B949E),
                  fontSize: 13,
                )),
              ),
            )).toList(),
          ),

          const SizedBox(height: 20),

          // Description
          _Label('Keterangan (opsional)'),
          const SizedBox(height: 8),
          TextField(
            controller: _descCtrl,
            style: const TextStyle(color: Colors.white),
            decoration: _inputDeco('Contoh: makan siang di warteg'),
          ),

          const SizedBox(height: 20),

          // Date picker
          _Label('Tanggal'),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _date,
                firstDate: DateTime(2024),
                lastDate: DateTime.now(),
              );
              if (picked != null) setState(() => _date = picked);
            },
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF161B22),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF30363D)),
              ),
              child: Row(children: [
                const Icon(Icons.calendar_today, color: Color(0xFF8B949E), size: 16),
                const SizedBox(width: 10),
                Text(DateFormat('dd MMMM yyyy', 'id_ID').format(_date),
                  style: const TextStyle(color: Colors.white)),
              ]),
            ),
          ),

          const SizedBox(height: 32),

          // Save button
          SizedBox(
            height: 50,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF58A6FF),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                  : const Text('Simpan Transaksi', fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDeco(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(color: Color(0xFF8B949E)),
    filled: true,
    fillColor: const Color(0xFF161B22),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFF30363D)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFF30363D)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: const BorderSide(color: Color(0xFF58A6FF)),
    ),
  );
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) =>
    Text(text, style: const TextStyle(color: Color(0xFF8B949E), fontSize: 13));
}

class _TypeBtn extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _TypeBtn({required this.label, required this.icon, required this.color,
    required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 14),
      decoration: BoxDecoration(
        color: selected ? color.withOpacity(0.15) : const Color(0xFF161B22),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: selected ? color : const Color(0xFF30363D)),
      ),
      child: Column(children: [
        Icon(icon, color: selected ? color : const Color(0xFF8B949E), size: 20),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(
          color: selected ? color : const Color(0xFF8B949E),
          fontSize: 13, fontWeight: FontWeight.w500)),
      ]),
    ),
  );
}
