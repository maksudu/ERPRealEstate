import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, UserProjectScope } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-project-access',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, ModalComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Top Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Multi-Project Isolation</div>
          <div class="mt-2 text-xl font-bold font-display text-slate-900 dark:text-slate-100">
            Strict Boundary
          </div>
          <div class="mt-1 text-xs text-slate-500">Users cannot see unassigned site data</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Financial Data Masking</div>
          <div class="mt-2 text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            Controlled Scope
          </div>
          <div class="mt-1 text-xs text-slate-500">Site staff restricted from cost margins</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Scope Grants</div>
          <div class="mt-2 text-xl font-bold font-display text-rose-600 dark:text-rose-400">
            {{ totalRecords || scopes.length }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Explicit project & tower assignments</div>
        </div>
      </div>

      <!-- Main Project Scope Card -->
      <app-card title="Project, Tower & Property Access Scopes" subtitle="Granular authorization restricting user access to specific real estate projects and building towers">
        <div card-actions>
          <button
            type="button"
            (click)="openModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Assign Project Scope
          </button>
        </div>

        <!-- Search Bar -->
        <div class="mb-4 max-w-sm">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="loadScopes()"
            placeholder="Search by user or project..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">User</th>
                <th class="p-3">Assigned Project</th>
                <th class="p-3">Tower / Wing Scope</th>
                <th class="p-3 text-center">Financials Access</th>
                <th class="p-3 text-center">Customer Data</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="7" class="p-6 text-center text-slate-400">Loading project access scopes...</td>
                </tr>
              } @else if (scopes.length === 0) {
                <tr>
                  <td colspan="7" class="p-6 text-center text-slate-400">No project scopes assigned.</td>
                </tr>
              } @else {
                @for (item of scopes; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.user_name }}
                    </td>
                    <td class="p-3 font-medium text-indigo-600 dark:text-indigo-400">
                      {{ item.project_name }}
                    </td>
                    <td class="p-3">
                      @if (item.tower_names && item.tower_names.length > 0) {
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {{ item.tower_names.join(', ') }}
                        </span>
                      } @else {
                        <span class="text-slate-500 text-[11px]">All Towers</span>
                      }
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.can_view_financials ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                        class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold"
                      >
                        {{ item.can_view_financials ? 'ALLOWED' : 'RESTRICTED' }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.can_view_customers ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                        class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold"
                      >
                        {{ item.can_view_customers ? 'ALLOWED' : 'RESTRICTED' }}
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Edit Scope"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          (click)="revokeScope(item.id)"
                          class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          title="Revoke Scope"
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
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} assigned scopes</div>
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

      <!-- Assign Scope Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Assign Project & Property Scope"
        subtitle="Grant project-specific privileges with optional financial data masking"
        badge="Scope Delegation"
        size="lg"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div>
            <app-searchable-select
              categoryCode="USER_LIST"
              label="Select User *"
              placeholder="Search user..."
              [(ngModel)]="formData.user_id"
              [options]="userOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div>
            <app-searchable-select
              categoryCode="PROJECT_LOCATION"
              label="Select Project *"
              placeholder="Search project..."
              [(ngModel)]="formData.project_name"
              [options]="projectOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Building Towers / Wings (Comma separated)</label>
            <input
              type="text"
              [(ngModel)]="towerInput"
              placeholder="e.g. Tower A, Tower B, Commercial Wing"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label class="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <input type="checkbox" [(ngModel)]="formData.can_view_financials" class="rounded text-rose-600 focus:ring-rose-500" />
              <span>Allow viewing project financials & budgets</span>
            </label>
            <label class="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
              <input type="checkbox" [(ngModel)]="formData.can_view_customers" class="rounded text-rose-600 focus:ring-rose-500" />
              <span>Allow viewing buyer KYC & contact details</span>
            </label>
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
            (click)="saveScope()"
            [disabled]="!formData.user_id || !formData.project_name"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Grant Scope
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class ProjectAccessComponent implements OnInit {
  private service = inject(SecurityService);

  scopes: UserProjectScope[] = [];
  loading = false;
  isModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  Math = Math;

  searchQuery = '';
  limit = 20;
  offset = 0;
  totalRecords = 0;

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  userOptions: SelectOption[] = [];
  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Bay View Residential Enclave', label: 'Bay View Residential Enclave' },
    { value: 'Central Corporate Head Office', label: 'Central Corporate Head Office' }
  ];

  towerInput = 'Tower A, Tower B';
  formData = {
    user_id: null as any,
    user_name: '',
    project_id: 1,
    project_name: 'Ocean Heights Luxury Tower',
    can_view_financials: false,
    can_view_customers: true
  };

  ngOnInit(): void {
    this.loadScopes();
    this.loadUsers();
  }

  loadScopes(): void {
    this.loading = true;
    this.service.getProjectScopes({
      search: this.searchQuery,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.scopes = res.items || [];
        this.totalRecords = res.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load project scopes', err);
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadScopes();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadScopes();
    }
  }

  loadUsers(): void {
    this.service.getUsers({ limit: 100 }).subscribe({
      next: (res) => {
        this.userOptions = res.items.map(u => ({
          value: u.id,
          label: `${u.full_name_en} (${u.primary_role})`,
          subLabel: u.department_name
        }));
      }
    });
  }

  openModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = {
      user_id: null as any,
      user_name: '',
      project_id: 1,
      project_name: 'Ocean Heights Luxury Tower',
      can_view_financials: false,
      can_view_customers: true
    };
    this.towerInput = 'Tower A, Tower B';
    this.isModalOpen = true;
  }

  openEditModal(scope: UserProjectScope): void {
    this.isEditMode = true;
    this.editingId = scope.id;
    this.formData = {
      user_id: scope.user_id,
      user_name: scope.user_name,
      project_id: scope.project_id || 1,
      project_name: scope.project_name,
      can_view_financials: scope.can_view_financials,
      can_view_customers: scope.can_view_customers
    };
    this.towerInput = (scope.tower_names || []).join(', ');
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveScope(): void {
    const selectedUser = this.userOptions.find(o => o.value === this.formData.user_id);
    const towers = this.towerInput.split(',').map(t => t.trim()).filter(Boolean);

    if (this.isEditMode && this.editingId) {
      this.service.updateProjectScope(this.editingId, {
        project_name: this.formData.project_name,
        tower_names: towers,
        can_view_financials: this.formData.can_view_financials,
        can_view_customers: this.formData.can_view_customers
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadScopes();
        },
        error: (err) => console.error('Failed to update scope', err)
      });
    } else {
      this.service.assignProjectScope({
        user_id: Number(this.formData.user_id),
        user_name: selectedUser ? selectedUser.label : 'Authorized User',
        project_id: 1,
        project_name: this.formData.project_name,
        tower_names: towers,
        can_view_financials: this.formData.can_view_financials,
        can_view_customers: this.formData.can_view_customers
      }).subscribe({
        next: () => {
          this.closeModal();
          this.loadScopes();
        },
        error: (err) => console.error('Failed to assign scope', err)
      });
    }
  }

  revokeScope(id: number): void {
    if (confirm('Revoke this project access assignment?')) {
      this.service.revokeProjectScope(id).subscribe({
        next: () => this.loadScopes(),
        error: (err) => console.error('Failed to revoke scope', err)
      });
    }
  }
}
