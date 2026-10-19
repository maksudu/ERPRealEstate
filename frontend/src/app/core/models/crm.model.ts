export interface LeadActivity {
  id: number;
  activity_code?: string;
  lead_id?: number | null;
  customer_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  sales_rep_id?: number | null;
  activity_type: string;
  title?: string | null;
  activity_summary: string;
  scheduled_at?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  duration_minutes?: number;
  meeting_location?: string | null;
  agenda?: string | null;
  status: string; // PLANNED, COMPLETED, RESCHEDULED, CANCELLED, NO_SHOW
  attendance_status?: string | null; // PENDING, ATTENDED, NO_SHOW, CANCELLED
  completed_at?: string | null;
  outcome?: string | null;
  shortlisted_units_json?: string | null;
  next_action?: string | null;
  next_follow_up_date?: string | null;
  reminder_minutes_before?: number;
  is_reminder_sent?: boolean;
  escalation_level?: number;
  created_at?: string;
  updated_at?: string;
  lead_name?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  sales_rep_name?: string | null;
}

export interface ActivityStatsSummary {
  total_activities: number;
  planned_count: number;
  completed_count: number;
  rescheduled_count: number;
  cancelled_count: number;
  no_show_count: number;
  no_show_rate_percentage: number;
  total_site_visits: number;
  completed_site_visits: number;
  no_show_site_visits: number;
  site_visit_completion_rate_percentage: number;
}

export interface FollowUpTask {
  id: number;
  task_code: string;
  lead_id?: number | null;
  customer_id?: number | null;
  activity_id?: number | null;
  title: string;
  description?: string | null;
  task_category: string; // CRM_TASK_CATEGORY
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  due_date: string;
  assigned_to_id?: number | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
  completion_outcome?: string | null;
  completion_notes?: string | null;
  completed_at?: string | null;
  completed_by_id?: number | null;
  escalated_to_manager_id?: number | null;
  escalated_at?: string | null;
  reminder_channel?: string | null;
  is_automated: boolean;
  consent_checked: boolean;
  created_at?: string;
  updated_at?: string;
  lead_name?: string | null;
  customer_name?: string | null;
  contact_phone?: string | null;
  assigned_to_name?: string | null;
  is_overdue?: boolean;
}

export interface DailyTodoSummary {
  total_due_today: number;
  total_overdue: number;
  total_completed_today: number;
  high_priority_count: number;
  tasks: FollowUpTask[];
}

export interface CommunicationHistory {
  id: number;
  communication_code: string;
  channel: string; // PHONE_CALL, WHATSAPP, SMS, EMAIL, OFFICE_MEETING, SITE_VISIT, WEBSITE_INQUIRY, FACEBOOK_LEAD, QUOTATION_SENT, INTERNAL_NOTE, COMPLAINT_TICKET
  direction: 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
  lead_id?: number | null;
  customer_id?: number | null;
  user_id?: number | null;
  subject: string;
  message_body: string;
  delivery_status?: string | null;
  is_sensitive: boolean;
  is_automated: boolean;
  resulting_action?: string | null;
  metadata_json?: string | null;
  sent_at?: string | null;
  created_at?: string;
  user_name?: string | null;
  lead_name?: string | null;
  customer_name?: string | null;
  contact_phone?: string | null;
}

export interface CustomerTimelineItem {
  id: string;
  type: 'COMMUNICATION' | 'ACTIVITY' | 'TASK';
  channel: string;
  direction: string;
  title: string;
  content: string;
  delivery_status?: string | null;
  attendance_status?: string | null;
  is_sensitive?: boolean;
  is_automated?: boolean;
  author?: string | null;
  timestamp: string;
  resulting_action?: string | null;
}

export type PipelineStage =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'SITE_VISIT_SCHEDULED'
  | 'SITE_VISIT_COMPLETED'
  | 'NEGOTIATION'
  | 'TOKEN_BOOKED'
  | 'LOST'
  | 'VISITED'
  | 'BOOKED'
  | 'DROPPED'
  | string;

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type LeadHealthGrade = 'HOT' | 'WARM' | 'COLD' | 'NURTURE' | 'UNQUALIFIED';

export interface Lead {
  id: number;
  lead_code?: string | null;
  organization_id?: number | null;
  lead_source_id: string;
  original_source_id?: string | null;
  campaign_name?: string | null;
  campaign_id?: number | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer_broker_id?: number | null;
  referral_customer_id?: number | null;
  lead_name: string;
  primary_phone: string;
  email?: string | null;
  preferred_contact_method?: string | null;
  is_consent_given: boolean;
  is_opted_out: boolean;
  opt_out_at?: string | null;
  opt_out_reason?: string | null;
  interested_project_id?: number | null;
  interested_project_name?: string | null;
  property_type?: string | null;
  preferred_location?: string | null;
  required_area_sqft?: number | null;
  bedrooms?: number | null;
  expected_purchase_date?: string | null;
  budget_range_min?: number | null;
  budget_range_max?: number | null;
  assigned_sales_rep_id?: number | null;
  assigned_sales_rep_name?: string | null;
  priority: LeadPriority;
  first_response_deadline?: string | null;
  first_contacted_at?: string | null;
  assignment_method?: string | null;
  lead_stage: PipelineStage;
  lead_score: number;
  lost_reason?: string | null;
  is_duplicate: boolean;
  duplicate_of_lead_id?: number | null;
  notes?: string | null;
  // 4.4 Qualification
  health_grade?: LeadHealthGrade | null;
  manual_score_override?: number | null;
  qualification_reasons?: string | null;
  financing_ready?: boolean | null;
  decision_maker_available?: boolean | null;
  last_scored_at?: string | null;
  qualified_by_id?: number | null;
  qualified_at?: string | null;
  activities: LeadActivity[];
  assignments?: LeadAssignment[];
  created_at?: string;
  updated_at?: string;
}

export interface LeadPaginatedResponse {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadScoreBreakdown {
  lead_id: number;
  lead_name: string;
  total_score: number;
  budget_fit_score: number;
  contact_completeness_score: number;
  source_quality_score: number;
  engagement_progression_score: number;
  timeline_fit_score?: number;
  financing_score?: number;
  lead_stage: string;
  health_grade: LeadHealthGrade;
  qualification_reasons?: string | null;
  recommended_action: string;
  financing_ready?: boolean | null;
  decision_maker_available?: boolean | null;
  manual_score_override?: number | null;
}

// ---------------- 4.4 Qualification ----------------
export interface LeadQualification {
  id: number;
  lead_id: number;
  total_score: number;
  health_grade: LeadHealthGrade;
  budget_fit_score: number;
  contact_completeness_score: number;
  source_quality_score: number;
  engagement_progression_score: number;
  timeline_fit_score: number;
  financing_score: number;
  qualification_reasons?: string | null;
  recommended_action?: string | null;
  engagement_flags?: string | null;
  computed_by: string;
  computed_by_id?: number | null;
  computed_at?: string | null;
  lead_name?: string | null;
  lead_code?: string | null;
}

export interface LeadQualificationUpdate {
  health_grade?: LeadHealthGrade;
  manual_score_override?: number;
  qualification_reasons?: string;
  financing_ready?: boolean;
  decision_maker_available?: boolean;
}

export interface LeadQualificationPaginatedResponse {
  items: LeadQualification[];
  total: number;
  limit: number;
  offset: number;
}

// ---------------- 4.3 Assignment ----------------
export interface LeadAssignment {
  id: number;
  lead_id: number;
  assigned_to_id?: number | null;
  assigned_by_id?: number | null;
  previous_rep_id?: number | null;
  assignment_method: string;
  assignment_reason?: string | null;
  response_sla_hours?: number | null;
  response_sla_deadline?: string | null;
  is_active: boolean;
  status?: string | null;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  escalated_to_manager_name?: string | null;
  assigned_at?: string | null;
  released_at?: string | null;
  assigned_to_name?: string | null;
  assigned_by_name?: string | null;
  lead_name?: string | null;
  lead_code?: string | null;
  primary_phone?: string | null;
}

export interface LeadAssignmentPaginatedResponse {
  items: LeadAssignment[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadAssignmentRule {
  id: number;
  rule_name: string;
  method: string;
  priority_order: number;
  conditions?: string | null;
  target_sales_rep_ids?: string | null;
  sla_hours: number;
  escalate_to_manager_id?: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeadAssignmentRulePaginatedResponse {
  items: LeadAssignmentRule[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadAssignmentQueueStats {
  total_leads: number;
  unassigned_leads: number;
  overdue_first_response: number;
  assigned_today: number;
  reassigned_total: number;
  escalated_total: number;
}

export interface BulkAssignRequest {
  lead_ids: number[];
  assignment_method: string;
  assigned_to_id?: number | null;
  assignment_reason?: string | null;
  response_sla_hours?: number;
}

// ---------------- 4.2 Import & Duplicates ----------------
export interface LeadImportRow {
  lead_name: string;
  primary_phone: string;
  email?: string | null;
  lead_source_id?: string | null;
  campaign_name?: string | null;
  property_type?: string | null;
  preferred_location?: string | null;
  budget_range_min?: number | null;
  budget_range_max?: number | null;
  bedrooms?: number | null;
  preferred_contact_method?: string | null;
  notes?: string | null;
}

export interface LeadImportRequest {
  filename: string;
  source_channel: string;
  rows: LeadImportRow[];
}

export interface LeadImportBatch {
  id: number;
  filename: string;
  source_channel?: string | null;
  total_rows: number;
  success_count: number;
  failed_count: number;
  duplicate_count: number;
  error_log?: string | null;
  imported_at?: string | null;
}

export interface LeadImportPaginatedResponse {
  items: LeadImportBatch[];
  total: number;
  limit: number;
  offset: number;
}

export interface DuplicateCheckResponse {
  is_duplicate: boolean;
  matching_lead_ids: number[];
  matching_leads: Lead[];
}

export interface WebsiteInquiryPayload {
  full_name: string;
  phone_number: string;
  email?: string | null;
  project_code?: string | null;
  interested_project_id?: number | null;
  budget_range_min?: number | null;
  budget_range_max?: number | null;
  preferred_unit_type?: string | null;
  property_type?: string | null;
  bedrooms?: number | null;
  preferred_location?: string | null;
  message?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
}

export interface Nominee {
  id?: number;
  customer_id?: number;
  nominee_name: string;
  relationship: string;
  nid_number?: string | null;
  share_percentage: number;
  photo_url?: string | null;
  // 4.5 enrichment
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nid_front_url?: string | null;
  nid_back_url?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  verification_status?: string | null;
  notes?: string | null;
  verified_by_id?: number | null;
  verified_at?: string | null;
  previous_share_percentage?: number | null;
  share_changed_at?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export type CustomerType = 'INDIVIDUAL' | 'COMPANY' | 'INVESTOR' | 'NRB' | 'OTHER';

export interface Customer {
  id: number;
  customer_code: string;
  full_name_en: string;
  full_name_bn?: string | null;
  father_husband_name?: string | null;
  mother_name?: string | null;
  nid_number?: string | null;
  tin_number?: string | null;
  primary_phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  present_address?: string | null;
  permanent_address?: string | null;
  is_nrb: boolean;
  passport_number?: string | null;
  profile_photo_url?: string | null;
  nid_scan_front_url?: string | null;
  nid_scan_back_url?: string | null;
  // 4.5 enrichment
  customer_type?: CustomerType | null;
  preferred_language?: string | null;
  preferred_contact_method?: string | null;
  relationship_manager_id?: number | null;
  relationship_manager_name?: string | null;
  is_consent_given: boolean;
  is_opted_out: boolean;
  opt_out_at?: string | null;
  opt_out_reason?: string | null;
  merged_into_id?: number | null;
  merged_at?: string | null;
  nominees: Nominee[];
  created_at?: string;
  updated_at?: string | null;
}

export interface CustomerPaginatedResponse {
  items: Customer[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomerDuplicateCheckRequest {
  primary_phone?: string;
  email?: string;
  nid_number?: string;
  exclude_customer_id?: number;
}

export interface CustomerDuplicateCheckResponse {
  is_duplicate: boolean;
  matching_customer_ids: number[];
  matching_customers: Customer[];
}

export interface CustomerMergeRequest {
  source_customer_id: number;
  target_customer_id: number;
  merge_reason?: string;
}

export type ServiceRequestType = 'SERVICE' | 'COMPLAINT';
export type ServiceRequestStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED' | 'CLOSED';

export interface CustomerServiceRequest {
  id: number;
  customer_id: number;
  request_type: ServiceRequestType;
  title: string;
  description?: string | null;
  status: ServiceRequestStatus;
  priority?: string | null;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  related_booking_id?: number | null;
  related_unit_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ServiceRequestPaginatedResponse {
  items: CustomerServiceRequest[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeadConversionMetrics {
  total_leads: number;
  conversion_rate_percentage: number;
  stage_funnel: { [stage: string]: number };
  source_distribution: { [key: string]: number };
  total_verified_customers: number;
}

// ============================================================
// 4.1 CRM Dashboard & Sales KPIs Models
// ============================================================

export interface CrmExecutiveKpis {
  total_leads: number;
  total_leads_target: number;
  total_leads_mom_growth: number;
  qualified_leads: number;
  qualified_leads_percentage: number;
  hot_leads_count: number;
  warm_leads_count: number;
  site_visits_total: number;
  site_visits_scheduled: number;
  site_visits_completed: number;
  site_visits_completion_rate: number;
  bookings_count: number;
  booking_conversion_rate: number;
  booking_total_value_bdt: number;
  first_response_avg_hours: number;
  contact_rate_percentage: number;
  unassigned_leads_count: number;
  overdue_followups_count: number;
}

export interface CrmLeadVelocity {
  today: number;
  this_week: number;
  this_month: number;
  today_growth: number;
  this_week_growth: number;
  this_month_growth: number;
}

export interface CrmProjectDistribution {
  project_id?: number | null;
  project_name: string;
  lead_count: number;
  qualified_count: number;
  site_visits_count: number;
  bookings_count: number;
  conversion_rate: number;
  sales_target_units: number;
  sales_target_achievement_pct: number;
}

export interface CrmSourceDistribution {
  source_id: string;
  source_name: string;
  lead_count: number;
  percentage: number;
  conversion_count: number;
  conversion_rate: number;
}

export interface CrmCampaignPerformance {
  campaign_name: string;
  utm_source: string;
  utm_campaign?: string | null;
  leads_count: number;
  qualified_count: number;
  bookings_count: number;
  conversion_rate: number;
}

export interface CrmSalesRepPerformance {
  sales_rep_id?: number | null;
  sales_rep_name: string;
  email?: string | null;
  assigned_leads: number;
  contacted_count: number;
  contact_rate_pct: number;
  site_visits_completed: number;
  bookings_count: number;
  conversion_rate: number;
  avg_response_hours: number;
}

export interface CrmPipelineFunnelStage {
  stage_key: string;
  stage_label: string;
  count: number;
  drop_off_count: number;
  conversion_rate_from_first: number;
  stage_to_stage_rate: number;
}

export interface CrmLostReasonAnalysis {
  lost_reason: string;
  count: number;
  percentage: number;
  lost_deal_value_bdt: number;
}

export interface CrmBrokerReferralPerformance {
  partner_type: string;
  partner_name: string;
  contact_phone?: string | null;
  leads_referred: number;
  qualified_count: number;
  bookings_count: number;
  total_booked_value_bdt: number;
  commission_accrued_bdt: number;
}

export interface CrmLeadAgeingBracket {
  bracket_label: string;
  count: number;
  percentage: number;
  inactive_count: number;
}

export interface CrmDashboardResponse {
  kpis: CrmExecutiveKpis;
  velocity: CrmLeadVelocity;
  pipeline_funnel: CrmPipelineFunnelStage[];
  by_project: CrmProjectDistribution[];
  by_source: CrmSourceDistribution[];
  by_campaign: CrmCampaignPerformance[];
  by_sales_rep: CrmSalesRepPerformance[];
  lost_reasons: CrmLostReasonAnalysis[];
  broker_referrals: CrmBrokerReferralPerformance[];
  lead_ageing: CrmLeadAgeingBracket[];
  generated_at: string;
}

export interface CrmDrilldownLeadItem {
  id: number;
  lead_code?: string | null;
  lead_name: string;
  primary_phone: string;
  email?: string | null;
  lead_source_id: string;
  lead_stage: string;
  health_grade?: string | null;
  priority: string;
  project_id?: number | null;
  project_name?: string | null;
  assigned_sales_rep_id?: number | null;
  sales_rep_name?: string | null;
  lead_score: number;
  budget_range_max?: number | null;
  first_contacted_at?: string | null;
  created_at?: string | null;
}

export interface CrmDrilldownResponse {
  widget_type: string;
  filter_value?: string | null;
  total: number;
  limit: number;
  offset: number;
  items: CrmDrilldownLeadItem[];
}

// ============================================================
// Spec 4.6: Customer Requirements & Budget Tracking
// ============================================================

export interface CustomerRequirement {
  id: number;
  requirement_code: string;
  customer_id: number;
  title: string;
  preferred_project_id?: number | null;
  preferred_location?: string | null;
  property_type?: string | null;
  budget_min_bdt?: number | null;
  budget_max_bdt?: number | null;
  area_min_sqft?: number | null;
  area_max_sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  preferred_floor?: string | null;
  preferred_facing?: string | null;
  parking_required: boolean;
  parking_count: number;
  purchase_timeline?: string | null;
  payment_preference?: string | null;
  amenities_required?: string | null;
  special_notes?: string | null;
  assigned_sales_rep_id?: number | null;
  status: string;
  customer_name?: string | null;
  customer_code?: string | null;
  customer_phone?: string | null;
  project_name?: string | null;
  sales_rep_name?: string | null;
  matched_units_count: number;
  last_matched_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CustomerRequirementCreate {
  customer_id: number;
  title: string;
  preferred_project_id?: number | null;
  preferred_location?: string | null;
  property_type?: string | null;
  budget_min_bdt?: number | null;
  budget_max_bdt?: number | null;
  area_min_sqft?: number | null;
  area_max_sqft?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  preferred_floor?: string | null;
  preferred_facing?: string | null;
  parking_required?: boolean;
  parking_count?: number;
  purchase_timeline?: string | null;
  payment_preference?: string | null;
  amenities_required?: string | null;
  special_notes?: string | null;
  assigned_sales_rep_id?: number | null;
  status?: string | null;
}

export interface CustomerRequirementUpdate extends Partial<CustomerRequirementCreate> {
  change_reason?: string | null;
}

export interface CustomerRequirementPaginatedResponse {
  items: CustomerRequirement[];
  total: number;
  limit: number;
  offset: number;
}

export interface RequirementAuditLog {
  id: number;
  requirement_id: number;
  change_summary: string;
  changed_by_name?: string | null;
  old_values_json?: string | null;
  new_values_json?: string | null;
  created_at?: string | null;
}

export interface InventoryMatchUnit {
  unit_id: number;
  unit_number: string;
  project_id: number;
  project_name: string;
  location?: string | null;
  tower_name?: string | null;
  floor_number: number;
  facing_id: string;
  unit_type_id: string;
  bed_count: number;
  bath_count: number;
  gross_saleable_area_sqft: number;
  total_unit_price: number;
  status_id: string;
  match_score_percentage: number;
  match_breakdown: {
    budget_score: number;
    area_score: number;
    bedroom_score: number;
    floor_facing_score: number;
    project_location_score: number;
  };
  is_already_recommended: boolean;
  recommendation_id?: number | null;
  recommendation_status?: string | null;
}

export interface InventoryRecommendation {
  id: number;
  requirement_id: number;
  unit_id: number;
  unit_number: string;
  project_name: string;
  floor_number: number;
  facing_id: string;
  bed_count: number;
  bath_count: number;
  gross_saleable_area_sqft: number;
  total_unit_price: number;
  match_score_percentage: number;
  status: string; // RECOMMENDED, SHORTLISTED, SITE_VISITED, ACCEPTED, REJECTED
  rejection_reason?: string | null;
  rejection_notes?: string | null;
  recommended_by_name?: string | null;
  recommended_at?: string | null;
  feedback_at?: string | null;
}

export interface InventoryAlert {
  id: number;
  requirement_id: number;
  requirement_code: string;
  customer_name: string;
  unit_id: number;
  unit_number: string;
  project_name: string;
  alert_title: string;
  alert_message: string;
  is_read: boolean;
  created_at?: string | null;
}

// ============================================================
// Spec 4.10: Broker and Referral Management Models
// ============================================================

export interface Broker {
  id: number;
  broker_code: string;
  broker_name: string;
  broker_type: string;
  contact_person?: string | null;
  primary_phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  office_address?: string | null;
  service_area?: string | null;
  preferred_projects_json?: string | null;

  referral_code?: string | null;
  referral_link?: string | null;

  license_number?: string | null;
  tin_number?: string | null;
  bin_vat_number?: string | null;
  agreement_number?: string | null;
  agreement_signed_date?: string | null;
  agreement_valid_from?: string | null;
  agreement_valid_to?: string | null;

  commission_type: string;
  commission_rate: number;
  eligibility_conditions?: string | null;
  required_milestone: string;

  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  routing_number?: string | null;
  mobile_wallet_number?: string | null;

  trade_license_url?: string | null;
  tin_cert_url?: string | null;
  agreement_doc_url?: string | null;
  status: string;

  total_leads_count: number;
  total_bookings_count: number;
  total_sales_value: number;
  total_commission_earned: number;
  total_commission_paid: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface BrokerCreate {
  broker_name: string;
  broker_type: string;
  contact_person?: string | null;
  primary_phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  office_address?: string | null;
  service_area?: string | null;
  preferred_projects_json?: string | null;
  referral_code?: string | null;
  referral_link?: string | null;
  license_number?: string | null;
  tin_number?: string | null;
  bin_vat_number?: string | null;
  agreement_number?: string | null;
  agreement_signed_date?: string | null;
  agreement_valid_from?: string | null;
  agreement_valid_to?: string | null;
  commission_type: string;
  commission_rate: number;
  eligibility_conditions?: string | null;
  required_milestone: string;
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  routing_number?: string | null;
  mobile_wallet_number?: string | null;
  trade_license_url?: string | null;
  tin_cert_url?: string | null;
  agreement_doc_url?: string | null;
  status: string;
}

export interface BrokerUpdate extends Partial<BrokerCreate> {}

export interface BrokerPaginatedResponse {
  items: Broker[];
  total: number;
  page: number;
  limit: number;
}

export interface BrokerStatsSummary {
  total_brokers: number;
  active_brokers: number;
  total_leads_referred: int_number;
  total_bookings_referred: number;
  total_sales_value: number;
  total_commission_earned: number;
  total_commission_paid: number;
  pending_commission_payout: number;
}
type int_number = number;

export interface CommissionClaim {
  id: number;
  claim_code: string;
  broker_id: number;
  lead_id?: number | null;
  customer_id?: number | null;
  booking_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;

  referral_date: string;
  source_evidence?: string | null;
  unit_sale_value: number;
  commission_rate_percentage: number;
  calculated_commission_amount: number;
  tds_tax_deduction_amount: number;
  net_payable_amount: number;

  milestone_achieved: string;
  claim_status: string;
  notes?: string | null;

  is_milestone_verified: boolean;
  milestone_verified_at?: string | null;
  milestone_verified_by_id?: number | null;

  sales_approval_by_id?: number | null;
  sales_approved_at?: string | null;
  finance_approval_by_id?: number | null;
  finance_approved_at?: string | null;
  disbursement_reference?: string | null;
  disbursed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  broker_name?: string | null;
  broker_code?: string | null;
  lead_name?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
}

export interface CommissionClaimCreate {
  broker_id: number;
  lead_id?: number | null;
  customer_id?: number | null;
  booking_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  referral_date: string;
  source_evidence?: string | null;
  unit_sale_value: number;
  commission_rate_percentage: number;
  calculated_commission_amount: number;
  tds_tax_deduction_amount: number;
  net_payable_amount: number;
  milestone_achieved: string;
  claim_status?: string;
  notes?: string | null;
}

export interface CommissionClaimUpdate extends Partial<CommissionClaimCreate> {}

export interface CommissionClaimApproval {
  decision: 'APPROVE_SALES' | 'APPROVE_FINANCE' | 'REJECT';
  rejection_reason?: string | null;
  notes?: string | null;
}

export interface CommissionClaimDisburse {
  disbursement_reference: string;
  notes?: string | null;
}

export interface CommissionClaimPaginatedResponse {
  items: CommissionClaim[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Spec 4.11: Sales Funnel and Lead Conversion Models
// ============================================================

export interface FunnelStage {
  id: number;
  stage_code: string;
  stage_name: string;
  stage_order: number;
  description?: string | null;
  entry_criteria?: string | null;
  exit_criteria?: string | null;
  target_dwell_days: number;
  color_code: string;
  is_system_stage: boolean;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FunnelStageCreate {
  stage_code: string;
  stage_name: string;
  stage_order: number;
  description?: string | null;
  entry_criteria?: string | null;
  exit_criteria?: string | null;
  target_dwell_days: number;
  color_code: string;
  is_active: boolean;
}

export interface FunnelStageUpdate extends Partial<FunnelStageCreate> {}

export interface LeadStageTransition {
  id: number;
  lead_id: number;
  from_stage?: string | null;
  to_stage: string;
  transition_date?: string | null;
  dwell_time_hours: number;
  transition_notes?: string | null;
  transitioned_by_id?: number | null;
  transitioned_by_name?: string | null;
}

export interface LeadStageTransitionCreate {
  to_stage: string;
  transition_notes?: string | null;
}

export interface LeadDisqualifyRequest {
  lost_reason: string;
  notes?: string | null;
}

export interface LeadReopenRequest {
  reopen_notes: string;
  target_stage?: string;
}

export interface Opportunity {
  id: number;
  opportunity_code: string;
  title: string;
  lead_id?: number | null;
  customer_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  stage: string;
  estimated_deal_value: number;
  confidence_probability_pct: number;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  assigned_sales_rep_id?: number | null;
  loss_reason?: string | null;
  loss_notes?: string | null;
  is_reopened: boolean;
  reopened_at?: string | null;
  reopened_by_id?: number | null;
  reopen_notes?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  lead_name?: string | null;
  lead_phone?: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  sales_rep_name?: string | null;
}

export interface OpportunityCreate {
  title: string;
  lead_id?: number | null;
  customer_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  stage?: string;
  estimated_deal_value: number;
  confidence_probability_pct: number;
  expected_close_date?: string | null;
  actual_close_date?: string | null;
  assigned_sales_rep_id?: number | null;
  notes?: string | null;
}

export interface OpportunityUpdate extends Partial<OpportunityCreate> {
  loss_reason?: string | null;
  loss_notes?: string | null;
}

export interface OpportunityPaginatedResponse {
  items: Opportunity[];
  total: number;
  page: number;
  limit: number;
}

export interface BookingHandover {
  id: number;
  handover_code: string;
  opportunity_id?: number | null;
  lead_id?: number | null;
  customer_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;

  // Step 1: Customer Contact
  customer_verified?: boolean;
  verified_phone?: string | null;
  verified_email?: string | null;

  // Step 2 & 3: Unit Selection & Availability
  unit_number?: string | null;
  parking_slot?: string | null;
  unit_size_sqft?: number | null;
  unit_availability_verified?: boolean;
  approved_base_rate?: number | null;

  // Step 4: Pricing & Discount Request
  list_price?: number;
  proposed_price?: number;
  agreed_price: number;
  discount_amount_requested?: number;
  discount_percentage?: number;
  discount_approval_reference?: string | null;
  discount_status?: string | null;

  // Step 5: Identification & KYC
  nid_passport_verified?: boolean;
  tin_certificate_verified?: boolean;
  nominee_verified?: boolean;
  power_of_attorney_verified?: boolean;
  kyc_notes?: string | null;

  // Step 6 & 7: References & Status
  reservation_code?: string | null;
  booking_reference_number?: string | null;
  status: string;

  // Step 8: Attribution
  broker_id?: number | null;
  broker_code?: string | null;
  broker_commission_rate?: number | null;
  campaign_id?: number | null;
  utm_source?: string | null;
  utm_campaign?: string | null;

  // Step 9: Payment Terms
  booking_money_amount: number;
  payment_plan_preference?: string | null;
  token_money_payment_mode?: string | null;
  token_transaction_ref?: string | null;
  token_bank_name?: string | null;
  token_received_date?: string | null;
  payment_schedule_triggered?: boolean;

  // Step 10: Special Conditions & Notes
  special_conditions?: string | null;
  handover_notes?: string | null;
  crm_history_snapshot?: string | null;

  sales_rep_id?: number | null;
  accepted_by_ops_id?: number | null;
  accepted_at?: string | null;
  sales_booking_id?: number | null;
  rejection_reason?: string | null;
  transferred_to_sales_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  opportunity_code?: string | null;
  lead_name?: string | null;
  customer_name?: string | null;
  customer_code?: string | null;
  project_name?: string | null;
  sales_rep_name?: string | null;
  accepted_by_ops_name?: string | null;
  broker_name?: string | null;
  campaign_name?: string | null;
}

export interface BookingHandoverCreate {
  opportunity_id?: number | null;
  lead_id?: number | null;
  customer_id?: number | null;
  project_id?: number | null;
  unit_id?: number | null;
  customer_verified?: boolean;
  verified_phone?: string;
  verified_email?: string;
  unit_number?: string;
  parking_slot?: string;
  unit_size_sqft?: number;
  unit_availability_verified?: boolean;
  approved_base_rate?: number;
  list_price?: number;
  proposed_price?: number;
  agreed_price: number;
  discount_amount_requested?: number;
  discount_percentage?: number;
  discount_approval_reference?: string;
  discount_status?: string;
  nid_passport_verified?: boolean;
  tin_certificate_verified?: boolean;
  nominee_verified?: boolean;
  power_of_attorney_verified?: boolean;
  kyc_notes?: string;
  broker_id?: number;
  broker_code?: string;
  broker_commission_rate?: number;
  campaign_id?: number;
  utm_source?: string;
  utm_campaign?: string;
  booking_money_amount: number;
  payment_plan_preference?: string;
  token_money_payment_mode?: string;
  token_transaction_ref?: string;
  token_bank_name?: string;
  token_received_date?: string;
  special_conditions?: string | null;
  handover_notes?: string | null;
}

export interface BookingHandoverUpdate extends Partial<BookingHandoverCreate> {}

export interface BookingHandoverVerificationUpdate {
  customer_verified: boolean;
  verified_phone?: string;
  verified_email?: string;
  unit_availability_verified: boolean;
  nid_passport_verified: boolean;
  tin_certificate_verified: boolean;
  nominee_verified: boolean;
  power_of_attorney_verified: boolean;
  kyc_notes?: string;
  discount_status?: string;
}

export interface BookingHandoverReview {
  decision: 'ACCEPT' | 'REJECT';
  rejection_reason?: string | null;
  sales_booking_id?: number | null;
  reservation_code?: string | null;
  booking_reference_number?: string | null;
}

export interface BookingHandoverPaginatedResponse {
  items: BookingHandover[];
  total: number;
  page: number;
  limit: number;
}

export interface FunnelStageMetric {
  stage_code: string;
  stage_name: string;
  stage_order: number;
  color_code: string;
  lead_count: number;
  conversion_rate_from_first: number;
  stage_to_stage_rate: number;
  avg_dwell_hours: number;
  drop_off_count: number;
}

export interface FunnelCohortBreakdown {
  dimension_key: string;
  dimension_label: string;
  total_leads: number;
  qualified_leads: number;
  site_visits_count: number;
  bookings_count: number;
  lead_to_booking_rate: number;
  site_visit_conversion_rate: number;
}

export interface ConversionKpiResponse {
  cohort_period: string;
  total_unique_leads: number;
  eligible_unique_leads: number;
  total_valid_bookings: number;
  lead_to_booking_rate: number;
  site_visits_completed: number;
  bookings_from_site_visits: number;
  site_visit_conversion_rate: number;
  stages: FunnelStageMetric[];
  by_source: FunnelCohortBreakdown[];
  by_sales_rep: FunnelCohortBreakdown[];
  by_project: FunnelCohortBreakdown[];
  generated_at: string;
}

// -------------------------------------------------------------
// Spec 4.13: Campaign & Marketing Management Interfaces
// -------------------------------------------------------------
export interface Campaign {
  id: number;
  campaign_code: string;
  name: string;
  channel: string; // CRM_CAMPAIGN_CHANNEL
  project_id?: number | null;
  target_audience?: string | null;
  allocated_budget: number;
  actual_spend: number;
  target_leads: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  tracking_url?: string | null;
  landing_page_slug?: string | null;
  campaign_lead_route_rep_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string; // CRM_CAMPAIGN_STATUS
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;

  // Joined & Calculated Fields
  project_name?: string | null;
  lead_route_rep_name?: string | null;
  leads_count: number;
  qualified_count: number;
  bookings_count: number;
  cpl: number;
  cpql: number;
  conversion_rate: number;
  attributed_revenue: number;
}

export interface CampaignCreate {
  name: string;
  channel: string;
  project_id?: number | null;
  target_audience?: string | null;
  allocated_budget: number;
  actual_spend?: number;
  target_leads?: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  tracking_url?: string | null;
  landing_page_slug?: string | null;
  campaign_lead_route_rep_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  notes?: string | null;
}

export interface CampaignUpdate extends Partial<CampaignCreate> {}

export interface CampaignPaginatedResponse {
  items: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export interface MarketingTouchpoint {
  id: number;
  lead_id: number;
  campaign_id?: number | null;
  touchpoint_type: string; // CRM_TOUCHPOINT_TYPE
  channel: string;
  interaction_summary?: string | null;
  recorded_at?: string | null;
  lead_name?: string | null;
  campaign_name?: string | null;
  campaign_code?: string | null;
}

export interface MarketingTouchpointCreate {
  lead_id: number;
  campaign_id?: number | null;
  touchpoint_type: string;
  channel: string;
  interaction_summary?: string | null;
}

export interface SuppressionEntry {
  id: number;
  phone?: string | null;
  email?: string | null;
  customer_name?: string | null;
  suppression_reason: string; // CRM_SUPPRESSION_REASON
  source_note?: string | null;
  is_active: boolean;
  consent_given_at?: string | null;
  consent_revoked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SuppressionEntryCreate {
  phone?: string | null;
  email?: string | null;
  customer_name?: string | null;
  suppression_reason: string;
  source_note?: string | null;
}

export interface SuppressionPaginatedResponse {
  items: SuppressionEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface CampaignMarketingDashboardKpis {
  total_campaigns: number;
  active_campaigns: number;
  total_budget_allocated: number;
  total_actual_spend: number;
  total_leads_generated: number;
  total_qualified_leads: number;
  total_bookings_won: number;
  overall_cpl: number;
  overall_cpql: number;
  overall_lead_to_booking_rate: number;
  total_attributed_revenue: number;
  top_channel_by_leads: string;
  top_channel_by_revenue: string;
}

export interface OfflineExhibitionLeadItem {
  lead_name: string;
  primary_phone: string;
  email?: string | null;
  interested_project_id?: number | null;
  budget_range_max?: number | null;
  notes?: string | null;
}

export interface OfflineExhibitionImportPayload {
  campaign_id: number;
  channel?: string;
  leads: OfflineExhibitionLeadItem[];
}





