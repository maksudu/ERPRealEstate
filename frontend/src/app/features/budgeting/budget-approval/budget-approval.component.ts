import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BudgetingService, ApprovalWorkflowStep } from '../../../core/services/budgeting.service';
import { BudgetingNavComponent } from '../budgeting-nav/budgeting-nav.component';
import { CardContainerComponent, ModalComponent } from '../../../shared/components';

@Component({
  selector: 'app-budget-approval',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BudgetingNavComponent,
    CardContainerComponent,
    ModalComponent
  ],
  template: `
    <div class="space-y-5">
      <app-budgeting-nav activeCode="6.0"></app-budgeting-nav>

      <!-- Stepper Header -->
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3">
          4-Stage Maker-Checker Budget Approval Pipeline
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">1</span>
            <div>
              <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Preparation</p>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-400">Site QS & Estimation</p>
            </div>
          </div>
          <div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">2</span>
            <div>
              <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Technical Review</p>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-400">Chief Engineer / Scope</p>
            </div>
          </div>
          <div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">3</span>
            <div>
              <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Finance Review</p>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-400">CFO / Cashflow Impact</p>
            </div>
          </div>
          <div class="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">4</span>
            <div>
              <p class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Management Approval</p>
              <p class="text-[10px] text-emerald-700 dark:text-emerald-400">MD / Board Lock</p>
            </div>
          </div>
        </div>
      </div>

      <app-card-container
        title="6.0 Budget Approval & Revision Governance"
        subtitle="Validate scope, quantities, unit rates, cashflow impact and execute baseline locks"
        badge="Governance Engine"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="loadWorkflows()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-300"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh Pipeline</span>
          </button>
        </div>

        <!-- Workflow Steps Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="px-4 py-3">Stage #</th>
                <th class="px-4 py-3">Step Name</th>
                <th class="px-4 py-3">Assigned Authority / Role</th>
                <th class="px-4 py-3">Current Status</th>
                <th class="px-4 py-3">Review Comments & Validation Notes</th>
                <th class="px-4 py-3">Actioned By</th>
                <th class="px-4 py-3 text-right">Decision Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (wf of workflows(); track wf.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-mono font-bold text-slate-500">
                    Stage {{ wf.step_sequence }}
                  </td>
                  <td class="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                    {{ wf.step_name }}
                  </td>
                  <td class="px-4 py-3 text-slate-600 dark:text-slate-400">
                    {{ wf.assigned_role }}
                  </td>
                  <td class="px-4 py-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300': wf.status === 'APPROVED',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': wf.status === 'PENDING',
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300': wf.status === 'REJECTED',
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300': wf.status === 'RETURNED'
                      }"
                    >
                      {{ wf.status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                    {{ wf.comments || 'Awaiting reviewer feedback...' }}
                  </td>
                  <td class="px-4 py-3 text-slate-800 dark:text-slate-200 font-medium">
                    {{ wf.action_by || '-' }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        (click)="openDecisionModal(wf, 'APPROVED')"
                        class="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        (click)="openDecisionModal(wf, 'RETURNED')"
                        class="px-2.5 py-1 rounded bg-amber-500 text-white text-[11px] font-semibold hover:bg-amber-600 transition-colors"
                      >
                        Return
                      </button>
                      <button
                        (click)="openDecisionModal(wf, 'REJECTED')"
                        class="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Action Modal -->
      <app-modal
        [isOpen]="isActionModalOpen"
        [title]="'Submit ' + pendingAction + ' Decision'"
        [subtitle]="'Step: ' + selectedStep?.step_name + ' (' + selectedStep?.assigned_role + ')'"
        (closeModal)="closeDecisionModal()"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Decision Comments / Remarks *</label>
            <textarea
              [(ngModel)]="decisionComments"
              rows="3"
              placeholder="Provide justification, rate confirmation or audit notes..."
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            ></textarea>
          </div>

          <div>
            <label class="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sign-off Authority Name</label>
            <input
              type="text"
              [(ngModel)]="actionBy"
              class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              (click)="closeDecisionModal()"
              class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              (click)="submitDecision()"
              class="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Confirm {{ pendingAction }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class BudgetApprovalComponent implements OnInit {
  private budgetingService = inject(BudgetingService);

  workflows = signal<ApprovalWorkflowStep[]>([]);
  isActionModalOpen = false;
  selectedStep: ApprovalWorkflowStep | null = null;
  pendingAction = 'APPROVED';
  decisionComments = '';
  actionBy = 'Chief Reviewing Officer';

  ngOnInit() {
    this.loadWorkflows();
  }

  loadWorkflows() {
    this.budgetingService.getApprovalWorkflows(1).subscribe({
      next: (res) => this.workflows.set(res)
    });
  }

  openDecisionModal(step: ApprovalWorkflowStep, action: string) {
    this.selectedStep = step;
    this.pendingAction = action;
    this.decisionComments = action === 'APPROVED' ? 'Quantities and rates verified against active BOQ baseline.' : '';
    this.isActionModalOpen = true;
  }

  closeDecisionModal() {
    this.isActionModalOpen = false;
    this.selectedStep = null;
  }

  submitDecision() {
    if (!this.selectedStep) return;
    this.budgetingService.processApprovalAction({
      workflow_id: this.selectedStep.id,
      action: this.pendingAction,
      comments: this.decisionComments,
      action_by: this.actionBy
    }).subscribe({
      next: () => {
        this.closeDecisionModal();
        this.loadWorkflows();
      }
    });
  }
}
