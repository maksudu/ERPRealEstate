import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HrmsWorkflowService } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-workflow-request-form',
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
          <span>&larr;</span> Back to Approval Console
        </button>
        <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          Request Initiation
        </span>
      </div>

      <app-card
        [title]="isEditMode ? 'Modify Workflow Application' : 'Initiate New HRMS Workflow Request'"
        [subtitle]="isEditMode ? 'Update request details prior to final sanction' : 'Submit request into enterprise multi-tier approval matrix chain'"
      >
        <form (ngSubmit)="saveRequest()" class="space-y-6 text-xs">
          @if (errorMessage) {
            <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
              {{ errorMessage }}
            </div>
          }

          <!-- Section 1: Applicant Identity -->
          <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
              Applicant & Department Information
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Applicant Full Name *</label>
                <input
                  type="text"
                  [(ngModel)]="formData.applicant_name"
                  name="applicant_name"
                  placeholder="e.g. Engr. Kamal Hossain"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Employee Code / ID</label>
                <input
                  type="text"
                  [(ngModel)]="formData.applicant_code"
                  name="applicant_code"
                  placeholder="e.g. EMP-2025-081"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <app-searchable-select
                  label="Department *"
                  placeholder="Select department..."
                  [(ngModel)]="formData.department_name"
                  name="department_name"
                  [options]="departmentOptions"
                  [allowCreateNew]="true"
                  [required]="true"
                />
              </div>

              <div>
                <app-searchable-select
                  label="Designation *"
                  placeholder="Select designation..."
                  [(ngModel)]="formData.designation"
                  name="designation"
                  [options]="designationOptions"
                  [allowCreateNew]="true"
                  [required]="true"
                />
              </div>
            </div>
          </div>

          <!-- Section 2: Application Particulars -->
          <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              Application Category & Subject Matter
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  label="Priority Level *"
                  placeholder="Select priority..."
                  [(ngModel)]="formData.priority"
                  name="priority"
                  [options]="priorityOptions"
                  [allowCreateNew]="false"
                  [required]="true"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Subject / Purpose Summary *</label>
                <input
                  type="text"
                  [(ngModel)]="formData.subject"
                  name="subject"
                  placeholder="e.g. Earned Leave (4 Days) for Medical Treatment"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          </div>

          <!-- Section 3: Value, Duration & Detailed Notes -->
          <div class="pb-2">
            <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <span class="w-1.5 h-4 bg-amber-500 rounded-full"></span>
              Quantification, Financials & Notes
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Financial Amount (BDT ৳)</label>
                <input
                  type="number"
                  step="0.01"
                  [(ngModel)]="formData.financial_amount"
                  name="financial_amount"
                  placeholder="0.00"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p class="text-[10px] text-slate-400 mt-1">Leave 0 if not a monetary claim.</p>
              </div>

              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Days Count / Hours</label>
                <input
                  type="number"
                  step="0.5"
                  [(ngModel)]="formData.days_count"
                  name="days_count"
                  placeholder="0.0"
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p class="text-[10px] text-slate-400 mt-1">e.g. 4.0 days for leave or 12.0 hours for overtime.</p>
              </div>

              <div class="sm:col-span-2">
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Detailed Explanation & Justification</label>
                <textarea
                  [(ngModel)]="formData.notes"
                  name="notes"
                  rows="3"
                  placeholder="Describe justification, schedule, and attach relevant references for approver signoff..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>
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
              [disabled]="isSaving || !formData.applicant_name || !formData.subject"
              class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 shadow-xs transition"
            >
              @if (isSaving) {
                <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Submitting...</span>
              } @else {
                <span>Submit Application to Matrix Chain</span>
              }
            </button>
          </div>
        </form>
      </app-card>
    </div>
  `
})
export class WorkflowRequestFormComponent implements OnInit {
  private service = inject(HrmsWorkflowService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  requestId: number | null = null;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    applicant_name: '',
    applicant_code: '',
    department_name: 'Civil Project Site #4',
    designation: 'Site Engineer',
    module_category: 'LEAVE',
    priority: 'NORMAL',
    subject: '',
    financial_amount: 0,
    days_count: 1,
    notes: ''
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

  designationOptions: SelectOption[] = [
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'Senior Accountant', label: 'Senior Accountant' },
    { value: 'MEP Supervisor', label: 'MEP Supervisor' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Sales Executive', label: 'Sales Executive' }
  ];

  priorityOptions: SelectOption[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' }
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const cat = params.get('category');
      if (cat) this.formData.module_category = cat;
    });

    this.service.getWorkflowMetadata().subscribe({
      next: (meta) => {
        if (meta.categories) this.categoryOptions = meta.categories.map(c => ({ value: c.value, label: c.label }));
        if (meta.departments) this.departmentOptions = meta.departments.map(d => ({ value: d.value, label: d.label }));
        if (meta.designations) this.designationOptions = meta.designations.map(d => ({ value: d.value, label: d.label }));
        if (meta.priorities) this.priorityOptions = meta.priorities.map(p => ({ value: p.value, label: p.label }));
      },
      error: (err) => console.error('Failed to load metadata', err)
    });
  }

  saveRequest(): void {
    if (!this.formData.applicant_name || !this.formData.subject) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;

    this.service.createWorkflowRequest(this.formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.goBack();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err?.error?.detail || 'Failed to submit workflow request.';
      }
    });
  }

  goBack(): void {
    const cat = this.formData.module_category;
    let target = '/hrms/workflow/matrix';
    if (cat === 'LEAVE') target = '/hrms/workflow/leaves';
    else if (cat === 'OVERTIME') target = '/hrms/workflow/overtime';
    else if (cat === 'ATTENDANCE') target = '/hrms/workflow/attendance';
    else if (cat === 'RECRUITMENT') target = '/hrms/workflow/recruitment';
    else if (cat === 'SALARY_REVISION') target = '/hrms/workflow/salary-revisions';
    else if (cat === 'PAYROLL') target = '/hrms/workflow/payroll';
    else if (cat === 'EXPENSE') target = '/hrms/workflow/expenses';
    this.router.navigateByUrl(target);
  }
}
