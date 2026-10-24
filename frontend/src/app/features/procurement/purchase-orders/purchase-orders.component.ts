import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import { Router } from '@angular/router';
import {
  PurchaseOrder,
  Vendor,
  MaterialItem,
  SiteStore,
  ComparativeStatement
} from '../../../core/models/procurement.model';
import { BOQItem, Project } from '../../../core/models/project.model';
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

interface PurchaseOrderLineDraft {
  material_id: number | null;
  boq_item_id: number | null;
  wbs_node_id: number | null;
  item_specification: string;
  ordered_quantity: number | null;
  unit_price: number | null;
  discount_amount_bdt: number;
  tax_amount_bdt: number;
}

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
    @if (isFormPage) {
    <main class="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><p class="text-xs font-bold uppercase tracking-wider text-amber-700">Procurement · Purchase Orders</p><h1 class="mt-1 text-2xl font-black text-slate-900 dark:text-white">Create Purchase Order</h1><p class="mt-1 text-sm text-slate-500">Direct orders are saved as Pending Approval. Approved quotations can generate POs from the RFQ & CS page.</p></div>
        <button type="button" (click)="router.navigate(['/procurement/rfq-comparison'])" class="px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold">Create from Approved Quotation</button>
      </div>
      <div *ngIf="formError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ formError }}</div>
      <form [formGroup]="poForm" (ngSubmit)="submitDirectPO()" class="rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
        <section>
          <h2 class="text-sm font-bold">Project, Supplier & Delivery</h2>
          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div><label class="block text-xs font-semibold mb-1">Project / Site *</label><app-searchable-select formControlName="project_id" placeholder="Select project..." [options]="projectOptions()"></app-searchable-select></div>
            <div><label class="block text-xs font-semibold mb-1">Approved Supplier *</label><app-searchable-select formControlName="vendor_id" placeholder="Select approved supplier..." [options]="vendorOptions()"></app-searchable-select></div>
            <div><label class="block text-xs font-semibold mb-1">Destination Store *</label><app-searchable-select formControlName="destination_store_id" placeholder="Select project store..." [options]="storeOptions()"></app-searchable-select></div>
          </div>
        </section>
        <section class="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h2 class="text-sm font-bold">Order Type & Item</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            <button *ngFor="let type of orderTypes" type="button" (click)="setOrderType(type.value)" [class.bg-slate-900]="poForm.get('order_type')?.value === type.value" [class.text-white]="poForm.get('order_type')?.value === type.value" class="px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold">{{ type.label }}</button>
          </div>
          <div class="mt-4 space-y-4">
            <div *ngFor="let line of poLines; let i = index" class="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <div class="mb-3 flex items-center justify-between"><span class="text-xs font-bold">Item {{ i + 1 }}</span><button *ngIf="poLines.length > 1" type="button" (click)="removePOLine(i)" class="text-xs font-semibold text-rose-600">Remove</button></div>
              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <div><label class="block text-xs font-semibold mb-1">Material / Service Catalog Item *</label><app-searchable-select [ngModel]="line.material_id" [ngModelOptions]="{standalone:true}" (ngModelChange)="line.material_id=$event" placeholder="Select item..." [options]="materialOptions()"></app-searchable-select></div>
                <div><label class="block text-xs font-semibold mb-1">Approved BOQ Item</label><app-searchable-select [ngModel]="line.boq_item_id" [ngModelOptions]="{standalone:true}" (ngModelChange)="setLineBOQ(line, $event)" placeholder="Select approved BOQ..." [options]="boqOptions()"></app-searchable-select></div>
                <div><label class="block text-xs font-semibold mb-1">Specification / Grade</label><input [(ngModel)]="line.item_specification" [ngModelOptions]="{standalone:true}" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Brand, grade or scope"></div>
                <div><label class="block text-xs font-semibold mb-1">Quantity *</label><input [(ngModel)]="line.ordered_quantity" [ngModelOptions]="{standalone:true}" type="number" min="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></div>
                <div><label class="block text-xs font-semibold mb-1">Unit Price (BDT) *</label><input [(ngModel)]="line.unit_price" [ngModelOptions]="{standalone:true}" type="number" min="0.01" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></div>
                <div><label class="block text-xs font-semibold mb-1">Discount (BDT)</label><input [(ngModel)]="line.discount_amount_bdt" [ngModelOptions]="{standalone:true}" type="number" min="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></div>
                <div><label class="block text-xs font-semibold mb-1">Tax / VAT (BDT)</label><input [(ngModel)]="line.tax_amount_bdt" [ngModelOptions]="{standalone:true}" type="number" min="0" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"></div>
                <div class="flex items-end justify-end text-sm font-semibold">Line total: ৳{{ lineTotal(line) | number:'1.2-2' }}</div>
              </div>
            </div>
            <button type="button" (click)="addPOLine()" class="rounded-lg border border-dashed border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-700">+ Add another item</button>
          </div>
        </section>
        <section class="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h2 class="text-sm font-bold">Commercial Terms</h2>
          <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label class="block text-xs font-semibold mb-1">Credit Days</label><app-custom-input formControlName="payment_terms_days" type="number"></app-custom-input></div>
            <div><label class="block text-xs font-semibold mb-1">Advance (BDT)</label><app-custom-input formControlName="advance_payment_amount_bdt" type="number"></app-custom-input></div>
          </div>
          <div class="mt-3 flex justify-end rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">Estimated PO total: <b class="ml-2">৳{{ directPOTotal() | number:'1.2-2' }}</b></div>
        </section>
        <section class="border-t border-slate-100 pt-5 dark:border-slate-800">
          <h2 class="text-sm font-bold">Schedule & Payment Terms</h2>
          <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block text-xs font-semibold mb-1">Required Delivery Date *</label><app-custom-input formControlName="delivery_deadline" type="date"></app-custom-input></div>
            <div><label class="block text-xs font-semibold mb-1">Existing Payment Terms</label><app-searchable-select formControlName="payment_terms" placeholder="Select quotation payment terms..." [options]="paymentTermOptions()"></app-searchable-select></div>
            <div><label class="block text-xs font-semibold mb-1">Contract Terms</label><app-custom-input formControlName="terms_and_conditions" placeholder="Invoice and delivery conditions"></app-custom-input></div>
            <div class="md:col-span-2"><label class="block text-xs font-semibold mb-1">Delivery Schedule / Notes</label><app-custom-textarea formControlName="delivery_schedule_notes" rows="2"></app-custom-textarea></div>
          </div>
        </section>
        <div class="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button type="button" (click)="cancelNewPO()" class="px-4 py-2 rounded-lg border border-slate-200 text-slate-700">Cancel</button>
          <button type="button" (click)="submitDirectPO(true)" [disabled]="poForm.invalid || !validPOLines() || savingPO" class="px-4 py-2 rounded-lg border border-slate-300 font-semibold text-slate-700 disabled:opacity-50">Save Draft</button>
          <button type="submit" [disabled]="poForm.invalid || !validPOLines() || savingPO" class="px-4 py-2 rounded-lg bg-amber-500 font-bold text-slate-950 disabled:opacity-50">{{ savingPO ? 'Submitting…' : 'Submit PO for Approval' }}</button>
        </div>
      </form>
    </main>
    } @else {
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
          <span>New Purchase Order</span>
        </button>
      </div>
    </app-procurement-nav>

    <div *ngIf="successMessage" class="mx-4 mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{{ successMessage }}</div>

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
      <option value="DRAFT">Draft</option>
      <option value="PENDING_APPROVAL">Pending Approval</option>
      <option value="APPROVED">Approved</option>
      <option value="SENT_TO_SUPPLIER">Sent to Supplier</option>
      <option value="ISSUED">Issued (legacy)</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="FULLY_RECEIVED">Fully Received</option>
      <option value="CLOSED">Closed</option>
      <option value="ON_HOLD">On Hold</option>
      <option value="OVERDUE">Overdue</option>
      <option value="REJECTED">Rejected</option>
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
                <div class="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-xs">{{ po.payment_terms || po.terms_and_conditions || '30 Days Credit' }}</div>
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
                <div *ngIf="(po.line_items?.length || 0) > 1" class="text-[10px] text-indigo-600">+{{ (po.line_items?.length || 1) - 1 }} more items</div>
                <div class="text-[10px] text-slate-500">{{ po.order_type || 'LOCAL' }}<span *ngIf="po.revision_number && po.revision_number > 1"> · Rev {{ po.revision_number }}</span></div>
                <div *ngIf="po.item_specification" class="text-[10px] text-slate-500 truncate max-w-48">{{ po.item_specification }}</div>
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
                  [ngClass]="getPOStatusClass(po.status)"
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
                    *ngIf="po.approval_status === 'PENDING_APPROVAL'"
                    (click)="openApproveModal(po)"
                    class="px-2 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                    title="Approve / Reject PO"
                  >
                    Authorize
                  </button>
                  <button *ngIf="po.status === 'DRAFT'" type="button" (click)="submitDraftPO(po)" class="px-2 py-1 text-[10px] font-bold rounded bg-amber-500 text-slate-950">Submit</button>
                  <button *ngIf="po.approval_status === 'APPROVED' && ['APPROVED','ISSUED','ON_HOLD'].includes(po.status)" type="button" (click)="sendToSupplier(po)" class="px-2 py-1 text-[10px] font-bold rounded bg-indigo-600 text-white">Send</button>
                  <button *ngIf="['SENT_TO_SUPPLIER','ISSUED','PARTIALLY_RECEIVED','OVERDUE'].includes(po.status)" type="button" (click)="updatePOStatus(po, 'ON_HOLD')" class="px-2 py-1 text-[10px] font-bold rounded bg-amber-100 text-amber-800">Hold</button>
                  <button *ngIf="po.status === 'FULLY_RECEIVED'" type="button" (click)="updatePOStatus(po, 'CLOSED')" class="px-2 py-1 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">Close</button>
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
                    [disabled]="(po.total_received_quantity || 0) > 0 || ['CLOSED','FULLY_RECEIVED','REJECTED','CANCELLED'].includes(po.status)"
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
          <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Discount (BDT)</label><app-custom-input formControlName="discount_amount_bdt" type="number"></app-custom-input></div>
          <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax / VAT (BDT)</label><app-custom-input formControlName="tax_amount_bdt" type="number"></app-custom-input></div>
          <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment Credit Days</label><app-custom-input formControlName="payment_terms_days" type="number"></app-custom-input></div>
          <div><label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Payment (BDT)</label><app-custom-input formControlName="advance_payment_amount_bdt" type="number"></app-custom-input></div>
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
            <div *ngIf="selectedPO.line_items?.length" class="mb-3 overflow-x-auto">
              <table class="w-full text-left text-[11px]">
                <thead><tr class="border-b text-slate-500"><th class="py-1">Item</th><th class="py-1">Qty</th><th class="py-1">Rate</th><th class="py-1 text-right">Total</th></tr></thead>
                <tbody><tr *ngFor="let line of selectedPO.line_items" class="border-b border-slate-100"><td class="py-1">{{ line['material_name'] }}<div class="text-slate-500">{{ line['item_specification'] }}</div></td><td class="py-1">{{ line['ordered_quantity'] }}</td><td class="py-1">৳{{ line['unit_price'] | number:'1.2-2' }}</td><td class="py-1 text-right">৳{{ line['line_total_bdt'] | number:'1.2-2' }}</td></tr></tbody>
              </table>
            </div>
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
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Order Type / Revision:</span> {{ selectedPO.order_type || 'LOCAL' }} · Rev {{ selectedPO.revision_number || 1 }}</div>
            <div *ngIf="selectedPO.item_specification"><span class="font-semibold text-slate-700 dark:text-slate-300">Specification:</span> {{ selectedPO.item_specification }}</div>
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Discount / Tax / Advance:</span> ৳{{ selectedPO.discount_amount_bdt || 0 | number:'1.2-2' }} / ৳{{ selectedPO.tax_amount_bdt || 0 | number:'1.2-2' }} / ৳{{ selectedPO.advance_payment_amount_bdt || 0 | number:'1.2-2' }}</div>
            <div><span class="font-semibold text-slate-700 dark:text-slate-300">Payment Terms:</span> {{ selectedPO.payment_terms || ((selectedPO.payment_terms_days || 30) + ' days') }}</div>
            <div *ngIf="selectedPO.boq_item_id"><span class="font-semibold text-slate-700 dark:text-slate-300">BOQ / WBS Link:</span> {{ selectedPO.boq_item_id }} / {{ selectedPO.wbs_node_id || '—' }}</div>
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
    }
  `
})
export class PurchaseOrdersComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  readonly router = inject(Router);
  private fb = inject(FormBuilder);

  purchaseOrders = signal<PurchaseOrder[]>([]);
  projects = signal<Project[]>([]);
  vendors = signal<Vendor[]>([]);
  materials = signal<MaterialItem[]>([]);
  stores = signal<SiteStore[]>([]);
  boqItems = signal<BOQItem[]>([]);
  comparativeStatements = signal<ComparativeStatement[]>([]);
  poLines: PurchaseOrderLineDraft[] = [this.blankPOLine()];
  isFormPage = false;
  formError = '';
  successMessage = '';
  savingPO = false;
  orderTypes = [
    { value: 'LOCAL', label: 'Local Purchase' },
    { value: 'IMPORTED', label: 'Imported' },
    { value: 'EQUIPMENT', label: 'Equipment' },
    { value: 'SERVICE', label: 'Service Order' }
  ];
  projectOptions = computed(() => this.projects().map(p => ({ value: p.id, label: `#${p.id} · ${p.project_name}` })));
  vendorOptions = computed(() => this.vendors().filter(v => v.is_active && v.approval_status === 'APPROVED').map(v => ({ value: v.id, label: `${v.vendor_code} · ${v.vendor_name}` })));
  materialOptions = computed(() => this.materials().filter(m => m.is_active).map(m => ({ value: m.id, label: `${m.material_code} · ${m.material_name} (${m.unit_of_measure})` })));
  storeOptions = computed(() => this.stores().filter(s => s.is_active && (!this.poForm.get('project_id')?.value || s.project_id === Number(this.poForm.get('project_id')?.value))).map(s => ({ value: s.id, label: `${s.store_name}${s.project_name ? ' · ' + s.project_name : ''}` })));
  boqOptions = computed(() => this.boqItems().filter(b => ['APPROVED_CONTRACT_BOQ', 'APPROVED', 'CONTRACT_APPROVED'].includes((b.stage || '').toUpperCase())).map(b => ({ value: b.id, label: `${b.item_code ? b.item_code + ' · ' : ''}${b.item_description}` })));
  paymentTermOptions = computed(() => [...new Set(this.comparativeStatements().flatMap(cs => cs.quotations || []).map(q => q.payment_terms?.trim() || `${q.credit_days_offered} Days Credit`).filter(Boolean))].map(term => ({ value: term, label: term })));

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
    material_id: [null],
    destination_store_id: [null, [Validators.required]],
    boq_item_id: [null],
    wbs_node_id: [null],
    order_type: ['LOCAL', [Validators.required]],
    item_specification: [''],
    ordered_quantity: [null],
    unit_price: [null],
    discount_amount_bdt: [0],
    tax_amount_bdt: [0],
    payment_terms: [''],
    payment_terms_days: [30, [Validators.min(0)]],
    advance_payment_amount_bdt: [0, [Validators.min(0)]],
    delivery_deadline: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), [Validators.required]],
    delivery_schedule_notes: [''],
    terms_and_conditions: ['Payment 30 days after GRN physical verification and VAT Mushak 6.3 submission.']
  });

  editForm: FormGroup = this.fb.group({
    ordered_quantity: [null, [Validators.required, Validators.min(0.01)]],
    unit_price: [null, [Validators.required, Validators.min(0.01)]],
    discount_amount_bdt: [0, [Validators.min(0)]],
    tax_amount_bdt: [0, [Validators.min(0)]],
    payment_terms_days: [30, [Validators.min(0)]],
    advance_payment_amount_bdt: [0, [Validators.min(0)]],
    item_specification: [''],
    delivery_deadline: [null, [Validators.required]],
    delivery_schedule_notes: [''],
    terms_and_conditions: ['']
  });

  // KPIs
  totalPOAmount = computed(() =>
    this.purchaseOrders().reduce((sum, po) => sum + (po.total_po_amount || 0), 0)
  );
  pendingReceiptCount = computed(() =>
    this.purchaseOrders().filter(po => ['ISSUED', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED', 'OVERDUE'].includes(po.status)).length
  );
  pendingApprovalCount = computed(() =>
    this.purchaseOrders().filter(po => !['APPROVED', 'REJECTED', 'DRAFT'].includes(po.approval_status)).length
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
    this.isFormPage = this.router.url.endsWith('/purchase-orders/new');
    this.successMessage = history.state?.procurementNotice || '';
    this.loadPurchaseOrders();
    this.loadProjects();
    this.loadVendors();
    this.loadMaterials();
    this.loadStores();
    this.procurementService.getComparativeStatements().subscribe({
      next: rows => this.comparativeStatements.set(rows || []),
      error: () => this.comparativeStatements.set([])
    });
    this.poForm.get('payment_terms')?.valueChanges.subscribe(term => {
      const quote = this.comparativeStatements().flatMap(cs => cs.quotations || []).find(q => (q.payment_terms?.trim() || `${q.credit_days_offered} Days Credit`) === term);
      if (quote) this.poForm.patchValue({ payment_terms_days: quote.credit_days_offered }, { emitEvent: false });
    });
    this.poForm.get('project_id')?.valueChanges.subscribe(projectId => {
      this.poForm.patchValue({ destination_store_id: null }, { emitEvent: false });
      this.poLines = this.poLines.map(line => ({ ...line, boq_item_id: null, wbs_node_id: null }));
      this.loadStores(Number(projectId) || undefined);
      this.loadBOQItems(Number(projectId) || undefined);
    });
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

  loadStores(projectId?: number): void {
    this.procurementService.getSiteStores(projectId ? { project_id: projectId } : undefined).subscribe({
      next: (data) => this.stores.set(data || []),
      error: (err) => console.error('Failed to load stores:', err)
    });
  }

  loadBOQItems(projectId?: number): void {
    if (!projectId) { this.boqItems.set([]); return; }
    this.projectService.getBOQItems({ project_id: projectId }).subscribe({ next: rows => this.boqItems.set(rows || []), error: () => this.boqItems.set([]) });
  }

  setOrderType(type: string): void { this.poForm.patchValue({ order_type: type }); }

  private blankPOLine(): PurchaseOrderLineDraft {
    return { material_id: null, boq_item_id: null, wbs_node_id: null, item_specification: '', ordered_quantity: null, unit_price: null, discount_amount_bdt: 0, tax_amount_bdt: 0 };
  }

  addPOLine(): void { this.poLines = [...this.poLines, this.blankPOLine()]; }

  removePOLine(index: number): void {
    if (this.poLines.length > 1) this.poLines = this.poLines.filter((_, i) => i !== index);
  }

  setLineBOQ(line: PurchaseOrderLineDraft, boqId: number | null): void {
    line.boq_item_id = boqId ? Number(boqId) : null;
    line.wbs_node_id = this.boqItems().find(item => item.id === line.boq_item_id)?.wbs_node_id || null;
  }

  lineTotal(line: PurchaseOrderLineDraft): number {
    return Math.max(0, Number(line.ordered_quantity || 0) * Number(line.unit_price || 0) - Number(line.discount_amount_bdt || 0) + Number(line.tax_amount_bdt || 0));
  }

  validPOLines(): boolean {
    return this.poLines.length > 0 && this.poLines.every(line => !!line.material_id && Number(line.ordered_quantity) > 0 && Number(line.unit_price) > 0 && this.lineTotal(line) > 0);
  }

  directPOTotal(): number {
    return this.poLines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  cancelNewPO(): void { this.router.navigate(['/procurement/purchase-orders']); }

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
    this.router.navigate(['/procurement/purchase-orders/new']);
  }

  submitDirectPO(saveAsDraft = false): void {
    if (this.poForm.invalid || !this.validPOLines()) return;
    this.formError = '';
    this.savingPO = true;
    const first = this.poLines[0];
    const payload = {
      ...this.poForm.value,
      material_id: first.material_id,
      boq_item_id: first.boq_item_id,
      wbs_node_id: first.wbs_node_id,
      item_specification: first.item_specification,
      ordered_quantity: first.ordered_quantity,
      unit_price: first.unit_price,
      discount_amount_bdt: first.discount_amount_bdt,
      tax_amount_bdt: first.tax_amount_bdt,
      line_items: this.poLines,
      save_as_draft: saveAsDraft
    };
    this.procurementService.createDirectPurchaseOrder(payload).subscribe({
      next: (res) => {
        this.savingPO = false;
        this.router.navigate(['/procurement/purchase-orders'], { state: { procurementNotice: saveAsDraft ? `Purchase Order ${res.po_number} saved as draft.` : `Purchase Order ${res.po_number} submitted for approval.` } });
      },
      error: (err) => { this.savingPO = false; this.formError = err.error?.detail || 'Failed to submit Purchase Order for approval.'; }
    });
  }

  openEditModal(po: PurchaseOrder): void {
    if (['CANCELLED', 'REJECTED', 'CLOSED', 'FULLY_RECEIVED'].includes(po.status)) return;
    this.selectedPO = po;
    this.editForm.patchValue({
      ordered_quantity: po.ordered_quantity,
      unit_price: po.unit_price,
      discount_amount_bdt: po.discount_amount_bdt || 0,
      tax_amount_bdt: po.tax_amount_bdt || 0,
      payment_terms_days: po.payment_terms_days || 30,
      advance_payment_amount_bdt: po.advance_payment_amount_bdt || 0,
      item_specification: po.item_specification || '',
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

  sendToSupplier(po: PurchaseOrder): void {
    this.procurementService.sendPurchaseOrderToSupplier(po.id).subscribe({
      next: () => this.loadPurchaseOrders(),
      error: err => alert(err.error?.detail || 'Could not send purchase order to supplier.')
    });
  }

  submitDraftPO(po: PurchaseOrder): void {
    this.procurementService.submitDraftPurchaseOrder(po.id).subscribe({
      next: () => this.loadPurchaseOrders(),
      error: err => alert(err.error?.detail || 'Could not submit draft purchase order.')
    });
  }

  updatePOStatus(po: PurchaseOrder, status: string): void {
    this.procurementService.updatePurchaseOrder(po.id, { status }).subscribe({
      next: () => this.loadPurchaseOrders(),
      error: err => alert(err.error?.detail || `Could not update PO status to ${status}.`)
    });
  }

  getPOStatusClass(status: string): string {
    switch (status) {
      case 'FULLY_RECEIVED': case 'CLOSED': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'PARTIALLY_RECEIVED': case 'SENT_TO_SUPPLIER': case 'ISSUED': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'OVERDUE': case 'ON_HOLD': case 'PENDING_APPROVAL': case 'APPROVED': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'REJECTED': case 'CANCELLED': return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  }

  submitApproval(approved: boolean): void {
    if (!this.selectedPO) return;
    this.procurementService.approvePurchaseOrder(this.selectedPO.id, {
      approved,
      notes: this.approvalNotes
    }).subscribe({
      next: (res) => {
        this.isApproveModalOpen.set(false);
        alert(`Purchase Order ${res.po_number} ${approved ? 'approved. Send it to the supplier when ready.' : 'rejected.'}`);
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
