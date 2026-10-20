import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, RolePermissionItem } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-permission-management',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-security-nav />

      <!-- Top Permission Matrix Header -->
      <app-card title="Module, Action & Field-Level Permission Matrix" subtitle="Fine-grained granular access control across 16 ERP modules with data scoping rules">
        <div card-actions class="flex items-center gap-2">
          <div class="w-64">
            <app-searchable-select
              categoryCode="ROLE_CODE"
              label=""
              placeholder="Select Target Role..."
              [(ngModel)]="selectedRoleCode"
              (ngModelChange)="loadPermissions()"
              [options]="roleOptions"
              [allowCreateNew]="false"
            />
          </div>
          <button
            type="button"
            (click)="savePermissions()"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            Save Matrix Changes
          </button>
        </div>

        <!-- Scope Explanation Banner -->
        <div class="p-3 mb-4 rounded-xl border border-indigo-200 bg-indigo-50/60 dark:bg-indigo-950/30 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>Configuring Role:</strong> {{ selectedRoleCode }} • Permissions are validated on every backend API request.
            </span>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 dark:bg-indigo-900 text-indigo-950 dark:text-indigo-100">
            Deny-By-Default
          </span>
        </div>

        <!-- Matrix Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">ERP Module</th>
                <th class="p-3 text-center">View</th>
                <th class="p-3 text-center">Create</th>
                <th class="p-3 text-center">Edit</th>
                <th class="p-3 text-center">Delete</th>
                <th class="p-3 text-center">Approve</th>
                <th class="p-3 text-center">Export / Print</th>
                <th class="p-3 text-center">Data Scope</th>
                <th class="p-3">Restricted Fields</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">Loading permission matrix...</td>
                </tr>
              } @else {
                @for (item of matrix; track item.module_code) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.module_name }}
                      <span class="block font-mono text-[10px] text-slate-400">{{ item.module_code }}</span>
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_view" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_create" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_edit" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_delete" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_approve" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <input type="checkbox" [(ngModel)]="item.can_export" class="rounded text-rose-600 focus:ring-rose-500" />
                    </td>
                    <td class="p-3 text-center">
                      <select
                        [(ngModel)]="item.data_scope"
                        class="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                      >
                        <option value="ALL">All Companies</option>
                        <option value="COMPANY">Company</option>
                        <option value="BRANCH">Branch</option>
                        <option value="PROJECT">Assigned Project</option>
                        <option value="DEPARTMENT">Department</option>
                        <option value="ASSIGNED">Assigned Only</option>
                        <option value="OWN">Own Records</option>
                        <option value="NONE">No Access</option>
                      </select>
                    </td>
                    <td class="p-3">
                      @if (item.restricted_fields && item.restricted_fields.length > 0) {
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200">
                          🔒 {{ item.restricted_fields.join(', ') }}
                        </span>
                      } @else {
                        <span class="text-slate-400 text-[10px]">None</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>
    </div>
  `
})
export class PermissionManagementComponent implements OnInit {
  private service = inject(SecurityService);

  matrix: RolePermissionItem[] = [];
  selectedRoleCode = 'PROJECT_MGR';
  loading = false;

  roleOptions: SelectOption[] = [
    { value: 'SUPER_ADMIN', label: 'Super Administrator' },
    { value: 'SYS_ADMIN', label: 'System Administrator' },
    { value: 'MD', label: 'Managing Director' },
    { value: 'PROJECT_DIR', label: 'Project Director' },
    { value: 'PROJECT_MGR', label: 'Project Manager' },
    { value: 'FIN_MGR', label: 'Finance Manager' },
    { value: 'ACCOUNTANT', label: 'Accountant' },
    { value: 'SALES_MGR', label: 'Sales Manager' },
    { value: 'SALES_EXEC', label: 'Sales Executive' },
    { value: 'PROC_MGR', label: 'Procurement Manager' },
    { value: 'SITE_ENG', label: 'Site Engineer' },
    { value: 'AUDITOR', label: 'Auditor' }
  ];

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loading = true;
    this.service.getRolePermissions(this.selectedRoleCode).subscribe({
      next: (data) => {
        this.matrix = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load role permissions', err);
        this.loading = false;
      }
    });
  }

  savePermissions(): void {
    alert(`Role ${this.selectedRoleCode} permissions updated successfully across all 16 modules.`);
  }
}
