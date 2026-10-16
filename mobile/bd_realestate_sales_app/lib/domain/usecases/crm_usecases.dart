import '../entities/lead_entity.dart';
import '../repositories/crm_repository.dart';

class GetLeadsUseCase {
  final CrmRepository repository;

  GetLeadsUseCase(this.repository);

  Future<List<LeadEntity>> execute() {
    return repository.getLeads();
  }
}

class LogCallActivityUseCase {
  final CrmRepository repository;

  LogCallActivityUseCase(this.repository);

  Future<CallActivityEntity> execute({
    required int leadId,
    required String outcome,
    required int durationMinutes,
    required String notes,
    DateTime? nextFollowup,
  }) {
    return repository.logCallActivity(
      leadId: leadId,
      outcome: outcome,
      durationMinutes: durationMinutes,
      notes: notes,
      nextFollowup: nextFollowup,
    );
  }
}
