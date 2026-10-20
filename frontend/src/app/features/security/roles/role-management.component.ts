import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, SecurityRole } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-role-management',
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
      <app-card title="Enterprise Roles & Job Responsibility Templates" subtitle="25 predefined Real Estate ERP roles with customized permission inheritance and scoping">
        <div card-actions>
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Create Custom Role
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Role</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="loadRoles()"
              placeholder="Role code or title..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="ROLE_DEPARTMENT"
              label="Department Filter"
              placeholder="All Departments"
              [(ngModel)]="selectedDepartment"
              (ngModelChange)="loadRoles()"
              [options]="departmentOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div class="flex items-end">
            <button
              type="button"
              (click)="loadRoles()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Apply Filter
            </button>
          </div>
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Role Code</th>
                <th class="p-3">Role Title</th>
                <th class="p-3">Department</th>
                <th class="p-3">Job Responsibilities</th>
                <th class="p-3 text-center">Type</th>
                <th class="p-3 text-center">Assigned Users</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="8" class="p-6 text-center text-slate-400">Loading roles...</td>
                </tr>
              } @else if (roles.length === 0) {
                <tr>
                  <td colspan="8" class="p-6 text-center text-slate-400">No roles found.</td>
                </tr>
              } @else {
                @for (item of roles; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {{ item.role_code }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.role_name }}
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">
                      {{ item.department || 'General' }}
                    </td>
                    <td class="p-3 max-w-[280px] truncate text-slate-500">
                      {{ item.description }}
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.is_system_role ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'"
                        class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold border"
                      >
                        {{ item.is_system_role ? 'SYSTEM' : 'CUSTOM' }}
                      </span>
                    </td>
                    <td class="p-3 text-center font-mono font-semibold text-indigo-600">
                      {{ item.assigned_users_count }}
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                        class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                      >
                        {{ item.is_active ? 'ACTIVE' : 'INACTIVE' }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Edit Role"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          (click)="cloneRole(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Clone Role Template"
                        >
                          📋
                        </button>
                        @if (!item.is_system_role) {
                          <button
                            type="button"
                            (click)="deleteRole(item)"
                            title="Delete Custom Role"
                            class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                          >
                            🗑️
                          </button>
                        }
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
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} roles</div>
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

      <!-- Reusable Modal for Add / Edit Role -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="isEditMode ? 'Edit Role Specification' : 'Create Custom Enterprise Role'"
        [subtitle]="'Define functional scope, department mapping and job description'"
        badge="Role Definition"
        size="lg"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Role Code *</label>
              <input
                type="text"
                [(ngModel)]="formData.role_code"
                [disabled]="isEditMode"
                placeholder="e.g. ASST_PROJECT_MGR"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50 uppercase focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Role Title *</label>
              <input
                type="text"
                [(ngModel)]="formData.role_name"
                placeholder="e.g. Assistant Project Manager"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <app-searchable-select
              categoryCode="ROLE_DEPARTMENT"
              label="Department *"
              placeholder="Select department..."
              [(ngModel)]="formData.department"
              [options]="departmentOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Responsibilities & Operational Scope</label>
            <textarea
              [(ngModel)]="formData.description"
              rows="3"
              placeholder="e.g. Daily site supervision, DPR preparation, material verification..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            ></textarea>
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
            (click)="saveRole()"
            [disabled]="!formData.role_code || !formData.role_name"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ isEditMode ? 'Update Role' : 'Save Role' }}
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class RoleManagementComponent implements OnInit {
  private service = inject(SecurityService);

  roles: SecurityRole[] = [];
  loading = false;
  Math = Math;

  searchQuery = '';
  selectedDepartment = '';

  // Pagination state
  limit = 20;
  offset = 0;
  totalRecords = 0;

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  isModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  formData = {
    role_code: '',
    role_name: '',
    department: 'Operations',
    description: '',
    is_active: true
  };

  departmentOptions: SelectOption[] = [
    { value: 'Executive', label: 'Executive Management' },
    { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
    { value: 'Governance', label: 'Governance & Compliance' },
    { value: 'Projects', label: 'Projects & Engineering' },
    { value: 'Land Acquisition', label: 'Land Acquisition' },
    { value: 'Legal & Statutory', label: 'Legal & Statutory' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Credit & Collection', label: 'Credit & Collection' },
    { value: 'Supply Chain', label: 'Supply Chain & Procurement' },
    { value: 'Internal Audit', label: 'Internal Audit' }
  ];

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading = true;
    this.service.getRoles({
      search: this.searchQuery,
      department: this.selectedDepartment,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.roles = res.items || [];
        this.totalRecords = res.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load roles', err);
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadRoles();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadRoles();
    }
  }

  deleteRole(role: SecurityRole): void {
    if (confirm(`Are you sure you want to delete custom role ${role.role_code} (${role.role_name})?`)) {
      this.service.deleteRole(role.id).subscribe({
        next: () => this.loadRoles(),
        error: (err) => console.error('Failed to delete role', err)
      });
    }
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = {
      role_code: '',
      role_name: '',
      department: 'Projects',
      description: '',
      is_active: true
    };
    this.isModalOpen = true;
  }

  openEditModal(role: SecurityRole): void {
    this.isEditMode = true;
    this.editingId = role.id;
    this.formData = {
      role_code: role.role_code,
      role_name: role.role_name,
      department: role.department || 'Projects',
      description: role.description || '',
      is_active: role.is_active
    };
    this.isModalOpen = true;
  }

  cloneRole(role: SecurityRole): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = {
      role_code: `${role.role_code}_COPY`,
      role_name: `${role.role_name} (Copy)`,
      department: role.department || 'Projects',
      description: role.description || '',
      is_active: true
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveRole(): void {
    if (this.isEditMode && this.editingId) {
      this.service.updateRole(this.editingId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRoles();
        },
        error: (err) => console.error('Failed to update role', err)
      });
    } else {
      this.service.createRole(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRoles();
        },
        error: (err) => console.error('Failed to create role', err)
      });
    }
  }
}
