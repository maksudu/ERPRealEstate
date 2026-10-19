import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import { RABill, RABillItem, WorkOrder, WorkOrderItem } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-ra-bill-form',
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
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16 px-2 sm:px-4">
      <!-- Breadcrumb and Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/ra-bills"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to RA Bills Register"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Measurement-Based RA Billing Engine
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Bill #' + existingBill()?.ra_bill_number : (isViewMode() ? 'View Bill #' + existingBill()?.ra_bill_number : 'New RA Bill Submission') }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isViewMode() ? 'Contractor RA Bill Verification & Audit' : (isEditMode() ? 'Edit Running Account Bill & Measurements' : 'Submit Measurement-Based Contractor Bill') }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/ra-bills"
            class="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors inline-flex items-center gap-1.5"
          >
            <i class="ri-close-line"></i> Cancel
          </a>

          @if (!isViewMode()) {
            <app-custom-button
              variant="primary"
              (clicked)="saveRABill()"
              [disabled]="isSaving() || billForm.invalid"
            >
              <span class="flex items-center gap-1.5 font-semibold text-xs">
                @if (isSaving()) {
                  <i class="ri-loader-4-line animate-spin"></i> Saving Bill...
                } @else {
                  <i class="ri-save-line"></i> {{ isEditMode() ? 'Update RA Bill' : 'Submit for Verification' }}
                }
              </span>
            </app-custom-button>
          } @else {
            <a
              [routerLink]="['/construction/ra-bills/edit', billId()]"
              class="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <i class="ri-edit-line"></i> Edit Quantities
            </a>
          }
        </div>
      </div>

      <!-- Duplicate Bill Warning Alert -->
      @if (duplicateBillWarning()) {
        <div class="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
          <i class="ri-alert-line text-lg shrink-0 mt-0.5"></i>
          <div>
            <h4 class="text-sm font-bold">Duplicate Bill Reference Detected</h4>
            <p class="text-xs mt-0.5">{{ duplicateBillWarning() }}</p>
          </div>
        </div>
      }

      <!-- Main Unified Card Container -->
      <app-card-container
        title="Running Account Bill & Measurement Records"
        subtitle="Progressive measurement certification with automated statutory deductions, advance recoveries, and multi-stage verification"
      >
        <form [formGroup]="billForm" (ngSubmit)="saveRABill()" class="flex flex-col gap-8">
          
          <!-- SECTION 1: Contract & Work Order Association -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-border">
              <i class="ri-file-paper-2-line text-primary text-lg"></i>
              <h3 class="text-sm font-bold uppercase tracking-wider text-foreground">1. Contract & Work Order Association</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Work Order Selector -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">
                  Select Work Order <span class="text-destructive">*</span>
                </label>
                <app-searchable-select
                  [options]="workOrderOptions"
                  [allowCreateNew]="true"
                  placeholder="Select approved work order..."
                  [value]="billForm.get('work_order_id')?.value"
                  (valueChange)="onWorkOrderSelected($event)"
                ></app-searchable-select>
                @if (selectedWorkOrder()) {
                  <p class="text-[11px] text-muted-foreground mt-1">
                    Contract Value: <span class="font-bold text-foreground">BDT {{ selectedWorkOrder()?.original_contract_value | number:'1.2-2' }}</span> | Model: {{ selectedWorkOrder()?.contract_model || 'Item Rate' }}
                  </p>
                }
              </div>

              <!-- Project Reference -->
              <app-custom-input
                label="Project"
                [disabled]="true"
                [value]="selectedProjectName()"
                placeholder="Auto-populated from Work Order"
              ></app-custom-input>

              <!-- Contractor Reference -->
              <app-custom-input
                label="Contractor / Subcontractor"
                [disabled]="true"
                [value]="selectedContractorName()"
                placeholder="Auto-populated from Work Order"
              ></app-custom-input>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <app-custom-input
                label="RA Bill Memo Number"
                formControlName="ra_bill_number"
                placeholder="e.g. RA-2026-0003"
                [required]="true"
                (input)="checkDuplicateBillNumber()"
              ></app-custom-input>

              <app-custom-input
                label="Bill Date"
                type="date"
                formControlName="bill_date"
                [required]="true"
              ></app-custom-input>

              <app-custom-input
                label="Billing Period Start"
                type="date"
                formControlName="billing_period_start"
              ></app-custom-input>

              <app-custom-input
                label="Billing Period End"
                type="date"
                formControlName="billing_period_end"
              ></app-custom-input>
            </div>
          </div>

          <!-- SECTION 2: Measurement-Based Line Items Table -->
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 mb-4 border-b border-border">
              <div class="flex items-center gap-2">
                <i class="ri-ruler-2-line text-primary text-lg"></i>
                <h3 class="text-sm font-bold uppercase tracking-wider text-foreground">
                  2. Progressive Measurement Verification (Cumulative Qty = Previous + Current)
                </h3>
              </div>
              <div class="flex items-center gap-2">
                @if (selectedWorkOrder()?.items?.length) {
                  <button
                    type="button"
                    (click)="populateItemsFromWorkOrder()"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <i class="ri-refresh-line"></i> Re-sync from Work Order BOQ
                  </button>
                }
                <button
                  type="button"
                  (click)="addMeasurementRow()"
                  class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <i class="ri-add-line"></i> Add Item Row
                </button>
              </div>
            </div>

            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-secondary/40 border-b border-border text-muted-foreground font-semibold">
                    <th class="p-3 w-10 text-center">#</th>
                    <th class="p-3 min-w-[140px]">Item Code & Name</th>
                    <th class="p-3 w-16 text-center">Unit</th>
                    <th class="p-3 w-28 text-right">Contract Rate</th>
                    <th class="p-3 w-28 text-right">Prev Certified Qty</th>
                    <th class="p-3 w-28 text-right bg-primary/5">Current Measured Qty</th>
                    <th class="p-3 w-28 text-right font-bold">Cumulative Qty</th>
                    <th class="p-3 w-32 text-right bg-primary/5">Current Amount (BDT)</th>
                    <th class="p-3 w-32 text-right">Cumulative Amount</th>
                    <th class="p-3 min-w-[130px]">Location / Floor</th>
                    <th class="p-3 min-w-[140px]">Sheet Ref / Notes</th>
                    <th class="p-3 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  @for (row of measurementItems(); track $index) {
                    <tr class="hover:bg-secondary/10 transition-colors">
                      <td class="p-3 text-center font-mono text-muted-foreground">{{ $index + 1 }}</td>
                      <td class="p-2">
                        <input
                          type="text"
                          [(ngModel)]="row.item_code"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="Code"
                          class="w-full px-2 py-1 text-xs rounded border border-border bg-card text-foreground font-mono mb-1"
                        />
                        <input
                          type="text"
                          [(ngModel)]="row.item_description"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="Description"
                          class="w-full px-2 py-1 text-xs rounded border border-border bg-card text-foreground"
                        />
                      </td>
                      <td class="p-2 text-center">
                        <input
                          type="text"
                          [(ngModel)]="row.unit_of_measure"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="CFT/MT"
                          class="w-16 px-2 py-1 text-xs text-center rounded border border-border bg-card text-foreground font-mono"
                        />
                      </td>
                      <td class="p-2 text-right">
                        <input
                          type="number"
                          [(ngModel)]="row.contract_rate"
                          [ngModelOptions]="{standalone: true}"
                          (input)="recalculateRow(row)"
                          class="w-24 px-2 py-1 text-xs text-right rounded border border-border bg-card text-foreground font-mono"
                        />
                      </td>
                      <td class="p-2 text-right font-mono text-muted-foreground">
                        <input
                          type="number"
                          [(ngModel)]="row.previous_quantity"
                          [ngModelOptions]="{standalone: true}"
                          (input)="recalculateRow(row)"
                          class="w-24 px-2 py-1 text-xs text-right rounded border border-border bg-card text-foreground font-mono"
                        />
                      </td>
                      <td class="p-2 text-right bg-primary/5">
                        <input
                          type="number"
                          [(ngModel)]="row.current_measured_quantity"
                          [ngModelOptions]="{standalone: true}"
                          (input)="recalculateRow(row)"
                          class="w-24 px-2 py-1 text-xs text-right rounded border border-primary/40 bg-card text-foreground font-mono font-bold focus:ring-1 focus:ring-primary"
                        />
                      </td>
                      <td class="p-3 text-right font-mono font-bold text-foreground">
                        {{ row.cumulative_quantity | number:'1.2-2' }}
                      </td>
                      <td class="p-3 text-right font-mono font-bold text-primary bg-primary/5">
                        {{ row.current_amount | number:'1.2-2' }}
                      </td>
                      <td class="p-3 text-right font-mono text-muted-foreground">
                        {{ row.cumulative_amount | number:'1.2-2' }}
                      </td>
                      <td class="p-2">
                        <input
                          type="text"
                          [(ngModel)]="row.location_floor"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="e.g. Level 5 Slab"
                          class="w-full px-2 py-1 text-xs rounded border border-border bg-card text-foreground"
                        />
                      </td>
                      <td class="p-2">
                        <input
                          type="text"
                          [(ngModel)]="row.measurement_sheet_ref"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="Sheet # / Notes"
                          class="w-full px-2 py-1 text-xs rounded border border-border bg-card text-foreground"
                        />
                      </td>
                      <td class="p-2 text-center">
                        <button
                          type="button"
                          (click)="removeMeasurementRow($index)"
                          class="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                          title="Remove item"
                        >
                          <i class="ri-delete-bin-line"></i>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="12" class="p-8 text-center text-muted-foreground">
                        <i class="ri-draft-line text-3xl mb-2 block text-muted-foreground/50"></i>
                        No measurement items added yet. Click "+ Add Item Row" or select a Work Order to import BOQ items.
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="bg-secondary/60 font-bold border-t-2 border-border text-foreground">
                    <td colspan="7" class="p-3 text-right uppercase tracking-wider text-xs">Total Current Gross Bill Value:</td>
                    <td class="p-3 text-right font-mono text-sm text-primary">BDT {{ totalCalculatedGross() | number:'1.2-2' }}</td>
                    <td class="p-3 text-right font-mono text-xs text-muted-foreground">BDT {{ totalCumulativeAmount() | number:'1.2-2' }}</td>
                    <td colspan="3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- SECTION 3: Statutory Bill Calculation, Recoveries & Tax Adjustments -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-border">
              <i class="ri-calculator-line text-primary text-lg"></i>
              <h3 class="text-sm font-bold uppercase tracking-wider text-foreground">
                3. Statutory Bill Calculation, Recoveries & Tax Adjustments (TDS / VDS)
              </h3>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Left Column: Gross & Recoveries -->
              <div class="space-y-4 p-4 rounded-xl border border-border bg-secondary/10">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Certified Gross & Operational Recoveries</h4>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <app-custom-input
                    label="Current Gross Bill Value (BDT)"
                    type="number"
                    formControlName="gross_work_certified_amount"
                    [required]="true"
                    hint="Auto-synced from measurement items above"
                  ></app-custom-input>

                  <app-custom-input
                    label="Previous Certified Value (BDT)"
                    type="number"
                    formControlName="previous_certified_amount"
                  ></app-custom-input>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <app-custom-input
                    label="Advance Payment Recovery (BDT)"
                    type="number"
                    formControlName="advance_recovery_deducted"
                    hint="Recouped from mobilization advance"
                  ></app-custom-input>

                  <div>
                    <label class="block text-xs font-semibold text-foreground mb-1.5">
                      Retention Money ({{ billForm.get('retention_percent')?.value || 5 }}%)
                    </label>
                    <div class="flex items-center gap-2">
                      <div class="w-24">
                        <app-custom-input
                          label="Percent"
                          type="number"
                          formControlName="retention_percent"
                        ></app-custom-input>
                      </div>
                      <div class="flex-1">
                        <app-custom-input
                          label="Deducted Amount (BDT)"
                          type="number"
                          formControlName="retention_money_deducted"
                        ></app-custom-input>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <app-custom-input
                    label="Material Store Recovery (BDT)"
                    type="number"
                    formControlName="material_store_recovery_amount"
                    hint="Cost of cement/steel issued from store"
                  ></app-custom-input>

                  <app-custom-input
                    label="Contractual Penalty (BDT)"
                    type="number"
                    formControlName="penalty_deduction_amount"
                    hint="Safety NCR or delay liquidated damages"
                  ></app-custom-input>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <app-custom-input
                    label="Other Approved Deductions"
                    type="number"
                    formControlName="other_deductions_amount"
                  ></app-custom-input>

                  <app-custom-input
                    label="Description of Deduction"
                    formControlName="other_deductions_description"
                    placeholder="e.g. Electricity & water consumption"
                  ></app-custom-input>
                </div>
              </div>

              <!-- Right Column: Statutory TDS / VDS & Net Payable Summary -->
              <div class="space-y-4 p-4 rounded-xl border border-border bg-secondary/10 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Statutory Tax & VAT Deductions (BD Regulations)</h4>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-semibold text-foreground mb-1.5">Tax Treatment (TDS)</label>
                      <app-searchable-select
                        categoryCode="RA_BILL_TAX_TREATMENT"
                        [allowCreateNew]="true"
                        [value]="billForm.get('tax_treatment_type')?.value"
                        (valueChange)="onTaxTreatmentChange($event)"
                      ></app-searchable-select>
                    </div>

                    <div class="flex items-center gap-2">
                      <div class="w-24">
                        <app-custom-input
                          label="TDS %"
                          type="number"
                          formControlName="tds_rate"
                          (input)="recalculateDeductions()"
                        ></app-custom-input>
                      </div>
                      <div class="flex-1">
                        <app-custom-input
                          label="TDS Withheld (BDT)"
                          type="number"
                          formControlName="tds_withheld_amount"
                        ></app-custom-input>
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label class="block text-xs font-semibold text-foreground mb-1.5">VAT Treatment (VDS)</label>
                      <app-searchable-select
                        categoryCode="RA_BILL_VAT_TREATMENT"
                        [allowCreateNew]="true"
                        [value]="billForm.get('vat_treatment_type')?.value"
                        (valueChange)="onVatTreatmentChange($event)"
                      ></app-searchable-select>
                    </div>

                    <div class="flex items-center gap-2">
                      <div class="w-24">
                        <app-custom-input
                          label="VDS %"
                          type="number"
                          formControlName="vds_rate"
                          (input)="recalculateDeductions()"
                        ></app-custom-input>
                      </div>
                      <div class="flex-1">
                        <app-custom-input
                          label="VDS Withheld (BDT)"
                          type="number"
                          formControlName="vds_withheld_amount"
                        ></app-custom-input>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3">
                    <app-custom-input
                      label="Previous Payments Made on this Work Order (BDT)"
                      type="number"
                      formControlName="previous_payments_amount"
                      (input)="recalculateDeductions()"
                    ></app-custom-input>
                  </div>
                </div>

                <!-- Final Net Payable Certification Card -->
                <div class="p-4 rounded-xl bg-card border-2 border-primary/30 shadow-xs">
                  <div class="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
                    <span>Gross Certified Work:</span>
                    <span class="font-mono font-bold text-foreground">BDT {{ currentGrossVal() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground py-1">
                    <span>Total Recoveries & Deductions:</span>
                    <span class="font-mono text-destructive">- BDT {{ totalRecoveriesAndDeductions() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs text-muted-foreground py-1">
                    <span>Statutory TDS + VDS Withheld:</span>
                    <span class="font-mono text-destructive">- BDT {{ (currentTdsVal() + currentVdsVal()) | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-sm pt-2 mt-2 border-t border-border font-bold">
                    <span class="text-foreground">Net Certified Payable:</span>
                    <span class="font-mono text-primary text-base">BDT {{ calculatedNetPayable() | number:'1.2-2' }}</span>
                  </div>
                  <div class="flex items-center justify-between text-xs pt-1 text-muted-foreground">
                    <span>Net Balance Payable:</span>
                    <span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">BDT {{ calculatedNetBalance() | number:'1.2-2' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 4: Supporting Verification, Photos & Hold Tracking -->
          <div>
            <div class="flex items-center gap-2 pb-2 mb-4 border-b border-border">
              <i class="ri-attachment-line text-primary text-lg"></i>
              <h3 class="text-sm font-bold uppercase tracking-wider text-foreground">
                4. Measurement Verification Documents & Risk Controls
              </h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <app-custom-input
                label="Supporting Measurement Sheet URLs / References"
                formControlName="measurement_sheet_urls"
                placeholder="e.g. https://cloud.erp.com/jms/2026-04-Level5-rebar.pdf"
                hint="Links to signed site measurement books and leveling records"
              ></app-custom-input>

              <app-custom-input
                label="Site Photographs URLs / Evidence"
                formControlName="site_photo_urls"
                placeholder="e.g. https://cloud.erp.com/photos/site-casting-2026-04-12.jpg"
                hint="Links to pre-pour and post-pour inspection photos"
              ></app-custom-input>
            </div>

            <!-- Hold & Dispute Controls -->
            <div class="mt-4 p-4 rounded-xl border border-border bg-card">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-foreground">Hold & Dispute Quarantine</h4>
                  <p class="text-xs text-muted-foreground">Temporarily freeze bill disbursement in case of site non-conformance or audit query.</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="is_on_hold"
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-secondary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              @if (billForm.get('is_on_hold')?.value) {
                <div class="mt-3">
                  <app-custom-textarea
                    label="Reason for Placing on Hold"
                    formControlName="hold_reason"
                    placeholder="Describe discrepancy, pending cube test, or audit query..."
                    [rows]="2"
                  ></app-custom-textarea>
                </div>
              }
            </div>

            <!-- Retention Release Information -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">Retention Release Status</label>
                <app-searchable-select
                  categoryCode="RA_BILL_PAYMENT_STATUS"
                  [allowCreateNew]="false"
                  [value]="billForm.get('retention_release_status')?.value"
                  (valueChange)="billForm.patchValue({ retention_release_status: $event })"
                ></app-searchable-select>
              </div>

              <app-custom-input
                label="Eligible Release Date"
                type="date"
                formControlName="retention_release_eligible_date"
                hint="Typically at end of Defect Liability Period (DLP)"
              ></app-custom-input>

              <app-custom-input
                label="Eligible Retention Release Amount (BDT)"
                type="number"
                formControlName="retention_release_amount"
              ></app-custom-input>
            </div>

            <div class="mt-4">
              <app-custom-textarea
                label="General Billing Remarks & Audit Notes"
                formControlName="remarks"
                placeholder="Contractual compliance notes, milestone notes..."
                [rows]="3"
              ></app-custom-textarea>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <a
              routerLink="/construction/ra-bills"
              class="px-5 py-2.5 text-xs font-semibold rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-colors"
            >
              Cancel
            </a>
            @if (!isViewMode()) {
              <app-custom-button
                variant="primary"
                (clicked)="saveRABill()"
                [disabled]="isSaving() || billForm.invalid"
              >
                <span class="flex items-center gap-1.5 font-semibold text-xs">
                  <i class="ri-check-line"></i> {{ isEditMode() ? 'Save Changes' : 'Submit Bill for Verification' }}
                </span>
              </app-custom-button>
            }
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class RaBillFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private lookupService = inject(LookupService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  billId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isViewMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  duplicateBillWarning = signal<string | null>(null);

  existingBill = signal<RABill | null>(null);
  workOrders = signal<WorkOrder[]>([]);
  projects = signal<Project[]>([]);
  selectedWorkOrder = signal<WorkOrder | null>(null);

  workOrderOptions: { value: any; label: string }[] = [];
  measurementItems = signal<RABillItem[]>([]);

  billForm!: FormGroup;

  selectedProjectName = computed(() => {
    if (this.selectedWorkOrder()?.project_name) return this.selectedWorkOrder()!.project_name;
    const pid = this.billForm?.get('project_id')?.value;
    if (pid) {
      const p = this.projects().find(x => x.id === pid);
      return p ? p.project_name : '';
    }
    return '';
  });

  selectedContractorName = computed(() => {
    return this.selectedWorkOrder()?.contractor_name || this.existingBill()?.contractor_name || '';
  });

  totalCalculatedGross = computed(() => {
    return this.measurementItems().reduce((sum, item) => sum + (item.current_amount || 0), 0);
  });

  totalCumulativeAmount = computed(() => {
    return this.measurementItems().reduce((sum, item) => sum + (item.cumulative_amount || 0), 0);
  });

  currentGrossVal = computed(() => Number(this.billForm?.get('gross_work_certified_amount')?.value) || 0);
  currentTdsVal = computed(() => Number(this.billForm?.get('tds_withheld_amount')?.value) || 0);
  currentVdsVal = computed(() => Number(this.billForm?.get('vds_withheld_amount')?.value) || 0);

  totalRecoveriesAndDeductions = computed(() => {
    const adv = Number(this.billForm?.get('advance_recovery_deducted')?.value) || 0;
    const ret = Number(this.billForm?.get('retention_money_deducted')?.value) || 0;
    const mat = Number(this.billForm?.get('material_store_recovery_amount')?.value) || 0;
    const pen = Number(this.billForm?.get('penalty_deduction_amount')?.value) || 0;
    const oth = Number(this.billForm?.get('other_deductions_amount')?.value) || 0;
    return adv + ret + mat + pen + oth;
  });

  calculatedNetPayable = computed(() => {
    const gross = this.currentGrossVal();
    const deductions = this.totalRecoveriesAndDeductions();
    const taxes = this.currentTdsVal() + this.currentVdsVal();
    const net = gross - deductions - taxes;
    return net > 0 ? net : 0;
  });

  calculatedNetBalance = computed(() => {
    const net = this.calculatedNetPayable();
    const prevPaid = Number(this.billForm?.get('previous_payments_amount')?.value) || 0;
    const bal = net - prevPaid;
    return bal > 0 ? bal : 0;
  });

  ngOnInit(): void {
    this.initForm();
    this.loadWorkOrders();
    this.loadProjects();

    const idParam = this.route.snapshot.paramMap.get('id');
    const isEdit = this.route.snapshot.url.some(seg => seg.path === 'edit');
    const isView = this.route.snapshot.url.some(seg => seg.path === 'view');

    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.billId.set(id);
        if (isEdit) {
          this.isEditMode.set(true);
        } else if (isView) {
          this.isViewMode.set(true);
        } else {
          this.isEditMode.set(true);
        }
        this.loadBill(id);
      }
    } else {
      // Create mode: auto-suggest bill memo number
      const memoNum = Math.floor(1000 + Math.random() * 9000);
      this.billForm.patchValue({
        ra_bill_number: `RA-2026-${memoNum}`,
        bill_date: new Date().toISOString().split('T')[0]
      });
    }
  }

  private initForm(): void {
    this.billForm = this.fb.group({
      work_order_id: [null, [Validators.required]],
      project_id: [null],
      contractor_id: [null],
      ra_bill_number: ['', [Validators.required]],
      bill_date: [new Date().toISOString().split('T')[0], [Validators.required]],
      billing_period_start: [''],
      billing_period_end: [''],

      previous_certified_amount: [0],
      current_gross_bill_value: [0],
      gross_work_certified_amount: [0, [Validators.required]],
      cumulative_certified_amount: [0],

      advance_recovery_deducted: [0],
      retention_percent: [5],
      retention_money_deducted: [0],
      material_store_recovery_amount: [0],
      penalty_deduction_amount: [0],
      other_deductions_amount: [0],
      other_deductions_description: [''],

      tax_treatment_type: ['TDS_SECTION_52'],
      tds_rate: [5.0],
      tds_withheld_amount: [0],
      vat_treatment_type: ['VDS_STANDARD_7_5'],
      vds_rate: [7.5],
      vds_withheld_amount: [0],

      net_payable_amount: [0],
      previous_payments_amount: [0],
      net_payable_balance: [0],

      workflow_stage: ['CONTRACTOR_SUBMISSION'],
      current_stage_assignee_role: ['SITE_ENGINEER'],
      revision_number: [1],
      rejection_reason: [''],
      review_comments: [''],

      measurement_sheet_urls: [''],
      site_photo_urls: [''],

      is_on_hold: [false],
      hold_reason: [''],
      dispute_id: [null],

      retention_release_status: ['HELD_UNDER_WARRANTY'],
      retention_release_eligible_date: [''],
      retention_release_amount: [0],

      status: ['SUBMITTED'],
      payment_status: ['UNPAID'],
      remarks: ['']
    });

    this.billForm.valueChanges.subscribe(() => {
      this.syncTotalsToForm();
    });
  }

  private loadWorkOrders(): void {
    this.constructionService.getWorkOrdersPaged({ limit: 100 }).subscribe({
      next: (res) => {
        this.workOrders.set(res.items);
        this.workOrderOptions = res.items.map(w => ({
          value: w.id,
          label: `${w.work_order_no} | ${w.contractor_name || 'Contractor'} - ${w.project_name || 'Project'}`
        }));
        if (this.billForm.get('work_order_id')?.value) {
          const match = res.items.find(w => w.id === this.billForm.get('work_order_id')?.value);
          if (match) this.selectedWorkOrder.set(match);
        }
      }
    });
  }

  private loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs),
      error: () => {}
    });
  }

  private loadBill(id: number): void {
    this.constructionService.getRABillById(id).subscribe({
      next: (b) => {
        this.existingBill.set(b);
        this.billForm.patchValue({
          work_order_id: b.work_order_id,
          project_id: b.project_id,
          contractor_id: b.contractor_id,
          ra_bill_number: b.ra_bill_number,
          bill_date: b.bill_date,
          billing_period_start: b.billing_period_start || '',
          billing_period_end: b.billing_period_end || '',

          previous_certified_amount: b.previous_certified_amount || 0,
          current_gross_bill_value: b.current_gross_bill_value || 0,
          gross_work_certified_amount: b.gross_work_certified_amount || 0,
          cumulative_certified_amount: b.cumulative_certified_amount || 0,

          advance_recovery_deducted: b.advance_recovery_deducted || 0,
          retention_percent: b.retention_percent || 5,
          retention_money_deducted: b.retention_money_deducted || 0,
          material_store_recovery_amount: b.material_store_recovery_amount || 0,
          penalty_deduction_amount: b.penalty_deduction_amount || 0,
          other_deductions_amount: b.other_deductions_amount || 0,
          other_deductions_description: b.other_deductions_description || '',

          tax_treatment_type: b.tax_treatment_type || 'TDS_SECTION_52',
          tds_rate: b.tds_rate || 5.0,
          tds_withheld_amount: b.tds_withheld_amount || 0,
          vat_treatment_type: b.vat_treatment_type || 'VDS_STANDARD_7_5',
          vds_rate: b.vds_rate || 7.5,
          vds_withheld_amount: b.vds_withheld_amount || 0,

          net_payable_amount: b.net_payable_amount || 0,
          previous_payments_amount: b.previous_payments_amount || 0,
          net_payable_balance: b.net_payable_balance || 0,

          workflow_stage: b.workflow_stage || 'CONTRACTOR_SUBMISSION',
          current_stage_assignee_role: b.current_stage_assignee_role || 'SITE_ENGINEER',
          revision_number: b.revision_number || 1,
          rejection_reason: b.rejection_reason || '',
          review_comments: b.review_comments || '',

          measurement_sheet_urls: b.measurement_sheet_urls || '',
          site_photo_urls: b.site_photo_urls || '',

          is_on_hold: b.is_on_hold || false,
          hold_reason: b.hold_reason || '',
          dispute_id: b.dispute_id,

          retention_release_status: b.retention_release_status || 'HELD_UNDER_WARRANTY',
          retention_release_eligible_date: b.retention_release_eligible_date || '',
          retention_release_amount: b.retention_release_amount || 0,

          status: b.status || 'SUBMITTED',
          payment_status: b.payment_status || 'UNPAID',
          remarks: b.remarks || ''
        });

        if (b.items && b.items.length > 0) {
          this.measurementItems.set(b.items);
        }

        // Fetch full work order details
        this.constructionService.getWorkOrderById(b.work_order_id).subscribe({
          next: (wo) => this.selectedWorkOrder.set(wo)
        });
      }
    });
  }

  onWorkOrderSelected(workOrderId: any): void {
    const id = Number(workOrderId);
    if (!id) return;
    this.billForm.patchValue({ work_order_id: id });

    this.constructionService.getWorkOrderById(id).subscribe({
      next: (wo) => {
        this.selectedWorkOrder.set(wo);
        this.billForm.patchValue({
          project_id: wo.project_id,
          contractor_id: wo.contractor_id,
          retention_percent: wo.retention_money_percent || 5
        });

        if (!this.measurementItems().length && wo.items && wo.items.length > 0) {
          this.populateItemsFromWorkOrder();
        }
      }
    });
  }

  populateItemsFromWorkOrder(): void {
    const wo = this.selectedWorkOrder();
    if (!wo || !wo.items) return;

    const items: RABillItem[] = wo.items.map(wItem => {
      const prevQty = 0;
      const currQty = 0;
      const cumQty = prevQty + currQty;
      const rate = wItem.approved_unit_rate || (wItem as any).contract_rate || 0;
      return {
        work_order_item_id: wItem.id,
        item_code: wItem.item_code,
        item_description: wItem.item_description,
        unit_of_measure: wItem.unit_of_measure,
        contract_rate: rate,
        contract_quantity: wItem.contract_quantity || 0,
        previous_quantity: prevQty,
        current_measured_quantity: currQty,
        cumulative_quantity: cumQty,
        previous_amount: prevQty * rate,
        current_amount: currQty * rate,
        cumulative_amount: cumQty * rate,
        location_floor: '',
        measurement_sheet_ref: '',
        remarks: ''
      };
    });
    this.measurementItems.set(items);
    this.syncMeasurementTotals();
  }

  addMeasurementRow(): void {
    const newItem: RABillItem = {
      item_code: '',
      item_description: '',
      unit_of_measure: 'CFT',
      contract_rate: 0,
      contract_quantity: 0,
      previous_quantity: 0,
      current_measured_quantity: 0,
      cumulative_quantity: 0,
      previous_amount: 0,
      current_amount: 0,
      cumulative_amount: 0,
      location_floor: '',
      measurement_sheet_ref: ''
    };
    this.measurementItems.update(arr => [...arr, newItem]);
  }

  removeMeasurementRow(index: number): void {
    this.measurementItems.update(arr => arr.filter((_, i) => i !== index));
    this.syncMeasurementTotals();
  }

  recalculateRow(row: RABillItem): void {
    const prev = Number(row.previous_quantity) || 0;
    const curr = Number(row.current_measured_quantity) || 0;
    const rate = Number(row.contract_rate) || 0;

    row.cumulative_quantity = prev + curr;
    row.previous_amount = prev * rate;
    row.current_amount = curr * rate;
    row.cumulative_amount = row.cumulative_quantity * rate;

    this.syncMeasurementTotals();
  }

  private syncMeasurementTotals(): void {
    const calculatedGross = this.totalCalculatedGross();
    if (calculatedGross > 0) {
      this.billForm.patchValue({
        gross_work_certified_amount: calculatedGross,
        current_gross_bill_value: calculatedGross
      }, { emitEvent: false });
    }
    this.recalculateDeductions();
  }

  recalculateDeductions(): void {
    const gross = Number(this.billForm.get('gross_work_certified_amount')?.value) || 0;
    const retPct = Number(this.billForm.get('retention_percent')?.value) || 0;
    const retentionDeducted = Math.round((gross * (retPct / 100)) * 100) / 100;

    const tdsPct = Number(this.billForm.get('tds_rate')?.value) || 0;
    const tdsWithheld = Math.round((gross * (tdsPct / 100)) * 100) / 100;

    const vdsPct = Number(this.billForm.get('vds_rate')?.value) || 0;
    const vdsWithheld = Math.round((gross * (vdsPct / 100)) * 100) / 100;

    this.billForm.patchValue({
      retention_money_deducted: retentionDeducted,
      tds_withheld_amount: tdsWithheld,
      vds_withheld_amount: vdsWithheld
    }, { emitEvent: false });

    this.syncTotalsToForm();
  }

  private syncTotalsToForm(): void {
    const netPayable = this.calculatedNetPayable();
    const netBalance = this.calculatedNetBalance();

    this.billForm.patchValue({
      net_payable_amount: netPayable,
      net_payable_balance: netBalance
    }, { emitEvent: false });
  }

  onTaxTreatmentChange(val: string): void {
    this.billForm.patchValue({ tax_treatment_type: val });
    if (val === 'TDS_SECTION_52') {
      this.billForm.patchValue({ tds_rate: 5.0 });
    } else if (val === 'TDS_SECTION_52_HIGH') {
      this.billForm.patchValue({ tds_rate: 7.5 });
    } else if (val === 'EXEMPT') {
      this.billForm.patchValue({ tds_rate: 0.0 });
    }
    this.recalculateDeductions();
  }

  onVatTreatmentChange(val: string): void {
    this.billForm.patchValue({ vat_treatment_type: val });
    if (val === 'VDS_STANDARD_7_5') {
      this.billForm.patchValue({ vds_rate: 7.5 });
    } else if (val === 'VDS_REDUCED_5_0') {
      this.billForm.patchValue({ vds_rate: 5.0 });
    } else if (val === 'EXEMPT') {
      this.billForm.patchValue({ vds_rate: 0.0 });
    }
    this.recalculateDeductions();
  }

  checkDuplicateBillNumber(): void {
    const billNo = (this.billForm.get('ra_bill_number')?.value || '').trim();
    const woId = this.billForm.get('work_order_id')?.value;
    if (!billNo) {
      this.duplicateBillWarning.set(null);
      return;
    }

    this.constructionService.getRABillsPaged({ search: billNo, limit: 5 }).subscribe({
      next: (res) => {
        const dup = res.items.find(b => b.ra_bill_number.toUpperCase() === billNo.toUpperCase() && b.id !== this.billId());
        if (dup) {
          this.duplicateBillWarning.set(`Bill #${dup.ra_bill_number} already exists on Work Order ${dup.work_order_no || dup.work_order_id}! Please specify a distinct bill sequence.`);
        } else {
          this.duplicateBillWarning.set(null);
        }
      }
    });
  }

  saveRABill(): void {
    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }

    if (this.duplicateBillWarning()) {
      return;
    }

    this.isSaving.set(true);
    const formVal = this.billForm.value;

    const payload: Partial<RABill> = {
      ...formVal,
      work_order_id: Number(formVal.work_order_id),
      project_id: Number(formVal.project_id) || undefined,
      contractor_id: Number(formVal.contractor_id) || undefined,
      gross_work_certified_amount: Number(formVal.gross_work_certified_amount),
      advance_recovery_deducted: Number(formVal.advance_recovery_deducted),
      retention_percent: Number(formVal.retention_percent),
      retention_money_deducted: Number(formVal.retention_money_deducted),
      material_store_recovery_amount: Number(formVal.material_store_recovery_amount),
      penalty_deduction_amount: Number(formVal.penalty_deduction_amount),
      other_deductions_amount: Number(formVal.other_deductions_amount),
      tds_rate: Number(formVal.tds_rate),
      tds_withheld_amount: Number(formVal.tds_withheld_amount),
      vds_rate: Number(formVal.vds_rate),
      vds_withheld_amount: Number(formVal.vds_withheld_amount),
      previous_payments_amount: Number(formVal.previous_payments_amount),
      net_payable_amount: this.calculatedNetPayable(),
      net_payable_balance: this.calculatedNetBalance(),
      items: this.measurementItems()
    };

    if (this.isEditMode() && this.billId()) {
      this.constructionService.updateRABill(this.billId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/ra-bills']);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createRABill(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/ra-bills']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
