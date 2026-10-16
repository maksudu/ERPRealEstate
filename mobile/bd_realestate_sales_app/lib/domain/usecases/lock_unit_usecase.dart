import '../entities/unit_entity.dart';
import '../repositories/inventory_repository.dart';

class LockUnitUseCase {
  final InventoryRepository repository;

  LockUnitUseCase(this.repository);

  Future<UnitEntity> execute({
    required int unitId,
    required int userId,
    required String userName,
  }) {
    return repository.lockUnit(
      unitId: unitId,
      userId: userId,
      userName: userName,
    );
  }
}
