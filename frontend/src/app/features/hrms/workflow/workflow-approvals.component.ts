import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

export interface WorkflowSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-workflow-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-card-container
        [title]="currentViewMeta().title"
        [subtitle]="currentViewMeta().description"
        [badge]="currentViewMeta().badge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          <app-custom-button
            variant="outline"
            size="sm"
            label="Audit Trail Logs"
            (btnClick)="openAuditTrail()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Configure ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending My Action</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">8 Items</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Approved This Week</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">34 Requests</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Rejected / Returned</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">2 Items</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Delegations</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">1 Delegated Rule</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search approval request, applicant, step..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Workflow Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Fully Approved</option>
              <option value="REJECTED">Rejected / Clarification</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Workflow ID</th>
                <th class="px-4 py-3">Initiator / Applicant</th>
                <th class="px-4 py-3">Module / Subject</th>
                <th class="px-4 py-3">Approval Level / Role</th>
                <th class="px-4 py-3">Submitted On</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.initiator }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.dept }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.subject }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.category }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.level }}</div>
                    <div class="text-[10px] text-slate-500">Approver: {{ item.approver }}</div>
                  </td>
                  <td class="px-4 py-3">{{ item.date }}</td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right space-x-1">
                    <button
                      type="button"
                      (click)="approve(item)"
                      class="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded hover:bg-emerald-100 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      (click)="reject(item)"
                      class="px-2 py-1 text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 rounded hover:bg-rose-100 transition-colors"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'Configure ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Rule / Step Title</label>
            <app-custom-input [(ngModel)]="formTitle" placeholder="e.g. Leave Approval Multi-Tier Rule"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Approval Level & Threshold</label>
            <app-custom-input [(ngModel)]="formLevel" placeholder="e.g. Level 1: Dept Head -> Level 2: HR Director"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Matrix Parameters & Delegation</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Threshold amounts, SLA days, auto-escalation"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save Rule" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class WorkflowApprovalsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('matrix');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formTitle = '';
  formLevel = '';
  formNotes = '';

  viewsMeta: { [key: string]: WorkflowSubView } = {
    'matrix': { id: 'matrix', title: 'Enterprise Approval Matrix', description: 'Multi-level Maker-Checker rules, financial thresholds and tiered signoffs', badge: 'Workflow 12.1' },
    'leaves': { id: 'leaves', title: 'Leave Approval Console', description: 'Department head, HR verification, and medical board signoffs for leave requests', badge: 'Workflow 12.2' },
    'overtime': { id: 'overtime', title: 'Overtime Signoff & Verifications', description: 'Site engineer certification, work order verification, and billable overtime approval', badge: 'Workflow 12.3' },
    'attendance': { id: 'attendance', title: 'Attendance Correction Approvals', description: 'Regularization of biometric missing punches and outdoor duty approvals', badge: 'Workflow 12.4' },
    'recruitment': { id: 'recruitment', title: 'Recruitment & Job Offer Approvals', description: 'Manpower requisition sanctioning, interview shortlist signoff, and salary offering', badge: 'Workflow 12.5' },
    'salary-revisions': { id: 'salary-revisions', title: 'Salary Revision Approvals', description: 'Appraisal increment approval, promotional grade change and director authorizations', badge: 'Workflow 12.6' },
    'payroll': { id: 'payroll', title: 'Monthly Payroll Final Approvals', description: '4-Tier Payroll Lock: Prepared -> Verified -> Audit Signoff -> MD Authorization', badge: 'Workflow 12.7' },
    'expenses': { id: 'expenses', title: 'Expense & Claim Approvals', description: 'Travel, medical, petty cash and site entertainment claim authorizations', badge: 'Workflow 12.8' },
    'delegation': { id: 'delegation', title: 'Authority Delegation & Proxy', description: 'Temporary transfer of approval authority during leave or overseas tours', badge: 'Workflow 12.9' },
    'history': { id: 'history', title: 'Complete Approval Audit History', description: 'Immutable chronological event log, IP addresses, digital signatures and timestamps', badge: 'Workflow 12.10' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['matrix'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'WF-2026-901', initiator: 'Engr. Kamal Hossain', dept: 'Civil Project Site #4', subject: 'Site Concrete Overtime Claim (12 hrs)', category: 'Overtime Approval', level: 'Tier-2 (Project Manager)', approver: 'Engr. Tareq Hasan', date: '2026-10-16', status: 'PENDING' },
    { id: 2, ref: 'WF-2026-902', initiator: 'Sumaiya Akter', dept: 'Accounts & Finance', subject: 'Earned Leave (4 Days) for Medical', category: 'Leave Approval', level: 'Tier-1 (Dept Head)', approver: 'Head of Accounts', date: '2026-10-15', status: 'APPROVED' },
    { id: 3, ref: 'WF-2026-903', initiator: 'HR Operations', dept: 'Human Resources', subject: 'October 2026 Monthly Payroll Batch (৳ 8.5M)', category: 'Payroll Approval', level: 'Tier-4 (Managing Director)', approver: 'Board of Directors', date: '2026-10-17', status: 'PENDING' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.initiator.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q);
      const matchSt = !st || item.status === st;
      return matchQ && matchSt;
    });
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.viewsMeta[path]) {
        this.currentSubView.set(path);
      }
    });
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view && this.viewsMeta[view]) {
        this.currentSubView.set(view);
      }
    });
  }

  openAuditTrail(): void {
    alert('Opening Full Immutable Cryptographic Audit Log');
  }

  openActionModal(): void {
    this.formTitle = '';
    this.formLevel = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formTitle) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'WF-' + Math.floor(1000 + Math.random() * 9000),
        initiator: 'Authorized User',
        dept: 'Corporate Governance',
        subject: this.formTitle,
        category: this.currentViewMeta().title,
        level: this.formLevel || 'Level 1',
        approver: 'Department Lead',
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  approve(item: any): void {
    item.status = 'APPROVED';
    alert(`Approved ${item.ref}: ${item.subject}`);
  }

  reject(item: any): void {
    item.status = 'REJECTED';
    alert(`Rejected ${item.ref}: Returned to initiator for clarification.`);
  }
}
