import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { BookingCancellation, PaginatedBookingCancellations } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-sales-cancellations',
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
  templateUrl: './sales-cancellations.component.html'
})
export class SalesCancellationsComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Data signals
  cancellationData = signal<PaginatedBookingCancellations | null>(null);
  isLoading = signal<boolean>(true);
  actionMessage = signal<string>('');

  // Filter signals
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');
  selectedCategory = signal<string>('');

  // Pagination signals
  limit = signal<number>(20);
  offset = signal<number>(0);
  readonly Math = Math;

  // Status Filter Options
  statusOptions: SelectOption[] = [
    { label: 'All Review & Refund Statuses', value: '' },
    { label: 'Under Multi-Tier Review', value: 'UNDER_REVIEW' },
    { label: 'Approved (Pending Refund)', value: 'APPROVED' },
    { label: 'Partially Refunded', value: 'PARTIALLY_REFUNDED' },
    { label: 'Fully Refunded & Settled', value: 'REFUNDED' },
    { label: 'Rejected by Committee', value: 'REJECTED' }
  ];

  // Category Filter Options
  categoryOptions: SelectOption[] = [
    { label: 'All Cancellation Categories', value: '' },
    { label: 'Buyer Default / Financial', value: 'BUYER_DEFAULT' },
    { label: 'Mutual Surrender Deed', value: 'MUTUAL_SURRENDER' },
    { label: 'Developer Project Handover Delay', value: 'DEVELOPER_DELAY' },
    { label: 'Force Majeure Statutory', value: 'FORCE_MAJEURE' }
  ];

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => {
    const tot = this.cancellationData()?.total || 0;
    return Math.ceil(tot / this.limit()) || 1;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getCancellationsPaged({
      search: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      category: this.selectedCategory() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.cancellationData.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.offset.set(0);
    this.loadData();
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onCategoryChange(val: string): void {
    this.selectedCategory.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onPageChange(page: number): void {
    const newOffset = (page - 1) * this.limit();
    this.offset.set(newOffset);
    this.loadData();
  }

  viewDossier(cancellationId: number): void {
    this.router.navigate(['/sales/cancellations', cancellationId]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/sales/cancellations/create']);
  }
}
