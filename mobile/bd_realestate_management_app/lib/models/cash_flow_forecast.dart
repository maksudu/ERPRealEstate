class CashFlowBucket {
  final String periodName; // 'Day 1 - 30', 'Day 31 - 60', 'Day 61 - 90'
  final double projectedInflowsBdt;
  final double contractorLiabilitiesBdt;
  final double materialProcurementBdt;
  final double debtRepaymentsBdt;

  const CashFlowBucket({
    required this.periodName,
    required this.projectedInflowsBdt,
    required this.contractorLiabilitiesBdt,
    required this.materialProcurementBdt,
    required this.debtRepaymentsBdt,
  });

  double get totalOutflowsBdt => contractorLiabilitiesBdt + materialProcurementBdt + debtRepaymentsBdt;
  double get netSurplusBdt => projectedInflowsBdt - totalOutflowsBdt;
}

class NinetyDayForecast {
  final double liquidCashBalanceBdt;
  final List<CashFlowBucket> buckets;

  const NinetyDayForecast({
    required this.liquidCashBalanceBdt,
    required this.buckets,
  });

  double get total90DayInflow => buckets.fold(0.0, (acc, b) => acc + b.projectedInflowsBdt);
  double get total90DayOutflow => buckets.fold(0.0, (acc, b) => acc + b.totalOutflowsBdt);
  double get projectedEndingLiquidity => liquidCashBalanceBdt + total90DayInflow - total90DayOutflow;
}
