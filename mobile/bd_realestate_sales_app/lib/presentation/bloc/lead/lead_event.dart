import '../../../domain/entities/lead_entity.dart';

abstract class LeadEvent {}

class LoadLeadsEvent extends LeadEvent {}

class FilterLeadsByStageEvent extends LeadEvent {
  final LeadStageEnum? stage;
  FilterLeadsByStageEvent(this.stage);
}

class SearchLeadsEvent extends LeadEvent {
  final String query;
  SearchLeadsEvent(this.query);
}

class LogCallActivityEvent extends LeadEvent {
  final int leadId;
  final String outcome;
  final int durationMinutes;
  final String notes;
  final DateTime? nextFollowup;

  LogCallActivityEvent({
    required this.leadId,
    required this.outcome,
    required this.durationMinutes,
    required this.notes,
    this.nextFollowup,
  });
}

class SimulateIncomingPushLeadEvent extends LeadEvent {
  final String fullName;
  final String source;
  final String phone;
  final String bedroomRequirement;
  final double budgetBdt;

  SimulateIncomingPushLeadEvent({
    required this.fullName,
    required this.source,
    required this.phone,
    required this.bedroomRequirement,
    required this.budgetBdt,
  });
}

class DismissIncomingLeadNotificationEvent extends LeadEvent {}
