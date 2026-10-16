import 'package:intl/intl.dart';

class BdtCurrencyFormatter {
  static final NumberFormat _formatter = NumberFormat.currency(
    symbol: '৳ ',
    decimalDigits: 0,
    locale: 'en_IN', // South Asian Lakh/Crore grouping
  );

  static String format(num amount) {
    return _formatter.format(amount);
  }

  static String formatInWords(num amount) {
    if (amount >= 10000000) {
      double crore = amount / 10000000;
      return '${crore.toStringAsFixed(2)} Crore';
    } else if (amount >= 100000) {
      double lakh = amount / 100000;
      return '${lakh.toStringAsFixed(2)} Lakh';
    }
    return format(amount);
  }
}
