import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { Booking, BookingCancellation } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-cancellations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-cancellations.component.html'
})
export class SalesCancellationsComponent implements OnInit {
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  cancellations = signal<BookingCancellation[]>([]);
  activeBookings = signal<Booking[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCancelModalOpen = signal<boolean>(false);

  cancelForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    cancellation_reason: ['', Validators.required],
    forfeiture_deduction_percentage: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
    refund_cheque_no: [''],
    settlement_notes: ['']
  });

  ngOnInit(): void {
    this.loadData();
    this.loadActiveBookings();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getCancellations().subscribe({
      next: (res) => {
        this.cancellations.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadActiveBookings(): void {
    this.salesService.getBookings({ status: 'PROVISIONAL' }).subscribe({
      next: (provisional) => {
        this.salesService.getBookings({ status: 'AGREEMENT_SIGNED' }).subscribe({
          next: (signed) => {
            this.activeBookings.set([...provisional, ...signed]);
          }
        });
      }
    });
  }

  get bookingOptions() {
    return this.activeBookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number} - Paid: BDT ${(b.earnest_money_received + b.down_payment_total).toLocaleString()})`
    }));
  }

  openCancelModal(): void {
    this.cancelForm.reset({
      booking_id: null,
      cancellation_reason: '',
      forfeiture_deduction_percentage: 10,
      refund_cheque_no: '',
      settlement_notes: 'REHAB Standard 10% Forfeiture Deduction Applied.'
    });
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
  }

  submitCancellation(): void {
    if (this.cancelForm.invalid) return;
    this.isSubmitting.set(true);
    this.salesService.createCancellation(this.cancelForm.value).subscribe({
      next: (created) => {
        this.cancellations.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCancelModal();
        this.loadActiveBookings();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Cancellation failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
