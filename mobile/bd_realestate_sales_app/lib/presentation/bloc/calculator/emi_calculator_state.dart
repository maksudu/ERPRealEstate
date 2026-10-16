class PaymentScheduleItem {
  final int installmentNo;
  final String milestoneName;
  final double amountBdt;
  final String dueDate;

  PaymentScheduleItem({
    required this.installmentNo,
    required this.milestoneName,
    required this.amountBdt,
    required this.dueDate,
  });
}

class EmiCalculatorState {
  final double flatPrice;
  final String unitNumber;
  final double downPaymentPercent; // 10% to 50%
  final double tenureMonths; // 12 to 60 months
  final double bookingMoney; // Fixed ৳5,00,000 standard earnest money
  final List<PaymentScheduleItem> scheduleItems;
  final String? exportPdfStatus;
  final String? shareUrl;

  const EmiCalculatorState({
    this.flatPrice = 12500000.0,
    this.unitNumber = '3B',
    this.downPaymentPercent = 30.0,
    this.tenureMonths = 36.0,
    this.bookingMoney = 500000.0,
    this.scheduleItems = const [],
    this.exportPdfStatus,
    this.shareUrl,
  });

  double get downPaymentTotal => flatPrice * (downPaymentPercent / 100.0);
  double get netDownPaymentPayable => downPaymentTotal - bookingMoney;
  double get remainingBalance => flatPrice - downPaymentTotal;
  double get monthlyInstallment => remainingBalance / (tenureMonths > 0 ? tenureMonths : 1);

  EmiCalculatorState copyWith({
    double? flatPrice,
    String? unitNumber,
    double? downPaymentPercent,
    double? tenureMonths,
    double? bookingMoney,
    List<PaymentScheduleItem>? scheduleItems,
    String? exportPdfStatus,
    String? shareUrl,
  }) {
    return EmiCalculatorState(
      flatPrice: flatPrice ?? this.flatPrice,
      unitNumber: unitNumber ?? this.unitNumber,
      downPaymentPercent: downPaymentPercent ?? this.downPaymentPercent,
      tenureMonths: tenureMonths ?? this.tenureMonths,
      bookingMoney: bookingMoney ?? this.bookingMoney,
      scheduleItems: scheduleItems ?? this.scheduleItems,
      exportPdfStatus: exportPdfStatus,
      shareUrl: shareUrl,
    );
  }
}
