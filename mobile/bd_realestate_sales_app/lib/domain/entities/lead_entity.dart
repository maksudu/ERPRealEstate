enum LeadStageEnum {
  newLead,
  contacted,
  siteVisitScheduled,
  negotiation,
  booked,
  lost,
}

enum LeadSourceEnum {
  facebookAds,
  websiteForm,
  whatsApp,
  walkIn,
}

class CallActivityEntity {
  final int id;
  final String outcome;
  final int durationMinutes;
  final String notes;
  final DateTime loggedAt;

  CallActivityEntity({
    required this.id,
    required this.outcome,
    required this.durationMinutes,
    required this.notes,
    required this.loggedAt,
  });
}

class LeadEntity {
  final int id;
  final String fullName;
  final String phone;
  final String email;
  final LeadSourceEnum source;
  LeadStageEnum stage;
  final String preferredLocation;
  final String bedroomRequirement;
  final double budgetBdt;
  final DateTime createdAt;
  String? lastCallOutcome;
  DateTime? nextFollowupDate;
  List<CallActivityEntity> activities;

  LeadEntity({
    required this.id,
    required this.fullName,
    required this.phone,
    required this.email,
    required this.source,
    this.stage = LeadStageEnum.newLead,
    required this.preferredLocation,
    required this.bedroomRequirement,
    required this.budgetBdt,
    required this.createdAt,
    this.lastCallOutcome,
    this.nextFollowupDate,
    List<CallActivityEntity>? activities,
  }) : activities = activities ?? [];

  String get sourceLabel {
    switch (source) {
      case LeadSourceEnum.facebookAds:
        return 'Facebook Ads';
      case LeadSourceEnum.websiteForm:
        return 'Website';
      case LeadSourceEnum.whatsApp:
        return 'WhatsApp Inbound';
      case LeadSourceEnum.walkIn:
        return 'Site Walk-in';
    }
  }

  String get stageLabel {
    switch (stage) {
      case LeadStageEnum.newLead:
        return 'New Lead';
      case LeadStageEnum.contacted:
        return 'Contacted';
      case LeadStageEnum.siteVisitScheduled:
        return 'Site Visit';
      case LeadStageEnum.negotiation:
        return 'Negotiation';
      case LeadStageEnum.booked:
        return 'Booked';
      case LeadStageEnum.lost:
        return 'Lost';
    }
  }
}
