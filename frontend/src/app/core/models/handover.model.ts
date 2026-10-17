export interface SnagItem {
  id: number;
  snag_code: string;
  inspection_id?: number | null;
  unit_id: number;
  category: string; // Civil, Paint, Plumbing, Electrical, Joinery, Waterproofing, Tiles
  location: string; // Master Bed, Kitchen, Balcony, Living Room, Common Bath
  defect_description: string;
  photo_attachment_url?: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  contractor_name?: string | null;
  target_fix_date?: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'FIXED' | 'VERIFIED_CLOSED';
  fix_date?: string | null;
  verified_by_engineer_id?: number | null;
  verified_by_engineer_name?: string | null;
  verification_notes?: string | null;
  customer_accepted: boolean;
  unit_number?: string | null;
  project_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HandoverInspection {
  id: number;
  booking_id: number;
  unit_id: number;
  site_engineer_id: number;
  inspection_date: string;
  all_financial_dues_cleared: boolean;
  possession_letter_number?: string | null;
  key_handover_certificate_number?: string | null;
  key_sets_count: number;
  possession_handover_date?: string | null;
  joint_customer_signoff: boolean;
  customer_signoff_date?: string | null;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  status: 'INSPECTION_PENDING' | 'SNAGS_REPORTED' | 'SNAGS_RECTIFIED' | 'POSSESSION_HANDED_OVER';
  notes?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  site_engineer_name?: string | null;
  open_snags_count?: number;
  resolved_snags_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DLPTicket {
  id: number;
  ticket_code?: string | null;
  unit_id: number;
  ticket_category: string;
  defect_severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  issue_description: string;
  reported_date: string;
  rectification_deadline: string;
  sla_hours: number;
  sla_breach_status: 'WITHIN_SLA' | 'SLA_BREACHED' | 'RESOLVED_ON_TIME';
  warranty_valid_until?: string | null;
  is_under_warranty: boolean;
  assigned_technician?: string | null;
  resolution_cost_bdt: number;
  borne_by: 'DEVELOPER_WARRANTY' | 'CONTRACTOR_RETENTION' | 'CLIENT_CHARGEABLE';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  rectified_date?: string | null;
  rectification_notes?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface OwnersAssociation {
  id: number;
  project_id: number;
  association_name: string;
  handover_date: string;
  sinking_fund_transferred_bdt: number;
  monthly_service_charge_per_flat: number;
  president_name?: string | null;
  secretary_name?: string | null;
  contact_phone?: string | null;
  status: string;
  project_name?: string | null;
  created_at?: string;
}

export interface LeaseAgreement {
  id: number;
  unit_id: number;
  lease_reference_no?: string | null;
  tenant_name: string;
  tenant_company_name?: string | null;
  trade_license_number?: string | null;
  tin_bin_number?: string | null;
  tenant_nid: string;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  emergency_contact_phone?: string | null;
  commercial_space_type: 'RETAIL_SHOP' | 'OFFICE_SPACE' | 'RESTAURANT' | 'BANK_BOOTH' | 'SHOWROOM';
  floor_area_sqft: number;
  rent_per_sqft_bdt: number;
  monthly_rent_bdt: number;
  cam_rate_per_sqft_bdt: number;
  fitout_grace_period_days: number;
  lease_start_date: string;
  lease_expiry_date: string;
  security_deposit_bdt: number;
  security_deposit_status: 'PENDING' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'REFUNDED';
  rent_escalation_percent: number;
  escalation_frequency_months: number;
  status: 'ACTIVE' | 'PENDING_HANDOVER' | 'EXPIRED' | 'TERMINATED';
  remarks?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  total_cam_billed_bdt?: number;
  created_at?: string;
}

export interface CAMBill {
  id: number;
  bill_number: string;
  lease_id: number;
  bill_month: string;
  billing_date: string;
  due_date: string;
  area_sqft: number;
  cam_rate_per_sqft: number;
  cam_amount: number;
  sinking_fund_charge: number;
  generator_backup_charge: number;
  common_electricity_water: number;
  total_bill_amount: number;
  paid_amount: number;
  payment_status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
  paid_date?: string | null;
  remarks?: string | null;
  tenant_name?: string | null;
  tenant_company_name?: string | null;
  unit_number?: string | null;
  project_name?: string | null;
  created_at?: string;
}

export interface UtilitySubMeterReading {
  id: number;
  lease_id: number;
  meter_number: string;
  meter_type: 'ELECTRICITY' | 'WATER' | 'GAS' | 'HVAC_BTU';
  reading_date: string;
  previous_reading: number;
  current_reading: number;
  units_consumed: number;
  tariff_rate_per_unit: number;
  subtotal_amount: number;
  vat_rate_percent: number;
  total_utility_amount: number;
  billing_status: 'UNBILLED' | 'BILLED' | 'PAID';
  remarks?: string | null;
  tenant_name?: string | null;
  tenant_company_name?: string | null;
  unit_number?: string | null;
  created_at?: string;
}

export interface HandoverDashboardMetrics {
  total_inspections_count: number;
  possession_handed_over_count: number;
  inspection_pending_count: number;
  total_snags_reported: number;
  open_snags_count: number;
  fixed_snags_count: number;
  total_dlp_tickets_count: number;
  active_dlp_tickets_count: number;
  critical_dlp_count: number;
  active_commercial_leases_count: number;
  total_monthly_rent_receivable: number;
  total_cam_billed_amount: number;
  unpaid_cam_bills_count: number;
}
