import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { CrmService } from '../../../core/services/crm.service';
import {
  ARInvoice,
  ARSummaryKPIs
} from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-receivables',
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
  templateUrl: './accounts-receivables.component.html'
})
export class AccountsReceivablesComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  invoices = signal<ARInvoice[]>([]);
  kpis = signal<ARSummaryKPIs | null>(null);
  projects = signal<Project[]>([]);
  customers = signal<Customer[]>([]);

  // Filters
  searchQuery = signal<string>('');
  selectedInvoiceType = signal<string>('');
  selectedStatus = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedCustomerId = signal<number | null>(null);
  selectedAgingBucket = signal<string>('');
  isOverdueOnly = signal<boolean>(false);

  // Pagination
  limit = signal<number>(25);
  offset = signal<number>(0);
  totalRecords = signal<number>(0);

  todayStr = new Date().toISOString().split('T')[0];

  // Options for Dropdowns
  projectOptions = computed(() => {
    return [
      { value: null, label: 'All Projects (Corporate & Site)' },
      ...this.projects().map(p => ({
        value: p.id,
        label: `${p.project_name} (${p.project_code || 'PRJ'})`,
        subLabel: p.site_address || ''
      }))
    ];
  });

  customerOptions = computed(() => {
    return [
      { value: null, label: 'All Registered Customers' },
      ...this.customers().map(c => ({
        value: c.id,
        label: `${c.full_name_en} (${c.customer_code})`,
        subLabel: `Phone: ${c.primary_phone || 'N/A'}`
      }))
    ];
  });

  agingBucketOptions = [
    { value: '', label: 'All Aging Schedules' },
    { value: 'Not yet due', label: 'Not Yet Due (Current)' },
    { value: '1-30 days', label: '1 - 30 Days Recently Overdue' },
    { value: '31-60 days', label: '31 - 60 Days Moderate Overdue' },
    { value: '61-90 days', label: '61 - 90 Days High Overdue' },
    { value: 'Over 90 days', label: 'Over 90 Days Long-Overdue' }
  ];

  ngOnInit(): void {
    this.loadInitialReferences();
    this.loadKPIs();
    this.loadInvoices();
  }

  loadInitialReferences(): void {
    this.projectService.getProjects().subscribe({
      next: (projs: any) => {
        const list = Array.isArray(projs) ? projs : (projs?.data || []);
        this.projects.set(list);
      },
      error: err => console.warn('Failed to load projects:', err)
    });

    this.crmService.getCustomers().subscribe({
      next: (custs: any) => {
        const list = Array.isArray(custs) ? custs : (custs?.data || []);
        this.customers.set(list);
      },
      error: err => console.warn('Failed to load customers:', err)
    });
  }

  loadKPIs(): void {
    this.accountsService.getARSummaryKPIs(
      this.selectedProjectId() || undefined,
      this.selectedCustomerId() || undefined
    ).subscribe({
      next: kpis => this.kpis.set(kpis),
      error: err => console.warn('Failed to load AR KPIs:', err)
    });
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getARInvoices({
      search: this.searchQuery().trim() || undefined,
      invoice_type: this.selectedInvoiceType() || undefined,
      status_filter: this.selectedStatus() || undefined,
      project_id: this.selectedProjectId() || undefined,
      customer_id: this.selectedCustomerId() || undefined,
      aging_bucket: this.selectedAgingBucket() || undefined,
      is_overdue: this.isOverdueOnly() ? true : undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: invoices => {
        this.invoices.set(invoices);
        this.totalRecords.set(invoices.length);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Failed to load AR invoices:', err);
        this.errorMessage.set(err.error?.detail || 'Failed to load Accounts Receivable records.');
        this.isLoading.set(false);
      }
    });
  }

  applyFilter(): void {
    this.offset.set(0);
    this.loadKPIs();
    this.loadInvoices();
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedInvoiceType.set('');
    this.selectedStatus.set('');
    this.selectedProjectId.set(null);
    this.selectedCustomerId.set(null);
    this.selectedAgingBucket.set('');
    this.isOverdueOnly.set(false);
    this.offset.set(0);
    this.loadKPIs();
    this.loadInvoices();
  }

  onProjectFilterChange(val: any): void {
    this.selectedProjectId.set(val ? Number(val) : null);
    this.applyFilter();
  }

  onCustomerFilterChange(val: any): void {
    this.selectedCustomerId.set(val ? Number(val) : null);
    this.applyFilter();
  }

  onAgingBucketFilterChange(val: string): void {
    this.selectedAgingBucket.set(val || '');
    this.applyFilter();
  }

  exportCSV(): void {
    const list = this.invoices();
    if (!list.length) {
      alert('No invoice records to export.');
      return;
    }

    const headers = ['Demand Number', 'Type', 'Customer Name', 'Project', 'Unit', 'Demand Date', 'Due Date', 'Net Demand (BDT)', 'Collected (BDT)', 'Balance Due (BDT)', 'Status', 'Followup Status'];
    const rows = list.map(i => [
      `"${i.invoice_number}"`,
      `"${i.invoice_type}"`,
      `"${i.customer_name}"`,
      `"${i.project_name || 'N/A'}"`,
      `"${i.unit_number || 'N/A'}"`,
      `"${i.invoice_date}"`,
      `"${i.due_date}"`,
      i.net_receivable_amount,
      i.collected_amount,
      i.balance_due,
      `"${i.status}"`,
      `"${i.collection_followup_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [`"Accounts Receivable Invoices & Demand Notices Export"`,
       headers.join(','),
       ...rows.map(e => e.join(','))
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accounts_Receivable_Demand_Notices_${this.todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
