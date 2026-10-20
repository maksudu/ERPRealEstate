import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BudgetingService, BudgetPlan } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="space-y-5">
      <app-card-container title="2.0 Budget Planning Master" subtitle="Annual, multi-year, project phase, building tower and corporate department budget allocations" badge="Master Planning">
        <div card-actions class="flex items-center gap-2">
          <button type="button" (click)="createPlan()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Create Budget Plan</button>
        </div>
        <div class="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_14rem_auto_auto]">
          <input [(ngModel)]="searchQuery" (keyup.enter)="applyFilters()" placeholder="Search plan code, project or title" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" />
          <app-searchable-select placeholder="All scopes" categoryCode="BUDGET_SCOPE_LEVEL" (selectionChange)="onScopeFilter($event)"></app-searchable-select>
          <button type="button" (click)="applyFilters()" class="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white">Search</button>
          <button type="button" (click)="resetFilters()" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">Reset</button>
        </div>

        @if (errorMessage()) { <div role="alert" class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ errorMessage() }}</div> }
        @if (successMessage()) { <div role="status" class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ successMessage() }}</div> }
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full min-w-[850px] text-left text-sm">
            <thead class="bg-slate-50 text-xs uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th class="px-4 py-3">Plan</th><th class="px-4 py-3">Scope / Fiscal Year</th><th class="px-4 py-3">Budget</th><th class="px-4 py-3">Spent</th><th class="px-4 py-3">Committed</th><th class="px-4 py-3">Available</th><th class="px-4 py-3">Status</th><th class="px-4 py-3">Actions</th></tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @if (loading()) { <tr><td colspan="8" class="px-4 py-10 text-center text-slate-500">Loading budget plans…</td></tr> }
              @else if (plans().length === 0) { <tr><td colspan="8" class="px-4 py-10 text-center text-slate-500">No budget plans found. Create a plan to get started.</td></tr> }
              @else { @for (plan of plans(); track plan.id) {
                <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                  <td class="px-4 py-3"><strong class="block text-slate-900 dark:text-white">{{ plan.title }}</strong><span class="font-mono text-xs text-slate-500">{{ plan.plan_code }}</span></td>
                  <td class="px-4 py-3">{{ plan.scope_level }}<span class="block text-xs text-slate-500">{{ plan.fiscal_year }}</span></td>
                  <td class="px-4 py-3 font-mono">৳{{ plan.total_budget_bdt | number:'1.0-2' }}</td><td class="px-4 py-3 font-mono text-amber-700">৳{{ plan.actual_expenditure_bdt | number:'1.0-2' }}</td>
                  <td class="px-4 py-3 font-mono text-blue-700">৳{{ plan.committed_amount_bdt | number:'1.0-2' }}</td><td class="px-4 py-3 font-mono text-emerald-700">৳{{ plan.available_budget_bdt | number:'1.0-2' }}</td>
                  <td class="px-4 py-3"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold dark:bg-slate-800">{{ plan.status }}</span></td>
                  <td class="px-4 py-3"><div class="flex gap-2"><button type="button" (click)="editPlan(plan)" class="text-sm font-medium text-blue-700 hover:underline">Edit</button><button type="button" (click)="deletePlan(plan)" [disabled]="deletingId() === plan.id" class="text-sm font-medium text-rose-700 hover:underline disabled:opacity-50">{{ deletingId() === plan.id ? 'Deleting…' : 'Delete' }}</button></div></td>
                </tr>
              } }
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex items-center justify-between text-sm text-slate-600"><span>Showing {{ plans().length }} of {{ totalCount() }} budget plans</span><div class="flex gap-2"><button type="button" (click)="changePage(-1)" [disabled]="pageOffset === 0 || loading()" class="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" (click)="changePage(1)" [disabled]="pageOffset + pageLimit >= totalCount() || loading()" class="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </app-card-container>
    </div>`
})
export class BudgetPlanningComponent implements OnInit {
  private readonly service = inject(BudgetingService);
  private readonly router = inject(Router);
  readonly plans = signal<BudgetPlan[]>([]);
  readonly totalCount = signal(0);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly deletingId = signal<number | null>(null);
  searchQuery = '';
  scopeFilter = '';
  readonly pageLimit = 20;
  pageOffset = 0;

  ngOnInit(): void {
    const success = history.state?.successMessage;
    if (success) this.successMessage.set(success);
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.getPlans({ search: this.searchQuery.trim() || undefined, scope_level: this.scopeFilter || undefined, limit: this.pageLimit, offset: this.pageOffset }).subscribe({
      next: res => { this.plans.set(res.items ?? []); this.totalCount.set(res.total ?? 0); this.loading.set(false); },
      error: err => { this.loading.set(false); this.errorMessage.set(err?.error?.detail || 'Could not load budget plans. Please try again.'); }
    });
  }
  onScopeFilter(event: any): void { this.scopeFilter = String(event?.value ?? event ?? ''); }
  applyFilters(): void { this.pageOffset = 0; this.loadPlans(); }
  resetFilters(): void { this.searchQuery = ''; this.scopeFilter = ''; this.pageOffset = 0; this.successMessage.set(''); this.loadPlans(); }
  changePage(direction: -1 | 1): void { this.pageOffset = Math.max(0, this.pageOffset + direction * this.pageLimit); this.loadPlans(); }
  createPlan(): void { this.router.navigate(['/budgeting/planning/create']); }
  editPlan(plan: BudgetPlan): void { this.router.navigate(['/budgeting/planning/edit', plan.id], { state: { plan } }); }
  deletePlan(plan: BudgetPlan): void {
    if (!confirm(`Delete budget plan ${plan.plan_code}?`)) return;
    this.deletingId.set(plan.id); this.errorMessage.set(''); this.successMessage.set('');
    this.service.deletePlan(plan.id).subscribe({
      next: () => { this.deletingId.set(null); this.successMessage.set('Budget plan deleted successfully.'); if (this.plans().length === 1 && this.pageOffset > 0) this.pageOffset -= this.pageLimit; this.loadPlans(); },
      error: err => { this.deletingId.set(null); this.errorMessage.set(err?.error?.detail || 'Could not delete this budget plan.'); }
    });
  }
}
