import '../../../domain/entities/unit_entity.dart';

enum UnitMatrixStatus { initial, loading, loaded, error }

class UnitMatrixState {
  final UnitMatrixStatus status;
  final List<UnitEntity> units;
  final String selectedTower;
  final List<String> availableTowers;
  final String? errorMessage;
  final String? bannerNotification;
  final int activeLockedCount;

  const UnitMatrixState({
    this.status = UnitMatrixStatus.initial,
    this.units = const [],
    this.selectedTower = 'Tower A',
    this.availableTowers = const ['Tower A', 'Tower B'],
    this.errorMessage,
    this.bannerNotification,
    this.activeLockedCount = 0,
  });

  UnitMatrixState copyWith({
    UnitMatrixStatus? status,
    List<UnitEntity>? units,
    String? selectedTower,
    List<String>? availableTowers,
    String? errorMessage,
    String? bannerNotification,
    int? activeLockedCount,
  }) {
    return UnitMatrixState(
      status: status ?? this.status,
      units: units ?? this.units,
      selectedTower: selectedTower ?? this.selectedTower,
      availableTowers: availableTowers ?? this.availableTowers,
      errorMessage: errorMessage,
      bannerNotification: bannerNotification,
      activeLockedCount: activeLockedCount ?? this.activeLockedCount,
    );
  }

  int get availableCount => units.where((u) => u.status == UnitGridStatus.available).length;
  int get onHoldCount => units.where((u) => u.status == UnitGridStatus.onHold).length;
  int get soldCount => units.where((u) => u.status == UnitGridStatus.sold).length;
  int get landownerCount => units.where((u) => u.status == UnitGridStatus.landownerShare).length;
}
