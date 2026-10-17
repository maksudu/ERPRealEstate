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

export interface SeparationSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-employee-separation',
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
            label="Clearance Checklist"
            (btnClick)="openChecklist()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Initiate ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Notice Periods</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">7 Employees</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Clearances</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">4 In Process</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Final Settlements Paid</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 1,820,000</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Certificates Issued</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">18 Released</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search staff, separation ID, department..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Under Notice / Clearance</option>
              <option value="PENDING">Pending Final Approval</option>
              <option value="COMPLETED">Settled & Relieved</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Separation Ref</th>
                <th class="px-4 py-3">Employee Name</th>
                <th class="px-4 py-3">Separation Type</th>
                <th class="px-4 py-3">Clearance Status</th>
                <th class="px-4 py-3">Effective Last Day</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.code }} • {{ item.dept }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.type }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.reason }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-800 dark:text-slate-200">{{ item.clearanceProgress }}</div>
                    <div class="text-[10px] text-slate-500">Asset, IT, HR & Accounts</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.lastWorkingDay }}</div>
                    <div class="text-[10px] text-slate-500">Notice: {{ item.noticeDays }} Days</div>
                  </td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="viewDetails(item)"
                      class="px-2.5 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                    >
                      Clearance Hub
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
        [title]="'Initiate ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Staff Employee Name</label>
            <app-custom-input [(ngModel)]="formName" placeholder="Employee Name & Code"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Last Working Date</label>
            <app-custom-input [(ngModel)]="formDate" placeholder="YYYY-MM-DD"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes & Clearance Instructions</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Reason for resignation/termination and department handovers"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save & Submit" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class EmployeeSeparationComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('resignations');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formName = '';
  formDate = '';
  formNotes = '';

  viewsMeta: { [key: string]: SeparationSubView } = {
    'resignations': { id: 'resignations', title: 'Resignation Requests', description: 'Employee resignation submissions, manager acceptance and notice period tracking', badge: 'Separation 10.1' },
    'notice-periods': { id: 'notice-periods', title: 'Notice Period Tracking', description: 'Notice duration compliance, buyout waiver requests and last working day calculation', badge: 'Separation 10.2' },
    'terminations': { id: 'terminations', title: 'Statutory Terminations & Layoffs', description: 'Labour Act statutory dismissal, severance notices and management disciplinary actions', badge: 'Separation 10.3' },
    'exit-interviews': { id: 'exit-interviews', title: 'Exit Interviews & Feedback', description: 'Structured exit questionnaires, feedback analysis and retention risk audits', badge: 'Separation 10.4' },
    'asset-clearances': { id: 'asset-clearances', title: 'Asset & Hardware Clearance', description: 'Laptops, mobile devices, site equipment, vehicles and corporate SIM cards handover', badge: 'Separation 10.5' },
    'dept-clearances': { id: 'dept-clearances', title: 'Departmental Clearances', description: 'Signoffs from Project Head, IT, Accounts, Legal and Administrative departments', badge: 'Separation 10.6' },
    'loan-settlements': { id: 'loan-settlements', title: 'Outstanding Loan Settlements', description: 'Recovery of pending company loans and salary advances from final payout', badge: 'Separation 10.7' },
    'leave-settlements': { id: 'leave-settlements', title: 'Earned Leave Encashment Settlement', description: 'Calculation of unspent earned annual leave encashment entitlement', badge: 'Separation 10.8' },
    'final-salaries': { id: 'final-salaries', title: 'Final Salary & Gratuity Calculation', description: 'Pro-rata monthly salary, PF settlement and statutory gratuity computation', badge: 'Separation 10.9' },
    'settlement-approvals': { id: 'settlement-approvals', title: 'Final Settlement (Full & Final) Approval', description: 'Audit verification, Finance Director approval and bank cheque preparation', badge: 'Separation 10.10' },
    'experience-certificates': { id: 'experience-certificates', title: 'Experience & Release Certificates', description: 'Issuance of official service experience letter and release clearance deed', badge: 'Separation 10.11' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['resignations'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'SEP-2026-004', name: 'Arifur Rahman', code: 'EMP-055', dept: 'Structural Engineering', type: 'Voluntary Resignation', reason: 'Better Opportunity Abroad', clearanceProgress: '4/4 Completed', lastWorkingDay: '2026-10-31', noticeDays: 30, status: 'COMPLETED' },
    { id: 2, ref: 'SEP-2026-005', name: 'Tanima Chowdhury', code: 'EMP-072', dept: 'Marketing & Digital', type: 'Resignation', reason: 'Higher Studies', clearanceProgress: '2/4 Pending Accounts', lastWorkingDay: '2026-11-15', noticeDays: 45, status: 'ACTIVE' },
    { id: 3, ref: 'SEP-2026-006', name: 'Zahirul Haque', code: 'EMP-091', dept: 'Project Site Security', type: 'Contract Completion', reason: 'Site Handover Finished', clearanceProgress: '3/4 In IT Audit', lastWorkingDay: '2026-10-25', noticeDays: 15, status: 'ACTIVE' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.dept.toLowerCase().includes(q);
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

  openChecklist(): void {
    alert('Opening Full 360 Department Clearance Checklist');
  }

  openActionModal(): void {
    this.formName = '';
    this.formDate = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formName) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
        name: this.formName,
        code: 'EMP-SEP',
        dept: 'Corporate Operations',
        type: this.currentViewMeta().title,
        reason: 'Formal Procedure',
        clearanceProgress: '1/4 Initiated',
        lastWorkingDay: this.formDate || new Date().toISOString().split('T')[0],
        noticeDays: 30,
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Separation Hub for ${item.name} (${item.ref})\nClearance: ${item.clearanceProgress}\nLWD: ${item.lastWorkingDay}`);
  }
}
