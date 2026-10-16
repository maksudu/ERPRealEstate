import '../entities/lead_entity.dart';

abstract class CrmRepository {
  Future<List<LeadEntity>> getLeads();
  Future<CallActivityEntity> logCallActivity({
    required int leadId,
    required String outcome,
    required int durationMinutes,
    required String notes,
    DateTime? nextFollowup,
  });
  Future<LeadEntity> updateLeadStage({
    required int leadId,
    required LeadStageEnum stage,
  });
  Stream<Map<String, dynamic>> listenToLeadAlerts();
}
