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

export interface EssSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-employee-self-service',
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
            label="Download Statement"
            (btnClick)="downloadDoc()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Submit ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Available Annual Leaves</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">14.5 Days</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Attendance This Month</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">98.2% On-time</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Latest Payslip Available</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">September 2026</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Helpdesk Tickets</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">0 Open (Resolved)</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search requests, slips, notices..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Records</option>
              <option value="ACTIVE">Active / Issued</option>
              <option value="PENDING">Pending Review</option>
              <option value="COMPLETED">Approved / Closed</option>
            </select>
          </div>
        </div>

        <!-- Data table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Document / Request Ref</th>
                <th class="px-4 py-3">Subject / Type</th>
                <th class="px-4 py-3">Details / Value</th>
                <th class="px-4 py-3">Submission Date</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.category }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ item.value }}</div>
                    <div class="text-[10px] text-slate-500">{{ item.extra }}</div>
                  </td>
                  <td class="px-4 py-3">{{ item.date }}</td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="viewDetails(item)"
                      class="px-2.5 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                    >
                      View / Download
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
        [title]="'Submit ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Request Subject</label>
            <app-custom-input [(ngModel)]="formTitle" placeholder="e.g. Leave for Family Event / Mobile Bill Reimbursement"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Detailed Description / Value</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Reason, date range or amount"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Submit Request" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class EmployeeSelfServiceComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('my-profile');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formTitle = '';
  formNotes = '';

  viewsMeta: { [key: string]: EssSubView } = {
    'my-profile': { id: 'my-profile', title: 'My 360 Employee Profile', description: 'Personal, emergency contact, academic certifications, blood group and photo', badge: 'ESS 11.1' },
    'my-attendance': { id: 'my-attendance', title: 'My Real-Time Attendance & In/Out Logs', description: 'Daily biometric punches, shift timings, overtime hours and attendance regularization', badge: 'ESS 11.2' },
    'leave-requests': { id: 'leave-requests', title: 'My Leave Applications', description: 'Submit casual, sick, earned and maternity leave applications with supporting docs', badge: 'ESS 11.3' },
    'leave-balances': { id: 'leave-balances', title: 'My Leave Balance Breakdown', description: 'Accrued, consumed, pending and encashable leave quotas for the calendar year', badge: 'ESS 11.4' },
    'my-payslips': { id: 'my-payslips', title: 'My Monthly Payslips & Tax Deduction Form 108', description: 'Encrypted PDF payslip download, salary breakdown, bonuses, and tax deductions', badge: 'ESS 11.5' },
    'salary-history': { id: 'salary-history', title: 'My Salary Revision & Increment History', description: 'Historical promotions, grade escalations and annual merit increment logs', badge: 'ESS 11.6' },
    'loan-requests': { id: 'loan-requests', title: 'My Loan & Salary Advance Applications', description: 'Apply for staff welfare loans, festival advances and view recovery schedules', badge: 'ESS 11.7' },
    'expense-claims': { id: 'expense-claims', title: 'My Field Travel & Expense Claims', description: 'Upload receipts for project site visits, meals, travel conveyance and mobile allowances', badge: 'ESS 11.8' },
    'my-documents': { id: 'my-documents', title: 'My Digital Document Locker', description: 'Appointment letter, NID, educational degrees, driving license, and TIN certificates', badge: 'ESS 11.9' },
    'notices': { id: 'notices', title: 'Company Circulars & Official Notices', description: 'Holiday notifications, corporate HR policies, management memos, and safety guidelines', badge: 'ESS 11.10' },
    'helpdesk': { id: 'helpdesk', title: 'HR & IT Support Helpdesk', description: 'Raise internal support tickets for attendance disputes, PF inquiries, and software access', badge: 'ESS 11.11' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['my-profile'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'PS-2026-09', title: 'September 2026 Salary Payslip', category: 'Monthly Payroll', value: 'Net: ৳ 78,500', extra: 'Direct Bank Transfer', date: '2026-10-01', status: 'COMPLETED' },
    { id: 2, ref: 'LV-8812', title: 'Annual Family Vacation Leave', category: 'Earned Leave (EL)', value: '3 Days (Oct 22 - Oct 24)', extra: 'Supervisor Approved', date: '2026-10-14', status: 'APPROVED' },
    { id: 3, ref: 'EXP-109', title: 'Site Inspection Fuel & Conveyance', category: 'Travel Allowance (TA)', value: '৳ 3,450', extra: 'Voucher #883', date: '2026-10-15', status: 'PENDING' },
    { id: 4, ref: 'CIR-2026-12', title: 'Durga Puja & Eid Holiday Notice', category: 'Official Circular', value: 'Holiday Schedule & Operations', extra: 'Issued by HR Director', date: '2026-10-10', status: 'ACTIVE' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.title.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
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

  downloadDoc(): void {
    alert('Generating & Downloading Encrypted PDF Document');
  }

  openActionModal(): void {
    this.formTitle = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formTitle) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'REQ-' + Math.floor(1000 + Math.random() * 9000),
        title: this.formTitle,
        category: this.currentViewMeta().title,
        value: 'Submitted Record',
        extra: 'Pending Review',
        date: new Date().toISOString().split('T')[0],
        status: 'PENDING'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Viewing Details for ${item.title} (${item.ref})\nValue: ${item.value}\nStatus: ${item.status}`);
  }
}
