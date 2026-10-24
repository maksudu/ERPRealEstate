import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { ProjectService } from '../../../core/services/project.service';
import { HrmsService } from '../hrms.service';
import { Company, CompanyCreatePayload } from '../../../core/models/hrms-org.model';
import { Department } from '../../../core/models/hrms-department.model';
import { Project } from '../../../core/models/project.model';
import { Employee } from '../hrms.service';
import { CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent } from '../../../shared/components';

type MasterKind = 'companies' | 'branches' | 'project-offices' | 'departments';

@Component({
  selector: 'app-org-master-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent],
  template: `
    <main class="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-bold uppercase tracking-wider text-emerald-700">HRMS · Organization Master</p>
          <h1 class="mt-1 text-2xl font-black text-slate-900 dark:text-white">{{ editingId ? 'Update' : 'Register New' }} {{ title() }}</h1>
          <p class="mt-1 text-sm text-slate-500">Maintain organization records and their project relationships.</p>
        </div>
        <app-custom-button variant="outline" label="Back to list" (btnClick)="cancel()"></app-custom-button>
      </header>

      <div *ngIf="errorMessage" role="alert" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ errorMessage }}</div>
      <div *ngIf="successMessage" role="status" class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ successMessage }}</div>

      <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div *ngIf="loading" class="py-10 text-center text-sm text-slate-500">Loading master data…</div>
        <form *ngIf="!loading" (ngSubmit)="save()" class="space-y-6">
          <ng-container [ngSwitch]="kind">
            <ng-container *ngSwitchCase="'companies'">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-custom-input label="Company Code *" placeholder="e.g. BRE-01" [(ngModel)]="form.company_code" name="company_code" [required]="true"></app-custom-input>
                <app-custom-input label="Company Full Registered Name *" placeholder="e.g. ABC Real Estate Limited" [(ngModel)]="form.company_name" name="company_name" [required]="true"></app-custom-input>
                <app-custom-input label="Short / Display Name *" [(ngModel)]="form.short_name" name="short_name" [required]="true"></app-custom-input>
                <app-searchable-select categoryCode="COMPANY_TYPE" label="Company Classification Type *" [(ngModel)]="form.company_type" name="company_type" [required]="true"></app-searchable-select>
                <app-searchable-select [options]="companyOptions()" label="Parent Company (Optional)" [(ngModel)]="form.parent_company_id" name="parent_company_id"></app-searchable-select>
                <app-custom-input label="Country" [(ngModel)]="form.country" name="country"></app-custom-input>
                <app-searchable-select categoryCode="CURRENCY" label="Operating Currency" [(ngModel)]="form.currency" name="currency"></app-searchable-select>
                <app-searchable-select categoryCode="TIMEZONE" label="System Time Zone" [(ngModel)]="form.time_zone" name="time_zone"></app-searchable-select>
                <app-searchable-select categoryCode="FISCAL_YEAR_START" label="Financial Year Start" [(ngModel)]="form.financial_year_start_month" name="financial_year_start_month"></app-searchable-select>
                <app-custom-input label="Employee Prefix" [(ngModel)]="form.employee_code_prefix" name="employee_code_prefix"></app-custom-input>
                <app-custom-input label="Date Format" [(ngModel)]="form.date_format" name="date_format"></app-custom-input>
                <app-custom-input label="Number Format" [(ngModel)]="form.number_format" name="number_format"></app-custom-input>
                <app-searchable-select categoryCode="DEPARTMENT_STATUS" label="Status" [(ngModel)]="form.status" name="status"></app-searchable-select>
              </div>
            </ng-container>

            <ng-container *ngSwitchCase="'branches'">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-searchable-select [options]="companyOptions()" label="Company *" [(ngModel)]="form.company_id" name="company_id" [required]="true"></app-searchable-select>
                <app-custom-input label="Branch Code *" [(ngModel)]="form.branch_code" name="branch_code" [required]="true"></app-custom-input>
                <app-custom-input label="Branch Name *" [(ngModel)]="form.branch_name" name="branch_name" [required]="true"></app-custom-input>
                <app-searchable-select categoryCode="BRANCH_TYPE" label="Branch Type *" [(ngModel)]="form.branch_type" name="branch_type" [required]="true"></app-searchable-select>
                <app-searchable-select [options]="legalEntityOptions()" label="Legal Entity" [(ngModel)]="form.legal_entity_id" name="legal_entity_id"></app-searchable-select>
                <app-searchable-select [options]="employeeOptions()" label="Branch Manager" [(ngModel)]="form.manager_employee_id" name="manager_employee_id"></app-searchable-select>
                <app-custom-input label="Phone" [(ngModel)]="form.phone" name="phone"></app-custom-input>
                <app-custom-input label="Email" type="email" [(ngModel)]="form.email" name="email"></app-custom-input>
                <app-searchable-select categoryCode="BD_DIVISION" label="Division" [(ngModel)]="form.division" name="division"></app-searchable-select>
                <app-searchable-select categoryCode="BD_DISTRICT" label="District" [(ngModel)]="form.district" name="district"></app-searchable-select>
                <app-searchable-select categoryCode="BD_UPAZILA" label="Upazila / Thana" [(ngModel)]="form.upazila_thana" name="upazila_thana"></app-searchable-select>
                <app-custom-input label="Default Cost Center" [(ngModel)]="form.default_cost_center" name="default_cost_center"></app-custom-input>
                <app-searchable-select categoryCode="DEPARTMENT_STATUS" label="Status" [(ngModel)]="form.status" name="status"></app-searchable-select>
                <app-custom-textarea class="md:col-span-2" label="Address" [(ngModel)]="form.address" name="address" rows="2"></app-custom-textarea>
                <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="form.is_head_office" name="is_head_office"> Head office</label>
              </div>
            </ng-container>

            <ng-container *ngSwitchCase="'project-offices'">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-searchable-select [options]="companyOptions()" label="Company *" [(ngModel)]="form.company_id" name="company_id" [required]="true"></app-searchable-select>
                <app-searchable-select [options]="projectOptions()" label="Project *" [(ngModel)]="form.project_id" name="project_id" [required]="true"></app-searchable-select>
                <app-custom-input label="Office Code *" [(ngModel)]="form.office_code" name="office_code" [required]="true"></app-custom-input>
                <app-custom-input label="Office Name *" [(ngModel)]="form.office_name" name="office_name" [required]="true"></app-custom-input>
                <app-searchable-select categoryCode="PROJECT_OFFICE_TYPE" label="Office Type *" [(ngModel)]="form.office_type" name="office_type" [required]="true"></app-searchable-select>
                <app-searchable-select [options]="employeeOptions()" label="Site In-charge" [(ngModel)]="form.site_in_charge_employee_id" name="site_in_charge_employee_id"></app-searchable-select>
                <app-searchable-select categoryCode="PROJECT_OFFICE_STATUS" label="Operational Status" [(ngModel)]="form.operational_status" name="operational_status"></app-searchable-select>
                <app-custom-input label="Phone" [(ngModel)]="form.phone" name="phone"></app-custom-input>
                <app-custom-input label="Email" type="email" [(ngModel)]="form.email" name="email"></app-custom-input>
                <app-searchable-select categoryCode="BD_DIVISION" label="Division" [(ngModel)]="form.division" name="division"></app-searchable-select>
                <app-searchable-select categoryCode="BD_DISTRICT" label="District" [(ngModel)]="form.district" name="district"></app-searchable-select>
                <app-searchable-select categoryCode="BD_UPAZILA" label="Upazila / Thana" [(ngModel)]="form.upazila_thana" name="upazila_thana"></app-searchable-select>
                <app-custom-input label="Opening Date" type="date" [(ngModel)]="form.opening_date" name="opening_date"></app-custom-input>
                <app-custom-input label="Expected Closing Date" type="date" [(ngModel)]="form.expected_closing_date" name="expected_closing_date"></app-custom-input>
                <app-custom-input label="Default Cost Center" [(ngModel)]="form.default_cost_center" name="default_cost_center"></app-custom-input>
                <app-custom-textarea class="md:col-span-2" label="Address" [(ngModel)]="form.address" name="address" rows="2"></app-custom-textarea>
              </div>
            </ng-container>

            <ng-container *ngSwitchCase="'departments'">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <app-searchable-select [options]="companyOptions()" label="Company *" [(ngModel)]="form.company_id" name="company_id" [required]="true"></app-searchable-select>
                <app-custom-input label="Department Code *" [(ngModel)]="form.department_code" name="department_code" [required]="true"></app-custom-input>
                <app-custom-input label="Department Name (English) *" [(ngModel)]="form.name_en" name="name_en" [required]="true"></app-custom-input>
                <app-custom-input label="Department Name (Bangla)" [(ngModel)]="form.name_bn" name="name_bn"></app-custom-input>
                <app-searchable-select [options]="departmentOptions()" label="Parent Department" [(ngModel)]="form.parent_department_id" name="parent_department_id"></app-searchable-select>
                <app-searchable-select [options]="branchOptions()" label="Branch" [(ngModel)]="form.branch_id" name="branch_id"></app-searchable-select>
                <app-searchable-select [options]="employeeOptions()" label="Department Head" [(ngModel)]="form.head_of_dept_id" name="head_of_dept_id"></app-searchable-select>
                <app-custom-input label="Cost Center" [(ngModel)]="form.cost_center_id" name="cost_center_id"></app-custom-input>
                <app-custom-input label="Effective From" type="date" [(ngModel)]="form.effective_from" name="effective_from"></app-custom-input>
                <app-custom-input label="Effective To" type="date" [(ngModel)]="form.effective_to" name="effective_to"></app-custom-input>
                <app-searchable-select categoryCode="DEPARTMENT_STATUS" label="Status" [(ngModel)]="form.status" name="status"></app-searchable-select>
                <app-custom-textarea class="md:col-span-2" label="Description" [(ngModel)]="form.description" name="description" rows="3"></app-custom-textarea>
              </div>
            </ng-container>
          </ng-container>

          <footer class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="cancel()"></app-custom-button>
            <app-custom-button variant="primary" [label]="saving ? 'Saving…' : (editingId ? 'Update ' + title() : 'Save ' + title())" [disabled]="saving" type="submit"></app-custom-button>
          </footer>
        </form>
      </section>
    </main>
  `
})
export class OrgMasterFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private org = inject(HrmsOrgService);
  private departments = inject(HrmsDepartmentService);
  private projectsService = inject(ProjectService);
  private hrms = inject(HrmsService);

  kind: MasterKind = 'companies';
  editingId: number | null = null;
  loading = true;
  saving = false;
  errorMessage = '';
  successMessage = '';
  form: any = {};
  companies = signal<Company[]>([]);
  branches = signal<any[]>([]);
  legalEntities = signal<any[]>([]);
  departmentRows = signal<Department[]>([]);
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);

  title = computed(() => ({ companies: 'Company', branches: 'Branch', 'project-offices': 'Project Office', departments: 'Department' }[this.kind]));
  companyOptions = computed(() => this.companies().map(c => ({ value: c.id, label: `${c.company_name} (${c.company_code})` })));
  branchOptions = computed(() => this.branches().map(b => ({ value: b.id, label: `${b.branch_name} (${b.branch_code})` })));
  legalEntityOptions = computed(() => this.legalEntities().map(e => ({ value: e.id, label: `${e.registered_name} (${e.entity_code})` })));
  departmentOptions = computed(() => this.departmentRows().filter(d => d.id !== this.editingId).map(d => ({ value: d.id, label: `${d.name_en} (${d.department_code})` })));
  projectOptions = computed(() => this.projects().map(p => ({ value: p.id, label: `${p.project_name} (${p.project_code})` })));
  employeeOptions = computed(() => this.employees().map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name} (${e.employee_code})` })));

  ngOnInit(): void {
    this.kind = (this.route.snapshot.paramMap.get('entity') || this.route.snapshot.data['entity'] || 'companies') as MasterKind;
    this.editingId = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!['companies', 'branches', 'project-offices', 'departments'].includes(this.kind)) {
      this.cancel();
      return;
    }
    this.form = this.defaults();
    let pending = 0;
    const done = () => { pending--; if (!pending) this.loading = false; };
    pending++;
    this.org.loadCompanies().subscribe({ next: rows => { this.companies.set(rows); done(); }, error: err => this.failLoad(err, done) });
    pending++;
    this.org.loadBranches().subscribe({ next: rows => { this.branches.set(rows); done(); }, error: err => this.failLoad(err, done) });
    pending++;
    this.org.loadLegalEntities().subscribe({ next: rows => { this.legalEntities.set(rows); done(); }, error: err => this.failLoad(err, done) });
    pending++;
    this.departments.loadDepartments().subscribe({ next: rows => { this.departmentRows.set(rows); done(); }, error: err => this.failLoad(err, done) });
    pending++;
    this.projectsService.getProjects().subscribe({ next: rows => { this.projects.set(rows); done(); }, error: err => this.failLoad(err, done) });
    pending++;
    this.hrms.loadEmployees().subscribe({ next: rows => { this.employees.set(rows); done(); }, error: err => this.failLoad(err, done) });
    if (this.editingId) {
      pending++;
      this.loadRecord(this.editingId, done);
    }
  }

  private failLoad(err: any, done: () => void): void {
    this.errorMessage = err?.error?.detail || 'Could not load organization data.';
    done();
  }

  private defaults(): any {
    const today = new Date().toISOString().slice(0, 10);
    if (this.kind === 'companies') return { company_code: '', company_name: '', short_name: '', company_type: 'OPERATING_COMPANY', parent_company_id: null, country: 'Bangladesh', currency: 'BDT', time_zone: 'Asia/Dhaka', status: 'ACTIVE', default_language: 'en', financial_year_start_month: 7, date_format: 'DD/MM/YYYY', number_format: 'en-IN', employee_code_prefix: '', is_active: true } satisfies Partial<CompanyCreatePayload>;
    if (this.kind === 'branches') return { company_id: null, branch_code: '', branch_name: '', branch_type: '', legal_entity_id: null, manager_employee_id: null, phone: '', email: '', division: '', district: '', upazila_thana: '', address: '', is_head_office: false, opening_date: null, closing_date: null, default_cost_center: '', status: 'ACTIVE' };
    if (this.kind === 'project-offices') return { office_code: '', office_name: '', company_id: null, legal_entity_id: null, project_id: null, office_type: '', site_in_charge_employee_id: null, phone: '', email: '', division: '', district: '', upazila_thana: '', address: '', opening_date: null, expected_closing_date: null, operational_status: 'PLANNING', default_cost_center: '', supporting_documents: [] };
    return { company_id: null, department_code: '', name_en: '', name_bn: '', parent_department_id: null, head_of_dept_id: null, branch_id: null, cost_center_id: '', description: '', effective_from: today, effective_to: null, status: 'ACTIVE', approval_policies: {}, is_active: true };
  }

  private loadRecord(id: number, done: () => void): void {
    const apply = (rows: any[]) => {
      const record = rows.find(row => row.id === id);
      if (!record) this.errorMessage = `${this.title()} record not found.`;
      else this.form = { ...this.form, ...record };
      done();
    };
    const request: any = this.kind === 'companies' ? this.org.loadCompanies()
      : this.kind === 'branches' ? this.org.loadBranches()
      : this.kind === 'project-offices' ? this.org.loadProjectOffices()
      : this.departments.loadDepartments();
    request.subscribe({ next: apply, error: (err: any) => { this.errorMessage = err?.error?.detail || `Could not load ${this.title().toLowerCase()}.`; done(); } });
  }

  save(): void {
    this.errorMessage = '';
    if (!this.valid()) return;
    this.saving = true;
    let request: any;
    if (this.kind === 'companies') request = this.editingId ? this.org.updateCompany(this.editingId, this.form) : this.org.createCompany(this.form);
    else if (this.kind === 'branches') request = this.editingId ? this.org.updateBranch(this.editingId, this.form) : this.org.createBranch(this.form);
    else if (this.kind === 'project-offices') request = this.editingId ? this.org.updateProjectOffice(this.editingId, this.form) : this.org.createProjectOffice(this.form);
    else request = this.editingId ? this.departments.updateDepartment(this.editingId, this.form) : this.departments.createDepartment(this.form);
    request.subscribe({
      next: (record: any) => {
        const name = record.company_name || record.branch_name || record.office_name || record.name_en || this.title();
        this.router.navigate([this.listPath()], { state: { hrmsNotice: `${this.title()} '${name}' ${this.editingId ? 'updated' : 'created'} successfully.` } });
      },
      error: (err: any) => { this.saving = false; this.errorMessage = err?.error?.detail || `Failed to ${this.editingId ? 'update' : 'save'} ${this.title().toLowerCase()}.`; }
    });
  }

  private valid(): boolean {
    const required = this.kind === 'companies' ? ['company_code', 'company_name', 'short_name']
      : this.kind === 'branches' ? ['company_id', 'branch_code', 'branch_name', 'branch_type']
      : this.kind === 'project-offices' ? ['office_code', 'office_name', 'company_id', 'project_id', 'office_type']
      : ['company_id', 'department_code', 'name_en'];
    const missing = required.find(key => this.form[key] === null || this.form[key] === undefined || String(this.form[key]).trim() === '');
    if (missing) { this.errorMessage = `Please complete the required ${this.title().toLowerCase()} fields.`; return false; }
    return true;
  }

  cancel(): void { this.router.navigate([this.listPath()]); }

  private listPath(): string {
    return this.kind === 'departments' ? '/hrms/departments' : `/hrms/org/${this.kind}`;
  }
}
