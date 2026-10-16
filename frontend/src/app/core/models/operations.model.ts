export interface Broker {
  id: number;
  broker_code: string;
  agency_name: string;
  contact_person: string;
  phone_number: string;
  nid_number?: string;
  tin_number?: string;
  commission_slab_percent: number;
  bank_details?: string;
  status: string;
  created_at?: string;
}

export interface BrokerCommission {
  id: number;
  broker_id: number;
  booking_id: number;
  total_unit_value: number;
  commission_percent: number;
  total_commission_amount: number;
  disbursed_amount: number;
  tds_withheld_amount: number;
  down_payment_disbursed: boolean;
  ground_slab_disbursed: boolean;
  registration_deed_disbursed: boolean;
  status: string;
  disbursement_notes?: string;
  created_at?: string;
}

export interface CourtCase {
  id: number;
  project_id?: number;
  case_type: string; // 'Title Suit', 'Injunction', 'NI Act 138', 'Land Dispute'
  case_number: string;
  concerned_court: string;
  plaintiff: string;
  defendant: string;
  appointed_advocate: string;
  next_hearing_date?: string;
  status: string; // 'FILED', 'HEARING_ONGOING', 'STAY_ORDER_GRANTED', 'DISPOSED', 'DECREE_FAVORABLE'
  case_summary?: string;
  created_at?: string;
}

export interface MachineryAsset {
  id: number;
  asset_code: string;
  asset_name: string;
  category: string; // 'Tower Crane', 'Concrete Mixer', 'Material Hoist', 'Diesel Generator', 'Excavator'
  current_assigned_project_id?: number;
  hourly_rate: number;
  meter_reading_hours: number;
  status: string; // 'OPERATIONAL', 'MAINTENANCE_REQUIRED', 'UNDER_REPAIR', 'IDLE_IN_YARD'
  created_at?: string;
}

export interface ImportBatch {
  id: number;
  entity_type: string; // 'Land', 'COA_Opening', 'Inventory', 'Installments'
  file_url: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  status: string; // 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED_ROLLED_BACK'
  error_log?: string;
  created_at?: string;
}
