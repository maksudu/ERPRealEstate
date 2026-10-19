import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  ARInvoice,
  ARCustomerStatement,
  ARCustomerStatementItem,
  ARAgingReport,
  ChartOfAccount
} from '../../../core/models/accounts.model';
import { Customer } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-receivable-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './receivable-ledger.component.html'
})
export class ReceivableLedgerComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  customers = signal<Customer[]>([]);
  projects = signal<Project[]>([]);
  bankAccounts = signal<ChartOfAccount[]>([]);

  // Filter states
  selectedCustomerId = signal<number | null>(null);
  selectedProjectId = signal<number | null>(null);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  tableSearch = signal<string>('');

  // Active Statement & Aging Data
  statementData = signal<ARCustomerStatement | null>(null);
  agingData = signal<ARAgingReport | null>(null);

  // Tab View
  activeView = signal<'statement' | 'aging' | 'unallocated'>('statement');
  showAdvanceModal = signal<boolean>(false);
  isSubmittingAdvance = signal<boolean>(false);

  todayStr = new Date().toISOString().split('T')[0];

  customerOptions = computed(() => {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code})`,
      subLabel: `Phone: ${c.primary_phone || 'N/A'}`
    }));
  });

  projectOptions = computed(() => {
    return [
      { value: null, label: 'All Projects' },
      ...this.projects().map(p => ({
        value: p.id,
        label: `${p.project_name} (${p.project_code || 'PRJ'})`,
        subLabel: p.site_address || ''
      }))
    ];
  });

  bankAccountOptions: { value: any; label: string }[] = [];

  advanceForm: FormGroup = this.fb.group({
    customer_id: [null, Validators.required],
    project_id: [null],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    receipt_date: [this.todayStr, Validators.required],
    collection_method: ['Bank_Transfer', Validators.required],
    bank_account_id: [null],
    bank_name: [''],
    cheque_number: [''],
    cheque_date: [''],
    transaction_reference: [''],
    notes: ['']
  });

  filteredTimeline = computed<ARCustomerStatementItem[]>(() => {
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
    this.loadReferences();
    this.loadAgingReport();

    this.route.queryParams.subscribe(params => {
      if (params['customer_id']) {
        this.selectedCustomerId.set(Number(params['customer_id']));
      }
      if (params['project_id']) {
        this.selectedProjectId.set(Number(params['project_id']));
      }
      if (params['date_from']) this.dateFrom.set(params['date_from']);
      if (params['date_to']) this.dateTo.set(params['date_to']);

      this.fetchStatement();
    });
  }

  loadReferences(): void {
    this.crmService.getCustomers().subscribe({
      next: (custs: any) => {
        const list: Customer[] = Array.isArray(custs) ? custs : (custs?.data || []);
        this.customers.set(list);
      },
      error: err => console.warn('Failed to load customers:', err)
    });

    this.projectService.getProjects().subscribe({
      next: (projs: any) => {
        const list: Project[] = Array.isArray(projs) ? projs : (projs?.data || []);
        this.projects.set(list);
      },
      error: err => console.warn('Failed to load projects:', err)
    });

    this.accountsService.getCOAHierarchy().subscribe({
      next: (tree) => {
        const banks: ChartOfAccount[] = [];
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.is_leaf_account && (node.is_reconciliation_account || node.account_code.startsWith('1110') || node.account_code.startsWith('1120') || node.account_name_en.toLowerCase().includes('bank') || node.account_name_en.toLowerCase().includes('cash'))) {
              banks.push(node);
            }
            if (node.children) traverse(node.children);
          }
        };
        traverse(tree);
        this.bankAccounts.set(banks);
        this.bankAccountOptions = banks.map(b => ({
          value: b.id,
          label: `${b.account_code} - ${b.account_name_en}`
        }));
      },
      error: err => console.warn('Failed to load COA banks:', err)
    });
  }

  loadAgingReport(): void {
    this.accountsService.getARAgingReport({
      project_id: this.selectedProjectId() || undefined,
      customer_id: this.selectedCustomerId() || undefined
    }).subscribe({
      next: report => this.agingData.set(report),
      error: err => console.warn('Failed to load AR aging report:', err)
    });
  }

  onCustomerChange(val: any): void {
    this.selectedCustomerId.set(val ? Number(val) : null);
    this.fetchStatement();
    this.loadAgingReport();
  }

  onProjectChange(val: any): void {
    this.selectedProjectId.set(val ? Number(val) : null);
    this.loadAgingReport();
  }

  fetchStatement(): void {
    const custId = this.selectedCustomerId();
    if (!custId) {
      this.statementData.set(null);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getARCustomerStatement({
      customer_id: custId,
      date_from: this.dateFrom() || undefined,
      date_to: this.dateTo() || undefined
    }).subscribe({
      next: stmt => {
        this.statementData.set(stmt);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load customer statement:', err);
        this.errorMessage.set(err.error?.detail || 'Failed to load statement for the selected customer.');
        this.statementData.set(null);
        this.isLoading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.selectedCustomerId.set(null);
    this.selectedProjectId.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.tableSearch.set('');
    this.statementData.set(null);
    this.errorMessage.set(null);
    this.loadAgingReport();
  }

  openAdvanceModal(): void {
    this.advanceForm.patchValue({
      customer_id: this.selectedCustomerId(),
      project_id: this.selectedProjectId(),
      amount: 0,
      receipt_date: this.todayStr
    });
    this.showAdvanceModal.set(true);
  }

  submitAdvance(): void {
    if (this.advanceForm.invalid) {
      this.advanceForm.markAllAsTouched();
      return;
    }

    this.isSubmittingAdvance.set(true);
    const val = this.advanceForm.value;
    const payload = {
      customer_id: Number(val.customer_id),
      project_id: val.project_id ? Number(val.project_id) : null,
      amount: parseFloat(val.amount),
      receipt_date: val.receipt_date,
      collection_method: val.collection_method,
      bank_account_id: val.bank_account_id ? Number(val.bank_account_id) : null,
      bank_name: val.bank_name?.trim() || null,
      cheque_number: val.cheque_number?.trim() || null,
      cheque_date: val.cheque_date || null,
      transaction_reference: val.transaction_reference?.trim() || null,
      notes: val.notes?.trim() || 'Unallocated customer advance cash'
    };

    this.accountsService.recordUnallocatedARReceipt(payload).subscribe({
      next: () => {
        this.isSubmittingAdvance.set(false);
        this.showAdvanceModal.set(false);
        this.successMessage.set('Unallocated Customer Advance Receipt recorded and GL voucher posted.');
        setTimeout(() => this.successMessage.set(null), 4000);
        this.fetchStatement();
      },
      error: (err) => {
        console.error('Failed to record advance:', err);
        alert(err.error?.detail || 'Failed to record unallocated advance cash.');
        this.isSubmittingAdvance.set(false);
      }
    });
  }

  exportCSV(): void {
    const items = this.filteredTimeline();
    if (!items.length) {
      alert('No statement items available to export.');
      return;
    }

    const stmt = this.statementData();
    const headers = ['Date', 'Type', 'Reference #', 'Description', 'Project', 'Unit', 'Debit (Demand)', 'Credit (Collection)', 'Running Balance'];
    const rows = items.map(i => [
      `"${i.transaction_date}"`,
      `"${i.transaction_type}"`,
      `"${i.reference_number}"`,
      `"${(i.description || '').replace(/"/g, '""')}"`,
      `"${i.project_name || 'N/A'}"`,
      `"${i.unit_number || 'N/A'}"`,
      i.debit_demand,
      i.credit_collection,
      i.running_receivable_balance
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`"Customer Statement of Account: ${stmt?.customer_name || 'All'}"`,
       `"Date Range: ${this.dateFrom() || 'Start'} to ${this.dateTo() || 'Present'}"`,
       headers.join(','),
       ...rows.map(e => e.join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Customer_Statement_${(stmt?.customer_name || 'statement').replace(/\s+/g, '_')}_${this.todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printStatement(): void {
    window.print();
  }
}
