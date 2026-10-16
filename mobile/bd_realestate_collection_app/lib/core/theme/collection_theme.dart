import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CollectionTheme {
  static const Color primaryEmerald = Color(0xFF059669);
  static const Color darkSlate = Color(0xFF0F172A);
  static const Color deepNavy = Color(0xFF1E293B);
  static const Color accentGold = Color(0xFFD97706);
  static const Color alertCrimson = Color(0xFFDC2626);
  static const Color bkashPink = Color(0xFFD12053);
  static const Color nagadOrange = Color(0xFFF7941D);
  static const Color surfaceGrey = Color(0xFFF8FAFC);

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: primaryEmerald,
    scaffoldBackgroundColor: surfaceGrey,
    colorScheme: const ColorScheme.light(
      primary: primaryEmerald,
      secondary: accentGold,
      surface: Colors.white,
      error: alertCrimson,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: darkSlate,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: darkSlate),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primaryEmerald,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
  );
}
