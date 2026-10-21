export interface Landowner {
  id: number;
  landowner_code: string;
  land_bank_id?: number;
  owner_type: 'INDIVIDUAL' | 'JOINT_OWNER' | 'COMPANY' | 'POA_HOLDER';
  full_name_en: string;
  full_name_bn?: string;
  father_mother_spouse_name?: string;  // legacy
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  present_address?: string;
  permanent_address?: string;
  nid_number?: string;
  nid_image_path?: string;
  passport_number?: string;
  company_reg_number?: string;
  tin_number?: string;
  phone_number?: string;
  email?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  ownership_share_ratio: number;
  ownership_nature: 'INHERITED' | 'PURCHASED' | 'GIFT_HEBA' | 'COURT_DECREE';
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account_no?: string | null;
  bank_routing_no?: string | null;
  bank_account_holder?: string | null;
  bank_details?: Record<string, any> | null;
  nominee_details?: Array<Record<string, any>> | null;
  poa_details?: Record<string, any> | null;
  supporting_documents?: Array<Record<string, any>> | null;
  negotiation_notes?: Array<{
    timestamp: string;
    date: string;
    interaction_type: string;
    note: string;
    conducted_by?: string;
  }> | null;
  status: 'PROSPECT' | 'UNDER_VERIFICATION' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED';
  linked_parcels_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LandownerDuplicateCheckRequest {
  nid_number?: string;
  phone_number?: string;
  tin_number?: string;
  company_reg_number?: string;
  exclude_id?: number;
}

export interface LandownerDuplicateCheckResponse {
  has_duplicate: boolean;
  matched_by?: string;
  matches: Landowner[];
}

export interface LandownerNegotiationNoteRequest {
  note: string;
  interaction_type: 'MEETING' | 'PHONE_CALL' | 'SITE_VISIT' | 'LEGAL_DISCUSSION';
  interaction_date?: string;
  conducted_by?: string;
}

export interface LandParcel {
  id: number;
  parcel_id: string;
  land_bank_id?: number | null;
  project_id?: number | null;
  project_name: string;
  division: string;
  district: string;
  upazila_thana: string;
  mouza_name: string;
  jl_number: string;
  khatian_number: string;
  dag_number: string;
  land_classification: 'RESIDENTIAL' | 'COMMERCIAL' | 'AGRICULTURAL' | 'OTHER';
  total_area_decimal: number;
  total_area_katha: number;
  total_area_bigha: number;
  total_area_sqft: number;
  acquisition_status: 'PROPOSED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACQUIRED';
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  boundary_north?: string | null;
  boundary_south?: string | null;
  boundary_east?: string | null;
  boundary_west?: string | null;
  road_access_width_ft: number;
  deed_number?: string | null;
  deed_date?: string | null;
  source_record_info?: Record<string, any> | null;
  gis_polygon_data?: Record<string, any> | null;
  remarks?: string | null;
  linked_owners_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LandownerParcelLink {
  id: number;
  landowner_id: number;
  parcel_id: number;
  ownership_share_percent: number;
  ownership_source: 'PURCHASE' | 'INHERITANCE' | 'PARTITION_DEED' | 'GIFT_HEBA' | 'COURT_DECREE' | 'TRANSFER' | string;
  equivalent_area_decimal: number;
  equivalent_area_katha: number;
  equivalent_area_sqft: number;
  proposed_sale_price_bdt: number;
  development_share_percent: number;
  consent_status: 'CONSENT_GRANTED' | 'CONSENT_PENDING' | 'DISPUTED' | 'REFUSED' | 'LEGAL_NOTICE' | string;
  has_poa: boolean;
  poa_holder_name?: string;
  witness_details?: any;
  dispute_remarks?: string;
  is_share_verified: boolean;
  title_deed_no?: string;
  status: string;
  landowner?: Landowner;
  parcel?: LandParcel;
  created_at?: string;
  updated_at?: string;
}

export interface JointOwnershipShareSummary {
  parcel_id: number;
  project_name: string;
  total_area_decimal: number;
  total_area_katha: number;
  total_area_sqft: number;
  total_owners_count: number;
  total_recorded_share_percent: number;
  unallocated_share_percent: number;
  is_fully_accounted_100: boolean;
  has_disputed_ownership: boolean;
  unresolved_owners_count: number;
  co_owners: LandownerParcelLink[];
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
  land_class: string;
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
  land_bank_id?: number;
  parcel_id?: number;
  landowner_id?: number;
  doc_title?: string;
  document_category?: string;
  doc_type: string;
  doc_number: string;
  reference_number?: string;
  issuing_office: string;
  execution_date: string;
  expiry_date?: string;
  is_expired: boolean;
  file_url?: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  document_version?: string;
  verification_status: 'PENDING' | 'RECEIVED' | 'UNDER_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | string;
  verification_officer?: string;
  verification_date?: string;
  verification_remarks?: string;
  is_independently_verified?: boolean;
  ocr_extracted_data?: Record<string, any>;
  ocr_status?: 'NONE' | 'PENDING' | 'EXTRACTED' | 'VERIFIED_CORRECT' | 'FAILED' | string;
  access_security_level?: 'PUBLIC' | 'CONFIDENTIAL' | 'RESTRICTED_LEGAL' | 'DIRECTOR_ONLY' | string;
  renewal_reminder_days?: number;
  notes?: string;
  days_until_expiry?: number;
  registration_date?: string;
  sub_registrar_volume_no?: string;
  sub_registrar_page_no?: string;
  sub_registrar_book_no?: string;
  mutation_case_no?: string;
  mutation_khatian_no?: string;
  dcr_number?: string;
  tax_dakhila_no?: string;
  tax_paid_up_to_year?: string;
  survey_type?: string;
  mouza_sheet_no?: string;
  is_certified_copy?: boolean;
  review_comments?: Array<{ date: string; reviewer: string; comment: string; status: string }>;
  audit_trail?: Array<{ timestamp: string; user: string; action: string; details: string }>;
  parcel?: LandParcel;
  landowner?: Landowner;
  created_at?: string;
  updated_at?: string;
}

export interface DocumentVerifyRequest {
  verification_status: 'PENDING' | 'RECEIVED' | 'UNDER_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | string;
  verification_officer: string;
  verification_remarks?: string;
  is_independently_verified: boolean;
}

export interface DocumentChecklistItem {
  category_code: string;
  category_title: string;
  is_mandatory: boolean;
  is_present: boolean;
  is_verified: boolean;
  document_id?: number;
  document_title?: string;
  status: string;
}

export interface DocumentChecklistResponse {
  parcel_id: number;
  parcel_code: string;
  project_name: string;
  total_documents_count: number;
  verified_documents_count: number;
  is_approval_ready: boolean;
  missing_mandatory_categories: string[];
  items: DocumentChecklistItem[];
}

export interface MeasurementConvention {
  id: number;
  convention_code: string;
  convention_name: string;
  region_district: string;
  katha_to_sqft: number;
  decimal_to_sqft: number;
  bigha_to_katha: number;
  acre_to_decimal: number;
  kani_to_sqft?: number | null;
  gonda_to_sqft?: number | null;
  is_default: boolean;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MeasurementConventionPayload {
  convention_code: string;
  convention_name: string;
  region_district: string;
  katha_to_sqft: number;
  decimal_to_sqft: number;
  bigha_to_katha: number;
  acre_to_decimal: number;
  kani_to_sqft?: number | null;
  gonda_to_sqft?: number | null;
  is_default: boolean;
  notes?: string | null;
}

export interface RegionalConversionRequest {
  convention_id?: number;
  convention_code?: string;
  input_unit: 'SQFT' | 'SQM' | 'DECIMAL' | 'KATHA' | 'BIGHA' | 'ACRE' | 'KANI' | 'GONDA' | string;
  input_value: number;
  original_registered_unit?: string;
  original_registered_value?: number;
}

export interface RegionalConversionResponse {
  convention_used: string;
  region: string;
  original_deed_record: {
    registered_unit: string;
    registered_value: number;
    preserved_statutory_text: string;
  };
  converted_units: {
    sqft: number;
    sqm: number;
    decimal: number;
    katha: number;
    bigha: number;
    acre: number;
    kani?: number;
    gonda?: number;
  };
  conversion_factors: Record<string, number>;
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
  survey_type_id: string;
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
  unit_type: 'APARTMENT' | 'COMMERCIAL' | 'SHOP' | 'PARKING_BAY' | string;
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
  land_bank_id?: number;
  parcel_id?: number;
  agreement_deed_no: string;
  agreement_type?: 'JOINT_VENTURE_DEVELOPMENT' | 'OUTRIGHT_PURCHASE_AGREEMENT' | 'POWER_OF_ATTORNEY_AGREEMENT' | 'SUPPLEMENTARY_AMENDMENT' | 'PARTITION_SETTLEMENT' | string;
  registration_deed_no?: string;
  registration_office?: string;
  registration_date?: string;
  witness_count?: number;
  landowner_share_percent: number;
  developer_share_percent: number;
  signing_money_total: number;
  signing_money_paid?: number;
  tenure_months: number;
  allocated_flats_count?: number;
  allocated_shops_count?: number;
  allocated_car_parks_count?: number;
  allocated_cash_bdt?: number;
  obligations_developer?: string;
  obligations_landowner?: string;
  special_conditions?: string;
  amendment_number?: number;
  termination_conditions?: string;
  missing_consents_flag?: boolean;
  poa_deed_number?: string;
  poa_execution_date?: string;
  poa_expiry_date?: string;
  poa_verified?: boolean;
  signing_date?: string;
  handover_commitment_date?: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | string;
  agreement_document_name?: string | null;
  agreement_file_url?: string | null;
  supporting_documents?: Array<{
    document_name: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    extension?: string;
    uploaded_at?: string;
  }> | null;
  parcel?: LandParcel;
  unit_allocations?: JVUnitAllocation[];
  milestones?: LandJVMilestonePayment[];
  created_at?: string;
  updated_at?: string;
}

export interface DueDiligenceItem {
  id: number;
  due_diligence_id: number;
  check_category: string;
  check_title: string;
  responsible_officer: string;
  verification_date: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  decision: 'PASSED' | 'CONDITIONAL' | 'FAILED_BLOCKING' | 'IN_PROGRESS' | string;
  evidence_documents?: string;
  remarks?: string;
  is_blocking: boolean;
  created_at?: string;
}

export interface LegalDueDiligence {
  id: number;
  diligence_code: string;
  parcel_id: number;
  lead_legal_counsel: string;
  law_firm_name?: string;
  overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  clearance_status: 'CLEARED' | 'CONDITIONAL_CLEARANCE' | 'BLOCKED' | 'UNDER_REVIEW' | string;
  acquisition_blocked: boolean;
  exception_approved_by?: string;
  exception_reason?: string;
  summary_legal_opinion?: string;
  title_search_period_years: number;
  sub_registry_office_searched?: string;
  encumbrance_certificate_no?: string;
  non_encumbrance_certificate_date?: string;
  parcel?: LandParcel;
  items: DueDiligenceItem[];
  blocking_items_count?: number;
  passed_items_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DueDiligenceExceptionApprovalRequest {
  exception_approved_by?: string;
  exception_reason?: string;
  override_blocked_status?: boolean;
  approved_by_officer?: string;
  exception_justification?: string;
  board_resolution_ref?: string;
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
  opportunity_source?: 'BROKER' | 'LANDOWNER' | 'AGENT' | 'INTERNAL_TEAM';
  source_contact_details?: string;
  road_access_width_ft?: number;
  surrounding_development?: string;
  proposed_development_type?: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED_USE' | 'TOWNSHIP';
  far_potential?: number;
  max_allowable_floors?: number;
  ground_coverage_percent?: number;
  estimated_builtup_sqft?: number;
  indicative_cost_total?: number;
  indicative_cost_per_katha?: number;
  status: 'DRAFT_PROPOSAL' | 'LEGAL_VETTING' | 'SURVEY_IN_PROGRESS' | 'JV_SIGNED' | 'ACQUIRED' | 'REJECTED';
  workflow_stage?: 'IDENTIFIED' | 'SCREENING_INSPECTION' | 'FEASIBILITY_VALUATION' | 'MANAGEMENT_APPROVAL' | 'DUE_DILIGENCE_NEGOTIATION' | 'ACQUIRED' | 'REJECTED';
  preliminary_valuation_notes?: string;
  feasibility_report_summary?: Record<string, any>;
  location_description?: string;
  landowners?: Landowner[];
  parcels?: LandParcel[];
  survey_records?: SurveyRecord[];
  jv_agreements?: JVAgreement[];
  khatians?: LandKhatian[];
  dags?: LandDag[];
  documents?: LandDeedDocument[];
  created_at?: string;
  updated_at?: string;
}

export interface LandFeasibilityReport {
  proposal_id: number;
  project_code: string;
  proposal_title: string;
  location: string;
  mouza_info: string;
  plot_size_katha: number;
  plot_size_decimal: number;
  plot_size_sqft: number;
  road_width_ft: number;
  far: number;
  allowable_floors: number;
  ground_coverage_percent: number;
  total_builtup_sqft: number;
  ground_footprint_sqft: number;
  indicative_acquisition_cost: number;
  cost_per_katha: number;
  estimated_construction_cost: number;
  projected_revenue: number;
  estimated_gross_profit: number;
  gross_margin_percent: number;
  workflow_stage: string;
  recommendation: string;
  key_risks: string[];
  opportunities: string[];
}

export interface LandProposalComparisonItem {
  id: number;
  project_code: string;
  proposal_title: string;
  location: string;
  mouza_name: string;
  source: string;
  area_katha: number;
  road_width_ft: number;
  proposed_type: string;
  far_potential: number;
  max_floors: number;
  builtup_sqft: number;
  total_cost: number;
  cost_per_katha: number;
  workflow_stage: string;
  status: string;
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

// ==============================================================================
// 15. Land Valuation and Acquisition Costing (Module 2.8)
// ==============================================================================

export interface LandValuation {
  id: number;
  valuation_code: string;
  parcel_id: number;
  valuation_date: string;
  valuation_source: string;
  assessor_name: string;
  assessor_company?: string;
  assessor_license_no?: string;
  asking_price_total_bdt: number;
  market_valuation_total_bdt: number;
  govt_mouza_rate_per_decimal_bdt: number;
  govt_mouza_valuation_total_bdt: number;
  recommended_offer_price_bdt: number;
  notes_and_methodology?: string;
  approval_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | string;
  approved_by?: string;
  approval_date?: string;
  approval_remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface AcquisitionExpenseItem {
  id: number;
  costing_id: number;
  expense_category: string;
  item_description: string;
  payee_name?: string;
  estimated_amount_bdt: number;
  actual_amount_bdt: number;
  variance_amount_bdt: number;
  payment_status: 'PLANNED' | 'APPROVED_FOR_PAYMENT' | 'PARTIAL_PAID' | 'PAID' | 'CANCELLED' | string;
  accounting_treatment: 'CAPITALIZE_LAND' | 'CAPITALIZE_PROJECT' | 'EXPENSE_OFF' | string;
  payment_date?: string;
  receipt_voucher_ref?: string;
  supporting_document_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AcquisitionCosting {
  id: number;
  costing_code: string;
  parcel_id: number;
  valuation_id?: number | null;
  costing_date: string;
  costing_status: 'ESTIMATED' | 'IN_NEGOTIATION' | 'APPROVED' | 'PARTIALLY_SPENT' | 'FINALIZED_CLOSED' | string;
  agreed_purchase_price_bdt: number;
  budget_allocated_bdt: number;
  total_estimated_expenses_bdt: number;
  total_actual_expenses_bdt: number;
  total_estimated_cost_bdt: number;
  total_actual_cost_bdt: number;
  remaining_budget_bdt: number;
  cost_variance_bdt: number;
  cost_variance_percent: number;
  cost_per_decimal_bdt: number;
  cost_per_katha_bdt: number;
  cost_per_sqft_bdt: number;
  capitalized_land_cost_bdt: number;
  capitalized_development_cost_bdt: number;
  expensed_acquisition_cost_bdt: number;
  approval_stage: 'DRAFT' | 'PENDING_MANAGEMENT_APPROVAL' | 'BOARD_APPROVED' | 'REJECTED' | string;
  approved_by?: string;
  approved_at?: string;
  approval_notes?: string;
  remarks?: string;
  expense_items: AcquisitionExpenseItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CostingApprovalRequest {
  approved_by: string;
  approval_stage: string;
  approval_notes?: string;
}

export interface ValuationApprovalRequest {
  approved_by: string;
  approval_status: string;
  approval_remarks?: string;
}

export interface ValuationComparisonSummary {
  parcel_id: number;
  parcel_name: string;
  total_area_decimal: number;
  total_area_katha: number;
  total_area_sqft: number;
  asking_price: number;
  market_valuation: number;
  govt_mouza_valuation: number;
  negotiated_agreed_price: number;
  variance_asking_vs_negotiated: number;
  variance_market_vs_negotiated: number;
  valuations_count: number;
  valuations: LandValuation[];
}

export interface NegotiationMeeting {
  id?: number;
  negotiation_id?: number;
  meeting_date: string;
  meeting_venue: string;
  developer_attendees: string;
  landowner_attendees: string;
  discussion_minutes: string;
  follow_up_tasks?: string | null;
  next_meeting_date?: string | null;
  created_at?: string;
}

export interface NegotiationTermVersion {
  id?: number;
  negotiation_id?: number;
  version_number: number;
  offered_by_party: 'DEVELOPER' | 'LANDOWNER' | 'MEDIATOR' | 'BOARD_APPROVED' | string;
  proposed_price_bdt: number;
  proposed_advance_bdt: number;
  proposed_timeline_days?: number | null;
  revision_summary: string;
  created_by_officer: string;
  created_at?: string;
}

export interface LandNegotiation {
  id: number;
  negotiation_code: string;
  parcel_id: number;
  landowner_id?: number | null;
  negotiation_title: string;
  negotiation_stage: 'INITIAL_OFFER' | 'COUNTER_OFFER' | 'DUE_DILIGENCE_REVIEW' | 'FINAL_TERMS_AGREED' | 'AGREEMENT_EXECUTED' | 'TERMINATED' | string;
  initial_asking_price_bdt: number;
  developer_target_price_bdt: number;
  current_offer_amount_bdt: number;
  current_counteroffer_amount_bdt: number;
  final_agreed_amount_bdt: number;
  consideration_type: 'CASH_PURCHASE' | 'JV_SHARING' | 'HYBRID_CASH_AND_ALLOCATION' | 'DEFERRED_PAYMENT' | string;
  proposed_advance_bdt: number;
  installment_terms_summary?: string | null;
  non_cash_consideration_details?: string | null;
  conditions_precedent?: string | null;
  negotiation_start_date: string;
  target_closing_deadline: string;
  agreement_execution_date?: string | null;
  agreement_expiry_date?: string | null;
  agreement_status: 'DRAFTING' | 'LEGAL_VETTING' | 'MANAGEMENT_REVIEW' | 'READY_FOR_EXECUTION' | 'EXECUTED_REGISTERED' | 'EXPIRED' | 'TERMINATED' | string;
  agreement_document_name?: string | null;
  agreement_file_url?: string | null;
  supporting_documents?: Array<{
    document_name: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    extension?: string;
    uploaded_at?: string;
  }> | null;
  is_delayed: boolean;
  delay_reason?: string | null;
  terms_approved_by?: string | null;
  terms_approved_at?: string | null;
  approval_notes?: string | null;
  current_version: number;
  meetings: NegotiationMeeting[];
  term_versions: NegotiationTermVersion[];
  created_at?: string;
  updated_at?: string;
}

export interface NegotiationTermsApprovalRequest {
  approved_by: string;
  final_agreed_amount_bdt?: number;
  approval_notes?: string;
}

export interface NegotiationOfferRevisionRequest {
  offered_by_party: string;
  proposed_price_bdt: number;
  proposed_advance_bdt?: number;
  proposed_timeline_days?: number;
  revision_summary: string;
  created_by_officer: string;
}

export interface NegotiationAlertsResponse {
  total_delayed: number;
  total_expiring: number;
  delayed_negotiations: LandNegotiation[];
  expiring_agreements: LandNegotiation[];
}

export interface LandPaymentTransaction {
  id?: number;
  schedule_id?: number;
  transaction_code: string;
  transaction_date: string;
  amount_bdt: number;
  payment_method: 'BANK_TRANSFER' | 'CHEQUE' | 'PAY_ORDER' | 'CASH_APPROVED' | string;
  bank_name?: string | null;
  account_no?: string | null;
  instrument_no?: string | null;
  accounting_voucher_no?: string | null;
  is_reversal: boolean;
  reversal_reason?: string | null;
  reversed_transaction_id?: number | null;
  posted_by: string;
  notes?: string | null;
  created_at?: string;
}

export interface LandPaymentSchedule {
  id: number;
  schedule_code: string;
  parcel_id: number;
  acquisition_costing_id?: number | null;
  negotiation_id?: number | null;
  jv_agreement_id?: number | null;
  landowner_id?: number | null;
  installment_number: number;
  installment_title: string;
  payment_type: 'BOOKING_DEPOSIT' | 'ADVANCE_PAYMENT' | 'INSTALLMENT_PAYMENT' | 'REGISTRATION_PAYMENT' | 'OWNER_SETTLEMENT' | 'FINAL_SETTLEMENT' | 'REFUND_ADJUSTMENT' | string;
  due_date: string;
  due_amount_bdt: number;
  paid_amount_bdt: number;
  outstanding_amount_bdt: number;
  payment_method: 'BANK_TRANSFER' | 'CHEQUE' | 'PAY_ORDER' | 'CASH_APPROVED' | string;
  beneficiary_name?: string | null;
  beneficiary_bank_name?: string | null;
  beneficiary_bank_branch?: string | null;
  beneficiary_account_no?: string | null;
  beneficiary_routing_no?: string | null;
  transaction_reference?: string | null;
  approval_status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED_FOR_PAYMENT' | 'POSTED_PAID' | 'REJECTED' | 'REVERSED' | string;
  approved_by?: string | null;
  approved_at?: string | null;
  approved_variation_amount: number;
  approval_notes?: string | null;
  accounting_voucher_no?: string | null;
  gl_account_code?: string | null;
  is_overdue: boolean;
  notes?: string | null;
  transactions: LandPaymentTransaction[];
  created_at?: string;
  updated_at?: string;
}

export interface PaymentApprovalRequest {
  approved_by: string;
  approval_status: string;
  approved_variation_amount?: number;
  approval_notes?: string;
}

export interface PaymentDisbursementRequest {
  transaction_date: string;
  amount_bdt: number;
  payment_method: string;
  bank_name?: string;
  account_no?: string;
  instrument_no?: string;
  accounting_voucher_no: string;
  posted_by: string;
  notes?: string;
}

export interface PaymentReversalRequest {
  reversal_reason: string;
  posted_by: string;
  notes?: string;
}

export interface PaymentScheduleAutoGenerateRequest {
  parcel_id: number;
  landowner_id?: number | null;
  negotiation_id?: number | null;
  total_agreed_amount_bdt: number;
  earnest_money_percent?: number;
  advance_bayna_percent?: number;
  interim_milestone_percent?: number;
  final_settlement_percent?: number;
  start_date: string;
  days_interval_between_stages?: number;
}

export interface PaymentReconciliationSummary {
  total_contractual_due_bdt: number;
  total_approved_bdt: number;
  total_paid_bdt: number;
  total_outstanding_bdt: number;
  total_overdue_bdt: number;
  overdue_count: number;
  schedules_count: number;
  paid_count: number;
  pending_count: number;
}
