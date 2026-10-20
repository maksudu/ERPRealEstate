import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../../core/services/land.service';
import { LandBank } from '../../../../core/models/land.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';

@Component({
  selector: 'app-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-5xl mx-auto space-y-6">
      <!-- Breadcrumb & Top Navigation -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <span>&larr;</span> Back to Proposals Registry
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Land Search & Acquisition
          </span>
        </div>
      </div>

      <!-- Success Alert Banner -->
      @if (successMessage) {
        <div class="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-2xs" role="status">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="font-medium">{{ successMessage }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goBack()"
              class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
            >
              Back to Proposals List
            </button>
            @if (!isEditMode) {
              <button
                type="button"
                (click)="resetForNew()"
                class="px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
              >
                + Register Another
              </button>
            }
          </div>
        </div>
      }

      <!-- Error Alert Banner -->
      @if (errorMessage) {
        <div class="p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between shadow-2xs" role="alert">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span class="font-medium">{{ errorMessage }}</span>
          </div>
          <button
            type="button"
            (click)="errorMessage = ''"
            class="text-rose-500 hover:text-rose-700 text-sm font-bold px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      }

      <!-- Main Form Card -->
      <app-card-container
        [hasHeader]="true"
        [title]="isEditMode ? 'Edit Land Opportunity (' + (loadedProjectCode || 'ID #' + editingProposalId) + ')' : 'Register New Land Opportunity'"
        [subtitle]="isEditMode ? 'Update plot size, road access width, construction FAR potentials, and zoning data' : 'Capture plot size, road access, FAR potential, surrounding development, and opportunity source'"
        [badge]="isEditMode ? 'Edit Mode' : 'New Registration'"
      >
        @if (isLoading) {
          <div class="py-16 text-center text-slate-400 text-xs space-y-2">
            <svg class="animate-spin w-6 h-6 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            <p>Loading proposal record details...</p>
          </div>
        } @else {
          <!-- Step Tabs -->
          <div class="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto bg-slate-50/60 dark:bg-slate-850/60 rounded-t-xl px-2">
            <button
              type="button"
              (click)="activeTab = 'basic'"
              [ngClass]="activeTab === 'basic' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'basic' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">1</span>
              Site Location & Opportunity Source
            </button>
            <button
              type="button"
              (click)="activeTab = 'potential'"
              [ngClass]="activeTab === 'potential' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'potential' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">2</span>
              Plot Size, FAR & Indicative Cost
            </button>
            <button
              type="button"
              (click)="activeTab = 'landowner'"
              [ngClass]="activeTab === 'landowner' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'landowner' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">3</span>
              Primary Landowner & Contact
            </button>
          </div>

          <form [formGroup]="proposalForm" (ngSubmit)="saveProposal()" class="space-y-6">
            <!-- TAB 1: SITE LOCATION & OPPORTUNITY SOURCE -->
            @if (activeTab === 'basic') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <app-custom-input
                    label="Project Code *"
                    formControlName="project_code"
                    placeholder="e.g. PRJ-LND-2026-05"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div>
                  <app-custom-input
                    label="Opportunity Title *"
                    formControlName="proposal_title"
                    placeholder="e.g. Prime Corner Plot at Gulshan-2 Lake Road"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <!-- Opportunity Source -->
                <div>
                  <app-searchable-select
                    label="Opportunity Source *"
                    formControlName="opportunity_source"
                    [options]="opportunitySourceOptions"
                    placeholder="Select Source (Broker / Agent)..."
                    [allowCreateNew]="false"
                  ></app-searchable-select>
                </div>

                <!-- Proposed Development -->
                <div>
                  <app-searchable-select
                    label="Proposed Development *"
                    formControlName="proposed_development_type"
                    [options]="developmentTypeOptions"
                    placeholder="Select Residential / Commercial..."
                    [allowCreateNew]="false"
                  ></app-searchable-select>
                </div>

                <div>
                  <app-custom-input
                    label="Mouza Name *"
                    formControlName="mouza_name"
                    placeholder="e.g. Gulshan Mouza"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div>
                  <app-custom-input
                    label="JL Number *"
                    formControlName="jl_number"
                    placeholder="e.g. 102"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div>
                  <app-custom-input
                    label="Upazila / Thana *"
                    formControlName="upazila_thana"
                    placeholder="e.g. Gulshan"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div>
                  <app-custom-input
                    label="Sub-Registry Office *"
                    formControlName="sub_registry_office"
                    placeholder="e.g. Gulshan Sub-Registry Office"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div class="md:col-span-2">
                  <app-custom-textarea
                    label="Surrounding Development & Road Frontage"
                    formControlName="surrounding_development"
                    placeholder="Nearby hospitals, metro station distance, commercial hub developments..."
                    [rows]="2"
                  ></app-custom-textarea>
                </div>
              </div>
            }

            <!-- TAB 2: PLOT SIZE, FAR & COST -->
            @if (activeTab === 'potential') {
              <div class="space-y-4">
                <!-- Area Engine Calculation Block -->
                <div class="p-4 bg-emerald-50/40 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Plot Size & Multi-Unit Area Calculation</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Input Unit</label>
                      <select 
                        formControlName="input_unit"
                        (change)="onAreaInput()"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="KATHA">Katha (কাঠা - 720 Sq Ft)</option>
                        <option value="DECIMAL">Decimal / Shotok (শতাংশ - 435.60 Sq Ft)</option>
                        <option value="BIGHA">Bigha (বিঘা - 20 Katha)</option>
                        <option value="SQFT">Square Feet (বর্গফুট)</option>
                      </select>
                    </div>

                    <div>
                      <app-custom-input
                        label="Area Value *"
                        formControlName="input_value"
                        type="number"
                        (input)="onAreaInput()"
                        placeholder="e.g. 15.0"
                        [required]="true"
                      ></app-custom-input>
                    </div>
                  </div>

                  <!-- Live Conversion Statistics -->
                  <div class="grid grid-cols-3 gap-2 text-center pt-1">
                    <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                      <div class="text-[10px] text-slate-500 font-medium">Square Feet</div>
                      <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ calculatedSqft.toLocaleString() }}</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                      <div class="text-[10px] text-slate-500 font-medium">Decimal</div>
                      <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ calculatedDecimal }}</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800">
                      <div class="text-[10px] text-slate-500 font-medium">Est. Built-Up (FAR)</div>
                      <div class="text-xs font-bold text-purple-700 dark:text-purple-400 font-mono mt-0.5">{{ calculatedBuiltupSqft.toLocaleString() }} SFT</div>
                    </div>
                  </div>
                </div>

                <!-- Construction Potential -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <app-custom-input
                      label="Road Width (ft) *"
                      formControlName="road_access_width_ft"
                      type="number"
                      placeholder="40"
                      [required]="true"
                    ></app-custom-input>
                  </div>

                  <div>
                    <app-custom-input
                      label="Allowable FAR *"
                      formControlName="far_potential"
                      type="number"
                      (input)="onAreaInput()"
                      placeholder="4.50"
                      [required]="true"
                    ></app-custom-input>
                  </div>

                  <div>
                    <app-custom-input
                      label="Max Floors *"
                      formControlName="max_allowable_floors"
                      type="number"
                      placeholder="14"
                      [required]="true"
                    ></app-custom-input>
                  </div>

                  <div>
                    <app-custom-input
                      label="Indicative Cost (BDT)"
                      formControlName="indicative_cost_total"
                      type="number"
                      placeholder="e.g. 150000000"
                    ></app-custom-input>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 3: PRIMARY LANDOWNER & CONTACT -->
            @if (activeTab === 'landowner') {
              <div class="space-y-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
                    Landowner / Primary Seller Details
                  </h4>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <app-custom-input
                        label="Landowner Name *"
                        formControlName="owner_name_en"
                        placeholder="Primary seller full name"
                        [required]="true"
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="Contact Phone"
                        formControlName="owner_phone"
                        placeholder="+880 1..."
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="National ID (NID)"
                        formControlName="owner_nid"
                        placeholder="NID number"
                      ></app-custom-input>
                    </div>
                  </div>
                </div>

                <div>
                  <app-custom-input
                    label="Source Contact Details (Broker / Agent)"
                    formControlName="source_contact_details"
                    placeholder="e.g. Modern Land Brokerage, Contact: Mr. Aminul +880 1812..."
                  ></app-custom-input>
                </div>
              </div>
            }

            <!-- Form Navigation & Submit Actions -->
            <div class="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                @if (activeTab !== 'basic') {
                  <button
                    type="button"
                    (click)="goToPreviousTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                  >
                    &larr; Previous Tab
                  </button>
                }
                @if (activeTab !== 'landowner') {
                  <button
                    type="button"
                    (click)="goToNextTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                  >
                    Next Tab &rarr;
                  </button>
                }
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  (click)="goBack()"
                  class="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  [disabled]="isSaving"
                  class="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-2xs"
                >
                  @if (isSaving) {
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    <span>Saving...</span>
                  } @else {
                    <span>{{ isEditMode ? 'Save Opportunity Changes' : 'Register Opportunity' }}</span>
                  }
                </button>
              </div>
            </div>
          </form>
        }
      </app-card-container>
    </div>
  `
})
export class ProposalFormComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  editingProposalId: number | null = null;
  loadedProjectCode = '';
  isLoading = false;
  isSaving = false;
  activeTab: 'basic' | 'potential' | 'landowner' = 'basic';

  successMessage = '';
  errorMessage = '';

  calculatedSqft = 0;
  calculatedDecimal = 0;
  calculatedBigha = 0;
  calculatedBuiltupSqft = 0;

  opportunitySourceOptions: SelectOption[] = [
    { value: 'BROKER', label: 'Enlisted Land Broker (তালিকাভুক্ত ব্রোকার)' },
    { value: 'DIRECT_OWNER', label: 'Direct Landowner (সরাসরি ভূমির মালিক)' },
    { value: 'MEDIA_AD', label: 'Media Advertisement / Circular (বিজ্ঞাপন)' },
    { value: 'INTERNAL_SCOUT', label: 'Internal Business Development Scout' },
    { value: 'BANK_AUCTION', label: 'Bank Mortgage Auction / Artha Rin' },
    { value: 'GOVERNMENT', label: 'Government Allotment / RAJUK / NHA' }
  ];

  developmentTypeOptions: SelectOption[] = [
    { value: 'RESIDENTIAL', label: 'Luxury Residential Apartments (আবাসিক অ্যাপার্টমেন্ট প্রকল্প)' },
    { value: 'COMMERCIAL', label: 'Commercial Complex / Office Tower (বাণিজ্যিক টাওয়ার)' },
    { value: 'MIXED_USE', label: 'Mixed-Use Retail & Residential (মিশ্র আবাসিক-বাণিজ্যিক)' },
    { value: 'TOWNSHIP', label: 'Gated Township / Mega Community (টাউনশিপ প্রকল্প)' },
    { value: 'SPECIALTY_HOSPITALITY', label: 'Hospitality / Resort / Hotel (হোটেল ও রিসোর্ট)' }
  ];

  proposalForm: FormGroup = this.fb.group({
    project_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    proposal_title: ['', Validators.required],
    mouza_name: ['', Validators.required],
    jl_number: ['', Validators.required],
    upazila_thana: ['Gulshan', Validators.required],
    district: ['Dhaka', Validators.required],
    sub_registry_office: ['Gulshan Sub-Registry Office', Validators.required],
    input_unit: ['KATHA', Validators.required],
    input_value: [15, [Validators.required, Validators.min(0.01)]],
    deal_type: ['JOINT_VENTURE', Validators.required],
    opportunity_source: ['BROKER', Validators.required],
    source_contact_details: [''],
    road_access_width_ft: [40.0, [Validators.required, Validators.min(0)]],
    surrounding_development: [''],
    proposed_development_type: ['RESIDENTIAL', Validators.required],
    far_potential: [4.50, [Validators.required, Validators.min(0.1)]],
    max_allowable_floors: [14, [Validators.required, Validators.min(1)]],
    ground_coverage_percent: [50.00, [Validators.required, Validators.min(1), Validators.max(100)]],
    indicative_cost_total: [0],
    status: ['DRAFT_PROPOSAL'],
    workflow_stage: ['IDENTIFIED'],
    location_description: [''],
    preliminary_valuation_notes: [''],
    owner_name_en: ['', Validators.required],
    owner_nid: [''],
    owner_phone: ['']
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.editingProposalId = Number(idParam);
      this.loadProposal(this.editingProposalId);
    } else {
      this.proposalForm.patchValue({
        project_code: `PRJ-LND-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`
      });
      this.onAreaInput();
    }
  }

  loadProposal(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.landService.getProposal(id).subscribe({
      next: (proposal: LandBank) => {
        this.loadedProjectCode = proposal.project_code;
        const primaryOwner = proposal.landowners && proposal.landowners[0] ? proposal.landowners[0] : null;

        this.proposalForm.patchValue({
          project_code: proposal.project_code,
          proposal_title: proposal.proposal_title,
          mouza_name: proposal.mouza_name,
          jl_number: proposal.jl_number,
          upazila_thana: proposal.upazila_thana || 'Gulshan',
          district: proposal.district || 'Dhaka',
          sub_registry_office: proposal.sub_registry_office || '',
          input_unit: 'KATHA',
          input_value: Number(proposal.total_area_katha || 15),
          deal_type: proposal.deal_type || 'JOINT_VENTURE',
          opportunity_source: proposal.opportunity_source || 'BROKER',
          source_contact_details: proposal.source_contact_details || '',
          road_access_width_ft: Number(proposal.road_access_width_ft || 40),
          surrounding_development: proposal.surrounding_development || '',
          proposed_development_type: proposal.proposed_development_type || 'RESIDENTIAL',
          far_potential: Number(proposal.far_potential || 4.5),
          max_allowable_floors: Number(proposal.max_allowable_floors || 14),
          ground_coverage_percent: Number(proposal.ground_coverage_percent || 50),
          indicative_cost_total: Number(proposal.indicative_cost_total || 0),
          status: proposal.status || 'DRAFT_PROPOSAL',
          workflow_stage: proposal.workflow_stage || 'IDENTIFIED',
          location_description: proposal.location_description || '',
          preliminary_valuation_notes: proposal.preliminary_valuation_notes || '',
          owner_name_en: primaryOwner ? primaryOwner.full_name_en : 'Owner',
          owner_nid: primaryOwner?.nid_number || '',
          owner_phone: primaryOwner?.phone_number || ''
        });

        this.onAreaInput();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load proposal', err);
        this.errorMessage = err.error?.detail || 'Failed to load land opportunity details.';
        this.isLoading = false;
      }
    });
  }

  onAreaInput(): void {
    const unit = this.proposalForm.get('input_unit')?.value || 'KATHA';
    const val = Number(this.proposalForm.get('input_value')?.value || 0);
    const far = Number(this.proposalForm.get('far_potential')?.value || 4.5);

    if (val <= 0) {
      this.calculatedSqft = 0;
      this.calculatedDecimal = 0;
      this.calculatedBuiltupSqft = 0;
      return;
    }

    let sqft = 0;
    if (unit === 'KATHA') {
      sqft = val * 720;
      this.calculatedSqft = sqft;
      this.calculatedDecimal = Number((sqft / 435.6).toFixed(2));
      this.calculatedBigha = Number((val / 20).toFixed(2));
    } else if (unit === 'DECIMAL') {
      sqft = val * 435.6;
      this.calculatedSqft = sqft;
      this.calculatedDecimal = val;
      this.calculatedBigha = Number(((sqft / 720) / 20).toFixed(2));
    } else if (unit === 'BIGHA') {
      sqft = val * 14400;
      this.calculatedSqft = sqft;
      this.calculatedDecimal = Number((sqft / 435.6).toFixed(2));
      this.calculatedBigha = val;
    } else {
      sqft = val;
      this.calculatedSqft = val;
      this.calculatedDecimal = Number((val / 435.6).toFixed(2));
      this.calculatedBigha = Number(((val / 720) / 20).toFixed(2));
    }

    this.calculatedBuiltupSqft = Math.round(sqft * far);
  }

  goToPreviousTab(): void {
    if (this.activeTab === 'landowner') this.activeTab = 'potential';
    else if (this.activeTab === 'potential') this.activeTab = 'basic';
  }

  goToNextTab(): void {
    if (this.activeTab === 'basic') this.activeTab = 'potential';
    else if (this.activeTab === 'potential') this.activeTab = 'landowner';
  }

  saveProposal(): void {
    if (this.proposalForm.invalid) {
      this.proposalForm.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields (Project Code, Title, Location, Size & Landowner).';
      if (this.proposalForm.get('project_code')?.invalid || this.proposalForm.get('proposal_title')?.invalid || this.proposalForm.get('mouza_name')?.invalid) {
        this.activeTab = 'basic';
      } else if (this.proposalForm.get('input_value')?.invalid || this.proposalForm.get('far_potential')?.invalid) {
        this.activeTab = 'potential';
      } else if (this.proposalForm.get('owner_name_en')?.invalid) {
        this.activeTab = 'landowner';
      }
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    const f = this.proposalForm.value;

    const payload = {
      project_code: f.project_code.trim(),
      proposal_title: f.proposal_title.trim(),
      mouza_name: f.mouza_name.trim(),
      jl_number: f.jl_number.trim(),
      upazila_thana: f.upazila_thana.trim(),
      district: f.district.trim(),
      sub_registry_office: f.sub_registry_office.trim(),
      input_unit: f.input_unit,
      input_value: Number(f.input_value),
      deal_type: f.deal_type,
      opportunity_source: f.opportunity_source,
      source_contact_details: f.source_contact_details || null,
      road_access_width_ft: Number(f.road_access_width_ft || 40.0),
      surrounding_development: f.surrounding_development || null,
      proposed_development_type: f.proposed_development_type,
      far_potential: Number(f.far_potential || 4.50),
      max_allowable_floors: Number(f.max_allowable_floors || 14),
      ground_coverage_percent: Number(f.ground_coverage_percent || 50.00),
      indicative_cost_total: Number(f.indicative_cost_total || 0),
      status: f.status || 'DRAFT_PROPOSAL',
      workflow_stage: f.workflow_stage || 'IDENTIFIED',
      location_description: f.location_description,
      preliminary_valuation_notes: f.preliminary_valuation_notes,
      landowners: f.owner_name_en ? [
        {
          owner_type: 'INDIVIDUAL',
          full_name_en: f.owner_name_en.trim(),
          nid_number: f.owner_nid || null,
          phone_number: f.owner_phone || null,
          ownership_share_ratio: 1.0
        }
      ] : []
    };

    if (this.isEditMode && this.editingProposalId) {
      this.landService.updateProposal(this.editingProposalId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.successMessage = `Land Opportunity "${updated.proposal_title}" (${updated.project_code}) updated successfully!`;
        },
        error: (err) => {
          console.error('Update proposal error:', err);
          this.errorMessage = err.error?.detail || 'Failed to update land proposal.';
          this.isSaving = false;
        }
      });
    } else {
      this.landService.createProposal(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.loadedProjectCode = created.project_code;
          this.successMessage = `Land Opportunity "${created.proposal_title}" (${created.project_code}) registered successfully!`;
        },
        error: (err) => {
          console.error('Create proposal error:', err);
          this.errorMessage = err.error?.detail || 'Failed to register new land opportunity.';
          this.isSaving = false;
        }
      });
    }
  }

  resetForNew(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.loadedProjectCode = '';
    this.activeTab = 'basic';
    this.proposalForm.reset({
      project_code: `PRJ-LND-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      proposal_title: '',
      mouza_name: '',
      jl_number: '',
      upazila_thana: 'Gulshan',
      district: 'Dhaka',
      sub_registry_office: 'Gulshan Sub-Registry Office',
      input_unit: 'KATHA',
      input_value: 15,
      deal_type: 'JOINT_VENTURE',
      opportunity_source: 'BROKER',
      source_contact_details: '',
      road_access_width_ft: 40.0,
      surrounding_development: '',
      proposed_development_type: 'RESIDENTIAL',
      far_potential: 4.50,
      max_allowable_floors: 14,
      ground_coverage_percent: 50.00,
      indicative_cost_total: 0,
      status: 'DRAFT_PROPOSAL',
      workflow_stage: 'IDENTIFIED',
      location_description: '',
      preliminary_valuation_notes: '',
      owner_name_en: '',
      owner_nid: '',
      owner_phone: ''
    });
    this.onAreaInput();
  }

  goBack(): void {
    this.router.navigate(['/land/proposals']);
  }
}
