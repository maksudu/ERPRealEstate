import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ManagementTheme {
  static const Color obsidianBlack = Color(0xFF090D16);
  static const Color royalNavy = Color(0xFF0F172A);
  static const Color cardDark = Color(0xFF1E293B);
  static const Color luxuryGold = Color(0xFFD4AF37);
  static const Color brightGold = Color(0xFFF59E0B);
  static const Color successEmerald = Color(0xFF10B981);
  static const Color alertCrimson = Color(0xFFEF4444);
  static const Color textMuted = Color(0xFF94A3B8);

  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: luxuryGold,
    scaffoldBackgroundColor: obsidianBlack,
    colorScheme: const ColorScheme.dark(
      primary: luxuryGold,
      secondary: brightGold,
      surface: cardDark,
      error: alertCrimson,
    ),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: obsidianBlack,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: luxuryGold),
    ),
    cardTheme: CardThemeData(
      color: cardDark,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFF334155)),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: luxuryGold,
        foregroundColor: obsidianBlack,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
  );
}
