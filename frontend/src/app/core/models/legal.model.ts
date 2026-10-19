export interface ClearanceCondition {
  id: number;
  clearance_id: number;
  condition_code: string;
  condition_title: string;
  condition_category: string; // ARCHITECTURAL_SETBACK, FIRE_SAFETY, ENVIRONMENTAL_ETP, STRUCTURAL_INTEGRITY, ELECTRICAL_SUBSTATION, TRAFFIC_PARKING
  mandatory_level: 'CRITICAL' | 'MANDATORY' | 'ADVISORY';
  compliance_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLIED' | 'WAIVED';
  compliance_date?: string;
  verified_by_officer?: string;
  evidence_doc_url?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthorityClearance {
  id: number;
  project_id: number;
  project_name?: string;
  clearance_type_id: string; // LUC, SPECIAL_PROJECT, BUILDING_PLAN, FIRE_NOC, ENVIRONMENTAL, AVIATION_HEIGHT, WASA_SEWERAGE, SUBSTATION_POWER, OCCUPANCY_CERT
  authority_name: string; // RAJUK, CDA, KDA, RDA, DoE, FSCD, CAAB, WASA, DESCO_DPDC, TITAS_GAS
  reference_no?: string;
  application_memo_no?: string;
  approved_memo_no?: string;
  approval_date?: string;
  expiry_date?: string;
  validity_months: number;
  renewal_reminder_days: number;
  renewal_fee_bdt: number;
  renewal_alert_status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWAL_SUBMITTED';
  days_to_expiry?: number;
  sanctioned_floors?: string;
  sanctioned_height_m?: number;
  contact_officer_name?: string;
  contact_officer_phone?: string;
  status: 'NOT_APPLIED' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'RENEWAL_PENDING';
  document_url?: string;
  remarks?: string;
  conditions_count: number;
  complied_conditions_count: number;
  conditions: ClearanceCondition[];
  created_at?: string;
  updated_at?: string;
}

export interface ClearanceRenewalCalendarItem {
  id: number;
  project_id: number;
  project_name: string;
  authority_name: string;
  clearance_type_id: string;
  reference_no?: string;
  approved_memo_no?: string;
  expiry_date?: string;
  days_remaining: number;
  alert_urgency: 'CRITICAL_EXPIRED' | 'URGENT_15_DAYS' | 'WARNING_30_DAYS' | 'NORMAL_VALID';
  renewal_fee_bdt: number;
  contact_officer_name?: string;
  contact_officer_phone?: string;
}

export interface CourtCaseDocument {
  id: number;
  case_id: number;
  document_code: string;
  document_category: string; // CERTIFIED_LAND_TITLE, HIGH_COURT_WRIT_PETITION, INTERIM_INJUNCTION_ORDER, JUDGMENT_SUMMARY, PLAINT_WRITTEN_STATEMENT, CS_RS_BS_PORCHA, VAKALATNAMA
  document_title: string;
  certified_copy_no?: string;
  issue_or_filing_date?: string;
  issuing_authority_or_court?: string;
  file_url: string;
  file_size_kb: number;
  digital_safe_hash?: string;
  uploaded_by_name?: string;
  is_confidential: boolean;
  summary_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourtCaseHearing {
  id: number;
  case_id: number;
  hearing_date: string;
  presiding_judge?: string;
  court_bench?: string;
  summary_of_proceedings: string;
  order_passed?: string;
  next_hearing_date?: string;
  attended_advocate?: string;
  action_items?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourtCase {
  id: number;
  project_id?: number;
  project_name?: string;
  case_type: string; // Title Suit, Temporary Injunction, Writ Petition, Money Suit, Pre-emption Suit, Partition Suit, NI Act 138, Land Survey Tribunal
  case_number: string;
  concerned_court: string;
  legal_act_section?: string;
  dispute_category: string; // LAND_TITLE_DISPUTE, BOUNDARY_ENCROACHMENT, INJUNCTION_STAY, COMMERCIAL_CONTRACT, BUYER_LITIGATION
  land_mouza?: string;
  cs_rs_bs_plot_no?: string;
  disputed_area_decimals: number;
  plaintiff: string;
  defendant: string;
  appointed_advocate: string;
  advocate_chamber?: string;
  advocate_contact_phone?: string;
  advocate_email?: string;
  is_interim_stay_active: boolean;
  stay_order_details?: string;
  stay_order_granted_date?: string;
  stay_order_valid_until?: string;
  estimated_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  financial_claim_bdt: number;
  next_hearing_date?: string;
  status: 'FILED' | 'HEARING_ONGOING' | 'STAY_ORDER_GRANTED' | 'EVIDENCE_STAGE' | 'ARGUMENTS_CONCLUDED' | 'DECREE_FAVORABLE' | 'DECREE_ADVERSE' | 'DISPOSED' | 'DISPOSED_COMPROMISED';
  decree_outcome?: string;
  case_summary?: string;
  documents_count: number;
  hearings_count: number;
  documents: CourtCaseDocument[];
  hearings: CourtCaseHearing[];
  created_at?: string;
  updated_at?: string;
}

export interface LegalComplianceMetrics {
  total_permits: number;
  approved_permits: number;
  expiring_soon_permits: number;
  expired_permits: number;
  total_conditions: number;
  complied_conditions: number;
  condition_compliance_percentage: number;
  active_court_cases: number;
  interim_stay_orders_active: number;
  total_disputed_area_decimals: number;
  total_financial_exposure_bdt: number;
}

export type LegalArea =
  | 'land_title'
  | 'registered_record'
  | 'developer_registration'
  | 'land_use_clearance'
  | 'approval_condition'
  | 'noc_correspondence'
  | 'sale_transfer'
  | 'litigation_notice'
  | 'document_archive'
  | 'calendar_reminder'
  | 'approval_workflow'
  | 'compliance_report';

export interface LegalRecord {
  id: number;
  area: LegalArea;
  title: string;
  reference_no?: string | null;
  project_id?: number | null;
  status?: string | null;
  due_date?: string | null;
  data: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface LegalRecordPage {
  items: LegalRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface LegalDashboardArea {
  area: LegalArea;
  total: number;
  open_items: number;
  overdue_items: number;
}

export interface LegalDashboard {
  areas: LegalDashboardArea[];
  due_soon: LegalRecord[];
  active_litigation: number;
  pending_approvals: number;
  open_approval_conditions: number;
  overdue_approval_conditions: number;
}

export interface LegalAuditEvent {
  id: number;
  record_id?: number | null;
  area: LegalArea;
  action: string;
  actor: string;
  before_data?: Record<string, any> | null;
  after_data?: Record<string, any> | null;
  created_at?: string;
}

export interface LegalAuditPage {
  items: LegalAuditEvent[];
  total: number;
  limit: number;
  offset: number;
}

export const LEGAL_AREA_LABELS: Record<LegalArea, string> = {
  land_title: 'Land title & ownership verification',
  registered_record: 'Deed, khatian, mutation & land-tax records',
  developer_registration: 'Developer registration & renewal',
  land_use_clearance: 'Land-use & building-plan clearances',
  approval_condition: 'Approval conditions & expiry tracking',
  noc_correspondence: 'NOCs & authority correspondence',
  sale_transfer: 'Sale agreements & transfers',
  litigation_notice: 'Litigation, disputes & legal notices',
  document_archive: 'Versioned documents & secure archive',
  calendar_reminder: 'Compliance calendar & reminders',
  approval_workflow: 'Legal review & approval workflows',
  compliance_report: 'Compliance reports'
};
