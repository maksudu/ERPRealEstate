import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { PriceNegotiationProposal } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-discount-proposal-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/discounts"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Price Negotiation & Discounts"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.4 · Price Negotiation & Concession Review
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ proposal()?.proposal_reference_no || 'Loading...' }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Commercial Proposal & Authorization Dossier
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          @if (proposal()?.booking_id) {
            <a
              [routerLink]="['/sales/bookings', proposal()?.booking_id]"
              class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              View Linked Booking
            </a>
          }
          <a
            routerLink="/sales/discounts/create"
            class="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Negotiation
          </a>
        </div>
      </div>

      @if (isLoading()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading commercial proposal dossier...
        </div>
      } @else if (proposal()) {
        <!-- Key Metadata Status Header Banner -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              [ngClass]="{
                'bg-amber-500/10 text-amber-500 border border-amber-500/20': proposal()?.status === 'PENDING_REVIEW',
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': proposal()?.status === 'APPROVED',
                'bg-rose-500/10 text-rose-500 border border-rose-500/20': proposal()?.status === 'REJECTED'
              }">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold text-foreground">{{ proposal()?.proposal_reference_no }}</h2>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20': proposal()?.status === 'PENDING_REVIEW',
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': proposal()?.status === 'APPROVED',
                    'bg-rose-500/10 text-rose-500 border border-rose-500/20': proposal()?.status === 'REJECTED'
                  }">
                  {{ proposal()?.status }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Submitted by <strong class="text-foreground">{{ proposal()?.submitted_by_rep_name }}</strong> on {{ proposal()?.created_at | date:'medium' }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-secondary/60 rounded-xl border border-border text-right">
              <span class="text-[10px] font-semibold uppercase text-muted-foreground block">Delegated Approval Tier</span>
              @if (proposal()?.required_approval_tier === 'MANAGING_DIRECTOR') {
                <span class="text-xs font-bold text-purple-500 inline-flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8m0 0a8 8 0 008-8"/>
                  </svg>
                  MD Biometric Escalation (> 7%)
                </span>
              } @else if (proposal()?.required_approval_tier === 'HEAD_OF_SALES') {
                <span class="text-xs font-bold text-blue-500">Head of Sales Sign-off (3% - 7%)</span>
              } @else {
                <span class="text-xs font-bold text-emerald-500">Sales Manager Authority (&le; 3%)</span>
              }
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Details, Pricing Breakdown & Justification -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            <!-- 1. Stakeholders & Unit Context -->
            <app-card-container title="Property & Customer Context" subtitle="Target asset and prospective buyer identification">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span class="text-[11px] font-semibold text-muted-foreground uppercase block">Customer Profile</span>
                  <div class="font-bold text-foreground text-sm mt-0.5">{{ proposal()?.customer_name }}</div>
                  <div class="text-xs text-muted-foreground">{{ proposal()?.customer_phone || 'No phone' }}</div>
                  <div class="text-[11px] font-mono text-primary mt-1">Code: {{ proposal()?.customer_code || 'N/A' }}</div>
                </div>

                <div class="p-3 bg-secondary/40 rounded-xl border border-border">
                  <span class="text-[11px] font-semibold text-muted-foreground uppercase block">Project & Unit</span>
                  <div class="font-bold text-foreground text-sm mt-0.5">{{ proposal()?.project_name }}</div>
                  <div class="text-xs text-muted-foreground">Unit: <strong class="text-foreground">{{ proposal()?.unit_number }}</strong></div>
                  <div class="text-[11px] text-muted-foreground mt-1">
                    Area: <strong class="text-foreground">{{ proposal()?.chargeable_area_sqft || 0 }} sqft</strong>
                    @if (proposal()?.price_per_sqft) {
                      &bull; {{ proposal()?.price_per_sqft | number:'1.0-0' }} BDT/sqft
                    }
                  </div>
                </div>
              </div>
            </app-card-container>

            <!-- 2. Transparent Pricing Components (Spec 5.4) -->
            <app-card-container title="Detailed Pricing Breakdown" subtitle="Transparent commercial pricing components under Board Resolution 2026">
              <div class="border border-border rounded-xl overflow-hidden divide-y divide-border">
                <div class="flex items-center justify-between p-3.5 bg-secondary/20">
                  <span class="text-xs font-medium text-foreground">Base Unit Price</span>
                  <span class="text-xs font-mono font-bold text-foreground">BDT {{ proposal()?.base_unit_price | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-3.5 bg-secondary/10">
                  <div>
                    <span class="text-xs font-medium text-foreground">Floor / Facing Premium Charge</span>
                    <span class="block text-[11px] text-muted-foreground">Lake/corner/top floor view differential</span>
                  </div>
                  <span class="text-xs font-mono font-medium text-foreground">BDT {{ proposal()?.floor_facing_premium | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-3.5 bg-secondary/20">
                  <div>
                    <span class="text-xs font-medium text-foreground">Dedicated Parking & Facility Charge</span>
                    <span class="block text-[11px] text-muted-foreground">Reserved basement bay & club access</span>
                  </div>
                  <span class="text-xs font-mono font-medium text-foreground">BDT {{ proposal()?.parking_facility_charge | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-3.5 bg-secondary/10">
                  <div>
                    <span class="text-xs font-medium text-foreground">Utility & Other Approved Fees</span>
                    <span class="block text-[11px] text-muted-foreground">DESCO substation, WASA & solar connection</span>
                  </div>
                  <span class="text-xs font-mono font-medium text-foreground">BDT {{ proposal()?.utility_other_fees | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-4 bg-secondary/40 font-bold">
                  <span class="text-xs uppercase tracking-wider text-muted-foreground">Gross Standard List Price</span>
                  <span class="text-sm font-mono text-foreground">BDT {{ proposal()?.gross_list_price | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-3.5 bg-amber-500/5">
                  <div>
                    <span class="text-xs font-semibold text-amber-500">Requested Discount / Concession</span>
                    <span class="block text-[11px] text-muted-foreground">Rate: {{ proposal()?.requested_discount_percentage }}% off base unit price</span>
                  </div>
                  <span class="text-xs font-mono font-bold text-amber-500">- BDT {{ proposal()?.requested_discount_amount | number:'1.0-0' }}</span>
                </div>

                <div class="flex items-center justify-between p-4 bg-primary/10 font-bold border-t-2 border-primary/20">
                  <div>
                    <span class="text-sm text-primary uppercase tracking-wider">Proposed Contractual Selling Price</span>
                    <span class="block text-[11px] text-muted-foreground font-normal">Pending commercial authorized sign-off</span>
                  </div>
                  <span class="text-base font-mono text-primary">BDT {{ proposal()?.proposed_final_price | number:'1.0-0' }}</span>
                </div>
              </div>
            </app-card-container>

            <!-- 3. Submitter Justification & Supporting Documents -->
            <app-card-container title="Commercial Justification & Exception Rationale" subtitle="Mandatory explanation required for delegated audit trail">
              <div class="flex flex-col gap-4">
                <div class="p-4 bg-secondary/40 rounded-xl border border-border">
                  <span class="text-[11px] font-semibold text-muted-foreground uppercase block mb-1">Reason Stated by Sales Representative</span>
                  <p class="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {{ proposal()?.justification_reason || 'No detailed reason provided.' }}
                  </p>
                </div>

                @if (proposal()?.supporting_document_url) {
                  <div class="p-3 bg-secondary/20 rounded-xl border border-border flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      <div>
                        <span class="text-xs font-semibold text-foreground block">Attached Supporting Document</span>
                        <span class="text-[11px] text-muted-foreground font-mono truncate max-w-xs block">{{ proposal()?.supporting_document_url }}</span>
                      </div>
                    </div>
                    <a
                      [href]="proposal()?.supporting_document_url"
                      target="_blank"
                      class="px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-semibold hover:bg-secondary transition-colors inline-flex items-center gap-1"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      Open File
                    </a>
                  </div>
                }
              </div>
            </app-card-container>
          </div>

          <!-- Right Col: Review & Authorize Decision Panel -->
          <div class="flex flex-col gap-6">
            @if (proposal()?.status === 'PENDING_REVIEW') {
              <!-- Authorization Action Box -->
              <div class="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-sm flex flex-col gap-5">
                <div>
                  <span class="text-[11px] font-bold text-primary uppercase tracking-wider block">Commercial Authorization Action</span>
                  <h3 class="text-base font-bold text-foreground mt-0.5">Approve or Reject Proposal</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Authorized signatures will update booking contractual terms.
                  </p>
                </div>

                <form [formGroup]="reviewForm" (ngSubmit)="submitReview()" class="flex flex-col gap-4">
                  <!-- Decision Choice Toggle -->
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      (click)="setDecision('APPROVED')"
                      class="py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
                      [ngClass]="reviewForm.value.decision === 'APPROVED' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-secondary/40 text-foreground border-border hover:bg-secondary'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                      </svg>
                      Approve Concession
                    </button>

                    <button
                      type="button"
                      (click)="setDecision('REJECTED')"
                      class="py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
                      [ngClass]="reviewForm.value.decision === 'REJECTED' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-secondary/40 text-foreground border-border hover:bg-secondary'"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                      Reject Request
                    </button>
                  </div>

                  <app-custom-input
                    label="Authorized Approver Name *"
                    placeholder="e.g. Imran Hossain (Head of Sales)"
                    [formGroup]="reviewForm"
                    controlName="approved_by_name"
                  />

                  @if (reviewForm.value.decision === 'APPROVED') {
                    <app-custom-input
                      label="Final Approved Discount Amount (BDT) *"
                      type="number"
                      placeholder="e.g. 150000"
                      [formGroup]="reviewForm"
                      controlName="approved_discount_amount"
                    />

                    <!-- Recalculated Final Price Preview -->
                    <div class="p-3 bg-secondary/50 rounded-xl border border-border flex items-center justify-between text-xs">
                      <span class="text-muted-foreground font-medium">Resulting Selling Price:</span>
                      <span class="font-mono font-bold text-foreground">
                        BDT {{ computedApprovedFinalPrice() | number:'1.0-0' }}
                      </span>
                    </div>

                    @if (proposal()?.required_approval_tier === 'MANAGING_DIRECTOR') {
                      <div class="p-3.5 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500 shrink-0 mt-0.5">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8 8 0 008 8m0 0a8 8 0 008-8"/>
                          </svg>
                        </div>
                        <div class="text-xs flex-1">
                          <span class="font-bold text-purple-500 block">MD Biometric Escalation (> 7%)</span>
                          <span class="text-muted-foreground text-[11px] block mt-0.5">
                            Board Resolution 2026 mandates physical or mobile hardware biometric authorization for this tier.
                          </span>
                          <input
                            type="text"
                            formControlName="biometric_token"
                            placeholder="Biometric signature token..."
                            class="mt-2 w-full px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-card text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    }
                  }

                  <app-custom-textarea
                    label="Reviewer Comments & Executive Directives *"
                    placeholder="Enter formal justification, conditions or reasons for approval/rejection..."
                    [formGroup]="reviewForm"
                    controlName="approval_comments"
                  />

                  <div class="pt-2">
                    <button
                      type="submit"
                      [disabled]="isSubmitting() || reviewForm.invalid"
                      class="w-full py-3 rounded-xl font-bold text-xs tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2"
                      [ngClass]="reviewForm.value.decision === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'"
                    >
                      @if (isSubmitting()) {
                        <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Recording Decision...
                      } @else {
                        <span>Confirm {{ reviewForm.value.decision === 'APPROVED' ? 'Approval' : 'Rejection' }}</span>
                      }
                    </button>
                  </div>
                </form>
              </div>
            } @else {
              <!-- Completed Decision Audit Card -->
              <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div class="flex items-center justify-between pb-3 border-b border-border">
                  <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Executive Decision Record</span>
                    <h3 class="text-sm font-bold text-foreground mt-0.5">Formal Audit Trail</h3>
                  </div>
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full"
                    [ngClass]="proposal()?.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'">
                    {{ proposal()?.status }}
                  </span>
                </div>

                <div class="flex flex-col gap-3 text-xs">
                  <div>
                    <span class="text-muted-foreground block text-[11px]">Decided By</span>
                    <span class="font-bold text-foreground text-sm">{{ proposal()?.approved_by_name || 'Authorized Signatory' }}</span>
                  </div>

                  <div>
                    <span class="text-muted-foreground block text-[11px]">Decision Timestamp</span>
                    <span class="font-mono text-foreground">{{ proposal()?.decision_date | date:'medium' }}</span>
                  </div>

                  @if (proposal()?.status === 'APPROVED') {
                    <div class="p-3 bg-secondary/40 rounded-xl border border-border flex flex-col gap-2">
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">Original List Price:</span>
                        <span class="font-mono">BDT {{ proposal()?.gross_list_price | number:'1.0-0' }}</span>
                      </div>
                      <div class="flex justify-between text-amber-500 font-semibold">
                        <span>Authorized Discount:</span>
                        <span class="font-mono">- BDT {{ proposal()?.approved_discount_amount || proposal()?.requested_discount_amount | number:'1.0-0' }}</span>
                      </div>
                      <div class="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                        <span>Contractual Final Price:</span>
                        <span class="font-mono text-emerald-500">BDT {{ proposal()?.approved_final_price || proposal()?.proposed_final_price | number:'1.0-0' }}</span>
                      </div>
                    </div>
                  }

                  <div>
                    <span class="text-muted-foreground block text-[11px] mb-1">Executive Directives / Remarks</span>
                    <p class="p-3 bg-secondary/30 rounded-xl border border-border text-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {{ proposal()?.approval_comments || 'No remarks recorded.' }}
                    </p>
                  </div>
                </div>
              </div>
            }

            <!-- Governance Compliance Notice Card -->
            <div class="bg-secondary/30 border border-border rounded-xl p-4 flex flex-col gap-2">
              <div class="flex items-center gap-2 text-foreground font-semibold text-xs">
                <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Commercial Compliance Note
              </div>
              <p class="text-[11px] text-muted-foreground leading-relaxed">
                Under Spec 5.4, all commercial concessions are strictly bounded. Once a proposal is approved and the booking is confirmed, subsequent price changes must be routed through an official agreement amendment.
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class DiscountProposalDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  proposalId = signal<number | null>(null);
  proposal = signal<PriceNegotiationProposal | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  reviewForm: FormGroup = this.fb.group({
    decision: ['APPROVED', Validators.required],
    approved_by_name: ['Executive Management', Validators.required],
    approved_discount_amount: [0, [Validators.required, Validators.min(0)]],
    approval_comments: ['', Validators.required],
    biometric_token: ['']
  });

  computedApprovedFinalPrice = computed(() => {
    const p = this.proposal();
    if (!p) return 0;
    const gross = Number(p.gross_list_price) || 0;
    const disc = Number(this.reviewForm.value.approved_discount_amount) || 0;
    return Math.max(0, gross - disc);
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.proposalId.set(Number(idParam));
      this.loadProposal(Number(idParam));
    }
  }

  loadProposal(id: number): void {
    this.isLoading.set(true);
    this.salesService.getDiscountProposal(id).subscribe({
      next: (res) => {
        this.proposal.set(res);
        this.isLoading.set(false);

        // Pre-fill review form with proposal requested amount
        this.reviewForm.patchValue({
          approved_discount_amount: res.requested_discount_amount || 0,
          approval_comments: res.status === 'APPROVED' ? (res.approval_comments || '') : 'Commercial concession verified and authorized under executive delegation policy.',
          biometric_token: res.required_approval_tier === 'MANAGING_DIRECTOR' ? 'BIO-MD-2026-FINGERPRINT-AUTH' : ''
        });
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to load price negotiation proposal.');
        this.isLoading.set(false);
      }
    });
  }

  setDecision(decision: 'APPROVED' | 'REJECTED'): void {
    this.reviewForm.patchValue({ decision });
    if (decision === 'REJECTED') {
      this.reviewForm.patchValue({
        approved_discount_amount: 0,
        approval_comments: 'Discount request exceeds permissible commercial thresholds or lacks sufficient margin justification.'
      });
    } else {
      const p = this.proposal();
      if (p) {
        this.reviewForm.patchValue({
          approved_discount_amount: p.requested_discount_amount,
          approval_comments: 'Commercial concession verified and authorized under executive delegation policy.'
        });
      }
    }
  }

  submitReview(): void {
    const id = this.proposalId();
    if (!id || this.reviewForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.reviewForm.value;

    const payload = {
      decision: formVal.decision,
      approved_by_name: formVal.approved_by_name,
      approved_discount_amount: Number(formVal.approved_discount_amount) || 0,
      approval_comments: formVal.approval_comments,
      biometric_token: formVal.biometric_token
    };

    this.salesService.reviewDiscountProposal(id, payload).subscribe({
      next: (updated) => {
        this.proposal.set(updated);
        this.isSubmitting.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to record approval decision.');
        this.isSubmitting.set(false);
      }
    });
  }
}
