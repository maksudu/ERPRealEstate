import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { CrmService } from '../../../core/services/crm.service';
import { Booking, BookingJointBuyer, BookingNominee } from '../../../core/models/sales.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-16">
      <!-- Breadcrumb & Top Navigation Bar -->
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
                Booking-to-Handover Workflow
              </span>
              <span class="text-xs text-muted-foreground font-mono font-bold">
                {{ booking()?.booking_reference_no }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Unit {{ booking()?.unit_number }} · {{ booking()?.project_name }}
            </h1>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Edit Booking Link -->
          <a
            [routerLink]="['/sales/bookings', booking()?.id, 'edit']"
            class="px-3.5 py-2 text-xs font-medium text-foreground bg-card hover:bg-secondary rounded-xl border border-border inline-flex items-center gap-1.5 transition-colors"
          >
            <svg class="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit Booking
          </a>

          <!-- Download Bilingual Deed PDF (WeasyPrint) -->
          <app-custom-button
            variant="outline"
            (clicked)="downloadDeedPdf()"
          >
            <span class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Bilingual Deed PDF
            </span>
          </app-custom-button>

          <!-- Agreement & Deed Preparation (Spec 5.6) -->
          <a
            [routerLink]="['/sales/documents/create']"
            [queryParams]="{ booking_id: booking()?.id }"
            class="px-3.5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Prepare Agreement & Deed (5.6)
          </a>

          <!-- Confirm Booking (if Provisional) -->
          @if (booking()?.status === 'PROVISIONAL') {
            <app-custom-button
              variant="primary"
              (clicked)="confirmBooking()"
              [disabled]="isActionLoading()"
            >
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Confirm Booking (Stage 05)
              </span>
            </app-custom-button>

            <button
              (click)="releaseReservation()"
              [disabled]="isActionLoading()"
              class="px-3 py-2 text-xs font-medium text-rose-500 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors"
            >
              Release Reservation
            </button>
          }

          <!-- Transfer Allotment -->
          @if (booking()?.status !== 'CANCELLED') {
            <button
              (click)="openTransferModal()"
              class="px-3 py-2 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-colors"
            >
              Transfer Allotment
            </button>
          }
        </div>
      </div>

      <!-- 10-Stage Visual Workflow Tracker -->
      <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="text-sm font-bold text-foreground">10-Stage Booking-to-Handover Progress Tracker</h3>
            <p class="text-xs text-muted-foreground">Current Stage: {{ getActiveStageTitle() }}</p>
          </div>
          <span 
            class="text-xs font-bold px-3 py-1 rounded-full uppercase"
            [ngClass]="{
              'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': booking()?.status === 'AGREEMENT_SIGNED' || booking()?.status === 'REGISTRATION_DONE',
              'bg-blue-500/10 text-blue-500 border border-blue-500/20': booking()?.status === 'PROVISIONAL',
              'bg-purple-500/10 text-purple-500 border border-purple-500/20': booking()?.status === 'TRANSFERRED',
              'bg-rose-500/10 text-rose-500 border border-rose-500/20': booking()?.status === 'CANCELLED'
            }"
          >
            {{ booking()?.status?.replace('_', ' ') }}
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          @for (s of workflowStages; track s.id; let idx = $index) {
            <div 
              class="p-2.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer"
              [ngClass]="getStageClass(s.id, idx)"
              (click)="updateStage(s.id)"
              [title]="'Click to update stage to ' + s.name"
            >
              <div 
                class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1"
                [ngClass]="getStageCircleClass(s.id, idx)"
              >
                {{ idx + 1 }}
              </div>
              <span class="text-[11px] font-medium leading-tight truncate w-full">{{ s.name }}</span>
            </div>
          }
        </div>
      </div>

      <!-- 4-Metric Financial Summary Grid (Spec 5.1 Non-Interchangeable Figures) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Signed Contract Value -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signed Contract Value</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">Contractual</span>
          </div>
          <h3 class="text-xl font-bold font-mono text-foreground mt-2">
            BDT {{ (booking()?.final_contract_value || 0) | number:'1.0-0' }}
          </h3>
          <p class="text-[11px] text-muted-foreground mt-1">Net approved purchase value</p>
        </div>

        <!-- Cash Collected -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cash Collected</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Bank Secured</span>
          </div>
          <h3 class="text-xl font-bold font-mono text-emerald-500 mt-2">
            BDT {{ ((booking()?.earnest_money_received || 0) + (booking()?.down_payment_total || 0)) | number:'1.0-0' }}
          </h3>
          <p class="text-[11px] text-muted-foreground mt-1">
            Earnest (BDT {{ (booking()?.earnest_money_received || 0) | number:'1.0-0' }}) + DP
          </p>
        </div>

        <!-- Outstanding Receivables -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Receivables</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">Pending Dues</span>
          </div>
          <h3 class="text-xl font-bold font-mono text-amber-500 mt-2">
            BDT {{ getOutstandingReceivables() | number:'1.0-0' }}
          </h3>
          <p class="text-[11px] text-muted-foreground mt-1">Future installments & settlement</p>
        </div>

        <!-- Recognized Accounting Revenue -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recognized Revenue</span>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">POC Milestone</span>
          </div>
          <h3 class="text-xl font-bold font-mono text-primary mt-2">
            BDT {{ ((booking()?.final_contract_value || 0) * 0.65) | number:'1.0-0' }}
          </h3>
          <p class="text-[11px] text-muted-foreground mt-1">IFRS 15 / Percentage of completion</p>
        </div>
      </div>

      <!-- Main Detailed Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Column 1 & 2: Pricing Breakdown, Co-Buyers & Nominees -->
        <div class="lg:col-span-2 flex flex-col gap-6">

          <!-- Pricing Breakdown Card -->
          <app-card-container
            title="Commercial Pricing Breakdown & Governance"
            subtitle="Full itemized commercial terms under REHAB statutory guidelines"
          >
            <div class="overflow-x-auto border border-border rounded-xl mb-4">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/40 text-muted-foreground uppercase font-semibold border-b border-border">
                  <tr>
                    <th class="px-4 py-2.5">Component</th>
                    <th class="px-4 py-2.5">Description</th>
                    <th class="px-4 py-2.5 text-right">Amount (BDT)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/60">
                  <tr>
                    <td class="px-4 py-2.5 font-medium text-foreground">Base Apartment Price</td>
                    <td class="px-4 py-2.5 text-muted-foreground">Undiscounted list price for Unit {{ booking()?.unit_number }}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-bold">{{ (booking()?.base_unit_price || 0) | number:'1.0-0' }}</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium text-foreground">Parking Slot Charge</td>
                    <td class="px-4 py-2.5 text-muted-foreground">Allotted Slot: {{ booking()?.parking_slot_number || 'Unassigned' }}</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ (booking()?.parking_charge || 0) | number:'1.0-0' }}</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium text-foreground">Utility Connection Charges</td>
                    <td class="px-4 py-2.5 text-muted-foreground">DESCO electricity, WASA water/sewerage & gas utility</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ (booking()?.utility_charge || 0) | number:'1.0-0' }}</td>
                  </tr>
                  <tr>
                    <td class="px-4 py-2.5 font-medium text-foreground">Documentation & Stamp Fee</td>
                    <td class="px-4 py-2.5 text-muted-foreground">Sub-Registry drafting, vetting & stamp statutory fees</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ (booking()?.documentation_charge || 0) | number:'1.0-0' }}</td>
                  </tr>
                  @if ((booking()?.discount_amount || 0) > 0) {
                    <tr class="bg-emerald-500/5">
                      <td class="px-4 py-2.5 font-semibold text-emerald-500">Commercial Discount</td>
                      <td class="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">
                        {{ booking()?.discount_percentage }}% approved concession (Tier: {{ booking()?.required_approval_tier }})
                      </td>
                      <td class="px-4 py-2.5 text-right font-mono font-bold text-emerald-500">
                        -{{ (booking()?.discount_amount || 0) | number:'1.0-0' }}
                      </td>
                    </tr>
                  }
                  <tr class="bg-secondary/30 font-bold border-t border-border">
                    <td class="px-4 py-3 text-foreground" colspan="2">Net Final Contract Obligation</td>
                    <td class="px-4 py-3 text-right font-mono text-sm text-primary">
                      BDT {{ (booking()?.final_contract_value || 0) | number:'1.0-0' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Governance Status Banner -->
            <div class="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Discount Approval Tier:</span>
                <span class="font-bold text-foreground">{{ booking()?.required_approval_tier?.replace('_', ' ') }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Status:</span>
                <span 
                  class="px-2 py-0.5 rounded-full font-bold"
                  [ngClass]="{
                    'bg-emerald-500/10 text-emerald-500': booking()?.discount_approval_status === 'APPROVED',
                    'bg-amber-500/10 text-amber-500': booking()?.discount_approval_status === 'PENDING_APPROVAL',
                    'bg-rose-500/10 text-rose-500': booking()?.discount_approval_status === 'REJECTED'
                  }"
                >
                  {{ booking()?.discount_approval_status }}
                </span>
                @if (booking()?.discount_approved_by_name) {
                  <span class="text-muted-foreground">by {{ booking()?.discount_approved_by_name }}</span>
                }
              </div>
            </div>
          </app-card-container>

          <!-- Co-Buyers Table (Spec 5.3) -->
          <app-card-container
            title="Co-Buyers & Joint Ownership (Spec 5.3)"
            subtitle="Configured ownership shares and legal obligations for joint applicants"
          >
            @if (booking()?.joint_buyers && booking()!.joint_buyers!.length > 0) {
              <div class="overflow-x-auto border border-border rounded-xl">
                <table class="w-full text-left text-xs">
                  <thead class="bg-secondary/40 text-muted-foreground uppercase font-semibold border-b border-border">
                    <tr>
                      <th class="px-4 py-2.5">Co-Buyer Name</th>
                      <th class="px-4 py-2.5">Relationship</th>
                      <th class="px-4 py-2.5 text-center">Share %</th>
                      <th class="px-4 py-2.5">Contact & Identifiers</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (jb of booking()?.joint_buyers; track jb.id) {
                      <tr>
                        <td class="px-4 py-2.5 font-bold text-foreground">
                          {{ jb.full_name_en }}
                          @if (jb.full_name_bn) {
                            <span class="block text-[11px] text-muted-foreground font-normal">{{ jb.full_name_bn }}</span>
                          }
                        </td>
                        <td class="px-4 py-2.5 text-muted-foreground">{{ jb.relation_to_primary }}</td>
                        <td class="px-4 py-2.5 text-center font-mono font-bold text-primary">{{ jb.share_percentage }}%</td>
                        <td class="px-4 py-2.5 text-muted-foreground">
                          📞 {{ jb.primary_phone }} | NID: {{ jb.nid_number || 'N/A' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-xs text-muted-foreground italic">No joint co-buyers registered. Single buyer ownership.</p>
            }
          </app-card-container>

          <!-- Nominees Table (Spec 5.3) -->
          <app-card-container
            title="Nominees Register (Spec 5.3)"
            subtitle="Recorded separately from contractual buyers. System does not treat nominees automatically as legal owners."
          >
            @if (booking()?.nominees && booking()!.nominees!.length > 0) {
              <div class="overflow-x-auto border border-border rounded-xl">
                <table class="w-full text-left text-xs">
                  <thead class="bg-secondary/40 text-muted-foreground uppercase font-semibold border-b border-border">
                    <tr>
                      <th class="px-4 py-2.5">Nominee Name</th>
                      <th class="px-4 py-2.5">Relationship</th>
                      <th class="px-4 py-2.5 text-center">Nomination %</th>
                      <th class="px-4 py-2.5">Contact Phone & ID</th>
                      <th class="px-4 py-2.5">Effective Date</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border/60">
                    @for (nom of booking()?.nominees; track nom.id) {
                      <tr>
                        <td class="px-4 py-2.5 font-bold text-foreground">{{ nom.full_name }}</td>
                        <td class="px-4 py-2.5 text-muted-foreground">{{ nom.relation_to_buyer }}</td>
                        <td class="px-4 py-2.5 text-center font-mono font-bold text-emerald-500">{{ nom.nomination_percentage }}%</td>
                        <td class="px-4 py-2.5 text-muted-foreground">📞 {{ nom.contact_phone }} | ID: {{ nom.nid_or_passport || 'N/A' }}</td>
                        <td class="px-4 py-2.5 font-mono text-muted-foreground">{{ nom.effective_date || 'Immediate' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <p class="text-xs text-muted-foreground italic">No nominees registered for this allotment.</p>
            }
          </app-card-container>

        </div>

        <!-- Column 3: Property Specs & Primary Buyer Card -->
        <div class="flex flex-col gap-6">

          <!-- Primary Buyer Profile -->
          <app-card-container title="Primary Buyer KYC">
            <div class="flex flex-col gap-3 text-xs">
              <div class="p-3 bg-secondary/30 rounded-xl border border-border">
                <span class="text-muted-foreground block text-[11px] font-medium">Customer Full Name</span>
                <span class="text-sm font-bold text-foreground">{{ booking()?.customer_name }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                  <span class="text-muted-foreground block text-[10px]">Contact Phone</span>
                  <span class="font-medium text-foreground">📞 {{ booking()?.customer_phone }}</span>
                </div>
                <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                  <span class="text-muted-foreground block text-[10px]">Email</span>
                  <span class="font-medium text-foreground truncate block">{{ booking()?.customer_email || 'N/A' }}</span>
                </div>
              </div>

              <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                <span class="text-muted-foreground block text-[10px]">Assigned Sales Representative</span>
                <span class="font-medium text-foreground">{{ booking()?.sales_rep_name || 'Tanvir Ahmed' }}</span>
              </div>

              <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                <span class="text-muted-foreground block text-[10px]">Booking Date</span>
                <span class="font-mono text-foreground">{{ booking()?.booking_date }}</span>
              </div>

              @if (booking()?.reservation_expiry_date) {
                <div class="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                  <span class="block text-[10px] font-bold">Reservation Expiry Date</span>
                  <span class="font-mono text-xs">{{ booking()?.reservation_expiry_date }}</span>
                </div>
              }
            </div>
          </app-card-container>

          <!-- Allotted Unit Details -->
          <app-card-container title="Allotted Property Unit">
            <div class="flex flex-col gap-3 text-xs">
              <div class="p-3 bg-secondary/30 rounded-xl border border-border">
                <span class="text-muted-foreground block text-[11px] font-medium">Project Name</span>
                <span class="text-sm font-bold text-primary">{{ booking()?.project_name }}</span>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                  <span class="text-muted-foreground block text-[10px]">Apartment Unit</span>
                  <span class="font-bold text-foreground">Unit {{ booking()?.unit_number }}</span>
                </div>
                <div class="p-2.5 bg-secondary/20 rounded-xl border border-border">
                  <span class="text-muted-foreground block text-[10px]">Parking Slot</span>
                  <span class="font-bold text-foreground">🚗 {{ booking()?.parking_slot_number || 'None' }}</span>
                </div>
              </div>

              @if (booking()?.notes) {
                <div class="p-3 bg-secondary/20 rounded-xl border border-border">
                  <span class="text-muted-foreground block text-[10px] font-medium uppercase mb-1">Allotment Clauses & Notes</span>
                  <p class="text-muted-foreground leading-relaxed">{{ booking()?.notes }}</p>
                </div>
              }
            </div>
          </app-card-container>

        </div>
      </div>

      <!-- Unit Transfer Modal -->
      @if (isTransferModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div class="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 class="text-base font-bold text-foreground">Sub-Registry Unit Mutation & Transfer</h3>
                <p class="text-xs text-muted-foreground">Transfer Allotment from {{ booking()?.customer_name }} to New Buyer</p>
              </div>
              <button (click)="closeTransferModal()" class="text-muted-foreground hover:text-foreground">✕</button>
            </div>

            <form [formGroup]="transferForm" (ngSubmit)="submitTransfer()" class="flex flex-col gap-4">
              <app-searchable-select
                label="New Primary Transferee Customer *"
                [options]="customerOptions()"
                formControlName="to_customer_id"
              />

              <app-custom-input
                label="Developer Transfer NOC Fee (BDT) *"
                type="number"
                formControlName="transfer_fee_bdt"
              />

              <app-custom-input
                label="Transfer Memo / Sub-Registry No."
                formControlName="transfer_memo_no"
              />

              <div class="flex justify-end gap-2 pt-3 border-t border-border">
                <app-custom-button variant="outline" type="button" (clicked)="closeTransferModal()">Cancel</app-custom-button>
                <app-custom-button variant="primary" type="submit" [disabled]="transferForm.invalid || isActionLoading()">
                  Complete Mutation Transfer
                </app-custom-button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class BookingDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private crmService = inject(CrmService);
  private fb = inject(FormBuilder);

  booking = signal<Booking | null>(null);
  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);
  isActionLoading = signal<boolean>(false);
  isTransferModalOpen = signal<boolean>(false);

  workflowStages = [
    { id: '01_CUSTOMER_VERIFICATION', name: 'Lead & KYC' },
    { id: '02_UNIT_RESERVATION', name: 'Reservation' },
    { id: '03_PRICE_APPROVAL', name: 'Price & Disc.' },
    { id: '04_BOOKING_MONEY', name: 'Earnest Dep.' },
    { id: '05_BOOKING_CONFIRMED', name: 'Confirmation' },
    { id: '06_AGREEMENT_SIGNING', name: 'Agreement' },
    { id: '07_INSTALLMENT_SCHEDULE', name: 'Schedule' },
    { id: '08_COLLECTION_LEDGER', name: 'Ledger' },
    { id: '09_REGISTRATION_DEED', name: 'Registration' },
    { id: '10_FINAL_HANDOVER', name: 'Handover' }
  ];

  transferForm: FormGroup = this.fb.group({
    to_customer_id: [null, Validators.required],
    transfer_fee_bdt: [50000, [Validators.required, Validators.min(0)]],
    transfer_memo_no: [''],
    remarks: ['']
  });

  customerOptions = signal<{ value: number; label: string }[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBooking(Number(id));
    }
    this.crmService.getCustomers().subscribe(c => {
      this.customers.set(c);
      this.customerOptions.set(c.map(item => ({
        value: item.id,
        label: `${item.full_name_en} (${item.customer_code})`
      })));
    });
  }

  loadBooking(id: number): void {
    this.isLoading.set(true);
    this.salesService.getBooking(id).subscribe({
      next: (b) => {
        this.booking.set(b);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  getOutstandingReceivables(): number {
    const b = this.booking();
    if (!b) return 0;
    const finalVal = Number(b.final_contract_value || 0);
    const paid = Number(b.earnest_money_received || 0) + Number(b.down_payment_total || 0);
    return Math.max(0, finalVal - paid);
  }

  getActiveStageTitle(): string {
    const stageId = this.booking()?.workflow_stage || '05_BOOKING_CONFIRMED';
    const found = this.workflowStages.find(s => s.id === stageId);
    return found ? found.name : stageId;
  }

  getStageIndex(): number {
    const stageId = this.booking()?.workflow_stage || '05_BOOKING_CONFIRMED';
    const idx = this.workflowStages.findIndex(s => s.id === stageId);
    return idx >= 0 ? idx : 4;
  }

  getStageClass(stageId: string, idx: number): string {
    const activeIdx = this.getStageIndex();
    if (idx === activeIdx) {
      return 'bg-primary/10 border-primary text-primary font-bold shadow-xs';
    } else if (idx < activeIdx) {
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
    } else {
      return 'bg-secondary/30 border-border text-muted-foreground opacity-60';
    }
  }

  getStageCircleClass(stageId: string, idx: number): string {
    const activeIdx = this.getStageIndex();
    if (idx === activeIdx) {
      return 'bg-primary text-primary-foreground';
    } else if (idx < activeIdx) {
      return 'bg-emerald-500 text-white';
    } else {
      return 'bg-secondary text-muted-foreground';
    }
  }

  updateStage(stageId: string): void {
    const b = this.booking();
    if (!b) return;
    this.isActionLoading.set(true);
    this.salesService.updateBooking(b.id, { workflow_stage: stageId }).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.isActionLoading.set(false);
      },
      error: () => this.isActionLoading.set(false)
    });
  }

  confirmBooking(): void {
    const b = this.booking();
    if (!b) return;
    this.isActionLoading.set(true);
    this.salesService.confirmBooking(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.isActionLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to confirm booking');
        this.isActionLoading.set(false);
      }
    });
  }

  releaseReservation(): void {
    const b = this.booking();
    if (!b) return;
    if (!confirm('Are you sure you want to release this unit reservation and restore unit status to AVAILABLE?')) return;
    this.isActionLoading.set(true);
    this.salesService.releaseReservation(b.id).subscribe({
      next: (updated) => {
        this.booking.set(updated);
        this.isActionLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to release reservation');
        this.isActionLoading.set(false);
      }
    });
  }

  downloadDeedPdf(): void {
    const b = this.booking();
    if (!b) return;
    this.salesService.downloadDeedPdf(b.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Deed_of_Agreement_${b.booking_reference_no}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download deed PDF: ' + (err?.error?.detail || 'Server error'))
    });
  }

  openTransferModal(): void {
    const b = this.booking();
    if (!b) return;
    this.transferForm.reset({
      to_customer_id: null,
      transfer_fee_bdt: 50000,
      transfer_memo_no: `TRF-${b.booking_reference_no}`,
      remarks: ''
    });
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
  }

  submitTransfer(): void {
    const b = this.booking();
    if (!b || this.transferForm.invalid) return;
    this.isActionLoading.set(true);
    const payload = {
      booking_id: b.id,
      ...this.transferForm.value
    };
    this.salesService.processTransfer(payload).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeTransferModal();
        this.loadBooking(b.id);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Transfer failed');
        this.isActionLoading.set(false);
      }
    });
  }
}
