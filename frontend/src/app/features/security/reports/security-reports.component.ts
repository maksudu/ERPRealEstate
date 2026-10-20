import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-security-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    ModalComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Main Container without in-page section tabs or compliance banner -->
      <app-card
        [title]="cardTitle"
        [subtitle]="cardSubtitle"
      >
        <div card-actions class="flex items-center gap-2">
          @if (activeTab === 'user_access_matrix') {
            <button
              type="button"
              (click)="openAddModal()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
            >
              <span>+</span> Register User Access
            </button>
          }

          <button
            type="button"
            (click)="printReport()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs transition"
          >
            <span>🖨️</span> Print / Export PDF
          </button>
        </div>

        <!-- Filter Controls (for User Access Matrix) -->
        @if (activeTab === 'user_access_matrix') {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <!-- Search Filter -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Matrix</label>
              <div class="relative">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="onFilterChange()"
                  placeholder="Username, Name, Designation..."
                  class="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span class="absolute left-2.5 top-2 text-slate-400">🔍</span>
              </div>
            </div>

            <!-- Department Filter -->
            <div>
              <app-searchable-select
                categoryCode="USER_DEPARTMENT"
                label="Department"
                placeholder="All Departments..."
                [(ngModel)]="selectedDepartment"
                [options]="departmentOptions"
                (ngModelChange)="onFilterChange()"
              />
            </div>

            <!-- Role Filter -->
            <div>
              <app-searchable-select
                categoryCode="ROLE_CODE"
                label="Primary Role"
                placeholder="All Roles..."
                [(ngModel)]="selectedRole"
                [options]="roleOptions"
                (ngModelChange)="onFilterChange()"
              />
            </div>

            <!-- Status Filter -->
            <div>
              <app-searchable-select
                categoryCode="ACCOUNT_STATUS"
                label="Account Status"
                placeholder="All Statuses..."
                [(ngModel)]="selectedStatus"
                [options]="statusOptions"
                (ngModelChange)="onFilterChange()"
              />
            </div>
          </div>
        }

        <!-- Report Content Rendering -->
        @if (loading) {
          <div class="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <span class="animate-spin inline-block w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full"></span>
            Loading access matrix records...
          </div>
        } @else {
          <!-- 1. User Access Matrix Table -->
          @if (activeTab === 'user_access_matrix') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">User Code / Username</th>
                    <th class="p-3">Employee Name</th>
                    <th class="p-3">Department</th>
                    <th class="p-3">Designation</th>
                    <th class="p-3">Primary Role</th>
                    <th class="p-3 text-center">MFA</th>
                    <th class="p-3">Last Login</th>
                    <th class="p-3 text-center">Status</th>
                    <th class="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of reportData?.items; track item.id || item.username) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td class="p-3">
                        <span class="font-mono font-bold text-rose-600 block">&#64;{{ item.username }}</span>
                        <span class="text-[10px] text-slate-400 font-mono">{{ item.user_code }}</span>
                      </td>
                      <td class="p-3">
                        <div class="font-medium text-slate-900 dark:text-slate-100">{{ item.full_name }}</div>
                        <div class="text-[10px] text-slate-400">{{ item.email }}</div>
                      </td>
                      <td class="p-3 text-slate-700 dark:text-slate-300">{{ item.department }}</td>
                      <td class="p-3 text-slate-500">{{ item.designation }}</td>
                      <td class="p-3">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {{ item.primary_role }}
                        </span>
                      </td>
                      <td class="p-3 text-center">
                        <span
                          [ngClass]="item.mfa === 'Enabled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                          class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border"
                        >
                          {{ item.mfa }}
                        </span>
                      </td>
                      <td class="p-3 text-slate-500 text-[11px] whitespace-nowrap">{{ item.last_login }}</td>
                      <td class="p-3 text-center">
                        <span
                          [ngClass]="item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (item.status === 'SUSPENDED' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200')"
                          class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border"
                        >
                          {{ item.status }}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <div class="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            (click)="openEditModal(item)"
                            class="px-2 py-1 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            title="Edit User Access"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            (click)="deleteUser(item)"
                            class="px-2 py-1 rounded text-[11px] font-medium bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition"
                            title="Revoke / Delete Access"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="9" class="p-8 text-center text-slate-400 text-xs">
                        No user access matrix records found matching your filter criteria.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar with Limit & Offset -->
            <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
              <div class="flex items-center gap-2">
                <span>Showing <b>{{ startItemIndex }}</b> to <b>{{ endItemIndex }}</b> of <b>{{ totalCount }}</b> user accounts</span>
                <span class="text-slate-300">|</span>
                <label class="flex items-center gap-1">
                  <span>Per page:</span>
                  <select
                    [ngModel]="limit"
                    (ngModelChange)="onLimitChange($event)"
                    class="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
                  >
                    <option [value]="10">10</option>
                    <option [value]="25">25</option>
                    <option [value]="50">50</option>
                    <option [value]="100">100</option>
                  </select>
                </label>
              </div>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  [disabled]="offset === 0"
                  (click)="prevPage()"
                  class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Previous
                </button>
                <span class="px-2 font-medium">Page {{ currentPage }} of {{ totalPages }}</span>
                <button
                  type="button"
                  [disabled]="offset + limit >= totalCount"
                  (click)="nextPage()"
                  class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Next
                </button>
              </div>
            </div>
          }

        }
      </app-card>

      <!-- Reusable Modal for Add / Edit User Access (NO inline form beneath table!) -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="isEditMode ? 'Edit User Access & Role Assignment' : 'Register New User Access Profile'"
        [subtitle]="'Configure user credentials, department assignment, designated role and MFA compliance'"
        badge="Access Matrix"
        size="2xl"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <!-- Row 1: Username & Email -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
              <input
                type="text"
                [(ngModel)]="formData.username"
                [disabled]="isEditMode"
                placeholder="e.g. kamal_hossain"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                [(ngModel)]="formData.email"
                [disabled]="isEditMode"
                placeholder="e.g. kamal@blueoceansbd.com"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Row 2: Full Name & Phone -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (English) *</label>
              <input
                type="text"
                [(ngModel)]="formData.full_name_en"
                placeholder="e.g. Engr. Kamal Hossain"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                [(ngModel)]="formData.phone_number"
                placeholder="e.g. +8801711000000"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Row 3: Department & Designation -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="USER_DEPARTMENT"
                label="Department *"
                placeholder="Select department..."
                [(ngModel)]="formData.department_name"
                [options]="modalDepartmentOptions"
                [allowCreateNew]="true"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                [(ngModel)]="formData.designation"
                placeholder="e.g. Senior Project Manager"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Row 4: Primary Role & Status -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="ROLE_CODE"
                label="Primary Role *"
                placeholder="Select primary role..."
                [(ngModel)]="formData.primary_role"
                [options]="modalRoleOptions"
                [allowCreateNew]="false"
              />
            </div>
            <div>
              <app-searchable-select
                categoryCode="ACCOUNT_STATUS"
                label="Account Status *"
                placeholder="Status..."
                [(ngModel)]="formData.account_status"
                [options]="modalStatusOptions"
                [allowCreateNew]="false"
              />
            </div>
          </div>

          <!-- Row 5: MFA Enforcement Checkbox -->
          <div class="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div class="font-semibold text-slate-800 dark:text-slate-200">Enforce Multi-Factor Authentication (MFA)</div>
              <div class="text-[11px] text-slate-500">Require OTP code via Authenticator App on every login</div>
            </div>
            <input
              type="checkbox"
              [(ngModel)]="formData.is_mfa_enabled"
              class="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            [disabled]="isSaving"
            (click)="saveUser()"
            class="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-2xs transition disabled:opacity-50"
          >
            {{ isSaving ? 'Saving...' : (isEditMode ? 'Update Access Profile' : 'Save Access Profile') }}
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class SecurityReportsComponent implements OnInit {
  private service = inject(SecurityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab = 'user_access_matrix';
  reportData: any = null;
  loading = false;

  // Filter & Pagination States
  searchQuery = '';
  selectedDepartment = 'ALL';
  selectedRole = 'ALL';
  selectedStatus = 'ALL';
  limit = 25;
  offset = 0;
  totalCount = 0;

  // Modal CRUD States
  isModalOpen = false;
  isEditMode = false;
  isSaving = false;
  editingUserId: number | null = null;

  formData = {
    username: '',
    email: '',
    full_name_en: '',
    phone_number: '',
    department_name: 'Engineering & Site Operations',
    designation: 'Project Executive',
    primary_role: 'Project Manager',
    account_status: 'ACTIVE',
    is_mfa_enabled: false
  };

  // Filter Dropdown Options
  departmentOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Departments' },
    { value: 'Engineering & Site Operations', label: 'Engineering & Site Operations' },
    { value: 'Accounts, Finance & Tax', label: 'Accounts, Finance & Tax' },
    { value: 'Legal, Land & Regulatory', label: 'Legal, Land & Regulatory' },
    { value: 'Sales, CRM & Customer Handover', label: 'Sales, CRM & Customer Handover' },
    { value: 'Procurement & Supply Chain', label: 'Procurement & Supply Chain' },
    { value: 'Human Resources & Admin', label: 'Human Resources & Admin' },
    { value: 'Executive Board & Strategy', label: 'Executive Board & Strategy' }
  ];

  roleOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Roles' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'Chief Financial Officer', label: 'Chief Financial Officer' },
    { value: 'Accounts Manager', label: 'Accounts Manager' },
    { value: 'Senior Legal Officer', label: 'Senior Legal Officer' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Procurement Officer', label: 'Procurement Officer' },
    { value: 'HR Manager', label: 'HR Manager' },
    { value: 'Managing Director', label: 'Managing Director' },
    { value: 'System Administrator', label: 'System Administrator' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'TEMPORARILY_LOCKED', label: 'Locked' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  modalDepartmentOptions: SelectOption[] = [
    { value: 'Engineering & Site Operations', label: 'Engineering & Site Operations' },
    { value: 'Accounts, Finance & Tax', label: 'Accounts, Finance & Tax' },
    { value: 'Legal, Land & Regulatory', label: 'Legal, Land & Regulatory' },
    { value: 'Sales, CRM & Customer Handover', label: 'Sales, CRM & Customer Handover' },
    { value: 'Procurement & Supply Chain', label: 'Procurement & Supply Chain' },
    { value: 'Human Resources & Admin', label: 'Human Resources & Admin' },
    { value: 'Executive Board & Strategy', label: 'Executive Board & Strategy' }
  ];

  modalRoleOptions: SelectOption[] = [
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'Chief Financial Officer', label: 'Chief Financial Officer' },
    { value: 'Accounts Manager', label: 'Accounts Manager' },
    { value: 'Senior Legal Officer', label: 'Senior Legal Officer' },
    { value: 'Sales Executive', label: 'Sales Executive' },
    { value: 'Procurement Officer', label: 'Procurement Officer' },
    { value: 'HR Manager', label: 'HR Manager' },
    { value: 'Managing Director', label: 'Managing Director' },
    { value: 'System Administrator', label: 'System Administrator' },
    { value: 'SUPER_ADMIN', label: 'Super Admin' }
  ];

  modalStatusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'TEMPORARILY_LOCKED', label: 'Locked' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  get cardTitle(): string {
    return 'User Access & Role Assignment Matrix';
  }

  get cardSubtitle(): string {
    return 'Identity directory, department permissions, primary roles and lifecycle status with backend pagination';
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'privileged_accounts') {
        this.router.navigate(['/security/privileged-accounts'], { replaceUrl: true });
        return;
      }
      if (params['tab'] === 'threat_analytics') {
        this.router.navigate(['/security/threat-analytics'], { replaceUrl: true });
        return;
      }
      this.activeTab = 'user_access_matrix';
      this.offset = 0;
      this.loadReport();
    });
  }

  loadReport(): void {
    this.loading = true;
    const filter = {
      search: this.searchQuery?.trim() || undefined,
      department: this.selectedDepartment !== 'ALL' ? this.selectedDepartment : undefined,
      role: this.selectedRole !== 'ALL' ? this.selectedRole : undefined,
      status_filter: this.selectedStatus !== 'ALL' ? this.selectedStatus : undefined,
      limit: this.limit,
      offset: this.offset
    };

    this.service.getReports(this.activeTab, filter).subscribe({
      next: (data) => {
        this.reportData = data;
        this.totalCount = data?.total !== undefined ? data.total : (data?.items?.length || 0);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load security report', err);
        this.loading = false;
      }
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadReport();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadReport();
    }
  }

  prevPage(): void {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadReport();
    }
  }

  onLimitChange(val: any): void {
    this.limit = Number(val);
    this.offset = 0;
    this.loadReport();
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.limit) || 1;
  }

  get startItemIndex(): number {
    return this.totalCount === 0 ? 0 : this.offset + 1;
  }

  get endItemIndex(): number {
    return Math.min(this.offset + this.limit, this.totalCount);
  }

  // Modal Actions
  openAddModal(): void {
    this.isEditMode = false;
    this.editingUserId = null;
    this.formData = {
      username: '',
      email: '',
      full_name_en: '',
      phone_number: '',
      department_name: 'Engineering & Site Operations',
      designation: 'Project Executive',
      primary_role: 'Project Manager',
      account_status: 'ACTIVE',
      is_mfa_enabled: false
    };
    this.isModalOpen = true;
  }

  openEditModal(item: any): void {
    this.isEditMode = true;
    this.editingUserId = item.id;
    this.formData = {
      username: item.username,
      email: item.email || `${item.username}@blueoceansbd.com`,
      full_name_en: item.full_name || '',
      phone_number: item.phone_number || '',
      department_name: item.department || 'Engineering & Site Operations',
      designation: item.designation || 'Project Executive',
      primary_role: item.primary_role || 'Project Manager',
      account_status: item.status || 'ACTIVE',
      is_mfa_enabled: item.is_mfa_enabled !== undefined ? item.is_mfa_enabled : (item.mfa === 'Enabled')
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isSaving = false;
  }

  saveUser(): void {
    if (!this.formData.username?.trim() || !this.formData.full_name_en?.trim() || !this.formData.email?.trim()) {
      alert('Please fill in all required fields (Username, Full Name, Email).');
      return;
    }
    this.isSaving = true;
    if (this.isEditMode && this.editingUserId) {
      this.service.updateUser(this.editingUserId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadReport();
        },
        error: (err) => {
          console.error('Failed to update user', err);
          alert('Failed to update user: ' + (err.error?.detail || err.message));
          this.isSaving = false;
        }
      });
    } else {
      this.service.createUser(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.closeModal();
          this.loadReport();
        },
        error: (err) => {
          console.error('Failed to create user', err);
          alert('Failed to create user: ' + (err.error?.detail || err.message));
          this.isSaving = false;
        }
      });
    }
  }

  deleteUser(item: any): void {
    if (!confirm(`Are you sure you want to revoke access and delete user @${item.username} (${item.full_name})?`)) {
      return;
    }
    this.service.deleteUser(item.id).subscribe({
      next: () => {
        this.loadReport();
      },
      error: (err) => {
        console.error('Failed to delete user', err);
        alert('Failed to delete user: ' + (err.error?.detail || err.message));
      }
    });
  }

  printReport(): void {
    window.print();
  }
}
