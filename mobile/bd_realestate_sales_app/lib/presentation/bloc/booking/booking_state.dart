import '../../../domain/entities/booking_entity.dart';

enum BookingSubmissionStatus { idle, submitting, success, error }

class BookingState {
  final int unitId;
  final String unitNumber;
  final String towerName;
  final double totalContractValue;
  final bool frontNidCaptured;
  final bool backNidCaptured;
  final String? nidOcrNumber;
  final List<List<DigitalSignaturePoint>> signatureStrokes;
  final List<DigitalSignaturePoint> currentStroke;
  final BookingSubmissionStatus status;
  final BookingEntity? confirmedBooking;
  final String? allotmentLetterPdfText;
  final String? errorMessage;

  const BookingState({
    this.unitId = 101,
    this.unitNumber = '1A',
    this.towerName = 'Tower A',
    this.totalContractValue = 15800000.0,
    this.frontNidCaptured = false,
    this.backNidCaptured = false,
    this.nidOcrNumber,
    this.signatureStrokes = const [],
    this.currentStroke = const [],
    this.status = BookingSubmissionStatus.idle,
    this.confirmedBooking,
    this.allotmentLetterPdfText,
    this.errorMessage,
  });

  bool get hasValidSignature => signatureStrokes.isNotEmpty || currentStroke.isNotEmpty;
  bool get hasBothNidSides => frontNidCaptured && backNidCaptured;

  BookingState copyWith({
    int? unitId,
    String? unitNumber,
    String? towerName,
    double? totalContractValue,
    bool? frontNidCaptured,
    bool? backNidCaptured,
    String? nidOcrNumber,
    List<List<DigitalSignaturePoint>>? signatureStrokes,
    List<DigitalSignaturePoint>? currentStroke,
    BookingSubmissionStatus? status,
    BookingEntity? confirmedBooking,
    String? allotmentLetterPdfText,
    String? errorMessage,
  }) {
    return BookingState(
      unitId: unitId ?? this.unitId,
      unitNumber: unitNumber ?? this.unitNumber,
      towerName: towerName ?? this.towerName,
      totalContractValue: totalContractValue ?? this.totalContractValue,
      frontNidCaptured: frontNidCaptured ?? this.frontNidCaptured,
      backNidCaptured: backNidCaptured ?? this.backNidCaptured,
      nidOcrNumber: nidOcrNumber ?? this.nidOcrNumber,
      signatureStrokes: signatureStrokes ?? this.signatureStrokes,
      currentStroke: currentStroke ?? this.currentStroke,
      status: status ?? this.status,
      confirmedBooking: confirmedBooking ?? this.confirmedBooking,
      allotmentLetterPdfText: allotmentLetterPdfText ?? this.allotmentLetterPdfText,
      errorMessage: errorMessage,
    );
  }
}
