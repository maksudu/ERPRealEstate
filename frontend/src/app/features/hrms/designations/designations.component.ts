import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HrmsPositionService } from '../../../core/services/hrms-position.service';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { HrmsService, Employee } from '../hrms.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  SalaryGrade,
  SalaryGradeCreatePayload,
  Designation,
  DesignationCreatePayload,
  Position,
  PositionCreatePayload
} from '../../../core/models/hrms-position.model';
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
  selector: 'app-designations',
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
  templateUrl: './designations.component.html'
})
export class DesignationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  posService = inject(HrmsPositionService);
  deptService = inject(HrmsDepartmentService);
  orgService = inject(HrmsOrgService);
  hrmsService = inject(HrmsService);
  projectService = inject(ProjectService);
  lookupService = inject(LookupService);

  // Active Tab
  activeTab = signal<string>('designations');
  tabs = computed<TabItem[]>(() => [
    { id: 'designations', label: 'Job Titles & Designations', count: this.posService.designationsTotal() },
    { id: 'grades', label: 'Salary Grades & Scales', count: this.posService.salaryGradesTotal() },
    { id: 'levels', label: 'Employee Levels & Bands' },
    { id: 'positions', label: 'Position Management (Sanctioned)', count: this.posService.positionsTotal() },
    { id: 'vacancies', label: 'Vacant Positions Pipeline', count: this.posService.positionStats()?.total_vacant || 0 },
    { id: 'settings', label: 'Dynamic Dropdown Settings' }
  ]);

  // Alert Feedback
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Employees & Projects store
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);

  // =========================================================
  // 1. Designation Filter & Pagination Signals
  // =========================================================
  desigSearch = signal<string>('');
  desigDeptFilter = signal<number | null>(null);
  desigGradeFilter = signal<number | null>(null);
  desigLevelFilter = signal<string | null>(null);
  desigActiveFilter = signal<boolean | null>(null);
  desigLimit = signal<number>(10);
  desigOffset = signal<number>(0);

  // =========================================================
  // 2. Salary Grade Filter & Pagination Signals
  // =========================================================
  gradeSearch = signal<string>('');
  gradeLevelFilter = signal<string | null>(null);
  gradeActiveFilter = signal<boolean | null>(null);
  gradeLimit = signal<number>(10);
  gradeOffset = signal<number>(0);

  // =========================================================
  // 3. Position Filter & Pagination Signals
  // =========================================================
  posSearch = signal<string>('');
  posDeptFilter = signal<number | null>(null);
  posDesigFilter = signal<number | null>(null);
  posStatusFilter = signal<string | null>(null);
  posTypeFilter = signal<string | null>(null);
  posProjectFilter = signal<number | null>(null);
  posBranchFilter = signal<number | null>(null);
  posLimit = signal<number>(10);
  posOffset = signal<number>(0);

  // Vacancy Filter
  vacancySearch = signal<string>('');
  vacancyDeptFilter = signal<number | null>(null);

  // =========================================================
  // Modals & Editing State
  // =========================================================
  isDesigModalOpen = signal<boolean>(false);
  editingDesigId = signal<number | null>(null);
  desigForm: DesignationCreatePayload = this.getEmptyDesigForm();

  isGradeModalOpen = signal<boolean>(false);
  editingGradeId = signal<number | null>(null);
  gradeForm: SalaryGradeCreatePayload = this.getEmptyGradeForm();

  isPosModalOpen = signal<boolean>(false);
  editingPosId = signal<number | null>(null);
  posForm: PositionCreatePayload = this.getEmptyPosForm();

  isOccupyModalOpen = signal<boolean>(false);
  occupyingPos = signal<Position | null>(null);
  occupyForm = {
    employee_id: null as number | null,
    remarks: ''
  };

  isVacateModalOpen = signal<boolean>(false);
  vacatingPos = signal<Position | null>(null);
  vacateRemarks = signal<string>('');

  // Delete modal
  isDeleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<{ type: 'DESIG' | 'GRADE' | 'POS'; id: number; name: string } | null>(null);

  // Quick lookup item modal
  isQuickLookupModalOpen = signal<boolean>(false);
  quickLookupCategory = signal<string>('EMPLOYEE_LEVEL');
  quickItemCode = signal<string>('');
  quickItemNameEn = signal<string>('');
  quickItemNameBn = signal<string>('');
  quickColorBadge = signal<string>('#10b981');

  // =========================================================
  // Dynamic Select Options (for SearchableSelectComponent)
  // =========================================================
  deptOptions = computed(() => {
    return this.deptService.departments().map(d => ({
      value: d.id,
      label: `${d.name_en} (${d.department_code})`,
      subLabel: `${d.status} • Company: ${d.company_name || 'N/A'}`
    }));
  });


  gradeOptions = computed(() => {
    return this.posService.salaryGrades().map(g => ({
      value: g.id,
      label: `${g.grade_name} (${g.grade_code})`,
      subLabel: `${g.employee_level} • Scale: ৳${g.min_salary.toLocaleString()} - ৳${g.max_salary.toLocaleString()}`
    }));
  });

  desigOptions = computed(() => {
    return this.posService.designations().map(d => ({
      value: d.id,
      label: `${d.title_en} (${d.designation_code})`,
      subLabel: `${d.department_name || 'Dept'} • ${d.employee_level}`
    }));
  });

  branchOptions = computed(() => {
    return this.orgService.branches().map(b => ({
      value: b.id,
      label: `${b.branch_name} (${b.branch_code})`,
      subLabel: b.is_head_office ? 'Head Office' : (b.branch_type || 'Branch')
    }));
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`,
      subLabel: `Status: ${p.status}`
    }));
  });

  employeeOptions = computed(() => {
    return this.employees().map(e => ({
      value: e.id,
      label: `${e.first_name} ${e.last_name} (${e.employee_code})`,
      subLabel: `${e.designation_title || 'Designation'} • ${e.department_name || 'Dept'}`
    }));
  });

  parentPosOptions = computed(() => {
    return this.posService.positions().map(p => ({
      value: p.id,
      label: `${p.position_title} (${p.position_code})`,
      subLabel: `${p.department_name || ''} • Status: ${p.status}`
    }));
  });

  // Employee Level Definitions (Static defaults + enhanced by settings)
  employeeLevels = [
    { code: 'C_SUITE', name: 'Apex Leadership (C-Suite & Board)', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { code: 'DIRECTOR', name: 'Executive Directors & Functional Chiefs', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { code: 'SR_MANAGEMENT', name: 'Senior Management (GM / DGM)', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { code: 'MID_MANAGEMENT', name: 'Mid Management (AGM / Project Managers)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { code: 'SITE_ENGINEER', name: 'Site Operations & Structural Engineers', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { code: 'OFFICER', name: 'Officers & Technical Executives', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { code: 'SUPPORT_STAFF', name: 'Operational & Support Crew', color: 'bg-slate-100 text-slate-800 border-slate-300' }
  ];

  levelOptions = computed(() => {
    return this.employeeLevels.map(l => ({
      value: l.code,
      label: l.name,
      subLabel: `Band: ${l.code}`
    }));
  });

  positionStatusOptions = [
    { value: 'APPROVED', label: 'Approved & Sanctioned', subLabel: 'Ready for allocation' },
    { value: 'FILLED', label: 'Filled / Occupied', subLabel: 'Employee assigned' },
    { value: 'VACANT', label: 'Vacant / Requisition Open', subLabel: 'Active recruitment' },
    { value: 'ON_HOLD', label: 'On Hold', subLabel: 'Budget temporarily reserved' },
    { value: 'FROZEN', label: 'Frozen / Retired', subLabel: 'Indefinitely closed' }
  ];

  positionTypeOptions = [
    { value: 'PERMANENT', label: 'Corporate Permanent', subLabel: 'Head office regular staff' },
    { value: 'CONTRACTUAL', label: 'Fixed Term Contract', subLabel: 'Project tenure contract' },
    { value: 'PROJECT_SITE', label: 'Project Site Execution', subLabel: 'Allocated to active project' }
  ];

  // Vacant positions computed list
  vacantPositions = computed(() => {
    const list = this.posService.positions().filter(p => p.status === 'VACANT');
    const term = this.vacancySearch().trim().toLowerCase();
    const deptId = this.vacancyDeptFilter();
    return list.filter(p => {
      const matchSearch = !term || p.position_code.toLowerCase().includes(term) || p.position_title.toLowerCase().includes(term);
      const matchDept = !deptId || p.department_id === deptId;
      return matchSearch && matchDept;
    });
  });

  // Level Matrix Statistics
  levelMatrix = computed(() => {
    const positions = this.posService.positions();
    const grades = this.posService.salaryGrades();
    return this.employeeLevels.map(lvl => {
      const matchedGrades = grades.filter(g => g.employee_level === lvl.code);
      const gradeIds = new Set(matchedGrades.map(g => g.id));
      const matchedPositions = positions.filter(p => p.salary_grade_id && gradeIds.has(p.salary_grade_id));
      const sanctioned = matchedPositions.length;
      const filled = matchedPositions.filter(p => p.status === 'FILLED').length;
      const vacant = matchedPositions.filter(p => p.status === 'VACANT').length;
      const totalBudget = matchedPositions.reduce((acc, p) => acc + Number(p.budgeted_salary || 0), 0);
      return {
        ...lvl,
        gradesCount: matchedGrades.length,
        sanctioned,
        filled,
        vacant,
        totalBudget,
        occupancyRate: sanctioned > 0 ? Math.round((filled / sanctioned) * 100) : 0
      };
    });
  });

  ngOnInit(): void {
    this.successMessage.set(history.state?.hrmsNotice || null);
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'grades') {
        this.activeTab.set('grades');
      } else {
        this.activeTab.set('designations');
      }
    });
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.loadDesignations();
    this.loadSalaryGrades();
    this.loadPositions();
    this.posService.loadPositionStats().subscribe();
    this.deptService.loadDepartments().subscribe();
    this.orgService.loadBranches().subscribe();

    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: () => {}
    });

    this.hrmsService.loadEmployees().subscribe({
      next: (res) => this.employees.set(res),
      error: () => {}
    });
  }

  // =========================================================
  // 1. Designation Methods
  // =========================================================
  loadDesignations(): void {
    this.posService.loadDesignations({
      limit: this.desigLimit(),
      offset: this.desigOffset(),
      department_id: this.desigDeptFilter(),
      salary_grade_id: this.desigGradeFilter(),
      employee_level: this.desigLevelFilter(),
      is_active: this.desigActiveFilter(),
      search: this.desigSearch() || null
    }).subscribe({
      error: (err) => this.showError(err?.error?.detail || 'Failed to load designations')
    });
  }

  onDesigPageChange(newOffset: number): void {
    this.desigOffset.set(newOffset);
    this.loadDesignations();
  }

  openCreateDesigModal(): void {
    this.router.navigate(['/hrms/designations/new']);
  }

  openEditDesigModal(d: Designation): void {
    this.router.navigate(['/hrms/designations', d.id, 'edit']);
  }

  saveDesignation(): void {
    if (!this.desigForm.title_en || !this.desigForm.designation_code || !this.desigForm.department_id) {
      this.showError('Please fill in required fields (Title EN, Code, Department).');
      return;
    }

    const editId = this.editingDesigId();
    if (editId) {
      this.posService.updateDesignation(editId, this.desigForm).subscribe({
        next: () => {
          this.showSuccess('Designation updated successfully!');
          this.isDesigModalOpen.set(false);
          this.loadDesignations();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to update designation.')
      });
    } else {
      this.posService.createDesignation(this.desigForm).subscribe({
        next: () => {
          this.showSuccess('Designation created successfully!');
          this.isDesigModalOpen.set(false);
          this.loadDesignations();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to create designation.')
      });
    }
  }

  // =========================================================
  // 2. Salary Grade Methods
  // =========================================================
  loadSalaryGrades(): void {
    this.posService.loadSalaryGrades({
      limit: this.gradeLimit(),
      offset: this.gradeOffset(),
      employee_level: this.gradeLevelFilter(),
      is_active: this.gradeActiveFilter(),
      search: this.gradeSearch() || null
    }).subscribe({
      error: (err) => this.showError(err?.error?.detail || 'Failed to load salary grades')
    });
  }

  onGradePageChange(newOffset: number): void {
    this.gradeOffset.set(newOffset);
    this.loadSalaryGrades();
  }

  openCreateGradeModal(): void {
    this.router.navigate(['/hrms/payroll/structures']);
  }

  openEditGradeModal(g: SalaryGrade): void {
    this.router.navigate(['/hrms/payroll/structures']);
  }

  saveSalaryGrade(): void {
    if (!this.gradeForm.grade_code || !this.gradeForm.grade_name) {
      this.showError('Grade Code and Grade Name are required.');
      return;
    }

    const editId = this.editingGradeId();
    if (editId) {
      this.posService.updateSalaryGrade(editId, this.gradeForm).subscribe({
        next: () => {
          this.showSuccess('Salary Grade updated successfully!');
          this.isGradeModalOpen.set(false);
          this.loadSalaryGrades();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to update salary grade.')
      });
    } else {
      this.posService.createSalaryGrade(this.gradeForm).subscribe({
        next: () => {
          this.showSuccess('Salary Grade created successfully!');
          this.isGradeModalOpen.set(false);
          this.loadSalaryGrades();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to create salary grade.')
      });
    }
  }

  // =========================================================
  // 3. Position Methods
  // =========================================================
  loadPositions(): void {
    this.posService.loadPositions({
      limit: this.posLimit(),
      offset: this.posOffset(),
      department_id: this.posDeptFilter(),
      designation_id: this.posDesigFilter(),
      status: this.posStatusFilter(),
      position_type: this.posTypeFilter(),
      project_id: this.posProjectFilter(),
      branch_id: this.posBranchFilter(),
      search: this.posSearch() || null
    }).subscribe({
      error: (err) => this.showError(err?.error?.detail || 'Failed to load positions')
    });
  }

  onPosPageChange(newOffset: number): void {
    this.posOffset.set(newOffset);
    this.loadPositions();
  }

  openCreatePosModal(): void {
    this.editingPosId.set(null);
    this.posForm = this.getEmptyPosForm();
    this.isPosModalOpen.set(true);
  }

  openEditPosModal(p: Position): void {
    this.editingPosId.set(p.id);
    this.posForm = {
      position_code: p.position_code,
      position_title: p.position_title,
      department_id: p.department_id,
      designation_id: p.designation_id,
      salary_grade_id: p.salary_grade_id || null,
      reports_to_position_id: p.reports_to_position_id || null,
      assigned_branch_id: p.assigned_branch_id || null,
      assigned_project_id: p.assigned_project_id || null,
      position_type: p.position_type,
      status: p.status,
      budgeted_salary: p.budgeted_salary,
      target_hire_date: p.target_hire_date || null,
      approved_date: p.approved_date || null,
      occupied_employee_id: p.occupied_employee_id || null,
      remarks: p.remarks
    };
    this.isPosModalOpen.set(true);
  }

  savePosition(): void {
    if (!this.posForm.position_code || !this.posForm.position_title || !this.posForm.department_id || !this.posForm.designation_id) {
      this.showError('Please fill in required fields (Position Code, Title, Department, Designation).');
      return;
    }

    const editId = this.editingPosId();
    if (editId) {
      this.posService.updatePosition(editId, this.posForm).subscribe({
        next: () => {
          this.showSuccess('Position updated successfully!');
          this.isPosModalOpen.set(false);
          this.loadPositions();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to update position.')
      });
    } else {
      this.posService.createPosition(this.posForm).subscribe({
        next: () => {
          this.showSuccess('Sanctioned Position created successfully!');
          this.isPosModalOpen.set(false);
          this.loadPositions();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to create position.')
      });
    }
  }

  // Occupy / Vacate Methods
  openOccupyModal(p: Position): void {
    this.occupyingPos.set(p);
    this.occupyForm = {
      employee_id: null,
      remarks: ''
    };
    this.isOccupyModalOpen.set(true);
  }

  confirmOccupy(): void {
    const pos = this.occupyingPos();
    if (!pos || !this.occupyForm.employee_id) {
      this.showError('Please select an employee to occupy this position.');
      return;
    }

    this.posService.occupyPosition(pos.id, {
      employee_id: this.occupyForm.employee_id,
      remarks: this.occupyForm.remarks
    }).subscribe({
      next: () => {
        this.showSuccess(`Position '${pos.position_title}' is now occupied!`);
        this.isOccupyModalOpen.set(false);
        this.loadPositions();
      },
      error: (err) => this.showError(err?.error?.detail || 'Failed to assign employee.')
    });
  }

  openVacateModal(p: Position): void {
    this.vacatingPos.set(p);
    this.vacateRemarks.set('');
    this.isVacateModalOpen.set(true);
  }

  confirmVacate(): void {
    const pos = this.vacatingPos();
    if (!pos) return;

    this.posService.vacatePosition(pos.id, this.vacateRemarks()).subscribe({
      next: () => {
        this.showSuccess(`Position '${pos.position_title}' has been vacated and moved to pipeline!`);
        this.isVacateModalOpen.set(false);
        this.loadPositions();
      },
      error: (err) => this.showError(err?.error?.detail || 'Failed to vacate position.')
    });
  }

  // =========================================================
  // Deletion Modal
  // =========================================================
  confirmDelete(type: 'DESIG' | 'GRADE' | 'POS', id: number, name: string): void {
    this.itemToDelete.set({ type, id, name });
    this.isDeleteModalOpen.set(true);
  }

  executeDelete(): void {
    const item = this.itemToDelete();
    if (!item) return;

    if (item.type === 'DESIG') {
      this.posService.deleteDesignation(item.id).subscribe({
        next: () => {
          this.showSuccess(`Designation '${item.name}' deleted successfully.`);
          this.isDeleteModalOpen.set(false);
          this.loadDesignations();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to delete designation.')
      });
    } else if (item.type === 'GRADE') {
      this.posService.deleteSalaryGrade(item.id).subscribe({
        next: () => {
          this.showSuccess(`Salary Grade '${item.name}' deleted successfully.`);
          this.isDeleteModalOpen.set(false);
          this.loadSalaryGrades();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to delete salary grade.')
      });
    } else if (item.type === 'POS') {
      this.posService.deletePosition(item.id).subscribe({
        next: () => {
          this.showSuccess(`Position '${item.name}' deleted successfully.`);
          this.isDeleteModalOpen.set(false);
          this.loadPositions();
        },
        error: (err) => this.showError(err?.error?.detail || 'Failed to delete position.')
      });
    }
  }

  // =========================================================
  // Dynamic Dropdown Settings (Quick Create Lookup)
  // =========================================================
  openQuickLookupModal(category: string): void {
    this.quickLookupCategory.set(category);
    this.quickItemCode.set('');
    this.quickItemNameEn.set('');
    this.quickItemNameBn.set('');
    this.quickColorBadge.set('#10b981');
    this.isQuickLookupModalOpen.set(true);
  }

  saveQuickLookup(): void {
    if (!this.quickItemNameEn().trim()) {
      this.showError('English Name is required.');
      return;
    }
    const cat = this.quickLookupCategory();
    const payload = {
      item_name_en: this.quickItemNameEn().trim(),
      item_name_bn: this.quickItemNameBn().trim() || undefined,
      color_badge: this.quickColorBadge()
    };

    this.lookupService.quickCreate(cat, payload).subscribe({
      next: () => {
        this.showSuccess(`New lookup option saved for ${cat}!`);
        this.isQuickLookupModalOpen.set(false);
        this.refreshAllData();
      },
      error: (err) => this.showError(err?.error?.detail || 'Failed to save lookup item.')
    });
  }

  // =========================================================
  // Helpers
  // =========================================================
  showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 6000);
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private getEmptyDesigForm(): DesignationCreatePayload {
    return {
      department_id: this.deptService.departments()[0]?.id || 1,
      designation_code: '',
      title_en: '',
      title_bn: '',
      salary_grade_id: null,
      grade_level: 'GRADE_4',
      employee_level: 'EXECUTIVE',
      min_salary: 25000,
      max_salary: 150000,
      description: '',
      is_active: true
    };
  }

  private getEmptyGradeForm(): SalaryGradeCreatePayload {
    return {
      grade_code: '',
      grade_name: '',
      employee_level: 'EXECUTIVE',
      min_salary: 30000,
      max_salary: 180000,
      default_house_rent_pct: 50,
      default_medical_allowance: 4000,
      default_conveyance: 5000,
      description: '',
      is_active: true
    };
  }

  private getEmptyPosForm(): PositionCreatePayload {
    return {
      position_code: '',
      position_title: '',
      department_id: this.deptService.departments()[0]?.id || 1,
      designation_id: this.posService.designations()[0]?.id || 1,
      salary_grade_id: null,
      reports_to_position_id: null,
      assigned_branch_id: null,
      assigned_project_id: null,
      position_type: 'PERMANENT',
      status: 'VACANT',
      budgeted_salary: 50000,
      target_hire_date: null,
      approved_date: new Date().toISOString().substring(0, 10),
      occupied_employee_id: null,
      remarks: ''
    };
  }
}
