class AttendanceRecord {
  final String id;
  final String employeeName;
  final DateTime checkInTime;
  final DateTime? checkOutTime;
  final String siteName;
  final double latitude;
  final double longitude;
  final double distanceMetres;
  final bool isWithinGeofence;
  final bool isMocked;
  final bool isLivenessVerified;
  final String status;

  const AttendanceRecord({
    required this.id,
    required this.employeeName,
    required this.checkInTime,
    this.checkOutTime,
    required this.siteName,
    required this.latitude,
    required this.longitude,
    required this.distanceMetres,
    required this.isWithinGeofence,
    required this.isMocked,
    required this.isLivenessVerified,
    required this.status,
  });
}
