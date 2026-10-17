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

export interface LandKhatian {
  id: number;
  land_bank_id: number;
  khatian_type: 'CS' | 'SA' | 'RS' | 'BS' | 'MUTATION';
  khatian_number: string;
  recorded_tenant_name: string;
  case_or_jote_no?: string;
  remarks?: string;
  created_at?: string;
}

export interface LandDag {
  id: number;
  land_bank_id: number;
  khatian_id?: number;
  dag_number: string;
  land_class: string; // NAL, BHITI, CHALA, DOBA, COMMERCIAL, RESIDENTIAL
  area_decimal: number;
  area_katha: number;
  area_bigha: number;
  area_sqft: number;
  possession_status: 'FULL_POSSESSION' | 'PARTIAL_DISPUTE' | 'UNDER_ENCROACHMENT';
  remarks?: string;
  created_at?: string;
}

export interface LandDeedDocument {
  id: number;
  land_bank_id: number;
  doc_type: 'DEED_BAYA' | 'MUTATION_PARCHA' | 'DCR_RECEIPT' | 'KHAJNA_TAX' | 'POA_DEED';
  doc_number: string;
  issuing_office: string;
  execution_date: string;
  expiry_date?: string;
  is_expired: boolean;
  file_url?: string;
  verification_status: 'VERIFIED' | 'PENDING_SEARCH' | 'OBJECTION';
  notes?: string;
  created_at?: string;
}

export interface LandDocumentExpiryAlert {
  id: number;
  doc_number: string;
  doc_type: string;
  parcel_title: string;
  mouza: string;
  expiry_date: string;
  days_remaining: number;
  alert_severity: 'DANGER' | 'WARNING' | 'INFO';
  status_message: string;
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
  id?: number;
  jv_agreement_id?: number;
  tower_name: string;
  floor_number: number;
  unit_number: string;
  unit_identifier: string;
  unit_type: 'APARTMENT' | 'COMMERCIAL' | 'PARKING_BAY';
  allocation_type: 'LANDOWNER_UNIT' | 'DEVELOPER_UNIT';
  is_locked_for_sales: boolean;
  gross_sft: number;
  parking_slot_number?: string;
  allocation_notes?: string;
  created_at?: string;
}

export interface LandJVMilestonePayment {
  id?: number;
  jv_agreement_id?: number;
  milestone_name: string;
  due_date: string;
  amount_bdt: number;
  payment_status: 'PENDING' | 'PAID' | 'ADJUSTED_AGAINST_SHARE';
  paid_date?: string;
  voucher_ref?: string;
  notes?: string;
  created_at?: string;
}

export interface JVAgreement {
  id: number;
  land_bank_id: number;
  agreement_deed_no: string;
  landowner_share_percent: number;
  developer_share_percent: number;
  signing_money_total: number;
  signing_money_paid?: number;
  tenure_months: number;
  poa_deed_number?: string;
  poa_execution_date?: string;
  poa_expiry_date?: string;
  poa_verified?: boolean;
  signing_date?: string;
  handover_commitment_date?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
  unit_allocations: JVUnitAllocation[];
  milestones?: LandJVMilestonePayment[];
  created_at?: string;
}

export interface JVAutoAllocationRequest {
  jv_agreement_id: number;
  total_floors: number;
  units_per_floor: number;
  unit_gross_sft: number;
  allocation_strategy: 'ALTERNATE_FLOORS' | 'ODD_EVEN_UNITS' | 'UPPER_LOWER_SPLIT';
}

export interface JVAutoAllocationResponse {
  jv_agreement_id: number;
  total_units_generated: number;
  landowner_units_count: number;
  developer_units_count: number;
  landowner_total_sft: number;
  developer_total_sft: number;
  allocated_units: JVUnitAllocation[];
}

export interface LandBank {
  id: number;
  project_code: string;
  proposal_title: string;
  mouza_name: string;
  jl_number: string;
  upazila_thana?: string;
  district?: string;
  sub_registry_office?: string;
  total_area_katha: number;
  total_area_decimal: number;
  total_area_bigha?: number;
  total_area_sqft: number;
  deal_type: 'JOINT_VENTURE' | 'OUTRIGHT_PURCHASE' | 'REVENUE_SHARE';
  status: 'DRAFT_PROPOSAL' | 'LEGAL_VETTING' | 'SURVEY_IN_PROGRESS' | 'JV_SIGNED' | 'ACQUIRED' | 'REJECTED';
  location_description?: string;
  landowners?: Landowner[];
  survey_records?: SurveyRecord[];
  jv_agreements?: JVAgreement[];
  khatians?: LandKhatian[];
  dags?: LandDag[];
  documents?: LandDeedDocument[];
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

