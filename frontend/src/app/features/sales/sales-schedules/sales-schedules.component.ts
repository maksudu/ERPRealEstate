import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { BookingInstallmentSchedule, PaginatedInstallmentSchedules } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-schedules.component.html'
})
export class SalesSchedulesComponent implements OnInit {
  protected readonly Math = Math;
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Schedules state
  schedules = signal<BookingInstallmentSchedule[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(false);

  // Filters & Pagination
  searchTerm = signal<string>('');
  selectedPlanType = signal<string>('');
  selectedStatus = signal<string>('');
  selectedBookingId = signal<number | null>(null);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  // KPIs
  totalScheduledAmount = signal<number>(0);
  totalPaidAmount = signal<number>(0);
  totalBalanceDue = signal<number>(0);
  totalOverdueAmount = signal<number>(0);

  // Bookings list for dynamic filter
  bookings = signal<Booking[]>([]);

  bookingFilterOptions = computed(() => [
    { label: 'All Bookings', value: '' },
    ...this.bookings().map(b => ({
      label: `${b.booking_reference_no} · ${b.customer_name} (${b.project_name} - Unit ${b.unit_number})`,
      value: String(b.id)
    }))
  ]);

  planTypeFilterOptions = [
    { label: 'All Plan Types', value: '' },
    { label: 'Monthly Equal Installments (EMI)', value: 'MONTHLY' },
    { label: 'Quarterly Amortization', value: 'QUARTERLY' },
    { label: 'Civil Construction Milestones', value: 'CONSTRUCTION_MILESTONE' },
    { label: 'Structural Stages', value: 'STRUCTURAL_STAGE' },
    { label: 'Custom Negotiated Schedule', value: 'CUSTOM' }
  ];

  statusFilterOptions = [
    { label: 'All Schedule Statuses', value: '' },
    { label: 'Active Schedule', value: 'ACTIVE' },
    { label: 'Superseded / Amended', value: 'SUPERSEDED_AMENDED' },
    { label: 'Completed (100% Paid)', value: 'COMPLETED' },
    { label: 'Draft', value: 'DRAFT' }
  ];

  ngOnInit(): void {
    this.loadSchedules();
    this.loadBookings();
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (b) => this.bookings.set(b || [])
    });
  }

  loadSchedules(): void {
    this.loading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    this.installmentService.getMasterSchedulesPaged({
      search: this.searchTerm() || undefined,
      booking_id: this.selectedBookingId() || undefined,
      status: this.selectedStatus() || undefined,
      plan_type: this.selectedPlanType() || undefined,
      limit: this.pageSize(),
      offset: offset
    }).subscribe({
      next: (res: PaginatedInstallmentSchedules) => {
        const items = res.items || [];
        this.schedules.set(items);
        this.totalCount.set(res.total || items.length);
        this.loading.set(false);

        // Aggregate KPI totals across current list
        let sched = 0;
        let paid = 0;
        let bal = 0;
        let ovd = 0;

        for (const s of items) {
          sched += Number(s.approved_contract_price || 0);
          paid += Number(s.total_paid_amount || 0);
          bal += Number(s.total_balance_due || 0);
          ovd += Number(s.total_overdue_amount || 0);
        }

        this.totalScheduledAmount.set(sched);
        this.totalPaidAmount.set(paid);
        this.totalBalanceDue.set(bal);
        this.totalOverdueAmount.set(ovd);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadSchedules();
  }

  onBookingFilterChange(val: string): void {
    this.selectedBookingId.set(val ? Number(val) : null);
    this.currentPage.set(1);
    this.loadSchedules();
  }

  onPlanTypeChange(type: string): void {
    this.selectedPlanType.set(type);
    this.currentPage.set(1);
    this.loadSchedules();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadSchedules();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadSchedules();
    }
  }

  navigateToGenerate(): void {
    this.router.navigate(['/sales/schedules/create']);
  }

  exportPdf(schedule: BookingInstallmentSchedule): void {
    this.installmentService.exportSchedulePdf(schedule.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Schedule-${schedule.schedule_code}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to export schedule document.')
    });
  }

  formatPlanType(plan: string): string {
    switch (plan) {
      case 'MONTHLY':
        return 'Monthly EMI';
      case 'QUARTERLY':
        return 'Quarterly Amortization';
      case 'CONSTRUCTION_MILESTONE':
        return 'Civil Milestones';
      case 'STRUCTURAL_STAGE':
        return 'Structural Stages';
      case 'CUSTOM':
        return 'Custom Schedule';
      default:
        return plan?.replace(/_/g, ' ') || 'Standard';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'COMPLETED':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'SUPERSEDED_AMENDED':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'DRAFT':
        return 'bg-secondary text-muted-foreground border border-border';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }

  getProgressPercentage(schedule: BookingInstallmentSchedule): number {
    const total = Number(schedule.approved_contract_price || 0);
    const paid = Number(schedule.total_paid_amount || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round((paid / total) * 100));
  }
}
