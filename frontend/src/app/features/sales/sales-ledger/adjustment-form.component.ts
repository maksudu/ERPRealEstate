import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-adjustment-form',
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
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/ledger"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Sales Subledger"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Spec 5.8 · Controlled Commercial Adjustment
              </span>
              <span class="text-xs font-mono text-muted-foreground">Audit Protected</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Issue Credit Note or Commercial Adjustment
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/sales/ledger"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>

      <form [formGroup]="form" (ngSubmit)="submitAdjustment()" class="flex flex-col gap-6">
        <!-- Target Booking & Customer Card -->
        <app-card title="Customer Account & Property Allotment" subtitle="Select the purchaser and the specific contractual booking for this financial adjustment">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Customer Selector -->
            <div class="flex flex-col">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-foreground">Customer Profile *</label>
                <a routerLink="/crm/customers/create" class="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  + Add New
                </a>
              </div>
              <app-searchable-select
                [options]="customerOptions()"
                [formControl]="$any(form.get('customer_id'))"
                placeholder="Search buyer by name, phone..."
                (selectionChange)="onCustomerSelected($event)"
              />
            </div>

            <!-- Booking / Property Selector -->
            <div class="flex flex-col">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-foreground">Property Booking *</label>
                <a routerLink="/sales/bookings/create" class="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  + Add New
                </a>
              </div>
              <app-searchable-select
                [options]="filteredBookingOptions()"
                [formControl]="$any(form.get('booking_id'))"
                placeholder="Select apartment / commercial unit"
              />
            </div>
          </div>
        </app-card>

        <!-- Adjustment Financial Parameters -->
        <app-card title="Adjustment Details & GL Subledger Link" subtitle="Specify adjustment classification, amount, date, and accounting journal references">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Adjustment Type -->
            <div class="flex flex-col">
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-foreground">Adjustment Type *</label>
                <a routerLink="/settings/lookups" class="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  + Add New
                </a>
              </div>
              <app-searchable-select
                [options]="adjustmentTypeOptions"
                [formControl]="$any(form.get('adjustment_type'))"
                placeholder="Select adjustment category"
              />
            </div>

            <!-- Amount -->
            <app-custom-input
              label="Adjustment Amount (৳) *"
              type="number"
              [control]="form.get('amount')"
              placeholder="e.g. 50000"
              helperText="Exact BDT credit or debit to be posted to subledger"
            />

            <!-- Adjustment Date -->
            <app-custom-input
              label="Adjustment Date *"
              type="date"
              [control]="form.get('adjustment_date')"
              helperText="Date for chronological running balance calculation"
            />

            <!-- GL Account Code -->
            <app-custom-input
              label="GL Account Code"
              [control]="form.get('gl_account_code')"
              placeholder="1200-AR-FLAT-SALES"
              helperText="Linked General Ledger control account"
            />

            <!-- GL Voucher Ref -->
            <app-custom-input
              label="GL Journal Voucher Reference"
              [control]="form.get('gl_voucher_reference')"
              placeholder="e.g. JV-2026-0092"
              helperText="Audit cross-reference to accounts module"
            />

            <!-- Supporting Document URL -->
            <app-custom-input
              label="Supporting Approval Document URL"
              [control]="form.get('supporting_document_url')"
              placeholder="https://..."
              helperText="Link to signed commercial approval memo or waiver scan"
            />
          </div>

          <!-- Commercial Justification -->
          <div class="mt-4">
            <app-custom-textarea
              label="Commercial Justification & Audit Trail Reason *"
              [control]="form.get('reason')"
              placeholder="e.g. Goodwill discount approved by Managing Director on 18 Oct 2026 due to minor layout variation during structural casting."
              [rows]="3"
              helperText="Mandatory commercial justification; permanently preserved in ledger audit trail"
            />
          </div>
        </app-card>

        <!-- Financial Impact Preview Notice -->
        <div class="p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs flex items-start gap-3">
          <svg class="w-5 h-5 text-purple-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <strong class="font-bold text-sm block">Subledger Impact Notice:</strong>
            @if (isCreditAdjustment()) {
              <span>
                Selecting <strong>{{ form.get('adjustment_type')?.value }}</strong> posts a <strong>CREDIT</strong> to the sales subledger, reducing the customer's outstanding balance due by <strong>৳{{ formatCurrency(form.get('amount')?.value || 0) }}</strong>.
              </span>
            } @else {
              <span>
                Selecting <strong>{{ form.get('adjustment_type')?.value }}</strong> posts a <strong>DEBIT</strong> to the sales subledger, increasing the customer's balance due by <strong>৳{{ formatCurrency(form.get('amount')?.value || 0) }}</strong>.
              </span>
            }
          </div>
        </div>

        <!-- Action Bar -->
        <div class="flex items-center justify-between bg-card border border-border rounded-xl p-4 shadow-xs">
          <span class="text-xs text-muted-foreground">
            Strictly controlled commercial operation. Transaction will be stamped into GL Subledger with immutable ID.
          </span>

          <div class="flex items-center gap-3">
            <a routerLink="/sales/ledger" class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold">
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              size="md"
              type="submit"
              [loading]="isSubmitting()"
              [disabled]="form.invalid"
            >
              Post Commercial Adjustment
            </app-custom-button>
          </div>
        </div>
      </form>
    </div>
  `
})
export class AdjustmentFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  isSubmitting = signal<boolean>(false);
  customerOptions = signal<SelectOption[]>([]);
  allBookings = signal<any[]>([]);
  filteredBookingOptions = signal<SelectOption[]>([]);

  adjustmentTypeOptions: SelectOption[] = [
    { label: 'Credit Note (Commercial Concession)', value: 'CREDIT_NOTE' },
    { label: 'Goodwill Discount', value: 'GOODWILL_DISCOUNT' },
    { label: 'Interest / Late Fee Waiver', value: 'INTEREST_WAIVER' },
    { label: 'Utility Cost Reconciliation Rebate', value: 'UTILITY_RECONCILIATION' },
    { label: 'Legal & Stamp Reconciliation', value: 'LEGAL_RECONCILIATION' },
    { label: 'Debit Note (Additional Approved Charges)', value: 'DEBIT_NOTE' }
  ];

  form: FormGroup = this.fb.group({
    customer_id: [null, Validators.required],
    booking_id: [null, Validators.required],
    adjustment_type: ['CREDIT_NOTE', Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]],
    adjustment_date: [new Date().toISOString().substring(0, 10), Validators.required],
    reason: ['', [Validators.required, Validators.minLength(10)]],
    gl_account_code: ['1200-AR-FLAT-SALES'],
    gl_voucher_reference: [''],
    supporting_document_url: ['']
  });

  isCreditAdjustment(): boolean {
    const t = this.form.get('adjustment_type')?.value;
    return t === 'CREDIT_NOTE' || t === 'GOODWILL_DISCOUNT' || t === 'INTEREST_WAIVER' || t === 'UTILITY_RECONCILIATION' || t === 'LEGAL_RECONCILIATION';
  }

  ngOnInit(): void {
    this.loadBookingData();
    this.route.queryParamMap.subscribe(qp => {
      const cId = qp.get('customer_id');
      const bId = qp.get('booking_id');
      if (cId) {
        this.form.patchValue({ customer_id: Number(cId) });
        this.filterBookingsForCustomer(Number(cId));
      }
      if (bId) {
        this.form.patchValue({ booking_id: Number(bId) });
      }
    });
  }

  loadBookingData(): void {
    this.salesService.getBookings({ limit: 100 }).subscribe({
      next: (res) => {
        const bookings = Array.isArray(res) ? res : (res as any).items || [];
        this.allBookings.set(bookings);

        // Unique customers
        const custMap = new Map<number, string>();
        bookings.forEach((b: any) => {
          if (b.primary_customer_id && !custMap.has(b.primary_customer_id)) {
            custMap.set(b.primary_customer_id, `${b.customer_name || 'Customer #' + b.primary_customer_id} (${b.customer_phone || ''})`);
          }
        });

        this.customerOptions.set(
          Array.from(custMap.entries()).map(([k, v]) => ({ label: v, value: k }))
        );

        const currentCustId = this.form.get('customer_id')?.value;
        if (currentCustId) {
          this.filterBookingsForCustomer(Number(currentCustId));
        }
      },
      error: (err) => console.error('Failed to load bookings:', err)
    });
  }

  onCustomerSelected(val: any): void {
    const custId = Number(val);
    this.form.patchValue({ customer_id: custId, booking_id: null });
    this.filterBookingsForCustomer(custId);
  }

  filterBookingsForCustomer(custId: number): void {
    const bookings = this.allBookings().filter(b => b.primary_customer_id === custId);
    this.filteredBookingOptions.set(
      bookings.map(b => ({
        label: `${b.booking_reference_no} — ${b.project_name || 'Project'} (Unit: ${b.unit_number || 'N/A'}) - ৳${this.formatCurrency(b.final_contract_value || 0)}`,
        value: b.id
      }))
    );
    if (bookings.length === 1) {
      this.form.patchValue({ booking_id: bookings[0].id });
    }
  }

  submitAdjustment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const val = this.form.value;

    this.salesService.createLedgerAdjustment({
      customer_id: Number(val.customer_id),
      booking_id: Number(val.booking_id),
      adjustment_type: val.adjustment_type,
      amount: Number(val.amount),
      adjustment_date: val.adjustment_date,
      reason: val.reason,
      gl_account_code: val.gl_account_code,
      gl_voucher_reference: val.gl_voucher_reference,
      supporting_document_url: val.supporting_document_url
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        // Redirect to customer statement dossier
        this.router.navigate(['/sales/ledger/customers', res.customer_id], {
          queryParams: { booking_id: res.booking_id }
        });
      },
      error: (err) => {
        console.error('Failed to create adjustment:', err);
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to post adjustment. Please check inputs.');
      }
    });
  }

  formatCurrency(num: number): string {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
