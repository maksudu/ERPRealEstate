import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking, LegalDocumentTemplate } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-document-form',
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
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/documents"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Agreements & Documents"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.6 · Legal & Commercial Document Preparation
              </span>
              <span class="text-xs font-mono text-muted-foreground">New Instrument</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Prepare Sales Agreement & Deed Document
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/sales/documents"
            class="px-4 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            Cancel
          </a>
        </div>
      </div>

      <!-- Legal Compliance Statutory Notice Banner -->
      <div class="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3.5">
        <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="text-xs flex-1">
          <h4 class="font-bold text-blue-500">Statutory Legal Framework Disclaimer (Spec 5.6)</h4>
          <p class="text-muted-foreground mt-0.5 leading-relaxed">
            The system prepares draft deed information, schedules, and tracks registration compliance. Final legal instruments must be reviewed and formally executed in accordance with applicable Bangladesh registration law, stamp duty acts, and Sub-Registry requirements. A generated PDF is not, by itself, a legally registered deed until officially stamped and registered.
          </p>
        </div>
      </div>

      <form [formGroup]="docForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Form Fields -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            <!-- 1. Allotment Target -->
            <app-card-container title="1. Allotment & Target Booking Allotment" subtitle="Select confirmed apartment booking to merge data from">
              <div class="flex flex-col gap-4">
                <app-searchable-select
                  label="Select Apartment Booking Allotment *"
                  [options]="bookingOptions()"
                  [formGroup]="docForm"
                  controlName="booking_id"
                  placeholder="Select booking allotment..."
                  (selectionChange)="onBookingSelected($event)"
                />

                @if (selectedBooking()) {
                  <div class="p-3.5 bg-secondary/40 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span class="text-muted-foreground block text-[11px]">Second Party (Buyer):</span>
                      <strong class="text-foreground text-sm">{{ selectedBooking()?.customer_name }}</strong>
                      <span class="text-muted-foreground block text-[11px]">{{ selectedBooking()?.customer_phone }}</span>
                    </div>

                    <div class="sm:text-right">
                      <span class="text-muted-foreground block text-[11px]">Property Scope:</span>
                      <strong class="text-foreground text-sm">{{ selectedBooking()?.project_name }}</strong>
                      <span class="text-primary block font-mono text-[11px]">Unit: {{ selectedBooking()?.unit_number }}</span>
                    </div>
                  </div>
                }
              </div>
            </app-card-container>

            <!-- 2. Document Type & Template Selection -->
            <app-card-container title="2. Legal Document Type & Configurable Template" subtitle="Select from the 13 statutory document types under Spec 5.6">
              <div class="flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-searchable-select
                    label="Statutory Document Type *"
                    [options]="documentTypeOptions"
                    [formGroup]="docForm"
                    controlName="document_type"
                    placeholder="Select document type..."
                  />

                  <app-searchable-select
                    label="Configurable Template (Optional)"
                    [options]="templateOptions()"
                    [formGroup]="docForm"
                    controlName="template_id"
                    placeholder="Default Statutory Layout"
                  />
                </div>

                <app-custom-input
                  label="Document Custom Title (Optional)"
                  placeholder="e.g. Deed of Agreement for Sale - Suite 12B"
                  [formGroup]="docForm"
                  controlName="custom_title"
                />

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <app-custom-input
                    label="First Party Signatory Name *"
                    placeholder="e.g. Managing Director, Blueoceans Holdings Ltd."
                    [formGroup]="docForm"
                    controlName="first_party_signatory_name"
                  />

                  <app-custom-input
                    label="Second Party Signatory (Buyer) *"
                    placeholder="Purchaser legal name"
                    [formGroup]="docForm"
                    controlName="second_party_signatory_name"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <app-custom-input
                    label="Witness 1 Full Name"
                    placeholder="e.g. Advocate Tanvir Ahmed"
                    [formGroup]="docForm"
                    controlName="witness_1_name"
                  />

                  <app-custom-input
                    label="Witness 2 Full Name"
                    placeholder="e.g. Engr. Shafiqul Islam"
                    [formGroup]="docForm"
                    controlName="witness_2_name"
                  />

                  <app-custom-input
                    label="Execution / Signing Date"
                    type="date"
                    [formGroup]="docForm"
                    controlName="execution_date"
                  />
                </div>

                @if (docForm.value.document_type === 'AGREEMENT_AMENDMENT') {
                  <app-custom-textarea
                    label="Agreement Amendment Rationale *"
                    placeholder="State reason for amendment (e.g. change of unit, price renegotiation, extended milestone dates)..."
                    [formGroup]="docForm"
                    controlName="amendment_reason"
                  />
                }

                <app-custom-textarea
                  label="Special Covenants & Custom Addendum Clauses"
                  placeholder="Enter bespoke legal covenants, special payment conditions, hand-over grace periods..."
                  [formGroup]="docForm"
                  controlName="additional_clauses"
                />
              </div>
            </app-card-container>
          </div>

          <!-- Right Col: Live Merge Data Preview Card -->
          <div class="flex flex-col gap-6">
            <div class="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-xs flex flex-col gap-5">
              <div>
                <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Spec 5.6 Merge Engine</span>
                <h3 class="text-base font-bold text-foreground mt-0.5">Automated Field Binding</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Real-time merge fields populated from customer KYC and verified booking terms.
                </p>
              </div>

              <div class="flex flex-col gap-2.5 text-xs">
                <div class="p-3 bg-secondary/40 rounded-xl border border-border flex flex-col gap-1.5 font-mono">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{customer_name}}' }}:</span>
                    <span class="text-foreground font-bold">{{ selectedBooking()?.customer_name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{customer_phone}}' }}:</span>
                    <span class="text-foreground">{{ selectedBooking()?.customer_phone || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{project_name}}' }}:</span>
                    <span class="text-foreground">{{ selectedBooking()?.project_name || 'N/A' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{unit_number}}' }}:</span>
                    <span class="text-primary font-bold">{{ selectedBooking()?.unit_number || 'N/A' }}</span>
                  </div>
                </div>

                <div class="p-3 bg-secondary/30 rounded-xl border border-border flex flex-col gap-1.5 font-mono">
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{contract_price}}' }}:</span>
                    <span class="text-emerald-500 font-bold">BDT {{ (selectedBooking()?.final_contract_value || 0) | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{booking_money}}' }}:</span>
                    <span class="text-foreground">BDT {{ (selectedBooking()?.earnest_money_received || 0) | number:'1.0-0' }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-muted-foreground">{{ '{{down_payment}}' }}:</span>
                    <span class="text-foreground">BDT {{ (selectedBooking()?.down_payment_received || 0) | number:'1.0-0' }}</span>
                  </div>
                </div>

                <div class="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs">
                  <span class="text-[11px] font-bold text-primary block uppercase">Legal Workflow Route</span>
                  <span class="text-muted-foreground text-[11px] block mt-0.5">
                    Upon creation, document enters <strong>DRAFT</strong> state for review by Advocate Imran Hossain (Head of Legal).
                  </span>
                </div>
              </div>

              <!-- Submit Action Button -->
              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="isSubmitting() || docForm.invalid"
                  class="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wide shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  @if (isSubmitting()) {
                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generating Legal Instrument...
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <span>Generate & Prepare Document</span>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `
})
export class DocumentFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  bookings = signal<Booking[]>([]);
  templates = signal<LegalDocumentTemplate[]>([]);
  selectedBooking = signal<Booking | null>(null);
  isSubmitting = signal<boolean>(false);

  docForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    document_type: ['AGREEMENT_FOR_SALE', Validators.required],
    template_id: [null],
    custom_title: [''],
    first_party_signatory_name: ['Managing Director, Blueoceans Holdings Ltd.', Validators.required],
    second_party_signatory_name: ['', Validators.required],
    witness_1_name: ['Advocate Tanvir Ahmed'],
    witness_2_name: ['Engr. Shafiqul Islam'],
    execution_date: [new Date().toISOString().split('T')[0]],
    additional_clauses: [''],
    amendment_reason: ['']
  });

  bookingOptions = computed(() => {
    return this.bookings().map((b) => ({
      value: b.id,
      label: `${b.booking_reference_no} · ${b.customer_name} (${b.project_name} - Unit ${b.unit_number})`
    }));
  });

  templateOptions = computed(() => {
    return [
      { label: 'Default Statutory Standard Layout', value: null },
      ...this.templates().map((t) => ({
        value: t.id,
        label: `${t.title_en} (${t.version})`
      }))
    ];
  });

  // The 13 Spec 5.6 Document Types
  documentTypeOptions = [
    { label: '1. Property Reservation Form', value: 'PROPERTY_RESERVATION_FORM' },
    { label: '2. Booking Application Form', value: 'BOOKING_APPLICATION' },
    { label: '3. Booking Confirmation Letter', value: 'BOOKING_CONFIRMATION_LETTER' },
    { label: '4. Statutory Allotment Letter', value: 'ALLOTMENT_LETTER' },
    { label: '5. Agreement for Sale (বায়নানামা ও হস্তান্তর চুক্তি)', value: 'AGREEMENT_FOR_SALE' },
    { label: '6. Payment Schedule Annexure', value: 'PAYMENT_SCHEDULE_ANNEXURE' },
    { label: '7. Price & Discount Approval Sheet', value: 'PRICE_DISCOUNT_APPROVAL_SHEET' },
    { label: '8. Co-buyer / Joint Applicant Declaration', value: 'COBUYER_DECLARATION' },
    { label: '9. Nominee Registration Form', value: 'NOMINEE_FORM' },
    { label: '10. Formal Agreement Amendment Addendum', value: 'AGREEMENT_AMENDMENT' },
    { label: '11. Cancellation & Refund Documents', value: 'CANCELLATION_REFUND_DOCUMENT' },
    { label: '12. Sub-Registry Deed Preparation Checklist', value: 'DEED_PREPARATION_CHECKLIST' },
    { label: '13. Possession & Physical Handover Certificate', value: 'POSSESSION_HANDOVER_DOCUMENT' }
  ];

  ngOnInit(): void {
    this.loadBookings();
    this.loadTemplates();
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (res) => {
        const list = res || [];
        this.bookings.set(list);

        const preselectId = this.route.snapshot.queryParamMap.get('booking_id');
        if (preselectId) {
          const match = list.find((b) => b.id === Number(preselectId));
          if (match) {
            this.docForm.patchValue({
              booking_id: match.id,
              second_party_signatory_name: match.customer_name
            });
            this.selectedBooking.set(match);
          }
        } else if (list.length > 0) {
          this.docForm.patchValue({
            booking_id: list[0].id,
            second_party_signatory_name: list[0].customer_name
          });
          this.selectedBooking.set(list[0]);
        }
      }
    });
  }

  loadTemplates(): void {
    this.salesService.getDocumentTemplates().subscribe({
      next: (t) => this.templates.set(t || [])
    });
  }

  onBookingSelected(selected: any): void {
    const id = selected?.value || selected;
    const match = this.bookings().find((b) => b.id === Number(id));
    this.selectedBooking.set(match || null);
    if (match) {
      this.docForm.patchValue({
        second_party_signatory_name: match.customer_name
      });
    }
  }

  onSubmit(): void {
    if (this.docForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.docForm.value;

    const payload = {
      booking_id: Number(val.booking_id),
      document_type: val.document_type,
      template_id: val.template_id ? Number(val.template_id) : null,
      custom_title: val.custom_title || null,
      first_party_signatory_name: val.first_party_signatory_name,
      second_party_signatory_name: val.second_party_signatory_name,
      witness_1_name: val.witness_1_name || null,
      witness_2_name: val.witness_2_name || null,
      execution_date: val.execution_date || null,
      additional_clauses: val.additional_clauses || null,
      amendment_reason: val.amendment_reason || null
    };

    this.salesService.generateSalesDocument(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/documents', created.id]);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to generate document.');
        this.isSubmitting.set(false);
      }
    });
  }
}
