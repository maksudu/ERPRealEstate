import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../../core/services/land.service';
import { LandParcel, Landowner, LandownerParcelLink } from '../../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';

@Component({
  selector: 'app-parcel-form',
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
      <!-- Breadcrumb & Navigation -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs"
          >
            <span>&larr;</span> Back to Parcels Registry
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Module 2.3 — Land Parcel & Location Registry
          </span>
        </div>
      </div>

      <!-- Success Alert Banner -->
      @if (successMessage) {
        <div class="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-2xs" role="status">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="font-medium">{{ successMessage }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="goBack()"
              class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs"
            >
              Back to Parcels List
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
            <svg class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
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
        [title]="isEditMode ? 'Edit Land Parcel (' + (loadedParcelCode || 'ID #' + editingParcelId) + ')' : 'Register New Land Parcel'"
        [subtitle]="isEditMode ? 'Update administrative boundaries, area calculations, legal deed references, and GPS coordinates' : 'Assign to project with automatic unit conversion and legal deed references'"
        [badge]="isEditMode ? 'Edit Mode' : 'New Registration'"
      >
        @if (isLoading) {
          <div class="py-16 text-center text-slate-400 text-xs space-y-2">
            <svg class="animate-spin w-6 h-6 mx-auto text-emerald-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p>Loading parcel details...</p>
          </div>
        } @else {
          <!-- Step Tabs Navigation -->
          <div class="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
            <button
              type="button"
              (click)="activeTab = 'location'"
              [ngClass]="activeTab === 'location' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'location' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'">1</span>
              Site Location & Classification
            </button>
            <button
              type="button"
              (click)="activeTab = 'area'"
              [ngClass]="activeTab === 'area' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'area' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'">2</span>
              Area Calculation Engine
            </button>
            <button
              type="button"
              (click)="activeTab = 'boundaries'"
              [ngClass]="activeTab === 'boundaries' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'boundaries' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'">3</span>
              Cardinal Boundaries & GPS
            </button>
            <button
              type="button"
              (click)="activeTab = 'deed'"
              [ngClass]="activeTab === 'deed' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'deed' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'">4</span>
              Survey & Legal Deed Records
            </button>
            <button
              type="button"
              (click)="activeTab = 'owners'"
              [ngClass]="activeTab === 'owners' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'owners' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 text-slate-600'">5</span>
              Owners & Succession (অংশীদার মালিকানা ও দলিল)
            </button>
          </div>

          <form [formGroup]="parcelForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- TAB 1: SITE LOCATION & CLASSIFICATION -->
            @if (activeTab === 'location') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Project Link / Name *"
                    formControlName="project_name"
                    placeholder="e.g. Twin Tower Project A"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="Parcel ID (Auto if blank)"
                    formControlName="parcel_id"
                    placeholder="e.g. LND-000128"
                  ></app-custom-input>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Acquisition Status *
                    </label>
                    <app-searchable-select
                      [options]="acquisitionStatusOptions"
                      [value]="parcelForm.get('acquisition_status')?.value"
                      (selectionChange)="parcelForm.patchValue({ acquisition_status: $event?.value || $event?.item_code || $event })"
                      placeholder="Select status..."
                    ></app-searchable-select>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Division *"
                    formControlName="division"
                    placeholder="e.g. Dhaka Division"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="District *"
                    formControlName="district"
                    placeholder="e.g. Dhaka"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="Upazila / Thana *"
                    formControlName="upazila_thana"
                    placeholder="e.g. Gulshan"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Mouza Name *"
                    formControlName="mouza_name"
                    placeholder="e.g. Badda Mouza"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="JL Number *"
                    formControlName="jl_number"
                    placeholder="e.g. 215"
                    [required]="true"
                  ></app-custom-input>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Land Classification *
                    </label>
                    <app-searchable-select
                      [options]="classificationOptions"
                      [value]="parcelForm.get('land_classification')?.value"
                      (selectionChange)="parcelForm.patchValue({ land_classification: $event?.value || $event?.item_code || $event })"
                      placeholder="Select classification..."
                    ></app-searchable-select>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: MULTI-UNIT AREA ENGINE -->
            @if (activeTab === 'area') {
              <div class="space-y-4">
                <div class="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-4">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                      </svg>
                      Bangladesh Standard Multi-Unit Land Area Calculation Engine
                    </h4>
                    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">1 Katha = 720 SFT | 1 Decimal = 435.60 SFT | 1 Bigha = 20 Katha</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Input Unit</label>
                      <app-searchable-select
                        [options]="unitOptions"
                        [value]="parcelForm.get('input_unit')?.value"
                        (selectionChange)="onUnitSelect($event)"
                        placeholder="Select unit..."
                      ></app-searchable-select>
                    </div>

                    <app-custom-input
                      label="Input Area Value *"
                      formControlName="input_value"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 20.00"
                      [required]="true"
                      (input)="onAreaInputChange()"
                    ></app-custom-input>
                  </div>

                  <!-- Live Auto Conversion Cards -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center">
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Decimal (শতাংশ)</div>
                      <div class="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ convertedDecimal }}</div>
                    </div>
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Katha (কাঠা)</div>
                      <div class="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ convertedKatha }}</div>
                    </div>
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Square Feet (বর্গফুট)</div>
                      <div class="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ convertedSqft.toLocaleString() }}</div>
                    </div>
                    <div class="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                      <div class="text-[10px] text-slate-400 uppercase font-semibold">Bigha (বিঘা)</div>
                      <div class="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">{{ convertedBigha }}</div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 3: CARDINAL BOUNDARIES & GPS -->
            @if (activeTab === 'boundaries') {
              <div class="space-y-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                    </svg>
                    Demarcation Boundaries (চৌহদ্দি) & Road Access
                  </h4>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <app-custom-input
                      label="North Boundary (উত্তরে সীমানা)"
                      formControlName="boundary_north"
                      placeholder="e.g. 60ft Gulshan Avenue Road frontage"
                    ></app-custom-input>

                    <app-custom-input
                      label="South Boundary (দক্ষিণে সীমানা)"
                      formControlName="boundary_south"
                      placeholder="e.g. Plot 14 - Holding 34/A (Residential)"
                    ></app-custom-input>

                    <app-custom-input
                      label="East Boundary (পূর্বে সীমানা)"
                      formControlName="boundary_east"
                      placeholder="e.g. 20ft internal connecting avenue"
                    ></app-custom-input>

                    <app-custom-input
                      label="West Boundary (পশ্চিমে সীমানা)"
                      formControlName="boundary_west"
                      placeholder="e.g. Plot 12 (Vacant boundary-walled plot)"
                    ></app-custom-input>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <app-custom-input
                      label="Road Access Width (Feet) *"
                      formControlName="road_access_width_ft"
                      type="number"
                      step="0.5"
                      placeholder="e.g. 40.0"
                      [required]="true"
                    ></app-custom-input>

                    <app-custom-input
                      label="GPS Latitude"
                      formControlName="gps_latitude"
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 23.7925"
                    ></app-custom-input>

                    <app-custom-input
                      label="GPS Longitude"
                      formControlName="gps_longitude"
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 90.4078"
                    ></app-custom-input>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: SURVEY & LEGAL DEED RECORDS -->
            @if (activeTab === 'deed') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <app-custom-input
                    label="Khatian Number *"
                    formControlName="khatian_number"
                    placeholder="e.g. RS-8492 / City-1029"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="Dag / Plot Number *"
                    formControlName="dag_number"
                    placeholder="e.g. Dag 4410/4412"
                    [required]="true"
                  ></app-custom-input>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <app-custom-input
                    label="Primary Deed Number"
                    formControlName="deed_number"
                    placeholder="e.g. Saf-Kabala Deed #18420/2025"
                  ></app-custom-input>

                  <app-custom-input
                    label="Deed Date"
                    formControlName="deed_date"
                    type="date"
                  ></app-custom-input>
                </div>

                <app-custom-textarea
                  label="Demarcation Notes & Topography Remarks"
                  formControlName="remarks"
                  placeholder="Demarcation pillars installed, high-tension wire distance, water logging assessment..."
                  [rows]="3"
                ></app-custom-textarea>
              </div>
            }

            <!-- TAB 5: LANDOWNERS & FRACTIONAL OWNERSHIP -->
            @if (activeTab === 'owners') {
              <div class="space-y-6">
                <!-- Info banner -->
                <div class="p-3.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 text-xs">
                  <div class="font-bold flex items-center gap-1.5 mb-1">
                    <svg class="w-4 h-4 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Individual, Joint, Inherited & Company Ownership Registry
                  </div>
                  <p class="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                    একাধিক মালিককে এই প্লটের সাথে যুক্ত করুন অথবা একক মালিক নির্ধারণ করুন। উত্তরাধিকার (Inherited), খরিদ (Purchased), বণ্টননামা (Partition Deed) ইত্যাদির ভিত্তি এবং উত্তরাধিকার/মালিকানা দলিল আপলোড করুন।
                  </p>
                </div>

                <!-- Summary Bar: Total Parcel Area & Allocated Share -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Parcel Total Area</span>
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {{ convertedDecimal }} Dec / {{ convertedKatha }} Katha
                    </span>
                    <span class="text-[10px] text-slate-400 block">{{ convertedSqft.toLocaleString() }} Sq.Ft</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Allocated Share</span>
                    <span class="text-sm font-bold" [ngClass]="totalAllocatedShare() > 100 ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'">
                      {{ totalAllocatedShare().toFixed(2) }}%
                    </span>
                    <span class="text-[10px] text-slate-400 block">{{ stagedOwners.length }} Owner(s) Linked</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Unallocated Share</span>
                    <span class="text-sm font-bold" [ngClass]="(100 - totalAllocatedShare()) < 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'">
                      {{ (100 - totalAllocatedShare()).toFixed(2) }}%
                    </span>
                    <span class="text-[10px] text-slate-400 block">Remaining</span>
                  </div>
                  <div>
                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Distribution Status</span>
                    @if (totalAllocatedShare() === 100) {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        ✓ 100% Fully Distributed
                      </span>
                    } @else if (totalAllocatedShare() > 100) {
                      <span class="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-1">
                        ⚠ Exceeds 100%
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">
                        Partially Allocated
                      </span>
                    }
                  </div>
                </div>

                <!-- Add Owner Section -->
                <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                    <span>+ Link Landowner & Allocate Share (মালিক যুক্ত ও অংশ নির্ধারণ)</span>
                    <span class="text-[10px] text-slate-400 font-normal">Select from registered landowners</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="md:col-span-2">
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Landowner (জমি মালিক) *
                      </label>
                      <app-searchable-select
                        [options]="landownerOptions"
                        [value]="newOwnerId"
                        (selectionChange)="newOwnerId = $event?.value || $event?.item_code || $event"
                        placeholder="Search by Name, NID, or Landowner Code..."
                      ></app-searchable-select>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ownership Nature / Source (মালিকানার সূত্র) *
                      </label>
                      <select
                        [(ngModel)]="newOwnerSource"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="INHERITANCE">ওয়ারিশ সূত্রে (Inherited / Succession)</option>
                        <option value="PURCHASE">খরিদ সূত্রে (Purchased / Saf-Kabala)</option>
                        <option value="PARTITION_DEED">বণ্টননামা সূত্রে (Partition Deed)</option>
                        <option value="GIFT_HEBA">হেবা / দানপত্র সূত্রে (Gift / Heba)</option>
                        <option value="COURT_DECREE">আদালতের ডিক্রি সূত্রে (Court Decree)</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Ownership Share (%) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        [(ngModel)]="newOwnerShare"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                        placeholder="e.g. 50.00"
                      />
                    </div>

                    <div class="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold block">Equivalent Area (হিসেবকৃত জমি)</span>
                      <span class="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        {{ ((convertedDecimal * newOwnerShare) / 100).toFixed(2) }} Dec ({{ ((convertedKatha * newOwnerShare) / 100).toFixed(2) }} Katha)
                      </span>
                    </div>

                    <div>
                      <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Title Deed / Bonton No
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="newOwnerDeedNo"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        placeholder="e.g. Deed #1234/2024"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        (click)="addStagedOwner()"
                        [disabled]="!newOwnerId || newOwnerShare <= 0"
                        class="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                        Add to Parcel
                      </button>
                    </div>
                  </div>

                  <!-- Succession & Title Deed Documents Upload for this link -->
                  <div class="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-2">
                      উত্তরাধিকার ও মালিকানা দলিল (Inherited / Succession / Title Documents)
                    </span>
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div class="md:col-span-5">
                        <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          ডকুমেন্টের নাম (Document Name/Title)
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="newOwnerDocName"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="e.g. ওয়ারিশ সনদ / বণ্টননামা দলিল / বায়না চুক্তি"
                          class="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div class="md:col-span-7">
                        <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          ফাইল আপলোড (Upload File)
                        </label>
                        <div class="flex items-center gap-2">
                          <input
                            type="file"
                            (change)="onDocFileSelected($event)"
                            class="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 hover:file:bg-slate-200 cursor-pointer"
                          />
                          @if (isUploadingDoc) {
                            <span class="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                              <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                              </svg>
                              Uploading...
                            </span>
                          }
                          @if (newOwnerDocFileUrl) {
                            <span class="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              ✓ Uploaded
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Staged / Linked Landowners Table -->
                <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th class="p-3 font-semibold">Landowner</th>
                        <th class="p-3 font-semibold">Ownership Nature</th>
                        <th class="p-3 font-semibold text-right">Share %</th>
                        <th class="p-3 font-semibold text-right">Equivalent Area</th>
                        <th class="p-3 font-semibold">Title Deed / Succession Doc</th>
                        <th class="p-3 font-semibold text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                      @if (stagedOwners.length === 0) {
                        <tr>
                          <td colspan="6" class="p-6 text-center text-slate-400">
                            No owners linked to this parcel yet. You can add one or more owners with fractional shares above.
                          </td>
                        </tr>
                      } @else {
                        @for (owner of stagedOwners; track $index) {
                          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td class="p-3">
                              <div class="font-bold text-slate-800 dark:text-slate-200">
                                {{ owner.landowner_name }}
                              </div>
                              <div class="text-[10px] text-slate-400">
                                Landowner ID: #{{ owner.landowner_id }}
                              </div>
                            </td>
                            <td class="p-3">
                              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                                [ngClass]="{
                                  'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300': owner.ownership_source === 'INHERITANCE',
                                  'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300': owner.ownership_source === 'PURCHASE',
                                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300': owner.ownership_source === 'PARTITION_DEED',
                                  'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300': owner.ownership_source === 'GIFT_HEBA',
                                  'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300': owner.ownership_source === 'COURT_DECREE'
                                }"
                              >
                                {{ getSourceLabel(owner.ownership_source) }}
                              </span>
                            </td>
                            <td class="p-3 text-right font-bold text-slate-800 dark:text-slate-200">
                              {{ owner.ownership_share_percent }}%
                            </td>
                            <td class="p-3 text-right">
                              <div class="font-semibold text-slate-700 dark:text-slate-300">
                                {{ ((convertedDecimal * owner.ownership_share_percent) / 100).toFixed(2) }} Dec
                              </div>
                              <div class="text-[10px] text-slate-400">
                                {{ ((convertedKatha * owner.ownership_share_percent) / 100).toFixed(2) }} Katha
                              </div>
                            </td>
                            <td class="p-3">
                              @if (owner.title_deed_no) {
                                <div class="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                  Deed: {{ owner.title_deed_no }}
                                </div>
                              }
                              @if (owner.doc_url) {
                                <a
                                  [href]="apiBase + owner.doc_url"
                                  target="_blank"
                                  class="text-[11px] font-semibold text-emerald-600 hover:underline inline-flex items-center gap-1"
                                >
                                  📎 {{ owner.doc_name || 'Succession Document' }}
                                </a>
                              } @else if (!owner.title_deed_no) {
                                <span class="text-[10px] text-slate-400">None attached</span>
                              }
                            </td>
                            <td class="p-3 text-center">
                              <button
                                type="button"
                                (click)="removeStagedOwner($index)"
                                class="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                title="Remove owner link"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </td>
                          </tr>
                        }
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- Form Action Footer -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2">
                @if (activeTab !== 'location') {
                  <button
                    type="button"
                    (click)="goToPrevTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    &larr; Previous Step
                  </button>
                }
                @if (activeTab !== 'owners') {
                  <button
                    type="button"
                    (click)="goToNextTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                  >
                    Next Step &rarr;
                  </button>
                }
              </div>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="goBack()"
                  class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  [disabled]="isSaving"
                  class="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition shadow-2xs"
                >
                  @if (isSaving) {
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  }
                  {{ isEditMode ? 'Update Land Parcel' : 'Confirm Registration' }}
                </button>
              </div>
            </div>
          </form>
        }
      </app-card-container>
    </div>
  `
})
export class ParcelFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private landService = inject(LandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  editingParcelId: number | null = null;
  loadedParcelCode = '';
  isLoading = false;
  isSaving = false;

  activeTab: 'location' | 'area' | 'boundaries' | 'deed' | 'owners' = 'location';

  successMessage = '';
  errorMessage = '';

  readonly apiBase = 'http://localhost:8000';
  landowners: Landowner[] = [];
  landownerOptions: SelectOption[] = [];

  stagedOwners: Array<{
    link_id?: number;
    landowner_id: number;
    landowner_name: string;
    ownership_share_percent: number;
    ownership_source: string;
    title_deed_no?: string;
    doc_name?: string;
    doc_url?: string;
  }> = [];

  newOwnerId: number | null = null;
  newOwnerShare: number = 50.0;
  newOwnerSource: string = 'INHERITANCE';
  newOwnerDeedNo: string = '';
  newOwnerDocName: string = '';
  newOwnerDocFileUrl: string = '';
  newOwnerDocFileName: string = '';
  isUploadingDoc: boolean = false;

  // Converted Unit Preview
  convertedDecimal = 20.0;
  convertedKatha = 12.1;
  convertedSqft = 8712.0;
  convertedBigha = 0.605;

  acquisitionStatusOptions: SelectOption[] = [
    { value: 'PROPOSED', label: 'Proposed Parcel (প্রস্তাবিত পার্সেল)' },
    { value: 'UNDER_REVIEW', label: 'Under Review & Legal Vetting (যাচাই-বাছাই চলছে)' },
    { value: 'APPROVED', label: 'Management Approved (অনুমোদিত)' },
    { value: 'ACQUIRED', label: 'Acquired & Fully Registered (অধিগ্রহণকৃত)' }
  ];

  classificationOptions: SelectOption[] = [
    { value: 'RESIDENTIAL', label: 'Residential (আবাসিক)' },
    { value: 'COMMERCIAL', label: 'Commercial (বাণিজ্যিক)' },
    { value: 'AGRICULTURAL', label: 'Agricultural / Nal (কৃষি / নাল)' },
    { value: 'OTHER', label: 'Other / Mixed (মিশ্র)' }
  ];

  unitOptions: SelectOption[] = [
    { value: 'DECIMAL', label: 'Decimal / Shotok (শতাংশ - 435.60 Sq Ft)' },
    { value: 'KATHA', label: 'Katha (কাঠা - 720 Sq Ft)' },
    { value: 'BIGHA', label: 'Bigha (বিঘা - 20 Katha / 14,400 Sq Ft)' },
    { value: 'SQFT', label: 'Square Feet (বর্গফুট)' }
  ];

  parcelForm: FormGroup = this.fb.group({
    parcel_id: [''],
    project_name: ['', Validators.required],
    division: ['Dhaka Division', Validators.required],
    district: ['Dhaka', Validators.required],
    upazila_thana: ['Gulshan', Validators.required],
    mouza_name: ['', Validators.required],
    jl_number: ['', Validators.required],
    khatian_number: ['', Validators.required],
    dag_number: ['', Validators.required],
    land_classification: ['RESIDENTIAL', Validators.required],
    acquisition_status: ['PROPOSED', Validators.required],
    input_unit: ['DECIMAL', Validators.required],
    input_value: [20.0, [Validators.required, Validators.min(0.01)]],
    gps_latitude: [23.7925],
    gps_longitude: [90.4078],
    boundary_north: [''],
    boundary_south: [''],
    boundary_east: [''],
    boundary_west: [''],
    road_access_width_ft: [40.0, [Validators.required, Validators.min(0)]],
    deed_number: [''],
    deed_date: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadLandowners();
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode = true;
      this.editingParcelId = Number(idParam);
      this.loadParcel(this.editingParcelId);
    } else {
      this.recalculateArea(20.0, 'DECIMAL');
    }
  }

  loadParcel(id: number): void {
    this.isLoading = true;
    this.loadParcelOwners(id);
    this.landService.getParcel(id).subscribe({
      next: (parcel: LandParcel) => {
        this.loadedParcelCode = parcel.parcel_id || `ID #${parcel.id}`;
        this.parcelForm.patchValue({
          parcel_id: parcel.parcel_id,
          project_name: parcel.project_name,
          division: parcel.division,
          district: parcel.district,
          upazila_thana: parcel.upazila_thana,
          mouza_name: parcel.mouza_name,
          jl_number: parcel.jl_number,
          khatian_number: parcel.khatian_number,
          dag_number: parcel.dag_number,
          land_classification: parcel.land_classification,
          acquisition_status: parcel.acquisition_status,
          input_unit: 'DECIMAL',
          input_value: parcel.total_area_decimal,
          gps_latitude: parcel.gps_latitude,
          gps_longitude: parcel.gps_longitude,
          boundary_north: parcel.boundary_north || '',
          boundary_south: parcel.boundary_south || '',
          boundary_east: parcel.boundary_east || '',
          boundary_west: parcel.boundary_west || '',
          road_access_width_ft: parcel.road_access_width_ft,
          deed_number: parcel.deed_number || '',
          deed_date: parcel.deed_date || '',
          remarks: parcel.remarks || ''
        });

        this.recalculateArea(Number(parcel.total_area_decimal || 0), 'DECIMAL');
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Failed to load land parcel details.';
        this.isLoading = false;
      }
    });
  }

  onUnitSelect(event: any): void {
    const unit = event?.value || event?.item_code || (typeof event === 'string' ? event : 'DECIMAL');
    this.parcelForm.patchValue({ input_unit: unit });
    this.onAreaInputChange();
  }

  onAreaInputChange(): void {
    const unit = this.parcelForm.get('input_unit')?.value || 'DECIMAL';
    const val = Number(this.parcelForm.get('input_value')?.value || 0);
    this.recalculateArea(val, unit);
  }

  recalculateArea(val: number, unit: string): void {
    if (val <= 0) {
      this.convertedDecimal = 0;
      this.convertedKatha = 0;
      this.convertedSqft = 0;
      this.convertedBigha = 0;
      return;
    }

    let sqft = 0;
    if (unit === 'DECIMAL') {
      sqft = val * 435.6;
      this.convertedDecimal = val;
      this.convertedKatha = Number((sqft / 720).toFixed(2));
      this.convertedBigha = Number(((sqft / 720) / 20).toFixed(3));
      this.convertedSqft = Math.round(sqft * 100) / 100;
    } else if (unit === 'KATHA') {
      sqft = val * 720;
      this.convertedKatha = val;
      this.convertedDecimal = Number((sqft / 435.6).toFixed(2));
      this.convertedBigha = Number((val / 20).toFixed(3));
      this.convertedSqft = Math.round(sqft * 100) / 100;
    } else if (unit === 'BIGHA') {
      sqft = val * 14400;
      this.convertedBigha = val;
      this.convertedKatha = val * 20;
      this.convertedDecimal = Number((sqft / 435.6).toFixed(2));
      this.convertedSqft = Math.round(sqft * 100) / 100;
    } else {
      sqft = val;
      this.convertedSqft = val;
      this.convertedDecimal = Number((val / 435.6).toFixed(2));
      this.convertedKatha = Number((val / 720).toFixed(2));
      this.convertedBigha = Number(((val / 720) / 20).toFixed(3));
    }
  }

  goToPrevTab(): void {
    if (this.activeTab === 'owners') this.activeTab = 'deed';
    else if (this.activeTab === 'deed') this.activeTab = 'boundaries';
    else if (this.activeTab === 'boundaries') this.activeTab = 'area';
    else if (this.activeTab === 'area') this.activeTab = 'location';
  }

  goToNextTab(): void {
    if (this.activeTab === 'location') this.activeTab = 'area';
    else if (this.activeTab === 'area') this.activeTab = 'boundaries';
    else if (this.activeTab === 'boundaries') this.activeTab = 'deed';
    else if (this.activeTab === 'deed') this.activeTab = 'owners';
  }

  loadLandowners(): void {
    this.landService.getLandowners().subscribe({
      next: (list) => {
        this.landowners = list;
        this.landownerOptions = list.map(l => ({
          value: l.id,
          label: `${l.full_name_en} (${l.landowner_code}) — ${l.owner_type} — NID: ${l.nid_number || 'N/A'}`
        }));
      },
      error: () => {}
    });
  }

  loadParcelOwners(parcelId: number): void {
    this.landService.getParcelOwners(parcelId).subscribe({
      next: (links) => {
        this.stagedOwners = links.map(link => {
          let docName = '';
          let docUrl = '';
          if (link.dispute_remarks) {
            try {
              const parsed = JSON.parse(link.dispute_remarks);
              docName = parsed.doc_name || '';
              docUrl = parsed.doc_url || '';
            } catch {
              // not json
            }
          }
          return {
            link_id: link.id,
            landowner_id: link.landowner_id,
            landowner_name: link.landowner?.full_name_en || `Landowner #${link.landowner_id}`,
            ownership_share_percent: Number(link.ownership_share_percent || 0),
            ownership_source: link.ownership_source || 'INHERITANCE',
            title_deed_no: link.title_deed_no,
            doc_name: docName,
            doc_url: docUrl
          };
        });
      },
      error: () => {}
    });
  }

  onDocFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingDoc = true;
    this.landService.uploadLandownerDocument(file, this.newOwnerDocName).subscribe({
      next: (res) => {
        this.newOwnerDocFileUrl = res.file_url;
        this.newOwnerDocFileName = res.file_name;
        this.isUploadingDoc = false;
      },
      error: (err) => {
        alert(err.error?.detail || err.message || 'Upload failed');
        this.isUploadingDoc = false;
      }
    });
  }

  addStagedOwner(): void {
    if (!this.newOwnerId || this.newOwnerShare <= 0) return;

    const matchedOwner = this.landowners.find(l => l.id === Number(this.newOwnerId));
    const ownerName = matchedOwner ? matchedOwner.full_name_en : `Landowner #${this.newOwnerId}`;

    this.stagedOwners.push({
      landowner_id: Number(this.newOwnerId),
      landowner_name: ownerName,
      ownership_share_percent: Number(this.newOwnerShare),
      ownership_source: this.newOwnerSource,
      title_deed_no: this.newOwnerDeedNo.trim() || undefined,
      doc_name: this.newOwnerDocName.trim() || this.newOwnerDocFileName || undefined,
      doc_url: this.newOwnerDocFileUrl || undefined
    });

    this.newOwnerId = null;
    this.newOwnerShare = 50.0;
    this.newOwnerDeedNo = '';
    this.newOwnerDocName = '';
    this.newOwnerDocFileUrl = '';
    this.newOwnerDocFileName = '';
  }

  removeStagedOwner(index: number): void {
    const owner = this.stagedOwners[index];
    if (owner.link_id && this.editingParcelId) {
      if (confirm('Are you sure you want to unlink this owner from this parcel?')) {
        this.landService.unlinkOwnerFromParcel(this.editingParcelId, owner.link_id).subscribe({
          next: () => {
            this.stagedOwners.splice(index, 1);
          },
          error: (err) => {
            alert(err.error?.detail || 'Failed to unlink owner');
          }
        });
      }
    } else {
      this.stagedOwners.splice(index, 1);
    }
  }

  totalAllocatedShare(): number {
    return this.stagedOwners.reduce((sum, o) => sum + (Number(o.ownership_share_percent) || 0), 0);
  }

  getSourceLabel(source: string): string {
    switch (source) {
      case 'INHERITANCE': return 'ওয়ারিশ সূত্রে (Inherited)';
      case 'PURCHASE': return 'খরিদ সূত্রে (Purchased)';
      case 'PARTITION_DEED': return 'বণ্টননামা (Partition Deed)';
      case 'GIFT_HEBA': return 'হেবা / দানপত্র (Gift)';
      case 'COURT_DECREE': return 'আদালতের ডিক্রি (Court Decree)';
      default: return source;
    }
  }

  private syncOwners(parcelId: number): void {
    const pendingOwners = this.stagedOwners.filter(o => !o.link_id);
    for (const owner of pendingOwners) {
      this.landService.linkOwnerToParcel(parcelId, {
        landowner_id: owner.landowner_id,
        ownership_share_percent: owner.ownership_share_percent,
        ownership_source: owner.ownership_source,
        title_deed_no: owner.title_deed_no,
        dispute_remarks: owner.doc_url ? JSON.stringify({
          doc_name: owner.doc_name || 'Succession Document',
          doc_url: owner.doc_url
        }) : undefined
      }).subscribe({
        next: (createdLink) => {
          owner.link_id = createdLink.id;
        },
        error: () => {}
      });
    }
  }

  onSubmit(): void {
    if (this.parcelForm.invalid) {
      this.parcelForm.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields marked with * before submitting.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = this.parcelForm.value;
    const payload: any = {
      project_name: formVal.project_name.trim(),
      division: formVal.division,
      district: formVal.district,
      upazila_thana: formVal.upazila_thana,
      mouza_name: formVal.mouza_name.trim(),
      jl_number: formVal.jl_number.trim(),
      khatian_number: formVal.khatian_number.trim(),
      dag_number: formVal.dag_number.trim(),
      land_classification: formVal.land_classification,
      acquisition_status: formVal.acquisition_status,
      input_unit: formVal.input_unit,
      input_value: Number(formVal.input_value),
      total_area_decimal: this.convertedDecimal,
      total_area_katha: this.convertedKatha,
      total_area_bigha: this.convertedBigha,
      total_area_sqft: this.convertedSqft,
      gps_latitude: formVal.gps_latitude ? Number(formVal.gps_latitude) : null,
      gps_longitude: formVal.gps_longitude ? Number(formVal.gps_longitude) : null,
      boundary_north: formVal.boundary_north ? formVal.boundary_north.trim() : null,
      boundary_south: formVal.boundary_south ? formVal.boundary_south.trim() : null,
      boundary_east: formVal.boundary_east ? formVal.boundary_east.trim() : null,
      boundary_west: formVal.boundary_west ? formVal.boundary_west.trim() : null,
      road_access_width_ft: Number(formVal.road_access_width_ft || 40.0),
      deed_number: formVal.deed_number ? formVal.deed_number.trim() : null,
      deed_date: formVal.deed_date || null,
      remarks: formVal.remarks ? formVal.remarks.trim() : null
    };

    if (formVal.parcel_id && formVal.parcel_id.trim()) {
      payload.parcel_id = formVal.parcel_id.trim();
    }

    if (this.isEditMode && this.editingParcelId) {
      this.landService.updateParcel(this.editingParcelId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.loadedParcelCode = updated.parcel_id;
          this.syncOwners(updated.id);
          this.successMessage = `Land parcel ${updated.parcel_id} successfully updated!`;
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Failed to update land parcel.';
        }
      });
    } else {
      this.landService.createParcel(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.loadedParcelCode = created.parcel_id;
          this.syncOwners(created.id);
          this.successMessage = `Land parcel ${created.parcel_id} successfully registered!`;
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Failed to register land parcel.';
        }
      });
    }
  }

  resetForNew(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.activeTab = 'location';
    this.stagedOwners = [];
    this.parcelForm.reset({
      parcel_id: '',
      project_name: '',
      division: 'Dhaka Division',
      district: 'Dhaka',
      upazila_thana: 'Gulshan',
      mouza_name: '',
      jl_number: '',
      khatian_number: '',
      dag_number: '',
      land_classification: 'RESIDENTIAL',
      acquisition_status: 'PROPOSED',
      input_unit: 'DECIMAL',
      input_value: 20.0,
      gps_latitude: 23.7925,
      gps_longitude: 90.4078,
      boundary_north: '',
      boundary_south: '',
      boundary_east: '',
      boundary_west: '',
      road_access_width_ft: 40.0,
      deed_number: '',
      deed_date: '',
      remarks: ''
    });
    this.recalculateArea(20.0, 'DECIMAL');
  }

  goBack(): void {
    this.router.navigate(['/land/parcels']);
  }
}
