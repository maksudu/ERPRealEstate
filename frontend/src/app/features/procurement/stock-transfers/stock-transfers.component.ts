import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import {
  StockTransfer,
  StockAdjustmentRecord,
  SiteStore,
  MaterialItem
} from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-stock-transfers',
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
    ModalComponent
  ],
  template: `
    <app-procurement-nav
      title="9.11 Stock Transfers & Adjustments"
      subtitle="Inter-Site Material Transfers with Gate Dispatch Challan, In-Transit Tracking & Controlled Adjustments"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="openAdjustModal()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          <span>⚖️</span>
          <span>Stock Adjustment</span>
        </button>
        <button
          type="button"
          (click)="openDispatchModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors cursor-pointer"
        >
          <span>🔄</span>
          <span>Dispatch Stock Transfer</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">In-Transit Dispatches</span>
          <span class="p-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">🚚 Moving</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ inTransitCount() }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">৳{{ inTransitValue() | number:'1.2-2' }} in transit</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Received Transfers</span>
          <span class="p-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">✓ Arrived</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ receivedCount() }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Credited to site stores</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Stock Adjustments</span>
          <span class="p-1.5 bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">⚖️ Audited</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ adjustments().length }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Reason-coded audit entries</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Active Stores & Sites</span>
          <span class="p-1.5 bg-purple-500/15 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">🏢 Locations</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ stores().length }}</div>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Central warehouses & sites</p>
      </div>
    </div>

    <!-- Main Navigation Tabs: Transfers vs Adjustments -->
    <div class="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        type="button"
        (click)="activeTab = 'TRANSFERS'"
        [class]="activeTab === 'TRANSFERS' ? 'px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-xs' : 'px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      >
        🔄 Inter-Site Stock Transfers ({{ stockTransfers().length }})
      </button>
      <button
        type="button"
        (click)="activeTab = 'ADJUSTMENTS'; loadAdjustments()"
        [class]="activeTab === 'ADJUSTMENTS' ? 'px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 shadow-xs' : 'px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'"
      >
        ⚖️ Stock Adjustments & Write-Offs Register ({{ adjustments().length }})
      </button>
    </div>

    <!-- TAB 1: Stock Transfers Register -->
    <div *ngIf="activeTab === 'TRANSFERS'">
      <app-card-container
        title="Inter-Site Stock Transfers Register"
        subtitle="All inter-project dispatches, gate passes, in-transit movements, partial receipts and receiving confirmation"
      >
        <!-- Filters Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2 w-full sm:w-80">
            <div class="relative w-full">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearch()"
                placeholder="Search transfer number, challan, material..."
                class="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              <svg class="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onSearch()"
              class="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Transfer Statuses</option>
              <option value="DISPATCHED">Dispatched / In-Transit</option>
              <option value="RECEIVED">Received & Stock Credited</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <!-- Paginated Transfers Table (NO inline form below table) -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th class="py-2.5 px-3">Transfer ID</th>
                <th class="py-2.5 px-3">Dispatch Date</th>
                <th class="py-2.5 px-3">From Store</th>
                <th class="py-2.5 px-3">To Store</th>
                <th class="py-2.5 px-3">Material & Qty</th>
                <th class="py-2.5 px-3">Challan / Vehicle</th>
                <th class="py-2.5 px-3 text-right">Transfer Value</th>
                <th class="py-2.5 px-3 text-center">Status</th>
                <th class="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (trf of stockTransfers(); track trf.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ trf.transfer_number }}
                  </td>
                  <td class="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                    {{ trf.dispatch_date }}
                  </td>
                  <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {{ trf.from_store_name }}
                  </td>
                  <td class="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                    {{ trf.to_store_name }}
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ trf.material_name }}</div>
                    <div class="font-mono text-xs text-slate-600 dark:text-slate-400">
                      Dispatched: {{ trf.transfer_quantity | number:'1.0-2' }} {{ trf.unit_of_measure }}
                    </div>
                    @if (trf.received_quantity !== undefined && trf.received_quantity !== null && trf.received_quantity < trf.transfer_quantity) {
                      <div class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        Accepted: {{ trf.received_quantity | number:'1.0-2' }} | Damaged/Short: {{ (trf.damaged_quantity || 0) + (trf.short_delivered_quantity || 0) }}
                      </div>
                    }
                  </td>
                  <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    <div>{{ trf.dispatch_challan_number }}</div>
                    @if (trf.remarks) {
                      <div class="text-[10px] text-slate-400 truncate max-w-[140px]">{{ trf.remarks }}</div>
                    }
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ trf.total_transfer_value | number:'1.2-2' }}
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span [class]="trf.status === 'RECEIVED' ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : (trf.status === 'CANCELLED' ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30')">
                      {{ trf.status === 'DISPATCHED' ? 'IN-TRANSIT' : trf.status }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    @if (trf.status === 'DISPATCHED') {
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openReceiveModal(trf)"
                          class="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs cursor-pointer"
                        >
                          ✓ Receive
                        </button>
                        <button
                          type="button"
                          (click)="openCancelModal(trf)"
                          class="px-2 py-1 text-[10px] font-semibold rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 cursor-pointer"
                          title="Revoke / Cancel Dispatch"
                        >
                          ✕
                        </button>
                      </div>
                    } @else if (trf.status === 'RECEIVED') {
                      <span class="text-[10px] text-slate-400">By: {{ trf.received_by_name || 'Store Officer' }}</span>
                    } @else {
                      <span class="text-[10px] text-rose-400 font-bold">Revoked</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-8 text-center text-slate-400 text-xs">
                    No stock transfer records found. Click "+ Dispatch Stock Transfer" above to initiate.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between pt-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <span class="font-bold text-slate-800 dark:text-slate-200">{{ stockTransfers().length }}</span> transfers
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="previousPage()"
              [disabled]="offset === 0"
              class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Previous
            </button>
            <span class="font-mono text-xs">Page {{ (offset / limit) + 1 }}</span>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="stockTransfers().length < limit"
              class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>

    <!-- TAB 2: Stock Adjustments & Write-Offs Register -->
    <div *ngIf="activeTab === 'ADJUSTMENTS'">
      <app-card-container
        title="Stock Adjustments & Loss Write-Offs Register"
        subtitle="Physical count reconciliations, moisture damage, handling loss, UOM corrections and opening balance migrations"
      >
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th class="py-2.5 px-3">Voucher Reference</th>
                <th class="py-2.5 px-3">Store Location</th>
                <th class="py-2.5 px-3">Material Item</th>
                <th class="py-2.5 px-3 text-right">Qty Delta</th>
                <th class="py-2.5 px-3 text-right">Unit Rate (৳)</th>
                <th class="py-2.5 px-3 text-right">Adjustment Value</th>
                <th class="py-2.5 px-3">Reason Code</th>
                <th class="py-2.5 px-3 text-center">Audit Status</th>
                <th class="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (adj of adjustments(); track adj.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td class="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {{ adj.voucher_reference }}
                  </td>
                  <td class="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                    {{ adj.store_name }}
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ adj.material_name }}</div>
                    <div class="text-[10px] text-slate-500">{{ adj.unit_of_measure }}</div>
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold" [class]="adj.quantity_delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ adj.quantity_delta > 0 ? '+' : '' }}{{ adj.quantity_delta | number:'1.2-2' }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                    ৳{{ adj.unit_rate | number:'1.2-2' }}
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ adj.total_adjustment_value | number:'1.2-2' }}
                  </td>
                  <td class="py-2.5 px-3">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ adj.adjustment_reason }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span [class]="adj.approval_status === 'APPROVED' ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'">
                      {{ adj.approval_status }}
                    </span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      (click)="openReverseModal(adj)"
                      class="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                      title="Controlled Stock Reversal"
                    >
                      ↩ Reversal
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-8 text-center text-slate-400 text-xs">
                    No stock adjustments recorded yet.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>

    <!-- MODAL 1: Dispatch Inter-Site Transfer (NOT showing under table) -->
    <app-modal
      [isOpen]="isDispatchModalOpen"
      title="Dispatch Inter-Site Stock Transfer"
      subtitle="Transfer materials between central warehouse and project sites with gate pass"
      [maxWidth]="'max-w-2xl'"
      (closeModal)="isDispatchModalOpen = false"
    >
      <form [formGroup]="dispatchForm" (ngSubmit)="saveDispatch()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- From Store -->
          <div>
            <app-searchable-select
              label="Source Dispatch Store"
              placeholder="Select Source Store..."
              [options]="storeOptions()"
              formControlName="from_store_id"
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- To Store -->
          <div>
            <app-searchable-select
              label="Destination Store / Site"
              placeholder="Select Destination Store..."
              [options]="storeOptions()"
              formControlName="to_store_id"
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Material Item -->
          <div class="sm:col-span-2">
            <app-searchable-select
              label="Material Catalog Item"
              placeholder="Search or Select Material..."
              [options]="materialOptions()"
              [allowCreateNew]="true"
              (createNew)="openQuickMaterialModal()"
              formControlName="material_id"
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Quantity -->
          <div>
            <app-custom-input
              label="Quantity to Transfer"
              type="number"
              placeholder="e.g. 100"
              formControlName="transfer_quantity"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Challan Number -->
          <div>
            <app-custom-input
              label="Dispatch Challan Number"
              placeholder="e.g. TRF-CH-2026-0042"
              formControlName="dispatch_challan_number"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Vehicle / Driver Details -->
          <div class="sm:col-span-2">
            <app-custom-input
              label="Transport Vehicle / Driver Details"
              placeholder="e.g. Dhaka Metro-Ta-11-2098 / Driver Kashem (Phone: 01711-xxxxxx)"
              formControlName="remarks"
            ></app-custom-input>
          </div>
        </div>

        <!-- Modal Actions Footer -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isDispatchModalOpen = false"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <app-custom-button
            [label]="isSaving() ? 'Dispatching...' : 'Dispatch Inter-Site Transfer'"
            type="submit"
            variant="primary"
            [disabled]="dispatchForm.invalid || isSaving()"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- MODAL 2: Acknowledge Physical Receipt & Discrepancy Reporting -->
    <app-modal
      [isOpen]="isReceiveModalOpen"
      title="Acknowledge Physical Receipt & Discrepancy"
      subtitle="Verify received quantities, inspect transit damage, and credit available inventory"
      [maxWidth]="'max-w-xl'"
      (closeModal)="isReceiveModalOpen = false"
    >
      <div *ngIf="selectedTransferForReceive" class="space-y-4">
        <div class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
          <div class="flex justify-between">
            <span class="text-slate-500">Transfer Number:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-slate-100">{{ selectedTransferForReceive.transfer_number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Material Item:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedTransferForReceive.material_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-500">Dispatched Quantity:</span>
            <span class="font-mono font-bold text-amber-600 dark:text-amber-400">
              {{ selectedTransferForReceive.transfer_quantity | number:'1.0-2' }} {{ selectedTransferForReceive.unit_of_measure }}
            </span>
          </div>
        </div>

        <form [formGroup]="receiveForm" (ngSubmit)="confirmReceive()" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Accepted Quantity -->
            <div>
              <app-custom-input
                label="Accepted Physical Quantity"
                type="number"
                placeholder="Good condition quantity"
                formControlName="received_quantity"
                [required]="true"
              ></app-custom-input>
            </div>

            <!-- Transit Damaged Quantity -->
            <div>
              <app-custom-input
                label="Transit Damaged Quantity"
                type="number"
                placeholder="e.g. 2"
                formControlName="damaged_quantity"
              ></app-custom-input>
            </div>

            <!-- Short Delivered Quantity -->
            <div class="sm:col-span-2">
              <app-custom-input
                label="Short Delivered Discrepancy Quantity"
                type="number"
                placeholder="Quantity missing during transit"
                formControlName="short_delivered_quantity"
              ></app-custom-input>
            </div>

            <!-- Discrepancy Reason -->
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Discrepancy Cause / Transporter Accountability
              </label>
              <select
                formControlName="discrepancy_reason"
                class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="NONE">No Discrepancy (Full Acceptable Delivery)</option>
                <option value="TRANSIT_RAIN_DAMAGE">Moisture & Rain Damage In-Transit</option>
                <option value="BAG_BURST_HANDLING">Bag Tear / Mishandling during Unloading</option>
                <option value="SHORT_LOADED_AT_SOURCE">Short-Loaded at Source Warehouse</option>
                <option value="TRANSPORTER_PILFERAGE">Suspected Carrier Loss</option>
              </select>
            </div>

            <!-- Storekeeper Remarks -->
            <div class="sm:col-span-2">
              <app-custom-textarea
                label="Receiving Storekeeper Remarks & Signature Reference"
                placeholder="e.g. Received at Site Store by Engineer Arif. 2 bags found punctured, written off to transit loss."
                formControlName="remarks"
              ></app-custom-textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="isReceiveModalOpen = false"
              class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <app-custom-button
              [label]="isSaving() ? 'Crediting Stock...' : 'Confirm Receipt & Credit Stock'"
              type="submit"
              variant="primary"
              [disabled]="receiveForm.invalid || isSaving()"
            ></app-custom-button>
          </div>
        </form>
      </div>
    </app-modal>

    <!-- MODAL 3: Cancel Transfer Modal -->
    <app-modal
      [isOpen]="isCancelModalOpen"
      title="Revoke / Cancel In-Transit Transfer"
      subtitle="Controlled cancellation with automatic stock rollback to source warehouse"
      [maxWidth]="'max-w-md'"
      (closeModal)="isCancelModalOpen = false"
    >
      <div *ngIf="selectedTransferForCancel" class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Are you sure you want to cancel Transfer <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedTransferForCancel.transfer_number }}</span>?
          The dispatched quantity ({{ selectedTransferForCancel.transfer_quantity }} {{ selectedTransferForCancel.unit_of_measure }}) will be restored to <span class="font-semibold">{{ selectedTransferForCancel.from_store_name }}</span>.
        </p>

        <div>
          <app-custom-input
            label="Cancellation Reason *"
            placeholder="e.g. Truck breakdown, order reassigned to Site-B"
            [(ngModel)]="cancelReason"
          ></app-custom-input>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isCancelModalOpen = false"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Go Back
          </button>
          <button
            type="button"
            (click)="confirmCancelTransfer()"
            [disabled]="!cancelReason || isSaving()"
            class="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 cursor-pointer"
          >
            {{ isSaving() ? 'Revoking...' : 'Confirm Rollback & Cancel' }}
          </button>
        </div>
      </div>
    </app-modal>

    <!-- MODAL 4: Stock Adjustment Modal -->
    <app-modal
      [isOpen]="isAdjustModalOpen"
      title="Store Stock Balance Adjustment"
      subtitle="Reason-coded physical audit corrections, opening stock migrations, and approved write-offs"
      [maxWidth]="'max-w-xl'"
      (closeModal)="isAdjustModalOpen = false"
    >
      <form [formGroup]="adjustForm" (ngSubmit)="saveAdjustment()" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <!-- Store Selection -->
          <div class="sm:col-span-2">
            <app-searchable-select
              label="Select Site Store Location"
              placeholder="Choose Store..."
              [options]="storeOptions()"
              formControlName="store_id"
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Material Selection -->
          <div class="sm:col-span-2">
            <app-searchable-select
              label="Material Item"
              placeholder="Search or Select Material..."
              [options]="materialOptions()"
              [allowCreateNew]="true"
              (createNew)="openQuickMaterialModal()"
              formControlName="material_id"
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Quantity Delta -->
          <div>
            <app-custom-input
              label="Quantity Delta (+ to increase, - to decrease)"
              type="number"
              placeholder="e.g. +50 or -15"
              formControlName="quantity_delta"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Reason Code -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Statutory Reason Code <span class="text-rose-500">*</span>
            </label>
            <select
              formControlName="adjustment_reason"
              class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="CYCLE_COUNT_VARIANCE">Physical Cycle Count Difference</option>
              <option value="DAMAGE_MOISTURE">Moisture / Weather Exposure Damage</option>
              <option value="HANDLING_LOSS">Loading & Unloading Breakage / Spillage</option>
              <option value="UOM_CORRECTION">Unit-of-Measure Conversion Correction</option>
              <option value="OPENING_BALANCE">Opening Stock Legacy Migration</option>
              <option value="THEFT_OR_PILFERAGE">Site Pilferage / Security Shortage</option>
              <option value="OBSOLETE_SCRAP">Obsolete Finishing Material Write-Off</option>
            </select>
          </div>

          <!-- Voucher Reference -->
          <div>
            <app-custom-input
              label="Audit Voucher / Slip Reference"
              placeholder="e.g. AUD-2026-0089"
              formControlName="voucher_reference"
            ></app-custom-input>
          </div>

          <!-- Evidence Notes -->
          <div>
            <app-custom-input
              label="Supporting Evidence / Document Note"
              placeholder="e.g. Verified by GM Construction on Sheet #4"
              formControlName="evidence_notes"
            ></app-custom-input>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isAdjustModalOpen = false"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <app-custom-button
            [label]="isSaving() ? 'Posting...' : 'Post Stock Adjustment'"
            type="submit"
            variant="primary"
            [disabled]="adjustForm.invalid || isSaving()"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- MODAL 5: Controlled Adjustment Reversal -->
    <app-modal
      [isOpen]="isReverseModalOpen"
      title="Controlled Stock Adjustment Reversal"
      subtitle="Reverses previous adjustment entry and logs an audited reversal transaction"
      [maxWidth]="'max-w-md'"
      (closeModal)="isReverseModalOpen = false"
    >
      <div *ngIf="selectedAdjForReverse" class="space-y-4">
        <p class="text-xs text-slate-600 dark:text-slate-400">
          Reverse adjustment for <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedAdjForReverse.material_name }}</span> (Delta: {{ selectedAdjForReverse.quantity_delta }} {{ selectedAdjForReverse.unit_of_measure }})?
        </p>

        <div>
          <app-custom-input
            label="Reversal Justification *"
            placeholder="e.g. Audit error corrected, duplicate count reversed"
            [(ngModel)]="reversalReason"
          ></app-custom-input>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isReverseModalOpen = false"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="confirmReverseAdjustment()"
            [disabled]="!reversalReason || isSaving()"
            class="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 cursor-pointer"
          >
            {{ isSaving() ? 'Reversing...' : 'Apply Controlled Reversal' }}
          </button>
        </div>
      </div>
    </app-modal>

    <!-- MODAL 6: Quick Add Material Item -->
    <app-modal
      [isOpen]="isQuickMaterialModalOpen"
      title="Quick Register New Material Item"
      subtitle="Add catalog item into material master immediately"
      [maxWidth]="'max-w-md'"
      (closeModal)="isQuickMaterialModalOpen = false"
    >
      <form [formGroup]="quickMaterialForm" (ngSubmit)="saveQuickMaterial()" class="space-y-3">
        <div>
          <app-custom-input
            label="Material Name *"
            placeholder="e.g. Ready-Mix Concrete Grade 35"
            formControlName="material_name"
            [required]="true"
          ></app-custom-input>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Trade Category *</label>
          <select
            formControlName="category"
            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          >
            <option value="CEMENT">Cement</option>
            <option value="REBAR">Steel Rebar 500W</option>
            <option value="SAND">Sylhet Sand (CFT)</option>
            <option value="STONE_CHIPS">Stone Chips / Aggregates</option>
            <option value="BRICKS">Auto Bricks (Nos)</option>
            <option value="FINISHING">Finishing & MEP</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit of Measure *</label>
          <select
            formControlName="unit_of_measure"
            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
          >
            <option value="BAG">Bags</option>
            <option value="TON">Metric Tons</option>
            <option value="CFT">Cubic Feet (CFT)</option>
            <option value="NOS">Pieces (Nos)</option>
            <option value="SQFT">Square Feet (SQFT)</option>
          </select>
        </div>
        <div>
          <app-custom-input
            label="Standard Unit Cost (৳) *"
            type="number"
            placeholder="e.g. 520.00"
            formControlName="standard_unit_cost"
            [required]="true"
          ></app-custom-input>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="isQuickMaterialModalOpen = false"
            class="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            [disabled]="quickMaterialForm.invalid || isSaving()"
            class="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 disabled:opacity-50 cursor-pointer"
          >
            Save & Select Material
          </button>
        </div>
      </form>
    </app-modal>
  `
})
export class StockTransfersComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);

  activeTab: 'TRANSFERS' | 'ADJUSTMENTS' = 'TRANSFERS';

  stockTransfers = signal<StockTransfer[]>([]);
  adjustments = signal<StockAdjustmentRecord[]>([]);
  stores = signal<SiteStore[]>([]);
  materials = signal<MaterialItem[]>([]);

  storeOptions = signal<{ label: string; value: number }[]>([]);
  materialOptions = signal<{ label: string; value: number }[]>([]);

  isDispatchModalOpen = false;
  isReceiveModalOpen = false;
  isCancelModalOpen = false;
  isAdjustModalOpen = false;
  isReverseModalOpen = false;
  isQuickMaterialModalOpen = false;

  selectedTransferForReceive: StockTransfer | null = null;
  selectedTransferForCancel: StockTransfer | null = null;
  selectedAdjForReverse: StockAdjustmentRecord | null = null;

  cancelReason = '';
  reversalReason = '';
  isSaving = signal<boolean>(false);

  searchQuery = '';
  selectedStatus = '';
  limit = 20;
  offset = 0;

  dispatchForm: FormGroup = this.fb.group({
    from_store_id: ['', Validators.required],
    to_store_id: ['', Validators.required],
    material_id: ['', Validators.required],
    transfer_quantity: [50, [Validators.required, Validators.min(0.01)]],
    dispatch_challan_number: ['', Validators.required],
    remarks: ['']
  });

  receiveForm: FormGroup = this.fb.group({
    received_quantity: ['', [Validators.required, Validators.min(0)]],
    damaged_quantity: [0, [Validators.min(0)]],
    short_delivered_quantity: [0, [Validators.min(0)]],
    discrepancy_reason: ['NONE'],
    remarks: ['']
  });

  adjustForm: FormGroup = this.fb.group({
    store_id: ['', Validators.required],
    material_id: ['', Validators.required],
    quantity_delta: ['', Validators.required],
    adjustment_reason: ['CYCLE_COUNT_VARIANCE', Validators.required],
    voucher_reference: [''],
    evidence_notes: ['']
  });

  quickMaterialForm: FormGroup = this.fb.group({
    material_name: ['', Validators.required],
    category: ['CEMENT', Validators.required],
    unit_of_measure: ['BAG', Validators.required],
    standard_unit_cost: [520, [Validators.required, Validators.min(0.01)]]
  });

  ngOnInit(): void {
    this.loadTransfers();
    this.loadAdjustments();
    this.loadMasterData();
  }

  loadMasterData(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (data) => {
        this.stores.set(data);
        this.storeOptions.set(
          data.map(s => ({
            label: `${s.store_name} (${s.is_central_warehouse ? 'Central Warehouse' : 'Project Site'})`,
            value: s.id
          }))
        );
      },
      error: () => {}
    });

    this.procurementService.getMaterials().subscribe({
      next: (data) => {
        this.materials.set(data);
        this.materialOptions.set(
          data.map(m => ({
            label: `${m.material_code} - ${m.material_name} (${m.unit_of_measure})`,
            value: m.id
          }))
        );
      },
      error: () => {}
    });
  }

  loadTransfers(): void {
    this.procurementService.getStockTransfers({
      status_filter: this.selectedStatus || undefined,
      search: this.searchQuery || undefined,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (data) => this.stockTransfers.set(data),
      error: () => {}
    });
  }

  loadAdjustments(): void {
    this.procurementService.getStockAdjustments({
      limit: 50,
      offset: 0
    }).subscribe({
      next: (data) => this.adjustments.set(data),
      error: () => {}
    });
  }

  onSearch(): void {
    this.offset = 0;
    this.loadTransfers();
  }

  nextPage(): void {
    this.offset += this.limit;
    this.loadTransfers();
  }

  previousPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadTransfers();
    }
  }

  inTransitCount(): number {
    return this.stockTransfers().filter(t => t.status === 'DISPATCHED').length;
  }

  inTransitValue(): number {
    return this.stockTransfers()
      .filter(t => t.status === 'DISPATCHED')
      .reduce((sum, t) => sum + (Number(t.total_transfer_value) || 0), 0);
  }

  receivedCount(): number {
    return this.stockTransfers().filter(t => t.status === 'RECEIVED').length;
  }

  openDispatchModal(): void {
    this.dispatchForm.reset({
      from_store_id: this.stores().length > 0 ? this.stores()[0].id : '',
      to_store_id: this.stores().length > 1 ? this.stores()[1].id : '',
      material_id: this.materials().length > 0 ? this.materials()[0].id : '',
      transfer_quantity: 50,
      dispatch_challan_number: `TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      remarks: 'Gate pass verified. Transport vehicle Dhaka Metro-Ta-11-2098.'
    });
    this.isDispatchModalOpen = true;
  }

  openReceiveModal(trf: StockTransfer): void {
    this.selectedTransferForReceive = trf;
    this.receiveForm.reset({
      received_quantity: trf.transfer_quantity,
      damaged_quantity: 0,
      short_delivered_quantity: 0,
      discrepancy_reason: 'NONE',
      remarks: 'Received and verified in sound condition.'
    });
    this.isReceiveModalOpen = true;
  }

  openCancelModal(trf: StockTransfer): void {
    this.selectedTransferForCancel = trf;
    this.cancelReason = '';
    this.isCancelModalOpen = true;
  }

  openAdjustModal(): void {
    this.adjustForm.reset({
      store_id: this.stores().length > 0 ? this.stores()[0].id : '',
      material_id: this.materials().length > 0 ? this.materials()[0].id : '',
      quantity_delta: 10,
      adjustment_reason: 'CYCLE_COUNT_VARIANCE',
      voucher_reference: `ADJ-AUD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      evidence_notes: 'Physical count sheet signed by Store Officer.'
    });
    this.isAdjustModalOpen = true;
  }

  openReverseModal(adj: StockAdjustmentRecord): void {
    this.selectedAdjForReverse = adj;
    this.reversalReason = '';
    this.isReverseModalOpen = true;
  }

  openQuickMaterialModal(): void {
    this.quickMaterialForm.reset({
      material_name: '',
      category: 'CEMENT',
      unit_of_measure: 'BAG',
      standard_unit_cost: 520
    });
    this.isQuickMaterialModalOpen = true;
  }

  saveDispatch(): void {
    if (this.dispatchForm.invalid) return;

    this.isSaving.set(true);
    const val = this.dispatchForm.value;

    const payload = {
      from_store_id: Number(val.from_store_id),
      to_store_id: Number(val.to_store_id),
      material_id: Number(val.material_id),
      transfer_quantity: Number(val.transfer_quantity),
      dispatch_challan_number: val.dispatch_challan_number,
      remarks: val.remarks
    };

    this.procurementService.dispatchStockTransfer(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isDispatchModalOpen = false;
        this.loadTransfers();
      },
      error: () => this.isSaving.set(false)
    });
  }

  confirmReceive(): void {
    if (!this.selectedTransferForReceive || this.receiveForm.invalid) return;

    this.isSaving.set(true);
    const val = this.receiveForm.value;

    const payload = {
      received_quantity: Number(val.received_quantity),
      damaged_quantity: Number(val.damaged_quantity || 0),
      short_delivered_quantity: Number(val.short_delivered_quantity || 0),
      discrepancy_reason: val.discrepancy_reason,
      remarks: val.remarks
    };

    this.procurementService.receiveStockTransfer(this.selectedTransferForReceive.id, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isReceiveModalOpen = false;
        this.loadTransfers();
      },
      error: () => this.isSaving.set(false)
    });
  }

  confirmCancelTransfer(): void {
    if (!this.selectedTransferForCancel || !this.cancelReason) return;

    this.isSaving.set(true);
    this.procurementService.cancelStockTransfer(this.selectedTransferForCancel.id, this.cancelReason).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCancelModalOpen = false;
        this.loadTransfers();
      },
      error: () => this.isSaving.set(false)
    });
  }

  saveAdjustment(): void {
    if (this.adjustForm.invalid) return;

    this.isSaving.set(true);
    const val = this.adjustForm.value;

    const payload = {
      store_id: Number(val.store_id),
      material_id: Number(val.material_id),
      quantity_delta: Number(val.quantity_delta),
      adjustment_reason: val.adjustment_reason,
      voucher_reference: val.voucher_reference,
      evidence_notes: val.evidence_notes
    };

    this.procurementService.adjustStoreStock(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isAdjustModalOpen = false;
        this.loadAdjustments();
      },
      error: () => this.isSaving.set(false)
    });
  }

  confirmReverseAdjustment(): void {
    if (!this.selectedAdjForReverse || !this.reversalReason) return;

    this.isSaving.set(true);
    this.procurementService.reverseStockAdjustment(this.selectedAdjForReverse.id, {
      reversal_reason: this.reversalReason
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isReverseModalOpen = false;
        this.loadAdjustments();
      },
      error: () => this.isSaving.set(false)
    });
  }

  saveQuickMaterial(): void {
    if (this.quickMaterialForm.invalid) return;

    this.isSaving.set(true);
    const val = this.quickMaterialForm.value;
    const code = `MAT-${Date.now().toString().slice(-4)}`;

    const payload = {
      material_code: code,
      material_name: val.material_name,
      category: val.category,
      unit_of_measure: val.unit_of_measure,
      standard_unit_cost: Number(val.standard_unit_cost)
    };

    this.procurementService.createMaterial(payload).subscribe({
      next: (newMat) => {
        this.isSaving.set(false);
        this.isQuickMaterialModalOpen = false;
        this.loadMasterData();
        // preselect new material
        this.dispatchForm.patchValue({ material_id: newMat.id });
        this.adjustForm.patchValue({ material_id: newMat.id });
      },
      error: () => this.isSaving.set(false)
    });
  }
}
