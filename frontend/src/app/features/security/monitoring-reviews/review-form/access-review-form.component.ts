import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, AccessReviewItem } from '../../../../core/services/security.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-access-review-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-6">
      <!-- Top Breadcrumb -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span>&larr;</span> Back to Access Certification Reviews
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Access Certification
          </span>
        </div>
      </div>

      <!-- Main Form Card -->
      <app-card
        [title]="isEditMode ? 'Modify Access Certification Review Cycle' : 'Initiate User Access Review Cycle'"
        [subtitle]="isEditMode ? 'Update audit status or audit counts for cycle #' + reviewCode : 'Schedule periodic recertification of user roles, permissions and segregation of duties (SoD)'"
      >
        @if (loadingData) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading access review cycle details...
          </div>
        } @else {
          <form (ngSubmit)="saveReview()" class="space-y-6 text-xs">
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Cycle Scope -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Audit Cycle Title & Scope
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Audit Cycle Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.cycle_name"
                    name="cycle_name"
                    placeholder="e.g. Q1 2026 Executive Access Recertification"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Department Scope *"
                    placeholder="Select or enter department..."
                    [(ngModel)]="formData.department"
                    name="department"
                    [options]="departmentOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>
              </div>
            </div>

            <!-- Lead Reviewer & Review Counts -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Auditor Assignment & Recertification Statistics
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <app-searchable-select
                    label="Lead Reviewer / Officer *"
                    placeholder="Select or enter lead auditor..."
                    [(ngModel)]="formData.reviewer_name"
                    name="reviewer_name"
                    [options]="reviewerOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Review Cycle Status *"
                    placeholder="Select status..."
                    [(ngModel)]="formData.status"
                    name="status"
                    [options]="statusOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Users Reviewed *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.total_users_reviewed"
                    name="total_users_reviewed"
                    min="0"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Certified Accounts Count *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.certified_count"
                    name="certified_count"
                    min="0"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Revoked / Flagged Accounts *</label>
                  <input
                    type="number"
                    [(ngModel)]="formData.revoked_count"
                    name="revoked_count"
                    min="0"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
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
                [disabled]="isSaving || !formData.cycle_name || !formData.department || !formData.reviewer_name"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update Review Cycle' : 'Initiate Review Cycle' }}</span>
                }
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class AccessReviewFormComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  reviewId: number | null = null;
  reviewCode: string = '';
  loadingData = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    cycle_name: 'Quarterly User Access Review & SOD Audit',
    department: 'All Departments',
    reviewer_name: 'Chief Information Security Officer',
    total_users_reviewed: 45,
    certified_count: 43,
    revoked_count: 2,
    status: 'IN_PROGRESS'
  };

  departmentOptions: SelectOption[] = [
    { value: 'All Departments', label: 'All Departments (Enterprise Scope)' },
    { value: 'Executive Management', label: 'Executive Management' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Internal Audit', label: 'Internal Audit' },
    { value: 'Supply Chain & Procurement', label: 'Supply Chain & Procurement' }
  ];

  reviewerOptions: SelectOption[] = [
    { value: 'Chief Information Security Officer', label: 'Chief Information Security Officer (CISO)' },
    { value: 'Internal Audit Lead', label: 'Internal Audit Lead' },
    { value: 'Super Administrator', label: 'Super Administrator' },
    { value: 'Managing Director', label: 'Managing Director' },
    { value: 'Finance Director', label: 'Finance Director' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'IN_PROGRESS', label: 'IN_PROGRESS (Review Underway)' },
    { value: 'PENDING_SIGNOFF', label: 'PENDING_SIGNOFF (Awaiting Sign-off)' },
    { value: 'COMPLETED', label: 'COMPLETED (Audited & Certified)' },
    { value: 'ARCHIVED', label: 'ARCHIVED (Historical Record)' }
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.reviewId = Number(idParam);
      this.isEditMode = true;
      this.loadReviewData(this.reviewId);
    }
  }

  loadReviewData(id: number): void {
    this.loadingData = true;
    this.service.getAccessReviewById(id).subscribe({
      next: (rev) => {
        this.reviewCode = rev.review_code;
        this.formData = {
          cycle_name: rev.cycle_name || '',
          department: rev.department || 'All Departments',
          reviewer_name: rev.reviewer_name || '',
          total_users_reviewed: rev.total_users_reviewed || 0,
          certified_count: rev.certified_count || 0,
          revoked_count: rev.revoked_count || 0,
          status: rev.status || 'IN_PROGRESS'
        };
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load review', err);
        this.errorMessage = 'Unable to load access review details. Please check connection.';
        this.loadingData = false;
      }
    });
  }

  saveReview(): void {
    if (!this.formData.cycle_name || !this.formData.department || !this.formData.reviewer_name) {
      this.errorMessage = 'Please complete all required fields marked with *';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    if (this.isEditMode && this.reviewId) {
      this.service.updateAccessReview(this.reviewId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update access review', err);
          this.errorMessage = err?.error?.detail || 'Failed to update access review cycle.';
          this.isSaving = false;
        }
      });
    } else {
      this.service.createAccessReview(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to create access review', err);
          this.errorMessage = err?.error?.detail || 'Failed to initiate access review cycle.';
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/security/monitoring-reviews'], { queryParams: { tab: 'access_reviews' } });
  }
}
