import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { CustomerInstallment, InstallmentMetrics } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-installment-schedules',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './installment-schedules.component.html'
})
export class InstallmentSchedulesComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  installments = signal<CustomerInstallment[]>([]);
  bookings = signal<Booking[]>([]);
  metrics = signal<InstallmentMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedBookingId = signal<number | null>(null);
  isGenerateModalOpen = signal<boolean>(false);

  generateForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    plan_type: ['CONSTRUCTION_MILESTONE', Validators.required],
    total_installments: [24, [Validators.required, Validators.min(1), Validators.max(120)]],
    down_payment_percentage: [20, [Validators.required, Validators.min(0), Validators.max(80)]]
  });

  planTypeOptions = [
    { value: 'CONSTRUCTION_MILESTONE', label: '7-Phase Construction Milestones (Foundation to Handover)' },
    { value: 'MONTHLY', label: 'Equal Monthly Amortization (EMI)' },
    { value: 'QUARTERLY', label: 'Quarterly Amortization (Every 3 Months)' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadBookings();
  }

  loadData(): void {
    this.isLoading.set(true);
    const bId = this.selectedBookingId() || undefined;
    this.installmentService.getInstallments({ booking_id: bId }).subscribe({
      next: (res) => {
        this.installments.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.installmentService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe(b => this.bookings.set(b));
  }

  get bookingOptions() {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number} - BDT ${Number(b.final_contract_value).toLocaleString()})`
    }));
  }

  onFilterBookingChange(bookingId: any): void {
    this.selectedBookingId.set(bookingId ? Number(bookingId) : null);
    this.loadData();
  }

  openGenerateModal(): void {
    this.generateForm.reset({
      booking_id: this.bookings()[0]?.id || null,
      plan_type: 'CONSTRUCTION_MILESTONE',
      total_installments: 24,
      down_payment_percentage: 20
    });
    this.isGenerateModalOpen.set(true);
  }

  closeGenerateModal(): void {
    this.isGenerateModalOpen.set(false);
  }

  submitGenerateSchedule(): void {
    if (this.generateForm.invalid) return;
    this.isSubmitting.set(true);
    this.installmentService.generateSchedule(this.generateForm.value).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeGenerateModal();
        this.selectedBookingId.set(this.generateForm.value.booking_id);
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Schedule generation failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
