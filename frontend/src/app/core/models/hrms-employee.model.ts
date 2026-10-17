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

export interface DocumentRecord {
  document_type: string;
  title: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  remarks?: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  official_email?: string;
  phone: string;
  personal_phone?: string;
  gender: string;
  date_of_birth?: string;
  marital_status?: string;
  blood_group?: string;
  nid_number?: string;
  tin_number?: string;

  present_address?: string;
  permanent_address?: string;

  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  joining_date: string;
  confirmation_date?: string;
  probation_months: number;
  employment_type: string; // PERMANENT, PROBATION, CONTRACTUAL, INTERN, DAILY_WAGE
  workforce_category: string; // CORPORATE, SITE_ENGINEERING, SITE_SUPERVISION
  status: string; // ACTIVE, PROBATION, CONFIRMED, RESIGNED, TERMINATED, ON_LEAVE

  department_id: number;
  designation_id: number;
  reporting_to_id?: number;
  assigned_project_id?: number;
  company_id?: number;
  branch_id?: number;
  project_office_id?: number;

  bank_account_no?: string;
  bank_name?: string;
  bank_branch?: string;
  routing_no?: string;

  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  is_pf_eligible: boolean;
  is_tax_eligible: boolean;

  education?: EducationRecord[];
  experience?: ExperienceRecord[];
  documents?: DocumentRecord[];

  user_id?: number;
  system_role?: string; // HR_ADMIN, HR_EXECUTIVE, EMPLOYEE, MANAGER, AUDITOR

  department_name?: string;
  designation_title?: string;
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
  official_email?: string;
  phone: string;
  personal_phone?: string;
  gender: string;
  date_of_birth?: string;
  marital_status?: string;
  blood_group?: string;
  nid_number?: string;
  tin_number?: string;

  present_address?: string;
  permanent_address?: string;

  emergency_contact_name?: string;
  emergency_contact_relation?: string;
  emergency_contact_phone?: string;

  joining_date: string;
  confirmation_date?: string;
  probation_months: number;
  employment_type: string;
  workforce_category: string;
  status: string;

  department_id: number;
  designation_id: number;
  reporting_to_id?: number;
  assigned_project_id?: number;
  company_id?: number;
  branch_id?: number;
  project_office_id?: number;

  bank_account_no?: string;
  bank_name?: string;
  bank_branch?: string;
  routing_no?: string;

  basic_salary: number;
  house_rent_allowance: number;
  medical_allowance: number;
  conveyance_allowance: number;
  site_hazard_allowance: number;
  mobile_allowance: number;
  is_pf_eligible: boolean;
  is_tax_eligible: boolean;

  education?: EducationRecord[];
  experience?: ExperienceRecord[];
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
