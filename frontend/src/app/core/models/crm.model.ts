export interface LeadActivity {
  id: number;
  lead_id: number;
  sales_rep_id?: number | null;
  activity_type: string; // PHONE_CALL, SITE_VISIT, WHATSAPP, OFFICE_MEETING, STAGE_CHANGE
  activity_summary: string;
  scheduled_at?: string | null;
  completed_at?: string | null;
  outcome?: string | null;
  created_at?: string;
}

export type PipelineStage =
  | 'NEW'
  | 'CONTACTED'
  | 'SITE_VISIT_SCHEDULED'
  | 'SITE_VISIT_COMPLETED'
  | 'NEGOTIATION'
  | 'TOKEN_BOOKED'
  | 'LOST'
  | 'VISITED'
  | 'BOOKED'
  | 'DROPPED';

export interface Lead {
  id: number;
  organization_id?: number | null;
  lead_source_id: string; // FACEBOOK_ADS, WEB_FORM, WHATSAPP, WALK_IN, BROKER, REFERRAL
  campaign_name?: string | null;
  lead_name: string;
  primary_phone: string;
  email?: string | null;
  interested_project_id?: number | null;
  interested_project_name?: string | null;
  budget_range_min?: number | null;
  budget_range_max?: number | null;
  assigned_sales_rep_id?: number | null;
  assigned_sales_rep_name?: string | null;
  lead_stage: PipelineStage;
  lead_score: number; // 0 to 100
  notes?: string | null;
  activities: LeadActivity[];
  created_at?: string;
}

export interface LeadScoreBreakdown {
  lead_id: number;
  lead_name: string;
  total_score: number;
  budget_fit_score: number;
  contact_completeness_score: number;
  source_quality_score: number;
  engagement_progression_score: number;
  lead_stage: string;
  health_grade: 'A_HOT' | 'B_WARM' | 'C_COLD';
  recommended_action: string;
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
  message?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
}

export interface Nominee {
  id?: number;
  customer_id?: number;
  nominee_name: string;
  relationship: string; // SPOUSE, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER
  nid_number?: string | null;
  share_percentage: number;
  photo_url?: string | null;
  created_at?: string;
}

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
  email?: string | null;
  present_address?: string | null;
  permanent_address?: string | null;
  is_nrb: boolean;
  passport_number?: string | null;
  profile_photo_url?: string | null;
  nid_scan_front_url?: string | null;
  nid_scan_back_url?: string | null;
  nominees: Nominee[];
  created_at?: string;
}

export interface LeadConversionMetrics {
  total_leads: number;
  conversion_rate_percentage: number;
  stage_funnel: { [stage: string]: number };
  source_distribution: { [key: string]: number };
  total_verified_customers: number;
}
