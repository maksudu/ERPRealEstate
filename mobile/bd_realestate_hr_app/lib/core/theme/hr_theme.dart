import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HrTheme {
  static const Color primaryIndigo = Color(0xFF4F46E5);
  static const Color deepNavy = Color(0xFF0F172A);
  static const Color slateBorder = Color(0xFFE2E8F0);
  static const Color successTeal = Color(0xFF0D9488);
  static const Color alertCrimson = Color(0xFFEF4444);
  static const Color amberWarning = Color(0xFFD97706);
  static const Color surfaceGrey = Color(0xFFF8FAFC);

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryIndigo,
    scaffoldBackgroundColor: surfaceGrey,
    colorScheme: const ColorScheme.light(
      primary: primaryIndigo,
      secondary: successTeal,
      surface: Colors.white,
      error: alertCrimson,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: deepNavy,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: deepNavy),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: slateBorder),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryIndigo,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
  );
}
