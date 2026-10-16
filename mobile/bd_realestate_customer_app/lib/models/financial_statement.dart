class InstallmentItem {
  final String installmentName;
  final double amountBdt;
  final DateTime dueDate;
  final bool isPaid;
  final DateTime? paidDate;
  final String? moneyReceiptNumber;

  const InstallmentItem({
    required this.installmentName,
    required this.amountBdt,
    required this.dueDate,
    required this.isPaid,
    this.paidDate,
    this.moneyReceiptNumber,
  });
}

class CustomerFinancials {
  final double totalUnitValue;
  final double totalPaidBdt;
  final double upcomingDueBdt;
  final DateTime upcomingDueDate;
  final double overdueBalanceBdt;
  final List<InstallmentItem> schedule;

  const CustomerFinancials({
    required this.totalUnitValue,
    required this.totalPaidBdt,
    required this.upcomingDueBdt,
    required this.upcomingDueDate,
    required this.overdueBalanceBdt,
    required this.schedule,
  });

  double get balanceRemaining => totalUnitValue - totalPaidBdt;
  double get paymentProgressPercent => (totalPaidBdt / totalUnitValue).clamp(0.0, 1.0);
}
