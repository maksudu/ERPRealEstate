import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { Booking } from '../../../core/models/sales.model';
import {
  CustomMilestoneItem,
  InstallmentSchedulePreviewResponse,
  InstallmentSchedulePreviewItem
} from '../../../core/models/installment.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-schedule-form',
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
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      <!-- Top Navigation & Title Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/schedules"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Schedule Registry"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Payment Schedule Engine
              </span>
              <span class="text-xs text-muted-foreground font-mono">Contractual Obligation</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Generate Contractual Installment Schedule
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a
            routerLink="/sales/schedules"
            class="px-4 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            (clicked)="onSubmit()"
            [disabled]="scheduleForm.invalid || isSubmitting()"
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ isSubmitting() ? 'Committing Schedule...' : 'Save & Activate Schedule' }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Bangladesh Mathematical Exactness Notice -->
      <div class="p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-xs flex items-start gap-3">
        <svg class="w-5 h-5 flex-shrink-0 text-sky-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
        <div class="space-y-1">
          <p class="font-semibold text-sky-200 uppercase tracking-wider text-[11px]">Precision Amortization & Rounding Rule</p>
          <p class="text-sky-300/90 leading-relaxed">
            The amortization engine amortizes the balance after down payment into equal installments. Fractional decimal remainders are automatically resolved on the final installment, guaranteeing that the mathematical sum of all installments equals the approved contract price with zero discrepancy.
          </p>
        </div>
      </div>

      <!-- Main Form Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Configuration Parameters (5 Cols) -->
        <div class="lg:col-span-5 space-y-6">
          <app-card-container [title]="'Schedule Parameters'" [subtitle]="'Select booking allotment and configure commercial terms'">
            <form [formGroup]="scheduleForm" class="space-y-4">
              <!-- Searchable Booking Select with + Add New -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-semibold text-foreground">Select Apartment Booking *</label>
                  <a routerLink="/sales/bookings/create" class="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1">
                    <span>+ New Booking</span>
                  </a>
                </div>
                <app-searchable-select
                  [placeholder]="'Select Apartment Booking Allotment...'"
                  [options]="bookingOptions()"
                  [value]="scheduleForm.get('booking_id')?.value ? '' + scheduleForm.get('booking_id')?.value : ''"
                  (valueChange)="onBookingChange($event)"
                  [required]="true">
                </app-searchable-select>
              </div>

              <!-- Selected Booking Metadata Card -->
              <div *ngIf="selectedBooking()" class="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs space-y-2">
                <div class="flex justify-between items-center border-b border-border/50 pb-2">
                  <span class="text-muted-foreground font-medium">Customer:</span>
                  <span class="font-bold text-foreground">{{ selectedBooking()?.customer_name }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-muted-foreground">Project / Unit:</span>
                  <span class="text-foreground font-medium">{{ selectedBooking()?.project_name }} · Unit {{ selectedBooking()?.unit_number }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-muted-foreground">Approved Contract Price:</span>
                  <span class="font-mono font-bold text-primary">BDT {{ selectedBooking()?.final_contract_value | number:'1.0-0' }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-muted-foreground">Booking Money Paid:</span>
                  <span class="font-mono text-emerald-400">BDT {{ (selectedBooking()?.earnest_money_received || 0) | number:'1.0-0' }}</span>
                </div>
              </div>

              <!-- Agreement Reference No -->
              <app-custom-input
                [label]="'Sales Agreement Reference No (Spec 5.6)'"
                [placeholder]="'e.g. AGR-2026-0042'"
                [value]="scheduleForm.get('agreement_reference_no')?.value"
                (valueChange)="scheduleForm.get('agreement_reference_no')?.setValue($event)">
              </app-custom-input>

              <!-- Plan Type Selection -->
              <app-searchable-select
                [label]="'Payment Obligation Plan Type *'"
                [placeholder]="'Select Plan Type'"
                [options]="planTypeOptions"
                [value]="scheduleForm.get('plan_type')?.value"
                (valueChange)="onPlanTypeSelect($event)"
                [required]="true">
              </app-searchable-select>

              <!-- Down Payment % & Installment Count -->
              <div class="grid grid-cols-2 gap-3">
                <app-custom-input
                  [label]="'Down Payment %'"
                  [type]="'number'"
                  [placeholder]="'15'"
                  [value]="scheduleForm.get('down_payment_percentage')?.value"
                  (valueChange)="onDownPaymentPctChange($event)"
                  [required]="true">
                </app-custom-input>

                <app-custom-input
                  *ngIf="scheduleForm.get('plan_type')?.value !== 'CONSTRUCTION_MILESTONE'"
                  [label]="scheduleForm.get('plan_type')?.value === 'QUARTERLY' ? 'Total Quarters' : 'Total Months (EMI)'"
                  [type]="'number'"
                  [placeholder]="'36'"
                  [value]="scheduleForm.get('total_installments')?.value"
                  (valueChange)="onInstallmentsCountChange($event)"
                  [required]="true">
                </app-custom-input>
              </div>

              <!-- Start Date & Grace Period -->
              <div class="grid grid-cols-2 gap-3">
                <app-custom-input
                  [label]="'Schedule Start Date'"
                  [type]="'date'"
                  [value]="scheduleForm.get('start_date')?.value"
                  (valueChange)="scheduleForm.get('start_date')?.setValue($event); triggerPreview()">
                </app-custom-input>

                <app-custom-input
                  [label]="'Grace Period (Days)'"
                  [type]="'number'"
                  [placeholder]="'15'"
                  [value]="scheduleForm.get('grace_period_days')?.value"
                  (valueChange)="scheduleForm.get('grace_period_days')?.setValue($event); triggerPreview()">
                </app-custom-input>
              </div>

              <!-- Custom Milestone Configurator -->
              <div *ngIf="scheduleForm.get('plan_type')?.value === 'CUSTOM'" class="space-y-3 pt-2 border-t border-border">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">Custom Milestones ({{ customMilestones().length }})</span>
                  <button type="button" (click)="addCustomMilestone()" class="text-xs text-primary font-semibold hover:underline">
                    + Add Milestone
                  </button>
                </div>

                <div class="space-y-2 max-h-60 overflow-y-auto">
                  <div *ngFor="let m of customMilestones(); let idx = index" class="p-2.5 rounded-lg bg-card border border-border space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                      <span class="font-semibold text-foreground font-mono">Milestone #{{ idx + 1 }}</span>
                      <button (click)="removeCustomMilestone(idx)" class="text-rose-400 hover:text-rose-300">✕</button>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        [(ngModel)]="m.title"
                        [ngModelOptions]="{standalone: true}"
                        (change)="triggerPreview()"
                        placeholder="Description (e.g. 5th Floor Slab)"
                        class="px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground"
                      />
                      <div class="flex items-center gap-1">
                        <input
                          type="number"
                          [(ngModel)]="m.percentage"
                          [ngModelOptions]="{standalone: true}"
                          (change)="triggerPreview()"
                          placeholder="%"
                          class="w-full px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-foreground font-mono"
                        />
                        <span class="text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <app-custom-input
                [label]="'Commercial Notes & Terms'"
                [placeholder]="'e.g. Approved under festive discount scheme'"
                [value]="scheduleForm.get('notes')?.value"
                (valueChange)="scheduleForm.get('notes')?.setValue($event)">
              </app-custom-input>
            </form>
          </app-card-container>
        </div>

        <!-- Right: Live Amortization Preview & Rounding Audit (7 Cols) -->
        <div class="lg:col-span-7 space-y-4">
          <app-card-container [title]="'Live Amortization Preview & Rounding Audit'" [subtitle]="'Real-time verification of mathematical penny distribution'">
            <!-- Loading Indicator -->
            <div *ngIf="isPreviewLoading()" class="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <svg class="w-8 h-8 animate-spin mb-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <p class="text-xs">Calculating mathematical amortization...</p>
            </div>

            <!-- Mathematical Verification Banner -->
            <div *ngIf="preview() && !isPreviewLoading()" class="space-y-4">
              <div [class]="preview()?.is_validated ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'" class="p-3.5 rounded-xl border text-xs flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <svg class="w-5 h-5 flex-shrink-0" [class]="preview()?.is_validated ? 'text-emerald-400' : 'text-rose-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div>
                    <span class="font-bold uppercase tracking-wider block">
                      {{ preview()?.is_validated ? '✓ Mathematical Exact Sum Validated' : '⚠ Discrepancy Detected' }}
                    </span>
                    <span class="text-[11px] opacity-90">
                      Calculated Sum: BDT {{ preview()?.calculated_total_sum | number:'1.2-2' }} == Approved Contract: BDT {{ preview()?.approved_contract_price | number:'1.2-2' }} (Variance: BDT {{ preview()?.discrepancy_amount }})
                    </span>
                  </div>
                </div>
                <div *ngIf="preview()?.rounding_adjustment_amount !== 0" class="text-right">
                  <span class="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    Penny Adj: {{ (preview()?.rounding_adjustment_amount || 0) > 0 ? '+' : '' }}{{ preview()?.rounding_adjustment_amount }} on #{{ preview()?.rounding_adjusted_installment_no }}
                  </span>
                </div>
              </div>

              <!-- Financial Breakdown Chips -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div class="p-2.5 rounded-lg bg-card border border-border">
                  <p class="text-[10px] text-muted-foreground uppercase">Down Payment ({{ preview()?.down_payment_percentage }}%)</p>
                  <p class="font-bold text-foreground font-mono">BDT {{ preview()?.down_payment_amount | number:'1.0-0' }}</p>
                </div>
                <div class="p-2.5 rounded-lg bg-card border border-border">
                  <p class="text-[10px] text-muted-foreground uppercase">Net DP Balance Due</p>
                  <p class="font-bold text-emerald-400 font-mono">BDT {{ preview()?.net_down_payment_due | number:'1.0-0' }}</p>
                </div>
                <div class="p-2.5 rounded-lg bg-card border border-border">
                  <p class="text-[10px] text-muted-foreground uppercase">Installment Balance</p>
                  <p class="font-bold text-primary font-mono">BDT {{ preview()?.installment_balance_amount | number:'1.0-0' }}</p>
                </div>
                <div class="p-2.5 rounded-lg bg-card border border-border">
                  <p class="text-[10px] text-muted-foreground uppercase">Total Milestones</p>
                  <p class="font-bold text-foreground font-mono">{{ preview()?.total_installment_count }} milestones</p>
                </div>
              </div>

              <!-- Preview Table -->
              <div class="overflow-x-auto rounded-xl border border-border bg-card max-h-[480px] overflow-y-auto">
                <table class="w-full text-left text-xs text-muted-foreground">
                  <thead class="bg-secondary/40 text-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border sticky top-0 z-10">
                    <tr>
                      <th class="p-2.5">#</th>
                      <th class="p-2.5">Installment Description</th>
                      <th class="p-2.5 text-center">Due Date</th>
                      <th class="p-2.5 text-center">Grace</th>
                      <th class="p-2.5 text-right">Payable (BDT)</th>
                      <th class="p-2.5 text-center">Rounding</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    <tr *ngFor="let item of preview()?.installments" [ngClass]="item.is_rounding_adjusted ? 'bg-amber-500/5' : ''" class="hover:bg-secondary/20 transition-colors">
                      <td class="p-2.5 font-mono font-bold text-foreground">{{ item.installment_no }}</td>
                      <td class="p-2.5">
                        <span class="font-semibold text-foreground">{{ item.title }}</span>
                        <div *ngIf="item.milestone_trigger" class="text-[10px] text-primary font-mono">Trigger: {{ item.milestone_trigger }}</div>
                      </td>
                      <td class="p-2.5 text-center font-mono">{{ item.due_date | date:'dd MMM yyyy' }}</td>
                      <td class="p-2.5 text-center">{{ item.grace_period_days }}d</td>
                      <td class="p-2.5 text-right font-mono font-bold text-foreground">
                        {{ item.payable_amount | number:'1.2-2' }}
                      </td>
                      <td class="p-2.5 text-center">
                        <span *ngIf="item.is_rounding_adjusted" class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                          {{ item.rounding_adjustment > 0 ? '+' : '' }}{{ item.rounding_adjustment }}
                        </span>
                        <span *ngIf="!item.is_rounding_adjusted" class="text-muted-foreground/40 text-[10px]">—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Empty / Initial state when no booking selected -->
            <div *ngIf="!preview() && !isPreviewLoading()" class="py-16 text-center border border-dashed border-border rounded-xl">
              <svg class="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <p class="text-sm font-semibold text-foreground">Select a Booking to View Live Preview</p>
              <p class="text-xs text-muted-foreground mt-0.5">The amortization engine will instantly project contractual payment obligations.</p>
            </div>
          </app-card-container>
        </div>
      </div>
    </div>
  `
})
export class ScheduleFormComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  bookings = signal<Booking[]>([]);
  selectedBooking = signal<Booking | null>(null);

  preview = signal<InstallmentSchedulePreviewResponse | null>(null);
  isPreviewLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  scheduleForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    agreement_reference_no: [''],
    plan_type: ['MONTHLY', Validators.required],
    total_installments: [36, [Validators.required, Validators.min(1), Validators.max(120)]],
    down_payment_percentage: [15, [Validators.required, Validators.min(0), Validators.max(80)]],
    start_date: [new Date().toISOString().split('T')[0], Validators.required],
    grace_period_days: [15, [Validators.required, Validators.min(0), Validators.max(90)]],
    notes: ['']
  });

  customMilestones = signal<CustomMilestoneItem[]>([
    { title: 'Booking Confirmation', percentage: 5, milestone_trigger: 'BOOKING_CONFIRMATION' },
    { title: 'Allotment & Down Payment', percentage: 10, milestone_trigger: 'ALLOTMENT_LETTER' },
    { title: 'Piling & Substructure Casting', percentage: 15, milestone_trigger: 'FOUNDATION_DONE' },
    { title: '5th Floor Roof Slab Casting', percentage: 15, milestone_trigger: 'STRUCTURE_L5' },
    { title: 'Top Floor Roof Slab Casting', percentage: 15, milestone_trigger: 'ROOF_CASTING' },
    { title: 'Brickwork, Plaster & Sanitary', percentage: 20, milestone_trigger: 'FINISHING_WORKS' },
    { title: 'Key Handover & Deed Registration', percentage: 20, milestone_trigger: 'HANDOVER_DEED' }
  ]);

  bookingOptions = computed(() => {
    return this.bookings().map((b) => ({
      value: String(b.id),
      label: `${b.booking_reference_no} · ${b.customer_name} (${b.project_name} - Unit ${b.unit_number})`
    }));
  });

  planTypeOptions = [
    { label: 'Equal Monthly Installments (36 Months Standard EMI)', value: 'MONTHLY' },
    { label: 'Quarterly Amortization (Every 3 Months)', value: 'QUARTERLY' },
    { label: 'Civil Construction Milestones (7 Real Estate Stages)', value: 'CONSTRUCTION_MILESTONE' },
    { label: 'Structural Stages', value: 'STRUCTURAL_STAGE' },
    { label: 'Custom Negotiated Schedule (Define Percentages)', value: 'CUSTOM' }
  ];

  ngOnInit(): void {
    this.loadBookings();

    const bookingIdParam = this.route.snapshot.queryParamMap.get('booking_id');
    if (bookingIdParam) {
      this.scheduleForm.patchValue({ booking_id: Number(bookingIdParam) });
    }
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (b) => {
        const list = b || [];
        this.bookings.set(list);

        const currentId = this.scheduleForm.get('booking_id')?.value;
        if (currentId) {
          const match = list.find((item) => item.id === Number(currentId));
          if (match) {
            this.selectedBooking.set(match);
            this.triggerPreview();
          }
        } else if (list.length > 0) {
          this.scheduleForm.patchValue({ booking_id: list[0].id });
          this.selectedBooking.set(list[0]);
          this.triggerPreview();
        }
      }
    });
  }

  onBookingChange(val: string): void {
    const id = Number(val);
    this.scheduleForm.patchValue({ booking_id: id });
    const match = this.bookings().find((b) => b.id === id);
    this.selectedBooking.set(match || null);
    this.triggerPreview();
  }

  onPlanTypeSelect(plan: string): void {
    this.scheduleForm.patchValue({ plan_type: plan });
    if (plan === 'QUARTERLY') {
      this.scheduleForm.patchValue({ total_installments: 12 });
    } else if (plan === 'MONTHLY') {
      this.scheduleForm.patchValue({ total_installments: 36 });
    }
    this.triggerPreview();
  }

  onDownPaymentPctChange(val: string): void {
    this.scheduleForm.patchValue({ down_payment_percentage: Number(val) });
    this.triggerPreview();
  }

  onInstallmentsCountChange(val: string): void {
    this.scheduleForm.patchValue({ total_installments: Number(val) });
    this.triggerPreview();
  }

  addCustomMilestone(): void {
    this.customMilestones.update((arr) => [
      ...arr,
      { title: `Milestone #${arr.length + 1}`, percentage: 10, milestone_trigger: `MILESTONE_${arr.length + 1}` }
    ]);
    this.triggerPreview();
  }

  removeCustomMilestone(idx: number): void {
    this.customMilestones.update((arr) => arr.filter((_, i) => i !== idx));
    this.triggerPreview();
  }

  triggerPreview(): void {
    const bookingId = this.scheduleForm.get('booking_id')?.value;
    if (!bookingId) return;

    this.isPreviewLoading.set(true);
    const formVal = this.scheduleForm.value;

    const payload = {
      booking_id: Number(bookingId),
      plan_type: formVal.plan_type,
      total_installments: Number(formVal.total_installments),
      down_payment_percentage: Number(formVal.down_payment_percentage),
      start_date: formVal.start_date,
      grace_period_days: Number(formVal.grace_period_days),
      custom_milestones: formVal.plan_type === 'CUSTOM' ? this.customMilestones() : undefined
    };

    this.installmentService.previewSchedule(payload).subscribe({
      next: (res) => {
        this.preview.set(res);
        this.isPreviewLoading.set(false);
      },
      error: () => this.isPreviewLoading.set(false)
    });
  }

  onSubmit(): void {
    if (this.scheduleForm.invalid) return;

    this.isSubmitting.set(true);
    const formVal = this.scheduleForm.value;

    const payload = {
      booking_id: Number(formVal.booking_id),
      agreement_reference_no: formVal.agreement_reference_no || undefined,
      plan_type: formVal.plan_type,
      total_installments: Number(formVal.total_installments),
      down_payment_percentage: Number(formVal.down_payment_percentage),
      start_date: formVal.start_date,
      grace_period_days: Number(formVal.grace_period_days),
      custom_milestones: formVal.plan_type === 'CUSTOM' ? this.customMilestones() : undefined,
      notes: formVal.notes || undefined
    };

    this.installmentService.generateSchedule(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        // Load the created schedule for this booking to navigate to its details
        this.installmentService.getActiveScheduleByBooking(payload.booking_id).subscribe({
          next: (sched) => {
            this.router.navigate(['/sales/schedules', sched.id]);
          },
          error: () => {
            this.router.navigate(['/sales/schedules']);
          }
        });
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to generate schedule.');
        this.isSubmitting.set(false);
      }
    });
  }
}
