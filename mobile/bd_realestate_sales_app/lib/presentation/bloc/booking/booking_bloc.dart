import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/booking_entity.dart';
import '../../../domain/usecases/submit_booking_usecase.dart';
import 'booking_event.dart';
import 'booking_state.dart';

class BookingBloc extends Bloc<BookingEvent, BookingState> {
  final SubmitBookingUseCase submitBookingUseCase;

  BookingBloc({required this.submitBookingUseCase}) : super(const BookingState()) {
    on<InitializeBookingEvent>(_onInitialize);
    on<CaptureNidFrontEvent>(_onCaptureNidFront);
    on<CaptureNidBackEvent>(_onCaptureNidBack);
    on<AddSignaturePointEvent>(_onAddSignaturePoint);
    on<EndSignatureStrokeEvent>(_onEndSignatureStroke);
    on<ClearSignatureEvent>(_onClearSignature);
    on<SubmitBookingFormEvent>(_onSubmitBookingForm);
  }

  void _onInitialize(InitializeBookingEvent event, Emitter<BookingState> emit) {
    emit(state.copyWith(
      unitId: event.unitId,
      unitNumber: event.unitNumber,
      towerName: event.towerName,
      totalContractValue: event.totalContractValue,
    ));
  }

  void _onCaptureNidFront(CaptureNidFrontEvent event, Emitter<BookingState> emit) {
    emit(state.copyWith(
      frontNidCaptured: true,
      nidOcrNumber: '19852691234567890',
    ));
  }

  void _onCaptureNidBack(CaptureNidBackEvent event, Emitter<BookingState> emit) {
    emit(state.copyWith(
      backNidCaptured: true,
    ));
  }

  void _onAddSignaturePoint(AddSignaturePointEvent event, Emitter<BookingState> emit) {
    final updatedCurrent = List<DigitalSignaturePoint>.from(state.currentStroke)..add(event.point);
    emit(state.copyWith(currentStroke: updatedCurrent));
  }

  void _onEndSignatureStroke(EndSignatureStrokeEvent event, Emitter<BookingState> emit) {
    if (state.currentStroke.isNotEmpty) {
      final updatedStrokes = List<List<DigitalSignaturePoint>>.from(state.signatureStrokes)
        ..add(List<DigitalSignaturePoint>.from(state.currentStroke));
      emit(state.copyWith(
        signatureStrokes: updatedStrokes,
        currentStroke: const [],
      ));
    }
  }

  void _onClearSignature(ClearSignatureEvent event, Emitter<BookingState> emit) {
    emit(state.copyWith(
      signatureStrokes: const [],
      currentStroke: const [],
    ));
  }

  Future<void> _onSubmitBookingForm(SubmitBookingFormEvent event, Emitter<BookingState> emit) async {
    if (!state.hasValidSignature) {
      emit(state.copyWith(
        status: BookingSubmissionStatus.error,
        errorMessage: 'Mandatory on-glass digital signature required before generating allotment.',
      ));
      return;
    }

    emit(state.copyWith(status: BookingSubmissionStatus.submitting));

    try {
      final bookingRef = 'AL-2026-${(1000 + state.unitId)}';
      final booking = BookingEntity(
        unitId: state.unitId,
        unitNumber: state.unitNumber,
        towerName: state.towerName,
        totalContractValue: state.totalContractValue,
        clientFullName: event.clientFullName,
        clientPhone: event.clientPhone,
        clientNid: event.clientNid,
        clientAddress: event.clientAddress,
        nomineeName: event.nomineeName,
        nomineeRelation: event.nomineeRelation,
        nomineeNid: event.nomineeNid,
        earnestMoneyBdt: event.earnestMoneyBdt,
        paymentMode: event.paymentMode,
        chequeNumber: event.chequeNumber,
        bankName: event.bankName,
        signatureStrokes: state.signatureStrokes,
        frontNidCaptured: state.frontNidCaptured,
        backNidCaptured: state.backNidCaptured,
        bookingReferenceNo: bookingRef,
        bookingDate: DateTime.now(),
      );

      final confirmed = await submitBookingUseCase.execute(booking);
      final pdfText = await submitBookingUseCase.generateAllotmentPdf(confirmed);

      emit(state.copyWith(
        status: BookingSubmissionStatus.success,
        confirmedBooking: confirmed,
        allotmentLetterPdfText: pdfText,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: BookingSubmissionStatus.error,
        errorMessage: 'Booking submission failed: $e',
      ));
    }
  }
}
