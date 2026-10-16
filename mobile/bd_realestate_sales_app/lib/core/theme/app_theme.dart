import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Brand Colors
  static const Color primaryTeal = Color(0xFF0D9488);
  static const Color primaryDark = Color(0xFF0F172A);
  static const Color accentAmber = Color(0xFFF59E0B);
  static const Color successGreen = Color(0xFF10B981);
  static const Color warningOrange = Color(0xFFF97316);
  static const Color dangerRed = Color(0xFFEF4444);
  static const Color landownerPurple = Color(0xFF8B5CF6);
  static const Color surfaceLight = Color(0xFFF8FAFC);
  static const Color surfaceDark = Color(0xFF1E293B);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryTeal,
    scaffoldBackgroundColor: surfaceLight,
    colorScheme: const ColorScheme.light(
      primary: primaryTeal,
      secondary: accentAmber,
      surface: Colors.white,
      error: dangerRed,
    ),
    textTheme: GoogleFonts.interTextTheme(
      ThemeData.light().textTheme,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: primaryDark),
      titleTextStyle: TextStyle(
        color: primaryDark,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
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

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: primaryTeal,
    scaffoldBackgroundColor: const Color(0xFF0F172A),
    colorScheme: const ColorScheme.dark(
      primary: primaryTeal,
      secondary: accentAmber,
      surface: surfaceDark,
      error: dangerRed,
    ),
    textTheme: GoogleFonts.interTextTheme(
      ThemeData.dark().textTheme,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: surfaceDark,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardThemeData(
      color: surfaceDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF334155)),
      ),
    ),
  );
}
