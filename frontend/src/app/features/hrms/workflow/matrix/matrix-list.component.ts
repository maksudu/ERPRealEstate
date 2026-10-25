import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HrmsWorkflowService, WorkflowMatrixRule } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-workflow-matrix-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    <app-card
      title="Enterprise Approval Matrix Rules"
      subtitle="Define Maker-Checker tiers, required roles, financial & day limits, SLA turnarounds, and auto-escalation"
      badge="Config 12.1"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <a
          routerLink="/hrms/workflow/matrix/create"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
        >
          <span>+ Add Matrix Rule</span>
        </a>
      </div>

      <!-- Filters Strip -->
      <div class="p-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <label class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Search Rule</label>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search code, title, role..."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <app-searchable-select
            label="Module Category"
            placeholder="All Categories"
            [(ngModel)]="categoryFilter"
            (ngModelChange)="loadRules()"
            [options]="categoryOptions"
            [allowCreateNew]="false"
          />
        </div>

        <div>
          <app-searchable-select
            label="Department Scope"
            placeholder="All Departments"
            [(ngModel)]="departmentFilter"
            (ngModelChange)="loadRules()"
            [options]="departmentOptions"
            [allowCreateNew]="true"
          />
        </div>

        <div class="flex items-end">
          <button
            type="button"
            (click)="resetFilters()"
            class="w-full py-2 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Reset Filters
          </button>
        </div>
      </div>

      <!-- Table Section -->
      <div class="overflow-x-auto">
        @if (isLoading()) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading approval matrix rules from server...
          </div>
        } @else if (rules().length === 0) {
          <div class="py-12 text-center text-slate-400 text-xs">
            No matrix rules match your filter criteria.
          </div>
        } @else {
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3">Rule Code</th>
                <th class="px-4 py-3">Rule Title & Category</th>
                <th class="px-4 py-3 text-center">Tier</th>
                <th class="px-4 py-3">Approval Step Name</th>
                <th class="px-4 py-3">Required Approver Role</th>
                <th class="px-4 py-3">Threshold / Limit</th>
                <th class="px-4 py-3 text-center">SLA</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (rule of rules(); track rule.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {{ rule.rule_code }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ rule.rule_title }}</div>
                    <div class="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span class="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium">
                        {{ rule.module_category }}
                      </span>
                      <span>{{ rule.department_name || 'All Enterprise Depts' }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ rule.tier_level }}
                    </span>
                  </td>
                  <td class="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {{ rule.step_name }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ rule.approver_designation }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ rule.approver_role }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    @if (rule.max_threshold) {
                      <span>{{ rule.min_threshold }} to {{ rule.max_threshold }}</span>
                    } @else {
                      <span>&gt;= {{ rule.min_threshold }} (No Cap)</span>
                    }
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 rounded font-mono font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 text-[11px]">
                      {{ rule.sla_hours }}h
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      [class.bg-emerald-50]="rule.is_active"
                      [class.text-emerald-700]="rule.is_active"
                      [class.dark:bg-emerald-950]="rule.is_active"
                      [class.dark:text-emerald-300]="rule.is_active"
                      [class.bg-slate-100]="!rule.is_active"
                      [class.text-slate-600]="!rule.is_active"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-current"
                    >
                      {{ rule.is_active ? 'ACTIVE' : 'INACTIVE' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      (click)="editRule(rule.id)"
                      class="px-2 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition"
                      title="Edit Matrix Rule"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      (click)="deleteRule(rule)"
                      class="px-2 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 transition"
                      title="Delete Matrix Rule"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Server Pagination Footer -->
      <div class="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {{ offset() + 1 }} to {{ min(offset() + limit(), totalCount()) }} of {{ totalCount() }} matrix rules
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="offset() === 0"
            class="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Previous
          </button>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="offset() + limit() >= totalCount()"
            class="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Next
          </button>
        </div>
      </div>
    </app-card>
  `
})
export class WorkflowMatrixListComponent implements OnInit {
  private service = inject(HrmsWorkflowService);
  private router = inject(Router);

  rules = signal<WorkflowMatrixRule[]>([]);
  totalCount = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  categoryFilter = 'ALL';
  departmentFilter = 'ALL';

  categoryOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Module Categories' },
    { value: 'LEAVE', label: 'Leave Approval' },
    { value: 'OVERTIME', label: 'Overtime Signoff' },
    { value: 'ATTENDANCE', label: 'Attendance Regularization' },
    { value: 'RECRUITMENT', label: 'Recruitment & Job Offer' },
    { value: 'SALARY_REVISION', label: 'Salary Revision' },
    { value: 'PAYROLL', label: 'Monthly Payroll Lock' },
    { value: 'EXPENSE', label: 'Expense & Claim' }
  ];

  departmentOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Departments' },
    { value: 'Engineering & Site Operations', label: 'Engineering & Site Operations' },
    { value: 'Civil Project Site #4', label: 'Civil Project Site #4' },
    { value: 'Electrical & MEP', label: 'Electrical & MEP' },
    { value: 'Accounts & Finance', label: 'Accounts & Finance' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' }
  ];

  ngOnInit(): void {
    this.loadRules();
    this.loadMetadata();
  }

  loadMetadata(): void {
    this.service.getWorkflowMetadata().subscribe({
      next: (meta) => {
        if (meta.departments) {
          const depts: SelectOption[] = meta.departments.map(d => ({ value: d.value, label: d.label }));
          this.departmentOptions = [{ value: 'ALL', label: 'All Departments' }, ...depts];
        }
      },
      error: (err) => console.error('Failed to load workflow metadata', err)
    });
  }

  loadRules(): void {
    this.isLoading.set(true);
    this.service.getMatrixRules({
      search: this.searchQuery.trim() || undefined,
      category: this.categoryFilter !== 'ALL' ? this.categoryFilter : undefined,
      department: this.departmentFilter !== 'ALL' ? this.departmentFilter : undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.rules.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load matrix rules', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadRules();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.categoryFilter = 'ALL';
    this.departmentFilter = 'ALL';
    this.offset.set(0);
    this.loadRules();
  }

  editRule(id: number): void {
    this.router.navigate(['/hrms/workflow/matrix', id, 'edit']);
  }

  deleteRule(rule: WorkflowMatrixRule): void {
    if (confirm(`Are you sure you want to delete Matrix Rule "${rule.rule_code}: ${rule.rule_title}"?`)) {
      this.service.deleteMatrixRule(rule.id).subscribe({
        next: () => this.loadRules(),
        error: (err) => alert(err?.error?.detail || 'Failed to delete rule.')
      });
    }
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadRules();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.totalCount()) {
      this.offset.update(v => v + this.limit());
      this.loadRules();
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
