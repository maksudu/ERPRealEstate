import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SalesService } from '../../../core/services/sales.service';
import { SalesLegalDocument } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

export interface LegalChecklist {
  buyer_nid_verified: boolean;
  buyer_tin_certificate: boolean;
  passport_photos_attached: boolean;
  booking_money_cleared: boolean;
  down_payment_cleared: boolean;
  title_deed_searched: boolean;
  rajuk_approval_verified: boolean;
  stamp_duty_paid: boolean;
  sub_registry_token_issued: boolean;
  [key: string]: boolean;
}

@Component({
  selector: 'app-document-details',
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
                Legal Instrument Dossier
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ document()?.document_number || 'Loading...' }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ document()?.title }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="printDocument()"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            Print / Export Document
          </button>

          <a
            routerLink="/sales/documents/create"
            class="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Prepare New
          </a>
        </div>
      </div>

      @if (isLoading()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading legal document dossier...
        </div>
      } @else if (document()) {
        <!-- Status Header Banner -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              [ngClass]="{
                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': document()?.legal_review_status === 'EXECUTED_SIGNED' || document()?.legal_review_status === 'LEGAL_APPROVED',
                'bg-amber-500/10 text-amber-500 border border-amber-500/20': document()?.legal_review_status === 'DRAFT' || document()?.legal_review_status === 'PENDING_LEGAL_REVIEW',
                'bg-rose-500/10 text-rose-500 border border-rose-500/20': document()?.legal_review_status === 'REJECTED'
              }">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-bold text-foreground">{{ document()?.document_number }}</h2>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': document()?.legal_review_status === 'EXECUTED_SIGNED' || document()?.legal_review_status === 'LEGAL_APPROVED',
                    'bg-amber-500/10 text-amber-500 border border-amber-500/20': document()?.legal_review_status === 'DRAFT' || document()?.legal_review_status === 'PENDING_LEGAL_REVIEW',
                    'bg-rose-500/10 text-rose-500 border border-rose-500/20': document()?.legal_review_status === 'REJECTED'
                  }">
                  {{ document()?.legal_review_status }}
                </span>
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border">
                  {{ document()?.version }}
                </span>
              </div>
              <p class="text-xs text-muted-foreground mt-0.5">
                Type: <strong class="text-foreground">{{ document()?.document_type }}</strong> &bull;
                Booking: <a [routerLink]="['/sales/bookings', document()?.booking_id]" class="text-primary font-mono hover:underline">{{ document()?.booking_reference_no }}</a> &bull;
                Purchaser: <strong class="text-foreground">{{ document()?.customer_name }}</strong>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="p-2.5 bg-secondary/50 rounded-xl border border-border text-right text-xs">
              <span class="text-[10px] font-semibold uppercase text-muted-foreground block">Signatures Executed</span>
              <span class="font-bold text-foreground">
                {{ (document()?.first_party_signed && document()?.second_party_signed) ? 'Fully Signed (Both Parties)' : (document()?.first_party_signed ? 'Developer Only' : (document()?.second_party_signed ? 'Buyer Only' : 'Unsigned Draft')) }}
              </span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left 2 Cols: Official Document Viewer -->
          <div class="lg:col-span-2 flex flex-col gap-6">
            <div id="printable-legal-doc" class="bg-card border-2 border-border rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              <!-- Rendered Legal HTML -->
              <div [innerHTML]="sanitizedContent()" class="prose max-w-none text-foreground text-sm"></div>
            </div>

            <!-- Audit Trail History -->
            <app-card-container title="Document Lifecycle & Audit Trail" subtitle="Chronological history of creation, legal review, and signature execution">
              <div class="divide-y divide-border/60 text-xs">
                @for (entry of document()?.audit_trail_json || []; track $index) {
                  <div class="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <span class="font-bold text-foreground">{{ entry.action }}</span>
                      <span class="text-muted-foreground block text-[11px]">{{ entry.notes || 'Status updated.' }}</span>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-mono text-muted-foreground text-[11px] block">{{ entry.timestamp | date:'medium' }}</span>
                      <span class="text-[10px] text-primary">{{ entry.actor }}</span>
                    </div>
                  </div>
                }
              </div>
            </app-card-container>
          </div>

          <!-- Right Col: Legal Review, Signatures & Deed Preparation Checklist -->
          <div class="flex flex-col gap-6">
            <!-- 1. Legal Review & Approval Panel -->
            @if (document()?.legal_review_status === 'DRAFT' || document()?.legal_review_status === 'PENDING_LEGAL_REVIEW') {
              <div class="bg-card border-2 border-primary/30 rounded-xl p-5 shadow-xs flex flex-col gap-4">
                <div>
                  <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Legal Counsel Review</span>
                  <h3 class="text-sm font-bold text-foreground mt-0.5">Approve or Revise Instrument</h3>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    Authorized legal vetting under Bangladesh Real Estate Act 2010.
                  </p>
                </div>

                <div class="flex flex-col gap-2">
                  <button
                    (click)="processReview('LEGAL_APPROVED')"
                    [disabled]="isActionSubmitting()"
                    class="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    Authorize & Approve Legal Document
                  </button>

                  <button
                    (click)="processReview('REJECTED')"
                    [disabled]="isActionSubmitting()"
                    class="w-full py-2 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs transition-colors"
                  >
                    Reject Legal Instrument
                  </button>
                </div>
              </div>
            } @else {
              <div class="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col gap-2 text-xs">
                <span class="text-[10px] font-bold uppercase text-muted-foreground">Legal Review Audit</span>
                <div class="font-bold text-foreground">{{ document()?.legal_reviewed_by || 'Advocate Imran Hossain' }}</div>
                <div class="text-muted-foreground text-[11px]">{{ document()?.legal_review_date | date:'medium' }}</div>
                @if (document()?.legal_review_notes) {
                  <p class="p-2 bg-secondary/40 rounded-lg border border-border mt-1">{{ document()?.legal_review_notes }}</p>
                }
              </div>
            }

            <!-- 2. Signature Execution Controls -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div>
                <span class="text-[10px] font-bold text-primary uppercase tracking-wider block">Contractual Signatures</span>
                <h3 class="text-sm font-bold text-foreground mt-0.5">Execution & Attestation</h3>
              </div>

              <div class="flex flex-col gap-3 text-xs">
                <!-- First Party -->
                <div class="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <span class="text-[10px] font-bold text-muted-foreground uppercase block">First Party (Developer)</span>
                    <strong class="text-foreground block">{{ document()?.first_party_signatory_name || 'Managing Director' }}</strong>
                    <span class="text-[11px] text-muted-foreground">
                      {{ document()?.first_party_signed ? ('Signed: ' + document()?.first_party_signed_at) : 'Not yet signed' }}
                    </span>
                  </div>
                  @if (!document()?.first_party_signed) {
                    <button
                      (click)="signDocument('FIRST_PARTY')"
                      class="px-2.5 py-1 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      Sign
                    </button>
                  } @else {
                    <span class="text-xs font-bold text-emerald-500">&check; Signed</span>
                  }
                </div>

                <!-- Second Party -->
                <div class="p-3 bg-secondary/30 rounded-xl border border-border flex items-center justify-between">
                  <div>
                    <span class="text-[10px] font-bold text-muted-foreground uppercase block">Second Party (Buyer)</span>
                    <strong class="text-foreground block">{{ document()?.second_party_signatory_name || document()?.customer_name }}</strong>
                    <span class="text-[11px] text-muted-foreground">
                      {{ document()?.second_party_signed ? ('Signed: ' + document()?.second_party_signed_at) : 'Not yet signed' }}
                    </span>
                  </div>
                  @if (!document()?.second_party_signed) {
                    <button
                      (click)="signDocument('SECOND_PARTY')"
                      class="px-2.5 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      Sign
                    </button>
                  } @else {
                    <span class="text-xs font-bold text-emerald-500">&check; Signed</span>
                  }
                </div>

                <!-- Witnesses & Execution Date -->
                <div class="p-2.5 bg-secondary/20 rounded-xl border border-border text-[11px] flex flex-col gap-1">
                  <div><strong>Witness 1:</strong> {{ document()?.witness_1_name || 'Advocate Tanvir Ahmed' }}</div>
                  <div><strong>Witness 2:</strong> {{ document()?.witness_2_name || 'Engr. Shafiqul Islam' }}</div>
                  <div><strong>Execution Date:</strong> {{ document()?.execution_date || 'Pending Final Execution' }}</div>
                </div>
              </div>
            </div>

            <!-- 3. Statutory Deed Preparation Checklist Tracker (Spec 5.6) -->
            <div class="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-bold uppercase text-primary block">Sub-Registry Compliance</span>
                  <h3 class="text-sm font-bold text-foreground mt-0.5">Deed Preparation Checklist</h3>
                </div>
                <span class="text-xs font-bold font-mono text-emerald-500">
                  {{ checklistPassedCount() }} / 9 Done
                </span>
              </div>

              <div class="flex flex-col gap-2 text-xs">
                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.buyer_nid_verified" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">1. Purchaser NID Card Verified</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.buyer_tin_certificate" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">2. E-TIN Certificate & Tax Return</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.passport_photos_attached" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">3. Passport Sized Photos Attached</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.booking_money_cleared" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">4. Booking Money Realized in Bank</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.down_payment_cleared" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">5. Down Payment Target (15%) Cleared</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.title_deed_searched" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">6. Non-Encumbrance & Title Search</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.rajuk_approval_verified" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">7. RAJUK Approved Plan Verified</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.stamp_duty_paid" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">8. Non-Judicial Stamp Duty Paid</span>
                </label>

                <label class="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-secondary/40">
                  <input type="checkbox" [(ngModel)]="checklist.sub_registry_token_issued" class="rounded border-border text-primary focus:ring-primary"/>
                  <span class="text-foreground">9. Sub-Registry Slot & Token Issued</span>
                </label>

                <button
                  (click)="saveChecklist()"
                  [disabled]="isActionSubmitting()"
                  class="mt-2 w-full py-2 px-3 rounded-xl border border-border bg-card text-foreground hover:bg-secondary font-semibold text-xs transition-colors shadow-xs"
                >
                  Save Statutory Checklist
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class DocumentDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private salesService = inject(SalesService);
  private sanitizer = inject(DomSanitizer);

  docId = signal<number | null>(null);
  document = signal<SalesLegalDocument | null>(null);
  isLoading = signal<boolean>(false);
  isActionSubmitting = signal<boolean>(false);

  checklist: LegalChecklist = {
    buyer_nid_verified: true,
    buyer_tin_certificate: true,
    passport_photos_attached: true,
    booking_money_cleared: true,
    down_payment_cleared: false,
    title_deed_searched: true,
    rajuk_approval_verified: true,
    stamp_duty_paid: false,
    sub_registry_token_issued: false
  };

  sanitizedContent = computed<SafeHtml>(() => {
    const raw = this.document()?.rendered_content || '<p>No content available.</p>';
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  });

  checklistPassedCount(): number {
    return Object.values(this.checklist).filter(Boolean).length;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.docId.set(Number(idParam));
      this.loadDocument(Number(idParam));
    }
  }

  loadDocument(id: number): void {
    this.isLoading.set(true);
    this.salesService.getSalesDocument(id).subscribe({
      next: (res) => {
        this.document.set(res);
        if (res.checklist_status_json) {
          this.checklist = { ...this.checklist, ...res.checklist_status_json } as LegalChecklist;
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to load legal document.');
        this.isLoading.set(false);
      }
    });
  }

  printDocument(): void {
    window.print();
  }

  processReview(decision: 'LEGAL_APPROVED' | 'REJECTED'): void {
    const id = this.docId();
    if (!id) return;
    const notes = prompt(`Enter legal review comments for ${decision}:`) || 'Legal terms verified in accordance with statutory requirements.';
    this.isActionSubmitting.set(true);

    this.salesService.reviewSalesDocument(id, { decision, notes }).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.isActionSubmitting.set(false);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Legal review action failed.');
        this.isActionSubmitting.set(false);
      }
    });
  }

  signDocument(party: 'FIRST_PARTY' | 'SECOND_PARTY'): void {
    const id = this.docId();
    if (!id) return;
    if (confirm(`Confirm ${party === 'FIRST_PARTY' ? 'Developer' : 'Buyer'} formal execution signature?`)) {
      this.isActionSubmitting.set(true);
      this.salesService.signSalesDocument(id, { party }).subscribe({
        next: (updated) => {
          this.document.set(updated);
          this.isActionSubmitting.set(false);
        },
        error: (err) => {
          alert(err?.error?.detail || 'Failed to record signature.');
          this.isActionSubmitting.set(false);
        }
      });
    }
  }

  saveChecklist(): void {
    const id = this.docId();
    if (!id) return;
    this.isActionSubmitting.set(true);
    this.salesService.updateDeedChecklist(id, this.checklist).subscribe({
      next: (updated) => {
        this.document.set(updated);
        this.isActionSubmitting.set(false);
        alert('Statutory deed checklist saved successfully!');
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to update checklist.');
        this.isActionSubmitting.set(false);
      }
    });
  }
}
