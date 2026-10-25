import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { HrmsPositionService } from '../../../core/services/hrms-position.service';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
  EducationRecord,
  ExperienceRecord,
  DocumentRecord
} from '../../../core/models/hrms-employee.model';
import { Project } from '../../../core/models/project.model';
import { LookupItem } from '../../../core/models/lookup.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  CustomTabsComponent,
  TabItem,
  ModalComponent,
  DrawerComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    DrawerComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  templateUrl: './employee-list.component.html'
})
export class EmployeeListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  employeeService = inject(HrmsEmployeeService);
  deptService = inject(HrmsDepartmentService);
  posService = inject(HrmsPositionService);
  orgService = inject(HrmsOrgService);
  projectService = inject(ProjectService);
  lookupService = inject(LookupService);

  // Main UI Navigation Tabs
  activeMainTab = signal<string>('directory');
  mainTabs = computed<TabItem[]>(() => [
    { id: 'directory', label: 'Workforce Directory 360°', count: this.employeeService.totalEmployees() },
    { id: 'documents', label: 'Employee Documents Vault', count: this.totalDocumentsCount() },
    { id: 'settings', label: 'Dynamic KYC & Dropdowns' }
  ]);

  // Workforce Category Filter Tabs
  workforceCategoryTab = signal<string>('ALL');
  workforceTabs = [
    { id: 'ALL', label: 'All Workforce' },
    { id: 'CORPORATE', label: 'Corporate Office' },
    { id: 'SITE_ENGINEERING', label: 'Site Operations & Engg' },
    { id: 'SITE_SUPERVISION', label: 'Site Supervision' }
  ];

  // Directory Search & Filters
  searchQuery = signal<string>('');
  filterDepartmentId = signal<number | null>(null);
  filterDesignationId = signal<number | null>(null);
  filterEmploymentType = signal<string | null>(null);
  filterStatus = signal<string | null>(null);

  // Pagination Signals
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);
  pageSizeOptions = [10, 20, 50, 100];

  // Feedback Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Drawer 360 State
  isDrawerOpen = signal<boolean>(false);
  selectedEmployee = signal<Employee | null>(null);
  drawerActiveTab = signal<string>('overview');

  // Add / Edit Modal State
  isModalOpen = signal<boolean>(false);
  modalMode = signal<'create' | 'edit'>('create');
  modalActiveTab = signal<string>('registration');
  isSaving = signal<boolean>(false);
  editingId = signal<number | null>(null);

  modalTabs = [
    { id: 'registration', label: '1.5 Registration' },
    { id: 'profile', label: '1.6 Profile & Emergency' },
    { id: 'employment', label: '1.7 Employment Details' },
    { id: 'compensation', label: 'Compensation & Bank' },
    { id: 'documents', label: '1.8 Documents' },
    { id: 'system', label: '1.9 & 1.10 Role & Status' }
  ];

  // Delete Confirmation Modal
  isDeleteModalOpen = signal<boolean>(false);
  employeeToDelete = signal<Employee | null>(null);
  isDeleting = signal<boolean>(false);

  // Appointment Letter State
  showAppointmentLetterModal = signal<boolean>(false);
  selectedLetterEmployee = signal<Employee | null>(null);
  isGeneratingAppointmentPdf = signal<boolean>(false);
  appointmentLetterPdfError = signal<string | null>(null);
  todayFormatted = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  currentYear = new Date().getFullYear();

  // Dynamic Settings Tab State
  activeSettingCategory = signal<string>('HR_EMPLOYMENT_TYPE');
  categoryItems = signal<LookupItem[]>([]);
  isLoadingCategoryItems = signal<boolean>(false);
  isQuickAddLookupModalOpen = signal<boolean>(false);
  newLookupItem = signal<{ code: string; name_en: string; name_bn: string; badge: string }>({
    code: '',
    name_en: '',
    name_bn: '',
    badge: '#10B981'
  });
  settingCategories = [
    { code: 'HR_EMPLOYMENT_TYPE', label: '1.5 Employment Types' },
    { code: 'HR_EMPLOYEE_STATUS', label: '1.10 Employee Statuses' },
    { code: 'HR_WORKFORCE_CATEGORY', label: 'Workforce Categories' },
    { code: 'HR_SYSTEM_ROLE', label: '1.9 System & ERP Roles' },
    { code: 'HR_DOCUMENT_TYPE', label: '1.8 Document Types' },
    { code: 'HR_MARITAL_STATUS', label: '1.6 Marital Statuses' },
    { code: 'HR_GENDER', label: '1.6 Gender Classifications' },
    { code: 'HR_BLOOD_GROUP', label: 'Blood Groups' },
    { code: 'HR_EMERGENCY_RELATION', label: 'Emergency Contact Relations' }
  ];

  // Reactive Project Cache
  projects = signal<Project[]>([]);

  // Default Form Payload
  private getInitialFormData(): EmployeeCreatePayload {
    return {
      employee_code: '',
      first_name: '',
      last_name: '',
      official_email: '',
      phone: '',
      personal_phone: '',
      gender: 'MALE',
      date_of_birth: '',
      marital_status: 'SINGLE',
      blood_group: 'A+',
      nid_number: '',
      tin_number: '',
      present_address: '',
      permanent_address: '',
      emergency_contact_name: '',
      emergency_contact_relation: 'SPOUSE',
      emergency_contact_phone: '',
      joining_date: new Date().toISOString().split('T')[0],
      confirmation_date: '',
      probation_months: 6,
      employment_type: 'PERMANENT',
      workforce_category: 'CORPORATE',
      status: 'ACTIVE',
      department_id: 0,
      designation_id: 0,
      reporting_to_id: undefined,
      assigned_project_id: undefined,
      company_id: undefined,
      branch_id: undefined,
      project_office_id: undefined,
      bank_account_no: '',
      bank_name: 'City Bank PLC',
      bank_branch: 'Gulshan Branch',
      routing_no: '',
      basic_salary: 50000,
      house_rent_allowance: 25000,
      medical_allowance: 5000,
      conveyance_allowance: 4000,
      site_hazard_allowance: 0,
      mobile_allowance: 2000,
      is_pf_eligible: true,
      is_tax_eligible: true,
      education: [],
      experience: [],
      documents: [],
      user_id: undefined,
      system_role: 'EMPLOYEE'
    };
  }

  formData = signal<EmployeeCreatePayload>(this.getInitialFormData());

  // In-modal sub-items
  newEducation = signal<EducationRecord>({ degree: '', institution: '', passing_year: '', result: '', major: '' });
  newExperience = signal<ExperienceRecord>({ company: '', designation: '', from_date: '', to_date: '', responsibility: '' });
  newDocument = signal<DocumentRecord>({
    document_type: 'APPOINTMENT_LETTER',
    title: '',
    file_url: '',
    file_name: '',
    uploaded_at: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // Computed Options for Searchable Selects
  departmentOptions = computed(() =>
    this.deptService.departments().map(d => ({
      value: d.id,
      label: d.name_en,
      subLabel: d.department_code
    }))
  );

  designationOptions = computed(() =>
    this.posService.designations().map(d => ({
      value: d.id,
      label: d.title_en,
      subLabel: `${d.designation_code} • ${d.department_name || ''}`
    }))
  );

  managerOptions = computed(() =>
    this.employeeService.employees().map(e => ({
      value: e.id,
      label: `${e.first_name} ${e.last_name}`,
      subLabel: `${e.employee_code} • ${e.designation_title || 'Employee'}`
    }))
  );

  companyOptions = computed(() =>
    this.orgService.companies().map(c => ({
      value: c.id,
      label: c.company_name,
      subLabel: c.company_code
    }))
  );

  branchOptions = computed(() =>
    this.orgService.branches().map(b => ({
      value: b.id,
      label: b.branch_name,
      subLabel: b.branch_code
    }))
  );

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: p.project_name,
      subLabel: p.project_code
    }))
  );

  // Dynamic Calculated Gross Salary
  calculatedGrossSalary = computed(() => {
    const f = this.formData();
    return (
      (Number(f.basic_salary) || 0) +
      (Number(f.house_rent_allowance) || 0) +
      (Number(f.medical_allowance) || 0) +
      (Number(f.conveyance_allowance) || 0) +
      (Number(f.site_hazard_allowance) || 0) +
      (Number(f.mobile_allowance) || 0)
    );
  });

  // Total Documents count across loaded employees
  totalDocumentsCount = computed(() => {
    let count = 0;
    for (const emp of this.employeeService.employees()) {
      if (emp.documents && Array.isArray(emp.documents)) {
        count += emp.documents.length;
      }
    }
    return count;
  });

  // Flattened documents for Documents Vault tab
  vaultDocuments = computed(() => {
    const docs: (DocumentRecord & { employee_code: string; employee_name: string; department: string })[] = [];
    for (const emp of this.employeeService.employees()) {
      if (emp.documents && Array.isArray(emp.documents)) {
        for (const doc of emp.documents) {
          docs.push({
            ...doc,
            employee_code: emp.employee_code,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            department: emp.department_name || 'General'
          });
        }
      }
    }
    return docs;
  });

  // Total pages
  totalPages = computed(() => Math.ceil(this.employeeService.totalEmployees() / this.pageSize()) || 1);

  // Pagination display range
  pageDisplayRange = computed(() => {
    const total = this.employeeService.totalEmployees();
    if (total === 0) return '0 of 0';
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start} - ${end} of ${total}`;
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'new' || last === 'add') {
        setTimeout(() => this.openCreateModal(), 200);
      } else if (last === 'documents') {
        this.activeMainTab.set('documents');
      } else if (last === 'profile' || last === 'personal-info' || last === 'emergency-contacts') {
        this.activeMainTab.set('directory');
        setTimeout(() => {
          const emps = this.employeeService.employees();
          if (emps.length > 0) this.openDrawer(emps[0]);
        }, 500);
      } else {
        this.successMessage.set(history.state?.hrmsNotice || null);
        this.activeMainTab.set('directory');
      }
    });
    this.loadEmployeesList();
    this.loadPrerequisites();
    this.loadSettingCategoryItems(this.activeSettingCategory());
  }

  // --- Initializers & Loaders ---
  loadPrerequisites(): void {
    this.deptService.loadDepartments().subscribe();
    this.posService.loadDesignations({ limit: 100 }).subscribe();
    this.orgService.loadCompanies().subscribe();
    this.orgService.loadBranches().subscribe();
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs || [])
    });
  }

  loadEmployeesList(): void {
    const offset = (this.currentPage() - 1) * this.pageSize();
    const cat = this.workforceCategoryTab() === 'ALL' ? undefined : this.workforceCategoryTab();

    this.employeeService.loadEmployees({
      limit: this.pageSize(),
      offset: offset,
      category: cat,
      department_id: this.filterDepartmentId() || undefined,
      designation_id: this.filterDesignationId() || undefined,
      employment_type: this.filterEmploymentType() || undefined,
      status: this.filterStatus() || undefined,
      search: this.searchQuery() || undefined
    }).subscribe({
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load employee records.');
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadEmployeesList();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterDepartmentId.set(null);
    this.filterDesignationId.set(null);
    this.filterEmploymentType.set(null);
    this.filterStatus.set(null);
    this.workforceCategoryTab.set('ALL');
    this.currentPage.set(1);
    this.loadEmployeesList();
  }

  setWorkforceTab(tab: string): void {
    this.workforceCategoryTab.set(tab);
    this.currentPage.set(1);
    this.loadEmployeesList();
  }

  // --- Pagination Methods ---
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadEmployeesList();
    }
  }

  changePageSize(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.currentPage.set(1);
    this.loadEmployeesList();
  }

  // --- Basic Salary Auto Calculation ---
  onBasicSalaryChange(newBasic: number): void {
    const basic = Number(newBasic) || 0;
    this.formData.update(f => ({
      ...f,
      basic_salary: basic,
      house_rent_allowance: Math.round(basic * 0.50),
      medical_allowance: Math.round(basic * 0.10)
    }));
  }

  // --- Add / Edit Page Navigation ---
  openCreateModal(): void {
    this.router.navigate(['/hrms/employees/new']);
  }

  openEditModal(emp: Employee): void {
    this.router.navigate(['/hrms/employees', emp.id, 'edit']);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  saveEmployee(): void {
    const payload = this.formData();
    if (!payload.first_name || !payload.first_name.trim()) {
      this.modalActiveTab.set('registration');
      this.errorMessage.set('First name is required.');
      return;
    }
    if (!payload.phone || !payload.phone.trim()) {
      this.modalActiveTab.set('registration');
      this.errorMessage.set('Primary phone number is required.');
      return;
    }
    if (!payload.department_id) {
      this.modalActiveTab.set('employment');
      this.errorMessage.set('Please select an operating Department.');
      return;
    }
    if (!payload.designation_id) {
      this.modalActiveTab.set('employment');
      this.errorMessage.set('Please select an official Designation.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    if (this.modalMode() === 'create') {
      this.employeeService.createEmployee(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.successMessage.set(`Employee ${created.employee_code} (${created.first_name} ${created.last_name}) registered successfully!`);
          this.loadEmployeesList();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to register employee.');
        }
      });
    } else {
      const id = this.editingId();
      if (!id) return;
      this.employeeService.updateEmployee(id, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.isModalOpen.set(false);
          this.successMessage.set(`Employee ${updated.employee_code} profile updated successfully!`);
          this.loadEmployeesList();
          if (this.selectedEmployee()?.id === id) {
            this.selectedEmployee.set(updated);
          }
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update employee.');
        }
      });
    }
  }

  // --- Sub-items dynamic handlers ---
  addEducationRecord(): void {
    const edu = this.newEducation();
    if (!edu.degree.trim() || !edu.institution.trim()) {
      alert('Degree and Institution are required.');
      return;
    }
    this.formData.update(f => ({
      ...f,
      education: [...(f.education || []), { ...edu }]
    }));
    this.newEducation.set({ degree: '', institution: '', passing_year: '', result: '', major: '' });
  }

  removeEducationRecord(index: number): void {
    this.formData.update(f => ({
      ...f,
      education: (f.education || []).filter((_, i) => i !== index)
    }));
  }

  addExperienceRecord(): void {
    const exp = this.newExperience();
    if (!exp.company.trim() || !exp.designation.trim()) {
      alert('Company and Designation are required.');
      return;
    }
    this.formData.update(f => ({
      ...f,
      experience: [...(f.experience || []), { ...exp }]
    }));
    this.newExperience.set({ company: '', designation: '', from_date: '', to_date: '', responsibility: '' });
  }

  removeExperienceRecord(index: number): void {
    this.formData.update(f => ({
      ...f,
      experience: (f.experience || []).filter((_, i) => i !== index)
    }));
  }

  addDocumentRecord(): void {
    const doc = this.newDocument();
    if (!doc.title.trim() || !doc.file_url.trim()) {
      alert('Document Title and File URL / Location are required.');
      return;
    }
    this.formData.update(f => ({
      ...f,
      documents: [...(f.documents || []), { ...doc }]
    }));
    this.newDocument.set({
      document_type: 'APPOINTMENT_LETTER',
      title: '',
      file_url: '',
      file_name: '',
      uploaded_at: new Date().toISOString().split('T')[0],
      remarks: ''
    });
  }

  removeDocumentRecord(index: number): void {
    this.formData.update(f => ({
      ...f,
      documents: (f.documents || []).filter((_, i) => i !== index)
    }));
  }

  // --- Drawer 360 View ---
  openDrawer(emp: Employee): void {
    this.selectedEmployee.set(emp);
    this.drawerActiveTab.set('overview');
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedEmployee.set(null);
  }

  // --- Delete Modal Controls ---
  confirmDelete(emp: Employee): void {
    this.employeeToDelete.set(emp);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.employeeToDelete.set(null);
  }

  executeDelete(): void {
    const emp = this.employeeToDelete();
    if (!emp) return;

    this.isDeleting.set(true);
    this.employeeService.deleteEmployee(emp.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteModalOpen.set(false);
        this.employeeToDelete.set(null);
        this.successMessage.set(`Employee ${emp.employee_code} deleted successfully.`);
        this.loadEmployeesList();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to delete employee.');
      }
    });
  }

  // --- Dynamic Settings Tab Logic ---
  selectSettingCategory(catCode: string): void {
    this.activeSettingCategory.set(catCode);
    this.loadSettingCategoryItems(catCode);
  }

  loadSettingCategoryItems(catCode: string): void {
    this.isLoadingCategoryItems.set(true);
    this.lookupService.getItems(catCode, true).subscribe({
      next: (items) => {
        this.categoryItems.set(items || []);
        this.isLoadingCategoryItems.set(false);
      },
      error: () => {
        this.isLoadingCategoryItems.set(false);
      }
    });
  }

  openQuickAddLookupModal(): void {
    this.newLookupItem.set({
      code: '',
      name_en: '',
      name_bn: '',
      badge: '#10B981'
    });
    this.isQuickAddLookupModalOpen.set(true);
  }

  closeQuickAddLookupModal(): void {
    this.isQuickAddLookupModalOpen.set(false);
  }

  saveQuickLookupItem(): void {
    const item = this.newLookupItem();
    if (!item.name_en.trim()) {
      alert('English name is required.');
      return;
    }

    const cat = this.activeSettingCategory();
    this.lookupService.quickCreate(cat, {
      item_name_en: item.name_en.trim(),
      item_name_bn: item.name_bn.trim() || item.name_en.trim(),
      color_badge: item.badge,
      item_code: item.code.trim().toUpperCase() || undefined
    }).subscribe({
      next: () => {
        this.isQuickAddLookupModalOpen.set(false);
        this.loadSettingCategoryItems(cat);
        this.successMessage.set(`New item added to ${cat} successfully!`);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to add lookup item.');
      }
    });
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  // --- Appointment Letter Methods ---
  openAppointmentLetter(emp: Employee): void {
    this.selectedLetterEmployee.set(emp);
    this.appointmentLetterPdfError.set(null);
    this.showAppointmentLetterModal.set(true);
  }

  closeAppointmentLetter(): void {
    this.showAppointmentLetterModal.set(false);
    this.selectedLetterEmployee.set(null);
    this.appointmentLetterPdfError.set(null);
  }

  printAppointmentLetter(): void {
    const printArea = document.getElementById('appointment-letter-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'height=800,width=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const empName = this.selectedLetterEmployee() ? `${this.selectedLetterEmployee()?.first_name} ${this.selectedLetterEmployee()?.last_name}` : 'Employee';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Letter - ${empName}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.5; font-size: 13.5px; margin: 0; padding: 15px; }
            h1, h2, h3, h4 { color: #000; margin-top: 0; }
            .header-org { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
            .header-org h2 { font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase; }
            .header-org p { font-size: 11px; margin: 2px 0 0; color: #555; }
            .meta-block { margin-bottom: 18px; line-height: 1.4; }
            .subject { font-weight: bold; font-size: 15px; text-decoration: underline; margin: 16px 0 12px; }
            .clause { margin-bottom: 14px; text-align: justify; }
            .clause-num { font-weight: bold; }
            .salary-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12.5px; }
            .salary-table th, .salary-table td { border: 1px solid #777; padding: 5px 8px; text-align: left; }
            .salary-table th { background: #f0f0f0; }
            .signature-row { margin-top: 45px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
            .signature-box { width: 45%; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 4px; font-size: 12px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${printArea.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  }

  async downloadAppointmentLetterPdf(): Promise<void> {
    const employee = this.selectedLetterEmployee();
    const printArea = document.getElementById('appointment-letter-print-area');
    if (!employee || !printArea || this.isGeneratingAppointmentPdf()) {
      if (!employee || !printArea) {
        this.appointmentLetterPdfError.set('The appointment letter is not available. Close and reopen it, then try again.');
      }
      return;
    }

    this.isGeneratingAppointmentPdf.set(true);
    this.appointmentLetterPdfError.set(null);
    let exportHost: HTMLDivElement | null = null;

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      exportHost = document.createElement('div');
      Object.assign(exportHost.style, {
        position: 'fixed',
        left: '-10000px',
        top: '0',
        width: '794px',
        backgroundColor: '#ffffff',
        pointerEvents: 'none',
        zIndex: '-1'
      });

      const documentClone = printArea.cloneNode(true) as HTMLElement;
      documentClone.id = 'appointment-letter-pdf-export-content';
      Object.assign(documentClone.style, {
        boxSizing: 'border-box',
        width: '794px',
        height: 'auto',
        maxHeight: 'none',
        overflow: 'visible',
        margin: '0',
        padding: '56px',
        border: '0',
        borderRadius: '0',
        boxShadow: 'none',
        backgroundColor: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '14px',
        lineHeight: '1.55'
      });
      exportHost.appendChild(documentClone);
      document.body.appendChild(exportHost);

      const canvas = await html2canvas(documentClone, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDocument) => {
          const clonedLetter = clonedDocument.getElementById('appointment-letter-pdf-export-content');
          if (clonedLetter) {
            clonedLetter.style.maxHeight = 'none';
            clonedLetter.style.height = 'auto';
            clonedLetter.style.overflow = 'visible';
          }
        }
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('The appointment letter could not be rendered.');
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const pageMargin = 15;
      const printableHeight = pageHeight - pageMargin * 2;
      const maxSliceHeight = Math.floor(canvas.width * printableHeight / pageWidth);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        throw new Error('Unable to prepare the appointment letter for PDF export.');
      }

      let pageStart = 0;
      let pageIndex = 0;
      while (pageStart < canvas.height) {
        const targetEnd = Math.min(pageStart + maxSliceHeight, canvas.height);
        const pageEnd = targetEnd < canvas.height
          ? this.findAppointmentPdfPageBreak(context, canvas.width, pageStart, targetEnd)
          : canvas.height;
        const sliceHeight = pageEnd - pageStart;
        if (sliceHeight <= 0) {
          throw new Error('Unable to paginate the appointment letter.');
        }

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const pageContext = pageCanvas.getContext('2d');
        if (!pageContext) {
          throw new Error('Unable to prepare an appointment letter page.');
        }
        pageContext.fillStyle = '#ffffff';
        pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageContext.drawImage(canvas, 0, pageStart, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        if (pageIndex > 0) {
          pdf.addPage();
        }
        const renderedHeight = sliceHeight * pageWidth / canvas.width;
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, pageMargin, pageWidth, renderedHeight);
        pageStart = pageEnd;
        pageIndex += 1;
      }

      pdf.save(this.getAppointmentLetterPdfFileName(employee));
    } catch (error) {
      console.error('Failed to generate the appointment letter PDF.', error);
      this.appointmentLetterPdfError.set(
        'Could not generate the A4 PDF. Please try again or use “Print / Save as PDF”.'
      );
    } finally {
      exportHost?.remove();
      this.isGeneratingAppointmentPdf.set(false);
    }
  }

  private findAppointmentPdfPageBreak(
    context: CanvasRenderingContext2D,
    canvasWidth: number,
    pageStart: number,
    targetEnd: number
  ): number {
    const searchRadius = Math.min(160, Math.floor((targetEnd - pageStart) / 5));
    const searchStart = Math.max(pageStart + 1, targetEnd - searchRadius);
    const searchEnd = Math.min(context.canvas.height - 1, targetEnd - 1);
    const image = context.getImageData(0, searchStart, canvasWidth, searchEnd - searchStart + 1);
    let bestRow = targetEnd;
    let fewestInkPixels = Number.POSITIVE_INFINITY;

    for (let row = 0; row < image.height; row += 1) {
      let inkPixels = 0;
      for (let column = 0; column < image.width; column += 6) {
        const pixel = (row * image.width + column) * 4;
        if (image.data[pixel] < 245 || image.data[pixel + 1] < 245 || image.data[pixel + 2] < 245) {
          inkPixels += 1;
        }
      }
      const rowPosition = searchStart + row;
      if (
        inkPixels < fewestInkPixels ||
        (inkPixels === fewestInkPixels && Math.abs(rowPosition - targetEnd) < Math.abs(bestRow - targetEnd))
      ) {
        fewestInkPixels = inkPixels;
        bestRow = rowPosition;
      }
    }

    return bestRow;
  }

  private getAppointmentLetterPdfFileName(employee: Employee): string {
    const toSafePart = (value: string): string => value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    const employeeName = toSafePart(`${employee.first_name} ${employee.last_name}`) || 'employee';
    const employeeIdentifier = toSafePart(employee.employee_code || '') || `${employee.id}`;
    return `appointment-letter-${employeeName}-${employeeIdentifier}.pdf`;
  }

  changeEmployeeStatus(emp: Employee, newStatus: string): void {
    if (!emp || !newStatus || emp.status === newStatus) return;
    this.employeeService.updateEmployeeStatus(emp.id, newStatus).subscribe({
      next: (updated) => {
        emp.status = updated.status;
        this.successMessage.set(`Status of ${emp.first_name} ${emp.last_name} changed to "${newStatus}" successfully!`);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to update employee status.');
      }
    });
  }

  getBasicSalary(emp: Employee): number {
    return Number(emp.basic_salary) || ((Number(emp.gross_salary) || 0) * 0.5);
  }

  getHouseRentAllowance(emp: Employee): number {
    return Number(emp.house_rent_allowance) || ((Number(emp.gross_salary) || 0) * 0.25);
  }

  getMedicalAllowance(emp: Employee): number {
    return Number(emp.medical_allowance) || ((Number(emp.gross_salary) || 0) * 0.10);
  }

  getConveyanceAllowance(emp: Employee): number {
    return Number(emp.conveyance_allowance) || ((Number(emp.gross_salary) || 0) * 0.08);
  }

  getOtherAllowances(emp: Employee): number {
    return (Number(emp.site_hazard_allowance) || 0) + (Number(emp.mobile_allowance) || 0);
  }
}
