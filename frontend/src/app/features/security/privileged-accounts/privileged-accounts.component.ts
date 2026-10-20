import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurityService } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-privileged-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-card title="Privileged Accounts & Administrator Access Audit" subtitle="Review elevated accounts, MFA compliance and recent sign-in details">
        <div card-actions>
          <button type="button" (click)="addAccount()" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700">
            + Add Privileged Account
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Accounts</label>
            <input type="search" [(ngModel)]="search" (keyup.enter)="applyFilters()" placeholder="Username, name or email"
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
          </div>
          <app-searchable-select label="Department" placeholder="All Departments" [(ngModel)]="department"
            [options]="departmentOptions" [allowCreateNew]="false" (ngModelChange)="applyFilters()" />
          <app-searchable-select label="Privileged Role" placeholder="All Privileged Roles" [(ngModel)]="role"
            [options]="roleOptions" [allowCreateNew]="false" (ngModelChange)="applyFilters()" />
          <app-searchable-select label="Account Status" placeholder="All Statuses" [(ngModel)]="status"
            [options]="statusOptions" [allowCreateNew]="false" (ngModelChange)="applyFilters()" />
        </div>

        @if (errorMessage) {
          <div role="alert" class="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">{{ errorMessage }}</div>
        }
        @if (successMessage) {
          <div role="status" class="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">{{ successMessage }}</div>
        }

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead><tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th class="p-3">User Code</th><th class="p-3">Username</th><th class="p-3">Administrator Name</th>
              <th class="p-3">Privileged Role</th><th class="p-3">Department</th><th class="p-3 text-center">MFA</th>
              <th class="p-3">Last Known IP</th><th class="p-3 text-right">Actions</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @if (loading) {
                <tr><td colspan="8" class="p-8 text-center text-slate-400">Loading privileged accounts...</td></tr>
              } @else {
                @for (item of items; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono font-bold text-rose-600">{{ item.user_code }}</td>
                    <td class="p-3">&#64;{{ item.username }}</td>
                    <td class="p-3 font-semibold">{{ item.full_name }}</td>
                    <td class="p-3 text-indigo-600 font-bold">{{ item.role }}</td>
                    <td class="p-3">{{ item.department }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold"
                        [ngClass]="item.mfa_status === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
                        {{ item.mfa_status }}
                      </span>
                    </td>
                    <td class="p-3 font-mono text-slate-500 text-[10px]">{{ item.last_login_ip }}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                      <button type="button" (click)="editAccount(item.id)" class="px-2 py-1 text-indigo-600 hover:underline">Edit</button>
                      <button type="button" (click)="deleteAccount(item)" class="px-2 py-1 text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="p-8 text-center text-slate-400">No privileged accounts found.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <span>Showing {{ startIndex }}–{{ endIndex }} of {{ total }} accounts</span>
            <label class="flex items-center gap-1">Per page:
              <select [ngModel]="limit" (ngModelChange)="changeLimit($event)" class="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="50">50</option><option [ngValue]="100">100</option>
              </select>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="previousPage()" [disabled]="offset === 0" class="px-2.5 py-1 rounded border disabled:opacity-40">Previous</button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button type="button" (click)="nextPage()" [disabled]="offset + limit >= total" class="px-2.5 py-1 rounded border disabled:opacity-40">Next</button>
          </div>
        </div>
      </app-card>
    </div>
  `
})
export class PrivilegedAccountsComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);

  items: any[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  search = '';
  department = '';
  role = '';
  status = '';
  limit = 25;
  offset = 0;
  total = 0;
  departmentOptions: SelectOption[] = [{ value: '', label: 'All Departments' }];
  roleOptions: SelectOption[] = [{ value: '', label: 'All Privileged Roles' }];
  statusOptions: SelectOption[] = [{ value: '', label: 'All Statuses' }];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadAccounts();
  }

  get currentPage(): number { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }
  get startIndex(): number { return this.total ? this.offset + 1 : 0; }
  get endIndex(): number { return Math.min(this.offset + this.limit, this.total); }

  private loadFilterOptions(): void {
    this.service.getUsers({ limit: 100, offset: 0 }).subscribe({
      next: (result) => {
        const departments = Array.from(new Set(result.items.map(user => user.department_name).filter(Boolean))).sort();
        const statuses = Array.from(new Set(result.items.map(user => user.account_status).filter(Boolean))).sort();
        this.departmentOptions = [{ value: '', label: 'All Departments' }, ...departments.map(value => ({ value, label: value }))];
        this.statusOptions = [{ value: '', label: 'All Statuses' }, ...statuses.map(value => ({ value, label: value }))];
      },
      error: (err) => {
        console.error('Failed to load privileged account filter options', err);
        this.errorMessage = err.error?.detail || 'Could not load account filters.';
      }
    });
    this.service.getRoles({ limit: 100, offset: 0 }).subscribe({
      next: (result) => {
        const privilegedRoles = result.items.filter(item =>
          ['SUPER_ADMIN', 'SYS_ADMIN', 'SEC_ADMIN', 'MD', 'FIN_MGR'].includes(item.role_code)
        );
        this.roleOptions = [
          { value: '', label: 'All Privileged Roles' },
          ...privilegedRoles.map(item => ({ value: item.role_code, label: item.role_name }))
        ];
      },
      error: (err) => {
        console.error('Failed to load privileged role options', err);
        this.errorMessage = err.error?.detail || 'Could not load role filters.';
      }
    });
  }

  loadAccounts(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.getReports('privileged_accounts', {
      search: this.search.trim() || undefined,
      department: this.department || undefined,
      role: this.role || undefined,
      status_filter: this.status || undefined,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (result) => {
        this.items = result.items || [];
        this.total = result.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load privileged accounts', err);
        this.errorMessage = err.error?.detail || 'Failed to load privileged accounts.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void { this.offset = 0; this.loadAccounts(); }
  changeLimit(value: number): void { this.limit = Number(value); this.offset = 0; this.loadAccounts(); }
  previousPage(): void { if (this.offset > 0) { this.offset -= this.limit; this.loadAccounts(); } }
  nextPage(): void { if (this.offset + this.limit < this.total) { this.offset += this.limit; this.loadAccounts(); } }
  addAccount(): void {
    this.router.navigate(['/security/users/create'], { queryParams: { returnTo: '/security/privileged-accounts' } });
  }
  editAccount(id: number): void {
    this.router.navigate(['/security/users', id, 'edit'], { queryParams: { returnTo: '/security/privileged-accounts' } });
  }
  deleteAccount(item: any): void {
    if (!confirm(`Delete privileged account @${item.username}?`)) return;
    this.service.deleteUser(item.id).subscribe({
      next: () => {
        this.successMessage = `Account @${item.username} deleted.`;
        if (this.items.length === 1 && this.offset > 0) this.offset -= this.limit;
        this.loadAccounts();
      },
      error: (err) => {
        console.error('Failed to delete privileged account', err);
        this.errorMessage = err.error?.detail || 'Failed to delete privileged account.';
      }
    });
  }
}
