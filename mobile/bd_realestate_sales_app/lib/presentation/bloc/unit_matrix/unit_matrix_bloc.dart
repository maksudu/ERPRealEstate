import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/entities/unit_entity.dart';
import '../../../domain/usecases/get_units_usecase.dart';
import '../../../domain/usecases/lock_unit_usecase.dart';
import '../../../domain/repositories/inventory_repository.dart';
import 'unit_matrix_event.dart';
import 'unit_matrix_state.dart';

class UnitMatrixBloc extends Bloc<UnitMatrixEvent, UnitMatrixState> {
  final GetUnitsUseCase getUnitsUseCase;
  final LockUnitUseCase lockUnitUseCase;
  final InventoryRepository inventoryRepository;

  Timer? _countdownTimer;
  StreamSubscription? _socketSubscription;

  final bool enableCountdownTimer;

  UnitMatrixBloc({
    required this.getUnitsUseCase,
    required this.lockUnitUseCase,
    required this.inventoryRepository,
    this.enableCountdownTimer = true,
  }) : super(const UnitMatrixState()) {
    on<LoadUnitsEvent>(_onLoadUnits);
    on<ChangeTowerEvent>(_onChangeTower);
    on<LockUnitEvent>(_onLockUnit);
    on<UnlockUnitEvent>(_onUnlockUnit);
    on<TickCountdownEvent>(_onTickCountdown);
    on<WebSocketUpdateReceivedEvent>(_onWebSocketUpdate);

    if (enableCountdownTimer) {
      _startCountdownTimer();
    }
    _subscribeToWebSocket();
  }

  void _startCountdownTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      add(TickCountdownEvent());
    });
  }

  void _subscribeToWebSocket() {
    _socketSubscription?.cancel();
    _socketSubscription = inventoryRepository.listenToLockEvents().listen((event) {
      add(WebSocketUpdateReceivedEvent(event));
    });
  }

  Future<void> _onLoadUnits(LoadUnitsEvent event, Emitter<UnitMatrixState> emit) async {
    emit(state.copyWith(status: UnitMatrixStatus.loading));
    try {
      final units = await getUnitsUseCase.execute(towerName: event.towerName);
      final locked = units.where((u) => u.status == UnitGridStatus.onHold).length;
      emit(state.copyWith(
        status: UnitMatrixStatus.loaded,
        units: units,
        selectedTower: event.towerName,
        activeLockedCount: locked,
      ));
    } catch (e) {
      emit(state.copyWith(
        status: UnitMatrixStatus.error,
        errorMessage: e.toString(),
      ));
    }
  }

  Future<void> _onChangeTower(ChangeTowerEvent event, Emitter<UnitMatrixState> emit) async {
    add(LoadUnitsEvent(towerName: event.towerName));
  }

  Future<void> _onLockUnit(LockUnitEvent event, Emitter<UnitMatrixState> emit) async {
    try {
      final lockedUnit = await lockUnitUseCase.execute(
        unitId: event.unit.id,
        userId: event.userId,
        userName: event.userName,
      );

      final updatedList = state.units.map((u) {
        if (u.id == lockedUnit.id) {
          return lockedUnit;
        }
        return u;
      }).toList();

      final locked = updatedList.where((u) => u.status == UnitGridStatus.onHold).length;

      emit(state.copyWith(
        units: updatedList,
        activeLockedCount: locked,
        bannerNotification: 'Unit ${lockedUnit.unitNumber} locked for 15 minutes! Live Redis Mutex acquired.',
      ));
    } catch (e) {
      emit(state.copyWith(
        errorMessage: 'Lock failed: $e',
      ));
    }
  }

  Future<void> _onUnlockUnit(UnlockUnitEvent event, Emitter<UnitMatrixState> emit) async {
    final updatedList = state.units.map((u) {
      if (u.id == event.unitId) {
        return u.copyWith(
          status: UnitGridStatus.available,
          lockedUntil: null,
          lockedBy: null,
        );
      }
      return u;
    }).toList();

    emit(state.copyWith(
      units: updatedList,
      bannerNotification: 'Lock released for Unit.',
    ));
  }

  void _onTickCountdown(TickCountdownEvent event, Emitter<UnitMatrixState> emit) {
    if (state.units.isEmpty) return;

    bool hasChanged = false;
    final updatedList = state.units.map((u) {
      if (u.status == UnitGridStatus.onHold && u.lockedUntil != null) {
        if (u.remainingLockSeconds <= 0) {
          hasChanged = true;
          return u.copyWith(
            status: UnitGridStatus.available,
            lockedUntil: null,
            lockedBy: null,
          );
        }
      }
      return u;
    }).toList();

    if (hasChanged) {
      final locked = updatedList.where((u) => u.status == UnitGridStatus.onHold).length;
      emit(state.copyWith(
        units: updatedList,
        activeLockedCount: locked,
        bannerNotification: 'A 15-minute lock expired and returned to Available inventory.',
      ));
    } else {
      // Re-emit state so widgets listening to countdown ticker re-render seamlessly
      emit(state.copyWith(units: List.of(state.units)));
    }
  }

  void _onWebSocketUpdate(WebSocketUpdateReceivedEvent event, Emitter<UnitMatrixState> emit) {
    final data = event.data;
    if (data['event'] == 'UNIT_LOCKED') {
      final unitId = data['unit_id'] as int?;
      if (unitId != null) {
        final lockSeconds = data['lock_duration_seconds'] as int? ?? 900;
        final lockedBy = data['locked_by'] as String? ?? 'Another Sales Rep';

        final updatedList = state.units.map((u) {
          if (u.id == unitId) {
            return u.copyWith(
              status: UnitGridStatus.onHold,
              lockedUntil: DateTime.now().add(Duration(seconds: lockSeconds)),
              lockedBy: lockedBy,
            );
          }
          return u;
        }).toList();

        final locked = updatedList.where((u) => u.status == UnitGridStatus.onHold).length;
        emit(state.copyWith(
          units: updatedList,
          activeLockedCount: locked,
          bannerNotification: 'Live Update: Unit ${data['unit_number']} was just locked by $lockedBy',
        ));
      }
    }
  }

  @override
  Future<void> close() {
    _countdownTimer?.cancel();
    _socketSubscription?.cancel();
    return super.close();
  }
}
