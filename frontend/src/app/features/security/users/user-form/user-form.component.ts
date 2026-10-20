import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, SecurityUser } from '../../../../core/services/security.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-5xl mx-auto space-y-6">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span>&larr;</span> Back to User Accounts
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Identity Management
          </span>
        </div>
      </div>

      <!-- Main Form Card -->
      <app-card
        [title]="isEditMode ? 'Edit Enterprise User Profile' : 'Register New Enterprise User'"
        [subtitle]="isEditMode ? 'Modify employee information, role allocation and lifecycle status' : 'Assign department, designated role, reporting manager, and project scope access'"
      >
        @if (loadingData) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading user profile details...
          </div>
        } @else {
          <form (ngSubmit)="saveUser()" class="space-y-6 text-xs">
            <!-- Alert / Error message -->
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Section 1: Basic Identity & Account Credentials -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-rose-500 rounded-full"></span>
                Basic Identity & Account Credentials
              </h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.username"
                    name="username"
                    [disabled]="isEditMode"
                    placeholder="e.g. kamal_hossain"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    required
                  />
                  <p class="text-[10px] text-slate-400 mt-1">Unique system username used for authentication.</p>
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    [(ngModel)]="formData.email"
                    name="email"
                    [disabled]="isEditMode"
                    placeholder="e.g. kamal@blueoceansbd.com"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    required
                  />
                  <p class="text-[10px] text-slate-400 mt-1">Enterprise organizational email address.</p>
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English) *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.full_name_en"
                    name="full_name_en"
                    placeholder="e.g. Engr. Kamal Hossain"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (বাংলা)</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.full_name_bn"
                    name="full_name_bn"
                    placeholder="e.g. কামাল হোসেন"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <!-- Section 2: Organizational Unit & Role Scope -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Organizational Hierarchy & Role Assignment
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <app-searchable-select
                    label="Department *"
                    placeholder="Select department..."
                    [(ngModel)]="formData.department_name"
                    name="department_name"
                    [options]="departmentOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Designation *"
                    placeholder="Select or enter designation..."
                    [(ngModel)]="formData.designation"
                    name="designation"
                    [options]="designationOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Primary Security Role *"
                    placeholder="Select primary role..."
                    [(ngModel)]="formData.primary_role"
                    name="primary_role"
                    [options]="roleOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Reporting Manager"
                    placeholder="Select reporting manager..."
                    [(ngModel)]="formData.reporting_manager"
                    name="reporting_manager"
                    [options]="managerOptions"
                    [allowCreateNew]="true"
                  />
                </div>
              </div>
            </div>

            <!-- Section 3: Contact & Status -->
            <div class="pb-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Identification, Contact & Security Lifecycle
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.employee_id"
                    name="employee_id"
                    placeholder="e.g. EMP-2025-081"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.phone_number"
                    name="phone_number"
                    placeholder="e.g. +8801711000000"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Account Status *"
                    placeholder="Select status..."
                    [(ngModel)]="formData.account_status"
                    name="account_status"
                    [options]="statusOptions"
                    [allowCreateNew]="false"
                  />
                </div>
              </div>

              <!-- MFA Enforce Checkbox -->
              <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <label class="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.is_mfa_enabled"
                    name="is_mfa_enabled"
                    class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-700"
                  />
                  <div>
                    <span class="font-medium text-slate-700 dark:text-slate-300">Enforce Multi-Factor Authentication (MFA)</span>
                    <p class="text-[10px] text-slate-400">Requires OTP authentication during portal login</p>
                  </div>
                </label>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="goBack()"
                class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="isSaving || !formData.username || !formData.email || !formData.full_name_en"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update User Account' : 'Register User Account' }}</span>
                }
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class UserFormComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  userId: number | null = null;
  returnRoute = '/security/users';
  loadingData = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    username: '',
    email: '',
    full_name_en: '',
    full_name_bn: '',
    department_name: 'Executive Management',
    designation: '',
    primary_role: 'PROJECT_MGR',
    reporting_manager: '',
    employee_id: '',
    phone_number: '',
    account_status: 'ACTIVE',
    is_mfa_enabled: false
  };

  departmentOptions: SelectOption[] = [
    { value: 'Executive Management', label: 'Executive Management' },
    { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'Supply Chain & Procurement', label: 'Supply Chain & Procurement' },
    { value: 'Internal Audit', label: 'Internal Audit' }
  ];

  designationOptions: SelectOption[] = [
    { value: 'Managing Director', label: 'Managing Director (MD)' },
    { value: 'Project Director', label: 'Project Director (PD)' },
    { value: 'Chief Executive Officer', label: 'Chief Executive Officer (CEO)' },
    { value: 'Chief Operating Officer', label: 'Chief Operating Officer (COO)' },
    { value: 'Chief Financial Officer', label: 'Chief Financial Officer (CFO)' },
    { value: 'Head of Operations', label: 'Head of Operations' },
    { value: 'Head of Engineering', label: 'Head of Engineering' },
    { value: 'Head of Sales & Marketing', label: 'Head of Sales & Marketing' },
    { value: 'Senior Project Manager', label: 'Senior Project Manager' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Assistant Project Manager', label: 'Assistant Project Manager' },
    { value: 'Senior Civil Engineer', label: 'Senior Civil Engineer' },
    { value: 'Structural Engineer', label: 'Structural Engineer' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'Senior Architect', label: 'Senior Architect' },
    { value: 'Finance & Accounts Manager', label: 'Finance & Accounts Manager' },
    { value: 'Senior Accountant', label: 'Senior Accountant' },
    { value: 'Senior Sales Executive', label: 'Senior Sales Executive' },
    { value: 'Procurement Specialist', label: 'Procurement Specialist' },
    { value: 'HR & Admin Manager', label: 'HR & Admin Manager' },
    { value: 'IT Lead & System Administrator', label: 'IT Lead & System Administrator' },
    { value: 'Internal Auditor', label: 'Internal Auditor' },
    { value: 'Legal & Compliance Advisor', label: 'Legal & Compliance Advisor' }
  ];

  managerOptions: SelectOption[] = [
    { value: 'Engr. A. K. Azad', label: 'Engr. A. K. Azad (Managing Director)', subLabel: '@ak_azad' },
    { value: 'Tariqul Islam', label: 'Tariqul Islam (Project Director)', subLabel: '@tariqul' },
    { value: 'Engr. Kamal Hossain', label: 'Engr. Kamal Hossain (Head of Operations)', subLabel: '@kamal_hossain' },
    { value: 'Farhana Ahmed', label: 'Farhana Ahmed (Chief Financial Officer)', subLabel: '@farhana_cfo' },
    { value: 'Rafiqul Hassan', label: 'Rafiqul Hassan (Head of Construction)', subLabel: '@rafiqul' },
    { value: 'Shahidul Alam', label: 'Shahidul Alam (Head of Sales)', subLabel: '@shahidul' }
  ];

  roleOptions: SelectOption[] = [
    { value: 'SUPER_ADMIN', label: 'Super Administrator' },
    { value: 'SYS_ADMIN', label: 'System Administrator' },
    { value: 'MD', label: 'Managing Director' },
    { value: 'PROJECT_MGR', label: 'Project Manager' },
    { value: 'FIN_MGR', label: 'Finance Manager' },
    { value: 'SALES_MGR', label: 'Sales Manager' },
    { value: 'AUDITOR', label: 'Auditor' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'INVITATION_PENDING', label: 'INVITATION_PENDING' },
    { value: 'SUSPENDED', label: 'SUSPENDED' },
    { value: 'TERMINATED', label: 'TERMINATED' }
  ];

  ngOnInit(): void {
    this.loadManagerOptions();
    if (this.route.snapshot.queryParamMap.get('returnTo') === '/security/privileged-accounts') {
      this.returnRoute = '/security/privileged-accounts';
    }
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.userId = Number(idParam);
      this.isEditMode = true;
      this.loadUserData(this.userId);
    }
  }

  loadManagerOptions(): void {
    this.service.getUsers({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          const userOpts: SelectOption[] = res.items.map(u => ({
            value: u.full_name_en || u.username,
            label: `${u.full_name_en} (${u.designation || u.primary_role})`,
            subLabel: `@${u.username}`
          }));
          const existingValues = new Set(userOpts.map(o => o.value));
          const fallbackOpts = this.managerOptions.filter(o => !existingValues.has(o.value));
          this.managerOptions = [...userOpts, ...fallbackOpts];
        }
      },
      error: (err) => console.error('Failed to load user managers', err)
    });
  }

  loadUserData(id: number): void {
    this.loadingData = true;
    this.service.getUserById(id).subscribe({
      next: (user) => {
        this.formData = {
          username: user.username || '',
          email: user.email || '',
          full_name_en: user.full_name_en || '',
          full_name_bn: user.full_name_bn || '',
          department_name: user.department_name || '',
          designation: user.designation || '',
          primary_role: user.primary_role || 'PROJECT_MGR',
          reporting_manager: user.reporting_manager || '',
          employee_id: user.employee_id || '',
          phone_number: user.phone_number || '',
          account_status: user.account_status || 'ACTIVE',
          is_mfa_enabled: !!user.is_mfa_enabled
        };
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load user', err);
        this.errorMessage = 'Unable to load user details. Please check connection.';
        this.loadingData = false;
      }
    });
  }

  saveUser(): void {
    if (!this.formData.username || !this.formData.email || !this.formData.full_name_en) {
      this.errorMessage = 'Please complete all required fields marked with *';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    if (this.isEditMode && this.userId) {
      this.service.updateUser(this.userId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update user', err);
          this.errorMessage = err?.error?.detail || 'Failed to update user profile.';
          this.isSaving = false;
        }
      });
    } else {
      this.service.createUser(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to create user', err);
          this.errorMessage = err?.error?.detail || 'Failed to register new user.';
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigateByUrl(this.returnRoute);
  }
}
