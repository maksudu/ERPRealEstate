export interface EducationRecord {
  degree: string;
  institution: string;
  passing_year: string;
  result: string;
  major?: string;
}

export interface ExperienceRecord {
  company: string;
  designation: string;
  from_date: string;
  to_date: string;
  responsibility?: string;
}

export interface CertificationRecord {
  name: string;
  issuing_body: string;
  issue_date?: string;
  expiry_date?: string;
  license_number?: string;
}

export interface StatutoryAllowanceItem {
  name: string;
  amount: number;
  calculation_type: 'FIXED' | 'PERCENT';
}

export interface DocumentRecord {
  document_type: string;
  title: string;
  file_url: string;
  file_name?: string;
  uploaded_at: string;
  expiry_date?: string;
  is_confidential?: boolean;
  version?: string;
  remarks?: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name_bn?: string;
  photo_url?: string;
  official_email?: string;
  phone: string;
  personal_phone?: string;
  gender: string;
  date_of_birth?: string;
  marital_status?: string;
  blood_group?: string;
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  nid_number?: string;
  tin_number?: string;
  passport_number?: string;
  passport_expiry_date?: string;

  present_address?: string;
  permanent_address?: string;

  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  nominee_name?: string;
  nominee_relation?: string;
  nominee_phone?: string;
  nominee_nid?: string;

  joining_date: string;
  confirmation_date?: string;
  probation_months: number;
  employment_type: string; // PERMANENT, PROBATION, CONTRACTUAL, INTERN, DAILY_WAGE
  workforce_category: string; // CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
  status: string; // ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE

  department_id: number;
  designation_id: number;
  salary_grade_id?: number;
  reporting_to_id?: number;
  assigned_project_id?: number;
  company_id?: number;
  branch_id?: number;
  project_office_id?: number;
  work_location?: string;
  cost_center?: string;

  payment_method?: string; // BANK, MFS_BKASH, MFS_NAGAD, MFS_ROCKET, CASH
  bank_account_no?: string;
  bank_name?: string;
  bank_branch?: string;
  routing_no?: string;
  mfs_provider?: string;
  mfs_number?: string;

  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  custom_allowances?: StatutoryAllowanceItem[];
  is_pf_eligible: boolean;
  is_tax_eligible: boolean;

  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  certifications?: CertificationRecord[];
  skills?: string[];
  documents?: DocumentRecord[];

  user_id?: number;
  system_role?: string;

  department_name?: string;
  designation_title?: string;
  salary_grade_name?: string;
  assigned_project_name?: string;
  company_name?: string;
  branch_name?: string;
  reporting_to_name?: string;
  gross_salary?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeCreatePayload {
  employee_code?: string;
  first_name: string;
  last_name: string;
  full_name_bn?: string;
  photo_url?: string;
  official_email?: string;
  phone: string;
  personal_phone?: string;
  gender: string;
  date_of_birth?: string;
  marital_status?: string;
  blood_group?: string;
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  nid_number?: string;
  tin_number?: string;
  passport_number?: string;
  passport_expiry_date?: string;

  present_address?: string;
  permanent_address?: string;

  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  nominee_name?: string;
  nominee_relation?: string;
  nominee_phone?: string;
  nominee_nid?: string;

  joining_date: string;
  confirmation_date?: string;
  probation_months: number;
  employment_type: string;
  workforce_category: string;
  status: string;

  department_id: number;
  designation_id: number;
  salary_grade_id?: number;
  reporting_to_id?: number;
  assigned_project_id?: number;
  company_id?: number;
  branch_id?: number;
  project_office_id?: number;
  work_location?: string;
  cost_center?: string;

  payment_method?: string;
  bank_account_no?: string;
  bank_name?: string;
  bank_branch?: string;
  routing_no?: string;
  mfs_provider?: string;
  mfs_number?: string;

  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  custom_allowances?: StatutoryAllowanceItem[];
  is_pf_eligible: boolean;
  is_tax_eligible: boolean;

  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  certifications?: CertificationRecord[];
  skills?: string[];
  documents?: DocumentRecord[];

  user_id?: number;
  system_role?: string;
}

export interface EmployeeUpdatePayload extends Partial<EmployeeCreatePayload> {}

export interface EmployeePaginatedResponse {
  items: Employee[];
  total: number;
  limit: number;
  offset: number;
}
