class PdcIntake {
  final String id;
  final String clientName;
  final String unitNumber;
  final String chequeNumber;
  final String bankName;
  final String branch;
  final String routingNumber;
  final double amount;
  final DateTime maturityDate;
  final String securityPouchBarcode;
  final String? photoProofUrl;
  final DateTime intakeDate;
  final String status;

  const PdcIntake({
    required this.id,
    required this.clientName,
    required this.unitNumber,
    required this.chequeNumber,
    required this.bankName,
    required this.branch,
    required this.routingNumber,
    required this.amount,
    required this.maturityDate,
    required this.securityPouchBarcode,
    this.photoProofUrl,
    required this.intakeDate,
    this.status = 'IN_VAULT',
  });
}
