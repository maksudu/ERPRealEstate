import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountsService } from '../../../../core/services/accounts.service';
import { LookupService } from '../../../../core/services/lookup.service';
import { ProjectService } from '../../../../core/services/project.service';
import { CrmService } from '../../../../core/services/crm.service';
import {
  ARReceipt,
  ARReceiptSummaryKPIs
} from '../../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-receipt-list',
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
  templateUrl: './receipt-list.component.html'
})
export class ReceiptListComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private router = inject(Router);

  // Reactive State
  receipts = signal<ARReceipt[]>([]);
  kpis = signal<ARReceiptSummaryKPIs | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Search & Filter State
  searchQuery = '';
  selectedStatus = '';
  selectedMethod = '';
  selectedProjectId: number | null = null;
  selectedCustomerId: number | null = null;
  dateFrom = '';
  dateTo = '';

  // Pagination
  limit = 20;
  offset = 0;
  totalRecords = 0;
  currentPage = 1;

  limitOptions = [
    { value: 10, label: '10 per page' },
    { value: 20, label: '20 per page' },
    { value: 50, label: '50 per page' },
    { value: 100, label: '100 per page' }
  ];

  // Dynamic Lookup Options
  statusOptions: { value: any; label: string }[] = [];
  methodOptions: { value: any; label: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  customerOptions: { value: any; label: string }[] = [];

  ngOnInit(): void {
    this.loadLookups();
    this.loadProjects();
    this.loadCustomers();
    this.loadKPIs();
    this.loadReceipts();
  }

  loadLookups(): void {
    this.lookupService.getItems('AR_RECEIPT_STATUS').subscribe({
      next: (items) => {
        this.statusOptions = [
          { value: '', label: 'All Lifecycle Statuses' },
          ...items.map(i => ({ value: i.item_code, label: i.item_name_en }))
        ];
      },
      error: () => {
        this.statusOptions = [
          { value: '', label: 'All Lifecycle Statuses' },
          { value: 'Recorded', label: 'Receipt Recorded (Awaiting Clearance)' },
          { value: 'Cleared', label: 'Funds Verified & Cleared' },
          { value: 'Allocated', label: 'Fully Allocated to Invoices' },
          { value: 'Partially_Allocated', label: 'Partially Allocated' },
          { value: 'Unallocated', label: 'Unallocated Advance Balance' },
          { value: 'Reversed', label: 'Reversed / Dishonored Cheque' },
          { value: 'Refunded', label: 'Refunded to Customer' }
        ];
      }
    });

    this.lookupService.getItems('AR_COLLECTION_METHOD').subscribe({
      next: (items) => {
        this.methodOptions = [
          { value: '', label: 'All Collection Methods' },
          ...items.map(i => ({ value: i.item_code, label: i.item_name_en }))
        ];
      },
      error: () => {
        this.methodOptions = [
          { value: '', label: 'All Collection Methods' },
          { value: 'Bank_Transfer', label: 'Bank Transfer (BEFTN/RTGS)' },
          { value: 'Bank_Cheque', label: 'Account Payee Cheque' },
          { value: 'Pay_Order', label: 'Bank Pay Order' },
          { value: 'Cash', label: 'Cash Deposit' }
        ];
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projects: any) => {
        const list = Array.isArray(projects) ? projects : (projects?.data || []);
        this.projectOptions = [
          { value: null, label: 'All Projects' },
          ...list.map((p: any) => ({ value: p.id, label: p.project_name }))
        ];
      },
      error: err => console.warn('Failed to load projects for receipt list', err)
    });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.customerOptions = [
          { value: null, label: 'All Customers' },
          ...list.map((c: any) => ({ value: c.id, label: `${c.full_name_en} (${c.phone || c.id})` }))
        ];
      },
      error: err => console.warn('Failed to load customers for receipt list', err)
    });
  }

  loadKPIs(): void {
    this.accountsService.getReceiptSummaryKPIs(this.selectedProjectId || undefined, this.selectedCustomerId || undefined).subscribe({
      next: (data) => this.kpis.set(data),
      error: (err) => console.error('Failed to load receipt KPIs', err)
    });
  }

  loadReceipts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const filters = {
      search: this.searchQuery ? this.searchQuery.trim() : undefined,
      status_filter: this.selectedStatus || undefined,
      customer_id: this.selectedCustomerId || undefined,
      project_id: this.selectedProjectId || undefined,
      collection_method: this.selectedMethod || undefined,
      date_from: this.dateFrom || undefined,
      date_to: this.dateTo || undefined,
      limit: this.limit,
      offset: this.offset
    };

    this.accountsService.getARReceipts(filters).subscribe({
      next: (data) => {
        this.receipts.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer receipts', err);
        this.errorMessage.set('Failed to load customer money receipts. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    this.offset = 0;
    this.currentPage = 1;
    this.loadKPIs();
    this.loadReceipts();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedMethod = '';
    this.selectedProjectId = null;
    this.selectedCustomerId = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.offset = 0;
    this.currentPage = 1;
    this.loadKPIs();
    this.loadReceipts();
  }

  onLimitChange(newLimit: number): void {
    this.limit = newLimit;
    this.offset = 0;
    this.currentPage = 1;
    this.loadReceipts();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.currentPage = Math.floor(this.offset / this.limit) + 1;
      this.loadReceipts();
    }
  }

  nextPage(): void {
    if (this.receipts().length === this.limit) {
      this.offset += this.limit;
      this.currentPage = Math.floor(this.offset / this.limit) + 1;
      this.loadReceipts();
    }
  }

  viewReceipt(receipt: ARReceipt): void {
    this.router.navigate(['/accounts/receivables/receipts/view', receipt.id]);
  }

  quickVerify(receipt: ARReceipt): void {
    if (!confirm(`Confirm funds verification and GL posting for Money Receipt ${receipt.receipt_number} (৳ ${receipt.amount.toLocaleString()})?`)) {
      return;
    }

    this.accountsService.verifyAndClearARReceipt(receipt.id, {}).subscribe({
      next: () => {
        this.loadKPIs();
        this.loadReceipts();
      },
      error: (err) => alert(err.error?.detail || 'Failed to verify receipt.')
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Recorded':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'Cleared':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'Allocated':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'Partially_Allocated':
        return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
      case 'Unallocated':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      case 'Reversed':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'Refunded':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      default:
        return 'bg-secondary text-secondary-foreground border border-border';
    }
  }

  exportCSV(): void {
    const data = this.receipts();
    if (!data.length) return;

    const headers = [
      'Receipt Number', 'Receipt Date', 'Customer Name', 'Project',
      'Total Amount (BDT)', 'Allocated Amount', 'Unallocated Advance',
      'Status', 'Collection Method', 'Instrument Ref', 'GL Voucher'
    ];

    const rows = data.map(r => [
      `"${r.receipt_number}"`,
      `"${r.receipt_date}"`,
      `"${r.customer_name || 'N/A'}"`,
      `"${r.project_name || 'N/A'}"`,
      r.amount,
      r.allocated_amount,
      r.unallocated_amount,
      `"${r.status}"`,
      `"${r.collection_method}"`,
      `"${r.cheque_number || r.transaction_reference || 'N/A'}"`,
      `"${r.voucher_number || 'Pending'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customer_receipts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
