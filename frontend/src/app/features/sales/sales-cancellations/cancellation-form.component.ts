import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking, BookingCancellationCreate } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-cancellation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './cancellation-form.component.html'
})
export class CancellationFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Active bookings list
  activeBookings = signal<Booking[]>([]);
  isLoadingBookings = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Selected Booking
  selectedBookingId = signal<number | null>(null);
  selectedBooking = computed(() => {
    const id = this.selectedBookingId();
    if (!id) return null;
    return this.activeBookings().find(b => b.id === Number(id)) || null;
  });

  // Form Model
  cancellationCategory = signal<string>('BUYER_DEFAULT');
  cancellationReason = signal<string>('RELOCATION_ABROAD');
  customReasonText = signal<string>('');
  deductionType = signal<string>('REHAB_STATUTORY');
  deductionPercentage = signal<number>(10.0);
  fixedServiceCharge = signal<number>(0.0);

  // Bank Disbursement Details
  refundPaymentMode = signal<string>('BANK_TRANSFER');
  refundBankName = signal<string>('');
  refundAccountName = signal<string>('');
  refundAccountNumber = signal<string>('');
  refundRoutingNumber = signal<string>('');
  settlementNotes = signal<string>('REHAB Statutory standard deduction applied per signed agreement.');

  // Live Computed Financials
  totalPaid = computed(() => {
    const b = this.selectedBooking();
    if (!b) return 0;
    const earnest = Number(b.earnest_money_received || 0);
    const dp = Number(b.down_payment_received || b.down_payment_total || 0);
    return Math.max(0, earnest + dp);
  });

  deductionAmount = computed(() => {
    const paid = this.totalPaid();
    const dtype = this.deductionType();
    if (dtype === 'DEVELOPER_DEFAULT_ZERO') {
      return 0;
    } else if (dtype === 'FIXED_SERVICE_CHARGE') {
      return 0;
    } else {
      const pct = this.deductionPercentage() || 0;
      return Math.round(paid * (pct / 100.0) * 100) / 100;
    }
  });

  serviceChargeAmount = computed(() => {
    const dtype = this.deductionType();
    if (dtype === 'FIXED_SERVICE_CHARGE') {
      return Number(this.fixedServiceCharge() || 0);
    }
    return 0;
  });

  netRefundAmount = computed(() => {
    const paid = this.totalPaid();
    const ded = this.deductionAmount();
    const svc = this.serviceChargeAmount();
    return Math.max(0, Math.round((paid - ded - svc) * 100) / 100);
  });

  bookingOptions = computed<SelectOption[]>(() => {
    return this.activeBookings().map(b => {
      const earnest = Number(b.earnest_money_received || 0);
      const dp = Number(b.down_payment_received || b.down_payment_total || 0);
      const paid = earnest + dp;
      return {
        value: b.id,
        label: `${b.booking_reference_no} — ${b.customer_name} (Unit ${b.unit_number} · Paid: ৳${paid.toLocaleString()})`
      };
    });
  });

  deductionTypeOptions: SelectOption[] = [
    { label: 'REHAB Statutory (10% of Total Paid)', value: 'REHAB_STATUTORY' },
    { label: 'Developer Project Delay Default (0% Deduction)', value: 'DEVELOPER_DEFAULT_ZERO' },
    { label: 'Fixed Administrative Service Charge Only', value: 'FIXED_SERVICE_CHARGE' },
    { label: 'Custom Contractual Agreed Forfeiture', value: 'CUSTOM_FORFEITURE' }
  ];

  refundModeOptions: SelectOption[] = [
    { label: 'Bank BEFTN / RTGS Transfer', value: 'BANK_TRANSFER' },
    { label: 'Account Payee Crossed Cheque', value: 'ACCOUNT_PAYEE_CHEQUE' },
    { label: 'Bank Pay Order / Demand Draft', value: 'BANK_PAY_ORDER' }
  ];

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoadingBookings.set(true);
    this.salesService.getBookings({ limit: 100 }).subscribe({
      next: (res) => {
        // Filter out already cancelled bookings
        const active = res.filter(b => b.status !== 'CANCELLED' && b.status !== 'REFUNDED');
        this.activeBookings.set(active);
        this.isLoadingBookings.set(false);
      },
      error: () => this.isLoadingBookings.set(false)
    });
  }

  onBookingSelect(val: any): void {
    this.selectedBookingId.set(Number(val));
    const b = this.selectedBooking();
    if (b) {
      this.refundAccountName.set(b.customer_name || '');
    }
  }

  onDeductionTypeChange(val: string): void {
    this.deductionType.set(val);
    if (val === 'REHAB_STATUTORY') {
      this.deductionPercentage.set(10.0);
      this.settlementNotes.set('REHAB Standard 10% Forfeiture Deduction Applied pursuant to signed allotment agreement.');
    } else if (val === 'DEVELOPER_DEFAULT_ZERO') {
      this.deductionPercentage.set(0.0);
      this.settlementNotes.set('Developer delay default exemption: 0% deduction applied under Bangladesh Real Estate Act 2010.');
    } else if (val === 'FIXED_SERVICE_CHARGE') {
      this.deductionPercentage.set(0.0);
      this.fixedServiceCharge.set(25000.0);
      this.settlementNotes.set('Fixed nominal administrative file processing fee deducted.');
    }
  }

  submit(): void {
    const bookingId = this.selectedBookingId();
    if (!bookingId) {
      this.errorMessage.set('Please select an active property booking.');
      return;
    }

    if (this.totalPaid() <= 0) {
      this.errorMessage.set('Selected booking has ৳0.00 in cleared receipts. Cannot initiate refund workflow without collected funds.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload: BookingCancellationCreate = {
      booking_id: bookingId,
      cancellation_category: this.cancellationCategory(),
      cancellation_reason: this.customReasonText() || this.cancellationReason(),
      deduction_type: this.deductionType(),
      forfeiture_deduction_percentage: this.deductionPercentage(),
      service_charge_amount: this.serviceChargeAmount(),
      refund_payment_mode: this.refundPaymentMode(),
      refund_bank_name: this.refundBankName() || null,
      refund_account_name: this.refundAccountName() || null,
      refund_account_number: this.refundAccountNumber() || null,
      refund_routing_number: this.refundRoutingNumber() || null,
      settlement_notes: this.settlementNotes() || null
    };

    this.salesService.createCancellation(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/cancellations', created.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to submit cancellation request.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sales/cancellations']);
  }
}
