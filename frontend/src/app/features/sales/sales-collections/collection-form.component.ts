import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-collection-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/collections"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Collections Ledger"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.5 · Commercial Payment Collection
              </span>
              <span class="text-xs font-mono text-muted-foreground">New Money Receipt</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Issue Booking Money & Down Payment Receipt
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/sales/collections"
            class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>

      <!-- Accounting Control Advisory Banner -->
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3.5">
        <div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <div class="text-xs flex-1">
          <h4 class="font-bold text-amber-500">Statutory Accounting Control Notice</h4>
          <p class="text-muted-foreground mt-0.5 leading-relaxed">
            Under company accounting policy and Bangladesh Real Estate regulations, unverified payment instructions (bank cheques, pay orders, or unconfirmed BEFTN/NPSB) will <strong>not</strong> be recognized as cleared cash until physical deposit or electronic clearing is confirmed. Cash and verified digital gateway transactions are cleared immediately.
          </p>
        </div>
      </div>

      <form [formGroup]="collectionForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Collection Form Fields -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            <!-- 1. Allotment Target -->
            <app-card-container title="1. Apartment Allotment & Buyer Selection" subtitle="Select confirmed booking or reservation to allocate payment against">
              <div class="flex flex-col gap-4">
                <app-searchable-select
                  label="Apartment Booking Reference *"
                  [options]="bookingOptions()"
                  [formGroup]="collectionForm"
                  controlName="booking_id"
                  placeholder="Select booking allotment..."
                  (selectionChange)="onBookingSelected($event)"
                />

                @if (selectedBooking()) {
                  <div class="p-3.5 bg-secondary/40 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span class="text-muted-foreground block text-[11px]">Primary Purchaser:</span>
                      <strong class="text-foreground text-sm">{{ selectedBooking()?.customer_name }}</strong>
                      <span class="text-muted-foreground block text-[11px]">{{ selectedBooking()?.customer_phone }}</span>
                    </div>

                    <div class="sm:text-right">
                      <span class="text-muted-foreground block text-[11px]">Property Scope:</span>
                      <strong class="text-foreground text-sm">{{ selectedBooking()?.project_name }}</strong>
                      <span class="text-primary block font-mono text-[11px]">Unit: {{ selectedBooking()?.unit_number }}</span>
                    </div>
                  </div>
                }
              </div>
            </app-card-container>

            <!-- 2. Payment Terms & Instrument Details -->
            <app-card-container title="2. Payment Terms & Instrument Details" subtitle="Multi-mode collection: Cash, Cheque, Bank Transfer, BEFTN, RTGS, bKash, Nagad">
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-searchable-select
                    label="Collection Purpose / Category *"
                    [options]="collectionTypeOptions"
                    [formGroup]="collectionForm"
                    controlName="collection_type"
                    placeholder="Select payment type..."
                  />

                  <app-custom-input
                    label="Payment Date *"
                    type="date"
                    [formGroup]="collectionForm"
                    controlName="payment_date"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-searchable-select
                    label="Payment Instrument / Mode *"
                    [options]="paymentModeOptions"
                    [formGroup]="collectionForm"
                    controlName="payment_mode"
                    placeholder="Select payment mode..."
                  />

                  <app-custom-input
                    label="Amount Received (BDT) *"
                    type="number"
                    placeholder="e.g. 600000"
                    [formGroup]="collectionForm"
                    controlName="amount"
                  />
                </div>

                @if (collectionForm.value.payment_mode !== 'CASH') {
                  <div class="p-4 bg-secondary/30 rounded-xl border border-border flex flex-col gap-4">
                    <span class="text-xs font-bold text-foreground block">
                      {{ collectionForm.value.payment_mode === 'CHEQUE' ? 'Bank Cheque / Pay Order Verification' : 'Electronic Transfer / Digital Gateway Details' }}
                    </span>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <app-custom-input
                        [label]="collectionForm.value.payment_mode === 'CHEQUE' ? 'Cheque / Leaf Number *' : 'Transaction ID / UTR Number *'"
                        placeholder="e.g. CHQ-982412 or TXN-2026-90"
                        [formGroup]="collectionForm"
                        controlName="instrument_number"
                      />

                      <app-custom-input
                        [label]="collectionForm.value.payment_mode === 'CHEQUE' ? 'Cheque Issue Date' : 'Settlement Timestamp'"
                        type="date"
                        [formGroup]="collectionForm"
                        controlName="instrument_date"
                      />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <app-searchable-select
                        label="Drawn Bank Name (Buyer's Bank)"
                        [options]="bankOptions"
                        [formGroup]="collectionForm"
                        controlName="drawn_bank_name"
                        placeholder="Select client bank..."
                      />

                      <app-custom-input
                        label="Branch Name"
                        placeholder="e.g. Gulshan-2 Branch"
                        [formGroup]="collectionForm"
                        controlName="branch_name"
                      />
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <app-searchable-select
                        label="Deposited Company Bank Account *"
                        [options]="companyAccountOptions"
                        [formGroup]="collectionForm"
                        controlName="deposited_account_name"
                        placeholder="Select company account..."
                      />

                      <app-custom-input
                        label="Internal Transaction Reference"
                        placeholder="e.g. SCB-DEP-2026-10"
                        [formGroup]="collectionForm"
                        controlName="transaction_reference"
                      />
                    </div>
                  </div>
                }

                <app-custom-textarea
                  label="Remarks & Collection Notes"
                  placeholder="Optional details, payer notes, receipt instructions..."
                  [formGroup]="collectionForm"
                  controlName="remarks"
                />

                <div class="p-3 bg-secondary/20 rounded-xl border border-border flex items-center justify-between text-xs">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" formControlName="send_sms_notification" class="rounded border-border text-primary focus:ring-primary"/>
                    <span class="text-foreground font-medium">Dispatch Instant SMS Receipt Confirmation to Purchaser Phone</span>
                  </label>
                </div>
              </div>
            </app-card-container>
          </div>

          <!-- Right Col: Spec 5.5 Illustrative Booking Calculation Card -->
          <div class="flex flex-col gap-6">
            <div class="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-xs flex flex-col gap-5">
              <div>
                <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Spec 5.5 Calculation Architecture</span>
                <h3 class="text-base font-bold text-foreground mt-0.5">Booking & Down Payment Terms</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Booking money is included within the total down payment, not added on top of it.
                </p>
              </div>

              <!-- Live Financial Matrix Preview -->
              <div class="flex flex-col gap-3 text-xs">
                <div class="p-3.5 bg-secondary/50 rounded-xl border border-border flex flex-col gap-2">
                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Approved Contract Price:</span>
                    <span class="font-mono font-bold text-foreground text-sm">
                      BDT {{ (calcContractPrice()) | number:'1.0-0' }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center border-t border-border pt-2 text-primary font-semibold">
                    <span>Booking Money (5% target):</span>
                    <span class="font-mono">
                      BDT {{ (calcBookingMoneyTarget()) | number:'1.0-0' }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center text-foreground font-semibold">
                    <span>Total Down Payment (15% target):</span>
                    <span class="font-mono">
                      BDT {{ (calcDownPaymentTarget()) | number:'1.0-0' }}
                    </span>
                  </div>
                </div>

                <!-- Waterfall Progress -->
                <div class="p-3.5 bg-secondary/30 rounded-xl border border-border flex flex-col gap-2">
                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Booking Money Paid (Cleared):</span>
                    <span class="font-mono text-emerald-500 font-bold">
                      BDT {{ (selectedBooking()?.earnest_money_received || 0) | number:'1.0-0' }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center">
                    <span class="text-muted-foreground">Additional Down Payment Paid:</span>
                    <span class="font-mono text-emerald-500 font-bold">
                      BDT {{ (selectedBooking()?.down_payment_received || 0) | number:'1.0-0' }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center border-t border-border pt-2 font-bold">
                    <span class="text-amber-500">Net Down Payment Due:</span>
                    <span class="font-mono text-amber-500 text-sm">
                      BDT {{ (calcNetDownPaymentDue()) | number:'1.0-0' }}
                    </span>
                  </div>

                  <div class="flex justify-between items-center pt-1 text-muted-foreground">
                    <span>Remaining Balance After Down Payment:</span>
                    <span class="font-mono text-foreground font-bold">
                      BDT {{ (calcRemainingBalance()) | number:'1.0-0' }}
                    </span>
                  </div>
                </div>

                <!-- Current Entry Impact Preview -->
                @if (collectionForm.value.amount > 0) {
                  <div class="p-3 bg-primary/10 border border-primary/20 rounded-xl flex flex-col gap-1.5">
                    <span class="text-[11px] font-bold text-primary uppercase">Current Transaction Impact</span>
                    <div class="flex justify-between text-xs">
                      <span class="text-muted-foreground">Entering Amount:</span>
                      <span class="font-mono font-bold text-primary">BDT {{ collectionForm.value.amount | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between text-xs">
                      <span class="text-muted-foreground">Expected Down Payment Status:</span>
                      <span class="font-bold text-emerald-500">
                        {{ (calcProjectedNetDue() <= 0) ? 'FULLY DOWN PAID (100%)' : 'PARTIAL DOWN PAYMENT' }}
                      </span>
                    </div>
                  </div>
                }
              </div>

              <!-- Submit Action Button -->
              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="isSubmitting() || collectionForm.invalid"
                  class="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  @if (isSubmitting()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Recording Collection Receipt...
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <span>Record Collection & Issue MR</span>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `
})
export class CollectionFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  bookings = signal<Booking[]>([]);
  selectedBooking = signal<Booking | null>(null);
  isSubmitting = signal<boolean>(false);

  collectionForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    collection_type: ['BOOKING_MONEY', Validators.required],
    amount: [null, [Validators.required, Validators.min(100)]],
    payment_date: [new Date().toISOString().split('T')[0], Validators.required],
    payment_mode: ['BANK_TRANSFER', Validators.required],
    instrument_number: [''],
    instrument_date: [new Date().toISOString().split('T')[0]],
    drawn_bank_name: ['Standard Chartered Bank'],
    branch_name: [''],
    deposited_account_name: ['SCB Main Collection A/C - 01-1249871-01'],
    transaction_reference: [''],
    send_sms_notification: [true],
    remarks: ['']
  });

  bookingOptions = computed(() => {
    return this.bookings().map((b) => ({
      value: b.id,
      label: `${b.booking_reference_no} · ${b.customer_name} (Unit ${b.unit_number} - BDT ${Number(b.final_contract_value || 0).toLocaleString()})`
    }));
  });

  collectionTypeOptions = [
    { label: 'Booking Money (Earnest Money Deposit)', value: 'BOOKING_MONEY' },
    { label: 'Down Payment (Initial Installment tranche)', value: 'DOWN_PAYMENT' },
    { label: 'Partial Down Payment', value: 'PARTIAL_DOWN_PAYMENT' },
    { label: 'Advance Pre-Payment', value: 'ADVANCE_INSTALLMENT' }
  ];

  paymentModeOptions = [
    { label: 'Online Bank Transfer (NPSB / EFT)', value: 'BANK_TRANSFER' },
    { label: 'Bank Cheque (A/C Payee)', value: 'CHEQUE' },
    { label: 'Cash (Central Cashier Counter)', value: 'CASH' },
    { label: 'BEFTN Electronic Clearing', value: 'BEFTN' },
    { label: 'RTGS High-Value Transfer', value: 'RTGS' },
    { label: 'bKash Merchant Payment', value: 'BKASH' },
    { label: 'Nagad Corporate Gateway', value: 'NAGAD' },
    { label: 'Debit / Credit Card POS', value: 'CARD' }
  ];

  bankOptions = [
    { label: 'Standard Chartered Bank', value: 'Standard Chartered Bank' },
    { label: 'The City Bank Ltd', value: 'The City Bank Ltd' },
    { label: 'BRAC Bank PLC', value: 'BRAC Bank PLC' },
    { label: 'Eastern Bank PLC', value: 'Eastern Bank PLC' },
    { label: 'Dutch-Bangla Bank Ltd', value: 'Dutch-Bangla Bank Ltd' },
    { label: 'Islami Bank Bangladesh Ltd', value: 'Islami Bank Bangladesh Ltd' },
    { label: 'Mutual Trust Bank PLC', value: 'Mutual Trust Bank PLC' },
    { label: 'United Commercial Bank Ltd', value: 'United Commercial Bank Ltd' }
  ];

  companyAccountOptions = [
    { label: 'SCB Main Collection A/C - 01-1249871-01', value: 'SCB Main Collection A/C - 01-1249871-01' },
    { label: 'City Bank Real Estate Escrow - 110293847', value: 'City Bank Real Estate Escrow - 110293847' },
    { label: 'BRAC Bank Master Operating A/C - 150920491', value: 'BRAC Bank Master Operating A/C - 150920491' },
    { label: 'Central Petty Cash & Cashier Vault', value: 'Central Petty Cash & Cashier Vault' }
  ];

  // Spec 5.5 Calculations
  calcContractPrice(): number {
    const b = this.selectedBooking();
    return b ? Number(b.final_contract_value || 12000000) : 12000000;
  }

  calcBookingMoneyTarget(): number {
    const b = this.selectedBooking();
    if (!b) return 600000;
    return Number(b.booking_money_target || (this.calcContractPrice() * 0.05));
  }

  calcDownPaymentTarget(): number {
    const b = this.selectedBooking();
    if (!b) return 1800000;
    return Number(b.down_payment_target || (this.calcContractPrice() * 0.15));
  }

  calcNetDownPaymentDue(): number {
    const b = this.selectedBooking();
    if (!b) return 1200000;
    const target = this.calcDownPaymentTarget();
    const paid = Number(b.earnest_money_received || 0) + Number(b.down_payment_received || 0);
    return Math.max(0, target - paid);
  }

  calcRemainingBalance(): number {
    return Math.max(0, this.calcContractPrice() - this.calcDownPaymentTarget());
  }

  calcProjectedNetDue(): number {
    const curDue = this.calcNetDownPaymentDue();
    const curAmt = Number(this.collectionForm.value.amount || 0);
    return Math.max(0, curDue - curAmt);
  }

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (res) => {
        const list = res || [];
        this.bookings.set(list);

        // Pre-select if query param provided
        const preselectId = this.route.snapshot.queryParamMap.get('booking_id');
        if (preselectId) {
          const match = list.find((item) => item.id === Number(preselectId));
          if (match) {
            this.collectionForm.patchValue({ booking_id: match.id });
            this.selectedBooking.set(match);
          }
        } else if (list.length > 0) {
          this.collectionForm.patchValue({ booking_id: list[0].id });
          this.selectedBooking.set(list[0]);
        }
      }
    });
  }

  onBookingSelected(selected: any): void {
    const id = selected?.value || selected;
    const match = this.bookings().find((b) => b.id === Number(id));
    this.selectedBooking.set(match || null);
    if (match) {
      // Suggest booking money or net down payment amount
      const netDue = this.calcNetDownPaymentDue();
      if (netDue > 0 && !this.collectionForm.value.amount) {
        this.collectionForm.patchValue({
          amount: match.earnest_money_received ? netDue : this.calcBookingMoneyTarget(),
          collection_type: match.earnest_money_received ? 'DOWN_PAYMENT' : 'BOOKING_MONEY'
        });
      }
    }
  }

  onSubmit(): void {
    if (this.collectionForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.collectionForm.value;
    const booking = this.selectedBooking();

    const payload = {
      booking_id: Number(val.booking_id),
      customer_id: booking?.primary_customer_id || 1,
      collection_type: val.collection_type,
      amount: Number(val.amount),
      payment_date: val.payment_date,
      payment_mode: val.payment_mode,
      instrument_number: val.instrument_number || null,
      instrument_date: val.instrument_date || null,
      drawn_bank_name: val.drawn_bank_name || null,
      branch_name: val.branch_name || null,
      deposited_account_name: val.deposited_account_name || null,
      transaction_reference: val.transaction_reference || null,
      remarks: val.remarks || null,
      send_sms_notification: Boolean(val.send_sms_notification)
    };

    this.salesService.createBookingCollection(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/collections', created.id]);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to record collection receipt.');
        this.isSubmitting.set(false);
      }
    });
  }
}
