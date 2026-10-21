import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
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

export interface LandownerDocItem {
  document_name: string;
  file?: File;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  extension?: string;
  is_uploading?: boolean;
  uploaded?: boolean;
  error?: string;
  uploaded_at?: string;
}

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
            Land Acquisition
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
            <button type="button" (click)="goBack()" class="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs">
              Back to Landowners List
            </button>
            @if (!isEditMode) {
              <button type="button" (click)="resetForNew()" class="px-3 py-1 rounded-lg text-xs font-semibold border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition">
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
          <button type="button" (click)="errorMessage = ''" class="text-rose-500 hover:text-rose-700 text-sm font-bold px-2 py-0.5">&times;</button>
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
            <button type="button" (click)="activeTab = 'personal'"
              [ngClass]="activeTab === 'personal' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'personal' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">1</span>
              Personal & Identification
            </button>
            <button type="button" (click)="activeTab = 'contact'"
              [ngClass]="activeTab === 'contact' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'contact' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">2</span>
              Contact & Addresses
            </button>
            <button type="button" (click)="activeTab = 'ownership'"
              [ngClass]="activeTab === 'ownership' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'ownership' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">3</span>
              Ownership & Banking Details
            </button>
            <button type="button" (click)="activeTab = 'nominee'"
              [ngClass]="activeTab === 'nominee' ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold border-b-2 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'"
              class="px-4 py-3 text-xs whitespace-nowrap transition-colors flex items-center gap-1.5">
              <span class="w-4 h-4 rounded-full text-[10px] inline-flex items-center justify-center" [ngClass]="activeTab === 'nominee' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'">4</span>
              Nominee & Power-of-Attorney (PoA)
            </button>
          </div>

          <form [formGroup]="ownerForm" (ngSubmit)="saveLandowner()" class="space-y-6">
            <!-- TAB 1: PERSONAL & IDENTIFICATION -->
            @if (activeTab === 'personal') {
              <!-- NID OCR Scanner Card -->
              <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl space-y-3">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  <h4 class="text-xs font-bold text-blue-800 dark:text-blue-200">জাতীয় পরিচয়পত্র (NID) Scanner & Auto-Fill</h4>
                  <span class="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-700">OCR Auto-Fill</span>
                </div>
                <p class="text-[10px] text-blue-600 dark:text-blue-400">NID-এর ছবি আপলোড করুন — নাম, পিতা/মাতার নাম ও NID নম্বর স্বয়ংক্রিয়ভাবে ফর্মে পূরণ হবে।</p>

                <!-- NID Upload Zone -->
                <div
                  class="relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer"
                  [ngClass]="nidDragOver ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40' : 'border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20'"
                  (dragover)="onNidDragOver($event)"
                  (dragleave)="nidDragOver = false"
                  (drop)="onNidDrop($event)"
                  (click)="nidFileInput.click()"
                >
                  <input
                    #nidFileInput
                    type="file"
                    accept="image/*,.pdf"
                    class="hidden"
                    (change)="onNidFileSelect($event)"
                  />

                  @if (nidPreviewUrl) {
                    <!-- Preview with detected info -->
                    <div class="flex flex-col sm:flex-row items-start gap-4 p-4" (click)="$event.stopPropagation()">
                      <div class="relative shrink-0">
                        <img [src]="nidPreviewUrl" alt="NID Preview" class="w-40 h-28 object-cover rounded-lg border border-blue-200 dark:border-blue-700 shadow-sm"/>
                        @if (isOcrProcessing) {
                          <div class="absolute inset-0 bg-blue-900/60 rounded-lg flex items-center justify-center">
                            <svg class="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          </div>
                        }
                      </div>
                      <div class="flex-1 space-y-1">
                        <p class="text-[10px] font-semibold text-blue-700 dark:text-blue-300">{{ nidFileName }}</p>
                        @if (ocrExtractedText) {
                          <div class="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 max-h-24 overflow-y-auto leading-relaxed">
                            <span class="font-semibold text-slate-700 dark:text-slate-300">Extracted Text:</span><br/>
                            {{ ocrExtractedText }}
                          </div>
                        }
                        <div class="flex gap-2 pt-1">
                          @if (!isOcrProcessing && nidSelectedFile) {
                            <button type="button" (click)="runOcrAndFill()" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1">
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                              Re-scan & Fill
                            </button>
                          }
                          <button type="button" (click)="changeNidImage(nidFileInput)" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                            Change Image
                          </button>
                          <button type="button" (click)="clearNidSelection(true); nidFileInput.value = ''" class="px-2.5 py-1 text-[10px] font-semibold rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            Reset Form
                          </button>
                          @if (isEditMode && editingOwnerId && nidSelectedFile && !nidUploaded) {
                            <button type="button" (click)="uploadNidImage()" [disabled]="isUploadingNid"
                              class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 disabled:opacity-50">
                              @if (isUploadingNid) {
                                <svg class="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                              }
                              Upload NID
                            </button>
                          }
                          @if (nidUploaded) {
                            <span class="px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700 flex items-center gap-1">
                              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                              Uploaded
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="flex flex-col items-center justify-center py-8 px-4 gap-3">
                      <div class="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <svg class="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                      </div>
                      <div class="text-center">
                        <p class="text-xs font-semibold text-blue-700 dark:text-blue-300">NID-এর ছবি এখানে ড্র্যাগ করুন অথবা ক্লিক করুন</p>
                        <p class="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">JPG, PNG, WEBP, PDF — সর্বোচ্চ 10 MB</p>
                      </div>
                    </div>
                  }
                </div>

                @if (ocrStatus) {
                  <div class="flex items-center gap-2 text-[10px]" [ngClass]="ocrStatus.includes('✓') ? 'text-emerald-600 dark:text-emerald-400' : ocrStatus.includes('✗') ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'">
                    <span>{{ ocrStatus }}</span>
                  </div>
                }

                <!-- Existing NID image (edit mode) -->
                @if (existingNidImagePath && !nidPreviewUrl) {
                  <div class="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <div class="flex-1 min-w-0">
                      <p class="text-[10px] font-semibold text-slate-700 dark:text-slate-300">Existing NID Scan</p>
                      <p class="text-[10px] text-slate-400 truncate">{{ existingNidImagePath }}</p>
                    </div>
                    <a [href]="apiBase + existingNidImagePath" target="_blank"
                      class="px-2 py-1 text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition">
                      View
                    </a>
                  </div>
                }
              </div>

              <!-- Personal Fields Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Owner Type -->
                <div>
                  <app-searchable-select label="Owner Type *" formControlName="owner_type" [options]="ownerTypeOptions" placeholder="Select Owner Classification..." [allowCreateNew]="false"></app-searchable-select>
                </div>

                <!-- Verification Status -->
                <div>
                  <app-searchable-select label="Verification Status *" formControlName="status" [options]="statusOptions" placeholder="Select Status..." [allowCreateNew]="false"></app-searchable-select>
                </div>

                <!-- Full Name English -->
                <div>
                  <app-custom-input label="Full Name (English) *" formControlName="full_name_en" placeholder="e.g. Alhaj Nurul Islam Chowdhury" [required]="true"></app-custom-input>
                  @if (ownerForm.get('full_name_en')?.touched && ownerForm.get('full_name_en')?.invalid) {
                    <p class="text-[10px] text-rose-500 mt-1">Full name in English is required.</p>
                  }
                </div>

                <!-- Full Name Bangla -->
                <div>
                  <app-custom-input label="Full Name (বাংলা - Bengali)" formControlName="full_name_bn" placeholder="e.g. আলহাজ্ব নুরুল ইসলাম চৌধুরী"></app-custom-input>
                </div>

                <!-- Father Name -->
                <div>
                  <app-custom-input label="Father's Name (পিতার নাম)" formControlName="father_name" placeholder="e.g. Late Abdul Karim Chowdhury"></app-custom-input>
                </div>

                <!-- Mother Name -->
                <div>
                  <app-custom-input label="Mother's Name (মাতার নাম)" formControlName="mother_name" placeholder="e.g. Amena Begum"></app-custom-input>
                </div>

                <!-- Spouse Name -->
                <div class="md:col-span-2">
                  <app-custom-input label="Spouse Name (স্বামী/স্ত্রীর নাম)" formControlName="spouse_name" placeholder="e.g. Rahela Begum (if married)"></app-custom-input>
                </div>

                <!-- NID -->
                <div>
                  <app-custom-input label="National ID (NID Number)" formControlName="nid_number" placeholder="10, 13, or 17 digit NID"></app-custom-input>
                </div>

                <!-- Passport -->
                <div>
                  <app-custom-input label="Passport Number" formControlName="passport_number" placeholder="e.g. EG1029384"></app-custom-input>
                </div>

                <!-- e-TIN -->
                <div>
                  <app-custom-input label="e-TIN Number" formControlName="tin_number" placeholder="12 digit Tax ID"></app-custom-input>
                </div>

                <!-- Company Reg -->
                <div>
                  <app-custom-input label="Company Registration (RJSC / Trade License)" formControlName="company_reg_number" placeholder="If corporate landowner"></app-custom-input>
                </div>
              </div>
            }

            <!-- TAB 2: CONTACT & ADDRESSES -->
            @if (activeTab === 'contact') {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <app-custom-input label="Primary Mobile Number" formControlName="phone_number" placeholder="+880 1712 345678"></app-custom-input>
                </div>
                <div>
                  <app-custom-input label="Email Address" formControlName="email" type="email" placeholder="owner@domain.com"></app-custom-input>
                  @if (ownerForm.get('email')?.touched && ownerForm.get('email')?.hasError('email')) {
                    <p class="text-[10px] text-rose-500 mt-1">Please enter a valid email address.</p>
                  }
                </div>
                <div>
                  <app-custom-input label="Emergency Contact Name" formControlName="emergency_contact_name" placeholder="Family member / Attorney name"></app-custom-input>
                </div>
                <div>
                  <app-custom-input label="Emergency Contact Mobile" formControlName="emergency_contact_phone" placeholder="+880 1..."></app-custom-input>
                </div>
                <div class="md:col-span-2">
                  <app-custom-textarea label="Present / Residential Address" formControlName="present_address" placeholder="House #, Road #, Area, Thana, District" [rows]="2"></app-custom-textarea>
                </div>
                <div class="md:col-span-2">
                  <app-custom-textarea label="Permanent Address (As per NID / Khatian)" formControlName="permanent_address" placeholder="Village, Post Office, Upazila, District" [rows]="2"></app-custom-textarea>
                </div>
              </div>
            }

            <!-- TAB 3: OWNERSHIP & BANKING DETAILS -->
            @if (activeTab === 'ownership') {
              <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <app-searchable-select label="Ownership Nature *" formControlName="ownership_nature" [options]="ownershipNatureOptions" placeholder="Select Inheritance/Purchase..." [allowCreateNew]="false"></app-searchable-select>
                  </div>
                  <div>
                    <app-custom-input label="Ownership Share Ratio (0.0001 to 1.0) *" formControlName="ownership_share_ratio" type="number" placeholder="1.0000 = 100% share" [required]="true"></app-custom-input>
                    <p class="text-[10px] text-slate-400 mt-1">E.g., 0.5000 represents 50% joint co-ownership.</p>
                  </div>
                </div>

                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">Restricted Banking Credentials (Signing Money / Land Cost Disbursement)</h4>
                  </div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><app-custom-input label="Bank Name" formControlName="bank_name" placeholder="e.g. Dutch-Bangla Bank PLC"></app-custom-input></div>
                    <div><app-custom-input label="Branch Name" formControlName="bank_branch" placeholder="e.g. Gulshan Branch"></app-custom-input></div>
                    <div><app-custom-input label="Account Holder Name" formControlName="bank_account_holder" placeholder="Name on bank passbook"></app-custom-input></div>
                    <div><app-custom-input label="Account Number" formControlName="bank_account_no" placeholder="e.g. 115.120.987654"></app-custom-input></div>
                    <div><app-custom-input label="Routing Number" formControlName="bank_routing_no" placeholder="9-digit routing number"></app-custom-input></div>
                  </div>
                </div>
              </div>
            }

            <!-- TAB 4: NOMINEE, POA & MULTIPLE DOCUMENTS -->
            @if (activeTab === 'nominee') {
              <div class="space-y-4">
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-blue-500 rounded-full"></span>
                    Legal Nominee Details
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><app-custom-input label="Nominee Name" formControlName="nominee_name" placeholder="Nominee full name"></app-custom-input></div>
                    <div><app-custom-input label="Relation with Landowner" formControlName="nominee_relation" placeholder="Son / Daughter / Spouse"></app-custom-input></div>
                    <div><app-custom-input label="Nominee NID Number" formControlName="nominee_nid" placeholder="NID number"></app-custom-input></div>
                  </div>
                </div>

                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span class="w-1.5 h-3.5 bg-amber-500 rounded-full"></span>
                    Registered Power-of-Attorney (PoA) Information
                  </h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div><app-custom-input label="Authorized PoA Holder Name" formControlName="poa_holder_name" placeholder="Signatory attorney name"></app-custom-input></div>
                    <div><app-custom-input label="PoA Deed Number" formControlName="poa_deed_no" placeholder="Sub-Registry Deed No"></app-custom-input></div>
                    <div><app-custom-input label="Execution Date" formControlName="poa_date" type="date"></app-custom-input></div>
                  </div>
                </div>

                <!-- Multiple Supporting Documents Upload Section -->
                <div class="p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                  <div class="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span class="w-1.5 h-3.5 bg-emerald-500 rounded-full"></span>
                        Supporting Legal Documents & Attachments (সংযুক্তি ও দলিলপত্র)
                      </h4>
                      <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        দলিলের কপি, পাওয়ার অব অ্যাটর্নি, খারিজ/নামজারি খতিয়ান, ডি.সি.আর, বা প্রত্যয়নপত্র আপলোড করুন
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="addDocumentRow()"
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      Add Another Document
                    </button>
                  </div>

                  <div class="space-y-2.5 pt-2">
                    @for (doc of documentList; track $index) {
                      <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col md:flex-row items-stretch md:items-center gap-3 transition hover:border-slate-300 dark:hover:border-slate-700">
                        <!-- Document Name Input -->
                        <div class="flex-1">
                          <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Document Name / Title (দলিল বা ডকুমেন্টের নাম) *
                          </label>
                          <input
                            type="text"
                            [(ngModel)]="doc.document_name"
                            [ngModelOptions]="{standalone: true}"
                            placeholder="e.g. Registered PoA Deed / Mutation DCR / Parcha / TIN"
                            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <!-- Document File Upload & View -->
                        <div class="flex-1">
                          <label class="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                            Upload File (PDF, Images, DOCX)
                          </label>
                          <div class="flex items-center gap-2 flex-wrap">
                            <input
                              #docFileInput
                              type="file"
                              class="hidden"
                              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                              (change)="onDocumentFileSelected($index, $event)"
                            />
                            <button
                              type="button"
                              (click)="docFileInput.click()"
                              [disabled]="doc.is_uploading"
                              class="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
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
                                class="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[170px] inline-flex items-center gap-1"
                                [title]="doc.file_name || 'Open file'"
                              >
                                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                <span class="truncate">{{ doc.file_name || 'View File' }}</span>
                              </a>
                              <span class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                ✓ Uploaded
                              </span>
                            } @else if (doc.file_name) {
                              <span class="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{{ doc.file_name }}</span>
                            }
                          </div>
                          @if (doc.error) {
                            <p class="text-[10px] text-red-500 mt-1">{{ doc.error }}</p>
                          }
                        </div>

                        <!-- Delete Row Button -->
                        <div class="flex items-center self-end md:self-center pt-2 md:pt-4">
                          <button
                            type="button"
                            (click)="removeDocumentRow($index)"
                            class="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Remove Document"
                          >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </div>
                    }

                    @if (documentList.length === 0) {
                      <div class="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-900/40">
                        <svg class="w-8 h-8 mx-auto text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5">No documents added yet</p>
                        <button type="button" (click)="addDocumentRow()" class="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                          + Add First Document
                        </button>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Form Navigation & Submit Actions -->
            <div class="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                @if (activeTab !== 'personal') {
                  <button type="button" (click)="goToPreviousTab()" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs">
                    &larr; Previous Tab
                  </button>
                }
                @if (activeTab !== 'nominee') {
                  <button type="button" (click)="goToNextTab()" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs">
                    Next Tab &rarr;
                  </button>
                }
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button type="button" (click)="goBack()" class="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-2xs">
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

  // NID OCR state
  nidSelectedFile: File | null = null;
  nidPreviewUrl: string | null = null;
  nidFileName = '';
  nidDragOver = false;
  isOcrProcessing = false;
  ocrExtractedText = '';
  ocrStatus = '';
  isUploadingNid = false;
  nidUploaded = false;
  existingNidImagePath = '';

  // Supporting Documents state
  documentList: LandownerDocItem[] = [
    { document_name: '', is_uploading: false, uploaded: false }
  ];

  readonly apiBase = 'http://localhost:8000';

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
    father_name: [''],
    mother_name: [''],
    spouse_name: [''],
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
        if (owner.nid_image_path) this.existingNidImagePath = owner.nid_image_path;
        const nominee = owner.nominee_details && owner.nominee_details[0] ? owner.nominee_details[0] : {};
        const poa = owner.poa_details || {};

        this.ownerForm.patchValue({
          landowner_code: owner.landowner_code,
          owner_type: owner.owner_type,
          full_name_en: owner.full_name_en,
          full_name_bn: owner.full_name_bn || '',
          father_name: owner.father_name || '',
          mother_name: owner.mother_name || '',
          spouse_name: owner.spouse_name || '',
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

        if (owner.supporting_documents && Array.isArray(owner.supporting_documents) && owner.supporting_documents.length > 0) {
          this.documentList = owner.supporting_documents.map(d => ({
            document_name: d['document_name'] || d['file_name'] || '',
            file_url: d['file_url'],
            file_name: d['file_name'] || (d['file_url'] ? d['file_url'].split('/').pop() : ''),
            file_size: d['file_size'],
            uploaded: !!d['file_url'],
            uploaded_at: d['uploaded_at']
          }));
        } else {
          this.documentList = [{ document_name: '', is_uploading: false, uploaded: false }];
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load landowner', err);
        this.errorMessage = err.error?.detail || 'Failed to load landowner details.';
        this.isLoading = false;
      }
    });
  }

  // ---- NID OCR Methods ----

  onNidDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.nidDragOver = true;
  }

  onNidDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.nidDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processNidFile(files[0]);
    }
  }

  onNidFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processNidFile(input.files[0]);
    }
  }

  processNidFile(file: File): void {
    if (file.size > 10 * 1024 * 1024) {
      this.ocrStatus = '✗ File too large. Max 10 MB.';
      return;
    }
    this.nidSelectedFile = file;
    this.nidFileName = file.name;
    this.nidUploaded = false;
    this.ocrStatus = '';
    this.ocrExtractedText = '';

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.nidPreviewUrl = e.target?.result as string;
        this.runOcrAndFill();
      };
      reader.readAsDataURL(file);
    } else {
      // PDF — show file icon, no preview
      this.nidPreviewUrl = null;
      this.ocrStatus = '📄 PDF selected. Click "Upload NID" to save.';
    }
  }

  runOcrAndFill(): void {
    if (!this.nidSelectedFile || !this.nidPreviewUrl) return;

    this.isOcrProcessing = true;
    this.ocrStatus = '🔍 Scanning NID image...';

    // Use Tesseract.js via dynamic import (loaded from CDN in index.html or installed)
    // Fallback: use a canvas-based approach + simple pattern matching
    this.performBrowserOcr(this.nidPreviewUrl);
  }

  private async performBrowserOcr(imageDataUrl: string): Promise<void> {
    try {
      // Check if Tesseract is available globally (loaded via CDN)
      const Tesseract = (window as any)['Tesseract'];
      if (!Tesseract) {
        this.ocrStatus = '⚠️ OCR engine not loaded. Please fill fields manually.';
        this.isOcrProcessing = false;
        return;
      }

      const result = await Tesseract.recognize(imageDataUrl, 'ben+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            this.ocrStatus = `🔍 Scanning... ${Math.round((m.progress || 0) * 100)}%`;
          }
        }
      });

      const text: string = result?.data?.text || '';
      this.ocrExtractedText = text.trim();
      this.isOcrProcessing = false;

      if (!text.trim()) {
        this.ocrStatus = '✗ Could not extract text. Please fill fields manually.';
        return;
      }

      // Parse NID fields from extracted text
      this.parseAndFillNidFields(text);

    } catch (err) {
      console.error('OCR error:', err);
      this.isOcrProcessing = false;
      this.ocrStatus = '✗ OCR failed. Please fill fields manually.';
    }
  }

  private parseAndFillNidFields(text: string): void {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const filledFields: string[] = [];

    // Helper to sanitize bengali text
    const cleanBn = (str: string) => str.replace(/^[^\u0980-\u09FF]+|[^\u0980-\u09FF]+$/g, '').replace(/\s+/g, ' ').trim();
    // Helper to sanitize english name
    const cleanEn = (str: string) => str.replace(/[^A-Za-z .\-]/g, '').replace(/\s+/g, ' ').trim();

    // ── 1. NID Number ──
    // Formats:
    // a) "NID No. 326 848 3744" or "nove. 326 848 3744"
    // b) MRZ: "I<BGD326848374<43" -> 3268483744
    // c) Spaced 10 digits: "326 848 3744" (3+3+4)
    // d) Bare 10, 13, 17 digits
    let nidFound = '';
    const mrzMatch = text.match(/<BGD(\d{10})/i) || text.match(/BGD(\d{10})/i);
    const nidSpacedMatch = text.match(/\b(\d{3})\s+(\d{3})\s+(\d{4})\b/);
    const nidLabelMatch = text.match(/(?:NID\s*No\.?|nove\.?|ID\s*No\.?)\s*([\d\s]{9,20})/i);
    const bareNidMatch = text.match(/\b(\d{17}|\d{13}|\d{10})\b/);

    if (mrzMatch) {
      nidFound = mrzMatch[1];
    } else if (nidSpacedMatch) {
      nidFound = `${nidSpacedMatch[1]}${nidSpacedMatch[2]}${nidSpacedMatch[3]}`;
    } else if (nidLabelMatch) {
      const cleaned = nidLabelMatch[1].replace(/\D/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 17) nidFound = cleaned;
    } else if (bareNidMatch) {
      nidFound = bareNidMatch[1];
    }

    if (nidFound) {
      this.ownerForm.patchValue({ nid_number: nidFound });
      filledFields.push(`NID: ${nidFound}`);
    }

    // ── 2. English Name ──
    // Match "Name MD. RUHUL AMIN" or multi-line "Name\nMD. RUHUL AMIN"
    let enNameFound = '';
    const nameLineIdx = lines.findIndex(l => /^Name$/i.test(l));
    if (nameLineIdx !== -1 && lines[nameLineIdx + 1] && /^[A-Z][A-Za-z .\-]+$/.test(lines[nameLineIdx + 1])) {
      enNameFound = cleanEn(lines[nameLineIdx + 1]);
    } else {
      const enMatch = text.match(/\bName\s*[:\-–]?\s*([A-Z][A-Z\s.\-]{2,30}?)(?=\s*[\u0980-\u09FF]|পিতা|Father|Date|DOB|\n|$)/i);
      if (enMatch) {
        enNameFound = cleanEn(enMatch[1]);
      }
    }

    if (enNameFound && enNameFound.length >= 3) {
      this.ownerForm.patchValue({ full_name_en: enNameFound });
      filledFields.push(`Name (EN): ${enNameFound}`);
    }

    // ── 3. Bangla Name (নাম) ──
    // In BD NID, appears before "Name MD..." or after "National ID Card -" or "নাম:"
    let bnNameFound = '';
    const bnBeforeNameMatch = text.match(/(?:National ID Card\s*[-–:]*|\bনাম\s*[:\-–]?)\s*([\u0980-\u09FF\s.]+?)(?=\s+Name|\s+পিতা|\s+Father|\n|$)/i);
    const bnLineIdx = lines.findIndex(l => /^নাম$/.test(l));

    if (bnLineIdx !== -1 && lines[bnLineIdx + 1] && /[\u0980-\u09FF]/.test(lines[bnLineIdx + 1])) {
      bnNameFound = cleanBn(lines[bnLineIdx + 1]);
    } else if (bnBeforeNameMatch) {
      bnNameFound = cleanBn(bnBeforeNameMatch[1]);
    }

    if (bnNameFound && bnNameFound.length >= 2) {
      this.ownerForm.patchValue({ full_name_bn: bnNameFound });
      filledFields.push(`Name (বাংলা): ${bnNameFound}`);
    }

    // ── 4. Father's Name (পিতা) ──
    // Matches "পিতা bmn) 'আককাচ আলী" or "পিতা\nআককাচ আলী"
    let fatherFound = '';
    const fatherLineIdx = lines.findIndex(l => /^পিতা$/.test(l) || /^Father/i.test(l));
    if (fatherLineIdx !== -1 && lines[fatherLineIdx + 1] && /[\u0980-\u09FF]/.test(lines[fatherLineIdx + 1])) {
      fatherFound = cleanBn(lines[fatherLineIdx + 1]);
    } else {
      const fatherMatch = text.match(/(?:পিতা|Father)[^\u0980-\u09FF\n]{0,25}([\u0980-\u09FF\s.']{2,40}?)(?=\s*(?:pi|J|মাতা|Mother|Date|জন্ম|\d|\n|$))/i);
      if (fatherMatch) {
        fatherFound = cleanBn(fatherMatch[1]);
      }
    }

    if (fatherFound && fatherFound.length >= 2) {
      this.ownerForm.patchValue({ father_name: fatherFound });
      filledFields.push(`Father: ${fatherFound}`);
    }

    // ── 5. Mother's Name (মাতা) ──
    // Matches "মাতা মোছাঃ রাহিমা খাতুন" or misread label e.g. "pi J মোছাঃ রাহিমা খাতুন 74 . Date of Birth"
    let motherFound = '';
    const motherLineIdx = lines.findIndex(l => /^মাতা$/.test(l) || /^Mother/i.test(l));
    if (motherLineIdx !== -1 && lines[motherLineIdx + 1] && /[\u0980-\u09FF]/.test(lines[motherLineIdx + 1])) {
      motherFound = cleanBn(lines[motherLineIdx + 1]);
    } else {
      const motherMatch = text.match(/(?:মাতা|Mother|pi\s*J)[^\u0980-\u09FF\n]{0,25}([\u0980-\u09FF\s.']{2,40}?)(?=\s*(?:\d|Date|জন্ম|Blood|\n|$))/i);
      if (motherMatch) {
        motherFound = cleanBn(motherMatch[1]);
      } else {
        // Fallback: Bengali name before Date of Birth
        const dobBnFallback = text.match(/([\u0980-\u09FF\s.']{3,35}?)\s*(?:\d+.*?)?Date of Birth/i);
        if (dobBnFallback && cleanBn(dobBnFallback[1]) !== fatherFound) {
          motherFound = cleanBn(dobBnFallback[1]);
        }
      }
    }

    if (motherFound && motherFound.length >= 2) {
      this.ownerForm.patchValue({ mother_name: motherFound });
      filledFields.push(`Mother: ${motherFound}`);
    }

    if (filledFields.length > 0) {
      this.ocrStatus = `✓ Auto-filled: ${filledFields.join(' | ')}`;
    } else {
      this.ocrStatus = '⚠️ Text detected but fields could not match. Please fill manually.';
    }
  }

  clearNidSelection(clearFormValues: boolean = false): void {
    this.nidSelectedFile = null;
    this.nidPreviewUrl = null;
    this.nidFileName = '';
    this.ocrExtractedText = '';
    this.ocrStatus = '';
    this.nidUploaded = false;

    if (clearFormValues) {
      this.ownerForm.patchValue({
        full_name_en: '',
        full_name_bn: '',
        father_name: '',
        mother_name: '',
        nid_number: ''
      });
    }
  }

  // Change Image: clear state, reset old form fields, and re-open file picker
  changeNidImage(inputEl: HTMLInputElement): void {
    this.clearNidSelection(true); // reset old NID data from form
    inputEl.value = '';           // reset input so 'change' fires even for same file
    inputEl.click();              // open file picker immediately
  }

  uploadNidImage(): void {
    if (!this.nidSelectedFile || !this.editingOwnerId) return;
    this.isUploadingNid = true;
    this.landService.uploadLandownerNid(this.editingOwnerId, this.nidSelectedFile).subscribe({
      next: (res) => {
        this.isUploadingNid = false;
        this.nidUploaded = true;
        this.existingNidImagePath = res.nid_image_path;
        this.ocrStatus = '✓ NID image uploaded successfully!';
      },
      error: (err) => {
        this.isUploadingNid = false;
        this.ocrStatus = '✗ Upload failed: ' + (err.error?.detail || err.message);
      }
    });
  }

  // ---- Tab Navigation ----

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

  // ---- Save ----

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
      father_name: formVal.father_name?.trim() || null,
      mother_name: formVal.mother_name?.trim() || null,
      spouse_name: formVal.spouse_name?.trim() || null,
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
      poa_details,
      supporting_documents: this.documentList
        .filter(d => (d.file_url || (d.document_name && d.document_name.trim())))
        .map(d => ({
          document_name: (d.document_name || d.file_name || 'Document').trim(),
          file_url: d.file_url || null,
          file_name: d.file_name || null,
          file_size: d.file_size || null,
          uploaded_at: d.uploaded_at || new Date().toISOString()
        }))
    };

    if (this.isEditMode && this.editingOwnerId) {
      this.landService.updateLandowner(this.editingOwnerId, payload).subscribe({
        next: (updated) => {
          this.isSaving = false;
          this.successMessage = `Landowner "${updated.full_name_en}" (${updated.landowner_code}) updated successfully!`;
          // Upload NID if selected but not yet uploaded
          if (this.nidSelectedFile && !this.nidUploaded && this.editingOwnerId) {
            this.uploadNidImage();
          }
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
          // Upload NID image after creation
          if (this.nidSelectedFile && created.id) {
            this.editingOwnerId = created.id;
            this.isEditMode = true;
            this.uploadNidImage();
          }
        },
        error: (err) => {
          console.error('Create landowner error:', err);
          this.errorMessage = err.error?.detail || 'Failed to register new landowner.';
          this.isSaving = false;
        }
      });
    }
  }

  // ---- Supporting Documents Methods ----

  addDocumentRow(): void {
    this.documentList.push({
      document_name: '',
      is_uploading: false,
      uploaded: false
    });
  }

  removeDocumentRow(index: number): void {
    this.documentList.splice(index, 1);
  }

  onDocumentFileSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const item = this.documentList[index];
    if (!item) return;

    if (!item.document_name || !item.document_name.trim()) {
      item.document_name = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    }

    item.file = file;
    item.file_name = file.name;
    item.file_size = file.size;
    item.is_uploading = true;
    item.error = undefined;

    this.landService.uploadLandownerDocument(file, item.document_name).subscribe({
      next: (res) => {
        item.is_uploading = false;
        item.uploaded = true;
        item.file_url = res.file_url;
        item.file_name = res.file_name;
        item.uploaded_at = new Date().toISOString();
      },
      error: (err) => {
        item.is_uploading = false;
        item.error = err.error?.detail || err.message || 'Upload failed';
      }
    });
  }

  resetForNew(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.loadedLandownerCode = '';
    this.activeTab = 'personal';
    this.clearNidSelection();
    this.existingNidImagePath = '';
    this.editingOwnerId = null;
    this.isEditMode = false;
    this.documentList = [
      { document_name: '', is_uploading: false, uploaded: false }
    ];
    this.ownerForm.reset({
      landowner_code: '',
      owner_type: 'INDIVIDUAL',
      full_name_en: '',
      full_name_bn: '',
      father_name: '',
      mother_name: '',
      spouse_name: '',
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
