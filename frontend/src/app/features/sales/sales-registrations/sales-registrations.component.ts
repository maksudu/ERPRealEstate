import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { DeedRegistration, PaginatedDeedRegistrations } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-sales-registrations',
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
  templateUrl: './sales-registrations.component.html'
})
export class SalesRegistrationsComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Data signals
  registrationData = signal<PaginatedDeedRegistrations | null>(null);
  isLoading = signal<boolean>(true);
  actionMessage = signal<string>('');

  // Filters
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');
  selectedDeedType = signal<string>('');

  // Pagination
  limit = signal<number>(20);
  offset = signal<number>(0);
  readonly Math = Math;

  // Filter Dropdowns
  statusOptions: SelectOption[] = [
    { label: 'All Registration Stages', value: '' },
    { label: 'Not Started', value: 'NOT_STARTED' },
    { label: 'Documents Pending', value: 'DOCUMENTS_PENDING' },
    { label: 'Under Legal Review', value: 'UNDER_LEGAL_REVIEW' },
    { label: 'Draft Prepared', value: 'DRAFT_PREPARED' },
    { label: 'Submitted to Sub-Registry', value: 'SUBMITTED' },
    { label: 'Registration Pending / In-Transit', value: 'REGISTRATION_PENDING' },
    { label: 'Registered (Balam Executed)', value: 'REGISTERED' },
    { label: 'Completed & Deed Delivered', value: 'COMPLETED' }
  ];

  deedTypeOptions: SelectOption[] = [
    { label: 'All Deed Types', value: '' },
    { label: 'Sale Deed (Saf Kabala)', value: 'SALE_DEED_SAF_KABALA' },
    { label: 'Agreement for Sale (Baynanama)', value: 'DEED_OF_AGREEMENT_BAYNANAMA' },
    { label: 'General Power of Attorney', value: 'POWER_OF_ATTORNEY' },
    { label: 'Heba / Gift Deed', value: 'HEBA_GIFT_DEED' },
    { label: 'Deed of Declaration', value: 'DEED_OF_DECLARATION' }
  ];

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => {
    const tot = this.registrationData()?.total || 0;
    return Math.ceil(tot / this.limit()) || 1;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getRegistrationsPaged({
      search: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      deed_type: this.selectedDeedType() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res: PaginatedDeedRegistrations) => {
        this.registrationData.set(res);
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

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onDeedTypeChange(val: string): void {
    this.selectedDeedType.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onPageChange(page: number): void {
    const newOffset = (page - 1) * this.limit();
    this.offset.set(newOffset);
    this.loadData();
  }

  viewDossier(id: number): void {
    this.router.navigate(['/sales/registrations', id]);
  }

  navigateToCreate(): void {
    this.router.navigate(['/sales/registrations/create']);
  }

  getCompletedStepsCount(checklist: Record<string, any> | null | undefined): number {
    if (!checklist) return 0;
    return Object.values(checklist).filter(v => v?.completed).length;
  }

  getTotalStepsCount(checklist: Record<string, any> | null | undefined): number {
    if (!checklist) return 9;
    return Object.keys(checklist).length || 9;
  }
}
