abstract class EmiCalculatorEvent {}

class InitializeEmiCalculatorEvent extends EmiCalculatorEvent {
  final double flatPrice;
  final String unitNumber;
  InitializeEmiCalculatorEvent({required this.flatPrice, required this.unitNumber});
}

class UpdateDownPaymentPercentEvent extends EmiCalculatorEvent {
  final double percent;
  UpdateDownPaymentPercentEvent(this.percent);
}

class UpdateTenureMonthsEvent extends EmiCalculatorEvent {
  final double months;
  UpdateTenureMonthsEvent(this.months);
}

class UpdateFlatPriceEvent extends EmiCalculatorEvent {
  final double price;
  UpdateFlatPriceEvent(this.price);
}

class ExportPdfScheduleEvent extends EmiCalculatorEvent {}

class ShareViaWhatsAppEvent extends EmiCalculatorEvent {}
