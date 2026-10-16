class TradeWageConfig {
  static const double rodBinderWage = 900.0;
  static const double masonWage = 950.0;
  static const double carpenterWage = 900.0;
  static const double plumberWage = 900.0;
  static const double helperWage = 650.0;
  static const double overtimeHourlyRateMultiplier = 1.5;
}

class LaborMusterRoll {
  final String id;
  final String subcontractorName;
  final String tradeScope; // RCC Structure, Finishing, Plumbing, Electrical
  final int rodBinders;
  final int masons;
  final int carpenters;
  final int plumbers;
  final int helpers;
  final double overtimeHours;
  final DateTime date;
  final bool isSynced;

  LaborMusterRoll({
    required this.id,
    required this.subcontractorName,
    required this.tradeScope,
    required this.rodBinders,
    required this.masons,
    required this.carpenters,
    required this.plumbers,
    required this.helpers,
    this.overtimeHours = 0.0,
    required this.date,
    this.isSynced = true,
  });

  int get totalHeadcount =>
      rodBinders + masons + carpenters + plumbers + helpers;

  double get baseDailyWageTotal =>
      (rodBinders * TradeWageConfig.rodBinderWage) +
      (masons * TradeWageConfig.masonWage) +
      (carpenters * TradeWageConfig.carpenterWage) +
      (plumbers * TradeWageConfig.plumberWage) +
      (helpers * TradeWageConfig.helperWage);

  double get averageHourlyWage => (baseDailyWageTotal / (totalHeadcount > 0 ? totalHeadcount : 1)) / 8.0;

  double get overtimeTotalWage =>
      totalHeadcount * overtimeHours * averageHourlyWage * TradeWageConfig.overtimeHourlyRateMultiplier;

  double get grossDailyWageTotal => baseDailyWageTotal + overtimeTotalWage;
}
