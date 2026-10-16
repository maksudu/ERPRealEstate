import '../../core/network/api_client.dart';
import '../../core/network/websocket_client.dart';
import '../models/lead_model.dart';
import '../../domain/entities/lead_entity.dart';

abstract class CrmRemoteDataSource {
  Future<List<LeadModel>> fetchLeads();
  Future<CallActivityEntity> logCallActivity({
    required int leadId,
    required String outcome,
    required int durationMinutes,
    required String notes,
    DateTime? nextFollowup,
  });
  Stream<Map<String, dynamic>> get socketStream;
}

class CrmRemoteDataSourceImpl implements CrmRemoteDataSource {
  final ApiClient apiClient;
  final InventoryWebSocketClient webSocketClient;

  CrmRemoteDataSourceImpl({
    required this.apiClient,
    required this.webSocketClient,
  });

  @override
  Stream<Map<String, dynamic>> get socketStream => webSocketClient.stream;

  @override
  Future<List<LeadModel>> fetchLeads() async {
    return [
      LeadModel(
        id: 1,
        fullName: 'Engr. Mahbubur Rahman',
        phone: '+8801711223344',
        email: 'mahbub@gmail.com',
        source: LeadSourceEnum.facebookAds,
        stage: LeadStageEnum.newLead,
        preferredLocation: 'Gulshan-2 or Banani',
        bedroomRequirement: '3 Bed (1950 sqft)',
        budgetBdt: 25000000,
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      ),
      LeadModel(
        id: 2,
        fullName: 'Dr. Nusrat Jahan',
        phone: '+8801819556677',
        email: 'nusrat.jahan@dghs.gov.bd',
        source: LeadSourceEnum.websiteForm,
        stage: LeadStageEnum.contacted,
        preferredLocation: 'Dhanmondi Lake View',
        bedroomRequirement: '4 Bed (2300 sqft)',
        budgetBdt: 32000000,
        createdAt: DateTime.now().subtract(const Duration(hours: 8)),
        lastCallOutcome: 'Interested in 4th floor south facing unit. Scheduled visit.',
      ),
      LeadModel(
        id: 3,
        fullName: 'Kamrul Hasan (USA Expatriate)',
        phone: '+14155552671',
        email: 'kamrul.ny@yahoo.com',
        source: LeadSourceEnum.whatsApp,
        stage: LeadStageEnum.negotiation,
        preferredLocation: 'Uttara Sector 4',
        bedroomRequirement: '3 Bed (1650 sqft)',
        budgetBdt: 18500000,
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
        lastCallOutcome: 'Requested 2% discount on down payment.',
      ),
      LeadModel(
        id: 4,
        fullName: 'Md. Tariqul Islam',
        phone: '+8801912345678',
        email: 'tariqul@beximco.net',
        source: LeadSourceEnum.walkIn,
        stage: LeadStageEnum.siteVisitScheduled,
        preferredLocation: 'Bashundhara R/A Block I',
        bedroomRequirement: '3 Bed (1500 sqft)',
        budgetBdt: 14000000,
        createdAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ];
  }

  @override
  Future<CallActivityEntity> logCallActivity({
    required int leadId,
    required String outcome,
    required int durationMinutes,
    required String notes,
    DateTime? nextFollowup,
  }) async {
    final response = await apiClient.logLeadCallActivity(
      leadId,
      outcome: outcome,
      callMinutes: durationMinutes,
      notes: notes,
      nextFollowup: nextFollowup,
    );

    return CallActivityEntity(
      id: response['id'] is int ? response['id'] : DateTime.now().millisecondsSinceEpoch,
      outcome: outcome,
      durationMinutes: durationMinutes,
      notes: notes,
      loggedAt: DateTime.now(),
    );
  }
}
