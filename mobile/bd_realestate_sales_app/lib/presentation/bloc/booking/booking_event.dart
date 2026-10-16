import '../../../domain/entities/booking_entity.dart';

abstract class BookingEvent {}

class InitializeBookingEvent extends BookingEvent {
  final int unitId;
  final String unitNumber;
  final String towerName;
  final double totalContractValue;

  InitializeBookingEvent({
    required this.unitId,
    required this.unitNumber,
    required this.towerName,
    required this.totalContractValue,
  });
}

class CaptureNidFrontEvent extends BookingEvent {
  final String? simulatedPhotoPath;
  CaptureNidFrontEvent({this.simulatedPhotoPath});
}

class CaptureNidBackEvent extends BookingEvent {
  final String? simulatedPhotoPath;
  CaptureNidBackEvent({this.simulatedPhotoPath});
}

class AddSignaturePointEvent extends BookingEvent {
  final DigitalSignaturePoint point;
  AddSignaturePointEvent(this.point);
}

class EndSignatureStrokeEvent extends BookingEvent {}

class ClearSignatureEvent extends BookingEvent {}

class SubmitBookingFormEvent extends BookingEvent {
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

  SubmitBookingFormEvent({
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
  });
}
