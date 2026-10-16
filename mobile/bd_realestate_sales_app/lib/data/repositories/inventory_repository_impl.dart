import '../../domain/entities/unit_entity.dart';
import '../../domain/repositories/inventory_repository.dart';
import '../datasources/inventory_remote_datasource.dart';

class InventoryRepositoryImpl implements InventoryRepository {
  final InventoryRemoteDataSource remoteDataSource;

  InventoryRepositoryImpl({required this.remoteDataSource});

  @override
  Future<List<UnitEntity>> getUnits({String? towerName}) async {
    return await remoteDataSource.fetchUnits(towerName: towerName);
  }

  @override
  Future<UnitEntity> lockUnit({
    required int unitId,
    required int userId,
    required String userName,
  }) async {
    return await remoteDataSource.lockUnit(
      unitId: unitId,
      userId: userId,
      userName: userName,
    );
  }

  @override
  Future<void> releaseLock(int unitId) async {
    await remoteDataSource.releaseLock(unitId);
  }

  @override
  Stream<Map<String, dynamic>> listenToLockEvents() {
    return remoteDataSource.socketStream;
  }
}
