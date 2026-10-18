import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { UnitTransfer, PaginatedUnitTransfers } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-sales-transfers',
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
  templateUrl: './sales-transfers.component.html'
})
export class SalesTransfersComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  transferData = signal<PaginatedUnitTransfers | null>(null);
  isLoading = signal<boolean>(true);
  actionMessage = signal<string>('');

  // Filters
  searchQuery = signal<string>('');
  selectedTransferType = signal<string>('');
  selectedStatus = signal<string>('');

  // Pagination
  limit = signal<number>(20);
  offset = signal<number>(0);
  readonly Math = Math;

  // Transfer Types
  transferTypeOptions: SelectOption[] = [
    { label: 'All Transfer Types', value: '' },
    { label: 'Full Buyer Substitution', value: 'FULL_BUYER_SUBSTITUTION' },
    { label: 'Add Joint / Co-Buyer', value: 'ADD_CO_BUYER' },
    { label: 'Remove / Relinquish Co-Buyer', value: 'REMOVE_CO_BUYER' },
    { label: 'Ownership Share Amendment', value: 'SHARE_AMENDMENT' }
  ];

  // Status Filter Options
  statusOptions: SelectOption[] = [
    { label: 'All Compliance & Approval Statuses', value: '' },
    { label: 'Pending Compliance Dues Check', value: 'PENDING_COMPLIANCE' },
    { label: 'Legal Staff Approved', value: 'LEGAL_APPROVED' },
    { label: 'Management Approved', value: 'MANAGEMENT_APPROVED' },
    { label: 'Executed & Completed Mutation', value: 'EXECUTED_COMPLETED' },
    { label: 'Rejected by Legal / Mgmt', value: 'REJECTED' }
  ];

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => {
    const tot = this.transferData()?.total || 0;
    return Math.ceil(tot / this.limit()) || 1;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getTransfersPaged({
      search: this.searchQuery() || undefined,
      transfer_type: this.selectedTransferType() || undefined,
      status: this.selectedStatus() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.transferData.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onTypeChange(val: string): void {
    this.selectedTransferType.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onPageChange(page: number): void {
    const newOffset = (page - 1) * this.limit();
    this.offset.set(newOffset);
    this.loadData();
  }

  viewDossier(id: number): void {
    this.router.navigate(['/sales/transfers', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/sales/transfers/create']);
  }
}
