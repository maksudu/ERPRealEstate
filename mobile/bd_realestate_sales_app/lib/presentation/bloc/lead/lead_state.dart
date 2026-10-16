import '../../../domain/entities/lead_entity.dart';

enum LeadStatus { initial, loading, loaded, error }

class IncomingLeadNotification {
  final String fullName;
  final String source;
  final String phone;
  final String bedroomRequirement;
  final double budgetBdt;
  final DateTime receivedAt;

  IncomingLeadNotification({
    required this.fullName,
    required this.source,
    required this.phone,
    required this.bedroomRequirement,
    required this.budgetBdt,
    required this.receivedAt,
  });
}

class LeadState {
  final LeadStatus status;
  final List<LeadEntity> allLeads;
  final List<LeadEntity> filteredLeads;
  final LeadStageEnum? selectedStage;
  final String searchQuery;
  final IncomingLeadNotification? activeNotification;
  final String? bannerMessage;
  final String? errorMessage;

  const LeadState({
    this.status = LeadStatus.initial,
    this.allLeads = const [],
    this.filteredLeads = const [],
    this.selectedStage,
    this.searchQuery = '',
    this.activeNotification,
    this.bannerMessage,
    this.errorMessage,
  });

  LeadState copyWith({
    LeadStatus? status,
    List<LeadEntity>? allLeads,
    List<LeadEntity>? filteredLeads,
    LeadStageEnum? selectedStage,
    bool clearSelectedStage = false,
    String? searchQuery,
    IncomingLeadNotification? activeNotification,
    bool clearActiveNotification = false,
    String? bannerMessage,
    String? errorMessage,
  }) {
    return LeadState(
      status: status ?? this.status,
      allLeads: allLeads ?? this.allLeads,
      filteredLeads: filteredLeads ?? this.filteredLeads,
      selectedStage: clearSelectedStage ? null : (selectedStage ?? this.selectedStage),
      searchQuery: searchQuery ?? this.searchQuery,
      activeNotification: clearActiveNotification ? null : (activeNotification ?? this.activeNotification),
      bannerMessage: bannerMessage,
      errorMessage: errorMessage,
    );
  }
}
