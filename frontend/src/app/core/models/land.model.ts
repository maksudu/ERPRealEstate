export interface Landowner {
  id: number;
  land_bank_id: number;
  owner_type: 'INDIVIDUAL' | 'COMPANY' | 'HEIR_INHERITANCE';
  full_name_en: string;
  full_name_bn?: string;
  nid_number?: string;
  tin_number?: string;
  phone_number?: string;
  ownership_share_ratio: number;
  bank_details?: Record<string, any>;
  created_at?: string;
}

export interface SurveyRecord {
  id: number;
  land_bank_id: number;
  survey_type_id: string; // CS, SA, RS, BS, MUTATION
  khatian_number: string;
  recorded_tenant_name: string;
  dag_number: string;
  recorded_area_decimal: number;
  recorded_area_katha: number;
  remarks?: string;
  created_at?: string;
}

export interface JVUnitAllocation {
  id: number;
  jv_agreement_id: number;
  unit_identifier: string;
  allocation_type: 'LANDOWNER_UNIT' | 'DEVELOPER_UNIT';
  is_locked_for_sales: boolean;
  allocation_notes?: string;
}

export interface JVAgreement {
  id: number;
  land_bank_id: number;
  agreement_deed_no: string;
  landowner_share_percent: number;
  developer_share_percent: number;
  signing_money_total: number;
  tenure_months: number;
  signing_date?: string;
  handover_commitment_date?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  unit_allocations: JVUnitAllocation[];
  created_at?: string;
}

export interface LandBank {
  id: number;
  project_code: string;
  proposal_title: string;
  mouza_name: string;
  jl_number: string;
  total_area_katha: number;
  total_area_decimal: number;
  total_area_sqft: number;
  deal_type: 'JOINT_VENTURE' | 'OUTRIGHT_PURCHASE' | 'REVENUE_SHARE';
  status: 'DRAFT_PROPOSAL' | 'LEGAL_VETTING' | 'SURVEY_IN_PROGRESS' | 'JV_SIGNED' | 'ACQUIRED' | 'REJECTED';
  location_description?: string;
  landowners?: Landowner[];
  survey_records?: SurveyRecord[];
  jv_agreements?: JVAgreement[];
  created_at?: string;
  updated_at?: string;
}

export interface DeedChainVerification {
  land_bank_id: number;
  project_code: string;
  proposal_title: string;
  mouza_name: string;
  jl_number: string;
  has_cs: boolean;
  has_sa: boolean;
  has_rs: boolean;
  has_bs: boolean;
  survey_sequence_verified: boolean;
  total_survey_area_decimal: number;
  total_survey_area_katha: number;
  total_land_bank_area_katha: number;
  area_variance_percentage: number;
  surveys: SurveyRecord[];
  landowners: Landowner[];
  verification_status: 'VERIFIED' | 'PARTIAL' | 'MISSING_HISTORIC_LINK';
  remarks: string;
}

export interface AreaConversionResult {
  sqft: number;
  katha: number;
  decimal: number;
  bigha: number;
  acre: number;
}
