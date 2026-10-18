import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { RABill, WorkOrder } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-ra-bill-form',
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
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/ra-bills"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to RA Bills Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Statutory RA Billing Engine
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isViewMode() ? 'Bill #' + existingBill()?.ra_bill_number : 'New RA Bill Creation' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isViewMode() ? 'RA Bill Review & Digital Signatures' : 'Generate Running Account (RA) Bill' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/ra-bills"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Back to List
          </a>
          @if (!isViewMode()) {
            <app-custom-button
              variant="primary"
              [disabled]="billForm.invalid || isSaving()"
              (clicked)="saveRABill()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Generate RA Bill
                }
              </span>
            </app-custom-button>
          }
        </div>
      </div>

      <!-- Main Standalone Form / Review Card -->
      <app-card-container
        [title]="'Running Account (RA) Certification & Statutory Calculation'"
        [subtitle]="'Gross work certified, automatic 5% retention, TDS Section 52, VDS, store recovery and net payable computation'"
      >
        <form [formGroup]="billForm" class="flex flex-col gap-6">
          <!-- Step 1: Work Order & Memo Identification -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              1. Subcontractor Work Order & Billing Period
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="sm:col-span-2 lg:col-span-1">
                <app-searchable-select
                  label="Select Subcontractor Work Order *"
                  [options]="workOrderOptions"
                  formControlName="work_order_id"
                  [allowCreateNew]="false"
                  placeholder="Select work order..."
                >
                </app-searchable-select>
              </div>

              <app-custom-input
                label="RA Bill Memo Number *"
                placeholder="e.g. RA-2026-001"
                formControlName="ra_bill_number"
              >
              </app-custom-input>

              <app-custom-input
                label="Bill Date *"
                type="date"
                formControlName="bill_date"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Billing Period Start"
                type="date"
                formControlName="billing_period_start"
              >
              </app-custom-input>

              <app-custom-input
                label="Billing Period End"
                type="date"
                formControlName="billing_period_end"
              >
              </app-custom-input>
            </div>
          </div>

          <!-- Step 2: Financial Certification & Statutory Formula -->
          <div class="space-y-4 pt-4 border-t border-border">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              2. Gross Work Certified & Statutory Deductions (Section 52 TDS & VDS)
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Gross Work Certified (BDT) *"
                type="number"
                min="0"
                placeholder="2,500,000"
                formControlName="gross_work_certified_amount"
              >
              </app-custom-input>

              <app-custom-input
                label="Retention Money Rate (%) *"
                type="number"
                min="0"
                max="20"
                placeholder="5.0"
                formControlName="retention_percent"
              >
              </app-custom-input>

              <app-custom-input
                label="Advance Recovery Deducted (BDT)"
                type="number"
                min="0"
                placeholder="0.00"
                formControlName="advance_recovery_deducted"
              >
              </app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Material / Store Recovery (BDT)"
                type="number"
                min="0"
                placeholder="0.00"
                formControlName="material_store_recovery_amount"
              >
              </app-custom-input>

              <app-custom-input
                label="TDS Rate (%) [ITO 1984 Sec 52] *"
                type="number"
                min="0"
                max="20"
                placeholder="5.0"
                formControlName="tds_rate"
              >
              </app-custom-input>

              <app-custom-input
                label="VDS Rate (%) [VAT Act 2012] *"
                type="number"
                min="0"
                max="20"
                placeholder="5.0"
                formControlName="vds_rate"
              >
              </app-custom-input>
            </div>
          </div>

          <!-- Live Statutory Deduction Breakdown Banner -->
          <div class="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-border/80">
              <span class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Statutory Deduction Breakdown</span>
              <span class="text-xs font-mono font-bold text-foreground">Gross: BDT {{ grossAmount() | number:'1.2-2' }}</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div>
                <span class="text-muted-foreground block text-[10px]">Retention ({{ retentionPct() }}%):</span>
                <span class="font-semibold text-rose-500">- BDT {{ retentionAmount() | number:'1.2-2' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">TDS Sec 52 ({{ tdsPct() }}%):</span>
                <span class="font-semibold text-rose-500">- BDT {{ tdsAmount() | number:'1.2-2' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">VDS ({{ vdsPct() }}%):</span>
                <span class="font-semibold text-rose-500">- BDT {{ vdsAmount() | number:'1.2-2' }}</span>
              </div>
              <div>
                <span class="text-muted-foreground block text-[10px]">Store/Adv Recoveries:</span>
                <span class="font-semibold text-rose-500">- BDT {{ (advanceRecovery() + storeRecovery()) | number:'1.2-2' }}</span>
              </div>
            </div>

            <div class="pt-3 border-t border-border flex items-center justify-between">
              <div>
                <span class="text-xs text-muted-foreground block">Net Payable to Contractor:</span>
                <span class="text-2xl font-bold font-mono text-emerald-500">
                  BDT {{ netPayable() | number:'1.2-2' }}
                </span>
              </div>
              <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
                Auto-Computed Statutory Formula
              </span>
            </div>
          </div>

          <app-custom-textarea
            label="Certification Remarks / Measurement Notes"
            placeholder="Enter physical progress measurement notes, verification reference..."
            formControlName="remarks"
            [rows]="2"
          >
          </app-custom-textarea>

          <!-- Digital Approval Signature Chain (When in View Mode) -->
          @if (isViewMode() && existingBill()?.approval_signature_chain) {
            <div class="space-y-4 pt-4 border-t border-border">
              <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                3. Tier-1 Digital Signature & Approval Chain
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                @for (step of existingBill()?.approval_signature_chain; track step.role) {
                  <div class="p-3.5 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
                    <div>
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{{ step.title }}</span>
                        <span
                          class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          [ngClass]="{
                            'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20': step.status === 'APPROVED' || step.status === 'VERIFIED',
                            'bg-amber-500/10 text-amber-500 border border-amber-500/20': step.status === 'PENDING',
                            'bg-rose-500/10 text-rose-500 border border-rose-500/20': step.status === 'REJECTED'
                          }"
                        >
                          {{ step.status }}
                        </span>
                      </div>
                      <div class="font-bold text-xs text-foreground mt-1">{{ step.signed_by || 'Awaiting Signatory' }}</div>
                      @if (step.signed_at) {
                        <div class="text-[10px] text-muted-foreground font-mono mt-0.5">{{ step.signed_at | date:'short' }}</div>
                      }
                      @if (step.notes) {
                        <p class="text-[11px] text-muted-foreground mt-2 italic bg-secondary/30 p-2 rounded">"{{ step.notes }}"</p>
                      }
                    </div>

                    @if (step.status === 'PENDING') {
                      <div class="mt-4 pt-3 border-t border-border flex items-center gap-2">
                        <button
                          type="button"
                          (click)="signStep(step.role, 'APPROVE')"
                          class="flex-1 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          (click)="signStep(step.role, 'REJECT')"
                          class="flex-1 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </form>
      </app-card-container>
    </div>
  `
})
export class RaBillFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);

  isViewMode = signal<boolean>(false);
  billId = signal<number | null>(null);
  existingBill = signal<RABill | null>(null);
  isSaving = signal<boolean>(false);

  workOrders = signal<WorkOrder[]>([]);
  workOrderOptions: { value: any; label: string }[] = [];

  billForm: FormGroup = this.fb.group({
    work_order_id: [null, Validators.required],
    ra_bill_number: ['', Validators.required],
    bill_date: [new Date().toISOString().split('T')[0], Validators.required],
    billing_period_start: [new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]],
    billing_period_end: [new Date().toISOString().split('T')[0]],
    gross_work_certified_amount: [2500000, [Validators.required, Validators.min(1000)]],
    retention_percent: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    advance_recovery_deducted: [0, [Validators.min(0)]],
    material_store_recovery_amount: [0, [Validators.min(0)]],
    tds_rate: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    vds_rate: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    remarks: ['']
  });

  // Computed live deduction breakdown
  grossAmount = computed(() => Number(this.billForm.get('gross_work_certified_amount')?.value) || 0);
  retentionPct = computed(() => Number(this.billForm.get('retention_percent')?.value) || 0);
  retentionAmount = computed(() => round2(this.grossAmount() * (this.retentionPct() / 100)));
  advanceRecovery = computed(() => Number(this.billForm.get('advance_recovery_deducted')?.value) || 0);
  storeRecovery = computed(() => Number(this.billForm.get('material_store_recovery_amount')?.value) || 0);
  tdsPct = computed(() => Number(this.billForm.get('tds_rate')?.value) || 0);
  tdsAmount = computed(() => round2(this.grossAmount() * (this.tdsPct() / 100)));
  vdsPct = computed(() => Number(this.billForm.get('vds_rate')?.value) || 0);
  vdsAmount = computed(() => round2(this.grossAmount() * (this.vdsPct() / 100)));

  netPayable = computed(() => {
    return round2(
      this.grossAmount() -
      this.retentionAmount() -
      this.advanceRecovery() -
      this.storeRecovery() -
      this.tdsAmount() -
      this.vdsAmount()
    );
  });

  ngOnInit(): void {
    this.loadWorkOrders();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isViewMode.set(true);
        this.billId.set(id);
        this.loadBill(id);
      }
    } else {
      // Auto-generate Bill memo number
      const memoNum = Math.floor(1000 + Math.random() * 9000);
      this.billForm.patchValue({
        ra_bill_number: `RA-2026-${memoNum}`
      });
    }
  }

  loadWorkOrders(): void {
    this.constructionService.getWorkOrders().subscribe({
      next: (wos) => {
        this.workOrders.set(wos);
        this.workOrderOptions = wos.map(w => ({
          value: w.id,
          label: `${w.work_order_no} | ${w.contractor_name || 'Contractor'} - ${w.project_name || 'Project'}`
        }));
      }
    });
  }

  loadBill(id: number): void {
    this.constructionService.getRABillById(id).subscribe({
      next: (b) => {
        this.existingBill.set(b);
        this.billForm.patchValue({
          work_order_id: b.work_order_id,
          ra_bill_number: b.ra_bill_number,
          bill_date: b.bill_date,
          billing_period_start: b.billing_period_start,
          billing_period_end: b.billing_period_end,
          gross_work_certified_amount: b.gross_work_certified_amount,
          retention_percent: b.retention_percent,
          advance_recovery_deducted: b.advance_recovery_deducted,
          material_store_recovery_amount: b.material_store_recovery_amount,
          tds_rate: b.tds_rate,
          vds_rate: b.vds_rate,
          remarks: b.remarks
        });
      }
    });
  }

  saveRABill(): void {
    if (this.billForm.invalid) {
      this.billForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.billForm.value;
    const payload = {
      work_order_id: Number(formVal.work_order_id),
      ra_bill_number: formVal.ra_bill_number,
      bill_date: formVal.bill_date,
      billing_period_start: formVal.billing_period_start,
      billing_period_end: formVal.billing_period_end,
      gross_work_certified_amount: Number(formVal.gross_work_certified_amount),
      retention_percent: Number(formVal.retention_percent),
      advance_recovery_deducted: Number(formVal.advance_recovery_deducted),
      material_store_recovery_amount: Number(formVal.material_store_recovery_amount),
      tds_rate: Number(formVal.tds_rate),
      vds_rate: Number(formVal.vds_rate),
      remarks: formVal.remarks
    };

    this.constructionService.createRABill(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/ra-bills']);
      },
      error: () => this.isSaving.set(false)
    });
  }

  signStep(role: string, action: string): void {
    if (!this.billId()) return;
    const signatory = role === 'ACCOUNTS' ? 'Head of Accounts' : (role === 'PROJECT_DIRECTOR' ? 'Project Director' : 'Quantity Surveyor (QS)');
    this.constructionService.signRABill(this.billId()!, {
      role: role,
      signatory_name: signatory,
      action: action,
      approval_notes: `Formally signed by ${signatory}`
    }).subscribe({
      next: (updated) => {
        this.existingBill.set(updated);
      }
    });
  }
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
