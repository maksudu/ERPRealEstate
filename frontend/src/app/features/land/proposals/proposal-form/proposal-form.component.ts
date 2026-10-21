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

export interface ProposalOwnerDocItem {
  document_name: string;
  file?: File;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  extension?: string;
  is_uploading?: boolean;
  uploaded?: boolean;
  error?: string;
}

export interface ProposalOwnerItem {
  owner_type: 'INDIVIDUAL' | 'JOINT_OWNER' | 'COMPANY' | 'POA_HOLDER';
  ownership_nature: 'INHERITED' | 'PURCHASED' | 'GIFT_HEBA' | 'COURT_DECREE';
  full_name_en: string;
  full_name_bn?: string;
  father_name?: string;
  phone_number?: string;
  nid_number?: string;
  ownership_share_ratio: number;
  supporting_documents: ProposalOwnerDocItem[];
}

export interface ProposalMilestoneItem {
  milestone_name: string;
  due_date: string;
  amount_bdt: number;
  percentage: number;
  voucher_ref?: string;
  bank_tx_ref?: string;
  payment_status: 'PLANNED' | 'PAID' | 'OVERDUE';
}

export interface TowerAllocationItem {
  tower_or_project_name: string;
  allocation_percent: number;
  allocated_amount_bdt: number;
}

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
            <button
              type="button"
              (click)="activeTab = 'commercial'"
              [ngClass]="activeTab === 'commercial' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'commercial' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">4</span>
              Valuation & Acquisition Cost
            </button>
            <button
              type="button"
              (click)="activeTab = 'milestones'"
              [ngClass]="activeTab === 'milestones' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'milestones' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">5</span>
              Payments, Budget & Towers
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

            <!-- TAB 3: LANDOWNERS & FRACTIONAL SHARE ALLOCATION -->
            @if (activeTab === 'landowner') {
              <div class="space-y-5">
                <!-- Header & Add Owner Action -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span class="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
                        Landowner(s) & Co-Owners Ownership Allocation (ভূমির মালিকানা ও অংশীদার বিবরণ)
                      </h4>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        একক (Individual), যৌথ (Joint), ওয়ারিশ (Inherited) ও প্রাতিষ্ঠানিক (Company) মালিকানা ও উত্তরাধিকার দলিলপত্র
                      </p>
                    </div>

                    <button
                      type="button"
                      (click)="addOwner()"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto shrink-0"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      + Add Co-Owner / Landowner
                    </button>
                  </div>

                  <!-- Share Calculation Summary Bar -->
                  <div class="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-3">
                      <span class="text-slate-500 font-medium">Total Plot:</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200 font-mono">{{ calculatedDecimal }} Decimal ({{ calculatedSqft.toLocaleString() }} SFT)</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <span class="text-slate-500 font-medium">Allocated Share:</span>
                      <span
                        class="px-2 py-0.5 rounded font-mono font-bold text-xs"
                        [ngClass]="getTotalSharePercent() === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'"
                      >
                        {{ getTotalSharePercent() }}%
                      </span>
                      @if (getTotalSharePercent() !== 100) {
                        <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          (Warning: Total share should ideally be 100%)
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Owners List -->
                <div class="space-y-4">
                  @for (owner of proposalOwners; track $index; let oIdx = $index) {
                    <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
                      <!-- Owner Header -->
                      <div class="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center justify-center">
                            {{ oIdx + 1 }}
                          </span>
                          <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {{ owner.full_name_en || 'Landowner / Co-Owner #' + (oIdx + 1) }}
                          </span>
                          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {{ owner.owner_type }}
                          </span>
                          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {{ owner.ownership_nature }}
                          </span>
                        </div>

                        <div class="flex items-center gap-2">
                          <!-- Live Area Share Badge -->
                          <div class="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Share: {{ (owner.ownership_share_ratio * 100).toFixed(1) }}% = {{ getOwnerEquivalentDecimal(owner) }} Dec ({{ getOwnerEquivalentKatha(owner) }} Katha)
                          </div>

                          @if (proposalOwners.length > 1) {
                            <button
                              type="button"
                              (click)="removeOwner(oIdx)"
                              class="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Remove Owner"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          }
                        </div>
                      </div>

                      <!-- Owner Form Fields Grid -->
                      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Landowner Full Name (English) *
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="owner.full_name_en"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="e.g. Md. Ruhul Amin"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Owner Type (মালিকানার ধরণ) *
                          </label>
                          <select
                            [(ngModel)]="owner.owner_type"
                            [ngModelOptions]="{standalone: true}"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="INDIVIDUAL">Individual Owner (একক মালিক)</option>
                            <option value="JOINT_OWNER">Joint / Co-Owner (যৌথ অংশীদার)</option>
                            <option value="COMPANY">Company / Corporate (প্রতিষ্ঠান)</option>
                            <option value="POA_HOLDER">Power of Attorney (আমমোক্তারনামা গ্রহীতা)</option>
                          </select>
                        </div>

                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Ownership Nature (উৎস) *
                          </label>
                          <select
                            [(ngModel)]="owner.ownership_nature"
                            [ngModelOptions]="{standalone: true}"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="INHERITED">Inherited / Ancestral (ওয়ারিশ সূত্রে)</option>
                            <option value="PURCHASED">Purchased Deed (সাব-কবলা সূত্রে)</option>
                            <option value="GIFT_HEBA">Gift / Heba Deed (হেবা/দানপত্র)</option>
                            <option value="COURT_DECREE">Court Decree / Auction (আদালতের ডিক্রি)</option>
                          </select>
                        </div>

                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Ownership Share (%) *
                          </label>
                          <div class="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              [value]="(owner.ownership_share_ratio * 100).toFixed(2)"
                              (input)="onOwnerShareInput(owner, $event)"
                              placeholder="100"
                              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-7 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span class="absolute right-2.5 top-1.5 text-slate-400 font-bold text-xs">%</span>
                          </div>
                        </div>

                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="owner.phone_number"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="+880 1..."
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            National ID / Reg No
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="owner.nid_number"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="NID or Company Reg"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div class="sm:col-span-2">
                          <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Father / Mother / Representative Name
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="owner.father_name"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="Paternal/representative details"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <!-- Inherited Ownership & Succession Documents -->
                      <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Inherited Ownership & Succession Documents (উত্তরাধিকার, ওয়ারিশ সনদ ও দলিলপত্র)
                          </span>
                          <button
                            type="button"
                            (click)="addOwnerDoc(oIdx)"
                            class="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            + Add Document
                          </button>
                        </div>

                        <div class="space-y-2">
                          @for (doc of owner.supporting_documents; track $index; let dIdx = $index) {
                            <div class="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <div class="flex-1">
                                <input
                                  type="text"
                                  [(ngModel)]="doc.document_name"
                                  [ngModelOptions]="{standalone: true}"
                                  placeholder="Document Name (e.g. Warishnamah / Partition Deed / Succession Certificate)"
                                  class="w-full px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                                />
                              </div>

                              <div class="flex items-center gap-2 shrink-0">
                                <input
                                  #proposalDocInput
                                  type="file"
                                  class="hidden"
                                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                                  (change)="onOwnerDocFileSelected(oIdx, dIdx, $event)"
                                />
                                <button
                                  type="button"
                                  (click)="proposalDocInput.click()"
                                  [disabled]="doc.is_uploading"
                                  class="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  @if (doc.is_uploading) {
                                    <svg class="animate-spin w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                                    <span>Uploading...</span>
                                  } @else {
                                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                                    <span>{{ doc.file_url ? 'Change File' : 'Upload File' }}</span>
                                  }
                                </button>

                                @if (doc.file_url) {
                                  <a
                                    [href]="doc.file_url.startsWith('http') ? doc.file_url : apiBase + doc.file_url"
                                    target="_blank"
                                    class="text-xs text-blue-600 hover:underline truncate max-w-[140px]"
                                    [title]="doc.file_name || 'View file'"
                                  >
                                    {{ doc.file_name || 'View Doc' }}
                                  </a>
                                  <span class="text-[10px] text-emerald-600 font-bold">✓</span>
                                }

                                <button
                                  type="button"
                                  (click)="removeOwnerDoc(oIdx, dIdx)"
                                  class="p-1 text-slate-400 hover:text-red-500 transition"
                                  title="Remove Document"
                                >
                                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                </button>
                              </div>
                            </div>
                          }

                          @if (owner.supporting_documents.length === 0) {
                            <p class="text-[11px] text-slate-400 italic">No succession or title documents attached for this co-owner.</p>
                          }
                        </div>
                      </div>
                    </div>
                  }
                </div>

                <!-- Broker / Opportunity Source Details -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Source & Broker Facilitation Details (ব্রোকার/সূত্র বিবরণ)
                  </h4>
                  <app-custom-input
                    label="Source Contact Details (Broker / Agent)"
                    formControlName="source_contact_details"
                    placeholder="e.g. Modern Land Brokerage, Contact: Mr. Aminul +880 1812..."
                  ></app-custom-input>
                </div>
              </div>
            }

            <!-- TAB 4: COMMERCIAL PRICING, VALUATION & ACQUISITION COST ENGINE -->
            @if (activeTab === 'commercial') {
              <div class="space-y-6">
                <!-- Example & Prompt Alignment Banner -->
                <div class="p-4 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 text-xs shadow-2xs">
                  <div class="font-bold flex items-center gap-2 mb-1">
                    <svg class="w-4 h-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Acquisition Costing & Multi-Unit Valuation Engine
                  </div>
                  <p class="text-[11px] leading-relaxed text-sky-800 dark:text-sky-300">
                    💡 <span class="font-bold">Example:</span> If a developer acquires 100 decimals at ৳10 lakh per decimal, the base land purchase price is ৳10 crore. Registration, legal, survey and other eligible acquisition costs can be recorded separately to calculate the approved total acquisition cost.
                  </p>
                </div>

                <!-- 1. Commercial Pricing & Land Value Calculation -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. Landowner Asking Price & Negotiated Purchase Value (ক্রয়মূল্য ও দরকষাকষি)
                    </span>
                    <span class="text-[11px] text-emerald-600 font-semibold">
                      Total Area: {{ calculatedDecimal }} Dec / {{ (calculatedSqft / 720).toFixed(2) }} Katha
                    </span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Initial Asking Price (জমির মালিকের চাওয়া দাম) ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="askingPriceTotal"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="e.g. 120000000"
                        class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Pricing Basis (দর নির্ধারণের ভিত্তি) *
                      </label>
                      <select
                        [(ngModel)]="pricingBasis"
                        [ngModelOptions]="{standalone: true}"
                        (change)="onPricingParamChange()"
                        class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="DECIMAL">Price per Decimal (প্রতি শতাংশ দর)</option>
                        <option value="KATHA">Price per Katha (প্রতি কাঠা দর)</option>
                        <option value="SQFT">Price per Sq.Ft (প্রতি বর্গফুট দর)</option>
                        <option value="LUMPSUM">Total Lump-Sum (এককালীন মোট)</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Rate per Unit (একক প্রতি দর) ৳ *
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="unitPriceRate"
                        [ngModelOptions]="{standalone: true}"
                        (input)="onPricingParamChange()"
                        placeholder="e.g. 1000000 (10 Lakh/Dec)"
                        class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold text-emerald-700 dark:text-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Negotiated Purchase Price (চূড়ান্ত ক্রয়মূল্য) ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="negotiatedPrice"
                        [ngModelOptions]="{standalone: true}"
                        (input)="onNegotiatedPriceChange()"
                        placeholder="Auto calculated or custom"
                        class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <!-- Live Unit Rate Indicators -->
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      <span class="text-[10px] uppercase font-semibold text-slate-500 block">Rate per Decimal</span>
                      <span class="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        ৳ {{ getCostPerDecimal().toLocaleString() }}
                      </span>
                    </div>
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      <span class="text-[10px] uppercase font-semibold text-slate-500 block">Rate per Katha</span>
                      <span class="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        ৳ {{ getCostPerKatha().toLocaleString() }}
                      </span>
                    </div>
                    <div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                      <span class="text-[10px] uppercase font-semibold text-slate-500 block">Rate per Square Foot</span>
                      <span class="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                        ৳ {{ getCostPerSqft().toLocaleString() }}
                      </span>
                    </div>
                    <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
                      <span class="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">Base Land Consideration</span>
                      <span class="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                        {{ formatCroreLakh(getBaseLandCost()) }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 2. Government & Independent Surveyor Valuation -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div class="text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
                    2. Government Mouza Valuation & Independent Surveyor Assessment (সরকারি ও নিরপেক্ষ মূল্যায়ন)
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- Government Valuation Sub-Card -->
                    <div class="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        🏛️ Government Mouza Rate & Records
                      </span>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Govt Mouza Rate / Decimal ৳
                          </label>
                          <input
                            type="number"
                            [(ngModel)]="govtMouzaRatePerDecimal"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="e.g. 250000"
                            class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Govt Total Valuation ৳
                          </label>
                          <div class="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold font-mono text-slate-700 dark:text-slate-200">
                            {{ formatCroreLakh(getGovtValuationTotal()) }}
                          </div>
                        </div>
                      </div>

                      <div class="space-y-1.5 pt-1">
                        <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          সরকারি মৌজা দলিল / সার্টিফাইড রেকর্ড
                        </label>
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [(ngModel)]="govtDocName"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="ডকুমেন্টের নাম (e.g. গুলশান মৌজা রেট সার্কুলার)"
                            class="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="file"
                            (change)="onGovtDocSelected($event)"
                            class="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 cursor-pointer"
                          />
                        </div>
                        @if (isUploadingGovtDoc) {
                          <span class="text-[10px] text-emerald-600 font-medium">Uploading govt record...</span>
                        }
                        @if (govtDocUrl) {
                          <span class="text-[10px] text-emerald-600 font-semibold block">✓ Document Attached: {{ govtDocFileName || govtDocName }}</span>
                        }
                      </div>
                    </div>

                    <!-- Independent Valuation Sub-Card -->
                    <div class="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
                        📐 Independent Surveyor & Valuation Assessment
                      </span>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Surveyor / Valuation Company
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="assessorCompany"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="e.g. S. K. Surveyors & Valuers"
                            class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Independent Valuation Total ৳
                          </label>
                          <input
                            type="number"
                            [(ngModel)]="independentValuationTotal"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="e.g. 98000000"
                            class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold"
                          />
                        </div>
                      </div>

                      <div class="space-y-1.5 pt-1">
                        <label class="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          নিরপেক্ষ সার্ভে ও মূল্যায়ন রিপোর্ট (Surveyor Report)
                        </label>
                        <div class="flex items-center gap-2">
                          <input
                            type="text"
                            [(ngModel)]="independentDocName"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="ডকুমেন্টের নাম (e.g. সাইট সার্ভে ও ভ্যালুয়েশন রিপোর্ট)"
                            class="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                          />
                          <input
                            type="file"
                            (change)="onIndependentDocSelected($event)"
                            class="text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 cursor-pointer"
                          />
                        </div>
                        @if (isUploadingIndependentDoc) {
                          <span class="text-[10px] text-emerald-600 font-medium">Uploading survey report...</span>
                        }
                        @if (independentDocUrl) {
                          <span class="text-[10px] text-emerald-600 font-semibold block">✓ Report Attached: {{ independentDocFileName || independentDocName }}</span>
                        }
                      </div>
                    </div>
                  </div>

                  <!-- Valuation Workflow & Approval Bar -->
                  <div class="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                    <span class="text-xs font-bold text-amber-900 dark:text-amber-300 block">
                      Valuation History & Approval Workflow (মূল্যায়ন অনুমোদন প্রক্রিয়া)
                    </span>
                    <div class="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label class="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Approval Status
                        </label>
                        <select
                          [(ngModel)]="valuationStatus"
                          [ngModelOptions]="{standalone: true}"
                          class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        >
                          <option value="DRAFT">DRAFT (খসড়া মূল্যায়ন)</option>
                          <option value="SUBMITTED">SUBMITTED (পর্যালোচনায়)</option>
                          <option value="APPROVED">APPROVED (অনুমোদিত)</option>
                          <option value="REJECTED">REJECTED (প্রত্যাখ্যাত)</option>
                        </select>
                      </div>

                      <div>
                        <label class="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Approved By (অনুমোদনকারী)
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="valuationApprovedBy"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="e.g. Managing Director / Land Board"
                          class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label class="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Approval Date
                        </label>
                        <input
                          type="date"
                          [(ngModel)]="valuationApprovalDate"
                          [ngModelOptions]="{standalone: true}"
                          class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label class="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Approval Remarks
                        </label>
                        <input
                          type="text"
                          [(ngModel)]="valuationApprovalRemarks"
                          [ngModelOptions]="{standalone: true}"
                          placeholder="Recommended based on Mouza Rate"
                          class="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 3. Itemized Eligible Acquisition Costs -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                      3. Itemized Registration, Legal, Survey & Brokerage Expenses (অধিগ্রহণ ও রেজিস্ট্রেশন খরচাদি)
                    </span>
                    <button
                      type="button"
                      (click)="autoEstimateExpenses()"
                      class="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                    >
                      ⚡ Auto Estimate BD Duties (1% Reg + 1.5% Stamp + 3% Gain Tax)
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Registration Fees (রেজিস্ট্রেশন ফি) ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="registrationFee"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 1000000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Stamp Duty (স্ট্যাম্প ডিউটি) ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="stampDuty"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 1500000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Capital Gain Tax & AIT / LG Tax ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="gainTaxAit"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 3000000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Legal Vetting & Search Fees ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="legalVettingFee"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 150000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Digital Survey & Demarcation ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="digitalSurveyFee"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 75000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Documentation & Deed Typing ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="documentationTypingFee"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 50000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Brokerage & Media Commission ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="brokerageCommission"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 500000"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Acquisition Misc & Contingency ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="miscAcquisitionCost"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-mono"
                        placeholder="e.g. 100000"
                      />
                    </div>
                  </div>

                  <!-- Itemized Expenses Subtotal -->
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs">
                    <span class="text-slate-600 dark:text-slate-400 font-medium">Total Itemized Acquisition Expenses (নিবন্ধন ও আনুষঙ্গিক খরচ):</span>
                    <span class="font-bold font-mono text-slate-800 dark:text-slate-100">
                      {{ formatCroreLakh(getTotalExpenses()) }} (৳ {{ getTotalExpenses().toLocaleString() }})
                    </span>
                  </div>
                </div>

                <!-- 4. Approved Total Acquisition Cost Summary Bar -->
                <div class="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md space-y-2">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span class="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold block">
                        Approved Total Acquisition Cost (অনুমোদিত সর্বমোট অধিগ্রহণ ব্যয়)
                      </span>
                      <span class="text-xl sm:text-2xl font-extrabold tracking-tight">
                        {{ formatCroreLakh(getTotalAcquisitionCost()) }}
                      </span>
                      <span class="text-xs text-emerald-100 ml-2 font-mono">
                        (৳ {{ getTotalAcquisitionCost().toLocaleString() }})
                      </span>
                    </div>

                    <div class="text-right text-xs space-y-0.5">
                      <div class="text-emerald-100">Base Land Price: <span class="font-bold text-white">{{ formatCroreLakh(getBaseLandCost()) }}</span></div>
                      <div class="text-emerald-100">Eligible Expenses: <span class="font-bold text-white">{{ formatCroreLakh(getTotalExpenses()) }}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 5: PAYMENTS, BUDGET, VOUCHERS & TOWER ALLOCATION -->
            @if (activeTab === 'milestones') {
              <div class="space-y-6">
                <!-- 1. Booking Advance & Earnest Money -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                      1. Booking Advance & Earnest Money (বায়না বাবদ বুকিং অগ্রিম)
                    </span>
                    <span class="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                      [ngClass]="bookingAdvanceStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'"
                    >
                      {{ bookingAdvanceStatus === 'PAID' ? '✓ Advance Paid' : 'Pending Advance' }}
                    </span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Advance Amount ৳ *
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="bookingAdvanceBdt"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="e.g. 5000000"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Payment / Due Date
                      </label>
                      <input
                        type="date"
                        [(ngModel)]="bookingAdvanceDate"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Payment Voucher Ref
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="bookingAdvanceVoucherRef"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="e.g. PV-2026-ADV-001"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Bank Transaction / Cheque Ref
                      </label>
                      <input
                        type="text"
                        [(ngModel)]="bookingAdvanceBankTxRef"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="e.g. BRAC Bank Chq #482910"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Payment Status
                      </label>
                      <select
                        [(ngModel)]="bookingAdvanceStatus"
                        [ngModelOptions]="{standalone: true}"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-semibold"
                      >
                        <option value="PLANNED">PLANNED (পরিকল্পিত)</option>
                        <option value="PAID">PAID (পরিশোধিত)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- 2. Installment & Milestone-Based Landowner Payment Schedule -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        2. Milestone & Installment Payment Schedule (কিস্তি ও মাইলস্টোন শিডিউল)
                      </span>
                      <span class="text-[10px] text-slate-400">
                        Total Scheduled: {{ formatCroreLakh(getTotalScheduledMilestones()) }}
                      </span>
                    </div>

                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        (click)="recalculateMilestones()"
                        class="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition"
                      >
                        🔄 Recalculate from Total Cost
                      </button>
                      <button
                        type="button"
                        (click)="addPaymentMilestone()"
                        class="px-2.5 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-2xs"
                      >
                        + Add Milestone
                      </button>
                    </div>
                  </div>

                  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th class="p-2.5 font-semibold">Milestone Event / Trigger</th>
                          <th class="p-2.5 font-semibold w-24">Share %</th>
                          <th class="p-2.5 font-semibold">Amount (BDT)</th>
                          <th class="p-2.5 font-semibold">Due Date</th>
                          <th class="p-2.5 font-semibold">Voucher & Bank Ref</th>
                          <th class="p-2.5 font-semibold w-28">Status</th>
                          <th class="p-2.5 font-semibold text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        @for (m of paymentMilestones; track $index) {
                          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td class="p-2">
                              <input
                                type="text"
                                [(ngModel)]="m.milestone_name"
                                [ngModelOptions]="{standalone: true}"
                                class="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td class="p-2">
                              <div class="flex items-center gap-1">
                                <input
                                  type="number"
                                  [(ngModel)]="m.percentage"
                                  [ngModelOptions]="{standalone: true}"
                                  (input)="onMilestonePercentChange(m)"
                                  class="w-16 px-1.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono"
                                />
                                <span class="text-slate-400">%</span>
                              </div>
                            </td>
                            <td class="p-2">
                              <input
                                type="number"
                                [(ngModel)]="m.amount_bdt"
                                [ngModelOptions]="{standalone: true}"
                                class="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold font-mono"
                              />
                            </td>
                            <td class="p-2">
                              <input
                                type="date"
                                [(ngModel)]="m.due_date"
                                [ngModelOptions]="{standalone: true}"
                                class="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                              />
                            </td>
                            <td class="p-2">
                              <div class="space-y-1">
                                <input
                                  type="text"
                                  [(ngModel)]="m.voucher_ref"
                                  [ngModelOptions]="{standalone: true}"
                                  placeholder="Voucher #"
                                  class="w-full px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                />
                                <input
                                  type="text"
                                  [(ngModel)]="m.bank_tx_ref"
                                  [ngModelOptions]="{standalone: true}"
                                  placeholder="Bank Cheque / Tx #"
                                  class="w-full px-2 py-0.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                />
                              </div>
                            </td>
                            <td class="p-2">
                              <select
                                [(ngModel)]="m.payment_status"
                                [ngModelOptions]="{standalone: true}"
                                class="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                                [ngClass]="{
                                  'text-emerald-600': m.payment_status === 'PAID',
                                  'text-amber-600': m.payment_status === 'PLANNED',
                                  'text-rose-600': m.payment_status === 'OVERDUE'
                                }"
                              >
                                <option value="PLANNED">PLANNED</option>
                                <option value="PAID">PAID</option>
                                <option value="OVERDUE">OVERDUE</option>
                              </select>
                            </td>
                            <td class="p-2 text-center">
                              <button
                                type="button"
                                (click)="removePaymentMilestone($index)"
                                class="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="Delete Milestone"
                              >
                                &times;
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  <!-- Outstanding & Due-Date Tracking Bar -->
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <div>
                      <span class="text-[10px] uppercase font-semibold text-slate-500 block">Total Scheduled</span>
                      <span class="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">{{ formatCroreLakh(getTotalScheduledMilestones()) }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-semibold text-emerald-600 block">Total Paid to Date</span>
                      <span class="text-xs font-bold font-mono text-emerald-600">{{ formatCroreLakh(getTotalPaidAmount()) }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-semibold text-rose-600 block">Outstanding Payment Due</span>
                      <span class="text-xs font-bold font-mono text-rose-600">{{ formatCroreLakh(getOutstandingPaymentDue()) }}</span>
                    </div>
                    <div>
                      <span class="text-[10px] uppercase font-semibold text-amber-600 block">Next Due Date</span>
                      <span class="text-xs font-bold text-slate-700 dark:text-slate-300">{{ getNextDueDate() }}</span>
                    </div>
                  </div>
                </div>

                <!-- 3. Approved Budget vs Actual Acquisition Cost Tracking -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-100 dark:border-slate-800 pb-2">
                    3. Approved Budget versus Actual Acquisition Cost (বাজেট বনাম প্রকৃত ব্যয়)
                  </span>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Management Approved Budget ৳
                      </label>
                      <input
                        type="number"
                        [(ngModel)]="approvedBudget"
                        [ngModelOptions]="{standalone: true}"
                        placeholder="e.g. 110000000"
                        class="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 font-bold"
                      />
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Total Estimated/Actual Cost ৳
                      </label>
                      <div class="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                        {{ formatCroreLakh(getTotalAcquisitionCost()) }} (৳ {{ getTotalAcquisitionCost().toLocaleString() }})
                      </div>
                    </div>

                    <div>
                      <label class="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Budget Variance (ঘাটতি / সাশ্রয়)
                      </label>
                      <div class="px-3 py-1.5 text-xs rounded-lg border font-bold flex items-center justify-between"
                        [ngClass]="getBudgetVariance() >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300'"
                      >
                        <span>{{ getBudgetVariance() >= 0 ? '✓ Within Budget' : '⚠ Over Budget' }}</span>
                        <span class="font-mono">{{ formatCroreLakh(Math.abs(getBudgetVariance())) }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 4. Cost Allocation Across Projects / Towers -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <span class="text-xs font-bold text-slate-800 dark:text-slate-200">
                      4. Cost Allocation Across Projects / Towers (টাওয়ার ও প্রজেক্টে খরচ বণ্টন)
                    </span>
                    <button
                      type="button"
                      (click)="addTowerAllocation()"
                      class="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
                    >
                      + Add Tower / Phase
                    </button>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    @for (t of towerAllocations; track $index) {
                      <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                        <div class="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            [(ngModel)]="t.tower_or_project_name"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="Tower Name / Phase"
                            class="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-semibold text-slate-800 dark:text-slate-200"
                          />
                          <button
                            type="button"
                            (click)="removeTowerAllocation($index)"
                            class="text-rose-500 hover:text-rose-700 text-xs px-1"
                            title="Remove"
                          >
                            &times;
                          </button>
                        </div>

                        <div class="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label class="block text-[10px] text-slate-500 mb-0.5">Allocation %</label>
                            <input
                              type="number"
                              [(ngModel)]="t.allocation_percent"
                              [ngModelOptions]="{standalone: true}"
                              (input)="recalculateTowerAllocations()"
                              class="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono font-bold"
                            />
                          </div>
                          <div>
                            <label class="block text-[10px] text-slate-500 mb-0.5">Allocated Cost ৳</label>
                            <div class="px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-bold font-mono text-slate-700 dark:text-slate-300">
                              {{ formatCroreLakh(t.allocated_amount_bdt) }}
                            </div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- 5. Owner-Wise Cost & Payout Statement -->
                <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-200 block border-b border-slate-100 dark:border-slate-800 pb-2">
                    5. Owner-Wise Cost & Payout Statement (মালিকওয়ারি অংশ ও প্রাপ্য বিবরণী)
                  </span>

                  <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table class="w-full text-left text-xs">
                      <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th class="p-2.5 font-semibold">Landowner Name</th>
                          <th class="p-2.5 font-semibold text-right">Share %</th>
                          <th class="p-2.5 font-semibold text-right">Equivalent Area</th>
                          <th class="p-2.5 font-semibold text-right">Base Land Value (৳)</th>
                          <th class="p-2.5 font-semibold text-right">Advance Share (৳)</th>
                          <th class="p-2.5 font-semibold text-right">Outstanding Due (৳)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        @for (owner of proposalOwners; track $index) {
                          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td class="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                              {{ owner.full_name_en || 'Co-Owner #' + ($index + 1) }}
                            </td>
                            <td class="p-2.5 text-right font-mono font-semibold">
                              {{ ((owner.ownership_share_ratio || 0) * 100).toFixed(2) }}%
                            </td>
                            <td class="p-2.5 text-right font-mono text-slate-600 dark:text-slate-400">
                              {{ getOwnerEquivalentDecimal(owner) }} Dec
                            </td>
                            <td class="p-2.5 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                              {{ formatCroreLakh(getBaseLandCost() * (owner.ownership_share_ratio || 0)) }}
                            </td>
                            <td class="p-2.5 text-right font-mono text-emerald-600">
                              {{ formatCroreLakh(bookingAdvanceBdt * (owner.ownership_share_ratio || 0)) }}
                            </td>
                            <td class="p-2.5 text-right font-mono font-bold text-rose-600">
                              {{ formatCroreLakh((getBaseLandCost() - bookingAdvanceBdt) * (owner.ownership_share_ratio || 0)) }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
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
                @if (activeTab !== 'milestones') {
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
  activeTab: 'basic' | 'potential' | 'landowner' | 'commercial' | 'milestones' = 'basic';

  successMessage = '';
  errorMessage = '';

  Math = Math;

  calculatedSqft = 0;
  calculatedDecimal = 0;
  calculatedBigha = 0;
  calculatedBuiltupSqft = 0;

  // 1. Commercial Pricing & Land Value
  askingPriceTotal = 0;
  pricingBasis: 'DECIMAL' | 'KATHA' | 'SQFT' | 'LUMPSUM' = 'DECIMAL';
  unitPriceRate = 1000000; // e.g. 10 Lakh per Decimal (matches prompt example)
  negotiatedPrice = 0;

  // 2. Government & Independent Surveyor Valuation
  govtMouzaRatePerDecimal = 250000;
  govtDocName = '';
  govtDocUrl = '';
  govtDocFileName = '';
  isUploadingGovtDoc = false;

  assessorCompany = '';
  assessorLicenseNo = '';
  independentValuationTotal = 0;
  independentDocName = '';
  independentDocUrl = '';
  independentDocFileName = '';
  isUploadingIndependentDoc = false;

  valuationStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' = 'DRAFT';
  valuationApprovedBy = '';
  valuationApprovalDate = '';
  valuationApprovalRemarks = '';

  // 3. Itemized Registration, Duties & Acquisition Expenses
  registrationFee = 0;
  stampDuty = 0;
  gainTaxAit = 0;
  legalVettingFee = 150000;
  digitalSurveyFee = 75000;
  documentationTypingFee = 50000;
  brokerageCommission = 500000;
  miscAcquisitionCost = 100000;

  // 4. Approved Budget & Advance
  approvedBudget = 0;
  bookingAdvanceBdt = 0;
  bookingAdvanceDate = '';
  bookingAdvanceVoucherRef = '';
  bookingAdvanceBankTxRef = '';
  bookingAdvanceStatus: 'PLANNED' | 'PAID' = 'PLANNED';

  // 5. Milestone-Based Installment Payments
  paymentMilestones: ProposalMilestoneItem[] = [
    {
      milestone_name: '1. Booking Advance & Token Money',
      due_date: '',
      amount_bdt: 0,
      percentage: 10,
      voucher_ref: 'PV-ADV-001',
      bank_tx_ref: 'Bank Cheque #001',
      payment_status: 'PLANNED'
    },
    {
      milestone_name: '2. Legal Vetting Clearance & Title Search Approval',
      due_date: '',
      amount_bdt: 0,
      percentage: 20,
      voucher_ref: '',
      bank_tx_ref: '',
      payment_status: 'PLANNED'
    },
    {
      milestone_name: '3. Mutation, Demarcation & Succession Documents Verification',
      due_date: '',
      amount_bdt: 0,
      percentage: 30,
      voucher_ref: '',
      bank_tx_ref: '',
      payment_status: 'PLANNED'
    },
    {
      milestone_name: '4. Sub-Registry Saf-Kabala Deed Execution & Registration',
      due_date: '',
      amount_bdt: 0,
      percentage: 30,
      voucher_ref: '',
      bank_tx_ref: '',
      payment_status: 'PLANNED'
    },
    {
      milestone_name: '5. Physical Demarcated Possession Handover & Final Settlement',
      due_date: '',
      amount_bdt: 0,
      percentage: 10,
      voucher_ref: '',
      bank_tx_ref: '',
      payment_status: 'PLANNED'
    }
  ];

  // 6. Tower / Project Allocation
  towerAllocations: TowerAllocationItem[] = [
    {
      tower_or_project_name: 'Tower 1 / Residential Block A',
      allocation_percent: 50,
      allocated_amount_bdt: 0
    },
    {
      tower_or_project_name: 'Tower 2 / Commercial Block B',
      allocation_percent: 50,
      allocated_amount_bdt: 0
    }
  ];

  proposalOwners: ProposalOwnerItem[] = [
    {
      owner_type: 'INDIVIDUAL',
      ownership_nature: 'INHERITED',
      full_name_en: '',
      phone_number: '',
      nid_number: '',
      ownership_share_ratio: 1.0,
      supporting_documents: []
    }
  ];

  readonly apiBase = 'http://localhost:8000';

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
    owner_name_en: [''],
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
          owner_name_en: primaryOwner ? primaryOwner.full_name_en : '',
          owner_nid: primaryOwner?.nid_number || '',
          owner_phone: primaryOwner?.phone_number || ''
        });

        if (proposal.landowners && proposal.landowners.length > 0) {
          this.proposalOwners = proposal.landowners.map(lo => ({
            owner_type: (lo.owner_type as any) || 'INDIVIDUAL',
            ownership_nature: (lo.ownership_nature as any) || 'INHERITED',
            full_name_en: lo.full_name_en || '',
            full_name_bn: lo.full_name_bn || '',
            father_name: lo.father_name || '',
            phone_number: lo.phone_number || '',
            nid_number: lo.nid_number || '',
            ownership_share_ratio: lo.ownership_share_ratio !== undefined && lo.ownership_share_ratio !== null ? Number(lo.ownership_share_ratio) : 1.0,
            supporting_documents: (lo.supporting_documents || []).map((doc: any) => ({
              document_name: doc.document_name || doc.file_name || 'Document',
              file_url: doc.file_url,
              file_name: doc.file_name,
              file_size: doc.file_size,
              uploaded: !!doc.file_url
            }))
          }));
        } else {
          this.proposalOwners = [
            {
              owner_type: 'INDIVIDUAL',
              ownership_nature: 'INHERITED',
              full_name_en: primaryOwner ? primaryOwner.full_name_en : '',
              phone_number: primaryOwner?.phone_number || '',
              nid_number: primaryOwner?.nid_number || '',
              ownership_share_ratio: 1.0,
              supporting_documents: []
            }
          ];
        }

        if (proposal.feasibility_report_summary) {
          const fs: any = proposal.feasibility_report_summary;
          if (fs.commercial) {
            this.askingPriceTotal = Number(fs.commercial.asking_price_total_bdt || 0);
            this.pricingBasis = fs.commercial.pricing_basis || 'DECIMAL';
            this.unitPriceRate = Number(fs.commercial.unit_price_rate || 1000000);
            this.negotiatedPrice = Number(fs.commercial.negotiated_purchase_price_bdt || 0);
          }
          if (fs.valuation) {
            this.govtMouzaRatePerDecimal = Number(fs.valuation.govt_mouza_rate_per_decimal_bdt || 250000);
            this.govtDocName = fs.valuation.govt_valuation_doc_name || '';
            this.govtDocUrl = fs.valuation.govt_valuation_doc_url || '';
            this.assessorCompany = fs.valuation.assessor_company || '';
            this.assessorLicenseNo = fs.valuation.assessor_license_no || '';
            this.independentValuationTotal = Number(fs.valuation.independent_valuation_total_bdt || 0);
            this.independentDocName = fs.valuation.independent_valuation_doc_name || '';
            this.independentDocUrl = fs.valuation.independent_valuation_doc_url || '';
            this.valuationStatus = fs.valuation.valuation_status || 'DRAFT';
            this.valuationApprovedBy = fs.valuation.valuation_approved_by || '';
            this.valuationApprovalDate = fs.valuation.valuation_approval_date || '';
            this.valuationApprovalRemarks = fs.valuation.valuation_approval_remarks || '';
          }
          if (fs.itemized_expenses) {
            this.registrationFee = Number(fs.itemized_expenses.registration_fee_bdt || 0);
            this.stampDuty = Number(fs.itemized_expenses.stamp_duty_bdt || 0);
            this.gainTaxAit = Number(fs.itemized_expenses.gain_tax_ait_bdt || 0);
            this.legalVettingFee = Number(fs.itemized_expenses.legal_vetting_fee_bdt || 150000);
            this.digitalSurveyFee = Number(fs.itemized_expenses.digital_survey_fee_bdt || 75000);
            this.documentationTypingFee = Number(fs.itemized_expenses.documentation_typing_fee_bdt || 50000);
            this.brokerageCommission = Number(fs.itemized_expenses.brokerage_commission_bdt || 500000);
            this.miscAcquisitionCost = Number(fs.itemized_expenses.miscellaneous_acquisition_bdt || 100000);
          }
          if (fs.totals) {
            this.approvedBudget = Number(fs.totals.approved_budget_bdt || 0);
            this.bookingAdvanceBdt = Number(fs.totals.booking_advance_bdt || 0);
            this.bookingAdvanceDate = fs.totals.booking_advance_date || '';
            this.bookingAdvanceVoucherRef = fs.totals.booking_advance_voucher_ref || '';
            this.bookingAdvanceBankTxRef = fs.totals.booking_advance_bank_tx_ref || '';
            this.bookingAdvanceStatus = fs.totals.booking_advance_status || 'PLANNED';
          }
          if (fs.milestones && Array.isArray(fs.milestones)) {
            this.paymentMilestones = fs.milestones;
          }
          if (fs.tower_allocations && Array.isArray(fs.tower_allocations)) {
            this.towerAllocations = fs.tower_allocations;
          }
        }

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

  // ---- Landowner Management ----

  addOwner(): void {
    const currentTotal = this.proposalOwners.reduce((s, o) => s + (o.ownership_share_ratio || 0), 0);
    const remaining = Math.max(0, Number((1.0 - currentTotal).toFixed(4)));
    this.proposalOwners.push({
      owner_type: 'JOINT_OWNER',
      ownership_nature: 'INHERITED',
      full_name_en: '',
      phone_number: '',
      nid_number: '',
      ownership_share_ratio: remaining > 0 ? remaining : 0.5,
      supporting_documents: []
    });
  }

  removeOwner(index: number): void {
    if (this.proposalOwners.length > 1) {
      this.proposalOwners.splice(index, 1);
    }
  }

  onOwnerShareInput(owner: ProposalOwnerItem, event: Event): void {
    const val = Number((event.target as HTMLInputElement).value || 0);
    owner.ownership_share_ratio = Number((val / 100).toFixed(4));
  }

  getTotalSharePercent(): number {
    const sum = this.proposalOwners.reduce((s, o) => s + (o.ownership_share_ratio || 0), 0);
    return Math.round(sum * 10000) / 100;
  }

  getOwnerEquivalentDecimal(owner: ProposalOwnerItem): string {
    return (this.calculatedDecimal * (owner.ownership_share_ratio || 0)).toFixed(2);
  }

  getOwnerEquivalentKatha(owner: ProposalOwnerItem): string {
    const kathaTotal = this.proposalForm.get('input_unit')?.value === 'KATHA' 
      ? Number(this.proposalForm.get('input_value')?.value || 0)
      : (this.calculatedSqft / 720);
    return (kathaTotal * (owner.ownership_share_ratio || 0)).toFixed(2);
  }

  addOwnerDoc(ownerIdx: number): void {
    this.proposalOwners[ownerIdx]?.supporting_documents.push({
      document_name: '',
      is_uploading: false,
      uploaded: false
    });
  }

  removeOwnerDoc(ownerIdx: number, docIdx: number): void {
    this.proposalOwners[ownerIdx]?.supporting_documents.splice(docIdx, 1);
  }

  onOwnerDocFileSelected(ownerIdx: number, docIdx: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const doc = this.proposalOwners[ownerIdx]?.supporting_documents[docIdx];
    if (!doc) return;

    if (!doc.document_name?.trim()) {
      doc.document_name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    }

    doc.file = file;
    doc.file_name = file.name;
    doc.file_size = file.size;
    doc.is_uploading = true;
    doc.error = undefined;

    this.landService.uploadLandownerDocument(file, doc.document_name).subscribe({
      next: (res) => {
        doc.is_uploading = false;
        doc.uploaded = true;
        doc.file_url = res.file_url;
        doc.file_name = res.file_name;
      },
      error: (err) => {
        doc.is_uploading = false;
        doc.error = err.error?.detail || err.message || 'Upload failed';
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
    this.recalculateMilestones();
  }

  onPricingParamChange(): void {
    this.negotiatedPrice = this.getBaseLandCost();
    this.recalculateMilestones();
  }

  onNegotiatedPriceChange(): void {
    this.recalculateMilestones();
  }

  getBaseLandCost(): number {
    if (this.negotiatedPrice > 0) {
      return this.negotiatedPrice;
    }
    if (this.unitPriceRate > 0) {
      if (this.pricingBasis === 'DECIMAL') {
        return Math.round(this.calculatedDecimal * this.unitPriceRate);
      } else if (this.pricingBasis === 'KATHA') {
        const katha = this.proposalForm.get('input_unit')?.value === 'KATHA' 
          ? Number(this.proposalForm.get('input_value')?.value || 0)
          : (this.calculatedSqft / 720);
        return Math.round(katha * this.unitPriceRate);
      } else if (this.pricingBasis === 'SQFT') {
        return Math.round(this.calculatedSqft * this.unitPriceRate);
      } else {
        return this.unitPriceRate;
      }
    }
    return 0;
  }

  getCostPerDecimal(): number {
    const base = this.getBaseLandCost();
    return this.calculatedDecimal > 0 ? Math.round(base / this.calculatedDecimal) : 0;
  }

  getCostPerKatha(): number {
    const base = this.getBaseLandCost();
    const katha = this.calculatedSqft > 0 ? (this.calculatedSqft / 720) : (this.calculatedDecimal * 435.6 / 720);
    return katha > 0 ? Math.round(base / katha) : 0;
  }

  getCostPerSqft(): number {
    const base = this.getBaseLandCost();
    return this.calculatedSqft > 0 ? Number((base / this.calculatedSqft).toFixed(2)) : 0;
  }

  getGovtValuationTotal(): number {
    return Math.round((this.govtMouzaRatePerDecimal || 0) * (this.calculatedDecimal || 0));
  }

  onGovtDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!this.govtDocName) {
      this.govtDocName = file.name.replace(/\.[^/.]+$/, '');
    }
    this.isUploadingGovtDoc = true;
    this.landService.uploadLandownerDocument(file, this.govtDocName).subscribe({
      next: (res) => {
        this.govtDocUrl = res.file_url;
        this.govtDocFileName = res.file_name;
        this.isUploadingGovtDoc = false;
      },
      error: () => {
        this.isUploadingGovtDoc = false;
      }
    });
  }

  onIndependentDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!this.independentDocName) {
      this.independentDocName = file.name.replace(/\.[^/.]+$/, '');
    }
    this.isUploadingIndependentDoc = true;
    this.landService.uploadLandownerDocument(file, this.independentDocName).subscribe({
      next: (res) => {
        this.independentDocUrl = res.file_url;
        this.independentDocFileName = res.file_name;
        this.isUploadingIndependentDoc = false;
      },
      error: () => {
        this.isUploadingIndependentDoc = false;
      }
    });
  }

  autoEstimateExpenses(): void {
    const base = this.getBaseLandCost();
    this.registrationFee = Math.round(base * 0.01);
    this.stampDuty = Math.round(base * 0.015);
    this.gainTaxAit = Math.round(base * 0.03);
    this.brokerageCommission = Math.round(base * 0.005);
    this.recalculateMilestones();
  }

  getTotalExpenses(): number {
    return Number(this.registrationFee || 0) +
      Number(this.stampDuty || 0) +
      Number(this.gainTaxAit || 0) +
      Number(this.legalVettingFee || 0) +
      Number(this.digitalSurveyFee || 0) +
      Number(this.documentationTypingFee || 0) +
      Number(this.brokerageCommission || 0) +
      Number(this.miscAcquisitionCost || 0);
  }

  getTotalAcquisitionCost(): number {
    return this.getBaseLandCost() + this.getTotalExpenses();
  }

  getBudgetVariance(): number {
    if (!this.approvedBudget) return 0;
    return this.approvedBudget - this.getTotalAcquisitionCost();
  }

  addPaymentMilestone(): void {
    this.paymentMilestones.push({
      milestone_name: `Milestone #${this.paymentMilestones.length + 1}`,
      due_date: '',
      amount_bdt: 0,
      percentage: 10,
      voucher_ref: '',
      bank_tx_ref: '',
      payment_status: 'PLANNED'
    });
    this.recalculateMilestones();
  }

  removePaymentMilestone(idx: number): void {
    if (this.paymentMilestones.length > 1) {
      this.paymentMilestones.splice(idx, 1);
    }
  }

  onMilestonePercentChange(m: ProposalMilestoneItem): void {
    const total = this.getTotalAcquisitionCost();
    m.amount_bdt = Math.round((total * (m.percentage || 0)) / 100);
  }

  getTotalScheduledMilestones(): number {
    return this.paymentMilestones.reduce((s, m) => s + (Number(m.amount_bdt) || 0), 0);
  }

  getTotalPaidAmount(): number {
    const paidMilestones = this.paymentMilestones
      .filter(m => m.payment_status === 'PAID')
      .reduce((s, m) => s + (Number(m.amount_bdt) || 0), 0);
    const advance = this.bookingAdvanceStatus === 'PAID' ? Number(this.bookingAdvanceBdt || 0) : 0;
    return Math.max(paidMilestones, advance);
  }

  getOutstandingPaymentDue(): number {
    return Math.max(0, this.getTotalAcquisitionCost() - this.getTotalPaidAmount());
  }

  getNextDueDate(): string {
    const upcoming = this.paymentMilestones.find(m => m.payment_status === 'PLANNED' && m.due_date);
    return upcoming ? upcoming.due_date : (this.bookingAdvanceDate || 'N/A');
  }

  recalculateMilestones(): void {
    const total = this.getTotalAcquisitionCost();
    this.paymentMilestones.forEach(m => {
      m.amount_bdt = Math.round((total * (m.percentage || 0)) / 100);
    });
    this.recalculateTowerAllocations();
  }

  addTowerAllocation(): void {
    this.towerAllocations.push({
      tower_or_project_name: `Tower ${this.towerAllocations.length + 1}`,
      allocation_percent: 25,
      allocated_amount_bdt: 0
    });
    this.recalculateTowerAllocations();
  }

  removeTowerAllocation(idx: number): void {
    if (this.towerAllocations.length > 1) {
      this.towerAllocations.splice(idx, 1);
    }
  }

  recalculateTowerAllocations(): void {
    const total = this.getTotalAcquisitionCost();
    this.towerAllocations.forEach(t => {
      t.allocated_amount_bdt = Math.round((total * (t.allocation_percent || 0)) / 100);
    });
  }

  formatCroreLakh(amount: number): string {
    if (!amount) return '৳ 0';
    if (amount >= 10000000) {
      return `৳ ${(amount / 10000000).toFixed(2)} Crore`;
    }
    if (amount >= 100000) {
      return `৳ ${(amount / 100000).toFixed(2)} Lakh`;
    }
    return `৳ ${Math.round(amount).toLocaleString()}`;
  }

  goToPreviousTab(): void {
    if (this.activeTab === 'milestones') this.activeTab = 'commercial';
    else if (this.activeTab === 'commercial') this.activeTab = 'landowner';
    else if (this.activeTab === 'landowner') this.activeTab = 'potential';
    else if (this.activeTab === 'potential') this.activeTab = 'basic';
  }

  goToNextTab(): void {
    if (this.activeTab === 'basic') this.activeTab = 'potential';
    else if (this.activeTab === 'potential') this.activeTab = 'landowner';
    else if (this.activeTab === 'landowner') this.activeTab = 'commercial';
    else if (this.activeTab === 'commercial') this.activeTab = 'milestones';
  }

  saveProposal(): void {
    if (this.proposalForm.invalid) {
      this.proposalForm.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields (Project Code, Title, Location & Size).';
      if (this.proposalForm.get('project_code')?.invalid || this.proposalForm.get('proposal_title')?.invalid || this.proposalForm.get('mouza_name')?.invalid) {
        this.activeTab = 'basic';
      } else if (this.proposalForm.get('input_value')?.invalid || this.proposalForm.get('far_potential')?.invalid) {
        this.activeTab = 'potential';
      }
      return;
    }

    const validOwners = this.proposalOwners.filter(o => o.full_name_en && o.full_name_en.trim().length > 0);
    if (validOwners.length === 0) {
      this.errorMessage = 'Please provide at least one Landowner Full Name in Tab 3.';
      this.activeTab = 'landowner';
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';
    const f = this.proposalForm.value;

    const totalCost = this.getTotalAcquisitionCost();

    const feasibilityReport = {
      commercial: {
        asking_price_total_bdt: this.askingPriceTotal,
        pricing_basis: this.pricingBasis,
        unit_price_rate: this.unitPriceRate,
        negotiated_purchase_price_bdt: this.negotiatedPrice || this.getBaseLandCost(),
        base_land_cost_bdt: this.getBaseLandCost(),
        cost_per_decimal_bdt: this.getCostPerDecimal(),
        cost_per_katha_bdt: this.getCostPerKatha(),
        cost_per_sqft_bdt: this.getCostPerSqft()
      },
      valuation: {
        govt_mouza_rate_per_decimal_bdt: this.govtMouzaRatePerDecimal,
        govt_valuation_total_bdt: this.getGovtValuationTotal(),
        govt_valuation_doc_name: this.govtDocName,
        govt_valuation_doc_url: this.govtDocUrl,
        assessor_company: this.assessorCompany,
        assessor_license_no: this.assessorLicenseNo,
        independent_valuation_total_bdt: this.independentValuationTotal,
        independent_valuation_doc_name: this.independentDocName,
        independent_valuation_doc_url: this.independentDocUrl,
        valuation_status: this.valuationStatus,
        valuation_approved_by: this.valuationApprovedBy,
        valuation_approval_date: this.valuationApprovalDate,
        valuation_approval_remarks: this.valuationApprovalRemarks
      },
      itemized_expenses: {
        registration_fee_bdt: this.registrationFee,
        stamp_duty_bdt: this.stampDuty,
        gain_tax_ait_bdt: this.gainTaxAit,
        legal_vetting_fee_bdt: this.legalVettingFee,
        digital_survey_fee_bdt: this.digitalSurveyFee,
        documentation_typing_fee_bdt: this.documentationTypingFee,
        brokerage_commission_bdt: this.brokerageCommission,
        miscellaneous_acquisition_bdt: this.miscAcquisitionCost,
        total_expenses_bdt: this.getTotalExpenses()
      },
      totals: {
        total_acquisition_cost_bdt: totalCost,
        approved_budget_bdt: this.approvedBudget,
        budget_variance_bdt: this.getBudgetVariance(),
        booking_advance_bdt: this.bookingAdvanceBdt,
        booking_advance_date: this.bookingAdvanceDate,
        booking_advance_voucher_ref: this.bookingAdvanceVoucherRef,
        booking_advance_bank_tx_ref: this.bookingAdvanceBankTxRef,
        booking_advance_status: this.bookingAdvanceStatus
      },
      milestones: this.paymentMilestones,
      tower_allocations: this.towerAllocations
    };

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
      indicative_cost_total: totalCost,
      feasibility_report_summary: feasibilityReport,
      status: f.status || 'DRAFT_PROPOSAL',
      workflow_stage: f.workflow_stage || 'IDENTIFIED',
      location_description: f.location_description,
      preliminary_valuation_notes: f.preliminary_valuation_notes,
      landowners: validOwners.map(o => ({
        owner_type: o.owner_type,
        ownership_nature: o.ownership_nature,
        full_name_en: o.full_name_en.trim(),
        full_name_bn: o.full_name_bn?.trim() || null,
        father_name: o.father_name?.trim() || null,
        phone_number: o.phone_number?.trim() || null,
        nid_number: o.nid_number?.trim() || null,
        ownership_share_ratio: o.ownership_share_ratio,
        supporting_documents: (o.supporting_documents || [])
          .filter(d => d.file_url || (d.document_name && d.document_name.trim()))
          .map(d => ({
            document_name: (d.document_name || d.file_name || 'Document').trim(),
            file_url: d.file_url || null,
            file_name: d.file_name || null,
            file_size: d.file_size || null
          }))
      }))
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
    this.askingPriceTotal = 0;
    this.pricingBasis = 'DECIMAL';
    this.unitPriceRate = 1000000;
    this.negotiatedPrice = 0;
    this.approvedBudget = 0;
    this.bookingAdvanceBdt = 0;
    this.bookingAdvanceDate = '';
    this.bookingAdvanceVoucherRef = '';
    this.bookingAdvanceBankTxRef = '';
    this.bookingAdvanceStatus = 'PLANNED';
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
