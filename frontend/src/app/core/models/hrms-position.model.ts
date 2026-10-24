export interface SalaryGrade {
  id: number;
  organization_id: number;
  grade_code: string;
  grade_name: string;
  employee_level: string; // C_SUITE, DIRECTOR, SR_MANAGEMENT, MID_MANAGEMENT, EXECUTIVE, OFFICER, SITE_ENGINEER, SUPPORT_STAFF
  min_salary: number;
  max_salary: number;
  default_house_rent_pct: number;
  default_medical_allowance: number;
  default_conveyance: number;
  allowance_package?: SalaryAllowance[];
  description?: string;
  is_active: boolean;
  designations_count?: number;
  positions_count?: number;
  created_at?: string;
}

export interface SalaryGradeCreatePayload {
  grade_code: string;
  grade_name: string;
  employee_level: string;
  min_salary: number;
  max_salary: number;
  default_house_rent_pct: number;
  default_medical_allowance: number;
  default_conveyance: number;
  allowance_package?: SalaryAllowance[];
  description?: string;
  is_active: boolean;
}

export interface SalaryAllowance {
  name: string;
  amount: number;
  calculation_type: 'FIXED' | 'PERCENT';
}

export interface SalaryGradePaginatedResponse {
  items: SalaryGrade[];
  total: number;
  limit: number;
  offset: number;
}

export interface Designation {
  id: number;
  organization_id: number;
  department_id: number;
  designation_code: string;
  title_en: string;
  title_bn?: string;
  salary_grade_id?: number;
  grade_level: string;
  employee_level: string;
  min_salary: number;
  max_salary: number;
  description?: string;
  is_active: boolean;
  department_name?: string;
  salary_grade_name?: string;
  employees_count?: number;
  positions_count?: number;
  created_at?: string;
}

export interface DesignationCreatePayload {
  department_id: number;
  designation_code: string;
  title_en: string;
  title_bn?: string;
  salary_grade_id?: number | null;
  grade_level: string;
  employee_level: string;
  min_salary: number;
  max_salary: number;
  description?: string;
  is_active: boolean;
}

export interface DesignationPaginatedResponse {
  items: Designation[];
  total: number;
  limit: number;
  offset: number;
}

export interface Position {
  id: number;
  organization_id: number;
  position_code: string;
  position_title: string;
  department_id: number;
  designation_id: number;
  salary_grade_id?: number;
  reports_to_position_id?: number;
  assigned_branch_id?: number;
  assigned_project_id?: number;
  position_type: 'PERMANENT' | 'CONTRACTUAL' | 'PROJECT_SITE';
  status: 'APPROVED' | 'FILLED' | 'VACANT' | 'ON_HOLD' | 'FROZEN';
  budgeted_salary: number;
  target_hire_date?: string;
  approved_date?: string;
  occupied_employee_id?: number;
  remarks?: string;
  department_name?: string;
  designation_title?: string;
  salary_grade_name?: string;
  reports_to_title?: string;
  branch_name?: string;
  project_name?: string;
  occupied_employee_name?: string;
  occupied_employee_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PositionCreatePayload {
  position_code: string;
  position_title: string;
  department_id: number;
  designation_id: number;
  salary_grade_id?: number | null;
  reports_to_position_id?: number | null;
  assigned_branch_id?: number | null;
  assigned_project_id?: number | null;
  position_type: string;
  status: string;
  budgeted_salary: number;
  target_hire_date?: string | null;
  approved_date?: string | null;
  occupied_employee_id?: number | null;
  remarks?: string;
}

export interface PositionPaginatedResponse {
  items: Position[];
  total: number;
  limit: number;
  offset: number;
}

export interface PositionStats {
  total_approved: number;
  total_filled: number;
  total_vacant: number;
  total_on_hold: number;
  total_frozen: number;
  budgeted_payroll_total: number;
}
