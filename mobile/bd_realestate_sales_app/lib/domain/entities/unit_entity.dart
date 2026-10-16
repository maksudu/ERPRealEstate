enum UnitGridStatus {
  available,      // 🟢 Available
  onHold,         // 🟡 On Hold (15-min countdown timer)
  sold,           // 🔴 Sold
  landownerShare, // 🟣 Landowner Share
}

class UnitEntity {
  final int id;
  final String unitNumber;
  final int floorNumber;
  final String towerName;
  final double carpetAreaSqft;
  final double grossAreaSqft;
  final double baseRatePerSqft;
  final double floorEscalationPerSqft; // +৳50 per floor level
  final double facingPremiumAmount;
  final String facingDirection; // North, South, Lake View, Corner
  UnitGridStatus status;
  DateTime? lockedUntil;
  String? lockedBy;

  UnitEntity({
    required this.id,
    required this.unitNumber,
    required this.floorNumber,
    required this.towerName,
    required this.carpetAreaSqft,
    required this.grossAreaSqft,
    required this.baseRatePerSqft,
    this.floorEscalationPerSqft = 50.0,
    this.facingPremiumAmount = 250000.0,
    this.facingDirection = 'South-East Corner',
    this.status = UnitGridStatus.available,
    this.lockedUntil,
    this.lockedBy,
  });

  // Effective rate per sqft = base_rate + (floor_number * 50)
  double get effectiveRatePerSqft =>
      baseRatePerSqft + (floorNumber * floorEscalationPerSqft);

  // Gross Price = (gross_area * effective_rate) + facing_premium
  double get grossPriceBdt =>
      (grossAreaSqft * effectiveRatePerSqft) + facingPremiumAmount;

  int get remainingLockSeconds {
    if (lockedUntil == null) return 0;
    final diff = lockedUntil!.difference(DateTime.now()).inSeconds;
    return diff > 0 ? diff : 0;
  }

  bool get isLockActive => remainingLockSeconds > 0;

  UnitEntity copyWith({
    int? id,
    String? unitNumber,
    int? floorNumber,
    String? towerName,
    double? carpetAreaSqft,
    double? grossAreaSqft,
    double? baseRatePerSqft,
    double? floorEscalationPerSqft,
    double? facingPremiumAmount,
    String? facingDirection,
    UnitGridStatus? status,
    DateTime? lockedUntil,
    String? lockedBy,
  }) {
    return UnitEntity(
      id: id ?? this.id,
      unitNumber: unitNumber ?? this.unitNumber,
      floorNumber: floorNumber ?? this.floorNumber,
      towerName: towerName ?? this.towerName,
      carpetAreaSqft: carpetAreaSqft ?? this.carpetAreaSqft,
      grossAreaSqft: grossAreaSqft ?? this.grossAreaSqft,
      baseRatePerSqft: baseRatePerSqft ?? this.baseRatePerSqft,
      floorEscalationPerSqft: floorEscalationPerSqft ?? this.floorEscalationPerSqft,
      facingPremiumAmount: facingPremiumAmount ?? this.facingPremiumAmount,
      facingDirection: facingDirection ?? this.facingDirection,
      status: status ?? this.status,
      lockedUntil: lockedUntil ?? this.lockedUntil,
      lockedBy: lockedBy ?? this.lockedBy,
    );
  }
}
