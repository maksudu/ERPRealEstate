import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { HrmsService, Employee } from '../hrms.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  Department,
  DepartmentCreatePayload,
  DepartmentTreeNode,
  DepartmentHeadHistory,
  DepartmentHeadAssignPayload,
  HeadPermissions,
  DepartmentProjectMapping,
  DepartmentProjectMappingCreatePayload,
  DepartmentMoveParentPayload,
  DepartmentAuditLog
} from '../../../core/models/hrms-department.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  CustomTabsComponent,
  TabItem,
  ModalComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-departments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  templateUrl: './departments.component.html'
})
export class DepartmentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  deptService = inject(HrmsDepartmentService);
  orgService = inject(HrmsOrgService);
  hrmsService = inject(HrmsService);
  projectService = inject(ProjectService);
  lookupService = inject(LookupService);

  // Active Tab navigation (Section 2 Module Menu Structure)
  activeTab = signal<string>('master');
  tabs = computed<TabItem[]>(() => [
    { id: 'master', label: '2.1 Department Master', count: this.deptService.departments().length },
    { id: 'hierarchy', label: '2.2 Department Hierarchy', count: this.rootTreeNodes().length },
    { id: 'head-assignment', label: '2.3 Head Assignment & Permissions' },
    { id: 'company-branch', label: '2.4 Company & Branch Mapping' },
    { id: 'project-mapping', label: '2.5 Project Department Mapping', count: this.deptService.projectMappings().length },
    { id: 'cost-centers', label: '2.6 Department Cost Centers' },
    { id: 'history-audit', label: '2.7 History & Audit Trail' },
    { id: 'settings', label: 'Dynamic Master Dropdowns' }
  ]);

  // Master Lists
  employees = signal<Employee[]>([]);
  projects = signal<Project[]>([]);

  // Search & Filter state
  searchQuery = signal<string>('');
  selectedCompanyFilter = signal<number | null>(null);
  selectedBranchFilter = signal<number | null>(null);
  selectedStatusFilter = signal<string | null>(null);

  // Modals state
  isDepartmentModalOpen = signal<boolean>(false);
  isMoveParentModalOpen = signal<boolean>(false);
  isAssignHeadModalOpen = signal<boolean>(false);
  isProjectMappingModalOpen = signal<boolean>(false);
  isAuditModalOpen = signal<boolean>(false);
  isQuickLookupModalOpen = signal<boolean>(false);
  isDeleteConfirmModalOpen = signal<boolean>(false);

  // Edit target
  editingDeptId = signal<number | null>(null);
  selectedDeptForDetails = signal<Department | null>(null);

  // Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Deletion context
  itemToDelete = signal<{ id: number; name: string } | null>(null);

  // Tree expansion state
  expandedNodeIds = signal<Set<number>>(new Set<number>());

  // --- Department Form Model (Section 3.1) ---
  deptForm: DepartmentCreatePayload = this.getEmptyDeptForm();

  // --- Move Parent Form Model (Section 4) ---
  moveParentForm: DepartmentMoveParentPayload = {
    parent_department_id: null,
    effective_date: new Date().toISOString().substring(0, 10),
    remarks: ''
  };

  // --- Head Permissions & Assign Head Form Model (Section 5) ---
  headPermissions: HeadPermissions = {
    view_employees: true,
    approve_leave: true,
    approve_overtime: true,
    review_attendance: true,
    initiate_transfer: false,
    recommend_salary: false,
    view_payroll_cost: true,
    approve_expenses: true,
    expense_limit: 50000
  };

  assignHeadForm: DepartmentHeadAssignPayload = {
    employee_id: 0,
    assignment_type: 'PERMANENT',
    effective_from: new Date().toISOString().substring(0, 10),
    permissions_json: this.headPermissions,
    remarks: ''
  };

  // --- Project Mapping Form Model (Section 2.5) ---
  projectMappingForm: DepartmentProjectMappingCreatePayload = {
    project_id: 0,
    site_lead_employee_id: null,
    effective_from: new Date().toISOString().substring(0, 10),
    status: 'ACTIVE'
  };

  // Quick lookup create state
  quickLookupCategoryCode = signal<string>('DEPARTMENT_STATUS');
  quickLookupEnName = signal<string>('');
  quickLookupBnName = signal<string>('');
  quickLookupColor = signal<string>('#10b981');
  isSubmittingQuickLookup = signal<boolean>(false);

  // Computed filtered list
  filteredDepartments = computed(() => {
    let list = this.deptService.departments();
    const query = this.searchQuery().trim().toLowerCase();
    const compFilter = this.selectedCompanyFilter();
    const branchFilter = this.selectedBranchFilter();
    const statusFilter = this.selectedStatusFilter();

    if (compFilter) {
      list = list.filter(d => d.company_id === compFilter);
    }
    if (branchFilter) {
      list = list.filter(d => d.branch_id === branchFilter);
    }
    if (statusFilter) {
      list = list.filter(d => d.status === statusFilter);
    }
    if (query) {
      list = list.filter(d =>
        d.name_en.toLowerCase().includes(query) ||
        (d.name_bn && d.name_bn.toLowerCase().includes(query)) ||
        d.department_code.toLowerCase().includes(query) ||
        (d.cost_center_id && d.cost_center_id.toLowerCase().includes(query))
      );
    }
    return list;
  });

  // Computed Tree root nodes
  rootTreeNodes = computed(() => {
    return this.deptService.departmentTree();
  });

  // Dropdown options
  companyOptions = computed(() => {
    return this.orgService.companies().map(c => ({
      value: c.id,
      label: `${c.company_code} - ${c.company_name}`
    }));
  });

  branchOptions = computed(() => {
    return this.orgService.branches().map(b => ({
      value: b.id,
      label: `${b.branch_code} - ${b.branch_name}`
    }));
  });

  departmentOptions = computed(() => {
    const editId = this.editingDeptId();
    return this.deptService.departments()
      .filter(d => !editId || d.id !== editId)
      .map(d => ({
        value: d.id,
        label: `${d.department_code} - ${d.name_en}`
      }));
  });

  employeeOptions = computed(() => {
    return this.employees().map(e => ({
      value: e.id,
      label: `${e.employee_code} - ${e.first_name} ${e.last_name} (${e.designation_title || 'Staff'})`
    }));
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }));
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'hierarchy') {
        this.activeTab.set('hierarchy');
      } else if (last === 'heads') {
        this.activeTab.set('head-assignment');
      } else if (last === 'cost-centers') {
        this.activeTab.set('cost-centers');
      } else {
        this.activeTab.set('master');
      }
    });
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.deptService.loadDepartments().subscribe();
    this.deptService.loadDepartmentTree().subscribe((nodes) => {
      // Auto expand top level nodes
      const ids = new Set<number>();
      nodes.forEach(n => ids.add(n.id));
      this.expandedNodeIds.set(ids);
    });
    this.orgService.loadCompanies().subscribe();
    this.orgService.loadBranches().subscribe();
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.hrmsService.loadEmployees().subscribe((e: Employee[]) => this.employees.set(e));
  }

  onProjectMappingDeptSelected(event: any): void {
    if (!event) {
      this.selectedDeptForDetails.set(null);
      return;
    }
    const deptId = +event.item_code;
    const dept = this.deptService.departments().find(d => d.id === deptId) || null;
    this.selectedDeptForDetails.set(dept);
    this.deptService.loadProjectMappings(deptId).subscribe();
  }

  onAuditDeptSelected(event: any): void {
    if (!event) {
      this.selectedDeptForDetails.set(null);
      return;
    }
    const deptId = +event.item_code;
    const dept = this.deptService.departments().find(d => d.id === deptId) || null;
    this.selectedDeptForDetails.set(dept);
    this.deptService.loadAuditTrail(deptId).subscribe();
  }

  getEmptyDeptForm(): DepartmentCreatePayload {
    return {
      company_id: 1,
      department_code: '',
      name_en: '',
      name_bn: '',
      parent_department_id: null,
      head_of_dept_id: null,
      branch_id: null,
      cost_center_id: '',
      description: '',
      effective_from: new Date().toISOString().substring(0, 10),
      effective_to: null,
      status: 'ACTIVE',
      approval_policies: {
        financial_limit_bdt: 200000.0,
        can_approve_leave: true,
        can_approve_overtime: true
      },
      is_active: true
    };
  }

  // Tab Selection
  selectTab(tabId: string): void {
    this.activeTab.set(tabId);
    this.clearAlerts();

    // Contextual loading
    if (tabId === 'project-mapping' && this.selectedDeptForDetails()) {
      this.deptService.loadProjectMappings(this.selectedDeptForDetails()!.id).subscribe();
    } else if (tabId === 'project-mapping' && this.deptService.departments().length > 0) {
      // Pick first department to inspect mappings
      const firstDept = this.deptService.departments()[0];
      this.selectedDeptForDetails.set(firstDept);
      this.deptService.loadProjectMappings(firstDept.id).subscribe();
    }

    if (tabId === 'head-assignment' && this.selectedDeptForDetails()) {
      this.deptService.loadHeadHistory(this.selectedDeptForDetails()!.id).subscribe();
    } else if (tabId === 'head-assignment' && this.deptService.departments().length > 0) {
      const firstDept = this.deptService.departments()[0];
      this.selectedDeptForDetails.set(firstDept);
      this.deptService.loadHeadHistory(firstDept.id).subscribe();
    }

    if (tabId === 'history-audit' && this.selectedDeptForDetails()) {
      this.deptService.loadAuditTrail(this.selectedDeptForDetails()!.id).subscribe();
    } else if (tabId === 'history-audit' && this.deptService.departments().length > 0) {
      const firstDept = this.deptService.departments()[0];
      this.selectedDeptForDetails.set(firstDept);
      this.deptService.loadAuditTrail(firstDept.id).subscribe();
    }
  }

  // --- Department CRUD Modal Actions ---
  openCreateDeptModal(): void {
    this.editingDeptId.set(null);
    this.deptForm = this.getEmptyDeptForm();
    this.isDepartmentModalOpen.set(true);
  }

  openEditDeptModal(dept: Department): void {
    this.editingDeptId.set(dept.id);
    this.deptForm = {
      company_id: dept.company_id || 1,
      department_code: dept.department_code,
      name_en: dept.name_en,
      name_bn: dept.name_bn || '',
      parent_department_id: dept.parent_department_id || null,
      head_of_dept_id: dept.head_of_dept_id || null,
      branch_id: dept.branch_id || null,
      cost_center_id: dept.cost_center_id || '',
      description: dept.description || '',
      effective_from: dept.effective_from || new Date().toISOString().substring(0, 10),
      effective_to: dept.effective_to || null,
      status: dept.status,
      approval_policies: dept.approval_policies || {},
      is_active: dept.is_active
    };
    this.isDepartmentModalOpen.set(true);
  }

  saveDepartment(): void {
    if (!this.deptForm.name_en?.trim()) {
      this.errorMessage.set('Validation Rule 2: Department Name is required.');
      return;
    }
    if (!this.deptForm.department_code?.trim()) {
      this.errorMessage.set('Department Code is required.');
      return;
    }

    const editId = this.editingDeptId();
    if (editId) {
      this.deptService.updateDepartment(editId, this.deptForm).subscribe({
        next: () => {
          this.isDepartmentModalOpen.set(false);
          this.successMessage.set(`Department '${this.deptForm.name_en}' updated successfully.`);
          this.deptService.loadDepartments().subscribe();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to update department.');
        }
      });
    } else {
      this.deptService.createDepartment(this.deptForm).subscribe({
        next: () => {
          this.isDepartmentModalOpen.set(false);
          this.successMessage.set(`Department '${this.deptForm.name_en}' created successfully.`);
          this.deptService.loadDepartments().subscribe();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to create department.');
        }
      });
    }
  }

  // Status deactivation / activation with Rule 6 check
  toggleDeptStatus(dept: Department): void {
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.deptService.updateDepartmentStatus(dept.id, newStatus).subscribe({
      next: () => {
        this.successMessage.set(`Department '${dept.name_en}' status changed to ${newStatus}.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to update status.');
      }
    });
  }

  // Deletion confirm modal
  openDeleteModal(dept: Department): void {
    this.itemToDelete.set({ id: dept.id, name: dept.name_en });
    this.isDeleteConfirmModalOpen.set(true);
  }

  confirmDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    this.deptService.deleteDepartment(item.id).subscribe({
      next: () => {
        this.isDeleteConfirmModalOpen.set(false);
        this.itemToDelete.set(null);
        this.successMessage.set(`Department '${item.name}' deleted successfully.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Cannot delete department.');
        this.isDeleteConfirmModalOpen.set(false);
      }
    });
  }

  // --- Hierarchy Tree Actions (Section 4) ---
  toggleTreeNode(nodeId: number, event: MouseEvent): void {
    event.stopPropagation();
    const set = new Set(this.expandedNodeIds());
    if (set.has(nodeId)) {
      set.delete(nodeId);
    } else {
      set.add(nodeId);
    }
    this.expandedNodeIds.set(set);
  }

  expandAllTree(): void {
    const set = new Set<number>();
    const collectIds = (nodes: DepartmentTreeNode[]) => {
      for (const n of nodes) {
        set.add(n.id);
        if (n.children && n.children.length > 0) {
          collectIds(n.children);
        }
      }
    };
    collectIds(this.deptService.departmentTree());
    this.expandedNodeIds.set(set);
  }

  collapseAllTree(): void {
    this.expandedNodeIds.set(new Set<number>());
  }

  // Move Parent Department Modal (Rule 3, 4, 5)
  openMoveParentModal(dept: Department | DepartmentTreeNode): void {
    this.editingDeptId.set(dept.id);
    this.moveParentForm = {
      parent_department_id: dept.parent_department_id || null,
      effective_date: new Date().toISOString().substring(0, 10),
      remarks: ''
    };
    this.isMoveParentModalOpen.set(true);
  }

  saveMoveParent(): void {
    const deptId = this.editingDeptId();
    if (!deptId) return;

    this.deptService.moveDepartmentParent(deptId, this.moveParentForm).subscribe({
      next: (updated) => {
        this.isMoveParentModalOpen.set(false);
        this.successMessage.set(`Department reporting line updated successfully.`);
        this.deptService.loadDepartments().subscribe();
        this.deptService.loadDepartmentTree().subscribe();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to move department.');
      }
    });
  }

  // --- Head Assignment Actions (Section 5) ---
  openAssignHeadModal(dept: Department | DepartmentTreeNode): void {
    const currentDept = this.deptService.departments().find(d => d.id === dept.id) || null;
    this.selectedDeptForDetails.set(currentDept);
    this.editingDeptId.set(dept.id);
    const existingHeadId = ('head_of_dept_id' in dept ? (dept as Department).head_of_dept_id : (dept as DepartmentTreeNode).head_id) || 0;
    this.assignHeadForm = {
      employee_id: existingHeadId,
      assignment_type: 'PERMANENT',
      effective_from: new Date().toISOString().substring(0, 10),
      permissions_json: this.headPermissions,
      remarks: ''
    };
    this.deptService.loadHeadHistory(dept.id).subscribe();
    this.isAssignHeadModalOpen.set(true);
  }

  saveHeadAssignment(): void {
    const deptId = this.editingDeptId();
    if (!deptId) return;
    if (!this.assignHeadForm.employee_id) {
      this.errorMessage.set('Please select an active employee.');
      return;
    }
    this.assignHeadForm.permissions_json = this.headPermissions;

    this.deptService.assignDepartmentHead(deptId, this.assignHeadForm).subscribe({
      next: () => {
        this.isAssignHeadModalOpen.set(false);
        this.successMessage.set('Department head assigned and permissions configured successfully.');
        if (this.selectedDeptForDetails()) {
          this.deptService.loadHeadHistory(this.selectedDeptForDetails()!.id).subscribe();
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to assign department head.');
      }
    });
  }

  // Inspect department history and details
  inspectDepartment(dept: Department): void {
    this.selectedDeptForDetails.set(dept);
    this.deptService.loadHeadHistory(dept.id).subscribe();
    this.deptService.loadProjectMappings(dept.id).subscribe();
    this.deptService.loadAuditTrail(dept.id).subscribe();
  }

  // --- Project Mapping Actions (Section 2.5) ---
  openProjectMappingModal(dept?: Department): void {
    if (dept) {
      this.selectedDeptForDetails.set(dept);
    }
    this.projectMappingForm = {
      project_id: this.projects().length > 0 ? this.projects()[0].id : 0,
      site_lead_employee_id: null,
      effective_from: new Date().toISOString().substring(0, 10),
      status: 'ACTIVE'
    };
    this.isProjectMappingModalOpen.set(true);
  }

  saveProjectMapping(): void {
    const currentDept = this.selectedDeptForDetails();
    if (!currentDept) {
      this.errorMessage.set('Please select a department first.');
      return;
    }
    if (!this.projectMappingForm.project_id) {
      this.errorMessage.set('Please select a project to map.');
      return;
    }

    this.deptService.createProjectMapping(currentDept.id, this.projectMappingForm).subscribe({
      next: () => {
        this.isProjectMappingModalOpen.set(false);
        this.successMessage.set(`Department mapped to project successfully.`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to map project.');
      }
    });
  }

  deleteProjectMapping(mappingId: number): void {
    this.deptService.deleteProjectMapping(mappingId).subscribe({
      next: () => {
        this.successMessage.set('Project mapping deleted.');
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to remove mapping.');
      }
    });
  }

  // --- Audit Trail Modal (Section 2.7) ---
  viewAuditTrail(dept: Department): void {
    this.selectedDeptForDetails.set(dept);
    this.deptService.loadAuditTrail(dept.id).subscribe({
      next: () => {
        this.isAuditModalOpen.set(true);
      }
    });
  }

  // --- Quick Create Dynamic Dropdowns (User Requirement 1 & 2) ---
  openQuickLookupModal(categoryCode: string): void {
    this.quickLookupCategoryCode.set(categoryCode);
    this.quickLookupEnName.set('');
    this.quickLookupBnName.set('');
    this.quickLookupColor.set('#10b981');
    this.isQuickLookupModalOpen.set(true);
  }

  submitQuickLookup(): void {
    const en = this.quickLookupEnName().trim();
    if (!en) {
      this.errorMessage.set('English name is required.');
      return;
    }

    this.isSubmittingQuickLookup.set(true);
    const cat = this.quickLookupCategoryCode();
    this.lookupService.quickCreate(cat, {
      item_name_en: en,
      item_name_bn: this.quickLookupBnName().trim() || undefined,
      color_badge: this.quickLookupColor()
    }).subscribe({
      next: () => {
        this.isSubmittingQuickLookup.set(false);
        this.isQuickLookupModalOpen.set(false);
        this.successMessage.set(`Lookup item '${en}' created successfully in ${cat}.`);
      },
      error: (err) => {
        this.isSubmittingQuickLookup.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to create lookup item.');
      }
    });
  }

  // Export to CSV / Excel
  exportDepartmentsCSV(): void {
    const list = this.filteredDepartments();
    const headers = [
      'Department ID',
      'Code',
      'Department Name',
      'Name (Bangla)',
      'Parent Department',
      'Company',
      'Operating Branch',
      'Department Head',
      'Cost Center ID',
      'Active Headcount',
      'Status'
    ];

    const rows = list.map(d => [
      d.id,
      `"${d.department_code}"`,
      `"${d.name_en}"`,
      `"${d.name_bn || ''}"`,
      `"${d.parent_department_name || 'Top-Level'}"`,
      `"${d.company_name || ''}"`,
      `"${d.branch_name || ''}"`,
      `"${d.head_of_dept_name || 'Unassigned'}"`,
      `"${d.cost_center_id || ''}"`,
      d.employee_count,
      d.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Department_Master_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.successMessage.set('Department list exported successfully.');
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
