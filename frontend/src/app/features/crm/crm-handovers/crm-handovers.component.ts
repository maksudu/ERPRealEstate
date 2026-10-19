import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { BookingHandover, BookingHandoverReview } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-crm-handovers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-handovers.component.html'
})
export class CrmHandoversComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  readonly LOOKUP = {
    handoverStatus: 'CRM_HANDOVER_STATUS'
  };

  handovers = signal<BookingHandover[]>([]);
  totalHandovers = signal<number>(0);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  page = signal<number>(1);
  limit = signal<number>(10);
  totalPages = computed(() => Math.ceil(this.totalHandovers() / this.limit()) || 1);

  projects = signal<Project[]>([]);
  projectOptions = computed(() => [
    { label: 'All Projects', value: '' },
    ...this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      value: p.id
    }))
  ]);

  statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending Sales Ops Review', value: 'PENDING_SALES_OPS' },
    { label: 'Reservation Issued', value: 'RESERVATION_ISSUED' },
    { label: 'Accepted by Operations', value: 'ACCEPTED_BY_OPS' },
    { label: 'Booking Contract Created', value: 'BOOKING_CREATED' },
    { label: 'Rejected / Returned', value: 'REJECTED' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    status: ['ALL'],
    project_id: ['']
  });

  // Review Modal State
  isReviewModalOpen = signal<boolean>(false);
  selectedHandover = signal<BookingHandover | null>(null);
  reviewForm: FormGroup = this.fb.group({
    decision: ['ACCEPT'],
    rejection_reason: ['']
  });
  isSubmittingReview = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProjects();
    this.loadHandovers();

    this.filterForm.valueChanges.subscribe(() => {
      this.page.set(1);
      this.loadHandovers();
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: () => {}
    });
  }

  loadHandovers(): void {
    this.isLoading.set(true);
    const f = this.filterForm.value;

    this.crmService.getBookingHandovers({
      status: f.status && f.status !== 'ALL' ? f.status : undefined,
      project_id: f.project_id ? Number(f.project_id) : undefined,
      search: f.search || undefined,
      page: this.page(),
      limit: this.limit()
    }).subscribe({
      next: (res) => {
        this.handovers.set(res.items || []);
        this.totalHandovers.set(res.total || 0);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load booking handovers');
        this.isLoading.set(false);
      }
    });
  }

  changePage(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.loadHandovers();
    }
  }

  viewDossier(hnd: BookingHandover): void {
    this.router.navigate(['/crm/handovers', hnd.id]);
  }

  createHandover(): void {
    this.router.navigate(['/crm/funnel/handovers/new']);
  }

  openReviewModal(hnd: BookingHandover): void {
    this.selectedHandover.set(hnd);
    this.reviewForm.patchValue({
      decision: 'ACCEPT',
      rejection_reason: ''
    });
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
    this.selectedHandover.set(null);
  }

  submitReview(): void {
    const hnd = this.selectedHandover();
    if (!hnd) return;

    this.isSubmittingReview.set(true);
    const val = this.reviewForm.value;
    const payload: BookingHandoverReview = {
      decision: val.decision,
      rejection_reason: val.decision === 'REJECT' ? val.rejection_reason : undefined
    };

    this.crmService.reviewBookingHandover(hnd.id, payload).subscribe({
      next: () => {
        this.isSubmittingReview.set(false);
        this.closeReviewModal();
        this.loadHandovers();
      },
      error: (err) => {
        this.isSubmittingReview.set(false);
        alert(err?.error?.detail || 'Failed to complete review');
      }
    });
  }

  getStatusVariant(status: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'ACCEPTED_BY_OPS':
      case 'BOOKING_CREATED':
        return 'success';
      case 'RESERVATION_ISSUED':
        return 'info';
      case 'REJECTED':
        return 'danger';
      default:
        return 'warning';
    }
  }

  calculateKycScore(hnd: BookingHandover): number {
    let score = 0;
    if (hnd.customer_verified) score += 1;
    if (hnd.unit_availability_verified) score += 1;
    if (hnd.nid_passport_verified) score += 1;
    if (hnd.tin_certificate_verified) score += 1;
    if (hnd.nominee_verified) score += 1;
    return score;
  }

  formatBdt(amount: number): string {
    return '৳' + (amount || 0).toLocaleString('en-IN');
  }
}
