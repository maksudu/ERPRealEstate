import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { Booking, SalesMetrics } from '../../../core/models/sales.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-bookings',
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
  templateUrl: './sales-bookings.component.html'
})
export class SalesBookingsComponent implements OnInit {
  protected readonly Math = Math;
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  bookings = signal<Booking[]>([]);
  projects = signal<Project[]>([]);
  metrics = signal<SalesMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);

  // Filters & Search
  searchQuery = signal<string>('');
  selectedProjectFilter = signal<string>('ALL');
  selectedStatusFilter = signal<string>('ALL');
  selectedStageFilter = signal<string>('ALL');
  selectedDiscountFilter = signal<string>('ALL');

  // Pagination State (Limit & Offset)
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  // Workflow Stages Definition (Spec 5.1 & 5.2)
  workflowStages = [
    { id: 'ALL', code: 'ALL', name: 'All Bookings' },
    { id: '01_CUSTOMER_VERIFICATION', code: '01', name: 'Lead & KYC' },
    { id: '02_UNIT_RESERVATION', code: '02', name: 'Reservation Hold' },
    { id: '03_PRICE_APPROVAL', code: '03', name: 'Price & Discount' },
    { id: '04_BOOKING_MONEY', code: '04', name: 'Earnest Dep.' },
    { id: '05_BOOKING_CONFIRMED', code: '05', name: 'Confirmed Allotment' },
    { id: '06_AGREEMENT_SIGNING', code: '06', name: 'Deed Signing' },
    { id: '07_INSTALLMENT_SCHEDULE', code: '07', name: 'Schedules' },
    { id: '08_COLLECTION_LEDGER', code: '08', name: 'Customer Ledger' },
    { id: '09_REGISTRATION_DEED', code: '09', name: 'Sub-Registry' },
    { id: '10_FINAL_HANDOVER', code: '10', name: 'Handover & NOC' }
  ];

  statusOptions = [
    { value: 'ALL', label: 'All Allotment Statuses' },
    { value: 'PROVISIONAL', label: 'Provisional (Reservation Hold)' },
    { value: 'AGREEMENT_SIGNED', label: 'Agreement Signed' },
    { value: 'REGISTRATION_DONE', label: 'Registration Done' },
    { value: 'TRANSFERRED', label: 'Transferred (Mutation)' },
    { value: 'CANCELLED', label: 'Cancelled (Statutory)' }
  ];

  discountFilterOptions = [
    { value: 'ALL', label: 'All Discount Statuses' },
    { value: 'APPROVED', label: 'Approved Pricing' },
    { value: 'PENDING_APPROVAL', label: 'Pending Multi-Tier Escalation' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  pageSizeOptions = [
    { value: 10, label: '10 rows per page' },
    { value: 20, label: '20 rows per page' },
    { value: 50, label: '50 rows per page' },
    { value: 100, label: '100 rows per page' }
  ];

  projectFilterOptions = computed(() => {
    const list = [{ value: 'ALL', label: 'All Projects' }];
    this.projects().forEach(p => {
      list.push({ value: String(p.id), label: `${p.project_name} (${p.project_code})` });
    });
    return list;
  });

  ngOnInit(): void {
    this.loadData();
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getBookings({ limit: 100, offset: 0 }).subscribe({
      next: (res) => {
        this.bookings.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.salesService.getSalesMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  // Filtered Bookings Computed
  filteredBookings = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const proj = this.selectedProjectFilter();
    const status = this.selectedStatusFilter();
    const stage = this.selectedStageFilter();
    const discount = this.selectedDiscountFilter();

    return this.bookings().filter(b => {
      // Query filter
      if (q) {
        const matchesQ =
          b.booking_reference_no.toLowerCase().includes(q) ||
          (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
          (b.unit_number && b.unit_number.toLowerCase().includes(q)) ||
          (b.project_name && b.project_name.toLowerCase().includes(q)) ||
          (b.sales_rep_name && b.sales_rep_name.toLowerCase().includes(q));
        if (!matchesQ) return false;
      }

      // Project filter
      if (proj !== 'ALL' && String(b.project_id) !== proj) {
        return false;
      }

      // Status filter
      if (status !== 'ALL' && b.status !== status) {
        return false;
      }

      // Workflow Stage filter
      if (stage !== 'ALL' && b.workflow_stage !== stage) {
        return false;
      }

      // Discount filter
      if (discount !== 'ALL' && b.discount_approval_status !== discount) {
        return false;
      }

      return true;
    });
  });

  // Paginated List
  paginatedBookings = computed(() => {
    const items = this.filteredBookings();
    const start = (this.currentPage() - 1) * this.pageSize();
    return items.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.max(1, Math.ceil(this.filteredBookings().length / this.pageSize()));
  });

  setWorkflowFilter(stageId: string): void {
    this.selectedStageFilter.set(stageId);
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(val: any): void {
    const size = typeof val === 'object' ? Number(val.value) : Number(val);
    if (size) {
      this.pageSize.set(size);
      this.currentPage.set(1);
    }
  }

  // Quick Action: Confirm Booking
  confirmBooking(b: Booking): void {
    if (!confirm(`Confirm allotment for ${b.booking_reference_no} (Unit ${b.unit_number})? This will lock the unit in Property Inventory.`)) {
      return;
    }
    this.isActionLoading.set(true);
    this.salesService.confirmBooking(b.id).subscribe({
      next: (updated) => {
        this.bookings.update(list => list.map(item => item.id === b.id ? updated : item));
        this.isActionLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to confirm booking');
        this.isActionLoading.set(false);
      }
    });
  }

  // Quick Action: Delete / Archive
  deleteBooking(b: Booking): void {
    if (!confirm(`Are you sure you want to delete/archive booking ${b.booking_reference_no}? The unit will be released back to AVAILABLE.`)) {
      return;
    }
    this.isActionLoading.set(true);
    this.salesService.deleteBooking(b.id).subscribe({
      next: () => {
        this.bookings.update(list => list.filter(item => item.id !== b.id));
        this.isActionLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to delete booking');
        this.isActionLoading.set(false);
      }
    });
  }

  // WeasyPrint Bilingual PDF Generator Download
  downloadDeed(b: Booking): void {
    this.salesService.downloadDeedPdf(b.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Deed_of_Agreement_${b.booking_reference_no}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download deed PDF: ' + (err?.error?.detail || 'Server error'))
    });
  }

  getStageName(stageId: string): string {
    const s = this.workflowStages.find(x => x.id === stageId);
    return s ? s.name : (stageId || 'Confirmed');
  }

  getStageBadgeClass(stageId: string): string {
    if (stageId === '05_BOOKING_CONFIRMED' || stageId === '06_AGREEMENT_SIGNING' || stageId === '10_FINAL_HANDOVER') {
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    } else if (stageId === '02_UNIT_RESERVATION') {
      return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
    } else if (stageId === '03_PRICE_APPROVAL') {
      return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    }
    return 'bg-secondary text-muted-foreground border border-border';
  }
}
