import '../../../domain/entities/unit_entity.dart';

abstract class UnitMatrixEvent {}

class LoadUnitsEvent extends UnitMatrixEvent {
  final String towerName;
  LoadUnitsEvent({this.towerName = 'Tower A'});
}

class ChangeTowerEvent extends UnitMatrixEvent {
  final String towerName;
  ChangeTowerEvent(this.towerName);
}

class LockUnitEvent extends UnitMatrixEvent {
  final UnitEntity unit;
  final int userId;
  final String userName;
  LockUnitEvent({
    required this.unit,
    this.userId = 1,
    this.userName = 'You (Field App)',
  });
}

class UnlockUnitEvent extends UnitMatrixEvent {
  final int unitId;
  UnlockUnitEvent(this.unitId);
}

class TickCountdownEvent extends UnitMatrixEvent {}

class WebSocketUpdateReceivedEvent extends UnitMatrixEvent {
  final Map<String, dynamic> data;
  WebSocketUpdateReceivedEvent(this.data);
}
