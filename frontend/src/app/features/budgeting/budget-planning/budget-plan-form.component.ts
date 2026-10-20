import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BudgetingService, BudgetPlan } from '../../../core/services/budgeting.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-plan-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent],
  template: `
    <app-card-container [title]="isEdit ? 'Edit Budget Plan' : 'Create Budget Plan'" subtitle="Set the approved scope, fiscal period and baseline allocation" badge="Budget Planning">
      <div class="mx-auto max-w-4xl">
        @if (errorMessage()) { <div role="alert" class="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ errorMessage() }}</div> }
        @if (successMessage()) { <div role="status" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ successMessage() }}</div> }
        @if (loading()) { <div class="py-12 text-center text-slate-500">{{ isEdit ? 'Loading budget plan…' : 'Preparing form…' }}</div> }
        @else {
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
            <div class="grid gap-4 md:grid-cols-2">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-200">Plan title *<input formControlName="title" placeholder="Enter a clear budget plan title" class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
              <app-searchable-select label="Scope level *" placeholder="Select scope" categoryCode="BUDGET_SCOPE_LEVEL" [required]="true" [value]="form.controls.scope_level.value" (selectionChange)="setValue('scope_level', $event?.item_code ?? $event?.value ?? '')"></app-searchable-select>
              <app-searchable-select label="Fiscal year *" placeholder="Select fiscal year" categoryCode="FISCAL_YEAR" [required]="true" [value]="form.controls.fiscal_year.value" (selectionChange)="setValue('fiscal_year', $event?.item_code ?? $event?.value ?? '')"></app-searchable-select>
              <app-searchable-select label="Period type *" placeholder="Select period type" categoryCode="BUDGET_PERIOD_TYPE" [required]="true" [value]="form.controls.period_type.value" (selectionChange)="setValue('period_type', $event?.item_code ?? $event?.value ?? '')"></app-searchable-select>
              <app-searchable-select label="Project" placeholder="Select linked project" categoryCode="REAL_ESTATE_PROJECT" [value]="projectSelection" (selectionChange)="setProject($event)"></app-searchable-select>
              <label class="text-sm font-medium text-slate-700 dark:text-slate-200">Total baseline budget (BDT) *<input type="number" min="0" formControlName="total_budget_bdt" placeholder="0" class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
              <label class="text-sm font-medium text-slate-700 dark:text-slate-200">Prepared by<input formControlName="prepared_by" class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950" /></label>
              <app-searchable-select label="Status" placeholder="Select status" categoryCode="BUDGET_STATUS" [value]="form.controls.status.value" (selectionChange)="setValue('status', $event?.item_code ?? $event?.value ?? '')"></app-searchable-select>
            </div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Approval notes<textarea formControlName="approval_notes" rows="3" placeholder="Approval reference or QS remarks" class="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal dark:border-slate-700 dark:bg-slate-950"></textarea></label>
            <div class="flex flex-col-reverse justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center dark:border-slate-800">
              <a routerLink="/budgeting/planning" class="text-sm font-medium text-slate-600 hover:text-slate-900">Back to budget plans</a>
              <div class="flex justify-end gap-2"><button type="button" routerLink="/budgeting/planning" class="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button><button type="submit" [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{{ saving() ? 'Saving…' : (isEdit ? 'Save changes' : 'Create budget plan') }}</button></div>
            </div>
          </form>
        }
      </div>
    </app-card-container>`
})
export class BudgetPlanFormComponent implements OnInit {
  private readonly service = inject(BudgetingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly form = this.fb.group({
    title: ['', Validators.required], scope_level: ['', Validators.required], fiscal_year: ['', Validators.required],
    period_type: ['', Validators.required], project_id: [null as number | null], total_budget_bdt: [null as number | null, [Validators.required, Validators.min(0)]],
    prepared_by: [''], status: [''], approval_notes: ['']
  });
  isEdit = false;
  planId: number | null = null;
  projectSelection: number | null = null;

  ngOnInit(): void {
    this.planId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isEdit = this.route.snapshot.url.some(segment => segment.path === 'edit');
    if (this.isEdit && this.planId) {
      const routedPlan = history.state?.plan as BudgetPlan | undefined;
      if (routedPlan?.id === this.planId) { this.patchPlan(routedPlan); this.loading.set(false); }
      else this.loadPlan(this.planId);
    }
    else { this.loading.set(false); }
  }

  private loadPlan(id: number): void {
    this.service.getPlan(id).subscribe({
      next: plan => { this.patchPlan(plan); this.loading.set(false); },
      error: err => { this.errorMessage.set(err?.error?.detail || 'Could not load this budget plan.'); this.loading.set(false); }
    });
  }

  private patchPlan(plan: BudgetPlan): void {
    this.form.patchValue({ title: plan.title, scope_level: plan.scope_level, fiscal_year: plan.fiscal_year, period_type: plan.period_type, project_id: plan.project_id ?? null, total_budget_bdt: plan.total_budget_bdt, prepared_by: plan.prepared_by ?? '', status: plan.status, approval_notes: plan.approval_notes ?? '' });
    this.projectSelection = plan.project_id ?? null;
  }
  setValue(field: 'scope_level' | 'fiscal_year' | 'period_type' | 'status', value: string): void { this.form.controls[field].setValue(value); this.form.controls[field].markAsTouched(); }
  setProject(item: any): void { const id = item?.id ?? item?.value ?? null; this.projectSelection = id ? Number(id) : null; this.form.controls.project_id.setValue(this.projectSelection); }

  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.errorMessage.set(''); this.successMessage.set('');
    const raw = this.form.getRawValue();
    const payload: Partial<BudgetPlan> = {
      title: raw.title || undefined,
      scope_level: raw.scope_level || undefined,
      fiscal_year: raw.fiscal_year || undefined,
      period_type: raw.period_type || undefined,
      project_id: raw.project_id || undefined,
      total_budget_bdt: raw.total_budget_bdt ?? undefined,
      prepared_by: raw.prepared_by || undefined,
      status: raw.status || undefined,
      approval_notes: raw.approval_notes || undefined
    };
    const request = this.isEdit && this.planId ? this.service.updatePlan(this.planId, payload) : this.service.createPlan(payload);
    request.subscribe({
      next: () => { this.saving.set(false); this.successMessage.set(this.isEdit ? 'Budget plan updated successfully.' : 'Budget plan created successfully.'); this.router.navigate(['/budgeting/planning'], { state: { successMessage: this.successMessage() } }); },
      error: err => { this.saving.set(false); this.errorMessage.set(err?.error?.detail || 'Could not save the budget plan. Review the form and try again.'); }
    });
  }
}
