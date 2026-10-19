import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { Voucher } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-vouchers',
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
  templateUrl: './accounts-vouchers.component.html'
})
export class AccountsVouchersComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  vouchers = signal<Voucher[]>([]);
  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  filterType = signal<string>('');
  filterStatus = signal<string>('');
  filterProjectId = signal<number | null>(null);
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);
  hasMore = signal<boolean>(false);

  // Options
  voucherTypeOptions = [
    { value: '', label: 'All Voucher Types' },
    { value: 'Journal', label: 'Journal Voucher (JV)' },
    { value: 'Cash_Payment', label: 'Cash Payment (CP)' },
    { value: 'Cash_Receipt', label: 'Cash Receipt (CR)' },
    { value: 'Bank_Payment', label: 'Bank Payment (BP)' },
    { value: 'Bank_Receipt', label: 'Bank Receipt (BR)' },
    { value: 'Contra', label: 'Contra Voucher (CV)' }
  ];

  statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Posted', label: 'Posted' },
    { value: 'Reversed', label: 'Reversed' }
  ];

  projectOptions = computed(() => [
    { value: null, label: 'All Projects & Corporate' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  // Summary Metrics
  totalCount = computed(() => this.vouchers().length);
  totalDebitsVolume = computed(() =>
    this.vouchers().reduce((sum, v) => sum + (v.total_debit_amount || 0), 0)
  );
  postedCount = computed(() =>
    this.vouchers().filter(v => v.status === 'Posted').length
  );
  reversedCount = computed(() =>
    this.vouchers().filter(v => v.status === 'Reversed').length
  );

  ngOnInit(): void {
    this.loadProjects();

    this.route.queryParams.subscribe(params => {
      if (params['search']) this.searchQuery.set(params['search']);
      if (params['type']) this.filterType.set(params['type']);
      if (params['status']) this.filterStatus.set(params['status']);
      this.loadVouchers();
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadVouchers(): void {
    this.isLoading.set(true);

    const offset = (this.currentPage() - 1) * this.pageSize();
    const limit = this.pageSize() + 1; // fetch 1 extra to check if next page exists

    const filters: any = {
      offset,
      limit
    };

    if (this.filterType()) filters.voucher_type = this.filterType();
    if (this.filterStatus()) filters.status_filter = this.filterStatus();
    if (this.filterProjectId()) filters.project_id = this.filterProjectId();
    if (this.searchQuery()) filters.search = this.searchQuery().trim();
    if (this.dateFrom()) filters.date_from = this.dateFrom();
    if (this.dateTo()) filters.date_to = this.dateTo();

    this.accountsService.getVouchers(filters).subscribe({
      next: (res) => {
        if (res.length > this.pageSize()) {
          this.hasMore.set(true);
          this.vouchers.set(res.slice(0, this.pageSize()));
        } else {
          this.hasMore.set(false);
          this.vouchers.set(res);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load vouchers', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadVouchers();
  }

  resetFilters(): void {
    this.filterType.set('');
    this.filterStatus.set('');
    this.filterProjectId.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadVouchers();
  }

  goToNextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(p => p + 1);
      this.loadVouchers();
    }
  }

  goToPrevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadVouchers();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/accounts/vouchers/create']);
  }

  navigateToView(voucherId: number): void {
    this.router.navigate(['/accounts/vouchers/view', voucherId]);
  }

  exportCSV(): void {
    const list = this.vouchers();
    if (list.length === 0) {
      alert('No vouchers available to export.');
      return;
    }

    const headers = ['Voucher No', 'Type', 'Date', 'Project', 'Narration', 'Total Debit (Tk)', 'Total Credit (Tk)', 'Status', 'Created By'];
    const rows = list.map(v => [
      `"${v.voucher_number}"`,
      `"${v.voucher_type}"`,
      `"${v.voucher_date}"`,
      `"${(v.project_name || 'Corporate').replace(/"/g, '""')}"`,
      `"${(v.narration || '').replace(/"/g, '""')}"`,
      v.total_debit_amount || 0,
      v.total_credit_amount || 0,
      `"${v.status}"`,
      `"${(v.created_by_name || 'System').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GL_Vouchers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
