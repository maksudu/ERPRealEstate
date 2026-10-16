import 'dart:ui';

class DigitalSignaturePoint {
  final double x;
  final double y;
  DigitalSignaturePoint(this.x, this.y);

  Offset toOffset() => Offset(x, y);
}

class BookingEntity {
  final int unitId;
  final String unitNumber;
  final String towerName;
  final double totalContractValue;
  final String clientFullName;
  final String clientPhone;
  final String clientNid;
  final String clientAddress;
  final String nomineeName;
  final String nomineeRelation;
  final String nomineeNid;
  final double earnestMoneyBdt;
  final String paymentMode;
  final String? chequeNumber;
  final String? bankName;
  final List<List<DigitalSignaturePoint>> signatureStrokes;
  final bool frontNidCaptured;
  final bool backNidCaptured;
  final String bookingReferenceNo;
  final DateTime bookingDate;

  BookingEntity({
    required this.unitId,
    required this.unitNumber,
    required this.towerName,
    required this.totalContractValue,
    required this.clientFullName,
    required this.clientPhone,
    required this.clientNid,
    required this.clientAddress,
    required this.nomineeName,
    required this.nomineeRelation,
    required this.nomineeNid,
    required this.earnestMoneyBdt,
    required this.paymentMode,
    this.chequeNumber,
    this.bankName,
    this.signatureStrokes = const [],
    this.frontNidCaptured = true,
    this.backNidCaptured = true,
    required this.bookingReferenceNo,
    required this.bookingDate,
  });

  bool get isSignatureValid => signatureStrokes.isNotEmpty;
}
