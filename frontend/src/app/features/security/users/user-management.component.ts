import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, SecurityUser } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SecurityNavComponent,
    CardContainerComponent,
    ModalComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-security-nav />

      <!-- Top Filter & Search Bar -->
      <app-card title="User Accounts & Identity Directory" subtitle="Manage employee, contractor and partner access with multi-tenant company and project scoping">
        <div card-actions>
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Register New User
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search User</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadUsers()"
              placeholder="Username, Name or Email..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="USER_DEPARTMENT"
              label="Department Filter"
              placeholder="All Departments"
              [(ngModel)]="selectedDepartment"
              (ngModelChange)="loadUsers()"
              [options]="departmentOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="ROLE_CODE"
              label="Role Filter"
              placeholder="All Roles"
              [(ngModel)]="selectedRole"
              (ngModelChange)="loadUsers()"
              [options]="roleOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="ACCOUNT_STATUS"
              label="Account Lifecycle Status"
              placeholder="All Statuses"
              [(ngModel)]="selectedStatus"
              (ngModelChange)="loadUsers()"
              [options]="statusOptions"
              [allowCreateNew]="false"
            />
          </div>
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">User Code</th>
                <th class="p-3">User & Contact</th>
                <th class="p-3">Department & Designation</th>
                <th class="p-3">Primary Role</th>
                <th class="p-3 text-center">MFA</th>
                <th class="p-3">Last Login</th>
                <th class="p-3 text-center">Lifecycle Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="8" class="p-6 text-center text-slate-400">Loading user accounts...</td>
                </tr>
              } @else if (users.length === 0) {
                <tr>
                  <td colspan="8" class="p-6 text-center text-slate-400">No users found matching criteria.</td>
                </tr>
              } @else {
                @for (item of users; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {{ item.user_code }}
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.full_name_en }}</div>
                      <div class="text-[10px] text-slate-400">&#64;{{ item.username }} • {{ item.email }}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.department_name }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.designation }}</div>
                    </td>
                    <td class="p-3 font-medium text-indigo-600 dark:text-indigo-400">
                      {{ item.primary_role }}
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.is_mfa_enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'"
                        class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border"
                      >
                        {{ item.is_mfa_enabled ? 'ON' : 'OFF' }}
                      </span>
                    </td>
                    <td class="p-3 text-[11px] text-slate-500">
                      {{ item.last_login_at ? (item.last_login_at | date:'short') : 'Never' }}
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="{
                          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800': item.account_status === 'ACTIVE',
                          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800': item.account_status === 'INVITATION_PENDING' || item.account_status === 'DRAFT',
                          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800': item.account_status === 'SUSPENDED' || item.account_status === 'TERMINATED'
                        }"
                        class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      >
                        {{ item.account_status }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Edit User"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          (click)="toggleSuspendUser(item)"
                          [title]="item.account_status === 'ACTIVE' ? 'Suspend User' : 'Activate User'"
                          class="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/50 text-slate-400 hover:text-amber-600"
                        >
                          {{ item.account_status === 'ACTIVE' ? '⏸️' : '▶️' }}
                        </button>
                        <button
                          type="button"
                          (click)="deleteUser(item)"
                          title="Delete User"
                          class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} accounts</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="offset === 0"
              (click)="prevPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages || 1 }}</span>
            <button
              type="button"
              [disabled]="offset + limit >= totalRecords"
              (click)="nextPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Reusable Modal for Add / Edit User -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="isEditMode ? 'Edit User Profile & Roles' : 'Register New Enterprise User'"
        [subtitle]="'Assign department, designated role, reporting manager, and project scope access'"
        badge="Identity Management"
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

          <!-- Row 2: Full Names (En & Bn) -->
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
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name (বাংলা)</label>
              <input
                type="text"
                [(ngModel)]="formData.full_name_bn"
                placeholder="e.g. কামাল হোসেন"
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
                [options]="departmentOptions"
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

          <!-- Row 4: Primary Role & Reporting Manager -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="ROLE_CODE"
                label="Primary Role *"
                placeholder="Select primary role..."
                [(ngModel)]="formData.primary_role"
                [options]="roleOptions"
                [allowCreateNew]="false"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reporting Manager</label>
              <input
                type="text"
                [(ngModel)]="formData.reporting_manager"
                placeholder="e.g. Project Director / MD"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <!-- Row 5: Phone & Employee ID -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee ID</label>
              <input
                type="text"
                [(ngModel)]="formData.employee_id"
                placeholder="e.g. EMP-2025-081"
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
            <div>
              <app-searchable-select
                categoryCode="ACCOUNT_STATUS"
                label="Account Status"
                placeholder="Status..."
                [(ngModel)]="formData.account_status"
                [options]="statusOptions"
                [allowCreateNew]="false"
              />
            </div>
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveUser()"
            [disabled]="!formData.username || !formData.email || !formData.full_name_en"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ isEditMode ? 'Update User' : 'Save User' }}
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  private service = inject(SecurityService);

  Math = Math;
  users: SecurityUser[] = [];
  totalRecords = 0;
  limit = 20;
  offset = 0;
  loading = false;

  // Filter models
  searchQuery = '';
  selectedDepartment = '';
  selectedRole = '';
  selectedStatus = '';

  // Modal State
  isModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  formData: any = this.initFormData();

  // Searchable Select Options
  departmentOptions: SelectOption[] = [
    { value: 'Executive Management', label: 'Executive Management' },
    { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'Supply Chain & Procurement', label: 'Supply Chain & Procurement' },
    { value: 'Internal Audit', label: 'Internal Audit' }
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

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.service.getUsers({
      search: this.searchQuery,
      department: this.selectedDepartment,
      role: this.selectedRole,
      status_filter: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.users = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading = false;
      }
    });
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadUsers();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadUsers();
    }
  }

  initFormData(): any {
    return {
      username: '',
      email: '',
      full_name_en: '',
      full_name_bn: '',
      department_name: 'Construction Operations',
      designation: 'Project Manager',
      primary_role: 'PROJECT_MGR',
      reporting_manager: 'Project Director',
      phone_number: '',
      employee_id: '',
      account_status: 'ACTIVE'
    };
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = this.initFormData();
    this.isModalOpen = true;
  }

  openEditModal(user: SecurityUser): void {
    this.isEditMode = true;
    this.editingId = user.id;
    this.formData = { ...user };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveUser(): void {
    if (this.isEditMode && this.editingId) {
      this.service.updateUser(this.editingId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => console.error('Failed to update user', err)
      });
    } else {
      this.service.createUser(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => console.error('Failed to create user', err)
      });
    }
  }

  toggleSuspendUser(user: SecurityUser): void {
    const newStatus = user.account_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (confirm(`Are you sure you want to change status to ${newStatus} for @${user.username}?`)) {
      this.service.updateUserStatus(user.id, newStatus).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Failed to change user status', err)
      });
    }
  }

  deleteUser(user: SecurityUser): void {
    if (confirm(`Permanently remove user @${user.username} (${user.full_name_en}) from the system?`)) {
      this.service.deleteUser(user.id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Failed to delete user', err)
      });
    }
  }
}
