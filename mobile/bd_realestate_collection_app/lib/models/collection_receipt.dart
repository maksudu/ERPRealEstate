enum PaymentMethod {
  cash,
  cheque,
  payOrder,
  bkashQr,
  nagadQr,
}

class CollectionReceipt {
  final String receiptNumber;
  final String clientName;
  final String clientPhone;
  final String unitNumber;
  final String project;
  final double amount;
  final PaymentMethod paymentMethod;
  final String transactionRef;
  final String amountInWords;
  final DateTime date;
  final bool hasSignature;
  final String collectedBy;

  const CollectionReceipt({
    required this.receiptNumber,
    required this.clientName,
    required this.clientPhone,
    required this.unitNumber,
    required this.project,
    required this.amount,
    required this.paymentMethod,
    required this.transactionRef,
    required this.amountInWords,
    required this.date,
    this.hasSignature = true,
    required this.collectedBy,
  });

  String get paymentMethodTitle {
    switch (paymentMethod) {
      case PaymentMethod.cash:
        return 'CASH';
      case PaymentMethod.cheque:
        return 'CHEQUE';
      case PaymentMethod.payOrder:
        return 'PAY ORDER';
      case PaymentMethod.bkashQr:
        return 'bKash DYNAMIC QR';
      case PaymentMethod.nagadQr:
        return 'Nagad DYNAMIC QR';
    }
  }
}
