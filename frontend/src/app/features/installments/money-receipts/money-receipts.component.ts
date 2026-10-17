import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { MoneyReceipt, MoneyReceiptAllocation, InstallmentMetrics } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-money-receipts',
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
  templateUrl: './money-receipts.component.html'
})
export class MoneyReceiptsComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  moneyReceipts = signal<MoneyReceipt[]>([]);
  bookings = signal<Booking[]>([]);
  metrics = signal<InstallmentMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedPaymentModeFilter = signal<string>('ALL');

  // New Receipt Modal State
  isCreateModalOpen = signal<boolean>(false);

  // View / Print Receipt Modal State
  selectedReceipt = signal<MoneyReceipt | null>(null);
  isReceiptModalOpen = signal<boolean>(false);

  // QR Verification Modal State
  isVerifyModalOpen = signal<boolean>(false);
  verificationResult = signal<any | null>(null);

  receiptForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    receipt_date: [new Date().toISOString().split('T')[0], Validators.required],
    payment_mode: ['BANK_TRANSFER', Validators.required],
    instrument_no: [''],
    instrument_date: [new Date().toISOString().split('T')[0]],
    bank_name: [''],
    branch_name: [''],
    amount_received: [null, [Validators.required, Validators.min(100)]],
    remarks: [''],
    send_sms_notification: [true]
  });

  paymentModeOptions = [
    { value: 'ALL', label: 'All Payment Modes' },
    { value: 'CASH', label: 'Cash (Central Cashier Vault)' },
    { value: 'CHEQUE', label: 'Bank Account Cheque' },
    { value: 'BANK_TRANSFER', label: 'Online Bank Transfer (NPSB)' },
    { value: 'BEFTN', label: 'BEFTN Electronic Clearing' },
    { value: 'RTGS', label: 'Real-Time Gross Settlement (RTGS)' },
    { value: 'BKASH', label: 'bKash Merchant Payment' },
    { value: 'NAGAD', label: 'Nagad Merchant Gateway' }
  ];

  paymentModeFormOptions = [
    { value: 'CASH', label: 'Cash (Central Cashier Vault)' },
    { value: 'CHEQUE', label: 'Bank Account Cheque' },
    { value: 'BANK_TRANSFER', label: 'Online Bank Transfer (NPSB)' },
    { value: 'BEFTN', label: 'BEFTN Electronic Clearing' },
    { value: 'RTGS', label: 'Real-Time Gross Settlement (RTGS)' },
    { value: 'BKASH', label: 'bKash Merchant Payment' },
    { value: 'NAGAD', label: 'Nagad Merchant Gateway' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadBookings();
  }

  loadData(): void {
    this.isLoading.set(true);
    const mode = this.selectedPaymentModeFilter() !== 'ALL' ? this.selectedPaymentModeFilter() : undefined;
    this.installmentService.getMoneyReceipts({ payment_mode: mode }).subscribe({
      next: (res) => {
        this.moneyReceipts.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.installmentService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (b) => this.bookings.set(b),
      error: () => {}
    });
  }

  get bookingOptions() {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number} - BDT ${Number(b.final_contract_value).toLocaleString()})`
    }));
  }

  filteredReceipts(): MoneyReceipt[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.moneyReceipts();
    return this.moneyReceipts().filter(r =>
      r.mr_number.toLowerCase().includes(q) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      (r.booking_reference_no && r.booking_reference_no.toLowerCase().includes(q)) ||
      (r.instrument_no && r.instrument_no.toLowerCase().includes(q)) ||
      (r.bank_name && r.bank_name.toLowerCase().includes(q))
    );
  }

  openCreateModal(): void {
    this.receiptForm.reset({
      booking_id: this.bookings()[0]?.id || null,
      receipt_date: new Date().toISOString().split('T')[0],
      payment_mode: 'BANK_TRANSFER',
      instrument_no: '',
      instrument_date: new Date().toISOString().split('T')[0],
      bank_name: 'The City Bank Limited',
      branch_name: 'Gulshan Branch',
      amount_received: null,
      remarks: '',
      send_sms_notification: true
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitReceipt(): void {
    if (this.receiptForm.invalid) return;
    this.isSubmitting.set(true);
    this.installmentService.createMoneyReceipt(this.receiptForm.value).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.moneyReceipts.update(list => [created, ...list]);
        this.openReceiptModal(created);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to generate Money Receipt');
      }
    });
  }

  openReceiptModal(r: MoneyReceipt): void {
    this.selectedReceipt.set(r);
    this.isReceiptModalOpen.set(true);
  }

  closeReceiptModal(): void {
    this.isReceiptModalOpen.set(false);
    this.selectedReceipt.set(null);
  }

  verifyQR(r: MoneyReceipt): void {
    this.installmentService.verifyMoneyReceipt(r.id).subscribe({
      next: (data) => {
        this.verificationResult.set(data);
        this.isVerifyModalOpen.set(true);
      },
      error: () => {
        alert('Could not verify QR token.');
      }
    });
  }

  closeVerifyModal(): void {
    this.isVerifyModalOpen.set(false);
    this.verificationResult.set(null);
  }

  printReceipt(): void {
    window.print();
  }
}
