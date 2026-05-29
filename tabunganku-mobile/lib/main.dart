// lib/main.dart

import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/config/app_config.dart';
import 'features/dashboard/dashboard_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Inisialisasi locale Indonesia untuk intl
  await initializeDateFormatting('id_ID', null);

  // Load remote config (Sovereign Pattern) sebelum app jalan
  await AppConfig.initialize();

  runApp(const TabunganKuApp());
}

class TabunganKuApp extends StatelessWidget {
  const TabunganKuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TabunganKu',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0D1117),
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFF58A6FF),
          surface: const Color(0xFF161B22),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF161B22),
          elevation: 0,
        ),
      ),
      // TODO: Ganti userId dengan hasil login/auth yang sesungguhnya
      home: const DashboardPage(userId: 'user-123'),
    );
  }
}
