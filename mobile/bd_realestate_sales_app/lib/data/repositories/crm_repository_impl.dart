import '../../domain/entities/lead_entity.dart';
import '../../domain/repositories/crm_repository.dart';
import '../datasources/crm_remote_datasource.dart';

class CrmRepositoryImpl implements CrmRepository {
  final CrmRemoteDataSource remoteDataSource;

  CrmRepositoryImpl({required this.remoteDataSource});

  @override
  Future<List<LeadEntity>> getLeads() async {
    return await remoteDataSource.fetchLeads();
  }

  @override
  Future<CallActivityEntity> logCallActivity({
    required int leadId,
    required String outcome,
    required int durationMinutes,
    required String notes,
    DateTime? nextFollowup,
  }) async {
    return await remoteDataSource.logCallActivity(
      leadId: leadId,
      outcome: outcome,
      durationMinutes: durationMinutes,
      notes: notes,
      nextFollowup: nextFollowup,
    );
  }

  @override
  Future<LeadEntity> updateLeadStage({
    required int leadId,
    required LeadStageEnum stage,
  }) async {
    final leads = await remoteDataSource.fetchLeads();
    final lead = leads.firstWhere((l) => l.id == leadId);
    lead.stage = stage;
    return lead;
  }

  @override
  Stream<Map<String, dynamic>> listenToLeadAlerts() {
    return remoteDataSource.socketStream;
  }
}
