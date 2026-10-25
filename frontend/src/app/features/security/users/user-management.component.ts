import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurityService, SecurityUser } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Top Filter & Search Bar -->
      <app-card title="User Accounts & Identity Directory">
        <div card-actions>
          <button
            type="button"
            (click)="navigateToCreate()"
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
              label="Department Filter"
              placeholder="All Departments"
              [(ngModel)]="selectedDepartment"
              (ngModelChange)="loadUsers()"
              [options]="departmentOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div>
            <app-searchable-select
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
                    <td class="p-3">
                      <div class="font-medium text-indigo-600 dark:text-indigo-400">{{ item.primary_role }}</div>
                      @if (item.assigned_roles && item.assigned_roles.length > 0) {
                        <div class="flex flex-wrap gap-1 mt-1">
                          @for (r of item.assigned_roles; track r) {
                            <span class="px-1.5 py-0.2 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-normal">
                              +{{ r }}
                            </span>
                          }
                        </div>
                      }
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
                          (click)="navigateToEdit(item)"
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
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);

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

  navigateToCreate(): void {
    this.router.navigate(['/security/users/create']);
  }

  navigateToEdit(user: SecurityUser): void {
    this.router.navigate(['/security/users', user.id, 'edit']);
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
