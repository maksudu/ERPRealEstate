import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectFinancialPerformance } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-financial-form',
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
    <div class="space-y-6">
      <!-- Top Navigation & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <a
            routerLink="/projects/financial-performance"
            class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Back to Financial Performance"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Submodule 2.13
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Record #' + recordId() : 'New Project P&L Period' }}
              </span>
            </div>
            <h1 class="text-lg font-bold text-foreground font-display mt-0.5">
              {{ isEditMode() ? 'Edit Project-wise Profit & Loss Performance' : 'Record Project-wise Profit & Loss Financial Statement' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a
            routerLink="/projects/financial-performance"
            class="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveFinancialRecord()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update P&L Statement' : 'Save P&L Statement' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Critical Accounting Distinction Notice -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2.5">
        <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong>Integrated Real Estate Accounting Principles (IFRS 15 & Accrual Rules):</strong>
          Customer advances are <em>not automatically recognized as revenue</em> until performance obligations (POC) are certified. Similarly, contractor cash payments are <em>not automatically equivalent to construction expense</em>; expenses reflect certified work done (IPC) and accrued material consumption.
        </div>
      </div>

      <!-- Live Calculated P&L Summary Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 rounded-xl bg-card border border-border">
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Recognized Revenue</span>
          <span class="text-sm font-bold font-mono text-foreground">৳{{ (calculatedRev() / 10000000) | number:'1.2-2' }} Cr</span>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Cost of Sales</span>
          <span class="text-sm font-bold font-mono text-amber-600">৳{{ (calculatedCostOfSales() / 10000000) | number:'1.2-2' }} Cr</span>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Gross Profit</span>
          <span class="text-sm font-bold font-mono text-emerald-600">৳{{ (calculatedGrossProfit() / 10000000) | number:'1.2-2' }} Cr</span>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Gross Margin %</span>
          <span class="text-sm font-bold font-mono text-emerald-600">{{ calculatedGrossMargin() | number:'1.1-1' }}%</span>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Operating Overheads</span>
          <span class="text-sm font-bold font-mono text-muted-foreground">৳{{ (calculatedOverheads() / 10000000) | number:'1.2-2' }} Cr</span>
        </div>
        <div>
          <span class="text-[10px] uppercase font-bold text-muted-foreground block">Profit Before Tax (PBT)</span>
          <span class="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">৳{{ (calculatedPBT() / 10000000) | number:'1.2-2' }} Cr</span>
        </div>
      </div>

      <!-- Main Form -->
      <form [formGroup]="form" class="space-y-6">
        <!-- Section 1: Period & Cost Center Master -->
        <app-card-container
          title="1. Project, Period & General Ledger Cost Center"
          subtitle="Define project cost center, reporting fiscal year, and accounting period"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="Development Project"
              [options]="projectOptions()"
              [searchable]="true"
              formControlName="project_id"
              [required]="true"
              (ngModelChange)="onProjectSelected($event)"
            ></app-searchable-select>

            <app-custom-input
              label="GL Cost Center Code"
              formControlName="cost_center_code"
              placeholder="e.g. CC-PRJ-2026-001"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Fiscal Year"
              [options]="fiscalYearOptions"
              formControlName="fiscal_year"
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Reporting Period Type"
              [options]="periodTypeOptions"
              formControlName="period_type"
              [required]="true"
            ></app-searchable-select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-input
              label="Statement Period Title"
              formControlName="period_name"
              placeholder="e.g. Cumulative Lifecycle to Date / Q1 2026"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Accounting Audit Status"
              [options]="statusOptions"
              formControlName="status"
              [required]="true"
            ></app-searchable-select>
          </div>
        </app-card-container>

        <!-- Section 2: Recognized Revenue vs Cash Collections -->
        <app-card-container
          title="2. Revenue Recognition (IFRS 15) vs Customer Cash Collections"
          subtitle="Distinguish POC-recognized revenue from buyer advances and unearned revenue balances"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Recognized Project Revenue (BDT)"
              type="number"
              formControlName="recognized_revenue"
              placeholder="e.g. 500000000 (৳50.00 Cr)"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Customer Advances Collected (BDT)"
              type="number"
              formControlName="customer_advances_collected"
              placeholder="e.g. 580000000 (৳58.00 Cr)"
            ></app-custom-input>

            <app-custom-input
              label="Unearned Revenue / Advance (BDT)"
              type="number"
              formControlName="unearned_revenue"
              placeholder="e.g. 80000000"
            ></app-custom-input>

            <app-custom-input
              label="Customer Receivables Due (BDT)"
              type="number"
              formControlName="receivables_due"
              placeholder="e.g. 15000000"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 3: Cost of Sales (Direct Costs) -->
        <app-card-container
          title="3. Cost of Sales & Direct Incurred Expenses"
          subtitle="Land cost allocated to sold units, accrued civil construction, and consultant fees"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-custom-input
              label="Land Cost Allocated to Sold Units (BDT)"
              type="number"
              formControlName="land_cost_allocated"
              placeholder="e.g. 100000000 (৳10.00 Cr)"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Construction & Materials Incurred (BDT)"
              type="number"
              formControlName="construction_materials_cost"
              placeholder="e.g. 180000000 (৳18.00 Cr)"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Consultants & Direct Professional Costs (BDT)"
              type="number"
              formControlName="consultants_direct_cost"
              placeholder="e.g. 30000000 (৳3.00 Cr)"
              [required]="true"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 4: Operating Expenses & Financing -->
        <app-card-container
          title="4. Operating Overheads, Financing & Tax"
          subtitle="Allocated administrative & marketing expenses, bank interest (IAS 23), and corporate tax"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Allocated Operating Expenses (BDT)"
              type="number"
              formControlName="allocated_operating_expenses"
              placeholder="e.g. 20000000 (৳2.00 Cr)"
            ></app-custom-input>

            <app-custom-input
              label="Financing Expenses / Interest (BDT)"
              type="number"
              formControlName="financing_expenses"
              placeholder="e.g. 15000000 (৳1.50 Cr)"
            ></app-custom-input>

            <app-custom-input
              label="Bank Project Debt Drawn (BDT)"
              type="number"
              formControlName="bank_loan_drawn"
              placeholder="e.g. 120000000"
            ></app-custom-input>

            <app-custom-input
              label="Outstanding Bank Debt (BDT)"
              type="number"
              formControlName="bank_loan_outstanding"
              placeholder="e.g. 85000000"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 5: Contractor Cash vs Accruals & Forecast (EAC/ETC) -->
        <app-card-container
          title="5. Contractor Billing Accruals vs Cash & Forecast to Complete"
          subtitle="Work certified vs cash disbursed, committed costs, and estimate at completion"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-custom-input
              label="Contractor Cash Disbursements Made (BDT)"
              type="number"
              formControlName="contractor_payments_made"
              placeholder="e.g. 165000000"
            ></app-custom-input>

            <app-custom-input
              label="Contractor Work Done Certified (BDT)"
              type="number"
              formControlName="contractor_work_certified"
              placeholder="e.g. 180000000"
            ></app-custom-input>

            <app-custom-input
              label="Outstanding Retentions & Payable (BDT)"
              type="number"
              formControlName="outstanding_contractor_payable"
              placeholder="e.g. 15000000"
            ></app-custom-input>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <app-custom-input
              label="Committed Cost (POs & Work Orders) (BDT)"
              type="number"
              formControlName="committed_cost"
              placeholder="e.g. 350000000"
            ></app-custom-input>

            <app-custom-input
              label="Forecast Cost to Complete (ETC) (BDT)"
              type="number"
              formControlName="forecast_cost_to_complete_etc"
              placeholder="e.g. 80000000"
            ></app-custom-input>

            <app-custom-input
              label="Original Feasibility Baseline Profit (BDT)"
              type="number"
              formControlName="original_feasibility_profit"
              placeholder="e.g. 140000000"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 6: Joint Venture Sharing (Landowner vs Developer) -->
        <app-card-container
          title="6. Joint Venture Sharing Allocation"
          subtitle="Configure Landowner & Developer revenue and profit sharing percentages"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <app-custom-input
              label="Landowner Sharing Percentage (%)"
              type="number"
              formControlName="landowner_share_pct"
              placeholder="50.00"
            ></app-custom-input>

            <app-custom-input
              label="Developer Sharing Percentage (%)"
              type="number"
              formControlName="developer_share_pct"
              placeholder="50.00"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 7: Audit Sign-off & Disclosures -->
        <app-card-container
          title="7. Accounting Sign-off & Policy Disclosures"
          subtitle="CFO certification, Managing Director approval, and accounting disclosure notes"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-custom-input
              label="Prepared By (CFO / Chief Accountant)"
              formControlName="prepared_by"
              placeholder="e.g. Chief Financial Officer"
            ></app-custom-input>

            <app-custom-input
              label="Approved By (Managing Director)"
              formControlName="approved_by"
              placeholder="e.g. Managing Director"
            ></app-custom-input>

            <app-custom-input
              label="Approval Date"
              type="date"
              formControlName="approval_date"
            ></app-custom-input>
          </div>

          <div class="mt-4">
            <app-custom-textarea
              label="Accounting Notes & Disclosure Remarks"
              formControlName="notes"
              [rows]="3"
              placeholder="Record revenue recognition methodology, percentage of completion (POC) progress benchmarks, and borrowing cost capitalization disclosures..."
            ></app-custom-textarea>
          </div>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <a
            routerLink="/projects/financial-performance"
            class="px-5 py-2.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveFinancialRecord()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update P&L Statement' : 'Save P&L Statement' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class FinancialFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  recordId = signal<number | null>(null);
  saving = signal<boolean>(false);
  projects = signal<Project[]>([]);

  fiscalYearOptions: SelectOption[] = [
    { value: '2025-26', label: 'FY 2025-26' },
    { value: '2024-25', label: 'FY 2024-25' },
    { value: '2026-27', label: 'FY 2026-27' }
  ];

  periodTypeOptions: SelectOption[] = [
    { value: 'CUMULATIVE_TO_DATE', label: 'Cumulative Project Lifecycle to Date' },
    { value: 'ANNUAL', label: 'Annual Financial Statement' },
    { value: 'QUARTERLY', label: 'Quarterly Statement' },
    { value: 'MONTHLY', label: 'Monthly Financial Statement' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'PROVISIONAL', label: 'Provisional / Internal Management Review' },
    { value: 'AUDITED', label: 'Audited & Signed-off by Statutory Auditor' },
    { value: 'FINAL_CLOSURE', label: 'Final Handover Project Closure' }
  ];

  projectOptions = computed<SelectOption[]>(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  form: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    cost_center_code: ['', Validators.required],
    fiscal_year: ['2025-26', Validators.required],
    period_type: ['CUMULATIVE_TO_DATE', Validators.required],
    period_name: ['Cumulative Lifecycle to Date', Validators.required],

    // Revenue
    recognized_revenue: [500000000, [Validators.required, Validators.min(0)]],
    customer_advances_collected: [580000000],
    unearned_revenue: [80000000],
    receivables_due: [15000000],

    // Direct Costs
    land_cost_allocated: [100000000, [Validators.required, Validators.min(0)]],
    construction_materials_cost: [180000000, [Validators.required, Validators.min(0)]],
    consultants_direct_cost: [30000000, [Validators.required, Validators.min(0)]],

    // Overheads & Financing
    allocated_operating_expenses: [20000000],
    financing_expenses: [15000000],
    bank_loan_drawn: [120000000],
    bank_loan_outstanding: [85000000],

    // Contractor Accruals
    contractor_payments_made: [165000000],
    contractor_work_certified: [180000000],
    outstanding_contractor_payable: [15000000],

    // Forecasts
    committed_cost: [350000000],
    forecast_cost_to_complete_etc: [80000000],
    original_feasibility_profit: [140000000],

    // JV
    landowner_share_pct: [50.0],
    developer_share_pct: [50.0],

    status: ['AUDITED', Validators.required],
    prepared_by: ['Chief Financial Officer'],
    approved_by: ['Managing Director'],
    approval_date: [new Date().toISOString().substring(0, 10)],
    notes: ['Verified per IFRS 15 POC revenue recognition and IAS 23 borrowing cost treatment']
  });

  // Dynamic calculated getters for real-time preview
  calculatedRev(): number {
    return Number(this.form.get('recognized_revenue')?.value || 0);
  }

  calculatedCostOfSales(): number {
    const land = Number(this.form.get('land_cost_allocated')?.value || 0);
    const constr = Number(this.form.get('construction_materials_cost')?.value || 0);
    const cons = Number(this.form.get('consultants_direct_cost')?.value || 0);
    return land + constr + cons;
  }

  calculatedGrossProfit(): number {
    return this.calculatedRev() - this.calculatedCostOfSales();
  }

  calculatedGrossMargin(): number {
    const rev = this.calculatedRev();
    return rev > 0 ? (this.calculatedGrossProfit() / rev * 100) : 0;
  }

  calculatedOverheads(): number {
    return Number(this.form.get('allocated_operating_expenses')?.value || 0);
  }

  calculatedPBT(): number {
    const ebit = this.calculatedGrossProfit() - this.calculatedOverheads();
    const fin = Number(this.form.get('financing_expenses')?.value || 0);
    return ebit - fin;
  }

  ngOnInit(): void {
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.recordId.set(Number(id));
      this.loadRecord(Number(id));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data || []);
        if (!this.isEditMode() && data.length > 0 && !this.form.get('project_id')?.value) {
          const first = data[0];
          this.form.patchValue({
            project_id: first.id,
            cost_center_code: first.cost_center_code || `CC-${first.project_code}-2026`,
            period_name: `${first.project_name} — Cumulative Lifecycle to Date`
          });
        }
      }
    });
  }

  onProjectSelected(projectId: any): void {
    const proj = this.projects().find(p => p.id === Number(projectId));
    if (proj && !this.isEditMode()) {
      this.form.patchValue({
        cost_center_code: proj.cost_center_code || `CC-${proj.project_code}-2026`,
        period_name: `${proj.project_name} — Cumulative Lifecycle to Date`
      });
    }
  }

  loadRecord(id: number): void {
    this.projectService.getFinancialPerformanceById(id).subscribe({
      next: (r: ProjectFinancialPerformance) => {
        this.form.patchValue({
          project_id: r.project_id,
          cost_center_code: r.cost_center_code,
          fiscal_year: r.fiscal_year,
          period_type: r.period_type,
          period_name: r.period_name,
          recognized_revenue: r.recognized_revenue,
          customer_advances_collected: r.customer_advances_collected,
          unearned_revenue: r.unearned_revenue,
          receivables_due: r.receivables_due,
          land_cost_allocated: r.land_cost_allocated,
          construction_materials_cost: r.construction_materials_cost,
          consultants_direct_cost: r.consultants_direct_cost,
          allocated_operating_expenses: r.allocated_operating_expenses,
          financing_expenses: r.financing_expenses,
          bank_loan_drawn: r.bank_loan_drawn,
          bank_loan_outstanding: r.bank_loan_outstanding,
          contractor_payments_made: r.contractor_payments_made,
          contractor_work_certified: r.contractor_work_certified,
          outstanding_contractor_payable: r.outstanding_contractor_payable,
          committed_cost: r.committed_cost,
          forecast_cost_to_complete_etc: r.forecast_cost_to_complete_etc,
          original_feasibility_profit: r.original_feasibility_profit,
          landowner_share_pct: r.landowner_share_pct,
          developer_share_pct: r.developer_share_pct,
          status: r.status,
          prepared_by: r.prepared_by || '',
          approved_by: r.approved_by || '',
          approval_date: r.approval_date ? r.approval_date.substring(0, 10) : '',
          notes: r.notes || ''
        });
      }
    });
  }

  saveFinancialRecord(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form.value };
    payload.project_id = Number(payload.project_id);

    if (this.isEditMode() && this.recordId()) {
      this.projectService.updateFinancialPerformance(this.recordId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/financial-performance']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to update financial P&L record.');
        }
      });
    } else {
      this.projectService.createFinancialPerformance(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/financial-performance']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to record financial P&L.');
        }
      });
    }
  }
}
