import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { BookingInstallmentSchedule, CustomerInstallment } from '../../../core/models/installment.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-schedule-details',
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
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/schedules"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Installment Schedules"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.7 · Installment Schedule Dossier
              </span>
              <span class="text-xs font-mono text-muted-foreground">{{ schedule()?.schedule_code || 'Loading...' }}</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ formatPlanType(schedule()?.plan_type) }} Payment Schedule
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button
            (click)="exportPdf()"
            [disabled]="isExporting()"
            class="px-3.5 py-2 rounded-xl border border-border bg-card text-foreground hover:bg-secondary text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
            </svg>
            {{ isExporting() ? 'Exporting...' : 'Export Schedule PDF' }}
          </button>

          @if (schedule()?.status === 'ACTIVE') {
            <a
              [routerLink]="['/sales/schedules', schedule()?.id, 'amend']"
              class="px-3.5 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Amend / Restructure Schedule
            </a>
          }

          <a
            routerLink="/sales/schedules/create"
            class="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Generate New Schedule
          </a>
        </div>
      </div>

      <!-- Action Message / Alerts -->
      @if (actionMessage()) {
        <div class="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm flex items-center justify-between">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span>{{ actionMessage() }}</span>
          </div>
          <button (click)="actionMessage.set('')" class="text-xs hover:underline">Dismiss</button>
        </div>
      }

      @if (isLoading()) {
        <div class="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
          <svg class="w-8 h-8 animate-spin mx-auto text-primary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Loading installment amortization dossier...
        </div>
      } @else if (schedule()) {
        <!-- Superseded Alert if Inactive -->
        @if (schedule()?.status === 'SUPERSEDED_AMENDED') {
          <div class="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-3">
            <svg class="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <div>
              <strong class="font-bold">Historical Superseded Schedule (Archived)</strong>
              <p class="text-xs mt-1">
                This schedule version was amended and restructured. Reason: <em>"{{ schedule()?.amendment_reason || 'Amended per commercial agreement' }}"</em>.
              </p>
            </div>
          </div>
        }

        <!-- 4 Spec-Defined Financial KPIs -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Contractual Price</span>
            <div class="text-xl font-bold font-mono text-foreground mt-1">৳{{ formatCurrency(schedule()?.contract_price || 0) }}</div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">Approved Contract Value</span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Down Payment ({{ schedule()?.down_payment_percentage }}%)</span>
            <div class="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">৳{{ formatCurrency(schedule()?.down_payment_amount || 0) }}</div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">
              Earnest: ৳{{ formatCurrency(schedule()?.earnest_money_credited || 0) }} | Net Due: ৳{{ formatCurrency(schedule()?.net_down_payment_amount || 0) }}
            </span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Installment Balance</span>
            <div class="text-xl font-bold font-mono text-primary mt-1">৳{{ formatCurrency(schedule()?.installment_balance || 0) }}</div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">
              {{ schedule()?.total_installments }} installments (avg ৳{{ formatCurrency(schedule()?.regular_installment_amount || 0) }})
            </span>
          </div>

          <div class="bg-card border border-border rounded-xl p-4 shadow-xs">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Billed vs Outstanding</span>
            <div class="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              ৳{{ formatCurrency(schedule()?.total_billed || 0) }}
            </div>
            <span class="text-[11px] text-muted-foreground mt-0.5 block">
              Paid: ৳{{ formatCurrency(schedule()?.total_paid || 0) }} | Due: ৳{{ formatCurrency(schedule()?.total_outstanding || 0) }}
            </span>
          </div>
        </div>

        <!-- Schedule Metadata Card -->
        <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <span class="text-xs text-muted-foreground block">Customer Profile</span>
              <strong class="text-foreground text-sm block mt-0.5">{{ schedule()?.customer_name }}</strong>
              <span class="text-xs text-muted-foreground">{{ schedule()?.customer_phone || 'No phone' }}</span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Property Allotment</span>
              <strong class="text-foreground text-sm block mt-0.5">{{ schedule()?.project_name }}</strong>
              <span class="text-xs text-muted-foreground font-mono">Unit: {{ schedule()?.unit_number }}</span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Booking & Agreement Reference</span>
              <a [routerLink]="['/sales/bookings', schedule()?.booking_id]" class="text-primary font-mono text-xs font-bold hover:underline block mt-0.5">
                {{ schedule()?.booking_reference_no }}
              </a>
              <span class="text-xs text-muted-foreground font-mono">Deed Ref: {{ schedule()?.agreement_reference_no || 'Pending signing' }}</span>
            </div>

            <div>
              <span class="text-xs text-muted-foreground block">Schedule Version & Status</span>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border font-bold">
                  {{ schedule()?.version }}
                </span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full"
                  [ngClass]="{
                    'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20': schedule()?.status === 'ACTIVE',
                    'bg-amber-500/10 text-amber-600 border border-amber-500/20': schedule()?.status === 'SUPERSEDED_AMENDED'
                  }">
                  {{ schedule()?.status }}
                </span>
              </div>
              <span class="text-[11px] text-muted-foreground mt-1 block">Grace Period: {{ schedule()?.grace_period_days }} Days</span>
            </div>
          </div>

          <!-- Mathematical Rounding Guarantee Notice -->
          <div class="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>
                <strong>Spec 5.7 Exact Rounding Guarantee:</strong> Installments sum equals approved contract price (৳{{ formatCurrency(schedule()?.contract_price || 0) }}) exactly.
                @if (schedule()?.rounding_adjustment_amount) {
                  Discrepancy of ৳{{ schedule()?.rounding_adjustment_amount }} distributed on Installment #{{ schedule()?.rounding_adjusted_installment_no }}.
                }
              </span>
            </div>
            <div class="text-[11px] font-mono">
              Created: {{ schedule()?.created_at | date:'dd MMM yyyy, hh:mm a' }}
            </div>
          </div>
        </div>

        <!-- Installments Breakdown Table -->
        <app-card title="Contractual Payment Obligations & Milestone Schedule" subtitle="List of all contractual installments, billing dates, invoice links, and payment states">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-foreground border-collapse">
              <thead>
                <tr class="border-b border-border bg-secondary/30 text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th class="py-3 px-3 w-12 text-center">#</th>
                  <th class="py-3 px-4">Installment Description & Type</th>
                  <th class="py-3 px-3">Milestone / Due Date</th>
                  <th class="py-3 px-3">Grace</th>
                  <th class="py-3 px-3 text-right">Payable (৳)</th>
                  <th class="py-3 px-3 text-right">Paid (৳)</th>
                  <th class="py-3 px-3 text-right">Balance (৳)</th>
                  <th class="py-3 px-3 text-center">Invoice Status</th>
                  <th class="py-3 px-3 text-center">Collection Status</th>
                  <th class="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                @for (item of schedule()?.installments; track item.id) {
                  <tr class="hover:bg-secondary/20 transition-colors" [ngClass]="{'bg-primary/5': item.installment_no === schedule()?.rounding_adjusted_installment_no}">
                    <td class="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                      {{ item.installment_no }}
                    </td>
                    <td class="py-3 px-4">
                      <div class="font-bold text-foreground text-xs">{{ item.title }}</div>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          [ngClass]="{
                            'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400': item.installment_type === 'BOOKING_MONEY',
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': item.installment_type === 'DOWN_PAYMENT',
                            'bg-blue-500/10 text-blue-600 dark:text-blue-400': item.installment_type === 'MONTHLY_INSTALLMENT' || item.installment_type === 'QUARTERLY_INSTALLMENT',
                            'bg-purple-500/10 text-purple-600 dark:text-purple-400': item.installment_type === 'CONSTRUCTION_MILESTONE' || item.installment_type === 'STRUCTURAL_COMPLETION',
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400': item.installment_type === 'HANDOVER_POSSESSION' || item.installment_type === 'DEED_REGISTRATION'
                          }">
                          {{ formatInstallmentType(item.installment_type) }}
                        </span>
                        @if (item.percentage) {
                          <span class="text-[10px] text-muted-foreground">({{ item.percentage }}%)</span>
                        }
                      </div>
                    </td>
                    <td class="py-3 px-3">
                      <div class="font-mono text-xs font-semibold text-foreground">{{ item.due_date | date:'dd MMM yyyy' }}</div>
                      @if (item.milestone_trigger) {
                        <div class="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <svg class="w-3 h-3 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                          </svg>
                          {{ item.milestone_trigger }}
                        </div>
                      }
                    </td>
                    <td class="py-3 px-3 text-muted-foreground font-mono">
                      {{ item.grace_period_days }}d
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold text-foreground">
                      ৳{{ formatCurrency(item.payable_amount) }}
                    </td>
                    <td class="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      ৳{{ formatCurrency(item.paid_amount || 0) }}
                    </td>
                    <td class="py-3 px-3 text-right font-mono font-bold" [ngClass]="item.payable_amount - (item.paid_amount || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'">
                      ৳{{ formatCurrency(item.payable_amount - (item.paid_amount || 0)) }}
                    </td>
                    <td class="py-3 px-3 text-center">
                      @if (item.invoice_number) {
                        <div class="font-mono text-[11px] font-bold text-primary">{{ item.invoice_number }}</div>
                        <div class="text-[10px] text-muted-foreground">{{ item.invoice_date | date:'dd MMM yyyy' }}</div>
                      } @else {
                        <span class="text-[11px] text-muted-foreground italic">Not Invoiced</span>
                      }
                    </td>
                    <td class="py-3 px-3 text-center">
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        [ngClass]="{
                          'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20': item.status === 'PAID',
                          'bg-blue-500/10 text-blue-600 border border-blue-500/20': item.status === 'INVOICED',
                          'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20': item.status === 'PARTIALLY_PAID',
                          'bg-rose-500/10 text-rose-600 border border-rose-500/20': item.status === 'OVERDUE',
                          'bg-secondary text-muted-foreground border border-border': item.status === 'SCHEDULED' || item.status === 'UPCOMING'
                        }">
                        {{ item.status }}
                      </span>
                    </td>
                    <td class="py-3 px-3 text-center">
                      @if (!item.invoice_number && item.status !== 'PAID') {
                        <button
                          (click)="openInvoiceModal(item)"
                          class="px-2.5 py-1 text-[11px] rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 font-medium transition-colors"
                          title="Generate Official Contract Invoice"
                        >
                          Generate Invoice
                        </button>
                      } @else {
                        <span class="text-[11px] text-muted-foreground">Ready</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-card>
      }
    </div>

    <!-- Generate Invoice Modal -->
    @if (selectedInstallmentForInvoice()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div class="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 flex flex-col gap-5">
          <div class="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 class="text-base font-bold text-foreground">Generate Installment Invoice</h3>
              <p class="text-xs text-muted-foreground">Spec 5.7 Commercial Obligation Billing</p>
            </div>
            <button (click)="closeInvoiceModal()" class="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-3 bg-secondary/50 rounded-xl border border-border text-xs space-y-1">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Installment:</span>
              <strong class="text-foreground">#{{ selectedInstallmentForInvoice()?.installment_no }} - {{ selectedInstallmentForInvoice()?.title }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Payable Amount:</span>
              <strong class="text-primary font-mono font-bold">৳{{ formatCurrency(selectedInstallmentForInvoice()?.payable_amount || 0) }}</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Contract Due Date:</span>
              <span class="text-foreground font-mono">{{ selectedInstallmentForInvoice()?.due_date | date:'dd MMM yyyy' }}</span>
            </div>
          </div>

          <form [formGroup]="invoiceForm" (ngSubmit)="submitInvoice()" class="flex flex-col gap-4">
            <app-custom-input
              label="Invoice Date"
              type="date"
              [control]="invoiceForm.get('invoice_date')"
              helperText="Date of contractual billing issue"
            />

            <app-custom-input
              label="Payment Due Date"
              type="date"
              [control]="invoiceForm.get('due_date')"
              helperText="Final date before overdue grace calculations"
            />

            <app-custom-textarea
              label="Invoice Notes"
              [control]="invoiceForm.get('notes')"
              placeholder="e.g. Standard monthly installment invoice dispatched via client portal & SMS"
              [rows]="2"
            />

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <app-custom-button variant="outline" size="sm" (click)="closeInvoiceModal()" type="button">
                Cancel
              </app-custom-button>
              <app-custom-button variant="primary" size="sm" type="submit" [loading]="isSubmittingInvoice()">
                Confirm & Issue Invoice
              </app-custom-button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class ScheduleDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private installmentService = inject(InstallmentService);
  private fb = inject(FormBuilder);

  schedule = signal<BookingInstallmentSchedule | null>(null);
  isLoading = signal<boolean>(true);
  isExporting = signal<boolean>(false);
  actionMessage = signal<string>('');

  // Invoice Modal
  selectedInstallmentForInvoice = signal<CustomerInstallment | null>(null);
  isSubmittingInvoice = signal<boolean>(false);
  invoiceForm: FormGroup = this.fb.group({
    invoice_date: [new Date().toISOString().substring(0, 10), Validators.required],
    due_date: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadScheduleDetails(Number(id));
      }
    });
  }

  loadScheduleDetails(scheduleId: number): void {
    this.isLoading.set(true);
    this.installmentService.getMasterScheduleDetails(scheduleId).subscribe({
      next: (res) => {
        this.schedule.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load installment schedule details:', err);
        this.isLoading.set(false);
      }
    });
  }

  exportPdf(): void {
    const s = this.schedule();
    if (!s) return;
    this.isExporting.set(true);
    this.installmentService.exportSchedulePdf(s.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Schedule_${s.schedule_code}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExporting.set(false);
      },
      error: (err) => {
        console.error('Failed to export schedule PDF:', err);
        this.isExporting.set(false);
        this.actionMessage.set('Failed to generate PDF. Please try again.');
      }
    });
  }

  openInvoiceModal(item: CustomerInstallment): void {
    this.selectedInstallmentForInvoice.set(item);
    this.invoiceForm.patchValue({
      invoice_date: new Date().toISOString().substring(0, 10),
      due_date: item.due_date || new Date().toISOString().substring(0, 10),
      notes: `Invoice issued for ${item.title}`
    });
  }

  closeInvoiceModal(): void {
    this.selectedInstallmentForInvoice.set(null);
    this.invoiceForm.reset();
  }

  submitInvoice(): void {
    if (this.invoiceForm.invalid) return;
    const inst = this.selectedInstallmentForInvoice();
    if (!inst) return;

    this.isSubmittingInvoice.set(true);
    this.installmentService.generateInstallmentInvoice(inst.id, this.invoiceForm.value).subscribe({
      next: (res) => {
        this.isSubmittingInvoice.set(false);
        this.actionMessage.set(`Invoice ${res.invoice_number} successfully issued for installment #${inst.installment_no}!`);
        this.closeInvoiceModal();
        if (this.schedule()) {
          this.loadScheduleDetails(this.schedule()!.id);
        }
      },
      error: (err) => {
        console.error('Failed to generate installment invoice:', err);
        this.isSubmittingInvoice.set(false);
        alert(err.error?.detail || 'Failed to issue invoice.');
      }
    });
  }

  formatPlanType(type?: string): string {
    switch (type) {
      case 'MONTHLY_EQUAL': return 'Monthly Equal Installments';
      case 'QUARTERLY_EQUAL': return 'Quarterly Equal Installments';
      case 'CONSTRUCTION_MILESTONES': return 'Construction Milestone-Based';
      case 'SEMI_ANNUAL': return 'Semi-Annual Installments';
      case 'CUSTOM_HYBRID': return 'Custom Contractual Hybrid';
      default: return type || 'Installment';
    }
  }

  formatInstallmentType(type?: string): string {
    switch (type) {
      case 'BOOKING_MONEY': return 'Booking Money';
      case 'DOWN_PAYMENT': return 'Down Payment';
      case 'MONTHLY_INSTALLMENT': return 'Monthly Installment';
      case 'QUARTERLY_INSTALLMENT': return 'Quarterly Installment';
      case 'CONSTRUCTION_MILESTONE': return 'Construction Milestone';
      case 'STRUCTURAL_COMPLETION': return 'Structural Completion';
      case 'FINISHING_STAGE': return 'Finishing Stage';
      case 'DEED_REGISTRATION': return 'Deed Registration';
      case 'HANDOVER_POSSESSION': return 'Final Handover';
      case 'OTHER_CHARGES': return 'Contractual Charge';
      default: return type || 'Payment';
    }
  }

  formatCurrency(num: number): string {
    return Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
