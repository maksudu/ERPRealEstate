import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { SupplierBill, Vendor } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-supplier-bills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  template: `
    <app-procurement-nav
      title="9.14 Supplier Bills & Payment Reconciliation"
      subtitle="Automated 3-Way Matching (PO vs. GRN vs. Invoice), Duplicate Invoice Detection & Accounts Payable Disbursement"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadBills()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <span>🔄</span>
          <span>Refresh Bills</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoiced Amount</span>
          <span class="p-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">৳ BDT</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">৳{{ totalInvoicedAmount() | number:'1.2-2' }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Across {{ bills().length }} supplier shipments</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">3-Way Matched Clean</span>
          <span class="p-1.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">✅ Clean</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ matchedCount() }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">PO, GRN & Bill rates reconciled</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Commercial Variance / Review</span>
          <span class="p-1.5 bg-red-500/15 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold">⚠️ Review</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ varianceCount() }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Invoice rate/qty exceeds PO</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Accounts Payable Disbursed</span>
          <span class="p-1.5 bg-purple-500/15 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">💳 Paid</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ paidCount() }} Bills</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Bank payment vouchers issued</p>
      </div>
    </div>

    <!-- Main Card Container: Supplier Bills Register -->
    <app-card-container
      title="Supplier Bills & 3-Way Reconciliation Register"
      subtitle="Verify Goods Receipt physical count against Purchase Order contract rate and Supplier Tax Invoice"
    >
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="w-64">
            <app-custom-input
              placeholder="Search supplier, GRN, PO or invoice #..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
            ></app-custom-input>
          </div>

          <div class="w-56">
            <app-searchable-select
              placeholder="All Suppliers"
              [options]="vendorOptions()"
              [(ngModel)]="selectedVendorId"
              (ngModelChange)="onFilterChange()"
            ></app-searchable-select>
          </div>

          <div class="w-48">
            <app-searchable-select
              placeholder="Match Status"
              [options]="statusOptions"
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
            ></app-searchable-select>
          </div>

          <button
            *ngIf="searchQuery || selectedStatus || selectedVendorId !== null"
            (click)="clearFilters()"
            class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400">
          Showing {{ pagedBills().length }} of {{ filteredBills().length }} records
        </div>
      </div>

      <!-- Data Table (Strictly NO inline form below table!) -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <th class="p-3">GRN & Date</th>
              <th class="p-3">PO & Project</th>
              <th class="p-3">Supplier Name</th>
              <th class="p-3">Material & Quantities</th>
              <th class="p-3">Supplier Invoice #</th>
              <th class="p-3 text-right">Invoiced (৳)</th>
              <th class="p-3 text-right">Expected (৳)</th>
              <th class="p-3 text-right">Variance (৳)</th>
              <th class="p-3 text-center">3-Way Match</th>
              <th class="p-3 text-center">AP Status</th>
              <th class="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (b of pagedBills(); track b.id) {
              <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <td class="p-3">
                  <div class="font-bold text-slate-900 dark:text-slate-100">{{ b.grn_number }}</div>
                  <div class="text-[10px] text-slate-500">{{ b.receipt_date | date:'dd MMM yyyy' }}</div>
                </td>
                <td class="p-3">
                  <div class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ b.po_number }}</div>
                  <div class="text-[10px] text-slate-500">{{ b.project_name || 'Project Site' }}</div>
                </td>
                <td class="p-3 font-medium text-slate-800 dark:text-slate-200">
                  {{ b.vendor_name }}
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900 dark:text-slate-100">{{ b.material_name || 'Material Item' }}</div>
                  <div class="text-[10px] text-slate-500">
                    Accepted: <span class="font-bold text-emerald-600">{{ b.accepted_quantity }}</span> | Rejected: <span class="font-bold text-rose-500">{{ b.rejected_quantity }}</span> {{ b.unit_of_measure }}
                  </div>
                </td>
                <td class="p-3">
                  @if (b.supplier_invoice_number) {
                    <div class="font-mono font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <span>{{ b.supplier_invoice_number }}</span>
                      @if (b.duplicate_warning) {
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30" title="Duplicate invoice warning detected!">
                          ⚠️ DUP
                        </span>
                      }
                    </div>
                  } @else {
                    <span class="text-slate-400 italic">Pending Entry</span>
                  }
                  @if (b.debit_note_number) {
                    <div class="text-[10px] text-purple-600 font-mono font-bold mt-0.5">
                      DN: {{ b.debit_note_number }} (-৳{{ b.debit_note_amount | number:'1.2-2' }})
                    </div>
                  }
                </td>
                <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                  ৳{{ (b.supplier_invoice_amount || 0) | number:'1.2-2' }}
                </td>
                <td class="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                  ৳{{ b.calculated_expected_amount | number:'1.2-2' }}
                </td>
                <td class="p-3 text-right font-mono font-black" [class]="b.variance_amount > 50 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'">
                  {{ b.variance_amount !== 0 ? ('৳' + (b.variance_amount | number:'1.2-2')) : '৳0.00' }}
                </td>
                <td class="p-3 text-center">
                  <span
                    [class]="getMatchBadgeClass(b.three_way_match_status)"
                    class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                  >
                    {{ b.three_way_match_status }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <span
                    [class]="b.payment_status === 'PAID' ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'"
                  >
                    {{ b.payment_status || 'UNPAID' }}
                  </span>
                  @if (b.payment_voucher_ref) {
                    <div class="text-[9px] font-mono text-slate-500 mt-0.5">{{ b.payment_voucher_ref }}</div>
                  }
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      (click)="openReconcileModal(b)"
                      class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                      title="Perform 3-Way Reconcile"
                    >
                      ⚖️ 3-Way Match
                    </button>
                    @if (b.rejected_quantity && b.rejected_quantity > 0 && !b.debit_note_number) {
                      <button
                        type="button"
                        (click)="openDebitNoteModal(b)"
                        class="px-2 py-1 text-[10px] font-bold rounded-lg bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 cursor-pointer"
                        title="Issue Supplier Debit Note"
                      >
                        Debit Note
                      </button>
                    }
                    @if (b.three_way_match_status === 'ACCOUNTS_APPROVED' && b.payment_status !== 'PAID') {
                      <button
                        type="button"
                        (click)="openPaymentModal(b)"
                        class="px-2 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                        title="Disburse Payment Voucher"
                      >
                        💳 Pay
                      </button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="11" class="p-8 text-center text-slate-400 text-xs">
                  No supplier bills found matching the selected filters.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="flex items-center justify-between mt-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredBills().length }} total bills)
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="setPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Prev
          </button>
          <button
            *ngFor="let p of getPages()"
            type="button"
            (click)="setPage(p)"
            [class.bg-amber-500]="currentPage() === p"
            [class.text-slate-950]="currentPage() === p"
            [class.font-bold]="currentPage() === p"
            class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {{ p }}
          </button>
          <button
            type="button"
            (click)="setPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            class="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- MODAL 1: 3-Way Match & Commercial Invoice Reconcile -->
    <app-modal
      [isOpen]="isMatchModalOpen"
      [title]="selectedBill ? '3-Way Match & Accounts Approval: ' + selectedBill.grn_number : '3-Way Commercial Reconciliation'"
      [maxWidth]="'max-w-3xl'"
      (closeModal)="isMatchModalOpen = false"
    >
      <div *ngIf="selectedBill" class="space-y-4">
        <!-- 3-Way Visual Comparison Strip -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs space-y-1">
            <div class="font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider text-[10px]">1. Purchase Order</div>
            <div class="font-mono font-bold">{{ selectedBill.po_number }}</div>
            <div class="text-slate-600 dark:text-slate-400">PO Unit Price: ৳{{ selectedBill.po_unit_price | number:'1.2-2' }}</div>
            <div class="text-slate-600 dark:text-slate-400">Authorized Qty: {{ selectedBill.ordered_quantity }} {{ selectedBill.unit_of_measure }}</div>
          </div>

          <div class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs space-y-1">
            <div class="font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider text-[10px]">2. Goods Receipt (GRN)</div>
            <div class="font-mono font-bold">{{ selectedBill.grn_number }}</div>
            <div class="text-slate-600 dark:text-slate-400">Accepted Qty: <span class="font-bold text-emerald-600">{{ selectedBill.accepted_quantity }}</span></div>
            <div class="text-slate-600 dark:text-slate-400">QC Status: <span class="font-bold">{{ selectedBill.qc_status }}</span></div>
          </div>

          <div class="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs space-y-1">
            <div class="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[10px]">3. Expected Payable</div>
            <div class="text-slate-600 dark:text-slate-400">Base Goods Value:</div>
            <div class="text-base font-black text-amber-700 dark:text-amber-400 font-mono">
              ৳{{ ((selectedBill.accepted_quantity || 0) * (selectedBill.po_unit_price || 0)) | number:'1.2-2' }}
            </div>
            <div class="text-[10px] text-slate-500">Subject to Tax, Freight & Discount</div>
          </div>
        </div>

        <form [formGroup]="matchForm" (ngSubmit)="submitMatch()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <app-custom-input
                label="Supplier Invoice # *"
                placeholder="e.g. INV-2026-9941"
                formControlName="supplier_invoice_number"
                [required]="true"
              ></app-custom-input>
            </div>

            <div>
              <app-custom-input
                label="Billed Invoice Amount (৳) *"
                type="number"
                placeholder="Total invoice amount"
                formControlName="supplier_invoice_amount"
                [required]="true"
              ></app-custom-input>
            </div>

            <div>
              <app-custom-input
                label="VAT / Tax Amount (৳)"
                type="number"
                placeholder="e.g. 500.00"
                formControlName="vat_tax_amount"
              ></app-custom-input>
            </div>

            <div>
              <app-custom-input
                label="Freight / Unloading (৳)"
                type="number"
                placeholder="e.g. 1200.00"
                formControlName="freight_amount"
              ></app-custom-input>
            </div>

            <div>
              <app-custom-input
                label="Commercial Discount (৳)"
                type="number"
                placeholder="e.g. 300.00"
                formControlName="discount_amount"
              ></app-custom-input>
            </div>

            <div>
              <app-custom-input
                label="Accounts Voucher Reference *"
                placeholder="e.g. AP-VCH-2026-0812"
                formControlName="accounts_voucher_ref"
                [required]="true"
              ></app-custom-input>
            </div>

            <div class="sm:col-span-2 md:col-span-3">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Approval Action <span class="text-rose-500">*</span>
              </label>
              <select
                formControlName="approval_action"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="APPROVE_MATCH">Approve 3-Way Match & Post Accounts Payable</option>
                <option value="VARIANCE_FLAGGED">Flag Commercial Variance for Management Review</option>
                <option value="DISPUTED">Commercial Dispute (Price or Quality Discrepancy)</option>
              </select>
            </div>

            <div class="sm:col-span-2 md:col-span-3">
              <app-custom-textarea
                label="Reconciliation / Audit Notes"
                placeholder="e.g. Rate matches purchase order contract. Physical delivery count verified with Mushak 6.3 VAT Challan."
                formControlName="accounts_notes"
                rows="2"
              ></app-custom-textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="isMatchModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <app-custom-button
              [label]="isSaving() ? 'Reconciling...' : 'Confirm 3-Way Match & Post AP'"
              type="submit"
              variant="primary"
              [disabled]="matchForm.invalid || isSaving()"
            ></app-custom-button>
          </div>
        </form>
      </div>
    </app-modal>

    <!-- MODAL 2: Issue Supplier Debit Note -->
    <app-modal
      [isOpen]="isDebitNoteModalOpen"
      title="Issue Commercial Supplier Debit Note"
      subtitle="Charge back rejected materials or price discrepancies to supplier ledger"
      [maxWidth]="'max-w-md'"
      (closeModal)="isDebitNoteModalOpen = false"
    >
      <div *ngIf="selectedBillForDebit" class="space-y-4">
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-500">Supplier:</span>
            <span class="font-bold">{{ selectedBillForDebit.vendor_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Rejected Quantity:</span>
            <span class="font-bold text-rose-500">{{ selectedBillForDebit.rejected_quantity }} {{ selectedBillForDebit.unit_of_measure }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">PO Contract Unit Price:</span>
            <span class="font-mono font-bold">৳{{ selectedBillForDebit.po_unit_price | number:'1.2-2' }}</span>
          </div>
        </div>

        <form [formGroup]="debitNoteForm" (ngSubmit)="submitDebitNote()" class="space-y-3">
          <div>
            <app-custom-input
              label="Debit Note Amount (৳) *"
              type="number"
              formControlName="debit_amount"
              [required]="true"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Debit Reason Code *</label>
            <select
              formControlName="debit_reason"
              class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="REJECTED_GOODS_DEDUCTION">Deduction for Rejected / Quarantined Materials</option>
              <option value="PRICE_OVERCHARGE">Invoice Rate Overcharge against PO</option>
              <option value="TRANSIT_DAMAGE_CLAIM">Carrier / Supplier Transit Breakage Claim</option>
            </select>
          </div>

          <div>
            <app-custom-textarea
              label="Debit Note Notes & Remarks"
              placeholder="e.g. 10 bags torn during unloading, deducted from final payment."
              formControlName="remarks"
              rows="2"
            ></app-custom-textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="isDebitNoteModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="debitNoteForm.invalid || isSaving()"
              class="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 cursor-pointer"
            >
              {{ isSaving() ? 'Issuing...' : 'Issue Debit Note' }}
            </button>
          </div>
        </form>
      </div>
    </app-modal>

    <!-- MODAL 3: Accounts Payable Payment Voucher -->
    <app-modal
      [isOpen]="isPaymentModalOpen"
      title="Disburse Accounts Payable Payment"
      subtitle="Record payment voucher disbursement against 3-way matched supplier bill"
      [maxWidth]="'max-w-md'"
      (closeModal)="isPaymentModalOpen = false"
    >
      <div *ngIf="selectedBillForPayment" class="space-y-4">
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-500">Payable Vendor:</span>
            <span class="font-bold">{{ selectedBillForPayment.vendor_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Authorized Net Amount:</span>
            <span class="font-mono font-bold text-emerald-600">৳{{ selectedBillForPayment.supplier_invoice_amount | number:'1.2-2' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">AP Voucher Reference:</span>
            <span class="font-mono font-bold">{{ selectedBillForPayment.accounts_voucher_ref }}</span>
          </div>
        </div>

        <form [formGroup]="paymentForm" (ngSubmit)="submitPayment()" class="space-y-3">
          <div>
            <app-custom-input
              label="Disbursement Amount (৳) *"
              type="number"
              formControlName="paid_amount"
              [required]="true"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Method *</label>
            <select
              formControlName="payment_method"
              class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
            >
              <option value="BANK_TRANSFER">Bank Wire / BEFTN</option>
              <option value="CHEQUE">Account Payee Cheque</option>
              <option value="RTGS">RTGS Real-Time Settlement</option>
              <option value="CASH">Petty Cash Voucher</option>
            </select>
          </div>

          <div>
            <app-custom-input
              label="Bank Account Reference *"
              placeholder="e.g. City Bank CD A/C 3102-xxxx"
              formControlName="bank_account_reference"
              [required]="true"
            ></app-custom-input>
          </div>

          <div>
            <app-custom-input
              label="Cheque / Transaction Ref #"
              placeholder="e.g. CQ-9921029"
              formControlName="cheque_number"
            ></app-custom-input>
          </div>

          <div>
            <app-custom-input
              label="Bank Payment Voucher (BPV) Ref *"
              placeholder="e.g. BPV-2026-0412"
              formControlName="payment_voucher_ref"
              [required]="true"
            ></app-custom-input>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="isPaymentModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              [disabled]="paymentForm.invalid || isSaving()"
              class="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer"
            >
              {{ isSaving() ? 'Posting Payment...' : 'Confirm Payment Voucher' }}
            </button>
          </div>
        </form>
      </div>
    </app-modal>
  `
})
export class SupplierBillsComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);

  bills = signal<SupplierBill[]>([]);
  vendors = signal<Vendor[]>([]);

  vendorOptions = signal<{ label: string; value: any }[]>([]);

  statusOptions = [
    { label: 'All Match Statuses', value: '' },
    { label: 'ACCOUNTS_APPROVED (Matched)', value: 'ACCOUNTS_APPROVED' },
    { label: 'PENDING_MATCH', value: 'PENDING_MATCH' },
    { label: 'VARIANCE_FLAGGED (Review Required)', value: 'VARIANCE_FLAGGED' },
    { label: 'DISPUTED', value: 'DISPUTED' }
  ];

  // Filter state
  searchQuery = '';
  selectedStatus = '';
  selectedVendorId: number | null = null;

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Modals state
  isMatchModalOpen = false;
  isDebitNoteModalOpen = false;
  isPaymentModalOpen = false;
  isSaving = signal<boolean>(false);

  selectedBill: SupplierBill | null = null;
  selectedBillForDebit: SupplierBill | null = null;
  selectedBillForPayment: SupplierBill | null = null;

  matchForm: FormGroup = this.fb.group({
    supplier_invoice_number: ['', [Validators.required]],
    supplier_invoice_amount: [null, [Validators.required, Validators.min(0.01)]],
    vat_tax_amount: [0],
    freight_amount: [0],
    discount_amount: [0],
    approval_action: ['APPROVE_MATCH', [Validators.required]],
    accounts_voucher_ref: ['', [Validators.required]],
    accounts_notes: ['']
  });

  debitNoteForm: FormGroup = this.fb.group({
    debit_amount: [null, [Validators.required, Validators.min(0.01)]],
    debit_reason: ['REJECTED_GOODS_DEDUCTION', [Validators.required]],
    remarks: ['']
  });

  paymentForm: FormGroup = this.fb.group({
    paid_amount: [null, [Validators.required, Validators.min(0.01)]],
    payment_method: ['BANK_TRANSFER', [Validators.required]],
    bank_account_reference: ['City Bank CD A/C 3102-8891', [Validators.required]],
    cheque_number: [''],
    payment_voucher_ref: ['', [Validators.required]]
  });

  // KPIs
  totalInvoicedAmount = computed(() => this.bills().reduce((sum, b) => sum + (Number(b.supplier_invoice_amount) || Number(b.calculated_expected_amount) || 0), 0));
  matchedCount = computed(() => this.bills().filter(b => b.three_way_match_status === 'ACCOUNTS_APPROVED' || b.three_way_match_status === 'MATCHED').length);
  varianceCount = computed(() => this.bills().filter(b => b.three_way_match_status === 'VARIANCE_FLAGGED' || b.three_way_match_status === 'DISPUTED').length);
  paidCount = computed(() => this.bills().filter(b => b.payment_status === 'PAID').length);

  // Filtered
  filteredBills = computed(() => {
    let list = this.bills();
    if (this.selectedStatus) {
      list = list.filter(b => b.three_way_match_status === this.selectedStatus);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(b =>
        b.grn_number.toLowerCase().includes(q) ||
        b.po_number.toLowerCase().includes(q) ||
        b.vendor_name.toLowerCase().includes(q) ||
        (b.supplier_invoice_number && b.supplier_invoice_number.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredBills().length / this.pageSize())));

  pagedBills = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredBills().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadBills();
    this.loadVendors();
  }

  loadVendors(): void {
    this.procurementService.getVendors().subscribe({
      next: (data) => {
        this.vendors.set(data || []);
        this.vendorOptions.set([
          { label: 'All Suppliers', value: null },
          ...data.map(v => ({ label: v.vendor_name, value: v.id }))
        ]);
      },
      error: () => {}
    });
  }

  loadBills(): void {
    this.procurementService.getSupplierBills({
      status_filter: this.selectedStatus || undefined,
      vendor_id: this.selectedVendorId || undefined,
      search: this.searchQuery || undefined,
      limit: 100,
      offset: 0
    }).subscribe({
      next: (data) => {
        this.bills.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load supplier bills:', err)
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadBills();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedVendorId = null;
    this.currentPage.set(1);
    this.loadBills();
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  getPages(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  getMatchBadgeClass(status: string): string {
    switch (status) {
      case 'ACCOUNTS_APPROVED':
      case 'MATCHED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      case 'VARIANCE_FLAGGED':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'DISPUTED':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
    }
  }

  openReconcileModal(bill: SupplierBill): void {
    this.selectedBill = bill;
    const baseExpected = (bill.accepted_quantity || 0) * (bill.po_unit_price || 0);
    this.matchForm.reset({
      supplier_invoice_number: bill.supplier_invoice_number || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier_invoice_amount: bill.supplier_invoice_amount || baseExpected,
      vat_tax_amount: bill.vat_tax_amount || 0,
      freight_amount: bill.freight_amount || 0,
      discount_amount: bill.discount_amount || 0,
      approval_action: 'APPROVE_MATCH',
      accounts_voucher_ref: bill.accounts_voucher_ref || `AP-VCH-${new Date().getFullYear()}-${bill.id.toString().padStart(4, '0')}`,
      accounts_notes: 'Rates and quantities matched against signed PO and delivery challan.'
    });
    this.isMatchModalOpen = true;
  }

  openDebitNoteModal(bill: SupplierBill): void {
    this.selectedBillForDebit = bill;
    const calcDebit = (bill.rejected_quantity || 0) * (bill.po_unit_price || 0);
    this.debitNoteForm.reset({
      debit_amount: calcDebit > 0 ? calcDebit : 1000,
      debit_reason: 'REJECTED_GOODS_DEDUCTION',
      remarks: `Deduction for ${bill.rejected_quantity} ${bill.unit_of_measure} rejected items at GRN ${bill.grn_number}.`
    });
    this.isDebitNoteModalOpen = true;
  }

  openPaymentModal(bill: SupplierBill): void {
    this.selectedBillForPayment = bill;
    this.paymentForm.reset({
      paid_amount: bill.supplier_invoice_amount || bill.calculated_expected_amount,
      payment_method: 'BANK_TRANSFER',
      bank_account_reference: 'City Bank CD A/C 3102-8891',
      cheque_number: '',
      payment_voucher_ref: `BPV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    });
    this.isPaymentModalOpen = true;
  }

  submitMatch(): void {
    if (!this.selectedBill || this.matchForm.invalid) return;

    this.isSaving.set(true);
    const val = this.matchForm.value;

    this.procurementService.reconcileSupplierBill(this.selectedBill.id, val).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isMatchModalOpen = false;
        this.loadBills();
      },
      error: (err) => {
        this.isSaving.set(false);
        alert(err.error?.detail || 'Failed to reconcile supplier bill.');
      }
    });
  }

  submitDebitNote(): void {
    if (!this.selectedBillForDebit || this.debitNoteForm.invalid) return;

    this.isSaving.set(true);
    const val = this.debitNoteForm.value;

    this.procurementService.issueSupplierDebitNote(this.selectedBillForDebit.id, val).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isDebitNoteModalOpen = false;
        this.loadBills();
      },
      error: () => this.isSaving.set(false)
    });
  }

  submitPayment(): void {
    if (!this.selectedBillForPayment || this.paymentForm.invalid) return;

    this.isSaving.set(true);
    const val = this.paymentForm.value;

    this.procurementService.recordSupplierBillPayment(this.selectedBillForPayment.id, val).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isPaymentModalOpen = false;
        this.loadBills();
      },
      error: (err) => {
        this.isSaving.set(false);
        alert(err.error?.detail || 'Failed to record payment voucher.');
      }
    });
  }
}
