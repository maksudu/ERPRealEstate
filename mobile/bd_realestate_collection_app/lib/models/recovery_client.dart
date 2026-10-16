enum RecoveryStatus {
  overdue,
  chequeBounced,
  partialPaid,
  pdcHold,
}

class RecoveryClient {
  final String id;
  final String name;
  final String phone;
  final String project;
  final String unit;
  final double overdueAmount;
  final int overdueDays;
  final double distanceKm;
  final String address;
  final double latitude;
  final double longitude;
  final RecoveryStatus status;
  final bool legalNoticeSent;
  final String? bounceReason;

  const RecoveryClient({
    required this.id,
    required this.name,
    required this.phone,
    required this.project,
    required this.unit,
    required this.overdueAmount,
    required this.overdueDays,
    required this.distanceKm,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.status,
    this.legalNoticeSent = false,
    this.bounceReason,
  });
}
