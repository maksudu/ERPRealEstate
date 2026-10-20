import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../../core/services/land.service';
import { Landowner } from '../../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';

@Component({
  selector: 'app-landowner-form',
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
            <span>&larr;</span> Back to Landowners Registry
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Module 2.1 — Land Acquisition
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
              Back to Landowners List
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
        [title]="isEditMode ? 'Edit Landowner Profile (' + (loadedLandownerCode || 'ID #' + editingOwnerId) + ')' : 'Register New Landowner & Seller'"
        [subtitle]="isEditMode ? 'Update identification, ownership ratio, and banking credentials for land acquisition contracts' : 'Auto-generates unique Landowner ID and records multi-unit ownership share ratios'"
        [badge]="isEditMode ? 'Edit Mode' : 'New Registration'"
      >
        @if (isLoading) {
          <div class="py-16 text-center text-slate-400 text-xs space-y-2">
            <svg class="animate-spin w-6 h-6 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
            <p>Loading landowner record details...</p>
          </div>
        } @else {
          <!-- Step Tabs -->
          <div class="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto bg-slate-50/60 dark:bg-slate-850/60 rounded-t-xl px-2">
            <button
              type="button"
              (click)="activeTab = 'personal'"
              [ngClass]="activeTab === 'personal' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'personal' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">1</span>
              Personal & Identification
            </button>
            <button
              type="button"
              (click)="activeTab = 'contact'"
              [ngClass]="activeTab === 'contact' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'contact' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">2</span>
              Contact & Addresses
            </button>
            <button
              type="button"
              (click)="activeTab = 'ownership'"
              [ngClass]="activeTab === 'ownership' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'ownership' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">3</span>
              Ownership & Banking Details
            </button>
            <button
              type="button"
              (click)="activeTab = 'nominee'"
              [ngClass]="activeTab === 'nominee' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'nominee' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">4</span>
              Nominee & Power-of-Attorney (PoA)
            </button>
          </div>

          <form [formGroup]="ownerForm" (ngSubmit)="saveLandowner()" class="space-y-6">
            <!-- TAB 1: PERSONAL & IDENTIFICATION -->
            @if (activeTab === 'personal') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Owner Type -->
                <div>
                  <app-searchable-select
                    label="Owner Type *"
                    formControlName="owner_type"
                    [options]="ownerTypeOptions"
                    placeholder="Select Owner Classification..."
                    [allowCreateNew]="false"
                  ></app-searchable-select>
                </div>

                <!-- Verification Status -->
                <div>
                  <app-searchable-select
                    label="Verification Status *"
                    formControlName="status"
                    [options]="statusOptions"
                    placeholder="Select Status..."
                    [allowCreateNew]="false"
                  ></app-searchable-select>
                </div>

                <!-- Full Name English -->
                <div>
                  <app-custom-input
                    label="Full Name (English) *"
                    formControlName="full_name_en"
                    placeholder="e.g. Alhaj Nurul Islam Chowdhury"
                    [required]="true"
                  ></app-custom-input>
                  @if (ownerForm.get('full_name_en')?.touched && ownerForm.get('full_name_en')?.invalid) {
                    <p class="text-[10px] text-rose-500 mt-1">Full name in English is required.</p>
                  }
                </div>

                <!-- Full Name Bangla -->
                <div>
                  <app-custom-input
                    label="Full Name (বাংলা - Bengali)"
                    formControlName="full_name_bn"
                    placeholder="e.g. আলহাজ্ব নুরুল ইসলাম চৌধুরী"
                  ></app-custom-input>
                </div>

                <!-- Father/Mother/Spouse -->
                <div class="md:col-span-2">
                  <app-custom-input
                    label="Father / Mother / Spouse Name"
                    formControlName="father_mother_spouse_name"
                    placeholder="e.g. Late Abdul Karim Chowdhury"
                  ></app-custom-input>
                </div>

                <!-- NID -->
                <div>
                  <app-custom-input
                    label="National ID (NID Number)"
                    formControlName="nid_number"
                    placeholder="10, 13, or 17 digit NID"
                  ></app-custom-input>
                </div>

                <!-- Passport -->
                <div>
                  <app-custom-input
                    label="Passport Number"
                    formControlName="passport_number"
                    placeholder="e.g. EG1029384"
                  ></app-custom-input>
                </div>

                <!-- e-TIN -->
                <div>
                  <app-custom-input
                    label="e-TIN Number"
                    formControlName="tin_number"
                    placeholder="12 digit Tax ID"
                  ></app-custom-input>
                </div>

                <!-- Company Reg -->
                <div>
                  <app-custom-input
                    label="Company Registration (RJSC / Trade License)"
                    formControlName="company_reg_number"
                    placeholder="If corporate landowner"
                  ></app-custom-input>
                </div>
              </div>
            }

            <!-- TAB 2: CONTACT & ADDRESSES -->
            @if (activeTab === 'contact') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Mobile -->
                <div>
                  <app-custom-input
                    label="Primary Mobile Number"
                    formControlName="phone_number"
                    placeholder="+880 1712 345678"
                  ></app-custom-input>
                </div>

                <!-- Email -->
                <div>
                  <app-custom-input
                    label="Email Address"
                    formControlName="email"
                    type="email"
                    placeholder="owner@domain.com"
                  ></app-custom-input>
                  @if (ownerForm.get('email')?.touched && ownerForm.get('email')?.hasError('email')) {
                    <p class="text-[10px] text-rose-500 mt-1">Please enter a valid email address.</p>
                  }
                </div>

                <!-- Emergency Contact Name -->
                <div>
                  <app-custom-input
                    label="Emergency Contact Name"
                    formControlName="emergency_contact_name"
                    placeholder="Family member / Attorney name"
                  ></app-custom-input>
                </div>

                <!-- Emergency Contact Phone -->
                <div>
                  <app-custom-input
                    label="Emergency Contact Mobile"
                    formControlName="emergency_contact_phone"
                    placeholder="+880 1..."
                  ></app-custom-input>
                </div>

                <!-- Present Address -->
                <div class="md:col-span-2">
                  <app-custom-textarea
                    label="Present / Residential Address"
                    formControlName="present_address"
                    placeholder="House #, Road #, Area, Thana, District"
                    [rows]="2"
                  ></app-custom-textarea>
                </div>

                <!-- Permanent Address -->
                <div class="md:col-span-2">
                  <app-custom-textarea
                    label="Permanent Address (As per NID / Khatian)"
                    formControlName="permanent_address"
                    placeholder="Village, Post Office, Upazila, District"
                    [rows]="2"
                  ></app-custom-textarea>
                </div>
              </div>
            }

            <!-- TAB 3: OWNERSHIP & BANKING DETAILS -->
            @if (activeTab === 'ownership') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <!-- Ownership Nature -->
                  <div>
                    <app-searchable-select
                      label="Ownership Nature *"
                      formControlName="ownership_nature"
                      [options]="ownershipNatureOptions"
                      placeholder="Select Inheritance/Purchase..."
                      [allowCreateNew]="false"
                    ></app-searchable-select>
                  </div>

                  <!-- Ownership Share Ratio -->
                  <div>
                    <app-custom-input
                      label="Ownership Share Ratio (0.0001 to 1.0) *"
                      formControlName="ownership_share_ratio"
                      type="number"
                      placeholder="1.0000 = 100% share"
                      [required]="true"
                    ></app-custom-input>
                    <p class="text-[10px] text-slate-400 mt-1">E.g., 0.5000 represents 50% joint co-ownership.</p>
                  </div>
                </div>

                <!-- Banking Credentials Card -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Restricted Banking Credentials (Signing Money / Land Cost Disbursement)
                    </h4>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <app-custom-input
                        label="Bank Name"
                        formControlName="bank_name"
                        placeholder="e.g. Dutch-Bangla Bank PLC"
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="Branch Name"
                        formControlName="bank_branch"
                        placeholder="e.g. Gulshan Branch"
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="Account Holder Name"
                        formControlName="bank_account_holder"
                        placeholder="Name on bank passbook"
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="Account Number"
                        formControlName="bank_account_no"
                        placeholder="e.g. 115.120.987654"
                      ></app-custom-input>
                    </div>

                    <div>
                      <app-custom-input
                        label="Routing Number"
                        formControlName="bank_routing_no"
                        placeholder="9-digit routing number"
                      ></app-custom-input>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: NOMINEE & POA -->
            @if (activeTab === 'nominee') {
              <div class="space-y-4">
                <!-- Legal Nominee Block -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-blue-500 rounded-full"></span>
                    Legal Nominee Details
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <app-custom-input
                        label="Nominee Name"
                        formControlName="nominee_name"
                        placeholder="Nominee full name"
                      ></app-custom-input>
                    </div>
                    <div>
                      <app-custom-input
                        label="Relation with Landowner"
                        formControlName="nominee_relation"
                        placeholder="Son / Daughter / Spouse"
                      ></app-custom-input>
                    </div>
                    <div>
                      <app-custom-input
                        label="Nominee NID Number"
                        formControlName="nominee_nid"
                        placeholder="NID number"
                      ></app-custom-input>
                    </div>
                  </div>
                </div>

                <!-- Registered Power of Attorney Block -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-amber-500 rounded-full"></span>
                    Registered Power-of-Attorney (PoA) Information
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <app-custom-input
                        label="Authorized PoA Holder Name"
                        formControlName="poa_holder_name"
                        placeholder="Signatory attorney name"
                      ></app-custom-input>
                    </div>
                    <div>
                      <app-custom-input
                        label="PoA Deed Number"
                        formControlName="poa_deed_no"
                        placeholder="Sub-Registry Deed No"
                      ></app-custom-input>
                    </div>
                    <div>
                      <app-custom-input
                        label="Execution Date"
                        formControlName="poa_date"
                        type="date"
                      ></app-custom-input>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Form Navigation & Submit Actions -->
            <div class="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                @if (activeTab !== 'personal') {
                  <button
                    type="button"
                    (click)="goToPreviousTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
                  >
                    &larr; Previous Tab
                  </button>
                }
                @if (activeTab !== 'nominee') {
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
                    <span>{{ isEditMode ? 'Save Profile Changes' : 'Confirm Registration' }}</span>
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
export class LandownerFormComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  editingOwnerId: number | null = null;
  loadedLandownerCode = '';
  isLoading = false;
  isSaving = false;
  activeTab: 'personal' | 'contact' | 'ownership' | 'nominee' = 'personal';

  successMessage = '';
  errorMessage = '';

  ownerTypeOptions: SelectOption[] = [
    { value: 'INDIVIDUAL', label: 'Individual Owner (একক মালিক)' },
    { value: 'JOINT_OWNER', label: 'Joint / Co-Owner (যৌথ অংশীদার)' },
    { value: 'COMPANY', label: 'Corporate / Company (প্রতিষ্ঠান/কোম্পানি)' },
    { value: 'POA_HOLDER', label: 'Power of Attorney Holder (আমমোক্তারনামা গ্রহীতা)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active Verified Title Holder (অনুমোদিত ও সক্রিয় মালিক)' },
    { value: 'UNDER_VERIFICATION', label: 'Under Due Diligence / Verification (যাচাইকরণাধীন)' },
    { value: 'PROSPECT', label: 'Prospective Seller (সম্ভাব্য বিক্রেতা)' },
    { value: 'BLOCKED', label: 'Disputed / Blocked (বিরোধপূর্ণ / স্থগিত)' },
    { value: 'ARCHIVED', label: 'Archived Record (সংরক্ষিত)' }
  ];

  ownershipNatureOptions: SelectOption[] = [
    { value: 'INHERITED', label: 'Inherited / Ancestral (ওয়ারিশ সূত্রে)' },
    { value: 'PURCHASED', label: 'Purchased via Registered Deed (সাব-কবলা দলিল মূলে)' },
    { value: 'GIFT_HEBA', label: 'Gift / Heba Deed (হেবা/দানপত্র মূলে)' },
    { value: 'COURT_DECREE', label: 'Court Decree / Auction (আদালতের রায়/ডিক্রি)' }
  ];

  ownerForm: FormGroup = this.fb.group({
    landowner_code: [''],
    owner_type: ['INDIVIDUAL', Validators.required],
    full_name_en: ['', Validators.required],
    full_name_bn: [''],
    father_mother_spouse_name: [''],
    present_address: [''],
    permanent_address: [''],
    nid_number: [''],
    passport_number: [''],
    company_reg_number: [''],
    tin_number: [''],
    phone_number: [''],
    email: ['', [Validators.email]],
    emergency_contact_name: [''],
    emergency_contact_phone: [''],
    ownership_share_ratio: [1.0000, [Validators.required, Validators.min(0.0001), Validators.max(1.0)]],
    ownership_nature: ['INHERITED', Validators.required],
    bank_name: [''],
    bank_branch: [''],
    bank_account_no: [''],
    bank_routing_no: [''],
    bank_account_holder: [''],
    status: ['ACTIVE', Validators.required],
    nominee_name: [''],
    nominee_relation: [''],
    nominee_nid: [''],
    poa_holder_name: [''],
    poa_deed_no: [''],
    poa_date: ['']
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.editingOwnerId = Number(idParam);
      this.loadLandowner(this.editingOwnerId);
    }
  }

  loadLandowner(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.landService.getLandowner(id).subscribe({
      next: (owner: Landowner) => {
        this.loadedLandownerCode = owner.landowner_code;
        const nominee = owner.nominee_details && owner.nominee_details[0] ? owner.nominee_details[0] : {};
        const poa = owner.poa_details || {};

        this.ownerForm.patchValue({
          landowner_code: owner.landowner_code,
          owner_type: owner.owner_type,
          full_name_en: owner.full_name_en,
          full_name_bn: owner.full_name_bn || '',
          father_mother_spouse_name: owner.father_mother_spouse_name || '',
          present_address: owner.present_address || '',
          permanent_address: owner.permanent_address || '',
          nid_number: owner.nid_number || '',
          passport_number: owner.passport_number || '',
          company_reg_number: owner.company_reg_number || '',
          tin_number: owner.tin_number || '',
          phone_number: owner.phone_number || '',
          email: owner.email || '',
          emergency_contact_name: owner.emergency_contact_name || '',
          emergency_contact_phone: owner.emergency_contact_phone || '',
          ownership_share_ratio: owner.ownership_share_ratio,
          ownership_nature: owner.ownership_nature,
          bank_name: owner.bank_name || '',
          bank_branch: owner.bank_branch || '',
          bank_account_no: owner.bank_account_no || '',
          bank_routing_no: owner.bank_routing_no || '',
          bank_account_holder: owner.bank_account_holder || '',
          status: owner.status,
          nominee_name: nominee['name'] || '',
          nominee_relation: nominee['relation'] || '',
          nominee_nid: nominee['nid'] || '',
          poa_holder_name: poa['holder_name'] || '',
          poa_deed_no: poa['deed_no'] || '',
          poa_date: poa['date'] || ''
        });
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load landowner', err);
        this.errorMessage = err.error?.detail || 'Failed to load landowner details.';
        this.isLoading = false;
      }
    });
  }

  goToPreviousTab(): void {
    if (this.activeTab === 'nominee') this.activeTab = 'ownership';
    else if (this.activeTab === 'ownership') this.activeTab = 'contact';
    else if (this.activeTab === 'contact') this.activeTab = 'personal';
  }

  goToNextTab(): void {
    if (this.activeTab === 'personal') this.activeTab = 'contact';
    else if (this.activeTab === 'contact') this.activeTab = 'ownership';
    else if (this.activeTab === 'ownership') this.activeTab = 'nominee';
  }

  saveLandowner(): void {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields (Owner Type, English Name, Status, Ownership Nature & Share).';
      if (this.ownerForm.get('full_name_en')?.invalid || this.ownerForm.get('owner_type')?.invalid || this.ownerForm.get('status')?.invalid) {
        this.activeTab = 'personal';
      } else if (this.ownerForm.get('ownership_share_ratio')?.invalid || this.ownerForm.get('ownership_nature')?.invalid) {
        this.activeTab = 'ownership';
      }
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    const formVal = this.ownerForm.value;

    const nominee_details = formVal.nominee_name ? [{
      name: formVal.nominee_name,
      relation: formVal.nominee_relation,
      nid: formVal.nominee_nid
    }] : [];

    const poa_details = formVal.poa_holder_name ? {
      holder_name: formVal.poa_holder_name,
      deed_no: formVal.poa_deed_no,
      date: formVal.poa_date
    } : null;

    const payload: Partial<Landowner> = {
      owner_type: formVal.owner_type,
      full_name_en: formVal.full_name_en.trim(),
      full_name_bn: formVal.full_name_bn?.trim() || null,
      father_mother_spouse_name: formVal.father_mother_spouse_name?.trim() || null,
      present_address: formVal.present_address?.trim() || null,
      permanent_address: formVal.permanent_address?.trim() || null,
      nid_number: formVal.nid_number?.trim() || null,
      passport_number: formVal.passport_number?.trim() || null,
      company_reg_number: formVal.company_reg_number?.trim() || null,
      tin_number: formVal.tin_number?.trim() || null,
      phone_number: formVal.phone_number?.trim() || null,
      email: formVal.email?.trim() || null,
      emergency_contact_name: formVal.emergency_contact_name?.trim() || null,
      emergency_contact_phone: formVal.emergency_contact_phone?.trim() || null,
      ownership_share_ratio: Number(formVal.ownership_share_ratio),
      ownership_nature: formVal.ownership_nature,
      bank_name: formVal.bank_name?.trim() || null,
      bank_branch: formVal.bank_branch?.trim() || null,
      bank_account_no: formVal.bank_account_no?.trim() || null,
      bank_routing_no: formVal.bank_routing_no?.trim() || null,
      bank_account_holder: formVal.bank_account_holder?.trim() || null,
      status: formVal.status,
      nominee_details,
      poa_details
    };

    if (this.isEditMode && this.editingOwnerId) {
      this.landService.updateLandowner(this.editingOwnerId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.successMessage = `Landowner "${updated.full_name_en}" (${updated.landowner_code}) updated successfully!`;
        },
        error: (err) => {
          console.error('Update landowner error:', err);
          this.errorMessage = err.error?.detail || 'Failed to update landowner profile.';
          this.isSaving = false;
        }
      });
    } else {
      this.landService.createLandowner(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.loadedLandownerCode = created.landowner_code;
          this.successMessage = `Landowner "${created.full_name_en}" (${created.landowner_code}) registered successfully!`;
        },
        error: (err) => {
          console.error('Create landowner error:', err);
          this.errorMessage = err.error?.detail || 'Failed to register new landowner.';
          this.isSaving = false;
        }
      });
    }
  }

  resetForNew(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.loadedLandownerCode = '';
    this.activeTab = 'personal';
    this.ownerForm.reset({
      landowner_code: '',
      owner_type: 'INDIVIDUAL',
      full_name_en: '',
      full_name_bn: '',
      father_mother_spouse_name: '',
      present_address: '',
      permanent_address: '',
      nid_number: '',
      passport_number: '',
      company_reg_number: '',
      tin_number: '',
      phone_number: '',
      email: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      ownership_share_ratio: 1.0000,
      ownership_nature: 'INHERITED',
      bank_name: '',
      bank_branch: '',
      bank_account_no: '',
      bank_routing_no: '',
      bank_account_holder: '',
      status: 'ACTIVE',
      nominee_name: '',
      nominee_relation: '',
      nominee_nid: '',
      poa_holder_name: '',
      poa_deed_no: '',
      poa_date: ''
    });
  }

  goBack(): void {
    this.router.navigate(['/land/landowners']);
  }
}
