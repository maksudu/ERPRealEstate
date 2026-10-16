import '../entities/unit_entity.dart';

abstract class InventoryRepository {
  Future<List<UnitEntity>> getUnits({String? towerName});
  Future<UnitEntity> lockUnit({
    required int unitId,
    required int userId,
    required String userName,
  });
  Future<void> releaseLock(int unitId);
  Stream<Map<String, dynamic>> listenToLockEvents();
}
