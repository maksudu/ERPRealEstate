import '../entities/unit_entity.dart';
import '../repositories/inventory_repository.dart';

class GetUnitsUseCase {
  final InventoryRepository repository;

  GetUnitsUseCase(this.repository);

  Future<List<UnitEntity>> execute({String? towerName}) {
    return repository.getUnits(towerName: towerName);
  }
}
