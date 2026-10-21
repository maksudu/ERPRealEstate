import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../../core/services/land.service';
import { LandNegotiation, LandParcel, Landowner } from '../../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';

@Component({
  selector: 'app-negotiation-form',
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
            <span>&larr;</span> Back to Negotiations Registry
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            Module 2.9 — Commercial Negotiations & Agreements
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
              Back to Negotiations List
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

      <!-- Main Form Card Container -->
      <app-card-container
        [hasHeader]="true"
        [title]="isEditMode ? 'Edit Commercial Negotiation (' + (loadedNegotiationCode || 'ID #' + editingNegotiationId) + ')' : 'New Commercial Negotiation Deal'"
        [subtitle]="isEditMode ? 'Update commercial pricing, payment installments, milestones, and conditions precedent' : 'Record acquisition terms, initial asking price, developer targets, advance amount, and legal prerequisites'"
        [badge]="isEditMode ? 'Edit Mode' : 'New Negotiation'"
      >
        @if (isLoading) {
          <div class="py-16 text-center text-slate-400 text-xs space-y-2">
            <svg class="animate-spin w-6 h-6 mx-auto text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p>Loading negotiation record...</p>
          </div>
        } @else {
          <!-- Step Tabs Navigation -->
          <div class="flex items-center border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
            <button
              type="button"
              (click)="activeTab = 'context'"
              [ngClass]="activeTab === 'context' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'context' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 text-slate-600'">1</span>
              Deal Context & Stakeholders
            </button>
            <button
              type="button"
              (click)="activeTab = 'pricing'"
              [ngClass]="activeTab === 'pricing' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'pricing' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 text-slate-600'">2</span>
              Commercial Pricing & Advances
            </button>
            <button
              type="button"
              (click)="activeTab = 'terms'"
              [ngClass]="activeTab === 'terms' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'terms' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 text-slate-600'">3</span>
              Consideration & Legal Terms
            </button>
            <button
              type="button"
              (click)="activeTab = 'timeline'"
              [ngClass]="activeTab === 'timeline' ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-2.5 text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2"
            >
              <span class="w-5 h-5 rounded-full text-center leading-5 text-[11px]" [ngClass]="activeTab === 'timeline' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-100 text-slate-600'">4</span>
              Deadlines & Workflow Status
            </button>
          </div>

          <form [formGroup]="negotiationForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- TAB 1: DEAL CONTEXT & STAKEHOLDERS -->
            @if (activeTab === 'context') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Land Parcel *
                    </label>
                    <app-searchable-select
                      [options]="parcelOptions"
                      [value]="negotiationForm.get('parcel_id')?.value"
                      (selectionChange)="negotiationForm.patchValue({ parcel_id: $event?.value || $event?.id || $event })"
                      placeholder="Select Land Parcel..."
                    ></app-searchable-select>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Primary Landowner / Representative
                    </label>
                    <app-searchable-select
                      [options]="landownerOptions"
                      [value]="negotiationForm.get('landowner_id')?.value"
                      (selectionChange)="negotiationForm.patchValue({ landowner_id: $event?.value || $event?.id || $event })"
                      placeholder="Select Landowner..."
                    ></app-searchable-select>
                  </div>
                </div>

                <app-custom-input
                  label="Negotiation Title / Acquisition Deal Reference *"
                  formControlName="negotiation_title"
                  placeholder="e.g. Uttara Sector 11 Commercial Plot Acquisition"
                  [required]="true"
                ></app-custom-input>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Negotiation Stage *
                    </label>
                    <app-searchable-select
                      [options]="stageOptions"
                      [value]="negotiationForm.get('negotiation_stage')?.value"
                      (selectionChange)="negotiationForm.patchValue({ negotiation_stage: $event?.value || $event?.item_code || $event })"
                      placeholder="Select Stage..."
                    ></app-searchable-select>
                  </div>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Commercial Consideration Type *
                    </label>
                    <app-searchable-select
                      [options]="considerationTypeOptions"
                      [value]="negotiationForm.get('consideration_type')?.value"
                      (selectionChange)="negotiationForm.patchValue({ consideration_type: $event?.value || $event?.item_code || $event })"
                      placeholder="Select Consideration Type..."
                    ></app-searchable-select>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 2: COMMERCIAL PRICING & ADVANCES -->
            @if (activeTab === 'pricing') {
              <div class="space-y-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    Acquisition Deal Financial Benchmarks (BDT ৳)
                  </h4>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <app-custom-input
                      label="Initial Asking Price (BDT)"
                      formControlName="initial_asking_price_bdt"
                      type="number"
                      step="100000"
                      placeholder="0.00"
                    ></app-custom-input>

                    <app-custom-input
                      label="Developer Target Price (BDT)"
                      formControlName="developer_target_price_bdt"
                      type="number"
                      step="100000"
                      placeholder="0.00"
                    ></app-custom-input>

                    <app-custom-input
                      label="Proposed Advance / Bayna (BDT)"
                      formControlName="proposed_advance_bdt"
                      type="number"
                      step="50000"
                      placeholder="0.00"
                    ></app-custom-input>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <app-custom-input
                      label="Current Offer Amount (BDT)"
                      formControlName="current_offer_amount_bdt"
                      type="number"
                      step="100000"
                      placeholder="0.00"
                    ></app-custom-input>

                    <app-custom-input
                      label="Current Counteroffer (BDT)"
                      formControlName="current_counteroffer_amount_bdt"
                      type="number"
                      step="100000"
                      placeholder="0.00"
                    ></app-custom-input>

                    <app-custom-input
                      label="Final Agreed Amount (BDT)"
                      formControlName="final_agreed_amount_bdt"
                      type="number"
                      step="100000"
                      placeholder="0.00"
                    ></app-custom-input>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 3: CONSIDERATION & LEGAL TERMS -->
            @if (activeTab === 'terms') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <app-custom-textarea
                    label="Installment & Settlement Payment Terms"
                    formControlName="installment_terms_summary"
                    placeholder="e.g. 20% on Bayna, 40% on Mutation & porcha delivery, 40% on final registry"
                    [rows]="3"
                  ></app-custom-textarea>

                  <app-custom-textarea
                    label="Non-Cash Consideration (Flats / Shops / Parking Allocation)"
                    formControlName="non_cash_consideration_details"
                    placeholder="e.g. 2 units of 1,800 sft on 4th floor + 2 car parking bays"
                    [rows]="3"
                  ></app-custom-textarea>
                </div>

                <app-custom-textarea
                  label="Conditions Precedent & Legal Completion Prerequisites"
                  formControlName="conditions_precedent"
                  placeholder="e.g. CS-SA-RS mutation porcha delivery, clear dakhila, eviction of tenants, warishan certificate verified"
                  [rows]="3"
                ></app-custom-textarea>

                <!-- Agreement File & Document Upload (Tab 3) -->
                <ng-container *ngTemplateOutlet="agreementUploadBlock"></ng-container>
              </div>
            }

            <!-- TAB 4: DEADLINES & WORKFLOW STATUS -->
            @if (activeTab === 'timeline') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Negotiation Start Date *"
                    formControlName="negotiation_start_date"
                    type="date"
                    [required]="true"
                  ></app-custom-input>

                  <app-custom-input
                    label="Target Closing Deadline *"
                    formControlName="target_closing_deadline"
                    type="date"
                    [required]="true"
                  ></app-custom-input>

                  <div>
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Agreement Workflow Status *
                    </label>
                    <app-searchable-select
                      [options]="statusOptions"
                      [value]="negotiationForm.get('agreement_status')?.value"
                      (selectionChange)="negotiationForm.patchValue({ agreement_status: $event?.value || $event?.item_code || $event })"
                      placeholder="Select Status..."
                    ></app-searchable-select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-custom-input
                    label="Agreement Execution Date (If signed)"
                    formControlName="agreement_execution_date"
                    type="date"
                  ></app-custom-input>

                  <app-custom-input
                    label="Agreement Expiry Date (If term-bound)"
                    formControlName="agreement_expiry_date"
                    type="date"
                  ></app-custom-input>
                </div>

                <!-- Agreement File & Document Upload (Tab 4) -->
                <ng-container *ngTemplateOutlet="agreementUploadBlock"></ng-container>
              </div>
            }

            <!-- Reusable Agreement File & Document Upload Template (Shared between Tab 3 & 4) -->
            <ng-template #agreementUploadBlock>
              <div class="mt-4 p-4.5 bg-slate-50 dark:bg-slate-850/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      Agreement Document & Legal Contract File (চুক্তিপত্র ও দলিল সংযুক্তি)
                    </h4>
                    <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Attach signed bayna deed, deed of agreement, non-judicial stamp contract, or legal draft copy.
                    </p>
                  </div>
                  @if (uploadedAgreementDocuments.length > 0) {
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {{ uploadedAgreementDocuments.length }} File(s) Attached
                    </span>
                  }
                </div>

                <!-- Document Name Input & File Upload Picker -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div class="md:col-span-7">
                    <app-custom-input
                      label="Document Name / Title (ডকুমেন্টের নাম) *"
                      formControlName="agreement_document_name"
                      placeholder="e.g. Deed of Agreement / Registered Baynanama (বায়না চুক্তিপত্র)"
                    ></app-custom-input>
                  </div>

                  <div class="md:col-span-5">
                    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Upload Agreement File (ফাইল আপলোড)
                    </label>
                    <div class="relative flex items-center">
                      <input
                        type="file"
                        #fileInput
                        (change)="onAgreementFileSelected($event)"
                        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                        class="hidden"
                      />
                      <button
                        type="button"
                        (click)="fileInput.click()"
                        [disabled]="isUploadingAgreement"
                        class="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 transition shadow-2xs disabled:opacity-50"
                      >
                        @if (isUploadingAgreement) {
                          <svg class="animate-spin w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                          <span>Uploading Agreement...</span>
                        } @else {
                          <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                          </svg>
                          <span>Choose Agreement File</span>
                        }
                      </button>
                    </div>
                  </div>
                </div>

                <div class="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 25MB). Files are securely stored with deal audit history.</span>
                </div>

                <!-- Uploaded Document Cards / List -->
                @if (uploadedAgreementDocuments.length > 0) {
                  <div class="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <p class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Attached Agreement Files:</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      @for (doc of uploadedAgreementDocuments; track $index) {
                        <div class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs">
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                 [ngClass]="doc.extension === '.pdf' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60' : (doc.extension === '.doc' || doc.extension === '.docx' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60')">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                            </div>
                            <div class="min-w-0">
                              <div class="flex items-center gap-1.5">
                                <h5 class="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]" [title]="doc.document_name">
                                  {{ doc.document_name }}
                                </h5>
                                @if ($index === 0) {
                                  <span class="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                    Primary
                                  </span>
                                }
                              </div>
                              <div class="flex items-center gap-2 text-[10px] text-slate-400 truncate">
                                <span class="truncate max-w-[110px]">{{ doc.file_name || 'agreement_doc' }}</span>
                                @if (doc.file_size) {
                                  <span>&bull; {{ formatFileSize(doc.file_size) }}</span>
                                }
                              </div>
                            </div>
                          </div>

                          <div class="flex items-center gap-1 shrink-0 ml-2">
                            @if (doc.file_url) {
                              <a
                                [href]="doc.file_url"
                                target="_blank"
                                class="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                                title="View / Download File"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                                </svg>
                              </a>
                            }
                            <button
                              type="button"
                              (click)="removeAgreementDocument($index)"
                              class="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                              title="Remove file"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </ng-template>

            <!-- Form Action Footer -->
            <div class="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div class="flex items-center gap-2">
                @if (activeTab !== 'context') {
                  <button
                    type="button"
                    (click)="goToPrevTab()"
                    class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    &larr; Previous Step
                  </button>
                }
                @if (activeTab !== 'timeline') {
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
                  class="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition shadow-2xs"
                >
                  @if (isSaving) {
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                  }
                  {{ isEditMode ? 'Update Negotiation Deal' : 'Confirm & Save Deal' }}
                </button>
              </div>
            </div>
          </form>
        }
      </app-card-container>
    </div>
  `
})
export class NegotiationFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private landService = inject(LandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  editingNegotiationId: number | null = null;
  loadedNegotiationCode = '';
  isLoading = false;
  isSaving = false;

  activeTab: 'context' | 'pricing' | 'terms' | 'timeline' = 'context';

  successMessage = '';
  errorMessage = '';

  isUploadingAgreement = false;
  uploadedAgreementDocuments: Array<{
    document_name: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    extension?: string;
    uploaded_at?: string;
  }> = [];

  parcelOptions: SelectOption[] = [];
  landownerOptions: SelectOption[] = [];

  stageOptions: SelectOption[] = [
    { value: 'INITIAL_OFFER', label: '1. Initial Offer (প্রাথমিক প্রস্তাব)' },
    { value: 'LANDOWNER_COUNTER', label: '2. Landowner Counteroffer (মালিকের পাল্টা প্রস্তাব)' },
    { value: 'MANAGEMENT_REVIEW', label: '3. Management Review (ব্যবস্থাপনা পর্যালোচনা)' },
    { value: 'REVISED_OFFER', label: '4. Revised Offer (সংশোধিত প্রস্তাব)' },
    { value: 'FINAL_TERMS_AGREED', label: '5. Final Terms Agreed (চূড়ান্ত শর্তাবলী সম্পন্ন)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'DRAFTING', label: 'Drafting (খসড়া চুক্তি)' },
    { value: 'LEGAL_VETTING', label: 'Legal Vetting (আইনি যাচাইকরণ)' },
    { value: 'MANAGEMENT_APPROVED', label: 'Management Approved (ব্যবস্থাপনা অনুমোদিত)' },
    { value: 'EXECUTED_REGISTERED', label: 'Executed & Registered (চুক্তি সম্পাদিত ও নিবন্ধিত)' },
    { value: 'TERMINATED', label: 'Terminated / Cancelled (বাতিলকৃত)' },
    { value: 'EXPIRED', label: 'Expired (মেয়াদোত্তীর্ণ)' }
  ];

  considerationTypeOptions: SelectOption[] = [
    { value: 'CASH_PURCHASE', label: 'Outright Cash Purchase (এককালীন নগদ ক্রয়)' },
    { value: 'JOINT_VENTURE_RATIO', label: 'Joint Venture Ratio (যৌথ উদ্যোগ বণ্টন)' },
    { value: 'HYBRID_CASH_AND_ALLOCATION', label: 'Hybrid Cash & Allocation (নগদ ও স্পেস বরাদ্দ)' }
  ];

  negotiationForm: FormGroup = this.fb.group({
    parcel_id: ['', Validators.required],
    landowner_id: [null],
    negotiation_title: ['', Validators.required],
    negotiation_stage: ['INITIAL_OFFER', Validators.required],
    initial_asking_price_bdt: [0],
    developer_target_price_bdt: [0],
    current_offer_amount_bdt: [0],
    current_counteroffer_amount_bdt: [0],
    final_agreed_amount_bdt: [0],
    consideration_type: ['CASH_PURCHASE', Validators.required],
    proposed_advance_bdt: [0],
    installment_terms_summary: ['20% upon Bayna deed, 50% upon mutation & porcha delivery, 30% upon final registry deed'],
    non_cash_consideration_details: [''],
    conditions_precedent: ['Clean CS/SA/RS chain, mutation porcha in seller name, physical eviction of squatters, warishan sanad verified'],
    negotiation_start_date: [new Date().toISOString().substring(0, 10), Validators.required],
    target_closing_deadline: [new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10), Validators.required],
    agreement_execution_date: [null],
    agreement_expiry_date: [null],
    agreement_status: ['DRAFTING', Validators.required],
    agreement_document_name: [''],
    agreement_file_url: ['']
  });

  ngOnInit(): void {
    this.loadParcels();
    this.loadLandowners();

    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode = true;
      this.editingNegotiationId = Number(idParam);
      this.loadNegotiation(this.editingNegotiationId);
    }
  }

  loadParcels(): void {
    this.landService.getParcels().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any).items || [];
        this.parcelOptions = list.map((p: LandParcel) => ({
          value: p.id,
          label: `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || 'Land'} (${p.total_area_decimal || 0} Dec)`
        }));
        if (!this.isEditMode && !this.negotiationForm.get('parcel_id')?.value && list.length > 0) {
          this.negotiationForm.patchValue({ parcel_id: list[0].id });
        }
      },
      error: (err) => console.error('Error loading parcels for negotiation', err)
    });
  }

  loadLandowners(): void {
    this.landService.getLandowners().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any).items || [];
        this.landownerOptions = list.map((l: Landowner) => ({
          value: l.id,
          label: `${l.landowner_code || 'OWN-' + l.id} - ${l.full_name_en} (${l.phone_number || 'No Phone'})`
        }));
      },
      error: (err) => console.error('Error loading landowners for negotiation', err)
    });
  }

  loadNegotiation(id: number): void {
    this.isLoading = true;
    this.landService.getNegotiationById(id).subscribe({
      next: (neg: LandNegotiation) => {
        this.loadedNegotiationCode = neg.negotiation_code || `Deal #${neg.id}`;
        this.negotiationForm.patchValue({
          parcel_id: neg.parcel_id,
          landowner_id: neg.landowner_id,
          negotiation_title: neg.negotiation_title,
          negotiation_stage: neg.negotiation_stage,
          initial_asking_price_bdt: neg.initial_asking_price_bdt,
          developer_target_price_bdt: neg.developer_target_price_bdt,
          current_offer_amount_bdt: neg.current_offer_amount_bdt,
          current_counteroffer_amount_bdt: neg.current_counteroffer_amount_bdt,
          final_agreed_amount_bdt: neg.final_agreed_amount_bdt,
          consideration_type: neg.consideration_type,
          proposed_advance_bdt: neg.proposed_advance_bdt,
          installment_terms_summary: neg.installment_terms_summary || '',
          non_cash_consideration_details: neg.non_cash_consideration_details || '',
          conditions_precedent: neg.conditions_precedent || '',
          negotiation_start_date: neg.negotiation_start_date,
          target_closing_deadline: neg.target_closing_deadline,
          agreement_execution_date: neg.agreement_execution_date || null,
          agreement_expiry_date: neg.agreement_expiry_date || null,
          agreement_status: neg.agreement_status,
          agreement_document_name: neg.agreement_document_name || '',
          agreement_file_url: neg.agreement_file_url || ''
        });

        if (neg.supporting_documents && Array.isArray(neg.supporting_documents) && neg.supporting_documents.length > 0) {
          this.uploadedAgreementDocuments = [...neg.supporting_documents];
        } else if (neg.agreement_file_url) {
          this.uploadedAgreementDocuments = [{
            document_name: neg.agreement_document_name || 'Primary Agreement Document',
            file_url: neg.agreement_file_url,
            file_name: neg.agreement_file_url.split('/').pop() || 'agreement.pdf',
            uploaded_at: neg.updated_at || neg.created_at
          }];
        } else {
          this.uploadedAgreementDocuments = [];
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Failed to load negotiation details.';
        this.isLoading = false;
      }
    });
  }

  onAgreementFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (!file) return;

    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      this.errorMessage = `Invalid file format "${ext}". Allowed formats: ${allowed.join(', ')}`;
      event.target.value = '';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      this.errorMessage = 'File size exceeds maximum allowed limit of 25MB.';
      event.target.value = '';
      return;
    }

    this.isUploadingAgreement = true;
    this.errorMessage = '';
    const currentName = this.negotiationForm.get('agreement_document_name')?.value?.trim();
    const docName = currentName || file.name.replace(/\.[^/.]+$/, "");

    this.landService.uploadNegotiationAgreement(file, docName).subscribe({
      next: (res) => {
        this.isUploadingAgreement = false;
        const newDoc = {
          document_name: docName,
          file_url: res.file_url,
          file_name: res.file_name || file.name,
          file_size: res.file_size || file.size,
          extension: res.extension || ext,
          uploaded_at: new Date().toISOString()
        };
        this.uploadedAgreementDocuments.push(newDoc);

        // Keep primary agreement synced with first document
        if (!this.negotiationForm.get('agreement_file_url')?.value || this.uploadedAgreementDocuments.length === 1) {
          this.negotiationForm.patchValue({
            agreement_document_name: docName,
            agreement_file_url: res.file_url
          });
        }
        event.target.value = '';
      },
      error: (err) => {
        this.isUploadingAgreement = false;
        this.errorMessage = err.error?.detail || 'Failed to upload agreement file.';
        event.target.value = '';
      }
    });
  }

  removeAgreementDocument(index: number): void {
    this.uploadedAgreementDocuments.splice(index, 1);
    if (this.uploadedAgreementDocuments.length > 0) {
      this.negotiationForm.patchValue({
        agreement_document_name: this.uploadedAgreementDocuments[0].document_name,
        agreement_file_url: this.uploadedAgreementDocuments[0].file_url
      });
    } else {
      this.negotiationForm.patchValue({
        agreement_document_name: '',
        agreement_file_url: ''
      });
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  goToPrevTab(): void {
    if (this.activeTab === 'timeline') this.activeTab = 'terms';
    else if (this.activeTab === 'terms') this.activeTab = 'pricing';
    else if (this.activeTab === 'pricing') this.activeTab = 'context';
  }

  goToNextTab(): void {
    if (this.activeTab === 'context') this.activeTab = 'pricing';
    else if (this.activeTab === 'pricing') this.activeTab = 'terms';
    else if (this.activeTab === 'terms') this.activeTab = 'timeline';
  }

  onSubmit(): void {
    if (this.negotiationForm.invalid) {
      this.negotiationForm.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields marked with * before submitting.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formVal = this.negotiationForm.value;
    const payload: any = {
      parcel_id: Number(formVal.parcel_id),
      landowner_id: formVal.landowner_id ? Number(formVal.landowner_id) : null,
      negotiation_title: formVal.negotiation_title.trim(),
      negotiation_stage: formVal.negotiation_stage,
      initial_asking_price_bdt: Number(formVal.initial_asking_price_bdt || 0),
      developer_target_price_bdt: Number(formVal.developer_target_price_bdt || 0),
      current_offer_amount_bdt: Number(formVal.current_offer_amount_bdt || 0),
      current_counteroffer_amount_bdt: Number(formVal.current_counteroffer_amount_bdt || 0),
      final_agreed_amount_bdt: Number(formVal.final_agreed_amount_bdt || 0),
      consideration_type: formVal.consideration_type,
      proposed_advance_bdt: Number(formVal.proposed_advance_bdt || 0),
      installment_terms_summary: formVal.installment_terms_summary ? formVal.installment_terms_summary.trim() : null,
      non_cash_consideration_details: formVal.non_cash_consideration_details ? formVal.non_cash_consideration_details.trim() : null,
      conditions_precedent: formVal.conditions_precedent ? formVal.conditions_precedent.trim() : null,
      negotiation_start_date: formVal.negotiation_start_date,
      target_closing_deadline: formVal.target_closing_deadline,
      agreement_execution_date: formVal.agreement_execution_date || null,
      agreement_expiry_date: formVal.agreement_expiry_date || null,
      agreement_status: formVal.agreement_status,
      agreement_document_name: formVal.agreement_document_name ? formVal.agreement_document_name.trim() : null,
      agreement_file_url: formVal.agreement_file_url || null,
      supporting_documents: this.uploadedAgreementDocuments.length > 0 ? this.uploadedAgreementDocuments : null
    };

    if (this.isEditMode && this.editingNegotiationId) {
      this.landService.updateNegotiation(this.editingNegotiationId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.loadedNegotiationCode = updated.negotiation_code;
          this.successMessage = `Negotiation deal ${updated.negotiation_code} successfully updated!`;
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Failed to update negotiation record.';
        }
      });
    } else {
      this.landService.createNegotiation(payload).subscribe({
        next: (created) => {
          this.isSaving = false;
          this.loadedNegotiationCode = created.negotiation_code;
          this.successMessage = `Negotiation deal ${created.negotiation_code} successfully registered!`;
        },
        error: (err) => {
          this.isSaving = false;
          this.errorMessage = err.error?.detail || 'Failed to create negotiation deal.';
        }
      });
    }
  }

  resetForNew(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.activeTab = 'context';
    this.uploadedAgreementDocuments = [];
    this.negotiationForm.reset({
      parcel_id: this.parcelOptions.length > 0 ? this.parcelOptions[0].value : '',
      landowner_id: null,
      negotiation_title: '',
      negotiation_stage: 'INITIAL_OFFER',
      initial_asking_price_bdt: 0,
      developer_target_price_bdt: 0,
      current_offer_amount_bdt: 0,
      current_counteroffer_amount_bdt: 0,
      final_agreed_amount_bdt: 0,
      consideration_type: 'CASH_PURCHASE',
      proposed_advance_bdt: 0,
      installment_terms_summary: '20% upon Bayna deed, 50% upon mutation & porcha delivery, 30% upon final registry deed',
      non_cash_consideration_details: '',
      conditions_precedent: 'Clean CS/SA/RS chain, mutation porcha in seller name, physical eviction of squatters, warishan sanad verified',
      negotiation_start_date: new Date().toISOString().substring(0, 10),
      target_closing_deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      agreement_execution_date: null,
      agreement_expiry_date: null,
      agreement_status: 'DRAFTING',
      agreement_document_name: '',
      agreement_file_url: ''
    });
  }

  goBack(): void {
    this.router.navigate(['/land/negotiation']);
  }
}
