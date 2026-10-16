class DprReport {
  final String id;
  final String projectName;
  final String towerName;
  final String floorLevel;
  final String activityName;
  final double concreteVolumeCft;
  final double rodConsumptionMt;
  final int cementBagsUsed;
  final String dailyNarrative;
  final double craneOperatingHours;
  final double mixerMachineHours;
  final String weather;
  final DateTime date;
  final bool hasWatermarkedPhoto;
  final String? photoGpsCoordinates;
  final bool isSynced;

  DprReport({
    required this.id,
    required this.projectName,
    required this.towerName,
    required this.floorLevel,
    required this.activityName,
    required this.concreteVolumeCft,
    required this.rodConsumptionMt,
    required this.cementBagsUsed,
    required this.dailyNarrative,
    this.craneOperatingHours = 6.5,
    this.mixerMachineHours = 8.0,
    this.weather = 'Sunny',
    required this.date,
    this.hasWatermarkedPhoto = false,
    this.photoGpsCoordinates,
    this.isSynced = true,
  });
}
