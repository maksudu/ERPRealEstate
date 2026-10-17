export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  short_name: string;
  company_type: string;
  parent_company_id?: number | null;
  parent_company_name?: string | null;
  country: string;
  currency: string;
  time_zone: string;
  logo?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  default_language: string;
  financial_year_start_month: number;
  date_format: string;
  number_format: string;
  employee_code_prefix: string;
  approval_policies?: Record<string, any>;
  payroll_config?: Record<string, any>;
  report_access?: Record<string, any>;
  is_active: boolean;
  legal_entities_count?: number;
  branches_count?: number;
  project_offices_count?: number;
  employees_count?: number;
  created_at?: string;
}

export interface CompanyCreatePayload {
  company_code: string;
  company_name: string;
  short_name: string;
  company_type: string;
  parent_company_id?: number | null;
  country: string;
  currency: string;
  time_zone: string;
  logo?: string | null;
  status: string;
  default_language: string;
  financial_year_start_month: number;
  date_format: string;
  number_format: string;
  employee_code_prefix: string;
  approval_policies?: Record<string, any>;
  payroll_config?: Record<string, any>;
  report_access?: Record<string, any>;
  is_active: boolean;
}

export interface LegalEntity {
  id: number;
  company_id: number;
  company_name?: string | null;
  entity_code: string;
  registered_name: string;
  registration_number?: string | null;
  registration_date?: string | null;
  legal_form: string;
  registered_office_address?: string | null;
  tin_number?: string | null;
  bin_number?: string | null;
  trade_license_number?: string | null;
  trade_license_expiry?: string | null;
  rjsc_registration_details?: string | null;
  authorized_signatory_name?: string | null;
  authorized_signatory_designation?: string | null;
  statutory_documents?: Array<{ title: string; type: string; file_url?: string }>;
  effective_date?: string | null;
  is_default: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface LegalEntityCreatePayload {
  company_id: number;
  entity_code: string;
  registered_name: string;
  registration_number?: string | null;
  registration_date?: string | null;
  legal_form: string;
  registered_office_address?: string | null;
  tin_number?: string | null;
  bin_number?: string | null;
  trade_license_number?: string | null;
  trade_license_expiry?: string | null;
  rjsc_registration_details?: string | null;
  authorized_signatory_name?: string | null;
  authorized_signatory_designation?: string | null;
  statutory_documents?: Array<{ title: string; type: string; file_url?: string }>;
  effective_date?: string | null;
  is_default: boolean;
  status: string;
}

export interface Branch {
  id: number;
  company_id: number;
  company_name?: string | null;
  branch_code: string;
  branch_name: string;
  branch_type: string;
  legal_entity_id?: number | null;
  legal_entity_name?: string | null;
  manager_employee_id?: number | null;
  manager_name?: string | null;
  phone?: string | null;
  email?: string | null;
  division?: string | null;
  district?: string | null;
  upazila_thana?: string | null;
  address?: string | null;
  is_head_office: boolean;
  opening_date?: string | null;
  closing_date?: string | null;
  default_cost_center?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  employees_count?: number;
  created_at?: string;
}

export interface BranchCreatePayload {
  company_id: number;
  branch_code: string;
  branch_name: string;
  branch_type: string;
  legal_entity_id?: number | null;
  manager_employee_id?: number | null;
  phone?: string | null;
  email?: string | null;
  division?: string | null;
  district?: string | null;
  upazila_thana?: string | null;
  address?: string | null;
  is_head_office: boolean;
  opening_date?: string | null;
  closing_date?: string | null;
  default_cost_center?: string | null;
  status: string;
}

export interface ProjectOffice {
  id: number;
  office_code: string;
  office_name: string;
  company_id: number;
  company_name?: string | null;
  legal_entity_id?: number | null;
  legal_entity_name?: string | null;
  project_id: number;
  project_name?: string | null;
  office_type: string;
  site_in_charge_employee_id?: number | null;
  site_in_charge_name?: string | null;
  phone?: string | null;
  email?: string | null;
  division?: string | null;
  district?: string | null;
  upazila_thana?: string | null;
  address?: string | null;
  opening_date?: string | null;
  expected_closing_date?: string | null;
  operational_status: string;
  default_cost_center?: string | null;
  supporting_documents?: Array<{ title: string; type: string; file_url?: string }>;
  employees_count?: number;
  created_at?: string;
}

export interface ProjectOfficeCreatePayload {
  office_code: string;
  office_name: string;
  company_id: number;
  legal_entity_id?: number | null;
  project_id: number;
  office_type: string;
  site_in_charge_employee_id?: number | null;
  phone?: string | null;
  email?: string | null;
  division?: string | null;
  district?: string | null;
  upazila_thana?: string | null;
  address?: string | null;
  opening_date?: string | null;
  expected_closing_date?: string | null;
  operational_status: string;
  default_cost_center?: string | null;
  supporting_documents?: Array<{ title: string; type: string; file_url?: string }>;
}

export interface OrgNode {
  id: string;
  label: string;
  type: 'GROUP' | 'COMPANY' | 'SUBSIDIARY' | 'LEGAL_ENTITY' | 'HEAD_OFFICE' | 'BRANCH' | 'PROJECT_OFFICE';
  code: string;
  subtitle?: string | null;
  badge?: string | null;
  status: string;
  metadata?: Record<string, any>;
  children: OrgNode[];
}

export interface OrgHierarchyResponse {
  root_nodes: OrgNode[];
  total_companies: number;
  total_legal_entities: number;
  total_branches: number;
  total_project_offices: number;
}
