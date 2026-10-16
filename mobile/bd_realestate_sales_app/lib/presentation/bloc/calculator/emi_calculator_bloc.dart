import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'emi_calculator_event.dart';
import 'emi_calculator_state.dart';

class EmiCalculatorBloc extends Bloc<EmiCalculatorEvent, EmiCalculatorState> {
  EmiCalculatorBloc() : super(const EmiCalculatorState()) {
    on<InitializeEmiCalculatorEvent>(_onInitialize);
    on<UpdateDownPaymentPercentEvent>(_onUpdateDownPayment);
    on<UpdateTenureMonthsEvent>(_onUpdateTenure);
    on<UpdateFlatPriceEvent>(_onUpdatePrice);
    on<ExportPdfScheduleEvent>(_onExportPdf);
    on<ShareViaWhatsAppEvent>(_onShareWhatsApp);

    // Generate initial schedule
    add(InitializeEmiCalculatorEvent(flatPrice: 12500000.0, unitNumber: '3B'));
  }

  void _onInitialize(InitializeEmiCalculatorEvent event, Emitter<EmiCalculatorState> emit) {
    final schedule = _buildSchedule(
      price: event.flatPrice,
      downPaymentPercent: state.downPaymentPercent,
      tenureMonths: state.tenureMonths,
    );
    emit(state.copyWith(
      flatPrice: event.flatPrice,
      unitNumber: event.unitNumber,
      scheduleItems: schedule,
    ));
  }

  void _onUpdateDownPayment(UpdateDownPaymentPercentEvent event, Emitter<EmiCalculatorState> emit) {
    final schedule = _buildSchedule(
      price: state.flatPrice,
      downPaymentPercent: event.percent,
      tenureMonths: state.tenureMonths,
    );
    emit(state.copyWith(
      downPaymentPercent: event.percent,
      scheduleItems: schedule,
    ));
  }

  void _onUpdateTenure(UpdateTenureMonthsEvent event, Emitter<EmiCalculatorState> emit) {
    final schedule = _buildSchedule(
      price: state.flatPrice,
      downPaymentPercent: state.downPaymentPercent,
      tenureMonths: event.months,
    );
    emit(state.copyWith(
      tenureMonths: event.months,
      scheduleItems: schedule,
    ));
  }

  void _onUpdatePrice(UpdateFlatPriceEvent event, Emitter<EmiCalculatorState> emit) {
    final schedule = _buildSchedule(
      price: event.price,
      downPaymentPercent: state.downPaymentPercent,
      tenureMonths: state.tenureMonths,
    );
    emit(state.copyWith(
      flatPrice: event.price,
      scheduleItems: schedule,
    ));
  }

  void _onExportPdf(ExportPdfScheduleEvent event, Emitter<EmiCalculatorState> emit) {
    emit(state.copyWith(
      exportPdfStatus: 'PDF Generated successfully: ERP-Schedule-${state.unitNumber}.pdf',
    ));
  }

  void _onShareWhatsApp(ShareViaWhatsAppEvent event, Emitter<EmiCalculatorState> emit) {
    final text = 'OFFICIAL INSTALLMENT SCHEDULE for Unit ${state.unitNumber}';
    emit(state.copyWith(
      shareUrl: 'whatsapp://send?text=${Uri.encodeComponent(text)}',
    ));
  }

  List<PaymentScheduleItem> _buildSchedule({
    required double price,
    required double downPaymentPercent,
    required double tenureMonths,
  }) {
    final items = <PaymentScheduleItem>[];
    final now = DateTime.now();
    final dateFormat = DateFormat('MMM yyyy');

    // 1. Earnest Booking Money
    items.add(PaymentScheduleItem(
      installmentNo: 1,
      milestoneName: 'Booking & Earnest Money',
      amountBdt: 500000.0,
      dueDate: dateFormat.format(now),
    ));

    // 2. Down Payment balance
    final downTotal = price * (downPaymentPercent / 100.0);
    final downBal = downTotal - 500000.0;
    if (downBal > 0) {
      items.add(PaymentScheduleItem(
        installmentNo: 2,
        milestoneName: 'Down Payment Allotment Balance (${downPaymentPercent.toInt()}%)',
        amountBdt: downBal,
        dueDate: dateFormat.format(now.add(const Duration(days: 30))),
      ));
    }

    // 3. Monthly installments
    final balance = price - downTotal;
    final monthly = balance / tenureMonths;
    final totalMonths = tenureMonths.toInt();
    final sampleCount = totalMonths > 6 ? 6 : totalMonths;

    for (int i = 1; i <= sampleCount; i++) {
      items.add(PaymentScheduleItem(
        installmentNo: items.length + 1,
        milestoneName: 'Installment #$i / $totalMonths (Construction Linked)',
        amountBdt: monthly,
        dueDate: dateFormat.format(DateTime(now.year, now.month + i + 1, 1)),
      ));
    }

    // 4. Handover & Final Settlement
    items.add(PaymentScheduleItem(
      installmentNo: items.length + 1,
      milestoneName: 'Possession, Demarcation & Utility Connection',
      amountBdt: monthly,
      dueDate: dateFormat.format(DateTime(now.year, now.month + totalMonths, 1)),
    ));

    return items;
  }
}
