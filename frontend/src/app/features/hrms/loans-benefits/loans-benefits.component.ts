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

export interface LoanSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-loans-benefits',
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
            label="Disbursement Schedule"
            (btnClick)="openSchedule()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Apply / New ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Active Loans</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 2,450,000</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Recovered This Month</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 320,000</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Pending Advances</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">6 Applications</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Claims Reimbursed</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 85,400</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search staff name, loan ID, reference..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Records</option>
              <option value="ACTIVE">Disbursed / Active</option>
              <option value="PENDING">Pending Approval</option>
              <option value="COMPLETED">Fully Settled</option>
            </select>
          </div>
        </div>

        <!-- Data table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Record ID</th>
                <th class="px-4 py-3">Employee</th>
                <th class="px-4 py-3">Type / Category</th>
                <th class="px-4 py-3">Principal Amount</th>
                <th class="px-4 py-3">Tenure & Installment</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employeeName }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.empCode }} • {{ item.dept }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.type }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.subType }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.amount | number }}
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.installments }} Months (৳ {{ item.monthlyDeduction | number }}/mo)</div>
                    <div class="text-[10px] text-slate-500">Balance: ৳ {{ item.balance | number }}</div>
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
                      Ledger / Action
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Modal -->
      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'New ' + currentViewMeta().title + ' Entry'"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Staff Employee Name</label>
            <app-custom-input [(ngModel)]="formEmpName" placeholder="Employee Name & Code"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Amount (BDT)</label>
            <app-custom-input [(ngModel)]="formAmount" placeholder="e.g. 50000"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tenure (Months) / Reason</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Repayment plan and approval justification"></app-custom-textarea>
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
export class LoansBenefitsComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('loans');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formEmpName = '';
  formAmount = '';
  formNotes = '';

  viewsMeta: { [key: string]: LoanSubView } = {
    'salary-advances': { id: 'salary-advances', title: 'Salary Advance Management', description: 'Emergency short-term advance against forthcoming monthly payroll', badge: 'Benefits 8.1' },
    'loans': { id: 'loans', title: 'Employee Long-term Loans', description: 'Corporate welfare, motor-bike and construction personal loans', badge: 'Benefits 8.2' },
    'approvals': { id: 'approvals', title: 'Loan Approval Hierarchy', description: 'Multi-tier HR, Finance Director and Managing Director approvals', badge: 'Benefits 8.3' },
    'loan-approvals': { id: 'loan-approvals', title: 'Loan Approval Hierarchy', description: 'Multi-tier HR, Finance Director and Managing Director approvals', badge: 'Benefits 8.3' },
    'disbursements': { id: 'disbursements', title: 'Loan Disbursement Register', description: 'Bank transfer vouchers, accounts cheque payments and disbursement dates', badge: 'Benefits 8.4' },
    'loan-disbursements': { id: 'loan-disbursements', title: 'Loan Disbursement Register', description: 'Bank transfer vouchers, accounts cheque payments and disbursement dates', badge: 'Benefits 8.4' },
    'installment-schedules': { id: 'installment-schedules', title: 'Installment Repayment Schedules', description: 'Monthly principal and interest recovery schedules linked to payroll deductions', badge: 'Benefits 8.5' },
    'loan-recoveries': { id: 'loan-recoveries', title: 'Loan Recovery & Reconciliation', description: 'Historical payroll deductions, early settlement and closure certificates', badge: 'Benefits 8.6' },
    'medical-reimbursements': { id: 'medical-reimbursements', title: 'Medical Reimbursement Claims', description: 'Prescription, diagnostic bill verification and policy reimbursement limits', badge: 'Benefits 8.7' },
    'travel-allowances': { id: 'travel-allowances', title: 'Travel & Conveyance Allowances (TA/DA)', description: 'Site visits, project inspection travel and daily allowance claims', badge: 'Benefits 8.8' },
    'expense-claims': { id: 'expense-claims', title: 'Official Expense Claims', description: 'Site petty cash, mobile bills, internet and corporate entertainment claims', badge: 'Benefits 8.9' },
    'benefits-master': { id: 'benefits-master', title: 'Corporate Employee Benefits Master', description: 'Provident Fund (PF), Gratuity, Group Life Insurance and Health Coverage', badge: 'Benefits 8.10' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['loans'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'LN-2026-012', employeeName: 'Engr. Tareq Hasan', empCode: 'EMP-014', dept: 'Structural Engineering', type: 'Motorcycle Loan', subType: 'Installment Loan', amount: 120000, installments: 12, monthlyDeduction: 10000, balance: 60000, status: 'ACTIVE' },
    { id: 2, ref: 'ADV-8910', employeeName: 'Rafiqul Islam', empCode: 'EMP-088', dept: 'Site Store', type: 'Festival Salary Advance', subType: 'Advance', amount: 35000, installments: 2, monthlyDeduction: 17500, balance: 17500, status: 'ACTIVE' },
    { id: 3, ref: 'MED-4421', employeeName: 'Nadia Akter', empCode: 'EMP-031', dept: 'Accounts', type: 'Medical Claim', subType: 'Reimbursement', amount: 15400, installments: 1, monthlyDeduction: 0, balance: 0, status: 'APPROVED' },
    { id: 4, ref: 'TA-9901', employeeName: 'Kamal Hossain', empCode: 'EMP-007', dept: 'Civil Project', type: 'Site Tour TA/DA', subType: 'Conveyance', amount: 8200, installments: 1, monthlyDeduction: 0, balance: 0, status: 'COMPLETED' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.employeeName.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.type.toLowerCase().includes(q);
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

  openSchedule(): void {
    alert('Opening Full Repayment Amortization Schedule');
  }

  openActionModal(): void {
    this.formEmpName = '';
    this.formAmount = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formEmpName) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
        employeeName: this.formEmpName,
        empCode: 'EMP-NEW',
        dept: 'Operations',
        type: this.currentViewMeta().title,
        subType: 'Standard',
        amount: Number(this.formAmount) || 20000,
        installments: 6,
        monthlyDeduction: Math.round((Number(this.formAmount) || 20000) / 6),
        balance: Number(this.formAmount) || 20000,
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Viewing Details for ${item.employeeName} (${item.ref})\nPrincipal: ৳ ${item.amount}\nBalance: ৳ ${item.balance}`);
  }
}
