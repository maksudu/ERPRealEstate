import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SiteAppTheme {
  static const Color primarySafetyOrange = Color(0xFFF97316);
  static const Color darkNavy = Color(0xFF0F172A);
  static const Color steelSlate = Color(0xFF334155);
  static const Color successGreen = Color(0xFF10B981);
  static const Color alertRed = Color(0xFFEF4444);
  static const Color cardBg = Colors.white;

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primarySafetyOrange,
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    colorScheme: const ColorScheme.light(
      primary: primarySafetyOrange,
      secondary: darkNavy,
      surface: Colors.white,
      error: alertRed,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: darkNavy,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: darkNavy),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
  );
}
