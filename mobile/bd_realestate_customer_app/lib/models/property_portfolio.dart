class PropertyDoc {
  final String title;
  final String fileName;
  final String fileSize;
  final String date;

  const PropertyDoc({
    required this.title,
    required this.fileName,
    required this.fileSize,
    required this.date,
  });
}

class CustomerProperty {
  final String projectName;
  final String projectAddress;
  final String unitNumber;
  final String tower;
  final String floor;
  final double carpetAreaSqft;
  final String facing;
  final String allottedParkingBay;
  final String deedNumber;
  final String allotmentDate;
  final String handoverTargetDate;
  final List<PropertyDoc> documents;

  const CustomerProperty({
    required this.projectName,
    required this.projectAddress,
    required this.unitNumber,
    required this.tower,
    required this.floor,
    required this.carpetAreaSqft,
    required this.facing,
    required this.allottedParkingBay,
    required this.deedNumber,
    required this.allotmentDate,
    required this.handoverTargetDate,
    required this.documents,
  });
}
