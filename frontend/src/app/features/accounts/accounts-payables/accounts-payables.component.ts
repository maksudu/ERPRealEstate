import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { APInvoice, APSummaryKPIs } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-payables',
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
  templateUrl: './accounts-payables.component.html'
})
export class AccountsPayablesComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  invoices = signal<APInvoice[]>([]);
  kpis = signal<APSummaryKPIs | null>(null);
  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  filterType = signal<string>('');
  filterStatus = signal<string>('');
  filterProjectId = signal<number | null>(null);
  dueDateFrom = signal<string>('');
  dueDateTo = signal<string>('');
  isOverdueOnly = signal<boolean>(false);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  hasMore = signal<boolean>(false);

  invoiceTypeOptions = [
    { value: '', label: 'All Payable Types' },
    { value: 'Supplier_Material', label: 'Supplier Material Invoice (3-Way Match)' },
    { value: 'Contractor_RA', label: 'Construction Contractor RA Bill' },
    { value: 'Professional_Fee', label: 'Professional & Consultancy Fee' },
    { value: 'Utility_Admin', label: 'Utility, Rent & Office Admin' },
    { value: 'Other', label: 'Other Payables' }
  ];

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Draft', label: 'Draft Registered' },
    { value: 'Pending_Verification', label: 'Pending Verification / QC' },
    { value: 'Approved', label: 'Approved for Payment' },
    { value: 'Partially_Paid', label: 'Partially Paid' },
    { value: 'Paid', label: 'Fully Paid & Settled' },
    { value: 'Cancelled', label: 'Cancelled / Disputed' }
  ];

  projectOptions = computed(() => [
    { value: null, label: 'All Projects & Corporate' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  ngOnInit(): void {
    this.loadProjects();
    this.loadKPIs();

    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['type']) this.filterType.set(params['type']);
      if (params['status']) this.filterStatus.set(params['status']);
      if (params['overdue'] === 'true') this.isOverdueOnly.set(true);
      this.loadInvoices();
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadKPIs(): void {
    this.accountsService.getAPSummaryKPIs(this.filterProjectId() || undefined).subscribe({
      next: (res) => this.kpis.set(res),
      error: (err) => console.error('Failed to load AP KPIs', err)
    });
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const limit = this.pageSize() + 1;

    const filters: any = {
      offset,
      limit
    };

    if (this.searchQuery()) filters.search = this.searchQuery().trim();
    if (this.filterType()) filters.invoice_type = this.filterType();
    if (this.filterStatus()) filters.status_filter = this.filterStatus();
    if (this.filterProjectId()) filters.project_id = this.filterProjectId();
    if (this.dueDateFrom()) filters.due_date_from = this.dueDateFrom();
    if (this.dueDateTo()) filters.due_date_to = this.dueDateTo();
    if (this.isOverdueOnly()) filters.is_overdue = true;

    this.accountsService.getAPInvoices(filters).subscribe({
      next: (res) => {
        if (res.length > this.pageSize()) {
          this.hasMore.set(true);
          this.invoices.set(res.slice(0, this.pageSize()));
        } else {
          this.hasMore.set(false);
          this.invoices.set(res);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load AP invoices', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadKPIs();
    this.loadInvoices();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterType.set('');
    this.filterStatus.set('');
    this.filterProjectId.set(null);
    this.dueDateFrom.set('');
    this.dueDateTo.set('');
    this.isOverdueOnly.set(false);
    this.currentPage.set(1);
    this.loadKPIs();
    this.loadInvoices();
  }

  goToNextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(p => p + 1);
      this.loadInvoices();
    }
  }

  goToPrevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadInvoices();
    }
  }

  isInvoiceOverdue(inv: APInvoice): boolean {
    if (inv.status === 'Paid' || inv.status === 'Cancelled' || inv.balance_due <= 0) return false;
    const due = new Date(inv.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }

  navigateToView(invoiceId: number): void {
    this.router.navigate(['/accounts/payables/view', invoiceId]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/accounts/payables/create']);
  }

  exportCSV(): void {
    const list = this.invoices();
    if (list.length === 0) {
      alert('No invoices available to export.');
      return;
    }

    const headers = [
      'Invoice No', 'Type', 'Payee / Supplier', 'Project', 'Invoice Date',
      'Due Date', 'Gross (Tk)', 'TDS (Tk)', 'VDS (Tk)', 'Retention (Tk)',
      'Net Payable (Tk)', 'Paid (Tk)', 'Balance Due (Tk)', 'Status', 'Match Status'
    ];

    const rows = list.map(inv => [
      `"${inv.invoice_number}"`,
      `"${inv.invoice_type}"`,
      `"${inv.payee_name.replace(/"/g, '""')}"`,
      `"${(inv.project_name || 'Corporate').replace(/"/g, '""')}"`,
      `"${inv.invoice_date}"`,
      `"${inv.due_date}"`,
      inv.gross_amount,
      inv.tax_withholding_tds,
      inv.vat_withholding_vds,
      inv.retention_amount,
      inv.net_payable_amount,
      inv.paid_amount,
      inv.balance_due,
      `"${inv.status}"`,
      `"${inv.three_way_match_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accounts_Payable_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
