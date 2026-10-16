import '../../core/network/api_client.dart';
import '../../core/network/websocket_client.dart';
import '../models/unit_model.dart';
import '../../domain/entities/unit_entity.dart';

abstract class InventoryRemoteDataSource {
  Future<List<UnitModel>> fetchUnits({String? towerName});
  Future<UnitModel> lockUnit({required int unitId, required int userId, required String userName});
  Future<void> releaseLock(int unitId);
  Stream<Map<String, dynamic>> get socketStream;
}

class InventoryRemoteDataSourceImpl implements InventoryRemoteDataSource {
  final ApiClient apiClient;
  final InventoryWebSocketClient webSocketClient;

  InventoryRemoteDataSourceImpl({
    required this.apiClient,
    required this.webSocketClient,
  }) {
    webSocketClient.connect();
  }

  @override
  Stream<Map<String, dynamic>> get socketStream => webSocketClient.stream;

  @override
  Future<List<UnitModel>> fetchUnits({String? towerName}) async {
    // In production environment with live DB or fallback seed
    final targetTower = towerName ?? 'Tower A';
    return _getSeedUnits(targetTower);
  }

  @override
  Future<UnitModel> lockUnit({
    required int unitId,
    required int userId,
    required String userName,
  }) async {
    final response = await apiClient.lockUnit(unitId, userId: userId, userName: userName);
    final expiresAt = DateTime.tryParse(response['expires_at'] ?? '') ??
        DateTime.now().add(const Duration(minutes: 15));

    // Broadcast lock on websocket
    webSocketClient.broadcastLockEvent(
      unitId: unitId,
      unitNumber: response['unit_number'] ?? 'U-$unitId',
      lockedBy: userName,
      lockSeconds: 900,
    );

    return UnitModel(
      id: unitId,
      unitNumber: response['unit_number'] ?? 'U-$unitId',
      floorNumber: (unitId ~/ 100) > 0 ? (unitId ~/ 100) : 1,
      towerName: 'Tower A',
      carpetAreaSqft: 1450,
      grossAreaSqft: 1820,
      baseRatePerSqft: 8500,
      floorEscalationPerSqft: 50,
      facingPremiumAmount: 250000,
      facingDirection: 'South-East Corner',
      status: UnitGridStatus.onHold,
      lockedUntil: expiresAt,
      lockedBy: userName,
    );
  }

  @override
  Future<void> releaseLock(int unitId) async {
    // Release lock action
  }

  List<UnitModel> _getSeedUnits(String tower) {
    if (tower == 'Tower B') {
      return [
        UnitModel(id: 1101, unitNumber: '1A', floorNumber: 1, towerName: 'Tower B', carpetAreaSqft: 1500, grossAreaSqft: 1900, baseRatePerSqft: 8800, status: UnitGridStatus.available),
        UnitModel(id: 1102, unitNumber: '1B', floorNumber: 1, towerName: 'Tower B', carpetAreaSqft: 1350, grossAreaSqft: 1720, baseRatePerSqft: 8800, status: UnitGridStatus.sold),
        UnitModel(id: 1201, unitNumber: '2A', floorNumber: 2, towerName: 'Tower B', carpetAreaSqft: 1500, grossAreaSqft: 1900, baseRatePerSqft: 8800, status: UnitGridStatus.available),
        UnitModel(id: 1202, unitNumber: '2B', floorNumber: 2, towerName: 'Tower B', carpetAreaSqft: 1350, grossAreaSqft: 1720, baseRatePerSqft: 8800, status: UnitGridStatus.landownerShare),
        UnitModel(id: 1301, unitNumber: '3A', floorNumber: 3, towerName: 'Tower B', carpetAreaSqft: 1500, grossAreaSqft: 1900, baseRatePerSqft: 8800, status: UnitGridStatus.onHold, lockedUntil: DateTime.now().add(const Duration(minutes: 11, seconds: 15)), lockedBy: 'Reza (Dhanmondi HQ)'),
        UnitModel(id: 1302, unitNumber: '3B', floorNumber: 3, towerName: 'Tower B', carpetAreaSqft: 1350, grossAreaSqft: 1720, baseRatePerSqft: 8800, status: UnitGridStatus.available),
      ];
    }

    return [
      // Floor 1
      UnitModel(id: 101, unitNumber: '1A', floorNumber: 1, towerName: 'Tower A', carpetAreaSqft: 1450, grossAreaSqft: 1820, baseRatePerSqft: 8500, status: UnitGridStatus.sold),
      UnitModel(id: 102, unitNumber: '1B', floorNumber: 1, towerName: 'Tower A', carpetAreaSqft: 1200, grossAreaSqft: 1510, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      UnitModel(id: 103, unitNumber: '1C', floorNumber: 1, towerName: 'Tower A', carpetAreaSqft: 1600, grossAreaSqft: 2050, baseRatePerSqft: 8500, status: UnitGridStatus.landownerShare),
      // Floor 2
      UnitModel(id: 201, unitNumber: '2A', floorNumber: 2, towerName: 'Tower A', carpetAreaSqft: 1450, grossAreaSqft: 1820, baseRatePerSqft: 8500, status: UnitGridStatus.onHold, lockedUntil: DateTime.now().add(const Duration(minutes: 9, seconds: 45)), lockedBy: 'Tanvir (Dhaka Office)'),
      UnitModel(id: 202, unitNumber: '2B', floorNumber: 2, towerName: 'Tower A', carpetAreaSqft: 1200, grossAreaSqft: 1510, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      UnitModel(id: 203, unitNumber: '2C', floorNumber: 2, towerName: 'Tower A', carpetAreaSqft: 1600, grossAreaSqft: 2050, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      // Floor 3
      UnitModel(id: 301, unitNumber: '3A', floorNumber: 3, towerName: 'Tower A', carpetAreaSqft: 1450, grossAreaSqft: 1820, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      UnitModel(id: 302, unitNumber: '3B', floorNumber: 3, towerName: 'Tower A', carpetAreaSqft: 1200, grossAreaSqft: 1510, baseRatePerSqft: 8500, status: UnitGridStatus.sold),
      UnitModel(id: 303, unitNumber: '3C', floorNumber: 3, towerName: 'Tower A', carpetAreaSqft: 1600, grossAreaSqft: 2050, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      // Floor 4
      UnitModel(id: 401, unitNumber: '4A', floorNumber: 4, towerName: 'Tower A', carpetAreaSqft: 1450, grossAreaSqft: 1820, baseRatePerSqft: 8500, status: UnitGridStatus.available),
      UnitModel(id: 402, unitNumber: '4B', floorNumber: 4, towerName: 'Tower A', carpetAreaSqft: 1200, grossAreaSqft: 1510, baseRatePerSqft: 8500, status: UnitGridStatus.landownerShare),
      UnitModel(id: 403, unitNumber: '4C', floorNumber: 4, towerName: 'Tower A', carpetAreaSqft: 1600, grossAreaSqft: 2050, baseRatePerSqft: 8500, status: UnitGridStatus.onHold, lockedUntil: DateTime.now().add(const Duration(minutes: 13, seconds: 20)), lockedBy: 'Karim (Banani)'),
    ];
  }
}
