class NiActNotice {
  final String id;
  final String clientName;
  final String clientPhone;
  final String unitNumber;
  final String project;
  final String chequeNumber;
  final String bankName;
  final double chequeAmount;
  final String bounceReason;
  final DateTime bounceDate;
  final DateTime? noticeServedDate;
  final String? acknowledgementPhotoUrl;
  final int daysElapsed;
  final String status;

  const NiActNotice({
    required this.id,
    required this.clientName,
    required this.clientPhone,
    required this.unitNumber,
    required this.project,
    required this.chequeNumber,
    required this.bankName,
    required this.chequeAmount,
    required this.bounceReason,
    required this.bounceDate,
    this.noticeServedDate,
    this.acknowledgementPhotoUrl,
    required this.daysElapsed,
    required this.status,
  });

  int get daysRemaining => 30 - daysElapsed;
  bool get isExpired => daysElapsed >= 30;
}
