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
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <a
            routerLink="/crm/lead-assignments"
            class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Assignment & Distribution"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 4.3 · Distribution Rules
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {{ isEditMode() ? 'Rule #' + ruleId : 'New Rule' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {{ isEditMode() ? 'Edit Assignment Rule' : 'Create Assignment Rule' }}
            </h1>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/crm/lead-assignments" class="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors">
            Back to List
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="ruleForm.invalid || isSubmitting()"
            [loading]="isSubmitting()"
            (clicked)="saveRule()"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ isEditMode() ? 'Update Rule' : 'Save Rule' }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <app-card-container
        title="Automatic Lead Distribution Rule"
        subtitle="Configure round-robin, project-wise, location-wise, property-type, campaign-specific or broker routing with SLA and manager escalation"
      >
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
              Tick the representatives eligible for this rule. Leave all unticked to route to any eligible rep.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              @for (rep of salesReps(); track rep.id) {
                <label class="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-xs">
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
            <span class="text-xs text-slate-700 dark:text-slate-300">Rule is active (new leads will be routed by this rule)</span>
          </label>
        </form>
      </app-card-container>
    </div>
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
    const v = { ...this.ruleForm.value };

    if (v.conditions && String(v.conditions).trim()) {
      try {
        JSON.parse(String(v.conditions));
      } catch {
        alert('Conditions must be valid JSON, e.g. {"lead_source_id":"BROKER"}. Leave blank for no conditions.');
        return;
      }
    }

    const repIds = Array.from(this.selectedRepIds());
    const payload: any = {
      rule_name: v.rule_name,
      method: v.method,
      priority_order: +v.priority_order || 0,
      sla_hours: +v.sla_hours || 24,
      escalate_to_manager_id: v.escalate_to_manager_id ? +v.escalate_to_manager_id : null,
      conditions: v.conditions && String(v.conditions).trim() ? String(v.conditions).trim() : null,
      target_sales_rep_ids: repIds.length > 0 ? repIds.join(',') : null,
      is_active: !!v.is_active
    };

    this.isSubmitting.set(true);
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
        alert(err?.error?.detail || err?.error?.[0]?.msg || 'Failed to save rule.');
      }
    });
  }
}
