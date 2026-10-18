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

export interface StatutorySubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-statutory-compliance',
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
            label="NBR Form 108 Package"
            (btnClick)="downloadNbr()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Record ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Section 50 TDS Remitted</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 840,000</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Labour Act Compliance</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">100% Certified</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Contracts Renewed</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">128 Contracts</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Upcoming Audit Deadlines</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">3 Upcoming</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search compliance register, certificate, NBR ref..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Compliant / Active</option>
              <option value="PENDING">Due / Pending Filing</option>
              <option value="COMPLETED">Filed & Certified</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Compliance Ref</th>
                <th class="px-4 py-3">Statutory Act & Provision</th>
                <th class="px-4 py-3">Scope / Target Group</th>
                <th class="px-4 py-3">Filing / Challan Date</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.law }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.scope }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.entities }}</div>
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
                      Audit Details
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
        [title]="'Record ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Statutory Record Title</label>
            <app-custom-input [(ngModel)]="formTitle" placeholder="e.g. Income Tax Return Form 108 Filing"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Statutory Law / Section</label>
            <app-custom-input [(ngModel)]="formLaw" placeholder="e.g. Section 50, Income Tax Act 2023"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Compliance Notes & Challan Details</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Treasury challan number, depositing bank and audit trail"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save & File" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class StatutoryComplianceComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('tax-config');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formTitle = '';
  formLaw = '';
  formNotes = '';

  viewsMeta: { [key: string]: StatutorySubView } = {
    'tax-config': { id: 'tax-config', title: 'Income Tax Slabs & Configuration', description: 'Bangladesh Income Tax Act 2023 progressive salary tax slabs, female rebates and rebate thresholds', badge: 'Compliance 13.1' },
    'tax-deductions': { id: 'tax-deductions', title: 'Monthly Salary Tax Deduction Records', description: 'Section 50 TDS deduction records, treasury challans and deposit receipts', badge: 'Compliance 13.2' },
    'tax-certificates': { id: 'tax-certificates', title: 'Employee Tax Deduction Certificates (Form 108)', description: 'Annual TDS certificate generation, e-TIN verification and NBR filing statements', badge: 'Compliance 13.3' },
    'registers': { id: 'registers', title: 'Bangladesh Labour Act Statutory Registers', description: 'Form 8 Adult Worker Register, Form 9 Leave Book, Form 11 Overtime Register and Form 15 Fine Register', badge: 'Compliance 13.4' },
    'statutory-registers': { id: 'statutory-registers', title: 'Bangladesh Labour Act Statutory Registers', description: 'Form 8 Adult Worker Register, Form 9 Leave Book, Form 11 Overtime Register and Form 15 Fine Register', badge: 'Compliance 13.4' },
    'contracts': { id: 'contracts', title: 'Employment Contracts & Service Books', description: 'Bilingual legal employment agreements, probation clauses and digital service book records', badge: 'Compliance 13.5' },
    'policies': { id: 'policies', title: 'Corporate HR Policy Acknowledgment', description: 'Employee code of conduct, sexual harassment policy, safety manual and signed digital acknowledgments', badge: 'Compliance 13.6' },
    'calendar': { id: 'calendar', title: 'Statutory Compliance Calendar', description: 'Deadlines for NBR monthly returns, quarterly statements, annual returns and audit compliance', badge: 'Compliance 13.7' },
    'audit-documents': { id: 'audit-documents', title: 'Compliance & Labour Audit Vault', description: 'Department of Inspection for Factories and Establishments (DIFE) compliance and audit documentation', badge: 'Compliance 13.8' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['tax-config'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'TAX-2026-Q3', name: 'Form 108 Annual Salary Return', law: 'Income Tax Act 2023 (Sec 108)', scope: 'All Salaried Employees (> 3.5L)', entities: 'Holding & 4 Subsidiaries', date: '2026-10-15', status: 'ACTIVE' },
    { id: 2, ref: 'REG-BD-08', name: 'Form 8 Adult Worker Register', law: 'Bangladesh Labour Act 2006 (Sec 9)', scope: 'Site Workers & Factory Labor', entities: 'All Real Estate Project Sites', date: '2026-10-01', status: 'COMPLETED' },
    { id: 3, ref: 'CHL-9902', name: 'Treasury Challan Deposit (Sept 2026 TDS)', law: 'National Board of Revenue (NBR)', scope: 'Sonali Bank Treasury Branch', entities: 'Challan #8849-T', date: '2026-10-07', status: 'COMPLETED' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.law.toLowerCase().includes(q);
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

  downloadNbr(): void {
    alert('Generating NBR Standard Form 108 Electronic Excel/PDF Return Package');
  }

  openActionModal(): void {
    this.formTitle = '';
    this.formLaw = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formTitle) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'TAX-' + Math.floor(1000 + Math.random() * 9000),
        name: this.formTitle,
        law: this.formLaw || 'Bangladesh Statutory Act',
        scope: 'Enterprise Staff',
        entities: 'Head Office & Sites',
        date: new Date().toISOString().split('T')[0],
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Viewing Compliance Details for ${item.name} (${item.ref})\nAct: ${item.law}\nDate: ${item.date}`);
  }
}
