import '../../domain/entities/unit_entity.dart';

class UnitModel extends UnitEntity {
  UnitModel({
    required super.id,
    required super.unitNumber,
    required super.floorNumber,
    required super.towerName,
    required super.carpetAreaSqft,
    required super.grossAreaSqft,
    required super.baseRatePerSqft,
    super.floorEscalationPerSqft,
    super.facingPremiumAmount,
    super.facingDirection,
    super.status,
    super.lockedUntil,
    super.lockedBy,
  });

  factory UnitModel.fromJson(Map<String, dynamic> json) {
    UnitGridStatus parseStatus(String? statusStr, bool isLandowner) {
      if (isLandowner || statusStr == 'LANDOWNER_SHARE') {
        return UnitGridStatus.landownerShare;
      }
      switch (statusStr?.toUpperCase()) {
        case 'SOLD':
        case 'BOOKED':
          return UnitGridStatus.sold;
        case 'ON_HOLD':
        case 'LOCKED':
          return UnitGridStatus.onHold;
        case 'AVAILABLE':
        default:
          return UnitGridStatus.available;
      }
    }

    final isLandowner = json['is_landowner_share'] == true;
    final statusStr = json['status_id'] ?? json['status'];
    DateTime? lockExpiry;
    if (json['lock_expires_at'] != null) {
      lockExpiry = DateTime.tryParse(json['lock_expires_at'].toString());
    } else if (json['lock_remaining_seconds'] != null && json['lock_remaining_seconds'] > 0) {
      lockExpiry = DateTime.now().add(Duration(seconds: json['lock_remaining_seconds']));
    }

    return UnitModel(
      id: json['id'] as int,
      unitNumber: json['unit_number'] as String? ?? 'N/A',
      floorNumber: json['floor_number'] as int? ?? 1,
      towerName: json['tower_name'] as String? ?? 'Tower A',
      carpetAreaSqft: (json['net_carpet_area_sqft'] ?? json['carpet_area_sqft'] ?? 1450.0).toDouble(),
      grossAreaSqft: (json['gross_saleable_area_sqft'] ?? json['gross_area_sqft'] ?? 1820.0).toDouble(),
      baseRatePerSqft: (json['base_rate_per_sqft'] ?? 8500.0).toDouble(),
      floorEscalationPerSqft: (json['floor_escalation_rate'] ?? 50.0).toDouble(),
      facingPremiumAmount: (json['facing_premium_rate'] ?? 250000.0).toDouble(),
      facingDirection: json['facing_id'] ?? json['facing_direction'] ?? 'South-East Corner',
      status: parseStatus(statusStr, isLandowner),
      lockedUntil: lockExpiry,
      lockedBy: json['current_locked_by_user_name'] ?? json['locked_by'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'unit_number': unitNumber,
      'floor_number': floorNumber,
      'tower_name': towerName,
      'net_carpet_area_sqft': carpetAreaSqft,
      'gross_saleable_area_sqft': grossAreaSqft,
      'base_rate_per_sqft': baseRatePerSqft,
      'floor_escalation_rate': floorEscalationPerSqft,
      'facing_premium_rate': facingPremiumAmount,
      'facing_id': facingDirection,
      'status_id': status == UnitGridStatus.available
          ? 'AVAILABLE'
          : status == UnitGridStatus.onHold
              ? 'ON_HOLD'
              : status == UnitGridStatus.sold
                  ? 'SOLD'
                  : 'LANDOWNER_SHARE',
      'is_landowner_share': status == UnitGridStatus.landownerShare,
      'lock_expires_at': lockedUntil?.toIso8601String(),
      'current_locked_by_user_name': lockedBy,
    };
  }

  factory UnitModel.fromEntity(UnitEntity entity) {
    return UnitModel(
      id: entity.id,
      unitNumber: entity.unitNumber,
      floorNumber: entity.floorNumber,
      towerName: entity.towerName,
      carpetAreaSqft: entity.carpetAreaSqft,
      grossAreaSqft: entity.grossAreaSqft,
      baseRatePerSqft: entity.baseRatePerSqft,
      floorEscalationPerSqft: entity.floorEscalationPerSqft,
      facingPremiumAmount: entity.facingPremiumAmount,
      facingDirection: entity.facingDirection,
      status: entity.status,
      lockedUntil: entity.lockedUntil,
      lockedBy: entity.lockedBy,
    );
  }
}
