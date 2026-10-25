import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HrmsWorkflowService, WorkflowRequest } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-workflow-request-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  template: `
    <div class="space-y-4">
      <!-- KPI Metric Cards Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 shadow-2xs">
          <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-500">Pending Review</div>
            <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ pendingCount() }} Items</div>
          </div>
        </div>

        <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 shadow-2xs">
          <div class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-500">Approved</div>
            <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ approvedCount() }} Items</div>
          </div>
        </div>

        <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 shadow-2xs">
          <div class="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-500">Rejected</div>
            <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ rejectedCount() }} Items</div>
          </div>
        </div>

        <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-3 shadow-2xs">
          <div class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <div>
            <div class="text-[11px] font-medium text-slate-500">Total Filtered</div>
            <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ totalCount() }} Requests</div>
          </div>
        </div>
      </div>

      <!-- Main Table Card -->
      <app-card
        [title]="viewTitle"
        [subtitle]="viewSubtitle"
        [badge]="viewBadge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            type="button"
            (click)="newRequest()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <span>+ Submit Application</span>
          </button>
        </div>

        <!-- Filter bar -->
        <div class="p-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div class="sm:col-span-2">
            <label class="block font-medium text-slate-600 dark:text-slate-400 mb-1">Search Request</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              placeholder="Search request number, applicant, subject, department..."
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <app-searchable-select
              label="Status Filter"
              placeholder="All Statuses"
              [(ngModel)]="statusFilter"
              (ngModelChange)="loadRequests()"
              [options]="statusOptions"
              [allowCreateNew]="false"
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

        <!-- Table -->
        <div class="overflow-x-auto">
          @if (isLoading()) {
            <div class="py-12 text-center text-slate-400 text-xs">
              Loading approval requests from server...
            </div>
          } @else if (requests().length === 0) {
            <div class="py-12 text-center text-slate-400 text-xs">
              No approval requests found for this category.
            </div>
          } @else {
            <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
                <tr>
                  <th class="px-4 py-3">Tracking Ref</th>
                  <th class="px-4 py-3">Applicant & Department</th>
                  <th class="px-4 py-3">Category & Subject</th>
                  <th class="px-4 py-3 text-center">Tier Stage</th>
                  <th class="px-4 py-3">Current Approver</th>
                  <th class="px-4 py-3 text-right">Value / Days</th>
                  <th class="px-4 py-3 text-center">Status</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (item of requests(); track item.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors">
                    <td class="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {{ item.request_number }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.applicant_name }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.department_name }} • {{ item.designation }}</div>
                    </td>
                    <td class="px-4 py-3 max-w-xs">
                      <div class="font-medium text-slate-800 dark:text-slate-200 truncate">{{ item.subject }}</div>
                      <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span class="px-1.5 py-0.2 rounded font-medium bg-slate-100 dark:bg-slate-800">
                          {{ item.module_category }}
                        </span>
                        <span>{{ item.submission_date ? (item.submission_date | date:'mediumDate') : 'Today' }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-center whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        Tier {{ item.current_tier }} of {{ item.total_tiers }}
                      </span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.current_approver_name || 'Designated Authority' }}</div>
                      <div class="text-[10px] text-slate-400 font-mono">{{ item.current_approver_role || 'DEPT_HEAD' }}</div>
                    </td>
                    <td class="px-4 py-3 text-right font-medium whitespace-nowrap">
                      @if (item.financial_amount > 0) {
                        <div class="font-mono text-emerald-600 dark:text-emerald-400">৳ {{ item.financial_amount | number:'1.2-2' }}</div>
                      }
                      @if (item.days_count > 0) {
                        <div class="text-[10px] text-slate-400 font-mono">{{ item.days_count }} Day(s)</div>
                      }
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge [status]="item.status"></app-status-badge>
                    </td>
                    <td class="px-4 py-3 text-right whitespace-nowrap space-x-1">
                      @if (item.status === 'PENDING') {
                        <button
                          type="button"
                          (click)="openActionModal(item, 'APPROVE')"
                          class="px-2 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 transition"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          (click)="openActionModal(item, 'REJECT')"
                          class="px-2 py-1 text-xs font-semibold rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 transition"
                        >
                          Reject
                        </button>
                      } @else {
                        <span class="text-[10px] font-mono text-slate-400 px-2 py-1">Processed</span>
                      }
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
            Showing {{ offset() + 1 }} to {{ min(offset() + limit(), totalCount()) }} of {{ totalCount() }} requests
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

      <!-- Approval / Rejection Action Modal -->
      <app-modal
        [isOpen]="isActionModalOpen"
        [title]="selectedAction === 'APPROVE' ? 'Sanction & Approve Request' : 'Reject / Return Application'"
        (closeModal)="isActionModalOpen = false"
      >
        @if (selectedRequest) {
          <div class="space-y-4 text-xs">
            <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div class="flex justify-between">
                <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedRequest.request_number }}</span>
                <span class="font-medium text-indigo-600">{{ selectedRequest.module_category }}</span>
              </div>
              <div class="text-slate-700 dark:text-slate-300 font-medium">{{ selectedRequest.subject }}</div>
              <div class="text-[11px] text-slate-500">
                Applicant: {{ selectedRequest.applicant_name }} ({{ selectedRequest.department_name }})
              </div>
            </div>

            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                {{ selectedAction === 'APPROVE' ? 'Approval Remarks & Sanction Notes' : 'Reason for Rejection *' }}
              </label>
              <textarea
                [(ngModel)]="actionComments"
                rows="3"
                placeholder="Enter comments for digital audit trail..."
                class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              ></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                (click)="isActionModalOpen = false"
                class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="submitAction()"
                [disabled]="isActionSubmitting || (selectedAction === 'REJECT' && !actionComments.trim())"
                [class.bg-emerald-600]="selectedAction === 'APPROVE'"
                [class.hover:bg-emerald-700]="selectedAction === 'APPROVE'"
                [class.bg-rose-600]="selectedAction === 'REJECT'"
                [class.hover:bg-rose-700]="selectedAction === 'REJECT'"
                class="px-4 py-1.5 rounded-lg text-white font-medium disabled:opacity-40 shadow-xs transition"
              >
                {{ isActionSubmitting ? 'Processing...' : (selectedAction === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection') }}
              </button>
            </div>
          </div>
        }
      </app-modal>
    </div>
  `
})
export class WorkflowRequestListComponent implements OnInit {
  private service = inject(HrmsWorkflowService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @Input() fixedCategory?: string;

  requests = signal<WorkflowRequest[]>([]);
  totalCount = signal<number>(0);
  pendingCount = signal<number>(0);
  approvedCount = signal<number>(0);
  rejectedCount = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  statusFilter = 'ALL';

  viewTitle = 'Approval Console';
  viewSubtitle = 'Review, sanction or return pending enterprise employee requests';
  viewBadge = 'Workflow 12.0';

  isActionModalOpen = false;
  selectedRequest: WorkflowRequest | null = null;
  selectedAction: 'APPROVE' | 'REJECT' = 'APPROVE';
  actionComments = '';
  isActionSubmitting = false;

  statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved / Cleared' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CORRECTION_REQUESTED', label: 'Correction Requested' }
  ];

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      this.resolveCategoryFromPath(path);
      this.loadRequests();
    });
  }

  resolveCategoryFromPath(path?: string): void {
    if (this.fixedCategory) return;
    switch (path) {
      case 'leaves':
        this.fixedCategory = 'LEAVE';
        this.viewTitle = 'Leave Approval Console';
        this.viewSubtitle = 'Review earned, sick, casual, maternity and bereavement leave requests';
        this.viewBadge = 'Workflow 12.2';
        break;
      case 'overtime':
        this.fixedCategory = 'OVERTIME';
        this.viewTitle = 'Overtime Signoff & Verifications';
        this.viewSubtitle = 'Site engineer certification, work order verification, and billable overtime approval';
        this.viewBadge = 'Workflow 12.3';
        break;
      case 'attendance':
        this.fixedCategory = 'ATTENDANCE';
        this.viewTitle = 'Attendance Regularization Approvals';
        this.viewSubtitle = 'Regularization of biometric missing punches, outdoor client duty and shift swaps';
        this.viewBadge = 'Workflow 12.4';
        break;
      case 'recruitment':
        this.fixedCategory = 'RECRUITMENT';
        this.viewTitle = 'Recruitment & Job Offer Approvals';
        this.viewSubtitle = 'Manpower requisition sanctioning, interview shortlist signoff, and offer approvals';
        this.viewBadge = 'Workflow 12.5';
        break;
      case 'salary-revisions':
        this.fixedCategory = 'SALARY_REVISION';
        this.viewTitle = 'Salary Revision Approvals';
        this.viewSubtitle = 'Appraisal increment approval, promotional grade change and director authorizations';
        this.viewBadge = 'Workflow 12.6';
        break;
      case 'payroll':
        this.fixedCategory = 'PAYROLL';
        this.viewTitle = 'Monthly Payroll Final Approvals';
        this.viewSubtitle = '4-Tier Payroll Lock: Prepared -> Verified -> Audit Signoff -> MD Authorization';
        this.viewBadge = 'Workflow 12.7';
        break;
      case 'expenses':
        this.fixedCategory = 'EXPENSE';
        this.viewTitle = 'Expense & Claim Approvals';
        this.viewSubtitle = 'Travel, medical, petty cash and site entertainment claim authorizations';
        this.viewBadge = 'Workflow 12.8';
        break;
      default:
        this.fixedCategory = undefined;
        this.viewTitle = 'Enterprise Approval Console';
        this.viewSubtitle = 'Review, sanction or return pending employee requests across all modules';
        this.viewBadge = 'Workflow 12.0';
    }
  }

  loadRequests(): void {
    this.isLoading.set(true);
    this.service.getWorkflowRequests({
      category: this.fixedCategory,
      status_filter: this.statusFilter !== 'ALL' ? this.statusFilter : undefined,
      search: this.searchQuery.trim() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.requests.set(res.items);
        this.totalCount.set(res.total);
        // Compute quick KPI counts
        this.pendingCount.set(res.items.filter(i => i.status === 'PENDING').length);
        this.approvedCount.set(res.items.filter(i => i.status === 'APPROVED').length);
        this.rejectedCount.set(res.items.filter(i => i.status === 'REJECTED').length);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load workflow requests', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadRequests();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'ALL';
    this.offset.set(0);
    this.loadRequests();
  }

  newRequest(): void {
    this.router.navigate(['/hrms/workflow/requests/create'], {
      queryParams: this.fixedCategory ? { category: this.fixedCategory } : {}
    });
  }

  openActionModal(request: WorkflowRequest, action: 'APPROVE' | 'REJECT'): void {
    this.selectedRequest = request;
    this.selectedAction = action;
    this.actionComments = action === 'APPROVE' ? 'Approved as per enterprise policy norms' : '';
    this.isActionModalOpen = true;
  }

  submitAction(): void {
    if (!this.selectedRequest) return;
    this.isActionSubmitting = true;
    this.service.processWorkflowAction(this.selectedRequest.id, {
      action: this.selectedAction,
      comments: this.actionComments.trim()
    }).subscribe({
      next: () => {
        this.isActionSubmitting = false;
        this.isActionModalOpen = false;
        this.loadRequests();
      },
      error: (err) => {
        this.isActionSubmitting = false;
        alert(err?.error?.detail || 'Failed to process workflow action.');
      }
    });
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadRequests();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.totalCount()) {
      this.offset.update(v => v + this.limit());
      this.loadRequests();
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
