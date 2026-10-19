import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import { WorkOrder, WorkOrderItem, WorkOrderMilestone, Subcontractor } from '../../../core/models/construction.model';
import { Project, Tower } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-work-order-form',
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
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-24">
      <!-- Top Navigation & Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/work-orders"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Work Orders"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Work Orders & Contract Management
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Editing Order #' + workOrderId() : 'New Contract Generation' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Modify Approved Work Order & Contract Provisions' : 'Create Approved Work Order from BOQ & Tender' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <app-custom-button
            variant="outline"
            label="Cancel"
            routerLink="/construction/work-orders"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            [label]="isSaving() ? 'Saving...' : (isEditMode() ? 'Update Work Order' : 'Approve & Create Work Order')"
            [icon]="isSaving() ? 'ri-loader-4-line ri-spin' : 'ri-check-double-line'"
            [disabled]="isSaving() || workOrderForm.invalid"
            (click)="submitForm()"
          ></app-custom-button>
        </div>
      </div>

      <!-- Delegated Approval Limit Real-Time Alert Banner -->
      <div
        *ngIf="isExceedingDelegatedLimit()"
        class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
      >
        <i class="ri-alert-fill text-amber-500 text-xl shrink-0 mt-0.5"></i>
        <div class="text-sm">
          <div class="font-bold text-amber-600 dark:text-amber-400">
            Delegated Approval Limit Warning
          </div>
          <p class="text-muted-foreground mt-0.5">
            Total Contract Value (৳ {{ totalComputedValue() | number:'1.2-2' }}) exceeds the delegated authority limit of
            ৳ {{ workOrderForm.get('delegated_approval_limit')?.value | number:'1.2-2' }}. If created, this order will be automatically flagged as
            <strong class="text-amber-600 dark:text-amber-400">EXCEEDS_DELEGATED_LIMIT</strong> requiring Board of Directors / MD escalation.
          </p>
        </div>
      </div>

      <!-- Main Form with Tabs / Sections -->
      <form [formGroup]="workOrderForm" class="flex flex-col gap-8">
        
        <!-- SECTION 1: Contract Identity & Governance -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-file-text-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">1. Work Order Identity & Contract Reference</h2>
                  <p class="text-xs text-muted-foreground">Unique identifier, tender references, and delegated approval thresholds</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <app-custom-input
                  label="Work Order Number *"
                  placeholder="e.g. WO-2026-0004"
                  formControlName="work_order_no"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Contract Reference / Memo *"
                  placeholder="e.g. CNT-BOC-2026-088"
                  formControlName="contract_reference"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Tender Notice Reference"
                  placeholder="e.g. TND-2026-CV-012"
                  formControlName="tender_reference"
                ></app-custom-input>
              </div>

              <div class="md:col-span-2">
                <app-custom-input
                  label="Contract Title / Description *"
                  placeholder="e.g. Structural R.C.C. Works & Concreting for Tower B (Basement to 20th Floor)"
                  formControlName="contract_title"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Delegated Approval Limit (BDT) *"
                  type="number"
                  placeholder="50000000"
                  formControlName="delegated_approval_limit"
                  [required]="true"
                ></app-custom-input>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 2: Project, Tower, WBS & Contractor Allocation -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-building-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">2. Project, Tower, WBS Package & Contractor</h2>
                  <p class="text-xs text-muted-foreground">Allocation to construction project, building structure, and registered contractor</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <app-searchable-select
                  label="Project *"
                  placeholder="Select Project..."
                  [options]="projectOptions()"
                  [allowCreateNew]="true"
                  formControlName="project_id"
                  (ngModelChange)="onProjectSelected($event)"
                ></app-searchable-select>
              </div>

              <div>
                <app-searchable-select
                  label="Building / Tower"
                  placeholder="Select Tower..."
                  [options]="towerOptions()"
                  [allowCreateNew]="true"
                  formControlName="tower_id"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="WBS Work Package Name"
                  placeholder="e.g. WBS-SUB-CIVIL-01"
                  formControlName="wbs_package_name"
                ></app-custom-input>
              </div>

              <div>
                <app-searchable-select
                  label="Contractor / Subcontractor *"
                  placeholder="Select Contractor..."
                  [options]="contractorOptions()"
                  [allowCreateNew]="true"
                  formControlName="contractor_id"
                ></app-searchable-select>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 3: Contract Type, Model & Scope of Work -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-survey-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">3. Contract Model, Trade Type & Scope of Work</h2>
                  <p class="text-xs text-muted-foreground">Governing compensation model (item rate, lump sum, cost plus) and technical specifications</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <app-searchable-select
                  label="Contract Pricing Model *"
                  placeholder="Select Model..."
                  categoryCode="WORK_ORDER_CONTRACT_MODEL"
                  [options]="contractModelOptions"
                  [allowCreateNew]="true"
                  formControlName="contract_model"
                ></app-searchable-select>
              </div>

              <div>
                <app-searchable-select
                  label="Contract Trade Category *"
                  placeholder="Select Trade Category..."
                  categoryCode="CONTRACTOR_TRADE_CATEGORY"
                  [options]="tradeCategoryOptions"
                  [allowCreateNew]="true"
                  formControlName="contract_type"
                ></app-searchable-select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <app-custom-textarea
                  label="Detailed Scope of Work *"
                  placeholder="Define measurable boundaries, inclusions, exclusions, and subcontractor commitments..."
                  [rows]="4"
                  formControlName="scope_of_work"
                  [required]="true"
                ></app-custom-textarea>
              </div>

              <div>
                <app-custom-textarea
                  label="Technical Specifications & Quality Codes"
                  placeholder="Reference BNBC 2020 codes, ASTM testing standards, mix designs, concrete cube strengths..."
                  [rows]="4"
                  formControlName="technical_specifications"
                ></app-custom-textarea>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 4: Approved BOQ Line Items & Rates -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-border gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-list-check-2 text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">4. Approved BOQ Quantities & Unit Rates</h2>
                  <p class="text-xs text-muted-foreground">Itemized bill of quantities, agreed rates, and contracted quantities</p>
                </div>
              </div>

              <app-custom-button
                variant="outline"
                size="sm"
                label="Add BOQ Item"
                icon="ri-add-line"
                (click)="addItemRow()"
              ></app-custom-button>
            </div>

            <!-- Items Repeater Table -->
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/40 text-muted-foreground font-semibold text-xs border-b border-border">
                  <tr>
                    <th class="p-3 w-12 text-center">#</th>
                    <th class="p-3 w-32">Item Code *</th>
                    <th class="p-3">Description *</th>
                    <th class="p-3 w-28">UOM</th>
                    <th class="p-3 w-32 text-right">Contract Qty *</th>
                    <th class="p-3 w-32 text-right">Unit Rate (৳) *</th>
                    <th class="p-3 w-36 text-right">Total Amount (৳)</th>
                    <th class="p-3 w-14 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr *ngFor="let item of itemsArray.controls; let i = index" [formGroup]="$any(item)" class="hover:bg-muted/20">
                    <td class="p-3 text-center text-xs text-muted-foreground font-mono">{{ i + 1 }}</td>
                    <td class="p-3">
                      <input
                        type="text"
                        formControlName="item_code"
                        placeholder="BOQ-01"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <input
                        type="text"
                        formControlName="item_description"
                        placeholder="e.g. Concrete 4000 PSI Cast-in-situ"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <select
                        formControlName="unit_of_measure"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="SFT">SFT</option>
                        <option value="CFT">CFT</option>
                        <option value="RFT">RFT</option>
                        <option value="CUM">CUM</option>
                        <option value="SQM">SQM</option>
                        <option value="MT">MT</option>
                        <option value="KG">KG</option>
                        <option value="NOS">NOS</option>
                        <option value="LS">LS</option>
                      </select>
                    </td>
                    <td class="p-3">
                      <input
                        type="number"
                        formControlName="contract_quantity"
                        (input)="recalculateItemTotal(i)"
                        placeholder="0.00"
                        class="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <input
                        type="number"
                        formControlName="approved_unit_rate"
                        (input)="recalculateItemTotal(i)"
                        placeholder="0.00"
                        class="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3 text-right font-mono font-semibold text-foreground">
                      ৳ {{ (item.get('total_amount')?.value || 0) | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-center">
                      <button
                        type="button"
                        (click)="removeItemRow(i)"
                        class="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                        title="Remove Item"
                      >
                        <i class="ri-delete-bin-line text-base"></i>
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="itemsArray.length === 0">
                    <td colspan="8" class="p-8 text-center text-muted-foreground">
                      <i class="ri-archive-line text-3xl opacity-40 block mb-2"></i>
                      No BOQ line items added yet. Click <strong>"Add BOQ Item"</strong> to insert rate items.
                    </td>
                  </tr>
                </tbody>
                <tfoot class="bg-muted/30 font-bold border-t border-border">
                  <tr>
                    <td colspan="6" class="p-3 text-right text-muted-foreground">
                      Total Calculated Contract Value:
                    </td>
                    <td class="p-3 text-right text-primary font-mono text-base">
                      ৳ {{ totalComputedValue() | number:'1.2-2' }}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 5: Start Date, Completion & Milestones -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-border gap-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-calendar-event-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">5. Timeline, Milestones & Critical Path</h2>
                  <p class="text-xs text-muted-foreground">Contract schedule, stage completion criteria, and milestone disbursement</p>
                </div>
              </div>

              <app-custom-button
                variant="outline"
                size="sm"
                label="Add Milestone"
                icon="ri-add-line"
                (click)="addMilestoneRow()"
              ></app-custom-button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
              <div>
                <app-custom-input
                  label="Contract Start Date *"
                  type="date"
                  formControlName="start_date"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Target Completion Date *"
                  type="date"
                  formControlName="target_completion_date"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Actual Completion Date"
                  type="date"
                  formControlName="actual_completion_date"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Recorded Schedule Delay (Days)"
                  type="number"
                  placeholder="0"
                  formControlName="delay_days"
                ></app-custom-input>
              </div>
            </div>

            <!-- Milestones Repeater Table -->
            <div class="overflow-x-auto rounded-xl border border-border">
              <table class="w-full text-left text-sm">
                <thead class="bg-muted/40 text-muted-foreground font-semibold text-xs border-b border-border">
                  <tr>
                    <th class="p-3 w-12 text-center">#</th>
                    <th class="p-3 w-32">Milestone Code</th>
                    <th class="p-3">Milestone Title & Scope *</th>
                    <th class="p-3 w-36">Target Date *</th>
                    <th class="p-3 w-28 text-right">Weightage (%)</th>
                    <th class="p-3 w-32 text-center">Critical Path?</th>
                    <th class="p-3 w-32">Status</th>
                    <th class="p-3 w-14 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr *ngFor="let ms of milestonesArray.controls; let i = index" [formGroup]="$any(ms)" class="hover:bg-muted/20">
                    <td class="p-3 text-center text-xs text-muted-foreground font-mono">{{ i + 1 }}</td>
                    <td class="p-3">
                      <input
                        type="text"
                        formControlName="milestone_code"
                        placeholder="MS-01"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <input
                        type="text"
                        formControlName="milestone_title"
                        placeholder="e.g. Basement 1 & 2 Retaining Wall Completion"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <input
                        type="date"
                        formControlName="target_date"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3">
                      <input
                        type="number"
                        formControlName="weightage_percent"
                        placeholder="10.0"
                        class="w-full px-2.5 py-1.5 text-xs text-right rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                    <td class="p-3 text-center">
                      <input
                        type="checkbox"
                        formControlName="is_critical"
                        class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                      />
                    </td>
                    <td class="p-3">
                      <select
                        formControlName="status"
                        class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="ACHIEVED">ACHIEVED</option>
                        <option value="DELAYED">DELAYED</option>
                      </select>
                    </td>
                    <td class="p-3 text-center">
                      <button
                        type="button"
                        (click)="removeMilestoneRow(i)"
                        class="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                        title="Remove Milestone"
                      >
                        <i class="ri-delete-bin-line text-base"></i>
                      </button>
                    </td>
                  </tr>

                  <tr *ngIf="milestonesArray.length === 0">
                    <td colspan="8" class="p-8 text-center text-muted-foreground">
                      <i class="ri-flag-line text-3xl opacity-40 block mb-2"></i>
                      No milestones recorded. Click <strong>"Add Milestone"</strong> to schedule delivery stages.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 6: Advance Payment, Retention & Performance Security -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-shield-check-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">6. Advance Payment, Retention & Performance Security</h2>
                  <p class="text-xs text-muted-foreground">Financial guarantees, mobilization advances, retention deductions, and recovery terms</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <app-custom-input
                  label="Advance Payment (%)"
                  type="number"
                  placeholder="10.0"
                  formControlName="advance_payment_percent"
                  (input)="onAdvancePercentChange()"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Advance Payment Amount (৳)"
                  type="number"
                  placeholder="0.00"
                  formControlName="advance_payment_amount"
                ></app-custom-input>
              </div>

              <div>
                <app-searchable-select
                  label="Advance Recovery Condition *"
                  placeholder="Select Rule..."
                  categoryCode="ADVANCE_RECOVERY_RULE"
                  [options]="advanceRecoveryOptions"
                  [allowCreateNew]="true"
                  formControlName="advance_recovery_rule"
                ></app-searchable-select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <app-custom-input
                  label="Retention Percentage (%) *"
                  type="number"
                  placeholder="5.0"
                  formControlName="retention_money_percent"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Defect Liability Period (Months) *"
                  type="number"
                  placeholder="12"
                  formControlName="defect_liability_months"
                  [required]="true"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Retention Release Conditions"
                  placeholder="e.g. 50% on Substantial Completion, 50% after Defect Liability"
                  formControlName="retention_release_conditions"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <app-searchable-select
                  label="Performance Security Instrument"
                  placeholder="Select Security Type..."
                  categoryCode="PERFORMANCE_SECURITY_TYPE"
                  [options]="performanceSecurityOptions"
                  [allowCreateNew]="true"
                  formControlName="performance_security_type"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="Security Amount (BDT)"
                  type="number"
                  placeholder="0.00"
                  formControlName="performance_security_amount"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Performance Security Expiry Date"
                  type="date"
                  formControlName="performance_security_expiry"
                ></app-custom-input>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- SECTION 7: Statutory Taxes, Approvals & Governance -->
        <app-card-container class="w-full">
          <div class="p-6">
            <div class="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <i class="ri-scales-3-line text-lg"></i>
                </div>
                <div>
                  <h2 class="text-lg font-bold text-foreground">7. Statutory Tax/VAT Withholding, Approvals & Signatures</h2>
                  <p class="text-xs text-muted-foreground">NBR TDS/VDS treatment, executive approval status, document attachments, and version notes</p>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-5 mb-5">
              <div>
                <app-custom-input
                  label="TDS Section (Income Tax Ordinance)"
                  placeholder="SECTION_52"
                  formControlName="tds_section"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="TDS Withholding Rate (%)"
                  type="number"
                  placeholder="5.0"
                  formControlName="tds_rate"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="VDS Withholding Rate (%)"
                  type="number"
                  placeholder="7.5"
                  formControlName="vds_rate"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Budget Headroom Alert (%)"
                  type="number"
                  placeholder="95.0"
                  formControlName="budget_headroom_alert_percent"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div>
                <app-searchable-select
                  label="Delegated Approval Level *"
                  placeholder="Select Authority..."
                  categoryCode="WORK_ORDER_APPROVAL_LEVEL"
                  [options]="approvalLevelOptions"
                  [allowCreateNew]="true"
                  formControlName="approval_level"
                ></app-searchable-select>
              </div>

              <div>
                <app-searchable-select
                  label="Approval Status *"
                  placeholder="Select Status..."
                  categoryCode="WORK_ORDER_STATUS"
                  [options]="approvalStatusOptions"
                  [allowCreateNew]="true"
                  formControlName="approval_status"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="Contract Lifecycle Status *"
                  placeholder="ACTIVE"
                  formControlName="status"
                  [required]="true"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <app-custom-input
                  label="Signed Contract Scan / Document URL"
                  placeholder="e.g. https://storage.blueoceans.com/contracts/wo-2026-0001.pdf"
                  formControlName="signed_contract_doc_url"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Amendment & Variation Notes"
                  placeholder="e.g. Initial execution version with revised structural specs"
                  formControlName="amendment_notes"
                ></app-custom-input>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- Bottom Action Bar -->
        <div class="flex items-center justify-end gap-4 py-4">
          <app-custom-button
            variant="outline"
            label="Cancel"
            routerLink="/construction/work-orders"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="lg"
            [label]="isSaving() ? 'Saving...' : (isEditMode() ? 'Save Changes' : 'Confirm & Approve Work Order')"
            [icon]="isSaving() ? 'ri-loader-4-line ri-spin' : 'ri-check-line'"
            [disabled]="isSaving() || workOrderForm.invalid"
            (click)="submitForm()"
          ></app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class WorkOrderFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private lookupService = inject(LookupService);

  isEditMode = signal<boolean>(false);
  workOrderId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Dropdown options
  projectOptions = signal<SelectOption[]>([]);
  towerOptions = signal<SelectOption[]>([]);
  contractorOptions = signal<SelectOption[]>([]);

  contractModelOptions: SelectOption[] = [
    { value: 'ITEM_RATE', label: 'Item Rate / Unit Rate (Standard BOQ)' },
    { value: 'LUMP_SUM', label: 'Lump Sum Fixed Price' },
    { value: 'COST_PLUS_PERCENT', label: 'Cost Plus Percentage' },
    { value: 'PERCENTAGE_RATE', label: 'Percentage Rate Over Schedule' },
    { value: 'TURNKEY_EPC', label: 'Turnkey EPC (Design & Build)' }
  ];

  tradeCategoryOptions: SelectOption[] = [
    { value: 'CIVIL_SUPERSTRUCTURE', label: 'Civil Superstructure & Concrete' },
    { value: 'SHUTTERING_CARPENTRY', label: 'Shuttering, Formwork & Carpentry' },
    { value: 'ROD_BINDING_STEEL', label: 'Rod Binding & Rebar Fabrication' },
    { value: 'PLUMBING_SANITARY', label: 'Sanitary & Internal Plumbing' },
    { value: 'ELECTRICAL_CONDUITING', label: 'Electrical Wiring & Conduiting' },
    { value: 'MASONRY_PLASTER', label: 'Brick Masonry & Plastering' },
    { value: 'TILES_MARBLE', label: 'Tiles, Marble & Stone Works' },
    { value: 'FIRE_PROTECTION', label: 'Firefighting & Suppression Systems' },
    { value: 'HVAC_VENTILATION', label: 'HVAC & Ducting Works' },
    { value: 'ALUMINUM_GLAZING', label: 'Aluminum Fabrication & Curtain Wall' },
    { value: 'INTERIOR_DECOR', label: 'Interior Fit-out & False Ceiling' }
  ];

  advanceRecoveryOptions: SelectOption[] = [
    { value: 'RECOVER_ACROSS_RUNNING_BILLS', label: 'Recover Across All Running (RA) Bills' },
    { value: 'RECOVER_INITIAL_FOUR_BILLS', label: 'Recover in Initial 4 Progressive Bills' },
    { value: 'RECOVER_PROPORTIONAL_PROGRESS', label: 'Recover Proportional to Physical Progress' },
    { value: 'RECOVER_FINAL_BILL', label: 'Recover in Final Bill' }
  ];

  performanceSecurityOptions: SelectOption[] = [
    { value: 'BANK_GUARANTEE', label: 'Bank Guarantee (Unconditional & Irrevocable)' },
    { value: 'SECURITY_DEPOSIT', label: 'Cash Security Deposit' },
    { value: 'PAY_ORDER', label: 'Bank Pay Order' },
    { value: 'POST_DATED_CHEQUE', label: 'Post-Dated Cheque (PDC)' },
    { value: 'INSURANCE_BOND', label: 'Insurance Surety Bond' }
  ];

  approvalLevelOptions: SelectOption[] = [
    { value: 'MANAGING_DIRECTOR', label: 'Managing Director (Above ৳ 5 Crore)' },
    { value: 'PROJECT_DIRECTOR', label: 'Project Director (Up to ৳ 5 Crore)' },
    { value: 'CHIEF_ENGINEER', label: 'Chief Engineer (Up to ৳ 2 Crore)' },
    { value: 'HEAD_PROCUREMENT', label: 'Head of Procurement (Up to ৳ 50 Lakh)' },
    { value: 'SITE_PROJECT_MANAGER', label: 'Site Project Manager (Up to ৳ 10 Lakh)' }
  ];

  approvalStatusOptions: SelectOption[] = [
    { value: 'APPROVED', label: 'Approved (Effective)' },
    { value: 'PENDING_APPROVAL', label: 'Pending Management Approval' },
    { value: 'DRAFT', label: 'Draft / In Preparation' },
    { value: 'AMENDMENT_PENDING', label: 'Amendment Under Review' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'EXCEEDS_DELEGATED_LIMIT', label: 'Exceeds Delegated Authority Limit' }
  ];

  workOrderForm: FormGroup = this.fb.group({
    work_order_no: ['', Validators.required],
    contract_reference: ['', Validators.required],
    tender_reference: [''],
    contract_title: ['', Validators.required],
    project_id: [null, Validators.required],
    tower_id: [null],
    wbs_package_name: [''],
    contractor_id: [null, Validators.required],

    contract_model: ['ITEM_RATE', Validators.required],
    contract_type: ['CIVIL_SUPERSTRUCTURE', Validators.required],
    scope_of_work: ['', Validators.required],
    technical_specifications: [''],

    total_contract_value: [0],
    original_contract_value: [0],
    approved_variations_value: [0],
    revised_contract_value: [0],
    committed_cost: [0],

    start_date: ['', Validators.required],
    target_completion_date: ['', Validators.required],
    actual_completion_date: [''],
    delay_days: [0],

    advance_payment_percent: [10.0],
    advance_payment_amount: [0],
    advance_recovery_rule: ['RECOVER_ACROSS_RUNNING_BILLS'],

    retention_money_percent: [5.0, Validators.required],
    defect_liability_months: [12, Validators.required],
    retention_release_conditions: ['50% on Substantial Handover, 50% after Defect Liability Period'],

    performance_security_type: ['BANK_GUARANTEE'],
    performance_security_amount: [0],
    performance_security_expiry: [''],

    tds_section: ['SECTION_52'],
    tds_rate: [5.0],
    vds_rate: [7.5],
    delegated_approval_limit: [50000000.0, Validators.required],
    budget_headroom_alert_percent: [95.0],

    approval_level: ['PROJECT_DIRECTOR'],
    approval_status: ['APPROVED'],
    status: ['ACTIVE'],
    signed_contract_doc_url: [''],
    amendment_notes: ['Initial contract execution'],

    items: this.fb.array([]),
    milestones: this.fb.array([])
  });

  get itemsArray(): FormArray {
    return this.workOrderForm.get('items') as FormArray;
  }

  get milestonesArray(): FormArray {
    return this.workOrderForm.get('milestones') as FormArray;
  }

  totalComputedValue = computed<number>(() => {
    let sum = 0;
    const items = this.itemsArray?.controls || [];
    for (const ctrl of items) {
      sum += Number(ctrl.get('total_amount')?.value || 0);
    }
    return sum;
  });

  isExceedingDelegatedLimit = computed<boolean>(() => {
    const val = this.totalComputedValue();
    const limit = Number(this.workOrderForm.get('delegated_approval_limit')?.value || 50000000);
    return limit > 0 && val > limit;
  });

  ngOnInit(): void {
    this.loadDropdownData();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode.set(true);
        this.workOrderId.set(+params['id']);
        this.loadWorkOrder(+params['id']);
      } else {
        // New order default boilerplate
        this.generateDefaultWorkOrderNo();
        this.addItemRow();
        this.addMilestoneRow();
      }
    });
  }

  generateDefaultWorkOrderNo(): void {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const yr = new Date().getFullYear();
    this.workOrderForm.patchValue({
      work_order_no: `WO-${yr}-${randomSuffix}`,
      contract_reference: `CNT-${yr}-${randomSuffix}`
    });
  }

  loadDropdownData(): void {
    // 1. Load Projects
    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => {
        const opts = (projects || []).map((p: Project) => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ'})`,
          subLabel: p.site_address || ''
        }));
        this.projectOptions.set(opts);
      },
      error: () => {}
    });

    // 2. Load Contractors
    this.constructionService.getContractors({ limit: 100 }).subscribe({
      next: (contractors: Subcontractor[]) => {
        const opts = (contractors || []).map(c => ({
          value: c.id,
          label: `${c.company_name} [${c.contractor_code}]`,
          subLabel: `Trade: ${c.trade_category} | ${c.primary_phone}`
        }));
        this.contractorOptions.set(opts);
      },
      error: () => {}
    });
  }

  onProjectSelected(projectId: any): void {
    if (!projectId) {
      this.towerOptions.set([]);
      return;
    }
    this.projectService.getTowers(Number(projectId)).subscribe({
      next: (towers: Tower[]) => {
        const opts = (towers || []).map(t => ({
          value: t.id,
          label: t.tower_name || `Tower ${t.id}`
        }));
        this.towerOptions.set(opts);
      },
      error: () => {
        this.towerOptions.set([]);
      }
    });
  }

  loadWorkOrder(id: number): void {
    this.isLoading.set(true);
    this.constructionService.getWorkOrderById(id).subscribe({
      next: (wo: WorkOrder) => {
        this.workOrderForm.patchValue({
          work_order_no: wo.work_order_no,
          contract_reference: wo.contract_reference,
          tender_reference: wo.tender_reference,
          contract_title: wo.contract_title,
          project_id: wo.project_id,
          tower_id: wo.tower_id,
          wbs_package_name: wo.wbs_package_name,
          contractor_id: wo.contractor_id,
          contract_model: wo.contract_model,
          contract_type: wo.contract_type,
          scope_of_work: wo.scope_of_work,
          technical_specifications: wo.technical_specifications,
          total_contract_value: wo.total_contract_value,
          original_contract_value: wo.original_contract_value,
          approved_variations_value: wo.approved_variations_value,
          revised_contract_value: wo.revised_contract_value,
          committed_cost: wo.committed_cost,
          start_date: wo.start_date,
          target_completion_date: wo.target_completion_date,
          actual_completion_date: wo.actual_completion_date,
          delay_days: wo.delay_days,
          advance_payment_percent: wo.advance_payment_percent,
          advance_payment_amount: wo.advance_payment_amount,
          advance_recovery_rule: wo.advance_recovery_rule,
          retention_money_percent: wo.retention_money_percent,
          defect_liability_months: wo.defect_liability_months,
          retention_release_conditions: wo.retention_release_conditions,
          performance_security_type: wo.performance_security_type,
          performance_security_amount: wo.performance_security_amount,
          performance_security_expiry: wo.performance_security_expiry,
          tds_section: wo.tds_section,
          tds_rate: wo.tds_rate,
          vds_rate: wo.vds_rate,
          delegated_approval_limit: wo.delegated_approval_limit,
          budget_headroom_alert_percent: wo.budget_headroom_alert_percent,
          approval_level: wo.approval_level,
          approval_status: wo.approval_status,
          status: wo.status,
          signed_contract_doc_url: wo.signed_contract_doc_url,
          amendment_notes: wo.amendment_notes
        });

        if (wo.project_id) {
          this.onProjectSelected(wo.project_id);
        }

        // Populate items
        this.itemsArray.clear();
        if (wo.items && wo.items.length > 0) {
          for (const itm of wo.items) {
            this.itemsArray.push(this.fb.group({
              id: [itm.id],
              item_code: [itm.item_code, Validators.required],
              item_description: [itm.item_description, Validators.required],
              specification: [itm.specification || ''],
              unit_of_measure: [itm.unit_of_measure || 'SFT'],
              boq_quantity: [itm.boq_quantity || 0],
              contract_quantity: [itm.contract_quantity || 0, Validators.required],
              approved_unit_rate: [itm.approved_unit_rate || 0, Validators.required],
              total_amount: [itm.total_amount || 0],
              executed_quantity: [itm.executed_quantity || 0],
              remaining_quantity: [itm.remaining_quantity || itm.contract_quantity || 0],
              remarks: [itm.remarks || '']
            }));
          }
        }

        // Populate milestones
        this.milestonesArray.clear();
        if (wo.milestones && wo.milestones.length > 0) {
          for (const ms of wo.milestones) {
            this.milestonesArray.push(this.fb.group({
              id: [ms.id],
              milestone_code: [ms.milestone_code || 'MS-01'],
              milestone_title: [ms.milestone_title, Validators.required],
              target_date: [ms.target_date, Validators.required],
              actual_date: [ms.actual_date || ''],
              weightage_percent: [ms.weightage_percent || 10.0],
              milestone_amount: [ms.milestone_amount || 0],
              is_critical: [ms.is_critical || false],
              status: [ms.status || 'PENDING'],
              verification_notes: [ms.verification_notes || '']
            }));
          }
        }

        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  addItemRow(): void {
    const code = `ITEM-${(this.itemsArray.length + 1).toString().padStart(2, '0')}`;
    this.itemsArray.push(this.fb.group({
      item_code: [code, Validators.required],
      item_description: ['', Validators.required],
      specification: [''],
      unit_of_measure: ['SFT'],
      boq_quantity: [0],
      contract_quantity: [1, Validators.required],
      approved_unit_rate: [0, Validators.required],
      total_amount: [0],
      executed_quantity: [0],
      remaining_quantity: [0],
      remarks: ['']
    }));
  }

  removeItemRow(index: number): void {
    this.itemsArray.removeAt(index);
    this.syncTotalValues();
  }

  recalculateItemTotal(index: number): void {
    const row = this.itemsArray.at(index);
    const qty = Number(row.get('contract_quantity')?.value || 0);
    const rate = Number(row.get('approved_unit_rate')?.value || 0);
    const total = qty * rate;
    row.patchValue({ total_amount: total, remaining_quantity: qty }, { emitEvent: false });
    this.syncTotalValues();
  }

  syncTotalValues(): void {
    const total = this.totalComputedValue();
    this.workOrderForm.patchValue({
      total_contract_value: total,
      original_contract_value: total,
      revised_contract_value: total,
      committed_cost: total
    });
    this.onAdvancePercentChange();
  }

  onAdvancePercentChange(): void {
    const pct = Number(this.workOrderForm.get('advance_payment_percent')?.value || 0);
    const total = this.totalComputedValue();
    if (pct > 0 && total > 0) {
      const advAmt = Math.round((total * (pct / 100)) * 100) / 100;
      this.workOrderForm.patchValue({ advance_payment_amount: advAmt }, { emitEvent: false });
    }
  }

  addMilestoneRow(): void {
    const code = `MS-${(this.milestonesArray.length + 1).toString().padStart(2, '0')}`;
    this.milestonesArray.push(this.fb.group({
      milestone_code: [code],
      milestone_title: ['', Validators.required],
      target_date: ['', Validators.required],
      actual_date: [''],
      weightage_percent: [10.0],
      milestone_amount: [0],
      is_critical: [false],
      status: ['PENDING'],
      verification_notes: ['']
    }));
  }

  removeMilestoneRow(index: number): void {
    this.milestonesArray.removeAt(index);
  }

  submitForm(): void {
    if (this.workOrderForm.invalid) {
      this.workOrderForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.workOrderForm.getRawValue();

    // Ensure total computed values
    const total = this.totalComputedValue();
    formVal.total_contract_value = total;
    if (!formVal.original_contract_value || formVal.original_contract_value === 0) {
      formVal.original_contract_value = total;
    }
    formVal.revised_contract_value = total + Number(formVal.approved_variations_value || 0);
    formVal.committed_cost = formVal.revised_contract_value;

    if (this.isEditMode() && this.workOrderId()) {
      this.constructionService.updateWorkOrder(this.workOrderId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/work-orders']);
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
    } else {
      this.constructionService.createWorkOrder(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/work-orders']);
        },
        error: () => {
          this.isSaving.set(false);
        }
      });
    }
  }
}
