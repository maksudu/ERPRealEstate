export interface TaxWithholdingRule {
  id: number;
  rule_code: string;
  rule_type: 'TDS' | 'VDS';
  tax_section: string;
  category_name: string;
  min_bill_amount: number;
  max_bill_amount?: number | null;
  rate_with_tin: number;
  rate_without_tin: number;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
}

export interface TaxZoneRate {
  id: number;
  zone_code: string;
  zone_name: string;
  city_authority: string;
  rate_per_sqm_residential: number;
  rate_per_sqm_commercial: number;
  rate_per_sft_residential: number;
  rate_per_sft_commercial: number;
  is_active: boolean;
  description?: string | null;
  created_at?: string;
}

export interface TDSVDSCalculationRequest {
  bill_type: string;
  category?: string;
  gross_amount: number;
  payee_has_tin: boolean;
  payee_submitted_return_proof: boolean;
  is_withholding_entity?: boolean;
}

export interface TDSVDSCalculationResponse {
  bill_type: string;
  category?: string | null;
  gross_amount: number;
  applicable_tds_section: string;
  tds_rate_percent: number;
  tds_deduction_amount: number;
  tds_slab_applied: string;
  applicable_vds_rule: string;
  vds_rate_percent: number;
  vds_deduction_amount: number;
  total_tax_deducted: number;
  net_payable_to_vendor: number;
  statutory_notes: string[];
  required_challan_code: string;
}

export interface AITSection53FFRequest {
  deed_value_bdt: number;
  apartment_sqft: number;
  zone_code: string;
  property_type: 'RESIDENTIAL' | 'COMMERCIAL';
  is_basement_car_parking_included?: boolean;
  car_parking_count?: number;
}

export interface AITSection53FFResponse {
  deed_value_bdt: number;
  apartment_sqft: number;
  apartment_sqm: number;
  zone_code: string;
  zone_name: string;
  city_authority: string;
  property_type: string;
  ait_rate_per_sqm: number;
  ait_rate_per_sft: number;
  ait_amount_bdt: number;
  stamp_duty_rate_percent: number;
  stamp_duty_amount: number;
  registration_fee_rate_percent: number;
  registration_fee_amount: number;
  local_govt_tax_rate_percent: number;
  local_govt_tax_amount: number;
  vat_rate_percent: number;
  vat_amount: number;
  total_statutory_taxes: number;
  total_effective_cost: number;
  tax_percentage_of_deed_value: number;
  required_treasury_heads: string[];
}

export interface Mushak63Invoice {
  id: number;
  booking_id: number;
  mushak_challan_number: string;
  invoice_date: string;
  developer_bin_number: string;
  customer_tin_nid: string;
  apartment_sqft: number;
  taxable_amount: number;
  vat_rate_percent: number;
  vat_amount: number;
  total_amount_collected: number;
  pdf_url?: string | null;
  status: string;
  booking_reference_no?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  unit_number?: string | null;
  created_at?: string;
}

export interface Mushak65ItemRow {
  item_name: string;
  specification?: string;
  quantity: number;
  unit: string;
  unit_value: number;
  total_value: number;
}

export interface Mushak65Challan {
  id: number;
  challan_number: string;
  issue_date: string;
  issue_time: string;
  origin_project_id: number;
  origin_project_name?: string | null;
  destination_project_id?: number | null;
  destination_project_name?: string | null;
  subcontractor_id?: number | null;
  subcontractor_name?: string | null;
  transport_vehicle_type: string;
  vehicle_number: string;
  driver_name: string;
  driver_phone: string;
  items_json: string;
  total_declared_value: number;
  purpose: string;
  status: string;
  remarks?: string | null;
  created_at?: string;
}

export interface TaxTreasuryChallan {
  id: number;
  challan_no: string;
  deposit_date: string;
  bank_name: string;
  branch_name: string;
  economic_code: string;
  tax_type: 'VAT' | 'TDS' | 'AIT_53FF';
  total_deposit_amount: number;
  status: string;
  remarks?: string | null;
  created_at?: string;
}
