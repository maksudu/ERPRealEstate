class ConcreteCubeTest {
  final String sampleCode;
  final String projectName;
  final String structuralElement; // 7th Floor Slab, Basement-1 Retaining Wall
  final DateTime castingDate;
  final String mixDesign; // 1:1.5:3 / 3500 PSI
  final double slumpMm; // 100mm
  double? day7StrengthPsi;
  double? day14StrengthPsi;
  double? day28StrengthPsi;
  final double targetStrengthPsi;
  String status; // 'PASSED', 'DUE_TODAY', 'PENDING', 'FAILED'
  String? labReportPhotoUrl;
  final String labTechnicianName;

  ConcreteCubeTest({
    required this.sampleCode,
    required this.projectName,
    required this.structuralElement,
    required this.castingDate,
    required this.mixDesign,
    required this.slumpMm,
    this.day7StrengthPsi,
    this.day14StrengthPsi,
    this.day28StrengthPsi,
    this.targetStrengthPsi = 3500.0,
    required this.status,
    this.labReportPhotoUrl,
    this.labTechnicianName = 'Engr. Shafiul Islam (BUET Materials Lab)',
  });

  int get ageInDays => DateTime.now().difference(castingDate).inDays;

  bool get isDay7Due => ageInDays >= 7 && day7StrengthPsi == null;
  bool get isDay14Due => ageInDays >= 14 && day14StrengthPsi == null;
  bool get isDay28Due => ageInDays >= 28 && day28StrengthPsi == null;

  bool get isAnyMilestoneDue => isDay7Due || isDay14Due || isDay28Due;

  String get currentStageLabel {
    if (day28StrengthPsi != null) return 'Day 28 Completed (Final)';
    if (day14StrengthPsi != null) return 'Day 14 Tested';
    if (day7StrengthPsi != null) return 'Day 7 Tested';
    return 'Curing (Day $ageInDays of 28)';
  }
}
