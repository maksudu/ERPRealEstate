import '../../domain/entities/lead_entity.dart';

class LeadModel extends LeadEntity {
  LeadModel({
    required super.id,
    required super.fullName,
    required super.phone,
    required super.email,
    required super.source,
    super.stage,
    required super.preferredLocation,
    required super.bedroomRequirement,
    required super.budgetBdt,
    required super.createdAt,
    super.lastCallOutcome,
    super.nextFollowupDate,
    super.activities,
  });

  factory LeadModel.fromJson(Map<String, dynamic> json) {
    LeadSourceEnum parseSource(String? src) {
      switch (src?.toUpperCase()) {
        case 'FACEBOOK_ADS':
        case 'FACEBOOK':
          return LeadSourceEnum.facebookAds;
        case 'WEBSITE':
        case 'WEB_FORM':
          return LeadSourceEnum.websiteForm;
        case 'WHATSAPP':
          return LeadSourceEnum.whatsApp;
        case 'WALK_IN':
        default:
          return LeadSourceEnum.walkIn;
      }
    }

    LeadStageEnum parseStage(String? stg) {
      switch (stg?.toUpperCase()) {
        case 'CONTACTED':
          return LeadStageEnum.contacted;
        case 'SITE_VISIT':
        case 'SITE_VISIT_SCHEDULED':
          return LeadStageEnum.siteVisitScheduled;
        case 'NEGOTIATION':
          return LeadStageEnum.negotiation;
        case 'BOOKED':
          return LeadStageEnum.booked;
        case 'LOST':
          return LeadStageEnum.lost;
        case 'NEW':
        case 'NEW_LEAD':
        default:
          return LeadStageEnum.newLead;
      }
    }

    return LeadModel(
      id: json['id'] as int,
      fullName: json['full_name'] as String? ?? 'Valued Client',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String? ?? '',
      source: parseSource(json['source_id'] ?? json['source']),
      stage: parseStage(json['stage_id'] ?? json['stage']),
      preferredLocation: json['preferred_location'] as String? ?? 'Dhaka Prime',
      bedroomRequirement: json['bedroom_requirement'] as String? ?? '3 Bed (1950 sqft)',
      budgetBdt: (json['budget_bdt'] ?? json['budget'] ?? 20000000.0).toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
      lastCallOutcome: json['last_call_outcome'] as String?,
      nextFollowupDate: json['next_followup_date'] != null
          ? DateTime.tryParse(json['next_followup_date'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'phone': phone,
      'email': email,
      'source_id': source == LeadSourceEnum.facebookAds
          ? 'FACEBOOK_ADS'
          : source == LeadSourceEnum.websiteForm
              ? 'WEBSITE'
              : source == LeadSourceEnum.whatsApp
                  ? 'WHATSAPP'
                  : 'WALK_IN',
      'stage_id': stage == LeadStageEnum.newLead
          ? 'NEW'
          : stage == LeadStageEnum.contacted
              ? 'CONTACTED'
              : stage == LeadStageEnum.siteVisitScheduled
                  ? 'SITE_VISIT'
                  : stage == LeadStageEnum.negotiation
                      ? 'NEGOTIATION'
                      : stage == LeadStageEnum.booked
                          ? 'BOOKED'
                          : 'LOST',
      'preferred_location': preferredLocation,
      'bedroom_requirement': bedroomRequirement,
      'budget_bdt': budgetBdt,
      'last_call_outcome': lastCallOutcome,
    };
  }
}
