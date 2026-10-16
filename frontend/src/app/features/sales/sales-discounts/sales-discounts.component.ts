import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-discounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  templateUrl: './sales-discounts.component.html'
})
export class SalesDiscountsComponent implements OnInit {
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  pendingBookings = signal<Booking[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Approval Action Modal
  isActionModalOpen = signal<boolean>(false);
  selectedBooking = signal<Booking | null>(null);
  modalDecision = signal<'APPROVED' | 'REJECTED'>('APPROVED');

  actionForm: FormGroup = this.fb.group({
    approval_notes: [''],
    biometric_token: ['']
  });

  ngOnInit(): void {
    this.loadPendingApprovals();
  }

  loadPendingApprovals(): void {
    this.isLoading.set(true);
    this.salesService.getPendingDiscountApprovals().subscribe({
      next: (res) => {
        this.pendingBookings.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openActionModal(booking: Booking, decision: 'APPROVED' | 'REJECTED'): void {
    this.selectedBooking.set(booking);
    this.modalDecision.set(decision);
    this.actionForm.reset({
      approval_notes: decision === 'APPROVED' ? 'Discount authorized in line with strategic executive sales targets.' : 'Discount exceeds permissible commercial thresholds.',
      biometric_token: booking.required_approval_tier === 'MANAGING_DIRECTOR' ? 'BIO-MD-TOUCH-ID-AUTH-TOKEN-2026' : ''
    });
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.selectedBooking.set(null);
  }

  submitAction(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.isSubmitting.set(true);
    const payload = {
      decision: this.modalDecision(),
      approval_notes: this.actionForm.value.approval_notes,
      biometric_token: this.actionForm.value.biometric_token
    };

    this.salesService.processDiscountAction(booking.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeActionModal();
        this.loadPendingApprovals();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Approval submission failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
