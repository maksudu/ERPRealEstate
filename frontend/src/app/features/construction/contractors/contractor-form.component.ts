import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { Subcontractor } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-contractor-form',
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
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      <!-- Top Navigation & Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/contractors"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Contractor Registry"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Central Contractor & Subcontractor Registry
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Profile #' + contractorId() : 'New Enlistment' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Contractor Profile & Agreement' : 'Onboard New Contractor or Subcontractor' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="fillExampleData()"
            class="px-3.5 py-2 text-xs font-semibold rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5 shadow-xs"
            title="Populate compliant example contractor master profile"
          >
            <i class="ri-magic-line text-sm"></i>
            <span>Example Data</span>
          </button>
          <app-custom-button
            variant="outline"
            label="Cancel"
            routerLink="/construction/contractors"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            (btnClick)="onSubmit()"
            [loading]="isSubmitting()"
            [label]="isEditMode() ? 'Save Profile Changes' : 'Submit & Enlist Contractor'"
            icon="ri-save-line"
          ></app-custom-button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border text-sm">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            (click)="setActiveTab(t.id)"
            [class.bg-primary]="activeTab() === t.id"
            [class.text-primary-foreground]="activeTab() === t.id"
            [class.shadow-sm]="activeTab() === t.id"
            [class.bg-card]="activeTab() !== t.id"
            [class.text-muted-foreground]="activeTab() !== t.id"
            [class.hover:bg-secondary]="activeTab() !== t.id"
            [class.hover:text-foreground]="activeTab() !== t.id"
            class="px-3.5 py-2 rounded-xl border border-border font-medium flex items-center gap-2 whitespace-nowrap transition-all text-xs sm:text-sm"
          >
            <i [class]="t.icon + ' text-base'"></i>
            <span>{{ t.label }}</span>
          </button>
        }
      </div>

      <!-- Main Form Container -->
      <app-card-container [hasHeader]="false">
        <form [formGroup]="contractorForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-8 p-1">

          @if (activeTab() === 'entity' || activeTab() === 'all') {
          <!-- Section 1: Business Identification & Classification -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 class="text-base font-semibold text-foreground">Legal Entity & Contractor Classification</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Trade / Display Name *</label>
                <app-custom-input
                  formControlName="company_name"
                  placeholder="e.g. Bengal Structural Builders Ltd."
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Registered Legal Business Name</label>
                <app-custom-input
                  formControlName="legal_business_name"
                  placeholder="e.g. Bengal Structural Builders Pvt. Ltd."
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Contractor Classification *</label>
                <app-searchable-select
                  categoryCode="CONTRACTOR_TYPE"
                  formControlName="contractor_type"
                  placeholder="Select Classification"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Primary Trade Specialization *</label>
                <app-searchable-select
                  categoryCode="CONTRACTOR_TRADE"
                  formControlName="trade_category"
                  placeholder="Select Trade Category"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Trade Sub-Specialty / Scope</label>
                <app-custom-input
                  formControlName="trade_specialization"
                  placeholder="e.g. Ready-Mix Casting & Diaphragm Walls"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Link to Main Contractor (If Subcontractor)</label>
                <app-searchable-select
                  [options]="mainContractorOptions()"
                  formControlName="parent_contractor_id"
                  placeholder="None (Direct / Prime Contractor)"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div class="md:col-span-2">
                <label class="block text-xs font-medium text-foreground mb-1.5">Registered Office Address</label>
                <app-custom-input
                  formControlName="office_address"
                  placeholder="Suite/Plot, Road, Area, Commercial District"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">City / Region</label>
                <app-custom-input
                  formControlName="city"
                  placeholder="e.g. Dhaka, Chattogram"
                ></app-custom-input>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'contacts' || activeTab() === 'all') {
          <!-- Section 2: Authorized Representative & Official Contacts -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 class="text-base font-semibold text-foreground">Authorized Representative & Official Contacts</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Primary Contact Person *</label>
                <app-custom-input
                  formControlName="contact_person"
                  placeholder="e.g. Engr. Kamal Hossain"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Primary Phone Number *</label>
                <app-custom-input
                  formControlName="primary_phone"
                  placeholder="+880 1711-000000"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Secondary / Hotline Phone</label>
                <app-custom-input
                  formControlName="secondary_phone"
                  placeholder="+880 1819-000000"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Official Corporate Email</label>
                <app-custom-input
                  formControlName="email"
                  type="email"
                  placeholder="contact@contractor.com"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Authorized Signatory Name</label>
                <app-custom-input
                  formControlName="authorized_rep_name"
                  placeholder="Managing Director / CEO Name"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Authorized Signatory Designation</label>
                <app-custom-input
                  formControlName="authorized_rep_designation"
                  placeholder="e.g. Managing Director, Partner"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Signatory Phone</label>
                <app-custom-input
                  formControlName="authorized_rep_phone"
                  placeholder="+880 1711-..."
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Signatory National ID (NID)</label>
                <app-custom-input
                  formControlName="authorized_rep_nid"
                  placeholder="10 or 17 digit NID number"
                ></app-custom-input>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'tax_bank' || activeTab() === 'all') {
          <!-- Section 3: Statutory Tax, VAT & Banking Details -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 class="text-base font-semibold text-foreground">Statutory Tax, VAT & Restricted Bank Details</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">TIN (e-TIN 12 Digits)</label>
                <app-custom-input
                  formControlName="tin_number"
                  placeholder="142857912401"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">BIN / VAT Registration (9/13 Digits)</label>
                <app-custom-input
                  formControlName="bin_number"
                  placeholder="002458912-0101"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Trade License Number</label>
                <app-custom-input
                  formControlName="trade_license_number"
                  placeholder="TRAD/DNCC/041285"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Trade License Expiry Date</label>
                <app-custom-input
                  type="date"
                  formControlName="trade_license_expiry"
                ></app-custom-input>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-secondary/50 border border-border mt-4">
              <div class="flex items-center gap-2 mb-3">
                <i class="ri-bank-line text-primary"></i>
                <h3 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Restricted Bank Credentials (Finance & Accounts)</h3>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">Bank Name</label>
                  <app-custom-input
                    formControlName="bank_name"
                    placeholder="e.g. Eastern Bank PLC"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">Branch Name</label>
                  <app-custom-input
                    formControlName="bank_branch"
                    placeholder="e.g. Gulshan Branch"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">Account Title / Name</label>
                  <app-custom-input
                    formControlName="bank_account_name"
                    placeholder="Exact Name on Bank Cheque"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">Bank Account Number</label>
                  <app-custom-input
                    formControlName="bank_account_number"
                    placeholder="13-16 Digit Account Number"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">BEFTN Routing Number</label>
                  <app-custom-input
                    formControlName="bank_routing_number"
                    placeholder="9-digit routing code"
                  ></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-medium text-foreground mb-1.5">Standard Payment Terms (Days)</label>
                  <app-custom-input
                    type="number"
                    formControlName="payment_terms_days"
                    placeholder="30"
                  ></app-custom-input>
                </div>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'qualifications' || activeTab() === 'all') {
          <!-- Section 4: Technical Qualifications, Insurance & Safety -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h2 class="text-base font-semibold text-foreground">Qualifications, Insurance & HSE Safety</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Contractor Enlistment Grade</label>
                <app-searchable-select
                  categoryCode="CONTRACTOR_LICENSE_GRADE"
                  formControlName="license_grade"
                  placeholder="Select Enlistment Grade"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">ISO / Technical Certifications</label>
                <app-custom-input
                  formControlName="iso_certification"
                  placeholder="e.g. ISO 9001:2015, OHSAS 18001"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Experience in High-Rise (Years)</label>
                <app-custom-input
                  type="number"
                  formControlName="experience_years"
                  placeholder="10"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Past Completed Projects</label>
                <app-custom-input
                  type="number"
                  formControlName="past_projects_count"
                  placeholder="15"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Audited Performance Rating (0.00 - 5.00)</label>
                <app-custom-input
                  type="number"
                  formControlName="performance_rating"
                  placeholder="4.75"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Workmen Compensation Insurance Policy #</label>
                <app-custom-input
                  formControlName="insurance_policy_number"
                  placeholder="PRG-CAR-2026-8812"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Insurance Expiry Date</label>
                <app-custom-input
                  type="date"
                  formControlName="insurance_expiry_date"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Insurance Coverage Amount (BDT)</label>
                <app-custom-input
                  type="number"
                  formControlName="insurance_coverage_amount"
                  placeholder="50,000,000"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Designated Site Safety Officer</label>
                <app-custom-input
                  formControlName="safety_officer_name"
                  placeholder="Name of Certified Safety Officer"
                ></app-custom-input>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'capacity' || activeTab() === 'all') {
          <!-- Section 5: Capacity, Site Supervisors & Scope Boundaries -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                5
              </div>
              <h2 class="text-base font-semibold text-foreground">Manpower Capacity, Equipment & Scope Boundary Control</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Active Manpower Gang Capacity (Heads)</label>
                <app-custom-input
                  type="number"
                  formControlName="manpower_capacity"
                  placeholder="150"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Site Supervisor / Foreman Name</label>
                <app-custom-input
                  formControlName="site_supervisor_name"
                  placeholder="Md. Habibur Rahman"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Site Supervisor Phone Number</label>
                <app-custom-input
                  formControlName="site_supervisor_phone"
                  placeholder="+880 1712-..."
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Machinery & Equipment Inventory</label>
                <app-custom-textarea
                  formControlName="equipment_inventory"
                  rows="3"
                  placeholder="e.g. 2x Tower Cranes (Zoomlion 50T), 3x Concrete Pumps, 4x Rebar Benches, 12x Passenger Hoists"
                ></app-custom-textarea>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">
                  Scope Boundaries & Duplicate Billing Protection Rule
                </label>
                <app-custom-textarea
                  formControlName="scope_boundaries"
                  rows="3"
                  placeholder="Explicit scope demarcation (e.g. Substructure through Level 25 structural concrete; exclude MEP & paint). Defines boundaries to prevent double measurement."
                ></app-custom-textarea>
              </div>
            </div>
          </div>
          }

          @if (activeTab() === 'status' || activeTab() === 'all') {
          <!-- Section 6: Contract Timeline, Onboarding Review & Remarks -->
          <div>
            <div class="flex items-center gap-2 mb-4 pb-2 border-b border-border/60">
              <div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
                6
              </div>
              <h2 class="text-base font-semibold text-foreground">Contract Timeline, Developer Onboarding Review & Status</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Contract Agreement Start Date</label>
                <app-custom-input
                  type="date"
                  formControlName="contract_start_date"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Contract Expiry Date</label>
                <app-custom-input
                  type="date"
                  formControlName="contract_expiry_date"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Onboarding Due Diligence Status *</label>
                <app-searchable-select
                  categoryCode="CONTRACTOR_ONBOARDING_STATUS"
                  formControlName="onboarding_status"
                  placeholder="Select Onboarding Status"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Contract Execution Status *</label>
                <app-searchable-select
                  categoryCode="CONTRACTOR_COMPLETION_STATUS"
                  formControlName="completion_status"
                  placeholder="Select Status"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>
            </div>

            <div class="mt-4">
              <label class="block text-xs font-medium text-foreground mb-1.5">Legal, Tax & Procurement Assessment Remarks</label>
              <app-custom-textarea
                formControlName="remarks"
                rows="2"
                placeholder="Developer due diligence review summary, audit findings or conditional approval clauses..."
              ></app-custom-textarea>
            </div>
          </div>
          }

          <!-- Bottom Action Buttons & Step Navigation -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-4">
            <div class="flex items-center gap-2">
              @if (activeTab() !== 'entity' && activeTab() !== 'all') {
                <button
                  type="button"
                  (click)="prevTab()"
                  class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <i class="ri-arrow-left-s-line"></i>
                  Previous Tab
                </button>
              }
              @if (activeTab() !== 'status' && activeTab() !== 'all') {
                <button
                  type="button"
                  (click)="nextTab()"
                  class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  Next Tab
                  <i class="ri-arrow-right-s-line"></i>
                </button>
              }
            </div>

            <div class="flex items-center gap-3">
              <app-custom-button
                variant="outline"
                label="Cancel & Discard"
                routerLink="/construction/contractors"
              ></app-custom-button>
              <app-custom-button
                variant="primary"
                (btnClick)="onSubmit()"
                [loading]="isSubmitting()"
                [label]="isEditMode() ? 'Update Contractor Profile' : 'Complete Onboarding & Enlist'"
                icon="ri-check-line"
              ></app-custom-button>
            </div>
          </div>

        </form>
      </app-card-container>
    </div>
  `
})
export class ContractorFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);

  isEditMode = signal<boolean>(false);
  contractorId = signal<number | null>(null);
  isSubmitting = signal<boolean>(false);
  mainContractorOptions = signal<{ label: string; value: any }[]>([]);

  // Tab State & Step Navigation
  activeTab = signal<'entity' | 'contacts' | 'tax_bank' | 'qualifications' | 'capacity' | 'status' | 'all'>('entity');
  tabs = [
    { id: 'entity' as const, label: '1. Legal Entity & Classification', icon: 'ri-building-line' },
    { id: 'contacts' as const, label: '2. Contacts & Authorized Rep', icon: 'ri-user-star-line' },
    { id: 'tax_bank' as const, label: '3. Tax, VAT & Bank Details', icon: 'ri-bank-card-line' },
    { id: 'qualifications' as const, label: '4. Qualifications & Safety', icon: 'ri-award-line' },
    { id: 'capacity' as const, label: '5. Capacity & Scope Boundaries', icon: 'ri-tools-line' },
    { id: 'status' as const, label: '6. Agreement & Status', icon: 'ri-shield-check-line' },
    { id: 'all' as const, label: 'All Sections', icon: 'ri-layout-grid-line' }
  ];

  setActiveTab(tab: 'entity' | 'contacts' | 'tax_bank' | 'qualifications' | 'capacity' | 'status' | 'all'): void {
    this.activeTab.set(tab);
  }

  nextTab(): void {
    const tabOrder = ['entity', 'contacts', 'tax_bank', 'qualifications', 'capacity', 'status'] as const;
    const curIdx = tabOrder.indexOf(this.activeTab() as any);
    if (curIdx >= 0 && curIdx < tabOrder.length - 1) {
      this.activeTab.set(tabOrder[curIdx + 1]);
    }
  }

  prevTab(): void {
    const tabOrder = ['entity', 'contacts', 'tax_bank', 'qualifications', 'capacity', 'status'] as const;
    const curIdx = tabOrder.indexOf(this.activeTab() as any);
    if (curIdx > 0) {
      this.activeTab.set(tabOrder[curIdx - 1]);
    }
  }

  contractorForm: FormGroup = this.fb.group({
    company_name: ['', Validators.required],
    legal_business_name: [''],
    trade_specialization: [''],
    trade_category: ['CIVIL_STRUCTURE', Validators.required],
    contractor_type: ['SUBCONTRACTOR', Validators.required],
    parent_contractor_id: [null],

    contact_person: ['', Validators.required],
    primary_phone: ['', Validators.required],
    secondary_phone: [''],
    email: [''],
    office_address: [''],
    city: ['Dhaka'],
    authorized_rep_name: [''],
    authorized_rep_designation: [''],
    authorized_rep_phone: [''],
    authorized_rep_nid: [''],

    tin_number: [''],
    bin_number: [''],
    trade_license_number: [''],
    trade_license_expiry: [null],
    tax_circle: [''],

    bank_name: [''],
    bank_branch: [''],
    bank_account_name: [''],
    bank_account_number: [''],
    bank_routing_number: [''],
    payment_terms_days: [30],

    iso_certification: [''],
    license_grade: ['GRADE_A'],
    enlistment_category: ['CATEGORY_1'],
    insurance_policy_number: [''],
    insurance_expiry_date: [null],
    insurance_coverage_amount: [0],

    safety_compliant: [true],
    safety_officer_name: [''],
    safety_incident_count: [0],

    performance_rating: [4.50],
    past_projects_count: [0],
    experience_years: [5],

    manpower_capacity: [50],
    equipment_inventory: [''],
    site_supervisor_name: [''],
    site_supervisor_phone: [''],
    scope_boundaries: [''],
    duplicate_billing_protection: [true],

    contract_start_date: [null],
    contract_expiry_date: [null],
    onboarding_status: ['APPROVED', Validators.required],
    completion_status: ['ACTIVE', Validators.required],
    remarks: [''],
    is_active: [true]
  });

  ngOnInit(): void {
    this.loadMainContractors();

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        this.isEditMode.set(true);
        this.contractorId.set(+idParam);
        this.loadContractorData(+idParam);
      }
    });
  }

  loadMainContractors(): void {
    this.constructionService.getContractors({ contractor_type: 'MAIN_CONTRACTOR', limit: 100 }).subscribe({
      next: (list) => {
        const opts = list.map(c => ({
          label: `${c.company_name} (${c.contractor_code})`,
          value: c.id
        }));
        this.mainContractorOptions.set(opts);
      },
      error: () => {}
    });
  }

  loadContractorData(id: number): void {
    this.constructionService.getContractorById(id).subscribe({
      next: (data) => {
        this.contractorForm.patchValue({
          company_name: data.company_name,
          legal_business_name: data.legal_business_name,
          trade_specialization: data.trade_specialization,
          trade_category: data.trade_category,
          contractor_type: data.contractor_type,
          parent_contractor_id: data.parent_contractor_id,

          contact_person: data.contact_person,
          primary_phone: data.primary_phone,
          secondary_phone: data.secondary_phone,
          email: data.email,
          office_address: data.office_address,
          city: data.city,
          authorized_rep_name: data.authorized_rep_name,
          authorized_rep_designation: data.authorized_rep_designation,
          authorized_rep_phone: data.authorized_rep_phone,
          authorized_rep_nid: data.authorized_rep_nid,

          tin_number: data.tin_number,
          bin_number: data.bin_number,
          trade_license_number: data.trade_license_number,
          trade_license_expiry: data.trade_license_expiry,
          tax_circle: data.tax_circle,

          bank_name: data.bank_name,
          bank_branch: data.bank_branch,
          bank_account_name: data.bank_account_name,
          bank_account_number: data.bank_account_number,
          bank_routing_number: data.bank_routing_number,
          payment_terms_days: data.payment_terms_days,

          iso_certification: data.iso_certification,
          license_grade: data.license_grade,
          enlistment_category: data.enlistment_category,
          insurance_policy_number: data.insurance_policy_number,
          insurance_expiry_date: data.insurance_expiry_date,
          insurance_coverage_amount: data.insurance_coverage_amount,

          safety_compliant: data.safety_compliant,
          safety_officer_name: data.safety_officer_name,
          safety_incident_count: data.safety_incident_count,

          performance_rating: data.performance_rating,
          past_projects_count: data.past_projects_count,
          experience_years: data.experience_years,

          manpower_capacity: data.manpower_capacity,
          equipment_inventory: data.equipment_inventory,
          site_supervisor_name: data.site_supervisor_name,
          site_supervisor_phone: data.site_supervisor_phone,
          scope_boundaries: data.scope_boundaries,
          duplicate_billing_protection: data.duplicate_billing_protection,

          contract_start_date: data.contract_start_date,
          contract_expiry_date: data.contract_expiry_date,
          onboarding_status: data.onboarding_status,
          completion_status: data.completion_status,
          remarks: data.remarks,
          is_active: data.is_active
        });
      },
      error: (err) => {
        console.error('Failed to load contractor data', err);
      }
    });
  }

  onSubmit(): void {
    if (this.contractorForm.invalid) {
      this.contractorForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formValue = this.contractorForm.value;

    if (this.isEditMode() && this.contractorId()) {
      this.constructionService.updateContractor(this.contractorId()!, formValue).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/construction/contractors']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Failed to update contractor', err);
        }
      });
    } else {
      this.constructionService.createContractor(formValue).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/construction/contractors']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.error('Failed to create contractor', err);
        }
      });
    }
  }

  fillExampleData(): void {
    const yr = new Date().getFullYear();

    this.contractorForm.patchValue({
      company_name: 'Bengal Structural Engineers Ltd.',
      legal_business_name: 'Bengal Structural Engineering & Construction Co. Ltd.',
      trade_specialization: 'High-Rise RCC Superstructure, Post-Tensioned Slabs & Heavy Deep Foundation Works',
      trade_category: 'CIVIL_STRUCTURE',
      contractor_type: 'MAIN_CONTRACTOR',
      parent_contractor_id: null,

      contact_person: 'Engr. Md. Rafiqul Islam, PEng',
      primary_phone: '+880 1711-892341',
      secondary_phone: '+880 2-9883421',
      email: 'contracts@bengalstructural.com.bd',
      office_address: 'Suite 9B, Tower 71, 24 Gulshan South Avenue, Gulshan-1, Dhaka-1212',
      city: 'Dhaka',
      authorized_rep_name: 'Engr. Mahbubur Rahman',
      authorized_rep_designation: 'Managing Director & Chief Technical Officer',
      authorized_rep_phone: '+880 1819-234567',
      authorized_rep_nid: '19782692015000214',

      tin_number: '624189304128',
      bin_number: '001298453-0101',
      trade_license_number: 'TRAD/DNCC/019284/2026',
      trade_license_expiry: `${yr + 1}-06-30`,
      tax_circle: 'Taxes Circle-14 (Companies), Taxes Zone-02, Dhaka',

      bank_name: 'BRAC Bank PLC',
      bank_branch: 'Gulshan Corporate Branch, Dhaka',
      bank_account_name: 'Bengal Structural Engineering & Construction Co. Ltd.',
      bank_account_number: '1501204892847001',
      bank_routing_number: '060261329',
      payment_terms_days: 15,

      iso_certification: 'ISO 9001:2015 (QMS), ISO 45001:2018 (Occupational Health & Safety)',
      license_grade: 'GRADE_A',
      enlistment_category: 'CATEGORY_1',
      insurance_policy_number: 'NIC/DH-GUL/CAR/2026/0042',
      insurance_expiry_date: `${yr + 1}-12-31`,
      insurance_coverage_amount: 150000000.0,

      safety_compliant: true,
      safety_officer_name: 'Khandaker Tanvir Ahmed, CSP',
      safety_incident_count: 0,

      performance_rating: 4.85,
      past_projects_count: 14,
      experience_years: 18,

      manpower_capacity: 180,
      equipment_inventory: '2x Zoomlion Concrete Boom Pumps (42m), 4x Stationary Batching Mixers, 14x High-Frequency Poker Vibrators, 40,000 SFT Steel Acrow Formwork Plates & Props',
      site_supervisor_name: 'Engr. Kamrul Hasan',
      site_supervisor_phone: '+880 1912-345678',
      scope_boundaries: 'All civil superstructure works from pile cap to rooftop parapet. Excludes electrical substation, plumbing fixtures, and elevator installation.',
      duplicate_billing_protection: true,

      contract_start_date: `${yr}-01-01`,
      contract_expiry_date: `${yr + 2}-12-31`,
      onboarding_status: 'APPROVED',
      completion_status: 'ACTIVE',
      remarks: 'Developer pre-qualification audit successfully completed. Verified TIN/BIN with NBR, Trade License with DNCC, and satisfactory past performance track record verified from 3 tier-1 developers in Dhaka.',
      is_active: true
    });
  }
}
