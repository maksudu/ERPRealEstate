class SCurvePoint {
  final int monthIndex;
  final String label;
  final double plannedPercent;
  final double? actualPercent;

  const SCurvePoint({
    required this.monthIndex,
    required this.label,
    required this.plannedPercent,
    this.actualPercent,
  });
}

class ProjectSCurve {
  final String projectName;
  final String location;
  final double overallPlanned;
  final double overallActual;
  final double scheduleVariance; // + ahead, - behind
  final double cpi; // Cost Performance Index
  final double spi; // Schedule Performance Index
  final List<SCurvePoint> points;

  const ProjectSCurve({
    required this.projectName,
    required this.location,
    required this.overallPlanned,
    required this.overallActual,
    required this.scheduleVariance,
    required this.cpi,
    required this.spi,
    required this.points,
  });
}
