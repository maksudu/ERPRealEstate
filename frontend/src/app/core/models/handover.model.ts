export interface HandoverInspection {
  id: number;
  booking_id: number;
  unit_id: number;
  site_engineer_id: number;
  inspection_date: string;
  all_financial_dues_cleared: boolean;
  possession_letter_number?: string | null;
  possession_handover_date?: string | null;
  status: 'INSPECTION_PENDING' | 'SNAGS_REPORTED' | 'SNAGS_RECTIFIED' | 'POSSESSION_HANDED_OVER';
  notes?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  customer_name?: string | null;
  site_engineer_name?: string | null;
  created_at?: string;
}

export interface DLPTicket {
  id: number;
  unit_id: number;
  ticket_category: string;
  issue_description: string;
  reported_date: string;
  rectification_deadline: string;
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
  tenant_name: string;
  tenant_nid: string;
  tenant_phone?: string | null;
  lease_start_date: string;
  lease_expiry_date: string;
  monthly_rent_bdt: number;
  security_deposit_bdt: number;
  rent_escalation_percent: number;
  status: string;
  unit_number?: string | null;
  project_name?: string | null;
  created_at?: string;
}
