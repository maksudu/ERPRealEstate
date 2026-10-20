import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class ManagementTheme {
  // Executive Color Palette - 100% Light Mode
  static const Color royalNavy = Color(0xFF0F172A);
  static const Color slateText = Color(0xFF1E293B);
  static const Color luxuryGold = Color(0xFFB45309); // Deep Amber Gold for high-contrast light mode
  static const Color brightGold = Color(0xFFD97706);
  static const Color softGoldBg = Color(0xFFFEF3C7);
  static const Color cardLight = Colors.white;
  static const Color scaffoldLight = Color(0xFFF8FAFC);
  static const Color borderSubtle = Color(0xFFE2E8F0);
  static const Color successEmerald = Color(0xFF059669);
  static const Color alertCrimson = Color(0xFFDC2626);
  static const Color textMuted = Color(0xFF64748B);
  static const Color obsidianBlack = Color(0xFF0F172A);
  static const Color cardDark = Colors.white;


  static ThemeData theme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: royalNavy,
    scaffoldBackgroundColor: scaffoldLight,
    colorScheme: const ColorScheme.light(
      primary: royalNavy,
      secondary: brightGold,
      surface: cardLight,
      error: alertCrimson,
      onPrimary: Colors.white,
      onSurface: slateText,
    ),
    textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: royalNavy,
      elevation: 0.8,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: royalNavy,
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      iconTheme: IconThemeData(color: royalNavy),
    ),
    cardTheme: CardThemeData(
      color: cardLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: borderSubtle),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: royalNavy,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
      ),
    ),
  );
}
