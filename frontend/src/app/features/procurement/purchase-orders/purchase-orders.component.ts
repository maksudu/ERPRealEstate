import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  PurchaseOrder,
  Vendor,
  MaterialItem,
  SiteStore
} from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  ModalComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-purchase-orders',
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
    ModalComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    <app-procurement-nav
      title=" Purchase Orders Register "
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadPurchaseOrders()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
        <button
          type="button"
          (click)="openAddPOModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors"
        >
          <span>+</span>
          <span>Create Direct Purchase Order</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Total Purchase Orders</span>
          <span class="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">📄 PO</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ purchaseOrders().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Across all sites & suppliers</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Total PO Commitment Value</span>
          <span class="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">৳ BDT</span>
        </div>
        <div class="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2">৳{{ totalPOAmount() | number:'1.2-2' }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Authorized procurement contracts</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Pending Goods Receipt</span>
          <span class="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">📦 Transit</span>
        </div>
        <div class="text-2xl font-black text-amber-800 dark:text-amber-400 mt-2">{{ pendingReceiptCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Issued or partial deliveries</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Pending Delegated Approval</span>
          <span class="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">🛡️ Sign</span>
        </div>
        <div class="text-2xl font-black text-purple-800 dark:text-purple-400 mt-2">{{ pendingApprovalCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Tier-2 / Tier-3 management signoff</p>
      </div>
    </div>

    <!-- Main Card Container: PO Register -->
    <app-card-container
      title="Purchase Orders Register"
      subtitle="Track purchase orders, contractual rates, delivery schedules, receiving progress, and multi-tier delegated authorization"
    >
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="w-64">
            <app-custom-input
              placeholder="Search PO #, supplier, material..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
            ></app-custom-input>
          </div>

          <div class="w-48">
            <select
              [(ngModel)]="selectedProjectId"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">All Projects / Sites</option>
              <option *ngFor="let p of projects()" [ngValue]="p.id">#{{ p.id }} - {{ p.project_name }}</option>
            </select>
          </div>

          <div class="w-44">
            <select
              [(ngModel)]="selectedVendorId"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">All Suppliers</option>
              <option *ngFor="let v of vendors()" [ngValue]="v.id">{{ v.vendor_name }}</option>
            </select>
          </div>

          <div class="w-40">
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All PO Statuses</option>
              <option value="ISSUED">Issued / Pending Delivery</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="FULLY_RECEIVED">Fully Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <button
            *ngIf="searchQuery || selectedProjectId !== null || selectedVendorId !== null || selectedStatus"
            (click)="resetFilters()"
            class="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div class="text-xs text-slate-700 dark:text-slate-300">
          Showing {{ pagedPOs().length }} of {{ filteredPOs().length }} purchase orders
        </div>
      </div>

      <!-- PO Data Table (Strictly NO form under table!) -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <th class="p-3">PO Number & Date</th>
              <th class="p-3">Supplier / Vendor</th>
              <th class="p-3">Project & Destination</th>
              <th class="p-3">Material & Ordered Qty</th>
              <th class="p-3 text-right">Unit Rate (৳)</th>
              <th class="p-3 text-right">Total Amount (৳)</th>
              <th class="p-3 text-center">Receiving Progress</th>
              <th class="p-3 text-center">Approval State</th>
              <th class="p-3 text-center">Status</th>
              <th class="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              *ngFor="let po of pagedPOs()"
              class="hover:bg-amber-500/5 transition-colors text-slate-700 dark:text-slate-200"
            >
              <td class="p-3">
                <div class="font-mono font-bold text-amber-700 dark:text-amber-400">{{ po.po_number }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">{{ po.po_date | date:'dd MMM yyyy' }}</div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ po.vendor_name || ('Vendor #' + po.vendor_id) }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-xs">{{ po.terms_and_conditions || '30 Days Credit' }}</div>
              </td>
              <td class="p-3">
                <div class="font-semibold text-slate-800 dark:text-slate-200">{{ po.project_name || ('Project #' + po.project_id) }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">{{ po.store_name || 'Central Store' }}</div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ po.material_name || ('Material #' + po.material_id) }}</div>
                <div class="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                  {{ po.ordered_quantity | number:'1.2-2' }} {{ po.unit_of_measure }}
                </div>
              </td>
              <td class="p-3 text-right font-mono font-medium">
                ৳{{ po.unit_price | number:'1.2-2' }}
              </td>
              <td class="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                ৳{{ po.total_po_amount | number:'1.2-2' }}
              </td>
              <td class="p-3 text-center">
                <div class="w-28 mx-auto">
                  <div class="flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-0.5">
                    <span>{{ (po.total_received_quantity || 0) | number:'1.0-1' }}</span>
                    <span>/ {{ po.ordered_quantity | number:'1.0-1' }}</span>
                  </div>
                  <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      class="bg-emerald-500 h-full rounded-full transition-all"
                      [style.width.%]="calcReceivePct(po)"
                    ></div>
                  </div>
                </div>
              </td>
              <td class="p-3 text-center">
                <span
                  [ngClass]="{
                    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800': po.approval_status === 'APPROVED',
                    'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800': po.approval_status === 'REJECTED',
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800': po.approval_status !== 'APPROVED' && po.approval_status !== 'REJECTED'
                  }"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full border inline-block"
                >
                  {{ po.approval_status || 'PENDING' }}
                </span>
              </td>
              <td class="p-3 text-center">
                <span
                  [ngClass]="{
                    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800': po.status === 'FULLY_RECEIVED',
                    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800': po.status === 'PARTIALLY_RECEIVED',
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800': po.status === 'ISSUED',
                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700': po.status === 'CANCELLED'
                  }"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                >
                  {{ formatStatus(po.status) }}
                </span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    (click)="openDetailModal(po)"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="View & Inspect Official PO Document"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    *ngIf="po.approval_status !== 'APPROVED'"
                    (click)="openApproveModal(po)"
                    class="px-2 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    title="Approve / Reject PO"
                  >
                    Authorize
                  </button>
                  <button
                    type="button"
                    (click)="openEditModal(po)"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Amend / Revise PO"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    (click)="confirmDelete(po)"
                    [disabled]="(po.total_received_quantity || 0) > 0"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 disabled:opacity-30 transition-colors"
                    title="Cancel PO"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="pagedPOs().length === 0">
              <td colspan="10" class="p-8 text-center text-slate-600 dark:text-slate-400">
                <div class="text-3xl mb-2">📑</div>
                <div class="text-sm font-semibold">No purchase orders found.</div>
                <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">Click "+ Create Direct Purchase Order" above to issue an order.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="flex items-center justify-between mt-4 text-xs text-slate-700 dark:text-slate-300">
        <div>
          Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredPOs().length }} total purchase orders)
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="setPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {{ p }}
          </button>
          <button
            type="button"
            (click)="setPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- Modal 1: Create Direct Purchase Order -->
    <app-modal
      [isOpen]="isAddModalOpen()"
      title="Create Direct Purchase Order (PO)"
      (close)="isAddModalOpen.set(false)"
    >
      <form [formGroup]="poForm" (ngSubmit)="submitDirectPO()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Project Site *</label>
            <select
              formControlName="project_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Project Site...</option>
              <option *ngFor="let p of projects()" [ngValue]="p.id">#{{ p.id }} - {{ p.project_name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Approved Supplier / Vendor *</label>
            <select
              formControlName="vendor_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Vendor...</option>
              <option *ngFor="let v of vendors()" [ngValue]="v.id">{{ v.vendor_name }} ({{ v.vendor_code }})</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Material Catalog Item *</label>
            <select
              formControlName="material_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Material...</option>
              <option *ngFor="let m of materials()" [ngValue]="m.id">{{ m.material_code }} - {{ m.material_name }} ({{ m.unit_of_measure }})</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Destination Site Store / Warehouse *</label>
            <select
              formControlName="destination_store_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Destination Store...</option>
              <option *ngFor="let s of stores()" [ngValue]="s.id">{{ s.store_name }} ({{ s.project_name || 'Central Store' }})</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ordered Quantity *</label>
            <app-custom-input
              formControlName="ordered_quantity"
              type="number"
              placeholder="e.g. 500"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contract Unit Price (৳) *</label>
            <app-custom-input
              formControlName="unit_price"
              type="number"
              placeholder="e.g. 750.00"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Deadline Date *</label>
            <app-custom-input
              formControlName="delivery_deadline"
              type="date"
            ></app-custom-input>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Schedule & Unloading Notes</label>
          <app-custom-textarea
            formControlName="delivery_schedule_notes"
            placeholder="Partial deliveries permitted. Mill test certificate required with each shipment..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contractual Terms & Conditions</label>
          <app-custom-textarea
            formControlName="terms_and_conditions"
            placeholder="Payment 30 days after GRN physical verification and VAT Mushak 6.3 submission..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isAddModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="poForm.invalid"
            label="Authorize & Issue PO"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal 2: Edit / Revise Purchase Order -->
    <app-modal
      [isOpen]="isEditModalOpen()"
      [title]="selectedPO ? 'Revise Purchase Order: ' + selectedPO.po_number : 'Revise PO'"
      (close)="isEditModalOpen.set(false)"
    >
      <form [formGroup]="editForm" (ngSubmit)="submitEditPO()" class="space-y-4">
        <div *ngIf="selectedPO" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
          <div class="flex justify-between font-bold">
            <span class="text-slate-700 dark:text-slate-300">Supplier:</span>
            <span class="text-slate-900 dark:text-slate-100">{{ selectedPO.vendor_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Project Site:</span>
            <span class="text-slate-900 dark:text-slate-100">{{ selectedPO.project_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material Item:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPO.material_name }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ordered Quantity *</label>
            <app-custom-input
              formControlName="ordered_quantity"
              type="number"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Price (৳) *</label>
            <app-custom-input
              formControlName="unit_price"
              type="number"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Deadline *</label>
            <app-custom-input
              formControlName="delivery_deadline"
              type="date"
            ></app-custom-input>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Schedule Notes</label>
          <app-custom-textarea
            formControlName="delivery_schedule_notes"
            rows="2"
          ></app-custom-textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Contractual Terms</label>
          <app-custom-textarea
            formControlName="terms_and_conditions"
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isEditModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="editForm.invalid"
            label="Save Revision"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal 3: Delegated Authority Approval -->
    <app-modal
      [isOpen]="isApproveModalOpen()"
      [title]="selectedPO ? 'Authorize Purchase Order: ' + selectedPO.po_number : 'PO Approval'"
      (close)="isApproveModalOpen.set(false)"
    >
      <div *ngIf="selectedPO" class="space-y-4 text-xs">
        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg space-y-1">
          <div class="flex justify-between font-bold">
            <span class="text-slate-700 dark:text-slate-300">Contract Total Amount:</span>
            <span class="text-amber-800 dark:text-amber-300 font-black text-sm">৳{{ selectedPO.total_po_amount | number:'1.2-2' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Supplier:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPO.vendor_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material & Qty:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPO.ordered_quantity }} {{ selectedPO.unit_of_measure }} ({{ selectedPO.material_name }})</span>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Delegated Officer Endorsement Notes</label>
          <app-custom-textarea
            [(ngModel)]="approvalNotes"
            placeholder="Verified against BOQ headroom and competitive quotations..."
            rows="3"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isApproveModalOpen.set(false)"
            label="Close"
          ></app-custom-button>
          <button
            type="button"
            (click)="submitApproval(false)"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            Reject PO
          </button>
          <button
            type="button"
            (click)="submitApproval(true)"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Approve & Authorize PO
          </button>
        </div>
      </div>
    </app-modal>

    <!-- Modal 4: View & Inspect Official Purchase Order Document -->
    <app-modal
      [isOpen]="isDetailModalOpen()"
      [title]="selectedPO ? 'Purchase Order Document: ' + selectedPO.po_number : 'PO Document'"
      (close)="isDetailModalOpen.set(false)"
    >
      <div *ngIf="selectedPO" class="space-y-4 text-xs">
        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div class="flex justify-between items-start border-b border-slate-200 dark:border-slate-700 pb-3">
            <div>
              <div class="text-base font-black text-amber-700 dark:text-amber-400 font-mono">{{ selectedPO.po_number }}</div>
              <div class="text-[10px] text-slate-600 dark:text-slate-400">PO Date: {{ selectedPO.po_date | date:'dd MMMM yyyy' }}</div>
            </div>
            <div class="text-right">
              <span [ngClass]="selectedPO.approval_status === 'APPROVED' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'" class="px-2.5 py-0.5 rounded-full font-bold text-[10px] border">
                {{ selectedPO.approval_status }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <div class="text-slate-600 dark:text-slate-400 font-semibold">Supplier / Vendor:</div>
              <div class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ selectedPO.vendor_name }}</div>
            </div>
            <div>
              <div class="text-slate-600 dark:text-slate-400 font-semibold">Delivery Destination:</div>
              <div class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPO.project_name }}</div>
              <div class="text-[10px] text-slate-600 dark:text-slate-400">{{ selectedPO.store_name }}</div>
            </div>
          </div>

          <div class="border-t border-slate-200 dark:border-slate-700 pt-3">
            <div class="flex justify-between py-1">
              <span class="text-slate-600 dark:text-slate-400">Material Item:</span>
              <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPO.material_name }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-600 dark:text-slate-400">Ordered Quantity:</span>
              <span class="font-mono font-bold">{{ selectedPO.ordered_quantity | number:'1.2-2' }} {{ selectedPO.unit_of_measure }}</span>
            </div>
            <div class="flex justify-between py-1">
              <span class="text-slate-600 dark:text-slate-400">Contract Rate:</span>
              <span class="font-mono">৳{{ selectedPO.unit_price | number:'1.2-2' }} / {{ selectedPO.unit_of_measure }}</span>
            </div>
            <div class="flex justify-between py-1 border-t border-slate-200 dark:border-slate-700 text-sm font-black">
              <span>Total Contract Value:</span>
              <span class="text-emerald-800 dark:text-emerald-400">৳{{ selectedPO.total_po_amount | number:'1.2-2' }}</span>
            </div>
          </div>

          <div class="border-t border-slate-200 dark:border-slate-700 pt-2 text-[11px] space-y-1">
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Delivery Deadline:</span> {{ selectedPO.delivery_deadline | date:'dd MMMM yyyy' }}</div>
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Authorized Officer:</span> {{ selectedPO.approved_by_name || 'Procurement Head' }}</div>
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Terms & Conditions:</span> {{ selectedPO.terms_and_conditions || 'Standard contract terms' }}</div>
          </div>
        </div>

        <div class="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            (click)="printPODocument(selectedPO)"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 transition-colors"
          >
            🖨️ Print Purchase Order
          </button>
          <app-custom-button
            variant="outline"
            (click)="isDetailModalOpen.set(false)"
            label="Close"
          ></app-custom-button>
        </div>
      </div>
    </app-modal>
  `
})
export class PurchaseOrdersComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  purchaseOrders = signal<PurchaseOrder[]>([]);
  projects = signal<Project[]>([]);
  vendors = signal<Vendor[]>([]);
  materials = signal<MaterialItem[]>([]);
  stores = signal<SiteStore[]>([]);

  // Filter state
  searchQuery = '';
  selectedProjectId: number | null = null;
  selectedVendorId: number | null = null;
  selectedStatus = '';

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Modals
  isAddModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isApproveModalOpen = signal(false);
  isDetailModalOpen = signal(false);

  selectedPO: PurchaseOrder | null = null;
  approvalNotes = '';

  poForm: FormGroup = this.fb.group({
    project_id: [null, [Validators.required]],
    vendor_id: [null, [Validators.required]],
    material_id: [null, [Validators.required]],
    destination_store_id: [null, [Validators.required]],
    ordered_quantity: [null, [Validators.required, Validators.min(0.01)]],
    unit_price: [null, [Validators.required, Validators.min(0.01)]],
    delivery_deadline: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), [Validators.required]],
    delivery_schedule_notes: [''],
    terms_and_conditions: ['Payment 30 days after GRN physical verification and VAT Mushak 6.3 submission.']
  });

  editForm: FormGroup = this.fb.group({
    ordered_quantity: [null, [Validators.required, Validators.min(0.01)]],
    unit_price: [null, [Validators.required, Validators.min(0.01)]],
    delivery_deadline: [null, [Validators.required]],
    delivery_schedule_notes: [''],
    terms_and_conditions: ['']
  });

  // KPIs
  totalPOAmount = computed(() =>
    this.purchaseOrders().reduce((sum, po) => sum + (po.total_po_amount || 0), 0)
  );
  pendingReceiptCount = computed(() =>
    this.purchaseOrders().filter(po => po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED').length
  );
  pendingApprovalCount = computed(() =>
    this.purchaseOrders().filter(po => po.approval_status !== 'APPROVED' && po.approval_status !== 'REJECTED').length
  );

  // Filtered
  filteredPOs = computed(() => {
    let list = this.purchaseOrders();
    if (this.selectedProjectId !== null) {
      list = list.filter(po => po.project_id === this.selectedProjectId);
    }
    if (this.selectedVendorId !== null) {
      list = list.filter(po => po.vendor_id === this.selectedVendorId);
    }
    if (this.selectedStatus) {
      list = list.filter(po => po.status === this.selectedStatus);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(po =>
        po.po_number.toLowerCase().includes(q) ||
        (po.vendor_name && po.vendor_name.toLowerCase().includes(q)) ||
        (po.material_name && po.material_name.toLowerCase().includes(q)) ||
        (po.project_name && po.project_name.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPOs().length / this.pageSize())));

  pagedPOs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPOs().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadPurchaseOrders();
    this.loadProjects();
    this.loadVendors();
    this.loadMaterials();
    this.loadStores();
  }

  loadPurchaseOrders(): void {
    this.procurementService.getPurchaseOrders().subscribe({
      next: (data) => {
        this.purchaseOrders.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load POs:', err)
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || []),
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  loadVendors(): void {
    this.procurementService.getVendors().subscribe({
      next: (data) => this.vendors.set(data || []),
      error: (err) => console.error('Failed to load vendors:', err)
    });
  }

  loadMaterials(): void {
    this.procurementService.getMaterials().subscribe({
      next: (data) => this.materials.set(data || []),
      error: (err) => console.error('Failed to load materials:', err)
    });
  }

  loadStores(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (data) => this.stores.set(data || []),
      error: (err) => console.error('Failed to load stores:', err)
    });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedProjectId = null;
    this.selectedVendorId = null;
    this.selectedStatus = '';
    this.currentPage.set(1);
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

  calcReceivePct(po: PurchaseOrder): number {
    if (!po.ordered_quantity || po.ordered_quantity <= 0) return 0;
    const rcvd = po.total_received_quantity || 0;
    return Math.min(100, Math.round((rcvd / po.ordered_quantity) * 100));
  }

  openAddPOModal(): void {
    this.poForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      vendor_id: this.vendors().length > 0 ? this.vendors()[0].id : null,
      material_id: this.materials().length > 0 ? this.materials()[0].id : null,
      destination_store_id: this.stores().length > 0 ? this.stores()[0].id : null,
      ordered_quantity: 500,
      unit_price: 750,
      delivery_deadline: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      delivery_schedule_notes: 'Supply per agreed batch specifications.',
      terms_and_conditions: 'Payment 30 days after GRN physical verification and VAT Mushak 6.3 submission.'
    });
    this.isAddModalOpen.set(true);
  }

  submitDirectPO(): void {
    if (this.poForm.invalid) return;
    this.procurementService.createDirectPurchaseOrder(this.poForm.value).subscribe({
      next: (res) => {
        alert(`Direct Purchase Order ${res.po_number} issued successfully!`);
        this.isAddModalOpen.set(false);
        this.loadPurchaseOrders();
      },
      error: (err) => alert(err.error?.detail || 'Failed to issue Purchase Order.')
    });
  }

  openEditModal(po: PurchaseOrder): void {
    this.selectedPO = po;
    this.editForm.patchValue({
      ordered_quantity: po.ordered_quantity,
      unit_price: po.unit_price,
      delivery_deadline: po.delivery_deadline ? po.delivery_deadline.substring(0, 10) : '',
      delivery_schedule_notes: po.delivery_schedule_notes || '',
      terms_and_conditions: po.terms_and_conditions || ''
    });
    this.isEditModalOpen.set(true);
  }

  submitEditPO(): void {
    if (!this.selectedPO || this.editForm.invalid) return;
    this.procurementService.updatePurchaseOrder(this.selectedPO.id, this.editForm.value).subscribe({
      next: () => {
        alert('Purchase Order revised successfully!');
        this.isEditModalOpen.set(false);
        this.loadPurchaseOrders();
      },
      error: (err) => alert(err.error?.detail || 'Failed to revise Purchase Order.')
    });
  }

  openApproveModal(po: PurchaseOrder): void {
    this.selectedPO = po;
    this.approvalNotes = '';
    this.isApproveModalOpen.set(true);
  }

  submitApproval(approved: boolean): void {
    if (!this.selectedPO) return;
    this.procurementService.approvePurchaseOrder(this.selectedPO.id, {
      approved,
      notes: this.approvalNotes
    }).subscribe({
      next: (res) => {
        alert(`Purchase Order ${res.po_number} ${approved ? 'Approved' : 'Rejected'}!`);
        this.isApproveModalOpen.set(false);
        this.loadPurchaseOrders();
      },
      error: (err) => alert(err.error?.detail || 'Approval failed.')
    });
  }

  openDetailModal(po: PurchaseOrder): void {
    this.selectedPO = po;
    this.isDetailModalOpen.set(true);
  }

  confirmDelete(po: PurchaseOrder): void {
    if (confirm(`Are you sure you want to cancel Purchase Order ${po.po_number}?`)) {
      this.procurementService.deletePurchaseOrder(po.id).subscribe({
        next: () => {
          alert('Purchase Order cancelled.');
          this.loadPurchaseOrders();
        },
        error: (err) => alert(err.error?.detail || 'Failed to cancel Purchase Order.')
      });
    }
  }

  printPODocument(po: PurchaseOrder): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>PO - ${po.po_number}</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; }
            .meta { font-size: 12px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; font-weight: 600; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">OFFICIAL PURCHASE ORDER</div>
              <div class="meta">Bangladesh Real Estate Developer ERP</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 16px; font-weight: bold;">${po.po_number}</div>
              <div class="meta">Date: ${po.po_date}</div>
            </div>
          </div>
          <p><strong>Supplier:</strong> ${po.vendor_name}</p>
          <p><strong>Project Destination:</strong> ${po.project_name} (${po.store_name})</p>
          <p><strong>Delivery Deadline:</strong> ${po.delivery_deadline}</p>
          <table>
            <thead>
              <tr>
                <th>Material Item</th>
                <th>Ordered Quantity</th>
                <th>Unit Price (৳)</th>
                <th>Total Value (৳)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${po.material_name}</td>
                <td>${po.ordered_quantity} ${po.unit_of_measure}</td>
                <td>৳${po.unit_price}</td>
                <td>৳${po.total_po_amount}</td>
              </tr>
            </tbody>
          </table>
          <div class="total">Total Authorized Amount: ৳${po.total_po_amount}</div>
          <p style="margin-top: 24px; font-size: 11px;"><strong>Terms & Conditions:</strong> ${po.terms_and_conditions || 'Standard Developer Supply Agreement'}</p>
          <p style="margin-top: 36px; font-size: 12px;"><strong>Authorized Signatory:</strong> ________________________</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }
}
