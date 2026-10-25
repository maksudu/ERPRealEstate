import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { HrmsPositionService } from '../../../core/services/hrms-position.service';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  Employee,
  EmployeeCreatePayload,
  EducationRecord,
  ExperienceRecord,
  CertificationRecord,
  StatutoryAllowanceItem,
  DocumentRecord
} from '../../../core/models/hrms-employee.model';
import { Project } from '../../../core/models/project.model';
import { SalaryGrade } from '../../../core/models/hrms-position.model';
import {
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './employee-form.component.html'
})
export class EmployeeFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeeService = inject(HrmsEmployeeService);
  private deptService = inject(HrmsDepartmentService);
  posService = inject(HrmsPositionService);
  private orgService = inject(HrmsOrgService);
  private projectService = inject(ProjectService);

  // Form Mode & State
  mode = signal<'create' | 'edit'>('create');
  employeeId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Active Tab State
  activeTab = signal<string>('registration');
  tabs = [
    { id: 'registration', label: '1.5 Registration & Identity', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { id: 'profile', label: '1.6 Profile, Emergency & Nominee', icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0' },
    { id: 'employment', label: '1.7 Organization & Location', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'compensation', label: 'Compensation, Allowances & Bank', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'qualifications', label: 'Skills, Training & Certifications', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
    { id: 'documents', label: '1.8 Document Vault & Compliance', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'system', label: '1.9 & 1.10 Role, Status & Access', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' }
  ];

  // Feedback Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  isUploadingPhoto = signal<boolean>(false);

  // Compensation Signals
  selectedSalaryGradeId = signal<number | null>(null);

  // Dynamic Statutory Allowance Package Rows (as requested in screenshot)
  allowanceItems = signal<StatutoryAllowanceItem[]>([
    { name: 'House Rent Allowance', amount: 50, calculation_type: 'PERCENT' },
    { name: 'Medical Allowance', amount: 5000, calculation_type: 'FIXED' },
    { name: 'Conveyance Allowance', amount: 4000, calculation_type: 'FIXED' },
    { name: 'Mobile & Communication Allowance', amount: 2000, calculation_type: 'FIXED' }
  ]);

  calculationOptions = [
    { value: 'FIXED', label: 'Fixed amount (BDT)' },
    { value: 'PERCENT', label: 'Percentage (%) of Basic' }
  ];

  paymentMethodOptions = [
    { value: 'BANK', label: 'Bank Direct Transfer (BEFTN / NPSB / RTGS)' },
    { value: 'MFS_BKASH', label: 'bKash Mobile Financial Service' },
    { value: 'MFS_NAGAD', label: 'Nagad Mobile Financial Service' },
    { value: 'MFS_ROCKET', label: 'Rocket (DBBL) MFS' },
    { value: 'CASH', label: 'Petty Cash / Physical Disbursal' }
  ];

  documentTypeOptions = [
    { value: 'APPOINTMENT_LETTER', label: 'Appointment Letter' },
    { value: 'EMPLOYMENT_CONTRACT', label: 'Employment Contract & Agreement' },
    { value: 'NID_PASSPORT_COPY', label: 'National ID (NID) / Passport Copy' },
    { value: 'ACADEMIC_CERTIFICATE', label: 'Educational Certificates & Transcripts' },
    { value: 'EXPERIENCE_LETTER', label: 'Experience & Release Letters' },
    { value: 'JOINING_ACK_FORM', label: 'Joining Form & Policy Acknowledgement' },
    { value: 'CONFIRMATION_LETTER', label: 'Service Confirmation Letter' },
    { value: 'PROMOTION_INCREMENT_LETTER', label: 'Promotion / Increment / Revision Letter' },
    { value: 'TRANSFER_OFFICE_ORDER', label: 'Transfer / Station Allocation Order' },
    { value: 'DISCIPLINARY_RECORD', label: 'Disciplinary & Performance Record (Confidential)' },
    { value: 'TRAINING_LICENSE', label: 'Professional License (RAJUK / IEB / Driving)' },
    { value: 'RESIGNATION_CLEARANCE', label: 'Resignation, Clearance & Final Settlement' },
    { value: 'OTHER', label: 'Other Document' }
  ];

  // Projects Signal
  projects = signal<Project[]>([]);

  // Main Form Data Signal
  formData = signal<EmployeeCreatePayload>({
    employee_code: '',
    first_name: '',
    last_name: '',
    full_name_bn: '',
    photo_url: '',
    official_email: '',
    phone: '',
    personal_phone: '',
    gender: 'MALE',
    date_of_birth: '',
    marital_status: 'SINGLE',
    blood_group: 'A+',
    father_name: '',
    mother_name: '',
    spouse_name: '',
    nid_number: '',
    tin_number: '',
    passport_number: '',
    passport_expiry_date: '',
    present_address: '',
    permanent_address: '',
    emergency_contact_name: '',
    emergency_contact_relation: 'SPOUSE',
    emergency_contact_phone: '',
    nominee_name: '',
    nominee_relation: 'SPOUSE',
    nominee_phone: '',
    nominee_nid: '',
    joining_date: new Date().toISOString().split('T')[0],
    confirmation_date: '',
    probation_months: 6,
    employment_type: 'PERMANENT',
    workforce_category: 'CORPORATE',
    status: 'ACTIVE',
    department_id: 0,
    designation_id: 0,
    salary_grade_id: undefined,
    reporting_to_id: undefined,
    assigned_project_id: undefined,
    company_id: undefined,
    branch_id: undefined,
    project_office_id: undefined,
    work_location: 'Corporate Head Office - Dhaka',
    cost_center: 'CC-CORP-01',
    payment_method: 'BANK',
    bank_account_no: '',
    bank_name: 'City Bank PLC',
    bank_branch: 'Gulshan Branch',
    routing_no: '',
    mfs_provider: 'bKash',
    mfs_number: '',
    basic_salary: 50000,
    house_rent_allowance: 25000,
    medical_allowance: 5000,
    conveyance_allowance: 4000,
    site_hazard_allowance: 0,
    mobile_allowance: 2000,
    custom_allowances: [],
    is_pf_eligible: true,
    is_tax_eligible: true,
    education: [],
    experience: [],
    certifications: [],
    skills: ['Project Planning', 'Construction Management'],
    documents: [],
    user_id: undefined,
    system_role: 'EMPLOYEE'
  });

  // Dynamic In-form Sub-items
  newEducation = signal<EducationRecord>({ degree: '', institution: '', passing_year: '', result: '', major: '' });
  newExperience = signal<ExperienceRecord>({ company: '', designation: '', from_date: '', to_date: '', responsibility: '' });
  newCertification = signal<CertificationRecord>({ name: '', issuing_body: '', issue_date: '', expiry_date: '', license_number: '' });
  newSkillInput = signal<string>('');
  newDocument = signal<DocumentRecord>({
    document_type: 'APPOINTMENT_LETTER',
    title: '',
    file_url: '',
    file_name: '',
    uploaded_at: new Date().toISOString().split('T')[0],
    expiry_date: '',
    is_confidential: false,
    version: '1.0',
    remarks: ''
  });

  // Dropdown Options
  salaryGradeOptions = computed(() =>
    this.posService.salaryGrades().map(sg => ({
      value: sg.id,
      label: `${sg.grade_code} - ${sg.grade_name}`,
      subLabel: `৳${sg.min_salary?.toLocaleString()} - ৳${sg.max_salary?.toLocaleString()} • HR: ${sg.default_house_rent_pct}%`
    }))
  );

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

  // Dynamic Calculated Total Allowances & Gross Salary
  totalAllowances = computed(() => {
    const basic = Number(this.formData().basic_salary) || 0;
    return this.allowanceItems().reduce((sum, item) => {
      const amt = Number(item.amount) || 0;
      if (item.calculation_type === 'PERCENT') {
        return sum + Math.round(basic * (amt / 100));
      }
      return sum + amt;
    }, 0);
  });

  calculatedGrossSalary = computed(() => {
    const basic = Number(this.formData().basic_salary) || 0;
    return basic + this.totalAllowances();
  });

  // Active Grade Details
  activeSalaryGrade = computed(() => {
    const id = this.selectedSalaryGradeId();
    if (!id) return null;
    return this.posService.salaryGrades().find(g => g.id === id) || null;
  });

  ngOnInit(): void {
    this.loadPrerequisites();

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id) && id > 0) {
          this.mode.set('edit');
          this.employeeId.set(id);
          this.loadEmployeeData(id);
          return;
        }
      }
      this.mode.set('create');
      this.initCreateForm();
    });
  }

  private loadPrerequisites(): void {
    this.deptService.loadDepartments().subscribe();
    this.posService.loadDesignations({ limit: 100 }).subscribe();
    this.posService.loadSalaryGrades({ limit: 100 }).subscribe();
    this.orgService.loadCompanies().subscribe();
    this.orgService.loadBranches().subscribe();
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs || [])
    });
    this.employeeService.loadEmployees({ limit: 100 }).subscribe();
  }

  private initCreateForm(): void {
    const depts = this.deptService.departments();
    const desigs = this.posService.designations();
    const defaultDept = depts.length > 0 ? depts[0].id : 0;
    const defaultDesig = desigs.length > 0 ? desigs[0].id : 0;

    this.formData.update(f => ({
      ...f,
      department_id: f.department_id || defaultDept,
      designation_id: f.designation_id || defaultDesig
    }));
  }

  private loadEmployeeData(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.employeeService.getEmployee(id).subscribe({
      next: (emp: Employee) => {
        this.isLoading.set(false);
        this.selectedSalaryGradeId.set(emp.salary_grade_id || null);

        // Load custom allowances if present, else synthesize from existing fields
        if (emp.custom_allowances && emp.custom_allowances.length > 0) {
          this.allowanceItems.set(emp.custom_allowances);
        } else {
          const items: StatutoryAllowanceItem[] = [];
          if (emp.house_rent_allowance) items.push({ name: 'House Rent Allowance', amount: Number(emp.house_rent_allowance), calculation_type: 'FIXED' });
          if (emp.medical_allowance) items.push({ name: 'Medical Allowance', amount: Number(emp.medical_allowance), calculation_type: 'FIXED' });
          if (emp.conveyance_allowance) items.push({ name: 'Conveyance Allowance', amount: Number(emp.conveyance_allowance), calculation_type: 'FIXED' });
          if (emp.site_hazard_allowance) items.push({ name: 'Site Hazard Allowance', amount: Number(emp.site_hazard_allowance), calculation_type: 'FIXED' });
          if (emp.mobile_allowance) items.push({ name: 'Mobile & Communication Allowance', amount: Number(emp.mobile_allowance), calculation_type: 'FIXED' });
          if (items.length > 0) this.allowanceItems.set(items);
        }

        this.formData.set({
          employee_code: emp.employee_code,
          first_name: emp.first_name,
          last_name: emp.last_name,
          full_name_bn: emp.full_name_bn || '',
          photo_url: emp.photo_url || '',
          official_email: emp.official_email || '',
          phone: emp.phone,
          personal_phone: emp.personal_phone || '',
          gender: emp.gender || 'MALE',
          date_of_birth: emp.date_of_birth || '',
          marital_status: emp.marital_status || 'SINGLE',
          blood_group: emp.blood_group || 'A+',
          father_name: emp.father_name || '',
          mother_name: emp.mother_name || '',
          spouse_name: emp.spouse_name || '',
          nid_number: emp.nid_number || '',
          tin_number: emp.tin_number || '',
          passport_number: emp.passport_number || '',
          passport_expiry_date: emp.passport_expiry_date || '',
          present_address: emp.present_address || '',
          permanent_address: emp.permanent_address || '',
          emergency_contact_name: emp.emergency_contact_name || '',
          emergency_contact_relation: emp.emergency_contact_relation || 'SPOUSE',
          emergency_contact_phone: emp.emergency_contact_phone || '',
          nominee_name: emp.nominee_name || '',
          nominee_relation: emp.nominee_relation || 'SPOUSE',
          nominee_phone: emp.nominee_phone || '',
          nominee_nid: emp.nominee_nid || '',
          joining_date: emp.joining_date || '',
          confirmation_date: emp.confirmation_date || '',
          probation_months: emp.probation_months || 6,
          employment_type: emp.employment_type || 'PERMANENT',
          workforce_category: emp.workforce_category || 'CORPORATE',
          status: emp.status || 'ACTIVE',
          department_id: emp.department_id,
          designation_id: emp.designation_id,
          salary_grade_id: emp.salary_grade_id,
          reporting_to_id: emp.reporting_to_id,
          assigned_project_id: emp.assigned_project_id,
          company_id: emp.company_id,
          branch_id: emp.branch_id,
          project_office_id: emp.project_office_id,
          work_location: emp.work_location || 'Corporate Head Office - Dhaka',
          cost_center: emp.cost_center || 'CC-CORP-01',
          payment_method: emp.payment_method || 'BANK',
          bank_account_no: emp.bank_account_no || '',
          bank_name: emp.bank_name || 'City Bank PLC',
          bank_branch: emp.bank_branch || '',
          routing_no: emp.routing_no || '',
          mfs_provider: emp.mfs_provider || 'bKash',
          mfs_number: emp.mfs_number || '',
          basic_salary: Number(emp.basic_salary) || 0,
          house_rent_allowance: Number(emp.house_rent_allowance) || 0,
          medical_allowance: Number(emp.medical_allowance) || 0,
          conveyance_allowance: Number(emp.conveyance_allowance) || 0,
          site_hazard_allowance: Number(emp.site_hazard_allowance) || 0,
          mobile_allowance: Number(emp.mobile_allowance) || 0,
          custom_allowances: emp.custom_allowances || [],
          is_pf_eligible: emp.is_pf_eligible ?? true,
          is_tax_eligible: emp.is_tax_eligible ?? true,
          education: emp.education ? [...emp.education] : [],
          experience: emp.experience ? [...emp.experience] : [],
          certifications: emp.certifications ? [...emp.certifications] : [],
          skills: emp.skills ? [...emp.skills] : [],
          documents: emp.documents ? [...emp.documents] : [],
          user_id: emp.user_id,
          system_role: emp.system_role || 'EMPLOYEE'
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load employee details.');
      }
    });
  }

  // --- Dynamic Statutory Allowance Package Handlers (As shown in Screenshot) ---
  addAllowanceItem(): void {
    this.allowanceItems.update(items => [
      ...items,
      { name: '', amount: 0, calculation_type: 'FIXED' }
    ]);
  }

  removeAllowanceItem(index: number): void {
    this.allowanceItems.update(items => items.filter((_, i) => i !== index));
  }

  calculateItemEffectiveAmount(item: StatutoryAllowanceItem): number {
    const basic = Number(this.formData().basic_salary) || 0;
    const amt = Number(item.amount) || 0;
    if (item.calculation_type === 'PERCENT') {
      return Math.round(basic * (amt / 100));
    }
    return amt;
  }

  onSalaryGradeChange(gradeId: number | null): void {
    this.selectedSalaryGradeId.set(gradeId);
    this.formData.update(f => ({ ...f, salary_grade_id: gradeId || undefined }));

    if (!gradeId) return;
    const grade = this.posService.salaryGrades().find(g => g.id === gradeId);
    if (!grade) return;

    // Set basic if lower than min_salary
    const currentBasic = Number(this.formData().basic_salary) || 0;
    const targetBasic = currentBasic >= grade.min_salary && currentBasic <= grade.max_salary
      ? currentBasic
      : Number(grade.min_salary) || 50000;

    this.formData.update(f => ({
      ...f,
      basic_salary: targetBasic
    }));

    // If grade has defined allowance_package, use it
    if (grade.allowance_package && grade.allowance_package.length > 0) {
      this.allowanceItems.set(grade.allowance_package.map(a => ({
        name: a.name,
        amount: a.amount,
        calculation_type: a.calculation_type
      })));
    } else {
      // Default to statutory grade defaults
      this.allowanceItems.set([
        { name: 'House Rent', amount: Number(grade.default_house_rent_pct) || 50, calculation_type: 'PERCENT' },
        { name: 'Medical Allowance', amount: Number(grade.default_medical_allowance) || 2500, calculation_type: 'FIXED' },
        { name: 'Conveyance', amount: Number(grade.default_conveyance) || 3000, calculation_type: 'FIXED' }
      ]);
    }
  }

  // --- Qualifications: Certifications & Skills ---
  addCertificationRecord(): void {
    const c = this.newCertification();
    if (!c.name.trim() || !c.issuing_body.trim()) {
      this.errorMessage.set('Certification / License name and issuing body are required.');
      return;
    }
    this.errorMessage.set(null);
    this.formData.update(f => ({
      ...f,
      certifications: [...(f.certifications || []), { ...c }]
    }));
    this.newCertification.set({ name: '', issuing_body: '', issue_date: '', expiry_date: '', license_number: '' });
  }

  removeCertificationRecord(index: number): void {
    this.formData.update(f => ({
      ...f,
      certifications: (f.certifications || []).filter((_, i) => i !== index)
    }));
  }

  addSkill(): void {
    const s = this.newSkillInput().trim();
    if (!s) return;
    const current = this.formData().skills || [];
    if (!current.includes(s)) {
      this.formData.update(f => ({ ...f, skills: [...(f.skills || []), s] }));
    }
    this.newSkillInput.set('');
  }

  removeSkill(index: number): void {
    this.formData.update(f => ({
      ...f,
      skills: (f.skills || []).filter((_, i) => i !== index)
    }));
  }

  onPhotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.isUploadingPhoto.set(true);
    this.errorMessage.set(null);
    this.employeeService.uploadPhoto(file).subscribe({
      next: (res) => {
        this.formData.update(d => ({ ...d, photo_url: res.photo_url }));
        this.isUploadingPhoto.set(false);
        this.successMessage.set('Photograph uploaded successfully!');
      },
      error: (err) => {
        this.isUploadingPhoto.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to upload photograph');
      }
    });
  }

  // --- Sub-item Handlers (Education, Experience, Documents) ---
  addEducationRecord(): void {
    const edu = this.newEducation();
    if (!edu.degree.trim() || !edu.institution.trim()) {
      this.errorMessage.set('Degree title and institution name are required to add education record.');
      return;
    }
    this.errorMessage.set(null);
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
      this.errorMessage.set('Company name and designation are required to add experience record.');
      return;
    }
    this.errorMessage.set(null);
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
      this.errorMessage.set('Document title and file reference URL are required.');
      return;
    }
    this.errorMessage.set(null);
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
      expiry_date: '',
      is_confidential: false,
      version: '1.0',
      remarks: ''
    });
  }

  removeDocumentRecord(index: number): void {
    this.formData.update(f => ({
      ...f,
      documents: (f.documents || []).filter((_, i) => i !== index)
    }));
  }

  getDocumentExpiryStatus(expiryDate?: string): { text: string; css: string } {
    if (!expiryDate) return { text: 'No Expiry', css: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (diffDays < 0) {
      return { text: `Expired (${Math.abs(diffDays)}d ago)`, css: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' };
    }
    if (diffDays <= 30) {
      return { text: `Expires in ${diffDays}d`, css: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' };
    }
    return { text: `Valid until ${expiryDate}`, css: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' };
  }

  // --- Tab Navigation Helpers ---
  goToNextTab(): void {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTab());
    if (currentIndex < this.tabs.length - 1) {
      this.activeTab.set(this.tabs[currentIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToPrevTab(): void {
    const currentIndex = this.tabs.findIndex(t => t.id === this.activeTab());
    if (currentIndex > 0) {
      this.activeTab.set(this.tabs[currentIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- Save / Submit Form ---
  saveEmployee(): void {
    const payload = { ...this.formData() };

    // Attach custom allowance package & sync basic standard allowances
    const allowances = this.allowanceItems();
    payload.custom_allowances = allowances;

    // Sync standard columns for backwards compatibility
    const basic = Number(payload.basic_salary) || 0;
    let hr = 0, med = 0, conv = 0, site = 0, mob = 0;
    for (const item of allowances) {
      const eff = item.calculation_type === 'PERCENT' ? Math.round(basic * (Number(item.amount) / 100)) : Number(item.amount);
      const n = item.name.toLowerCase();
      if (n.includes('house') || n.includes('rent')) hr += eff;
      else if (n.includes('medic')) med += eff;
      else if (n.includes('convey') || n.includes('travel')) conv += eff;
      else if (n.includes('hazard') || n.includes('site')) site += eff;
      else if (n.includes('mobile') || n.includes('phone') || n.includes('comm')) mob += eff;
    }
    payload.house_rent_allowance = hr;
    payload.medical_allowance = med;
    payload.conveyance_allowance = conv;
    payload.site_hazard_allowance = site;
    payload.mobile_allowance = mob;
    payload.salary_grade_id = this.selectedSalaryGradeId() || undefined;

    // Client-side Validation
    if (!payload.first_name || !payload.first_name.trim()) {
      this.activeTab.set('registration');
      this.errorMessage.set('First name (English) is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!payload.phone || !payload.phone.trim()) {
      this.activeTab.set('registration');
      this.errorMessage.set('Primary phone number is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!payload.department_id) {
      this.activeTab.set('employment');
      this.errorMessage.set('Please select an operating Department.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!payload.designation_id) {
      this.activeTab.set('employment');
      this.errorMessage.set('Please select an official Designation.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.mode() === 'create') {
      this.employeeService.createEmployee(payload).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          const successNotice = `Employee ${created.employee_code} (${created.first_name} ${created.last_name}) registered successfully!`;
          this.router.navigate(['/hrms/employees/list'], {
            state: { hrmsNotice: successNotice }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to register employee. Please verify required fields.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    } else {
      const id = this.employeeId();
      if (!id) return;

      this.employeeService.updateEmployee(id, payload).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          const successNotice = `Employee ${updated.employee_code} (${updated.first_name} ${updated.last_name}) updated successfully!`;
          this.router.navigate(['/hrms/employees/list'], {
            state: { hrmsNotice: successNotice }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update employee profile.');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/hrms/employees/list']);
  }
}
