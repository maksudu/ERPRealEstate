import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  APInvoice,
  APSupplierStatement,
  APSupplierLedgerStatementItem
} from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Vendor } from '../../../core/models/procurement.model';
import { Subcontractor } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

interface AgingBucket {
  label: string;
  amount: number;
  count: number;
  badgeClass: string;
}

interface ProjectPayableSummary {
  projectName: string;
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  invoiceCount: number;
}

@Component({
  selector: 'app-payable-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './payable-ledger.component.html'
})
export class PayableLedgerComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private procurementService = inject(ProcurementService);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Reference data
  vendors = signal<Vendor[]>([]);
  contractors = signal<Subcontractor[]>([]);
  projects = signal<Project[]>([]);
  allInvoices = signal<APInvoice[]>([]);

  // Filter states
  payeeType = signal<'all' | 'vendor' | 'contractor'>('all');
  selectedPayeeId = signal<string>(''); // e.g. "v-1" or "c-2"
  selectedProjectId = signal<number | null>(null);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  tableSearch = signal<string>('');

  // Default date
  todayStr: string = new Date().toISOString().split('T')[0];

  // Active Statement Data
  statementData = signal<APSupplierStatement | null>(null);

  // Tab View
  activeView = signal<'statement' | 'aging' | 'project_analysis'>('statement');

  // Payee Dropdown Options
  payeeOptions = computed(() => {
    const list: { value: string; label: string; subLabel?: string }[] = [];
    
    // Add vendors
    this.vendors().forEach(v => {
      list.push({
        value: `v-${v.id}`,
        label: `${v.vendor_name} (Supplier)`,
        subLabel: `Material Supplier • Contact: ${v.contact_person || 'N/A'}`
      });
    });

    // Add contractors
    this.contractors().forEach(c => {
      const name = c.company_name || (c as any).contractor_name || `Contractor #${c.id}`;
      list.push({
        value: `c-${c.id}`,
        label: `${name} (Contractor)`,
        subLabel: `Subcontractor • Trade: ${c.trade_specialization || c.trade_category || 'Civil / Works'}`
      });
    });

    return list;
  });

  // Project Dropdown Options
  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      subLabel: p.site_address || p.district || ''
    }));
  });

  // Aging Analysis Breakdown
  agingBuckets = computed<AgingBucket[]>(() => {
    const invoices = this.allInvoices().filter(inv => inv.balance_due > 0 && inv.status !== 'Cancelled');
    const today = new Date();

    let currentAmt = 0, currentCnt = 0;
    let d1to30Amt = 0, d1to30Cnt = 0;
    let d31to60Amt = 0, d31to60Cnt = 0;
    let d61to90Amt = 0, d61to90Cnt = 0;
    let d90PlusAmt = 0, d90PlusCnt = 0;

    for (const inv of invoices) {
      const due = new Date(inv.due_date);
      const diffDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 3600 * 24));
      const bal = Number(inv.balance_due) || 0;

      if (diffDays <= 0) {
        currentAmt += bal;
        currentCnt++;
      } else if (diffDays <= 30) {
        d1to30Amt += bal;
        d1to30Cnt++;
      } else if (diffDays <= 60) {
        d31to60Amt += bal;
        d31to60Cnt++;
      } else if (diffDays <= 90) {
        d61to90Amt += bal;
        d61to90Cnt++;
      } else {
        d90PlusAmt += bal;
        d90PlusCnt++;
      }
    }

    return [
      { label: 'Current (Not Due)', amount: currentAmt, count: currentCnt, badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      { label: '1 - 30 Days Overdue', amount: d1to30Amt, count: d1to30Cnt, badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      { label: '31 - 60 Days Overdue', amount: d31to60Amt, count: d31to60Cnt, badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
      { label: '61 - 90 Days Overdue', amount: d61to90Amt, count: d61to90Cnt, badgeClass: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
      { label: '90+ Days Critical', amount: d90PlusAmt, count: d90PlusCnt, badgeClass: 'bg-red-500/10 text-red-700 border-red-500/30' }
    ];
  });

  // Project-Wise Payable Breakdown
  projectSummaries = computed<ProjectPayableSummary[]>(() => {
    const map = new Map<string, ProjectPayableSummary>();
    
    for (const inv of this.allInvoices()) {
      const pName = inv.project_name || 'Corporate Overhead';
      if (!map.has(pName)) {
        map.set(pName, {
          projectName: pName,
          totalInvoiced: 0,
          totalPaid: 0,
          balanceDue: 0,
          invoiceCount: 0
        });
      }
      const item = map.get(pName)!;
      item.totalInvoiced += Number(inv.net_payable_amount) || 0;
      item.totalPaid += Number(inv.paid_amount) || 0;
      item.balanceDue += Number(inv.balance_due) || 0;
      item.invoiceCount += 1;
    }

    return Array.from(map.values()).sort((a, b) => b.balanceDue - a.balanceDue);
  });

  // Filtered timeline statement items
  filteredTimeline = computed<APSupplierLedgerStatementItem[]>(() => {
    const stmt = this.statementData();
    if (!stmt || !stmt.items) return [];

    const query = this.tableSearch().trim().toLowerCase();
    if (!query) return stmt.items;

    return stmt.items.filter(item =>
      (item.reference_number && item.reference_number.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.transaction_type && item.transaction_type.toLowerCase().includes(query)) ||
      (item.project_name && item.project_name.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.loadInitialData();

    // Check query params
    this.route.queryParams.subscribe(params => {
      if (params['vendor_id']) {
        this.selectedPayeeId.set(`v-${params['vendor_id']}`);
      } else if (params['contractor_id']) {
        this.selectedPayeeId.set(`c-${params['contractor_id']}`);
      }
      if (params['project_id']) {
        this.selectedProjectId.set(Number(params['project_id']));
      }
      if (params['date_from']) this.dateFrom.set(params['date_from']);
      if (params['date_to']) this.dateTo.set(params['date_to']);

      this.fetchStatement();
    });
  }

  loadInitialData(): void {
    this.procurementService.getVendors().subscribe({
      next: (res: any) => {
        const vList = Array.isArray(res) ? res : (res?.data || []);
        this.vendors.set(vList);
      },
      error: err => console.warn('Vendors load error:', err)
    });

    this.constructionService.getContractors().subscribe({
      next: (res: any) => {
        const cList = Array.isArray(res) ? res : (res?.data || []);
        this.contractors.set(cList);
      },
      error: (err: any) => console.warn('Contractors load error:', err)
    });

    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const pList = Array.isArray(res) ? res : (res?.data || []);
        this.projects.set(pList);
      },
      error: err => console.warn('Projects load error:', err)
    });

    this.accountsService.getAPInvoices({ limit: 1000 }).subscribe({
      next: invoices => this.allInvoices.set(invoices || []),
      error: err => console.warn('All AP Invoices load error:', err)
    });
  }

  onPayeeChange(val: string): void {
    this.selectedPayeeId.set(val || '');
    this.fetchStatement();
  }

  onProjectChange(val: any): void {
    this.selectedProjectId.set(val ? Number(val) : null);
    this.fetchStatement();
  }

  onDateChange(): void {
    this.fetchStatement();
  }

  fetchStatement(): void {
    const payeeKey = this.selectedPayeeId();
    let vId: number | undefined;
    let cId: number | undefined;

    if (payeeKey.startsWith('v-')) {
      vId = Number(payeeKey.replace('v-', ''));
    } else if (payeeKey.startsWith('c-')) {
      cId = Number(payeeKey.replace('c-', ''));
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getAPSupplierStatement({
      vendor_id: vId,
      contractor_id: cId,
      date_from: this.dateFrom() || undefined,
      date_to: this.dateTo() || undefined
    }).subscribe({
      next: stmt => {
        this.statementData.set(stmt);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load supplier statement:', err);
        this.errorMessage.set(err.error?.detail || 'Failed to load statement for the selected payee.');
        this.statementData.set(null);
        this.isLoading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.selectedPayeeId.set('');
    this.selectedProjectId.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.tableSearch.set('');
    this.statementData.set(null);
    this.errorMessage.set(null);
  }

  exportCSV(): void {
    const items = this.filteredTimeline();
    if (!items.length) {
      alert('No statement items available to export.');
      return;
    }

    const stmt = this.statementData();
    const headers = ['Date', 'Type', 'Reference #', 'Description', 'Project', 'Debit (Disbursed)', 'Credit (Invoiced)', 'Running Balance'];
    const rows = items.map(i => [
      `"${i.transaction_date}"`,
      `"${i.transaction_type}"`,
      `"${i.reference_number}"`,
      `"${(i.description || '').replace(/"/g, '""')}"`,
      `"${i.project_name || 'N/A'}"`,
      i.debit_disbursement,
      i.credit_payable,
      i.running_payable_balance
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`"Supplier Statement: ${stmt?.payee_name || 'All'}"`,
       `"Date Range: ${this.dateFrom() || 'Start'} to ${this.dateTo() || 'Present'}"`,
       headers.join(','),
       ...rows.map(e => e.join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Supplier_Ledger_${(stmt?.payee_name || 'statement').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printStatement(): void {
    window.print();
  }
}
