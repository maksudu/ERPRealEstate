import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { BookingPaymentCollection } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-collection-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
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
                Spec 5.5 · Statutory Money Receipt Dossier
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ collection()?.receipt_number || 'Loading...' }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Customer Payment Receipt & Accounting Voucher
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="printReceipt()"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print Money Receipt
          </button>

          <a
            routerLink="/sales/collections/create"
            class="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Collection
          </a>
        </div>
      </div>

      @if (isLoading()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading collection dossier...
        </div>
      } @else if (collection()) {
        <!-- Key Status Header Banner -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              [ngClass]="{
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': collection()?.clearance_status === 'CLEARED',
                'bg-amber-500/10 text-amber-500 border border-amber-500/20': collection()?.clearance_status === 'PENDING_CLEARANCE',
                'bg-rose-500/10 text-rose-500 border border-rose-500/20': collection()?.clearance_status === 'DISHONOURED'
              }">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold text-foreground">{{ collection()?.receipt_number }}</h2>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': collection()?.clearance_status === 'CLEARED',
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20': collection()?.clearance_status === 'PENDING_CLEARANCE',
                    'bg-rose-500/10 text-rose-500 border border-rose-500/20': collection()?.clearance_status === 'DISHONOURED'
                  }">
                  {{ collection()?.clearance_status }}
                </span>
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                  {{ collection()?.collection_type }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Paid via <strong class="text-foreground">{{ collection()?.payment_mode }}</strong> on {{ collection()?.payment_date }}
                @if (collection()?.is_cleared_cash) {
                  &bull; <span class="text-emerald-500 font-semibold">Cleared Cash Recognized</span>
                } @else {
                  &bull; <span class="text-amber-500 font-semibold">Unverified (Pending Bank Clearance)</span>
                }
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="p-3 bg-secondary/50 rounded-xl border border-border text-right">
              <span class="text-[10px] font-semibold uppercase text-muted-foreground block">Collected Value</span>
              <span class="text-lg font-mono font-bold text-primary">BDT {{ collection()?.amount | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Official Money Receipt Presentation -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            <!-- Statutory Money Receipt View (Printable) -->
            <div id="printable-mr" class="bg-card border-2 border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              <!-- MR Header -->
              <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-border">
                <div>
                  <h3 class="text-xl font-bold font-display text-foreground tracking-tight">BLUEOCEANS REAL ESTATE ERP</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">Plot 42, Gulshan Avenue, Dhaka-1212, Bangladesh</p>
                  <p class="text-[11px] text-muted-foreground">REHAB Membership No: 2026-REG-0112</p>
                </div>
                <div class="sm:text-right">
                  <span class="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-md bg-primary text-primary-foreground">
                    MONEY RECEIPT (MR)
                  </span>
                  <div class="text-xs font-mono font-bold text-foreground mt-2">No: {{ collection()?.receipt_number }}</div>
                  <div class="text-[11px] text-muted-foreground">Date: {{ collection()?.payment_date }}</div>
                </div>
              </div>

              <!-- Payer & Asset Context -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="p-4 bg-secondary/30 rounded-xl border border-border flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Received With Thanks From</span>
                  <span class="text-sm font-bold text-foreground">{{ collection()?.customer_name }}</span>
                  <span class="text-muted-foreground">Phone: {{ collection()?.customer_phone }}</span>
                  <span class="text-[11px] text-primary font-mono">Code: {{ collection()?.customer_code || 'N/A' }}</span>
                </div>

                <div class="p-4 bg-secondary/30 rounded-xl border border-border flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Against Property Allotment</span>
                  <span class="text-sm font-bold text-foreground">{{ collection()?.project_name }}</span>
                  <span class="text-muted-foreground">Unit Allotment: <strong class="text-foreground">{{ collection()?.unit_number }}</strong></span>
                  <span class="text-[11px] text-muted-foreground font-mono">Booking Ref: {{ collection()?.booking_reference_no }}</span>
                </div>
              </div>

              <!-- Itemized Amount Breakdown -->
              <div class="border border-border rounded-xl overflow-hidden divide-y divide-border text-xs">
                <div class="flex justify-between p-3.5 bg-secondary/40 font-semibold">
                  <span>Payment Description / Purpose</span>
                  <span>Amount Allocated</span>
                </div>
                <div class="flex justify-between p-3.5">
                  <div>
                    <span class="font-bold text-foreground">{{ collection()?.collection_type }}</span>
                    <span class="block text-[11px] text-muted-foreground">
                      Mode: {{ collection()?.payment_mode }}
                      @if (collection()?.instrument_number) {
                        &bull; Instrument: {{ collection()?.instrument_number }} ({{ collection()?.drawn_bank_name || 'Bank' }})
                      }
                    </span>
                  </div>
                  <span class="font-mono font-bold text-foreground">BDT {{ collection()?.amount | number:'1.0-0' }}</span>
                </div>
                <div class="flex justify-between p-4 bg-primary/10 font-bold text-sm text-primary">
                  <span>Total Amount Received:</span>
                  <span class="font-mono">BDT {{ collection()?.amount | number:'1.0-0' }}</span>
                </div>
              </div>

              <!-- Banking & Accounting Trail -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div class="p-3.5 bg-secondary/20 rounded-xl border border-border flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase">Deposited Bank Account</span>
                  <span class="font-semibold text-foreground">{{ collection()?.deposited_account_name || 'Corporate Collection Account' }}</span>
                  @if (collection()?.transaction_reference) {
                    <span class="text-[11px] text-muted-foreground">Txn Ref: {{ collection()?.transaction_reference }}</span>
                  }
                </div>

                <div class="p-3.5 bg-secondary/20 rounded-xl border border-border flex flex-col gap-1">
                  <span class="text-[10px] font-bold text-muted-foreground uppercase">General Ledger Linkage</span>
                  <span class="font-mono font-bold text-primary">{{ collection()?.gl_voucher_reference || 'PENDING_CLEARANCE' }}</span>
                  <span class="text-[11px] text-muted-foreground">Bank Recon: {{ collection()?.bank_reconciliation_status }}</span>
                </div>
              </div>

              <!-- Receipt Signatures & Legal Disclaimer -->
              <div class="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-muted-foreground">
                <div>
                  <p class="text-[11px] max-w-sm leading-relaxed">
                    * This is a computer generated statutory receipt. Payment by cheque or electronic transfer is accepted subject to final realization.
                  </p>
                </div>
                <div class="flex items-center gap-8 text-center">
                  <div>
                    <div class="w-32 border-b border-border mb-1"></div>
                    <span class="text-[10px] uppercase font-semibold">Prepared By</span>
                  </div>
                  <div>
                    <div class="w-32 border-b border-border mb-1"></div>
                    <span class="text-[10px] uppercase font-semibold">Authorized Officer</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right Col: Spec 5.5 Commercial Accounting Controls & Actions -->
          <div class="flex flex-col gap-6">
            <!-- 1. Spec 5.5 Calculation Breakdown Card -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div>
                <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Spec 5.5 Calculation Architecture</span>
                <h3 class="text-sm font-bold text-foreground mt-0.5">Allotment Down Payment Status</h3>
              </div>

              <div class="flex flex-col gap-2.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Contract Price:</span>
                  <span class="font-mono font-bold text-foreground">BDT {{ collection()?.approved_contract_price | number:'1.0-0' }}</span>
                </div>

                <div class="flex justify-between text-primary font-medium">
                  <span>Booking Money Target (5%):</span>
                  <span class="font-mono">BDT {{ collection()?.booking_money_target | number:'1.0-0' }}</span>
                </div>

                <div class="flex justify-between text-foreground font-semibold">
                  <span>Total Down Payment (15%):</span>
                  <span class="font-mono">BDT {{ collection()?.down_payment_target | number:'1.0-0' }}</span>
                </div>

                <div class="p-3 bg-secondary/40 rounded-xl border border-border flex flex-col gap-1.5 mt-1">
                  <div class="flex justify-between text-emerald-500 font-semibold">
                    <span>Total Cleared to Date:</span>
                    <span class="font-mono">BDT {{ collection()?.total_down_payment_cleared | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between text-amber-500 font-bold border-t border-border pt-1">
                    <span>Net Down Payment Due:</span>
                    <span class="font-mono">BDT {{ collection()?.net_down_payment_due | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between text-muted-foreground pt-1">
                    <span>Balance after Down Payment:</span>
                    <span class="font-mono text-foreground font-semibold">BDT {{ collection()?.remaining_balance_after_dp | number:'1.0-0' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 2. Cheque Clearance & Dishonour Actions -->
            @if (collection()?.clearance_status === 'PENDING_CLEARANCE') {
              <div class="bg-card border-2 border-amber-500/30 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <span class="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Pending Bank Realization</span>
                  <h3 class="text-sm font-bold text-foreground mt-0.5">Cheque Deposit & Clearance</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Clearance posts cash to GL and updates booking milestone stage.
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <button
                    (click)="markCleared()"
                    [disabled]="isActionSubmitting()"
                    class="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Mark Cleared in Bank Account
                  </button>

                  <button
                    (click)="openDishonourModal()"
                    [disabled]="isActionSubmitting()"
                    class="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                    Record Cheque Dishonour / Bounce
                  </button>
                </div>
              </div>
            }

            <!-- 3. Bank Reconciliation Status & Action -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold uppercase text-muted-foreground block">Bank Reconciliation</span>
                  <h3 class="text-sm font-bold text-foreground">Treasury Statement Recon</h3>
                </div>
                <span class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  [ngClass]="collection()?.bank_reconciliation_status === 'RECONCILED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-secondary text-muted-foreground border border-border'">
                  {{ collection()?.bank_reconciliation_status }}
                </span>
              </div>

              @if (collection()?.bank_reconciliation_status !== 'RECONCILED') {
                <button
                  (click)="confirmReconciliation()"
                  [disabled]="isActionSubmitting()"
                  class="w-full py-2 px-3 rounded-xl border border-border bg-card text-foreground hover:bg-secondary font-semibold text-xs shadow-xs transition-colors inline-flex items-center justify-center gap-1"
                >
                  Confirm Bank Statement Match
                </button>
              } @else {
                <div class="text-xs text-muted-foreground">
                  Matched on statement: <strong class="text-foreground">{{ collection()?.reconciliation_date }}</strong>
                </div>
              }
            </div>

            <!-- 4. Payment Reversal & Refund Workflow -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold uppercase text-muted-foreground block">Reversals & Refunds</span>
                  <h3 class="text-sm font-bold text-foreground">Audit Controlled Reversal</h3>
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-secondary text-muted-foreground': collection()?.reversal_status === 'NONE',
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20': collection()?.reversal_status === 'REQUESTED',
                    'bg-rose-500/10 text-rose-500 border border-rose-500/20': collection()?.reversal_status === 'REVERSED'
                  }">
                  {{ collection()?.reversal_status }}
                </span>
              </div>

              @if (collection()?.reversal_status === 'NONE') {
                <button
                  (click)="openReversalModal()"
                  class="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-semibold text-xs transition-colors inline-flex items-center justify-center gap-1"
                >
                  Request Payment Reversal / Refund
                </button>
              } @else if (collection()?.reversal_status === 'REQUESTED') {
                <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex flex-col gap-2">
                  <span class="font-bold text-amber-500">Reversal Requested by {{ collection()?.reversal_requested_by }}</span>
                  <p class="text-muted-foreground text-[11px]">{{ collection()?.reversal_reason }}</p>
                  <button
                    (click)="approveReversal()"
                    [disabled]="isActionSubmitting()"
                    class="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                  >
                    Authorize Executive Refund
                  </button>
                </div>
              } @else {
                <div class="text-xs text-rose-500 font-semibold">
                  Payment reversed on {{ collection()?.reversal_date | date:'medium' }}
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class CollectionDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);

  collectionId = signal<number | null>(null);
  collection = signal<BookingPaymentCollection | null>(null);
  isLoading = signal<boolean>(false);
  isActionSubmitting = signal<boolean>(false);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.collectionId.set(Number(idParam));
      this.loadCollection(Number(idParam));
    }
  }

  loadCollection(id: number): void {
    this.isLoading.set(true);
    this.salesService.getBookingCollection(id).subscribe({
      next: (res) => {
        this.collection.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to load collection details.');
        this.isLoading.set(false);
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  markCleared(): void {
    const id = this.collectionId();
    if (!id) return;
    if (confirm('Confirm cheque realization and recognize cleared cash in General Ledger?')) {
      this.isActionSubmitting.set(true);
      this.salesService.updateCollectionClearance(id, {
        clearance_status: 'CLEARED',
        clearance_date: new Date().toISOString().split('T')[0]
      }).subscribe({
        next: (updated) => {
          this.collection.set(updated);
          this.isActionSubmitting.set(false);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Failed to update clearance.');
          this.isActionSubmitting.set(false);
        }
      });
    }
  }

  openDishonourModal(): void {
    const id = this.collectionId();
    if (!id) return;
    const reason = prompt('Enter cheque dishonour / bounce reason (e.g. Insufficient funds, signature mismatch):');
    if (reason) {
      this.isActionSubmitting.set(true);
      this.salesService.updateCollectionClearance(id, {
        clearance_status: 'DISHONOURED',
        dishonour_reason: reason
      }).subscribe({
        next: (updated) => {
          this.collection.set(updated);
          this.isActionSubmitting.set(false);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Failed to record dishonour.');
          this.isActionSubmitting.set(false);
        }
      });
    }
  }

  confirmReconciliation(): void {
    const id = this.collectionId();
    if (!id) return;
    this.isActionSubmitting.set(true);
    this.salesService.reconcileCollection(id, {
      reconciliation_date: new Date().toISOString().split('T')[0],
      deposited_account_name: this.collection()?.deposited_account_name || 'SCB Main Collection A/C - 01-1249871-01'
    }).subscribe({
      next: (updated) => {
        this.collection.set(updated);
        this.isActionSubmitting.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Reconciliation failed.');
        this.isActionSubmitting.set(false);
      }
    });
  }

  openReversalModal(): void {
    const id = this.collectionId();
    if (!id) return;
    const reason = prompt('Enter payment reversal / refund justification:');
    if (reason) {
      this.isActionSubmitting.set(true);
      this.salesService.requestCollectionReversal(id, {
        reversal_reason: reason,
        requested_by: 'Commercial Accounts Officer'
      }).subscribe({
        next: (updated) => {
          this.collection.set(updated);
          this.isActionSubmitting.set(false);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Reversal request failed.');
          this.isActionSubmitting.set(false);
        }
      });
    }
  }

  approveReversal(): void {
    const id = this.collectionId();
    if (!id) return;
    if (confirm('Authorized CFO Approval: Confirm reversing this receipt and adjusting booking balances back?')) {
      this.isActionSubmitting.set(true);
      this.salesService.approveCollectionReversal(id, {
        decision: 'APPROVED',
        approved_by: 'Chief Financial Officer (CFO)'
      }).subscribe({
        next: (updated) => {
          this.collection.set(updated);
          this.isActionSubmitting.set(false);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Reversal authorization failed.');
          this.isActionSubmitting.set(false);
        }
      });
    }
  }
}
