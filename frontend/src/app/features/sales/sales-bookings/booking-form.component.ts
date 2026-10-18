import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { CrmService } from '../../../core/services/crm.service';
import { Booking, BookingJointBuyer, BookingNominee } from '../../../core/models/sales.model';
import { Project } from '../../../core/models/project.model';
import { Unit } from '../../../core/models/inventory.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-booking-form',
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
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      <!-- Breadcrumb & Standalone Header Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/bookings"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Sales Bookings"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.2 · Booking & Reservation Management
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Booking #' + bookingId() : 'New Sales Execution' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Apartment Booking & Pricing' : 'New Apartment Reservation & Booking' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/bookings"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary rounded-xl border border-border transition-colors"
          >
            Cancel & Return
          </a>
          <app-custom-button
            variant="primary"
            (clicked)="submitForm()"
            [disabled]="bookingForm.invalid || isSubmitting()"
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ isSubmitting() ? 'Saving...' : (isEditMode() ? 'Update Booking' : 'Execute Booking & Allotment') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- 10-Stage Workflow Stepper Banner -->
      <div class="bg-card border border-border rounded-xl p-4 shadow-xs overflow-x-auto">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Complete Booking-to-Handover Workflow Stages
        </p>
        <div class="flex items-center gap-2 min-w-[700px]">
          @for (stage of workflowStages; track stage.id) {
            <div 
              class="flex-1 p-2 rounded-lg border text-center transition-all cursor-pointer"
              [ngClass]="{
                'bg-primary/10 border-primary text-primary font-bold': bookingForm.get('workflow_stage')?.value === stage.id,
                'bg-secondary/40 border-border text-muted-foreground hover:bg-secondary': bookingForm.get('workflow_stage')?.value !== stage.id
              }"
              (click)="bookingForm.patchValue({ workflow_stage: stage.id })"
            >
              <span class="text-[10px] block opacity-75 font-mono">{{ stage.code }}</span>
              <span class="text-xs truncate block">{{ stage.name }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Form Container -->
      <form [formGroup]="bookingForm" (ngSubmit)="submitForm()" class="flex flex-col gap-6">

        <!-- Card 1: Property Inventory Unit & Sales Representative Selection -->
        <app-card-container
          title="01. Property Inventory & Reservation Details"
          subtitle="Real-time unit availability lookup from Property Inventory module (Spec 5.2)"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Project Selection -->
            <app-searchable-select
              label="Select Real Estate Project *"
              [options]="projectOptions()"
              placeholder="Search project..."
              formControlName="project_id"
              (selectionChange)="onProjectChange($event)"
            />

            <!-- Allotted Apartment Unit -->
            <app-searchable-select
              label="Apartment Unit *"
              [options]="unitOptions()"
              placeholder="Search available unit..."
              formControlName="unit_id"
              (selectionChange)="onUnitChange($event)"
            />

            <!-- Assigned Sales Representative -->
            <app-custom-input
              label="Assigned Sales Representative"
              placeholder="e.g. Tanvir Ahmed (Senior Sales Officer)"
              formControlName="sales_rep_name"
            />
          </div>

          <!-- Unit Info Strip if selected -->
          @if (selectedUnit()) {
            <div class="mt-4 p-3 bg-secondary/30 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span class="text-muted-foreground block font-medium">Selected Unit</span>
                <span class="text-sm font-bold text-foreground">
                  Unit {{ selectedUnit()?.unit_number }} · Floor {{ selectedUnit()?.floor_number }} · {{ selectedUnit()?.unit_type_id || 'Residential' }}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Unit Area</span>
                <span class="font-bold text-foreground">{{ selectedUnit()?.gross_saleable_area_sqft || selectedUnit()?.net_carpet_area_sqft || 'N/A' }} Sq. Ft.</span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Inventory Status</span>
                <span class="px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {{ selectedUnit()?.status_id }}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Base Catalog List Price</span>
                <span class="text-sm font-mono font-bold text-primary">
                  BDT {{ getBaseUnitPrice() | number:'1.0-0' }}
                </span>
              </div>
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <app-custom-input
              label="Booking / Reservation Date *"
              type="date"
              formControlName="booking_date"
            />

            <app-custom-input
              label="Reservation Expiry Date (Time-Limited Hold)"
              type="date"
              formControlName="reservation_expiry_date"
              hint="System auto-releases hold after expiration"
            />

            <app-searchable-select
              label="Initial Status *"
              [options]="bookingStatusOptions"
              formControlName="status"
            />
          </div>
        </app-card-container>

        <!-- Card 2: Primary Buyer & Customer KYC -->
        <app-card-container
          title="02. Primary Buyer KYC & Identification"
          subtitle="Confirm customer profile and purchase requirements under Bangladesh Real Estate Act (Spec 5.3)"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-searchable-select
              label="Select Primary Customer *"
              [options]="customerOptions()"
              placeholder="Search buyer by Name, Code, or NID..."
              formControlName="primary_customer_id"
              (selectionChange)="onCustomerChange($event)"
            />

            <div class="flex items-end">
              <a
                routerLink="/crm/customers"
                target="_blank"
                class="px-4 py-2.5 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-primary border border-border inline-flex items-center gap-1.5 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
                Manage / Verify Customer KYC Records
              </a>
            </div>
          </div>

          @if (selectedCustomer()) {
            <div class="mt-4 p-4 bg-secondary/30 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span class="text-muted-foreground block font-medium">Customer Code</span>
                <span class="font-mono font-bold text-foreground">{{ selectedCustomer()?.customer_code }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Full Legal Name</span>
                <span class="font-bold text-foreground">{{ selectedCustomer()?.full_name_en }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Contact Phone</span>
                <span class="text-foreground">📞 {{ selectedCustomer()?.primary_phone }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">National ID / Passport</span>
                <span class="font-mono text-foreground">{{ selectedCustomer()?.nid_number || 'N/A' }}</span>
              </div>
            </div>
          }
        </app-card-container>

        <!-- Card 3: Transparent Pricing Breakdown & Multi-Tier Discount Governance -->
        <app-card-container
          title="03. Transparent Pricing Breakdown & Multi-Tier Discount Matrix"
          subtitle="Full commercial pricing under REHAB statutory standards (Spec 5.1 & 5.2)"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Parking Slot Number"
              placeholder="e.g. B1-P14"
              formControlName="parking_slot_number"
            />

            <app-custom-input
              label="Parking Charge (BDT)"
              type="number"
              placeholder="350000"
              formControlName="parking_charge"
            />

            <app-custom-input
              label="Utility Charges (BDT)"
              type="number"
              placeholder="250000"
              formControlName="utility_charge"
              hint="WASA, DESCO, Titas Gas connection"
            />

            <app-custom-input
              label="Doc & Legal Stamp Fee (BDT)"
              type="number"
              placeholder="50000"
              formControlName="documentation_charge"
              hint="Legal vetting & deed stamp charge"
            />
          </div>

          <!-- Live Pricing Calculation Ribbon -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mt-4 bg-secondary/40 rounded-xl border border-border text-center">
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Gross Contract Value</span>
              <span class="text-lg font-bold font-mono text-foreground">BDT {{ getGrossContractValue() | number:'1.0-0' }}</span>
              <span class="text-[11px] text-muted-foreground block">Base + Parking + Utility + Docs</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Discount Amount & %</span>
              <span class="text-lg font-bold font-mono text-emerald-500">
                -BDT {{ (bookingForm.get('discount_amount')?.value || 0) | number:'1.0-0' }} ({{ getDiscountPercentage() }}%)
              </span>
              <span class="text-[11px] text-muted-foreground block">On Base Catalog Price</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Net Final Selling Price</span>
              <span class="text-xl font-bold font-mono text-primary">BDT {{ getNetContractValue() | number:'1.0-0' }}</span>
              <span class="text-[11px] text-muted-foreground block">Contractual Net Obligation</span>
            </div>
          </div>

          <!-- Promotional Discount & Escalation Tier -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-center">
            <app-custom-input
              label="Promotional Discount Amount (BDT)"
              type="number"
              placeholder="0"
              formControlName="discount_amount"
            />

            <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col justify-center">
              <span class="text-xs text-muted-foreground block font-medium">Governance Approval Required</span>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-xs px-2.5 py-0.5 rounded-full font-bold" [ngClass]="getDiscountEscalationTier().badgeClass">
                  {{ getDiscountEscalationTier().tier.replace('_', ' ') }}
                </span>
                <span class="text-xs text-muted-foreground">{{ getDiscountEscalationTier().description }}</span>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- Card 4: Co-Buyers / Joint-Buyers KYC (Spec 5.3) -->
        <app-card-container
          title="04. Co-Buyers & Joint Ownership (Spec 5.3)"
          subtitle="Multi-buyer ownership with specified contractual shares totaling 100%"
        >
          <div class="flex items-center justify-between mb-3">
            <div class="text-xs">
              <span class="text-muted-foreground">Total Co-Buyer Share Configured: </span>
              <span class="font-bold font-mono" [ngClass]="totalSharePercentage() === 100 ? 'text-emerald-500' : 'text-amber-500'">
                {{ totalSharePercentage() }}%
              </span>
              @if (totalSharePercentage() !== 100 && jointBuyers().length > 0) {
                <span class="text-amber-500 ml-2">⚠️ Shares should ideally total 100%</span>
              }
            </div>

            <button
              type="button"
              (click)="toggleAddJointBuyer()"
              class="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              {{ isAddingJointBuyer() ? '✕ Cancel' : '+ Add Co-Buyer' }}
            </button>
          </div>

          <!-- Add Joint Buyer Inline Form -->
          @if (isAddingJointBuyer()) {
            <div class="p-4 bg-secondary/30 border border-border rounded-xl space-y-4 mb-4">
              <h4 class="text-xs font-bold uppercase text-foreground">New Co-Buyer Information</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <app-custom-input
                  label="Full Legal Name (English) *"
                  placeholder="e.g. Begum Rokeya"
                  [formGroup]="jointBuyerForm"
                  formControlName="full_name_en"
                />

                <app-searchable-select
                  label="Relation to Primary Buyer *"
                  categoryCode="CUSTOMER_RELATION"
                  [formGroup]="jointBuyerForm"
                  formControlName="relation_to_primary"
                />

                <app-custom-input
                  label="Ownership Share (%) *"
                  type="number"
                  placeholder="50"
                  [formGroup]="jointBuyerForm"
                  formControlName="share_percentage"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <app-custom-input
                  label="Primary Mobile Phone *"
                  placeholder="+8801700000000"
                  [formGroup]="jointBuyerForm"
                  formControlName="primary_phone"
                />

                <app-custom-input
                  label="National ID (NID / Smart Card)"
                  placeholder="10 or 17 digit NID"
                  [formGroup]="jointBuyerForm"
                  formControlName="nid_number"
                />

                <app-custom-input
                  label="E-TIN Number"
                  placeholder="12 digit TIN"
                  [formGroup]="jointBuyerForm"
                  formControlName="tin_number"
                />
              </div>

              <div class="flex justify-end gap-2">
                <app-custom-button variant="outline" size="sm" type="button" (clicked)="toggleAddJointBuyer()">
                  Cancel
                </app-custom-button>
                <app-custom-button variant="primary" size="sm" type="button" (clicked)="saveJointBuyer()" [disabled]="jointBuyerForm.invalid">
                  Save Co-Buyer
                </app-custom-button>
              </div>
            </div>
          }

          <!-- List of Added Co-Buyers -->
          @if (jointBuyers().length > 0) {
            <div class="space-y-2">
              @for (jb of jointBuyers(); track $index) {
                <div class="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-xl text-xs">
                  <div>
                    <span class="font-bold text-foreground">{{ jb.full_name_en }}</span>
                    <span class="text-primary font-mono ml-2">({{ jb.relation_to_primary }} · {{ jb.share_percentage }}% Share)</span>
                    <div class="text-[11px] text-muted-foreground mt-0.5">
                      📞 {{ jb.primary_phone }} | NID: {{ jb.nid_number || 'N/A' }} | TIN: {{ jb.tin_number || 'N/A' }}
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeJointBuyer($index)"
                    class="text-rose-500 hover:text-rose-700 px-2 py-1 text-xs font-semibold"
                  >
                    ✕ Remove
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="text-xs text-muted-foreground italic">No joint co-buyers added. Single buyer ownership applies.</p>
          }
        </app-card-container>

        <!-- Card 5: Nominee Details (Spec 5.3) -->
        <app-card-container
          title="05. Nominee Management (Spec 5.3)"
          subtitle="Nominees are recorded separately from contractual buyers. System does not treat nominees automatically as legal owners."
        >
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-muted-foreground">
              Register legal nominees for inheritance and survivorship documentation.
            </p>
            <button
              type="button"
              (click)="toggleAddNominee()"
              class="px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              {{ isAddingNominee() ? '✕ Cancel' : '+ Add Nominee' }}
            </button>
          </div>

          <!-- Add Nominee Inline Form -->
          @if (isAddingNominee()) {
            <div class="p-4 bg-secondary/30 border border-border rounded-xl space-y-4 mb-4">
              <h4 class="text-xs font-bold uppercase text-foreground">New Nominee Details</h4>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <app-custom-input
                  label="Nominee Full Name *"
                  placeholder="e.g. Master Farhan Ahmed"
                  [formGroup]="nomineeForm"
                  formControlName="full_name"
                />

                <app-searchable-select
                  label="Relationship to Buyer *"
                  categoryCode="CUSTOMER_RELATION"
                  [formGroup]="nomineeForm"
                  formControlName="relation_to_buyer"
                />

                <app-custom-input
                  label="Nomination Percentage (%) *"
                  type="number"
                  placeholder="100"
                  [formGroup]="nomineeForm"
                  formControlName="nomination_percentage"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <app-custom-input
                  label="Contact Phone Number *"
                  placeholder="+8801700000000"
                  [formGroup]="nomineeForm"
                  formControlName="contact_phone"
                />

                <app-custom-input
                  label="NID / Birth Certificate No."
                  placeholder="Identification Number"
                  [formGroup]="nomineeForm"
                  formControlName="nid_or_passport"
                />

                <app-custom-input
                  label="Effective Date"
                  type="date"
                  [formGroup]="nomineeForm"
                  formControlName="effective_date"
                />
              </div>

              <div class="flex justify-end gap-2">
                <app-custom-button variant="outline" size="sm" type="button" (clicked)="toggleAddNominee()">
                  Cancel
                </app-custom-button>
                <app-custom-button variant="primary" size="sm" type="button" (clicked)="saveNominee()" [disabled]="nomineeForm.invalid">
                  Save Nominee
                </app-custom-button>
              </div>
            </div>
          }

          <!-- List of Added Nominees -->
          @if (nominees().length > 0) {
            <div class="space-y-2">
              @for (nom of nominees(); track $index) {
                <div class="flex items-center justify-between p-3 bg-secondary/20 border border-border rounded-xl text-xs">
                  <div>
                    <span class="font-bold text-foreground">{{ nom.full_name }}</span>
                    <span class="text-muted-foreground ml-2">({{ nom.relation_to_buyer }} · {{ nom.nomination_percentage }}% Entitlement)</span>
                    <div class="text-[11px] text-muted-foreground mt-0.5">
                      📞 {{ nom.contact_phone }} | ID: {{ nom.nid_or_passport || 'N/A' }} | Effective: {{ nom.effective_date || 'Immediate' }}
                    </div>
                  </div>
                  <button
                    type="button"
                    (click)="removeNominee($index)"
                    class="text-rose-500 hover:text-rose-700 px-2 py-1 text-xs font-semibold"
                  >
                    ✕ Remove
                  </button>
                </div>
              }
            </div>
          } @else {
            <p class="text-xs text-muted-foreground italic">No nominees registered yet.</p>
          }
        </app-card-container>

        <!-- Card 6: Booking Money & Allotment Conditions -->
        <app-card-container
          title="06. Earnest Money Collection & Special Allotment Clauses"
          subtitle="Record receipt and verify payment mode (Spec 5.1 & 5.2)"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Earnest Booking Money Received (BDT) *"
              type="number"
              placeholder="500000"
              formControlName="earnest_money_received"
              hint="Minimum earnest deposit required under REHAB norms"
            />

            <app-custom-input
              label="Initial Down Payment Allocated (BDT)"
              type="number"
              placeholder="0"
              formControlName="down_payment_total"
              hint="Initial down payment towards schedule"
            />
          </div>

          <div class="mt-4">
            <app-custom-textarea
              label="Special Allotment Clauses / Conditions"
              placeholder="Record special handover clauses, finish specifications, milestone trigger terms, legal exceptions..."
              formControlName="notes"
              [rows]="3"
            />
          </div>
        </app-card-container>

        <!-- Action Bar at Bottom -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <a
            routerLink="/sales/bookings"
            class="px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="bookingForm.invalid || isSubmitting()"
          >
            {{ isSubmitting() ? 'Executing Transaction...' : (isEditMode() ? 'Save Booking Changes' : 'Execute Booking & Allotment') }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class BookingFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private inventoryService = inject(InventoryService);
  private crmService = inject(CrmService);

  isEditMode = signal<boolean>(false);
  bookingId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  projects = signal<Project[]>([]);
  units = signal<Unit[]>([]);
  customers = signal<Customer[]>([]);

  jointBuyers = signal<BookingJointBuyer[]>([]);
  isAddingJointBuyer = signal<boolean>(false);

  nominees = signal<BookingNominee[]>([]);
  isAddingNominee = signal<boolean>(false);

  workflowStages = [
    { id: '01_CUSTOMER_VERIFICATION', code: '01', name: 'Lead & KYC' },
    { id: '02_UNIT_RESERVATION', code: '02', name: 'Reservation' },
    { id: '03_PRICE_APPROVAL', code: '03', name: 'Price & Disc.' },
    { id: '04_BOOKING_MONEY', code: '04', name: 'Earnest Dep.' },
    { id: '05_BOOKING_CONFIRMED', code: '05', name: 'Confirmation' },
    { id: '06_AGREEMENT_SIGNING', code: '06', name: 'Agreement' },
    { id: '07_INSTALLMENT_SCHEDULE', code: '07', name: 'Schedule' },
    { id: '08_COLLECTION_LEDGER', code: '08', name: 'Ledger' },
    { id: '09_REGISTRATION_DEED', code: '09', name: 'Registration' },
    { id: '10_FINAL_HANDOVER', code: '10', name: 'Handover' }
  ];

  bookingStatusOptions = [
    { value: 'PROVISIONAL', label: 'Provisional (Reservation Hold)' },
    { value: 'AGREEMENT_SIGNED', label: 'Agreement Signed (Allotment Confirmed)' },
    { value: 'REGISTRATION_DONE', label: 'Registration Done (Sub-Registry Title)' },
    { value: 'TRANSFERRED', label: 'Transferred (Unit Mutation)' },
    { value: 'CANCELLED', label: 'Cancelled (Statutory Forfeiture)' }
  ];

  bookingForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    unit_id: [null, Validators.required],
    primary_customer_id: [null, Validators.required],
    sales_rep_name: ['Tanvir Ahmed (Senior Sales Officer)'],
    booking_date: [new Date().toISOString().substring(0, 10), Validators.required],
    reservation_expiry_date: [''],
    workflow_stage: ['05_BOOKING_CONFIRMED', Validators.required],
    parking_slot_number: ['B1-P' + Math.floor(10 + Math.random() * 80)],
    parking_charge: [350000, [Validators.min(0)]],
    utility_charge: [250000, [Validators.min(0)]],
    documentation_charge: [50000, [Validators.min(0)]],
    discount_amount: [0, [Validators.min(0)]],
    earnest_money_received: [500000, [Validators.required, Validators.min(100000)]],
    down_payment_total: [0],
    status: ['PROVISIONAL', Validators.required],
    notes: ['']
  });

  jointBuyerForm: FormGroup = this.fb.group({
    full_name_en: ['', Validators.required],
    relation_to_primary: ['SPOUSE', Validators.required],
    share_percentage: [50, [Validators.required, Validators.min(1), Validators.max(100)]],
    primary_phone: ['', Validators.required],
    nid_number: [''],
    tin_number: ['']
  });

  nomineeForm: FormGroup = this.fb.group({
    full_name: ['', Validators.required],
    relation_to_buyer: ['SPOUSE', Validators.required],
    nomination_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
    contact_phone: ['', Validators.required],
    nid_or_passport: [''],
    effective_date: [new Date().toISOString().substring(0, 10)]
  });

  totalSharePercentage = computed(() => {
    return this.jointBuyers().reduce((acc, curr) => acc + (Number(curr.share_percentage) || 0), 0);
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  });

  unitOptions = computed(() => {
    return this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (Floor ${u.floor_number}) - BDT ${Number(u.total_unit_price || 0).toLocaleString()}`
    }));
  });

  customerOptions = computed(() => {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code} - NID: ${c.nid_number || 'N/A'})`
    }));
  });

  ngOnInit(): void {
    this.loadDropdownData();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.bookingId.set(Number(idParam));
      this.isEditMode.set(true);
      this.loadBookingData(Number(idParam));
    }
  }

  loadDropdownData(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.crmService.getCustomers().subscribe(c => this.customers.set(c));
    this.inventoryService.getUnits().subscribe(u => {
      this.units.set(u.filter(item => item.status_id === 'AVAILABLE' || item.status_id === 'ON_HOLD' || this.isEditMode()));
    });
  }

  loadBookingData(id: number): void {
    this.isLoading.set(true);
    this.salesService.getBooking(id).subscribe({
      next: (b) => {
        this.bookingForm.patchValue({
          project_id: b.project_id,
          unit_id: b.unit_id,
          primary_customer_id: b.primary_customer_id,
          sales_rep_name: b.sales_rep_name || '',
          booking_date: b.booking_date,
          reservation_expiry_date: b.reservation_expiry_date || '',
          workflow_stage: b.workflow_stage || '05_BOOKING_CONFIRMED',
          parking_slot_number: b.parking_slot_number || '',
          parking_charge: b.parking_charge,
          utility_charge: b.utility_charge,
          documentation_charge: b.documentation_charge,
          discount_amount: b.discount_amount,
          earnest_money_received: b.earnest_money_received,
          down_payment_total: b.down_payment_total,
          status: b.status,
          notes: b.notes || ''
        });
        if (b.joint_buyers) {
          this.jointBuyers.set(b.joint_buyers);
        }
        if (b.nominees) {
          this.nominees.set(b.nominees);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectChange(selected: any): void {
    if (selected?.value) {
      this.bookingForm.patchValue({ project_id: selected.value });
    }
  }

  onUnitChange(selected: any): void {
    if (selected?.value) {
      this.bookingForm.patchValue({ unit_id: selected.value });
    }
  }

  onCustomerChange(selected: any): void {
    if (selected?.value) {
      this.bookingForm.patchValue({ primary_customer_id: selected.value });
    }
  }

  selectedUnit(): Unit | undefined {
    const unitId = this.bookingForm.get('unit_id')?.value;
    if (!unitId) return undefined;
    return this.units().find(u => u.id === Number(unitId));
  }

  selectedCustomer(): Customer | undefined {
    const custId = this.bookingForm.get('primary_customer_id')?.value;
    if (!custId) return undefined;
    return this.customers().find(c => c.id === Number(custId));
  }

  getBaseUnitPrice(): number {
    const unit = this.selectedUnit();
    return Number(unit?.total_unit_price || 0);
  }

  getGrossContractValue(): number {
    const base = this.getBaseUnitPrice();
    const parking = Number(this.bookingForm.get('parking_charge')?.value || 0);
    const utility = Number(this.bookingForm.get('utility_charge')?.value || 0);
    const docs = Number(this.bookingForm.get('documentation_charge')?.value || 0);
    return base + parking + utility + docs;
  }

  getDiscountPercentage(): number {
    const base = this.getBaseUnitPrice();
    const discount = Number(this.bookingForm.get('discount_amount')?.value || 0);
    if (base <= 0 || discount <= 0) return 0;
    return Number(((discount / base) * 100).toFixed(2));
  }

  getNetContractValue(): number {
    const gross = this.getGrossContractValue();
    const discount = Number(this.bookingForm.get('discount_amount')?.value || 0);
    return Math.max(0, gross - discount);
  }

  getDiscountEscalationTier(): { tier: string; badgeClass: string; description: string } {
    const pct = this.getDiscountPercentage();
    if (pct <= 0) {
      return { tier: 'NO_DISCOUNT', badgeClass: 'bg-secondary text-muted-foreground', description: 'Standard Catalog Pricing' };
    }
    if (pct <= 1.0) {
      return { tier: 'SALES_MANAGER', badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20', description: 'Within 1.0% - Sales Manager Discretion (Auto-Approved)' };
    }
    if (pct <= 3.0) {
      return { tier: 'SALES_MANAGER_ESCALATED', badgeClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/20', description: '1.0% to 3.0% - Requires Sales Manager Authorization' };
    }
    if (pct <= 7.0) {
      return { tier: 'HEAD_OF_SALES', badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20', description: '3.0% to 7.0% - Requires Head of Sales Approval' };
    }
    return { tier: 'MANAGING_DIRECTOR', badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold', description: '> 7.0% - Mandatory Managing Director (MD) Clearance' };
  }

  // Joint Buyer Actions
  toggleAddJointBuyer(): void {
    this.isAddingJointBuyer.update(v => !v);
    if (this.isAddingJointBuyer()) {
      this.jointBuyerForm.reset({
        full_name_en: '',
        relation_to_primary: 'SPOUSE',
        share_percentage: 50,
        primary_phone: '',
        nid_number: '',
        tin_number: ''
      });
    }
  }

  saveJointBuyer(): void {
    if (this.jointBuyerForm.invalid) return;
    this.jointBuyers.update(list => [...list, this.jointBuyerForm.value]);
    this.isAddingJointBuyer.set(false);
  }

  removeJointBuyer(index: number): void {
    this.jointBuyers.update(list => list.filter((_, i) => i !== index));
  }

  // Nominee Actions
  toggleAddNominee(): void {
    this.isAddingNominee.update(v => !v);
    if (this.isAddingNominee()) {
      this.nomineeForm.reset({
        full_name: '',
        relation_to_buyer: 'SPOUSE',
        nomination_percentage: 100,
        contact_phone: '',
        nid_or_passport: '',
        effective_date: new Date().toISOString().substring(0, 10)
      });
    }
  }

  saveNominee(): void {
    if (this.nomineeForm.invalid) return;
    this.nominees.update(list => [...list, this.nomineeForm.value]);
    this.isAddingNominee.set(false);
  }

  removeNominee(index: number): void {
    this.nominees.update(list => list.filter((_, i) => i !== index));
  }

  submitForm(): void {
    if (this.bookingForm.invalid) return;
    this.isSubmitting.set(true);

    const payload = {
      ...this.bookingForm.value,
      joint_buyers: this.jointBuyers(),
      nominees: this.nominees()
    };

    if (this.isEditMode() && this.bookingId()) {
      this.salesService.updateBooking(this.bookingId()!, payload).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/sales/bookings', res.id]);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Failed to update booking');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.salesService.createBooking(payload).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/sales/bookings', created.id]);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Booking transaction failed');
          this.isSubmitting.set(false);
        }
      });
    }
  }
}
