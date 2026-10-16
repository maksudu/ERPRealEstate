import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class CustomerTheme {
  static const Color midnightNavy = Color(0xFF0A1128);
  static const Color luxuryGold = Color(0xFFC5A880);
  static const Color brightGold = Color(0xFFD4AF37);
  static const Color softSlate = Color(0xFF1E293B);
  static const Color successGreen = Color(0xFF10B981);
  static const Color bkashPink = Color(0xFFD12053);
  static const Color nagadOrange = Color(0xFFF7941D);
  static const Color backgroundLight = Color(0xFFF8FAFC);

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: midnightNavy,
    scaffoldBackgroundColor: backgroundLight,
    colorScheme: const ColorScheme.light(
      primary: midnightNavy,
      secondary: luxuryGold,
      surface: Colors.white,
    ),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: midnightNavy,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: midnightNavy),
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
        backgroundColor: midnightNavy,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
  );
}
