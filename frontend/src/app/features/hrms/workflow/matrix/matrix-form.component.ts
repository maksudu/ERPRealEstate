import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HrmsWorkflowService, WorkflowMatrixRule } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-workflow-matrix-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="max-w-4xl mx-auto space-y-4">
      <div class="flex items-center justify-between pb-1">
        <button
          type="button"
          (click)="goBack()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <span>&larr;</span> Back to Approval Matrix
        </button>
        <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          Tier Configuration
        </span>
      </div>

      <app-card
        [title]="isEditMode ? 'Edit Approval Matrix Rule' : 'Configure New Approval Matrix Rule'"
        [subtitle]="isEditMode ? 'Update sanction tiers, thresholds, and role escalation parameters' : 'Define Maker-Checker multi-level approval policy for HR modules'"
      >
        @if (isLoading) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading rule parameters...
          </div>
        } @else {
          <form (ngSubmit)="saveRule()" class="space-y-6 text-xs">
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Section 1: Module & Tier Hierarchy -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Module Category & Approval Hierarchy
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Rule Title *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.rule_title"
                    name="rule_title"
                    placeholder="e.g. Leave Approval Multi-Tier Rule"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Module Category *"
                    placeholder="Select category..."
                    [(ngModel)]="formData.module_category"
                    name="module_category"
                    [options]="categoryOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Department Scope"
                    placeholder="Select department (Leave empty for All)..."
                    [(ngModel)]="formData.department_name"
                    name="department_name"
                    [options]="departmentOptions"
                    [allowCreateNew]="true"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tier Level (Sequence) *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    [(ngModel)]="formData.tier_level"
                    name="tier_level"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                  <p class="text-[10px] text-slate-400 mt-1">1 = First Approver (Supervisor), 2 = Department Head, 3 = Director / MD</p>
                </div>
              </div>
            </div>

            <!-- Section 2: Approver Role & Step Definition -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Approver Role & Designation Assignment
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Step Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.step_name"
                    name="step_name"
                    placeholder="e.g. Department Head Signoff"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Required Approver Role *"
                    placeholder="Select or enter role..."
                    [(ngModel)]="formData.approver_role"
                    name="approver_role"
                    [options]="roleOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Approver Designation *"
                    placeholder="Select or enter designation..."
                    [(ngModel)]="formData.approver_designation"
                    name="approver_designation"
                    [options]="designationOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Specific Approver Person (Optional)</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.approver_name"
                    name="approver_name"
                    placeholder="e.g. Engr. Tareq Hasan"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p class="text-[10px] text-slate-400 mt-1">If blank, any user with the designated role can approve.</p>
                </div>
              </div>
            </div>

            <!-- Section 3: Financial Thresholds & SLA -->
            <div class="pb-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-amber-500 rounded-full"></span>
                Thresholds, Turnaround SLA & Automation
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Threshold (Amount / Days)</label>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="formData.min_threshold"
                    name="min_threshold"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Maximum Threshold (Null = No Limit)</label>
                  <input
                    type="number"
                    step="0.01"
                    [(ngModel)]="formData.max_threshold"
                    name="max_threshold"
                    placeholder="Leave empty for unconstrained"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">SLA Turnaround (Hours) *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.sla_hours"
                    name="sla_hours"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-6">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.auto_escalate"
                    name="auto_escalate"
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span class="font-medium text-slate-700 dark:text-slate-300">Auto-Escalate after SLA expiry</span>
                </label>

                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.is_mandatory"
                    name="is_mandatory"
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span class="font-medium text-slate-700 dark:text-slate-300">Mandatory Step (Cannot be skipped)</span>
                </label>

                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.is_active"
                    name="is_active"
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span class="font-medium text-slate-700 dark:text-slate-300">Active Status</span>
                </label>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="goBack()"
                class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="isSaving || !formData.rule_title || !formData.step_name"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update Matrix Rule' : 'Save Matrix Rule' }}</span>
                }
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class WorkflowMatrixFormComponent implements OnInit {
  private service = inject(HrmsWorkflowService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  ruleId: number | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    rule_title: '',
    module_category: 'LEAVE',
    department_name: '',
    tier_level: 1,
    step_name: '',
    approver_designation: 'Department Head',
    approver_role: 'DEPT_HEAD',
    approver_name: '',
    min_threshold: 0,
    max_threshold: null,
    sla_hours: 24,
    auto_escalate: false,
    is_mandatory: true,
    is_active: true
  };

  categoryOptions: SelectOption[] = [
    { value: 'LEAVE', label: 'Leave Approval' },
    { value: 'OVERTIME', label: 'Overtime Signoff' },
    { value: 'ATTENDANCE', label: 'Attendance Regularization' },
    { value: 'RECRUITMENT', label: 'Recruitment & Job Offer' },
    { value: 'SALARY_REVISION', label: 'Salary Revision' },
    { value: 'PAYROLL', label: 'Monthly Payroll Lock' },
    { value: 'EXPENSE', label: 'Expense & Claim' }
  ];

  departmentOptions: SelectOption[] = [
    { value: 'Engineering & Site Operations', label: 'Engineering & Site Operations' },
    { value: 'Civil Project Site #4', label: 'Civil Project Site #4' },
    { value: 'Electrical & MEP', label: 'Electrical & MEP' },
    { value: 'Accounts & Finance', label: 'Accounts & Finance' },
    { value: 'Human Resources', label: 'Human Resources' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' }
  ];

  roleOptions: SelectOption[] = [
    { value: 'DEPT_HEAD', label: 'Department Head' },
    { value: 'PROJECT_MGR', label: 'Project Manager' },
    { value: 'HR_HEAD', label: 'HR Director / Head' },
    { value: 'FIN_MGR', label: 'Finance Manager' },
    { value: 'AUDITOR', label: 'Internal Auditor' },
    { value: 'COO', label: 'Chief Operating Officer' },
    { value: 'DIRECTOR', label: 'Director of Operations' },
    { value: 'MD', label: 'Managing Director' }
  ];

  designationOptions: SelectOption[] = [
    { value: 'Managing Director', label: 'Managing Director' },
    { value: 'Chief Operating Officer', label: 'Chief Operating Officer' },
    { value: 'Project Director', label: 'Project Director' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'HR Manager', label: 'HR Manager' },
    { value: 'Finance Manager', label: 'Finance Manager' },
    { value: 'Senior Accountant', label: 'Senior Accountant' },
    { value: 'Internal Auditor', label: 'Internal Auditor' }
  ];

  ngOnInit(): void {
    this.loadMetadata();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.ruleId = Number(idParam);
      this.isEditMode = true;
      this.loadRuleData(this.ruleId);
    }
  }

  loadMetadata(): void {
    this.service.getWorkflowMetadata().subscribe({
      next: (meta) => {
        if (meta.categories) this.categoryOptions = meta.categories.map(c => ({ value: c.value, label: c.label }));
        if (meta.departments) this.departmentOptions = meta.departments.map(d => ({ value: d.value, label: d.label }));
        if (meta.roles) this.roleOptions = meta.roles.map(r => ({ value: r.value, label: r.label }));
        if (meta.designations) this.designationOptions = meta.designations.map(d => ({ value: d.value, label: d.label }));
      },
      error: (err) => console.error('Failed to load metadata', err)
    });
  }

  loadRuleData(id: number): void {
    this.isLoading = true;
    this.service.getMatrixRuleById(id).subscribe({
      next: (rule) => {
        this.formData = {
          rule_title: rule.rule_title,
          module_category: rule.module_category,
          department_name: rule.department_name || '',
          tier_level: rule.tier_level,
          step_name: rule.step_name,
          approver_designation: rule.approver_designation,
          approver_role: rule.approver_role,
          approver_name: rule.approver_name || '',
          min_threshold: rule.min_threshold,
          max_threshold: rule.max_threshold,
          sla_hours: rule.sla_hours,
          auto_escalate: rule.auto_escalate,
          is_mandatory: rule.is_mandatory,
          is_active: rule.is_active
        };
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load rule', err);
        this.errorMessage = 'Unable to load rule parameters.';
        this.isLoading = false;
      }
    });
  }

  saveRule(): void {
    if (!this.formData.rule_title || !this.formData.step_name) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;

    if (this.isEditMode && this.ruleId) {
      this.service.updateMatrixRule(this.ruleId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.detail || 'Failed to update matrix rule.';
        }
      });
    } else {
      this.service.createMatrixRule(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err?.error?.detail || 'Failed to create matrix rule.';
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/workflow/matrix']);
  }
}
