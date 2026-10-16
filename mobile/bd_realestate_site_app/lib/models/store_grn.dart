class StoreGrnChallan {
  final String id;
  final String challanNumber;
  final String purchaseOrderNumber;
  final String truckNumber;
  final String supplierName;
  final String materialName;
  final double quantityReceived;
  final String unitOfMeasure; // Bags, MT, CFT
  final DateTime receivedDate;
  final String driverName;
  final String driverPhone;
  final bool hasPhysicalInspectionPassed;
  final bool hasWeightBridgeSlipAttached;
  final bool hasMillTestCertAttached;
  final String? challanPhotoUrl;
  final String? remarks;
  final bool isSynced;

  StoreGrnChallan({
    required this.id,
    required this.challanNumber,
    required this.purchaseOrderNumber,
    required this.truckNumber,
    required this.supplierName,
    required this.materialName,
    required this.quantityReceived,
    required this.unitOfMeasure,
    required this.receivedDate,
    required this.driverName,
    this.driverPhone = '+8801711002233',
    this.hasPhysicalInspectionPassed = true,
    this.hasWeightBridgeSlipAttached = true,
    this.hasMillTestCertAttached = true,
    this.challanPhotoUrl,
    this.remarks,
    this.isSynced = true,
  });

  bool get isPoMatched => purchaseOrderNumber.isNotEmpty;
}
