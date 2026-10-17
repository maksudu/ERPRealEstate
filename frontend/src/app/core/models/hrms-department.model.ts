export interface Department {
  id: number;
  company_id: number;
  company_name?: string | null;
  department_code: string;
  name_en: string;
  name_bn?: string | null;
  parent_department_id?: number | null;
  parent_department_name?: string | null;
  head_of_dept_id?: number | null;
  head_of_dept_name?: string | null;
  head_of_dept_code?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  cost_center_id?: string | null;
  description?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  approval_policies?: Record<string, any> | null;
  is_active: boolean;
  employee_count: number;
  vacancy_count: number;
  child_count: number;
  created_at?: string;
}

export interface DepartmentCreatePayload {
  company_id: number;
  department_code: string;
  name_en: string;
  name_bn?: string | null;
  parent_department_id?: number | null;
  head_of_dept_id?: number | null;
  branch_id?: number | null;
  cost_center_id?: string | null;
  description?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  approval_policies?: Record<string, any> | null;
  is_active: boolean;
}

export interface DepartmentTreeNode {
  id: number;
  department_code: string;
  name_en: string;
  name_bn?: string | null;
  company_id?: number | null;
  company_name?: string | null;
  parent_department_id?: number | null;
  head_id?: number | null;
  head_name?: string | null;
  head_code?: string | null;
  head_title?: string | null;
  branch_id?: number | null;
  branch_name?: string | null;
  cost_center_id?: string | null;
  status: string;
  employee_count: number;
  children: DepartmentTreeNode[];
}

export interface HeadPermissions {
  view_employees: boolean;
  approve_leave: boolean;
  approve_overtime: boolean;
  review_attendance: boolean;
  initiate_transfer: boolean;
  recommend_salary: boolean;
  view_payroll_cost: boolean;
  approve_expenses: boolean;
  expense_limit: number;
}

export interface DepartmentHeadHistory {
  id: number;
  department_id: number;
  employee_id: number;
  employee_name?: string | null;
  employee_code?: string | null;
  designation_title?: string | null;
  assignment_type: 'PERMANENT' | 'ACTING' | 'INTERIM';
  effective_from: string;
  effective_to?: string | null;
  permissions_json?: Partial<HeadPermissions> | null;
  is_current: boolean;
  remarks?: string | null;
  created_at?: string;
}

export interface DepartmentHeadAssignPayload {
  employee_id: number;
  assignment_type: string;
  effective_from?: string | null;
  effective_to?: string | null;
  permissions_json?: HeadPermissions | null;
  remarks?: string | null;
}

export interface DepartmentProjectMapping {
  id: number;
  department_id: number;
  department_name?: string | null;
  project_id: number;
  project_name?: string | null;
  project_code?: string | null;
  site_lead_employee_id?: number | null;
  site_lead_name?: string | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
  created_at?: string;
}

export interface DepartmentProjectMappingCreatePayload {
  project_id: number;
  site_lead_employee_id?: number | null;
  effective_from?: string | null;
  effective_to?: string | null;
  status: string;
}

export interface DepartmentMoveParentPayload {
  parent_department_id?: number | null;
  effective_date?: string | null;
  remarks?: string | null;
}

export interface DepartmentAuditLog {
  id: number;
  department_id: number;
  action_type: string;
  performed_by_name?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  remarks?: string | null;
  created_at?: string;
}
