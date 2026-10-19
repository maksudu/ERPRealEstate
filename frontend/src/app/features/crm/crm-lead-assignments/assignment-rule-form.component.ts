import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { LeadAssignmentRule } from '../../../core/models/crm.model';

@Component({
  selector: 'app-assignment-rule-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <!-- Automatic Lead Distribution Rule Form Wrapped in Single Card Container -->
    <app-card-container
      [title]="isEditMode() ? 'Edit Lead Assignment Rule' : 'Create Lead Assignment Rule'"
      [subtitle]="'Spec 4.3 — ' + (isEditMode() ? 'Rule #' + ruleId : 'Configure round-robin, project-wise, location-wise, property-type, campaign-specific or broker routing with SLA')"
    >
      <!-- Action Buttons in Card Container Header -->
      <div card-actions class="flex items-center gap-2">
        <a
          routerLink="/crm/lead-assignments"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <i class="ri-arrow-left-line text-sm"></i>
          <span>Back to List</span>
        </a>
        <app-custom-button
          variant="primary"
          size="sm"
          [disabled]="ruleForm.invalid || isSubmitting()"
          [loading]="isSubmitting()"
          (clicked)="saveRule()"
        >
          <span class="flex items-center gap-1.5">
            <i class="ri-save-line text-sm"></i>
            <span>{{ isEditMode() ? 'Update Rule' : 'Save Rule' }}</span>
          </span>
        </app-custom-button>
      </div>

      <form [formGroup]="ruleForm" class="flex flex-col gap-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-custom-input
            label="Rule Name *"
            placeholder="e.g. Gulshan project round-robin"
            formControlName="rule_name"
            [required]="true"
          ></app-custom-input>
          <app-searchable-select
            label="Assignment Method *"
            [categoryCode]="LOOKUP.method"
            formControlName="method"
            placeholder="Select method..."
            [allowCreateNew]="true"
            [required]="true"
          ></app-searchable-select>
          <app-custom-input
            label="Priority Order *"
            type="number"
            placeholder="Lower number = evaluated first"
            formControlName="priority_order"
            [required]="true"
            hint="Rules are evaluated in ascending priority order"
          ></app-custom-input>
          <app-custom-input
            label="First-Response SLA (hours) *"
            type="number"
            placeholder="e.g. 24"
            formControlName="sla_hours"
            [required]="true"
          ></app-custom-input>
        </div>

        <app-searchable-select
          label="Escalate To Manager"
          [options]="salesRepOptions()"
          formControlName="escalate_to_manager_id"
          placeholder="Select sales manager (optional)"
          [allowCreateNew]="false"
          hint="Uncontacted leads past SLA escalate to this manager"
        ></app-searchable-select>

        <div class="space-y-2">
          <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
            Target Sales Representatives
          </label>
          <p class="text-[11px] text-slate-500 dark:text-slate-400">
            Tick the representatives eligible for this rule. Leave all unticked to route to any active sales rep.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            @for (rep of salesReps(); track rep.id) {
              <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-xs shadow-xs">
                <input
                  type="checkbox"
                  [checked]="isRepSelected(rep.id)"
                  (change)="toggleRep(rep.id)"
                  class="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span class="text-slate-700 dark:text-slate-200 font-medium">{{ rep.full_name_en }}</span>
              </label>
            } @empty {
              <p class="text-xs text-slate-400 col-span-full">No sales representatives available.</p>
            }
          </div>
        </div>

        <app-custom-textarea
          label="Conditions (JSON, optional)"
          placeholder='{"lead_source_id":"FACEBOOK_ADS","property_type":"APARTMENT","preferred_location":"GULSHAN"}'
          formControlName="conditions"
          [rows]="3"
          hint="Optional JSON filters — rule only applies when lead matches these conditions. Managed dynamically; leave blank to always apply."
        ></app-custom-textarea>

        <label class="flex items-center gap-3 cursor-pointer select-none w-fit">
          <input type="checkbox" formControlName="is_active" class="rounded border-slate-300 dark:border-slate-600 cursor-pointer" />
          <span class="text-xs text-slate-700 dark:text-slate-300 font-medium">Rule is active (new leads will be evaluated and routed by this rule)</span>
        </label>
      </form>
    </app-card-container>
  `
})
export class AssignmentRuleFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ruleId: number | null = null;
  isEditMode = signal(false);
  isSubmitting = signal(false);
  salesReps = signal<{ id: number; full_name_en: string }[]>([]);
  selectedRepIds = signal<Set<number>>(new Set());

  readonly LOOKUP = { method: 'CRM_ASSIGNMENT_METHOD' };

  salesRepOptions = signal<{ value: string; label: string }[]>([]);

  ruleForm: FormGroup = this.fb.group({
    rule_name: ['', Validators.required],
    method: ['ROUND_ROBIN', Validators.required],
    priority_order: [0, Validators.required],
    sla_hours: [24, [Validators.required, Validators.min(1)]],
    escalate_to_manager_id: [null],
    conditions: [''],
    is_active: [true]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.ruleId = +idParam;
      this.isEditMode.set(true);
      this.loadRule(this.ruleId);
    }
    this.loadSalesReps();
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe(reps => {
      this.salesReps.set(reps);
      this.salesRepOptions.set(reps.map(r => ({ value: String(r.id), label: r.full_name_en })));
    });
  }

  loadRule(id: number): void {
    this.crmService.getAssignmentRule(id).subscribe({
      next: (rule) => this.patchRule(rule),
      error: (err) => {
        alert(err?.error?.detail || 'Failed to load rule.');
        this.router.navigate(['/crm/lead-assignments']);
      }
    });
  }

  patchRule(rule: LeadAssignmentRule): void {
    this.ruleForm.patchValue({
      rule_name: rule.rule_name,
      method: rule.method,
      priority_order: rule.priority_order,
      sla_hours: rule.sla_hours,
      escalate_to_manager_id: rule.escalate_to_manager_id != null ? String(rule.escalate_to_manager_id) : null,
      conditions: rule.conditions || '',
      is_active: rule.is_active
    });
    if (rule.target_sales_rep_ids) {
      const ids = rule.target_sales_rep_ids
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => +s)
        .filter(n => !isNaN(n));
      this.selectedRepIds.set(new Set(ids));
    }
  }

  isRepSelected(id: number): boolean {
    return this.selectedRepIds().has(id);
  }

  toggleRep(id: number): void {
    const next = new Set(this.selectedRepIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedRepIds.set(next);
  }

  saveRule(): void {
    if (this.ruleForm.invalid) {
      this.ruleForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const formValue = { ...this.ruleForm.value };
    if (formValue.escalate_to_manager_id) {
      formValue.escalate_to_manager_id = +formValue.escalate_to_manager_id;
    }
    const repIds = Array.from(this.selectedRepIds()).sort((a, b) => a - b).join(',');
    const payload: any = {
      ...formValue,
      target_sales_rep_ids: repIds || null
    };

    const request$ = this.isEditMode() && this.ruleId
      ? this.crmService.updateAssignmentRule(this.ruleId, payload)
      : this.crmService.createAssignmentRule(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/crm/lead-assignments']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to save rule.');
      }
    });
  }
}
