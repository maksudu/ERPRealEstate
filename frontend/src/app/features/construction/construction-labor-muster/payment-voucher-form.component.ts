import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor, SubcontractorPayment, LaborWorker, WorkOrder } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-payment-voucher-form',
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
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      <!-- Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/labor-muster"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Payments & Payroll"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                [ngClass]="paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'">
                {{ paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL' ? 'Direct Labor Payroll' : 'Subcontractor Measurement Invoice' }}
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Voucher #' + voucherId() : 'New Payment Certificate' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Review & Certify Payment Voucher' : 'Issue Subcontractor Payment / Direct Payroll' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/labor-muster"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="paymentForm.invalid || isSaving()"
            (clicked)="saveVoucher()"
          >
            <span class="flex items-center gap-2">
              <i class="ri-check-double-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line animate-spin" *ngIf="isSaving()"></i>
              {{ isSaving() ? 'Processing...' : (isEditMode() ? 'Update & Certify Voucher' : 'Generate Payment Voucher') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Compliance Notice Banner -->
      <div class="p-4 rounded-xl border text-xs flex items-center justify-between gap-4"
        [ngClass]="paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 text-blue-800 dark:text-blue-200' : 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 text-purple-800 dark:text-purple-200'">
        <div class="flex items-center gap-2.5">
          <i class="ri-information-line text-base"></i>
          <div>
            <strong class="font-semibold">{{ paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL' ? 'Direct Employment Payroll' : 'Subcontractor Statutory Compliance' }}:</strong>
            {{ paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL' ? 'Direct company workers are exempt from contractor TDS/VDS withholdings. Gross amount equals certified net wage disbursement.' : 'Standard 5.0% Retention, 5.0% TDS (Sec 52), and 7.5% VDS are deducted automatically from certified payable amounts.' }}
          </div>
        </div>
        <span class="font-mono text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-background/50 border border-border">
          {{ paymentForm.get('payment_type')?.value }}
        </span>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Payment Certificate & Deduction Calculation"
        subtitle="Validate attendance records, measured work, advance recoveries, and statutory withholdings"
      >
        <form [formGroup]="paymentForm" class="flex flex-col gap-6">
          <!-- Row 1: Type, Project, Period -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Payment / Voucher Classification *"
              categoryCode="SUBCON_PAYMENT_TYPE"
              formControlName="payment_type"
              [allowCreateNew]="false"
              placeholder="Select classification..."
              [required]="true"
              (valueChange)="onPaymentTypeChanged()"
            ></app-searchable-select>

            <app-custom-input
              label="Payment Certificate Voucher Number *"
              placeholder="e.g. PV-2026-0042"
              formControlName="voucher_number"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>
          </div>

          <!-- Row 2: Payee (Contractor vs Worker) & Work Order -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              *ngIf="paymentForm.get('payment_type')?.value === 'CONTRACTOR_INVOICE'"
              label="Trade Subcontractor *"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              *ngIf="paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL'"
              label="Direct Employee / Laborer *"
              [options]="workerOptions"
              formControlName="worker_id"
              [allowCreateNew]="false"
              placeholder="Select individual worker..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Linked Work Order (Contract Ref)"
              [options]="workOrderOptions"
              formControlName="work_order_id"
              [allowCreateNew]="false"
              placeholder="Optional work order..."
            ></app-searchable-select>

            <div class="grid grid-cols-2 gap-2">
              <app-custom-input
                label="Period From *"
                type="date"
                formControlName="period_start_date"
                [required]="true"
              ></app-custom-input>
              <app-custom-input
                label="Period To *"
                type="date"
                formControlName="period_end_date"
                [required]="true"
              ></app-custom-input>
            </div>
          </div>

          <!-- Section: Measured Work & Attendance Wages -->
          <div class="p-5 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              1. Measured Work & Verified Mandays
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Verified Attendance Mandays"
                type="number"
                placeholder="e.g. 26.0"
                formControlName="verified_attendance_mandays"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="Attendance Wages Amount (BDT)"
                type="number"
                placeholder="e.g. 22100"
                formControlName="attendance_wages_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="Measured Work / Task Amount (BDT)"
                type="number"
                placeholder="e.g. 65000"
                formControlName="measured_work_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>
            </div>
          </div>

          <!-- Section: Contractual Deductions & Statutory Taxes -->
          <div class="p-5 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Contractual Recoveries & Tax Withholdings
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <app-custom-input
                label="Advance Recovery (BDT)"
                type="number"
                placeholder="0"
                formControlName="advance_recovery_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="Retention Deduction (5.0%)"
                type="number"
                placeholder="0"
                formControlName="retention_deduction_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="TDS Withholding (5.0% Sec 52)"
                type="number"
                placeholder="0"
                formControlName="tds_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="VDS Withholding (7.5% VAT)"
                type="number"
                placeholder="0"
                formControlName="vds_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <app-custom-input
                label="Other Approved Deductions (Penalties / Store Issue)"
                type="number"
                placeholder="0"
                formControlName="other_deductions_amount"
                (change)="recalculateAmounts()"
              ></app-custom-input>

              <app-custom-input
                label="Deduction Notes / Justification"
                placeholder="Reason for advance or site penalties..."
                formControlName="deduction_notes"
              ></app-custom-input>
            </div>
          </div>

          <!-- Section: Net Certified Payable Summary Card -->
          <div class="p-5 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span class="text-xs font-semibold uppercase text-muted-foreground">Certified Payable Computation</span>
              <div class="text-xs text-muted-foreground mt-0.5">
                Gross: ৳{{ grossPayableDisplay() | number:'1.2-2' }} &bull; Total Deductions: ৳{{ totalDeductionsDisplay() | number:'1.2-2' }}
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs text-primary font-medium block">Net Certified Amount</span>
              <span class="text-2xl sm:text-3xl font-extrabold font-mono text-primary">
                ৳{{ netCertifiedPayableDisplay() | number:'1.2-2' }}
              </span>
            </div>
          </div>

          <!-- Section: Certification Status & Payment Disbursement -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Certification Status *"
              [options]="statusOptions"
              formControlName="certification_status"
              [allowCreateNew]="false"
              placeholder="Select status..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Certifying Officer Name *"
              placeholder="e.g. Engr. Tanvir Ahmed (QS)"
              formControlName="certified_by_name"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Disbursement Method"
              [options]="paymentMethodOptions"
              formControlName="payment_method"
              [allowCreateNew]="false"
              placeholder="Select method..."
            ></app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Payment / Bank Cheque Reference"
              placeholder="e.g. CHQ-991823 / BEFTN-2026-99"
              formControlName="payment_reference"
            ></app-custom-input>

            <app-custom-input
              label="Disbursement Date"
              type="date"
              formControlName="payment_date"
            ></app-custom-input>
          </div>

          <app-custom-textarea
            label="Certification Remarks / Statement Notes"
            placeholder="Notes regarding measurement sheets or site verification approvals..."
            formControlName="remarks"
            [rows]="3"
          ></app-custom-textarea>
        </form>
      </app-card-container>
    </div>
  `
})
export class PaymentVoucherFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  voucherId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];
  workerOptions: { value: any; label: string }[] = [];
  workOrderOptions: { value: any; label: string }[] = [];

  statusOptions = [
    { value: 'DRAFT', label: 'Draft Pending Verification' },
    { value: 'CERTIFIED', label: 'Certified by Project QS / PM' },
    { value: 'ACCOUNTS_POSTED', label: 'Accounts Approved' },
    { value: 'PAID', label: 'Paid & Disbursed' },
    { value: 'VOID', label: 'Void / Cancelled' }
  ];

  paymentMethodOptions = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer (BEFTN/RTGS)' },
    { value: 'CHEQUE', label: 'Account Payee Cheque' },
    { value: 'CASH', label: 'Petty Cash / Site Imprest' },
    { value: 'MOBILE_BANKING', label: 'Mobile Banking (bKash/Nagad)' }
  ];

  grossPayableDisplay = signal<number>(0);
  totalDeductionsDisplay = signal<number>(0);
  netCertifiedPayableDisplay = signal<number>(0);

  paymentForm: FormGroup = this.fb.group({
    voucher_number: ['', Validators.required],
    payment_type: ['CONTRACTOR_INVOICE', Validators.required],
    project_id: [null, Validators.required],
    contractor_id: [null],
    worker_id: [null],
    work_order_id: [null],
    period_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    period_end_date: [new Date().toISOString().split('T')[0], Validators.required],
    verified_attendance_mandays: [0],
    attendance_wages_amount: [0],
    measured_work_amount: [0],
    advance_recovery_amount: [0],
    retention_percentage: [5.0],
    retention_deduction_amount: [0],
    other_deductions_amount: [0],
    deduction_notes: [''],
    tds_rate: [5.0],
    tds_amount: [0],
    vds_rate: [7.5],
    vds_amount: [0],
    certification_status: ['CERTIFIED', Validators.required],
    certified_by_name: ['Engr. Tanvir Ahmed (QS)', Validators.required],
    payment_method: ['BANK_TRANSFER'],
    payment_reference: [''],
    payment_date: [new Date().toISOString().split('T')[0]],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadContractors();
    this.loadWorkers();
    this.loadWorkOrders();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.voucherId.set(Number(id));
      this.isEditMode.set(true);
      this.loadVoucherDetails(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.paymentForm.patchValue({
        voucher_number: `PV-2026-${rand}`
      });
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({ value: p.id, label: p.project_name }));
        if (projs.length && !this.paymentForm.get('project_id')?.value) {
          this.paymentForm.patchValue({ project_id: projs[0].id });
        }
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (contractors) => {
        this.contractorOptions = contractors.map(c => ({
          value: c.id,
          label: `${c.company_name} (${c.contractor_code})`
        }));
      }
    });
  }

  loadWorkers(): void {
    this.constructionService.getWorkersPaged({ limit: 100 }).subscribe({
      next: (res) => {
        this.workerOptions = res.items.map(w => ({
          value: w.id,
          label: `${w.worker_name} (${w.worker_code} - ${w.trade_category})`
        }));
      }
    });
  }

  loadWorkOrders(): void {
    this.constructionService.getWorkOrdersPaged({ limit: 100 }).subscribe({
      next: (res) => {
        this.workOrderOptions = [
          { value: null, label: 'None (Direct Trade Agreement)' },
          ...res.items.map(wo => ({
            value: wo.id,
            label: `${wo.work_order_no} - ${wo.contract_title || 'Work Order'}`
          }))
        ];
      }
    });
  }

  loadVoucherDetails(id: number): void {
    this.constructionService.getSubcontractorPaymentById(id).subscribe({
      next: (v) => {
        this.paymentForm.patchValue({
          voucher_number: v.voucher_number,
          payment_type: v.payment_type,
          project_id: v.project_id,
          contractor_id: v.contractor_id,
          worker_id: v.worker_id,
          work_order_id: v.work_order_id,
          period_start_date: v.period_start_date,
          period_end_date: v.period_end_date,
          verified_attendance_mandays: v.verified_attendance_mandays,
          attendance_wages_amount: v.attendance_wages_amount,
          measured_work_amount: v.measured_work_amount,
          advance_recovery_amount: v.advance_recovery_amount,
          retention_percentage: v.retention_percentage,
          retention_deduction_amount: v.retention_deduction_amount,
          other_deductions_amount: v.other_deductions_amount,
          deduction_notes: v.deduction_notes || '',
          tds_rate: v.tds_rate,
          tds_amount: v.tds_amount,
          vds_rate: v.vds_rate,
          vds_amount: v.vds_amount,
          certification_status: v.certification_status,
          certified_by_name: v.certified_by_name || 'Site QS',
          payment_method: v.payment_method || 'BANK_TRANSFER',
          payment_reference: v.payment_reference || '',
          payment_date: v.payment_date || '',
          remarks: v.remarks || ''
        });
        this.recalculateAmounts();
      }
    });
  }

  onPaymentTypeChanged(): void {
    const isDirect = this.paymentForm.get('payment_type')?.value === 'DIRECT_PAYROLL';
    if (isDirect) {
      this.paymentForm.patchValue({
        retention_percentage: 0,
        retention_deduction_amount: 0,
        tds_rate: 0,
        tds_amount: 0,
        vds_rate: 0,
        vds_amount: 0
      });
    } else {
      this.paymentForm.patchValue({
        retention_percentage: 5.0,
        tds_rate: 5.0,
        vds_rate: 7.5
      });
    }
    this.recalculateAmounts();
  }

  recalculateAmounts(): void {
    const f = this.paymentForm.value;
    const attWages = Number(f.attendance_wages_amount) || 0;
    const measuredWork = Number(f.measured_work_amount) || 0;
    const gross = attWages + measuredWork;
    this.grossPayableDisplay.set(gross);

    const isDirect = f.payment_type === 'DIRECT_PAYROLL';
    let retention = 0;
    let tds = 0;
    let vds = 0;

    if (!isDirect) {
      retention = Math.round(gross * (Number(f.retention_percentage || 5.0) / 100));
      tds = Math.round(gross * (Number(f.tds_rate || 5.0) / 100));
      vds = Math.round(gross * (Number(f.vds_rate || 7.5) / 100));
    }

    const advance = Number(f.advance_recovery_amount) || 0;
    const other = Number(f.other_deductions_amount) || 0;
    const totalDeductions = retention + advance + other + tds + vds;
    this.totalDeductionsDisplay.set(totalDeductions);

    const net = Math.max(0, gross - totalDeductions);
    this.netCertifiedPayableDisplay.set(net);

    this.paymentForm.patchValue({
      retention_deduction_amount: retention,
      tds_amount: tds,
      vds_amount: vds
    }, { emitEvent: false });
  }

  saveVoucher(): void {
    if (this.paymentForm.invalid) return;

    this.isSaving.set(true);
    const f = this.paymentForm.value;
    const gross = (Number(f.attendance_wages_amount) || 0) + (Number(f.measured_work_amount) || 0);
    const totalDed = (Number(f.advance_recovery_amount) || 0) +
                     (Number(f.retention_deduction_amount) || 0) +
                     (Number(f.other_deductions_amount) || 0) +
                     (Number(f.tds_amount) || 0) +
                     (Number(f.vds_amount) || 0);
    const net = Math.max(0, gross - totalDed);

    const payload: Partial<SubcontractorPayment> = {
      voucher_number: f.voucher_number,
      payment_type: f.payment_type,
      project_id: Number(f.project_id),
      contractor_id: f.contractor_id ? Number(f.contractor_id) : null,
      worker_id: f.worker_id ? Number(f.worker_id) : null,
      work_order_id: f.work_order_id ? Number(f.work_order_id) : null,
      period_start_date: f.period_start_date,
      period_end_date: f.period_end_date,
      verified_attendance_mandays: Number(f.verified_attendance_mandays) || 0,
      attendance_wages_amount: Number(f.attendance_wages_amount) || 0,
      measured_work_amount: Number(f.measured_work_amount) || 0,
      gross_payable_amount: gross,
      advance_recovery_amount: Number(f.advance_recovery_amount) || 0,
      retention_percentage: Number(f.retention_percentage) || 0,
      retention_deduction_amount: Number(f.retention_deduction_amount) || 0,
      other_deductions_amount: Number(f.other_deductions_amount) || 0,
      deduction_notes: f.deduction_notes || null,
      tax_compliance_type: f.payment_type === 'DIRECT_PAYROLL' ? 'DIRECT_PAYROLL_TAX_FREE' : 'WITHHOLDING_TDS_VDS',
      tds_rate: Number(f.tds_rate) || 0,
      tds_amount: Number(f.tds_amount) || 0,
      vds_rate: Number(f.vds_rate) || 0,
      vds_amount: Number(f.vds_amount) || 0,
      net_certified_payable: net,
      certified_by_name: f.certified_by_name,
      certification_status: f.certification_status,
      payment_method: f.payment_method,
      payment_reference: f.payment_reference || null,
      payment_date: f.payment_date || null,
      remarks: f.remarks || null
    };

    if (this.isEditMode() && this.voucherId()) {
      this.constructionService.certifySubcontractorPayment(this.voucherId()!, {
        certification_status: f.certification_status,
        certified_by_name: f.certified_by_name,
        payment_method: f.payment_method,
        payment_reference: f.payment_reference,
        payment_date: f.payment_date
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/labor-muster'], { queryParams: { tab: 'PAYMENTS' } });
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createSubcontractorPayment(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/labor-muster'], { queryParams: { tab: 'PAYMENTS' } });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
