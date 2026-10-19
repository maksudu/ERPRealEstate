export interface LeadActivity {
  id: number;
  lead_id: number;
  sales_rep_id?: number | null;
  activity_type: string; // PHONE_CALL, SITE_VISIT, WHATSAPP, OFFICE_MEETING, STAGE_CHANGE, EMAIL
  activity_summary: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  outcome?: string | null;
  created_at?: string;
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
  | 'DROPPED';

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

