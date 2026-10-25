import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HrmsWorkflowService } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-workflow-delegation-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="max-w-3xl mx-auto space-y-4">
      <div class="flex items-center justify-between pb-1">
        <button
          type="button"
          (click)="goBack()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <span>&larr;</span> Back to Delegations
        </button>
        <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          Proxy Assignment
        </span>
      </div>

      <app-card
        title="Establish Authority Delegation"
        subtitle="Authorize a designated colleague to sign and sanction requests during absence"
      >
        <form (ngSubmit)="saveDelegation()" class="space-y-6 text-xs">
          @if (errorMessage) {
            <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
              {{ errorMessage }}
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Delegator Name (Current Authority) *</label>
              <input
                type="text"
                [(ngModel)]="formData.delegator_name"
                name="delegator_name"
                placeholder="e.g. Engr. Tareq Hasan"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <app-searchable-select
                label="Delegator Designation *"
                placeholder="Select or enter designation..."
                [(ngModel)]="formData.delegator_designation"
                name="delegator_designation"
                [options]="designationOptions"
                [allowCreateNew]="true"
                [required]="true"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Delegatee Name (Assigned Proxy) *</label>
              <input
                type="text"
                [(ngModel)]="formData.delegatee_name"
                name="delegatee_name"
                placeholder="e.g. Engr. A. K. Azad"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <app-searchable-select
                label="Delegatee Designation *"
                placeholder="Select or enter designation..."
                [(ngModel)]="formData.delegatee_designation"
                name="delegatee_designation"
                [options]="designationOptions"
                [allowCreateNew]="true"
                [required]="true"
              />
            </div>

            <div>
              <app-searchable-select
                label="Module Delegation Scope *"
                placeholder="Select scope..."
                [(ngModel)]="formData.module_scope"
                name="module_scope"
                [options]="scopeOptions"
                [allowCreateNew]="false"
                [required]="true"
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Active Status</label>
              <div class="pt-2">
                <label class="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    [(ngModel)]="formData.is_active"
                    name="is_active"
                    class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <span class="font-medium text-slate-700 dark:text-slate-300">Proxy active and authorized</span>
                </label>
              </div>
            </div>

            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.start_date"
                name="start_date"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.end_date"
                name="end_date"
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>

            <div class="sm:col-span-2">
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Reason / Tour Notes</label>
              <textarea
                [(ngModel)]="formData.reason"
                name="reason"
                rows="3"
                placeholder="State official purpose of absence or delegation justification..."
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              ></textarea>
            </div>
          </div>

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
              [disabled]="isSaving || !formData.delegator_name || !formData.delegatee_name || !formData.start_date || !formData.end_date"
              class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 shadow-xs transition"
            >
              @if (isSaving) {
                <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving...</span>
              } @else {
                <span>Authorize Delegation</span>
              }
            </button>
          </div>
        </form>
      </app-card>
    </div>
  `
})
export class WorkflowDelegationFormComponent implements OnInit {
  private service = inject(HrmsWorkflowService);
  private router = inject(Router);

  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    delegator_name: '',
    delegator_designation: 'Project Manager',
    delegatee_name: '',
    delegatee_designation: 'Site Engineer',
    module_scope: 'ALL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    reason: '',
    is_active: true
  };

  designationOptions: SelectOption[] = [
    { value: 'Managing Director', label: 'Managing Director' },
    { value: 'Chief Operating Officer', label: 'Chief Operating Officer' },
    { value: 'Project Director', label: 'Project Director' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Site Engineer', label: 'Site Engineer' },
    { value: 'HR Manager', label: 'HR Manager' },
    { value: 'Finance Manager', label: 'Finance Manager' },
    { value: 'Senior Accountant', label: 'Senior Accountant' }
  ];

  scopeOptions: SelectOption[] = [
    { value: 'ALL', label: 'All HR Modules' },
    { value: 'LEAVE', label: 'Leave Approval Only' },
    { value: 'OVERTIME', label: 'Overtime Signoff Only' },
    { value: 'ATTENDANCE', label: 'Attendance Regularization Only' },
    { value: 'RECRUITMENT', label: 'Recruitment Sanctions Only' },
    { value: 'EXPENSE', label: 'Expense Authorizations Only' }
  ];

  ngOnInit(): void {
    this.service.getWorkflowMetadata().subscribe({
      next: (meta) => {
        if (meta.designations) this.designationOptions = meta.designations.map(d => ({ value: d.value, label: d.label }));
      },
      error: (err) => console.error('Failed to load metadata', err)
    });
  }

  saveDelegation(): void {
    if (!this.formData.delegator_name || !this.formData.delegatee_name || !this.formData.start_date || !this.formData.end_date) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }
    this.isSaving = true;
    this.errorMessage = null;

    this.service.createDelegation(this.formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.goBack();
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMessage = err?.error?.detail || 'Failed to create authority delegation.';
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/hrms/workflow/delegation']);
  }
}
