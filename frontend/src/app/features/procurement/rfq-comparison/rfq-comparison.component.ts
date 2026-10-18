import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { ProcurementService } from '../../../core/services/procurement.service';
import {
  ComparativeStatement,
  RFQ,
  PurchaseRequisition,
  Vendor,
  MaterialItem,
  SiteStore
} from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  ModalComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-rfq-comparison',
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
    SearchableSelectComponent
  ],
  template: `
    <app-procurement-nav
      title="9.5 RFQ & Supplier Quotation Comparison"
      subtitle="Request for Quotations, Multi-Vendor Evaluation Matrix, Total Landed Cost & L1 Supplier Recommendation"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadData()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
        <button
          type="button"
          (click)="openIssueRFQModal()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-700 transition-colors"
        >
          <span>📨</span>
          <span>Issue RFQ</span>
        </button>
        <button
          type="button"
          (click)="openAddCSModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors"
        >
          <span>+</span>
          <span>Prepare Comparative Statement (CS)</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Active RFQs Issued</span>
          <span class="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">📨 RFQ</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ rfqs().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Enquiries sent to suppliers</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">CS Evaluation Statements</span>
          <span class="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">📊 Matrix</span>
        </div>
        <div class="text-2xl font-black text-amber-800 dark:text-amber-400 mt-2">{{ comparativeStatements().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Multi-vendor quote comparisons</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Approved POs Generated</span>
          <span class="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">✅ Awarded</span>
        </div>
        <div class="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2">{{ poGeneratedCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Awarded to winning suppliers</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Enlisted Vendors</span>
          <span class="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">🏢 Bidders</span>
        </div>
        <div class="text-2xl font-black text-purple-800 dark:text-purple-400 mt-2">{{ vendors().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Qualified suppliers in registry</p>
      </div>
    </div>

    <!-- View Mode Switcher Tab Bar -->
    <div class="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
      <button
        type="button"
        (click)="activeTab.set('CS')"
        [class.bg-amber-500]="activeTab() === 'CS'"
        [class.text-slate-950]="activeTab() === 'CS'"
        [class.font-bold]="activeTab() === 'CS'"
        [class.text-slate-700]="activeTab() !== 'CS'"
        [class.dark:text-slate-300]="activeTab() !== 'CS'"
        class="px-4 py-2 rounded-lg text-xs transition-colors"
      >
        📊 Comparative Statements (CS) Evaluation Matrices
      </button>
      <button
        type="button"
        (click)="activeTab.set('RFQ')"
        [class.bg-amber-500]="activeTab() === 'RFQ'"
        [class.text-slate-950]="activeTab() === 'RFQ'"
        [class.font-bold]="activeTab() === 'RFQ'"
        [class.text-slate-700]="activeTab() !== 'RFQ'"
        [class.dark:text-slate-300]="activeTab() !== 'RFQ'"
        class="px-4 py-2 rounded-lg text-xs transition-colors"
      >
        📨 Issued RFQs & Supplier Responses
      </button>
    </div>

    <!-- TAB 1: Comparative Statements (CS) Evaluation Matrices -->
    <div *ngIf="activeTab() === 'CS'" class="space-y-6">
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="w-72">
          <app-custom-input
            placeholder="Search CS #, project or material..."
            [(ngModel)]="csSearchQuery"
          ></app-custom-input>
        </div>
        <div class="text-xs text-slate-700 dark:text-slate-300">
          Showing {{ filteredCS().length }} Comparative Evaluation Statements
        </div>
      </div>

      <div *ngFor="let cs of filteredCS()" class="space-y-4">
        <app-card-container
          [title]="'CS #' + cs.cs_number + ' — ' + (cs.material_name || 'Material Evaluation')"
          [subtitle]="'Project: ' + (cs.project_name || 'Site Project') + ' | Quantity Required: ' + (cs.requested_quantity | number:'1.2-2') + ' ' + (cs.unit_of_measure || 'Units') + ' | PR: ' + (cs.pr_number || 'PR-N/A')"
        >
          <div actions class="flex items-center gap-2">
            <span
              [ngClass]="cs.status === 'PO_GENERATED' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
            >
              {{ cs.status }}
            </span>
            <button
              type="button"
              *ngIf="cs.status !== 'PO_GENERATED'"
              (click)="openGeneratePOModal(cs)"
              class="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              Award & Generate PO
            </button>
          </div>

          <!-- Side-by-Side Quotation Comparison Matrix (Strictly matches prompt criteria) -->
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 mt-2">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <th class="p-3">Quoted Supplier / Vendor</th>
                  <th class="p-3">Brand & Grade</th>
                  <th class="p-3 text-right">Quoted Unit Price</th>
                  <th class="p-3 text-right">Transport / Delivery</th>
                  <th class="p-3 text-center">Delivery Lead Time</th>
                  <th class="p-3 text-center">Quality Compliance</th>
                  <th class="p-3 text-center">Payment & Credit Terms</th>
                  <th class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">Total Quoted Amount</th>
                  <th class="p-3 text-center">L1 Evaluation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  *ngFor="let q of cs.quotations"
                  [ngClass]="q.is_recommended ? 'bg-amber-500/10 font-medium' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/50'"
                  class="transition-colors text-slate-700 dark:text-slate-200"
                >
                  <td class="p-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ q.vendor_name }}</div>
                    <div class="text-[10px] text-slate-600 dark:text-slate-400 font-mono">{{ q.vendor_code }}</div>
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    {{ q.brand_grade || 'Standard Mill Certificate' }}
                  </td>
                  <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳{{ q.quoted_unit_rate | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-right font-mono">
                    <span *ngIf="q.transport_cost">৳{{ q.transport_cost | number:'1.0-0' }}</span>
                    <span *ngIf="!q.transport_cost" class="text-emerald-700 dark:text-emerald-400 font-semibold">Included</span>
                  </td>
                  <td class="p-3 text-center">
                    {{ q.lead_time_days }} days
                  </td>
                  <td class="p-3 text-center">
                    <span
                      [ngClass]="q.quality_compliance === 'Failed' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    >
                      {{ q.quality_compliance || 'Pass' }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium">
                      {{ q.payment_terms || (q.credit_days_offered + ' Days Credit') }}
                    </span>
                  </td>
                  <td class="p-3 text-right font-mono font-black text-slate-900 dark:text-slate-100">
                    ৳{{ q.total_quoted_amount | number:'1.2-2' }}
                  </td>
                  <td class="p-3 text-center">
                    <span
                      *ngIf="q.is_recommended"
                      class="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 shadow-xs"
                    >
                      ⭐ RECOMMENDED L1
                    </span>
                    <span
                      *ngIf="!q.is_recommended"
                      class="text-[10px] text-slate-600 dark:text-slate-400"
                    >
                      Higher Landed Cost
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs space-y-1">
            <div class="font-semibold text-slate-800 dark:text-slate-200">Procurement Committee Selection Rationale:</div>
            <p class="text-slate-600 dark:text-slate-300">{{ cs.justification_summary || 'Evaluated based on lowest delivered cost, guaranteed mill quality, and payment terms.' }}</p>
          </div>
        </app-card-container>
      </div>

      <div *ngIf="filteredCS().length === 0" class="p-8 text-center text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div class="text-3xl mb-2">📊</div>
        <div class="text-sm font-semibold">No Comparative Statements Prepared.</div>
        <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">Click "+ Prepare Comparative Statement (CS)" above to evaluate supplier quotes.</div>
      </div>
    </div>

    <!-- TAB 2: Issued RFQs & Supplier Responses -->
    <div *ngIf="activeTab() === 'RFQ'" class="space-y-4">
      <app-card-container
        title="Requests for Quotation (RFQ) Register"
        subtitle="Manage supplier quote enquiries, deadline countdowns and invitation responses"
      >
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                <th class="p-3">RFQ Number</th>
                <th class="p-3">Linked PR</th>
                <th class="p-3">Project Site</th>
                <th class="p-3">Material Enquired</th>
                <th class="p-3 text-right">Enquiry Qty</th>
                <th class="p-3">Submission Deadline</th>
                <th class="p-3">Invited Suppliers</th>
                <th class="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr *ngFor="let rfq of rfqs()" class="hover:bg-amber-500/5 transition-colors text-slate-700 dark:text-slate-200">
                <td class="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                  {{ rfq.rfq_number }}
                  <div class="text-[10px] text-slate-600 dark:text-slate-400 font-sans">{{ rfq.rfq_date | date:'dd MMM yyyy' }}</div>
                </td>
                <td class="p-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {{ rfq.pr_number || ('PR #' + rfq.pr_id) }}
                </td>
                <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                  {{ rfq.project_name || 'Site Project' }}
                </td>
                <td class="p-3">
                  <div class="font-bold text-slate-900 dark:text-slate-100">{{ rfq.material_name || 'Material Item' }}</div>
                  <div class="text-[10px] text-slate-600 dark:text-slate-400">{{ rfq.notes || 'Standard specifications' }}</div>
                </td>
                <td class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                  {{ rfq.requested_quantity | number:'1.2-2' }} {{ rfq.unit_of_measure }}
                </td>
                <td class="p-3 font-mono text-slate-700 dark:text-slate-300">
                  {{ rfq.submission_deadline | date:'dd MMM yyyy' }}
                </td>
                <td class="p-3">
                  <div class="flex flex-wrap gap-1">
                    <span
                      *ngFor="let iv of rfq.invited_vendors"
                      class="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {{ iv.vendor_name || ('Vendor #' + iv.vendor_id) }}
                    </span>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                    {{ rfq.status }}
                  </span>
                </td>
              </tr>

              <tr *ngIf="rfqs().length === 0">
                <td colspan="8" class="p-8 text-center text-slate-600 dark:text-slate-400">
                  <div class="text-3xl mb-2">📨</div>
                  <div class="text-sm font-semibold">No RFQs issued yet.</div>
                  <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">Click "Issue RFQ" above to send quote requests to suppliers.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>

    <!-- Modal 1: Issue New Request for Quotation (RFQ) -->
    <app-modal
      [isOpen]="isIssueRFQModalOpen()"
      title="Issue Request for Quotation (RFQ) to Suppliers"
      (close)="isIssueRFQModalOpen.set(false)"
    >
      <form [formGroup]="rfqForm" (ngSubmit)="submitRFQ()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Purchase Requisition (PR) *</label>
          <select
            formControlName="pr_id"
            class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option [ngValue]="null">Select Purchase Requisition...</option>
            <option *ngFor="let pr of requisitions()" [ngValue]="pr.id">
              {{ pr.pr_number }} — {{ pr.material_name }} ({{ pr.requested_quantity }} {{ pr.unit_of_measure }}) | {{ pr.project_name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quotation Submission Deadline *</label>
          <app-custom-input
            formControlName="submission_deadline"
            type="date"
          ></app-custom-input>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Invited Suppliers / Vendors *</label>
          <div class="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1">
            <label *ngFor="let v of vendors()" class="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                [value]="v.id"
                (change)="onVendorCheck($event, v.id)"
                class="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span>{{ v.vendor_name }} ({{ v.vendor_code }}) — <span class="text-slate-600 dark:text-slate-400">{{ v.trade_category }}</span></span>
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Special Specifications & Terms</label>
          <app-custom-textarea
            formControlName="notes"
            placeholder="Include mill test certificate, 30 days credit terms, delivery at site..."
            rows="3"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isIssueRFQModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="rfqForm.invalid || selectedVendorIds.length === 0"
            label="Send RFQ Invitations"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal 2: Prepare Comparative Statement (CS) -->
    <app-modal
      [isOpen]="isAddCSModalOpen()"
      title="Prepare Vendor Quotation Comparative Statement (CS)"
      (close)="isAddCSModalOpen.set(false)"
    >
      <form [formGroup]="csForm" (ngSubmit)="submitCS()" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Select Purchase Requisition (PR) *</label>
          <select
            formControlName="pr_id"
            class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option [ngValue]="null">Select Requisition...</option>
            <option *ngFor="let pr of requisitions()" [ngValue]="pr.id">
              {{ pr.pr_number }} — {{ pr.material_name }} ({{ pr.requested_quantity }} {{ pr.unit_of_measure }}) | {{ pr.project_name }}
            </option>
          </select>
        </div>

        <!-- Dynamic Multi-Supplier Quotation Rows -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">Competitive Supplier Bids (Min. 2 Required)</span>
            <button
              type="button"
              (click)="addQuotationRow()"
              class="text-xs text-amber-800 dark:text-amber-400 font-bold hover:underline"
            >
              + Add Another Supplier
            </button>
          </div>

          <div formArrayName="quotations" class="space-y-3">
            <div
              *ngFor="let q of quotationsFormArray.controls; let idx = index"
              [formGroupName]="idx"
              class="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Supplier Bid #{{ idx + 1 }}</span>
                <button
                  type="button"
                  *ngIf="quotationsFormArray.length > 2"
                  (click)="removeQuotationRow(idx)"
                  class="text-rose-700 dark:text-rose-400 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Supplier / Vendor *</label>
                  <select
                    formControlName="vendor_id"
                    class="w-full h-9 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option [ngValue]="null">Select Vendor...</option>
                    <option *ngFor="let v of vendors()" [ngValue]="v.id">{{ v.vendor_name }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Quoted Unit Price (৳) *</label>
                  <app-custom-input
                    formControlName="quoted_unit_rate"
                    type="number"
                    placeholder="e.g. 735"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Delivery Lead Time (Days) *</label>
                  <app-custom-input
                    formControlName="lead_time_days"
                    type="number"
                    placeholder="e.g. 3"
                  ></app-custom-input>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Brand / Grade Spec</label>
                  <app-custom-input
                    formControlName="brand_grade"
                    placeholder="e.g. BSRM 500W Grade 72.5"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Payment Terms</label>
                  <app-searchable-select
                    formControlName="payment_terms"
                    placeholder="Select Terms"
                    categoryCode="PAYMENT_TERMS"
                    [allowCreateNew]="true"
                  ></app-searchable-select>
                </div>

                <div>
                  <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">Quality / Spec Compliance</label>
                  <select
                    formControlName="technical_compliance"
                    class="w-full h-9 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
                  >
                    <option value="COMPLIANT">Pass (Full Compliance)</option>
                    <option value="DEVIATION_NOTED">Conditional / Minor Deviation</option>
                    <option value="NON_COMPLIANT">Pending / Failed Spec</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Procurement Committee Recommendation Rationale</label>
          <app-custom-textarea
            formControlName="justification_summary"
            placeholder="Recommended lowest responsive supplier considering prompt delivery schedule and favorable credit terms..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isAddCSModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="csForm.invalid"
            label="Save & Evaluate Matrix"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal 3: Award & Generate Purchase Order (PO) -->
    <app-modal
      [isOpen]="isGeneratePOModalOpen()"
      [title]="selectedCS ? 'Award & Generate Purchase Order: ' + selectedCS.cs_number : 'Generate PO'"
      (close)="isGeneratePOModalOpen.set(false)"
    >
      <form [formGroup]="poGenForm" (ngSubmit)="submitGeneratePO()" class="space-y-4">
        <div *ngIf="selectedCS" class="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg text-xs space-y-1">
          <div class="flex justify-between font-bold">
            <span class="text-slate-700 dark:text-slate-300">Recommended Winner:</span>
            <span class="text-emerald-800 dark:text-emerald-300 font-bold">{{ selectedCS.recommended_vendor_name || ('Vendor #' + selectedCS.recommended_vendor_id) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material & Qty:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedCS.requested_quantity | number:'1.2-2' }} {{ selectedCS.unit_of_measure }} ({{ selectedCS.material_name }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Winning Unit Rate:</span>
            <span class="font-bold text-emerald-800 dark:text-emerald-400">৳{{ selectedCS.lowest_unit_rate | number:'1.2-2' }}</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Destination Site Store / Warehouse *</label>
          <select
            formControlName="destination_store_id"
            class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option [ngValue]="null">Select Delivery Store / Site...</option>
            <option *ngFor="let s of stores()" [ngValue]="s.id">{{ s.store_name }} ({{ s.project_name || 'Central Store' }})</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Deadline Date *</label>
          <app-custom-input
            formControlName="delivery_deadline"
            type="date"
          ></app-custom-input>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Delivery Schedule & Contract Notes</label>
          <app-custom-textarea
            formControlName="delivery_schedule_notes"
            placeholder="Delivery at site gate between 9am-5pm. Unloading by vendor..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isGeneratePOModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="poGenForm.invalid"
            label="Confirm & Issue Purchase Order"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>
  `
})
export class RfqComparisonComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  activeTab = signal<'CS' | 'RFQ'>('CS');

  comparativeStatements = signal<ComparativeStatement[]>([]);
  rfqs = signal<RFQ[]>([]);
  requisitions = signal<PurchaseRequisition[]>([]);
  vendors = signal<Vendor[]>([]);
  stores = signal<SiteStore[]>([]);

  // Search
  csSearchQuery = '';

  // Modals
  isIssueRFQModalOpen = signal(false);
  isAddCSModalOpen = signal(false);
  isGeneratePOModalOpen = signal(false);

  selectedCS: ComparativeStatement | null = null;
  selectedVendorIds: number[] = [];

  rfqForm: FormGroup = this.fb.group({
    pr_id: [null, [Validators.required]],
    submission_deadline: [new Date(Date.now() + 5 * 86400000).toISOString().substring(0, 10), [Validators.required]],
    notes: ['']
  });

  csForm: FormGroup = this.fb.group({
    pr_id: [null, [Validators.required]],
    recommended_vendor_id: [null],
    justification_summary: [''],
    quotations: this.fb.array([])
  });

  poGenForm: FormGroup = this.fb.group({
    destination_store_id: [null, [Validators.required]],
    delivery_deadline: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), [Validators.required]],
    delivery_schedule_notes: ['']
  });

  get quotationsFormArray(): FormArray {
    return this.csForm.get('quotations') as FormArray;
  }

  // KPIs
  poGeneratedCount = computed(() =>
    this.comparativeStatements().filter(cs => cs.status === 'PO_GENERATED').length
  );

  // Filtered CS
  filteredCS = computed(() => {
    let list = this.comparativeStatements();
    if (this.csSearchQuery.trim()) {
      const q = this.csSearchQuery.toLowerCase();
      list = list.filter(cs =>
        cs.cs_number.toLowerCase().includes(q) ||
        (cs.material_name && cs.material_name.toLowerCase().includes(q)) ||
        (cs.project_name && cs.project_name.toLowerCase().includes(q)) ||
        (cs.pr_number && cs.pr_number.toLowerCase().includes(q))
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadCS();
    this.loadRFQs();
    this.loadRequisitions();
    this.loadVendors();
    this.loadStores();
  }

  loadCS(): void {
    this.procurementService.getComparativeStatements().subscribe({
      next: (data) => this.comparativeStatements.set(data || []),
      error: (err) => console.error('Failed to load CS:', err)
    });
  }

  loadRFQs(): void {
    this.procurementService.getRFQs().subscribe({
      next: (data) => this.rfqs.set(data || []),
      error: (err) => console.error('Failed to load RFQs:', err)
    });
  }

  loadRequisitions(): void {
    this.procurementService.getRequisitions().subscribe({
      next: (data) => this.requisitions.set(data || []),
      error: (err) => console.error('Failed to load requisitions:', err)
    });
  }

  loadVendors(): void {
    this.procurementService.getVendors().subscribe({
      next: (data) => this.vendors.set(data || []),
      error: (err) => console.error('Failed to load vendors:', err)
    });
  }

  loadStores(): void {
    this.procurementService.getSiteStores().subscribe({
      next: (data) => this.stores.set(data || []),
      error: (err) => console.error('Failed to load stores:', err)
    });
  }

  // Issue RFQ
  openIssueRFQModal(): void {
    this.selectedVendorIds = [];
    this.rfqForm.reset({
      pr_id: this.requisitions().length > 0 ? this.requisitions()[0].id : null,
      submission_deadline: new Date(Date.now() + 5 * 86400000).toISOString().substring(0, 10),
      notes: ''
    });
    this.isIssueRFQModalOpen.set(true);
  }

  onVendorCheck(e: Event, vendorId: number): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedVendorIds.push(vendorId);
    } else {
      this.selectedVendorIds = this.selectedVendorIds.filter(id => id !== vendorId);
    }
  }

  submitRFQ(): void {
    if (this.rfqForm.invalid || this.selectedVendorIds.length === 0) return;
    const payload = {
      pr_id: this.rfqForm.value.pr_id,
      submission_deadline: this.rfqForm.value.submission_deadline,
      vendor_ids: this.selectedVendorIds,
      notes: this.rfqForm.value.notes
    };
    this.procurementService.createRFQ(payload).subscribe({
      next: () => {
        alert('RFQ successfully issued to selected suppliers!');
        this.isIssueRFQModalOpen.set(false);
        this.loadRFQs();
        this.loadRequisitions();
      },
      error: (err) => alert(err.error?.detail || 'Failed to issue RFQ.')
    });
  }

  // Comparative Statement (CS)
  openAddCSModal(): void {
    this.quotationsFormArray.clear();
    // Pre-populate with 2 vendor bid slots as standard minimum
    this.addQuotationRow();
    this.addQuotationRow();

    this.csForm.reset({
      pr_id: this.requisitions().length > 0 ? this.requisitions()[0].id : null,
      recommended_vendor_id: null,
      justification_summary: ''
    });
    this.isAddCSModalOpen.set(true);
  }

  addQuotationRow(): void {
    const row = this.fb.group({
      vendor_id: [null, [Validators.required]],
      quoted_unit_rate: [null, [Validators.required, Validators.min(0.01)]],
      lead_time_days: [3, [Validators.required, Validators.min(1)]],
      brand_grade: ['BSRM 500W Grade 72.5'],
      payment_terms: ['30 Days Credit'],
      technical_compliance: ['COMPLIANT'],
      remarks: ['']
    });
    this.quotationsFormArray.push(row);
  }

  removeQuotationRow(idx: number): void {
    if (this.quotationsFormArray.length > 2) {
      this.quotationsFormArray.removeAt(idx);
    }
  }

  submitCS(): void {
    if (this.csForm.invalid) return;
    this.procurementService.createComparativeStatement(this.csForm.value).subscribe({
      next: () => {
        alert('Comparative Statement (CS) prepared and evaluated successfully!');
        this.isAddCSModalOpen.set(false);
        this.loadCS();
        this.loadRequisitions();
      },
      error: (err) => alert(err.error?.detail || 'Failed to create Comparative Statement.')
    });
  }

  // Award PO
  openGeneratePOModal(cs: ComparativeStatement): void {
    this.selectedCS = cs;
    this.poGenForm.patchValue({
      destination_store_id: this.stores().length > 0 ? this.stores()[0].id : null,
      delivery_deadline: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      delivery_schedule_notes: 'Delivery per approved CS quote.'
    });
    this.isGeneratePOModalOpen.set(true);
  }

  submitGeneratePO(): void {
    if (!this.selectedCS || this.poGenForm.invalid) return;
    const payload = {
      cs_id: this.selectedCS.id,
      destination_store_id: this.poGenForm.value.destination_store_id,
      delivery_deadline: this.poGenForm.value.delivery_deadline,
      delivery_schedule_notes: this.poGenForm.value.delivery_schedule_notes
    };
    this.procurementService.generatePOFromCS(payload).subscribe({
      next: (po) => {
        alert(`Purchase Order ${po.po_number} generated successfully and awarded to winning supplier!`);
        this.isGeneratePOModalOpen.set(false);
        this.loadCS();
      },
      error: (err) => alert(err.error?.detail || 'Failed to generate PO.')
    });
  }
}
