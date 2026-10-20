import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectProfitability } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-profitability-form',
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
            routerLink="/projects/profitability-roi"
            class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Back to Profitability Matrix"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Forecast #' + forecastId() : 'New ROI Model' }}
              </span>
            </div>
            <h1 class="text-lg font-bold text-foreground font-display mt-0.5">
              {{ isEditMode() ? 'Edit Profitability & ROI Forecast' : 'Create Projected Profitability & ROI Forecast' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a
            routerLink="/projects/profitability-roi"
            class="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveForecast()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Forecast' : 'Save Forecast' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Form Grid -->
      <form [formGroup]="form" class="space-y-6">
        <!-- Section 1: Identification & Project Setup -->
        <app-card-container
          title="Project Setup & Version Identification"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="Select Development Project"
              [options]="projectOptions()"
              [searchable]="true"
              formControlName="project_id"
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Forecast Model Code"
              formControlName="forecast_code"
              placeholder="e.g. PRJ-2026-PRF-01"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Version Label / Scenario Name"
              formControlName="version_label"
              placeholder="e.g. Base Case Financial Model V1.0"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Calculation Date"
              type="date"
              formControlName="calculation_date"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Forecast Status"
              [options]="statusOptions"
              formControlName="status"
            ></app-searchable-select>

            <app-searchable-select
              label="Defined Investment Base Type"
              [options]="investmentBaseOptions"
              formControlName="defined_investment_base_type"
            ></app-searchable-select>

            <app-custom-input
              label="Defined Investment Base (BDT)"
              type="number"
              formControlName="defined_investment_base_bdt"
              placeholder="Explicit equity or total investment"
            ></app-custom-input>

            <app-custom-input
              label="Revised Target Handover Date"
              type="date"
              formControlName="revised_completion_date"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 2: Revenue Estimates by Inventory & Joint Venture Share -->
        <app-card-container
          title="2. Revenue Estimates by Inventory Category & JV Split"
          subtitle="Estimated revenue by apartment, shop, office, parking spaces, and JV landowner/developer ratios"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <app-custom-input
              label="Apartment Units Revenue (BDT)"
              type="number"
              formControlName="apartment_revenue_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Commercial Shops Revenue (BDT)"
              type="number"
              formControlName="shop_revenue_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Corporate Office Revenue (BDT)"
              type="number"
              formControlName="office_revenue_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Parking Spaces Revenue (BDT)"
              type="number"
              formControlName="parking_revenue_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Other Saleable Revenue (BDT)"
              type="number"
              formControlName="other_revenue_est"
              (input)="recalcTotals()"
            ></app-custom-input>
          </div>

          <!-- Total Revenue Summary Banner -->
          <div class="mt-4 p-4 rounded-xl bg-secondary/50 border border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p class="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Estimated Gross Revenue</p>
              <p class="text-2xl font-bold font-mono text-emerald-500">৳{{ computedTotalRevenue() | number:'1.2-2' }}</p>
            </div>

            <!-- JV Split Inputs -->
            <div class="flex items-center gap-3">
              <div class="w-28">
                <app-custom-input
                  label="JV Ratio"
                  formControlName="jv_sharing_ratio"
                  placeholder="50:50"
                ></app-custom-input>
              </div>
              <div class="w-32">
                <app-custom-input
                  label="Developer %"
                  type="number"
                  formControlName="developer_share_pct"
                  (input)="recalcTotals()"
                ></app-custom-input>
              </div>
              <div class="w-32">
                <app-custom-input
                  label="Landowner %"
                  type="number"
                  formControlName="landowner_share_pct"
                  (input)="recalcTotals()"
                ></app-custom-input>
              </div>
            </div>

            <div class="text-right">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Developer Share Value</p>
              <p class="text-lg font-bold font-mono text-foreground">৳{{ computedDevRevenue() | number:'1.2-2' }}</p>
            </div>
          </div>
        </app-card-container>

        <!-- Section 3: Detailed Cost Structure -->
        <app-card-container
          title="3. Project Cost Breakdown & Commitments"
          subtitle="Construction, consultant, marketing, admin overhead, and financing cost estimates"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <app-custom-input
              label="Civil & Structural Construction (BDT)"
              type="number"
              formControlName="construction_cost_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Architectural & Consultant Fees (BDT)"
              type="number"
              formControlName="consultant_fee_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Marketing, Advertising & Brokerage (BDT)"
              type="number"
              formControlName="marketing_sales_cost_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Administrative & Corporate Overhead (BDT)"
              type="number"
              formControlName="admin_overhead_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Bank Financing & Interest Charges (BDT)"
              type="number"
              formControlName="financing_interest_cost_est"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Contingency & Unforeseen Reserve (BDT)"
              type="number"
              formControlName="contingency_cost_est"
              (input)="recalcTotals()"
            ></app-custom-input>
          </div>

          <!-- Total Cost Summary Banner -->
          <div class="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p class="text-xs text-amber-500 font-semibold uppercase tracking-wider">Total Estimated Project Cost</p>
              <p class="text-2xl font-bold font-mono text-amber-500">৳{{ computedTotalCost() | number:'1.2-2' }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Estimated Net Project Profit</p>
              <p class="text-2xl font-bold font-mono text-emerald-500">৳{{ computedNetProfit() | number:'1.2-2' }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-muted-foreground uppercase font-semibold">Estimated Developer ROI</p>
              <p class="text-2xl font-bold font-mono text-purple-500">{{ computedRoi() | number:'1.2-2' }}%</p>
            </div>
          </div>
        </app-card-container>

        <!-- Section 4: Actual versus Estimated (Realized Tracking) -->
        <app-card-container
          title="4. Actual vs Estimated Tracking (Committed Costs & Posted Expenses)"
          subtitle="Forecast updates based on actual recognized revenue, posted expenses, and committed procurement"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Recognized Revenue to Date (BDT)"
              type="number"
              formControlName="recognized_revenue"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Recognized Expenses to Date (BDT)"
              type="number"
              formControlName="recognized_project_expenses"
              (input)="recalcTotals()"
            ></app-custom-input>

            <app-custom-input
              label="Committed Procurement Orders (BDT)"
              type="number"
              formControlName="committed_costs"
            ></app-custom-input>

            <app-custom-input
              label="Posted Accounts Expenses (BDT)"
              type="number"
              formControlName="posted_expenses"
            ></app-custom-input>
          </div>

          <div class="mt-4 p-4 rounded-xl bg-secondary/40 border border-border grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p class="text-xs text-muted-foreground">Actual Recognized Profit</p>
              <p class="text-lg font-bold font-mono text-foreground">৳{{ computedActualProfit() | number:'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Actual Realized ROI</p>
              <p class="text-lg font-bold font-mono text-purple-500">{{ computedActualRoi() | number:'1.2-2' }}%</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Estimated Break-Even Revenue</p>
              <p class="text-lg font-bold font-mono text-amber-500">৳{{ computedBreakeven() | number:'1.2-2' }}</p>
            </div>
          </div>
        </app-card-container>

        <!-- Section 5: Scenario Modeling Sandbox -->
        <app-card-container
          title="5. Dynamic Scenario Stress-Testing"
          subtitle="Model revenue price increases (+/-), sales delay cash-flow drags, and cost overrun shocks"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <app-custom-input
              label="Price Increase / (Discount) (%)"
              type="number"
              formControlName="scenario_price_increase_pct"
              placeholder="e.g. 5 for +5%, -3 for -3%"
              (input)="runSimulation()"
            ></app-custom-input>

            <app-custom-input
              label="Sales / Construction Delay (Months)"
              type="number"
              formControlName="scenario_sales_delay_months"
              placeholder="e.g. 3"
              (input)="runSimulation()"
            ></app-custom-input>

            <app-custom-input
              label="Material & Labor Cost Overrun (%)"
              type="number"
              formControlName="scenario_cost_overrun_pct"
              placeholder="e.g. 5"
              (input)="runSimulation()"
            ></app-custom-input>
          </div>

          <!-- Stressed Simulation Results Box -->
          <div class="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs text-muted-foreground uppercase font-semibold">Simulated Stressed Revenue</p>
              <p class="text-xl font-bold font-mono text-foreground">৳{{ simRevenue() | number:'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground uppercase font-semibold">Simulated Stressed Cost</p>
              <p class="text-xl font-bold font-mono text-amber-500">৳{{ simCost() | number:'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground uppercase font-semibold">Simulated Net Profit</p>
              <p class="text-xl font-bold font-mono text-emerald-500">৳{{ simProfit() | number:'1.2-2' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted-foreground uppercase font-semibold">Simulated Stressed ROI</p>
              <p class="text-xl font-bold font-mono text-purple-500">{{ simRoi() | number:'1.2-2' }}%</p>
            </div>
          </div>
        </app-card-container>

        <!-- Section 6: Remarks -->
        <app-card-container
          title="6. Model Notes & Board Recommendations"
          subtitle="Document key feasibility assumptions, land purchase contingencies, and financing conditions"
        >
          <app-custom-textarea
            label="Financial Notes & Remarks"
            formControlName="remarks"
            [rows]="3"
            placeholder="Document critical commercial terms, banking interest rates, and board review notes..."
          ></app-custom-textarea>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <a
            routerLink="/projects/profitability-roi"
            class="px-5 py-2.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveForecast()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Profitability Forecast' : 'Save Profitability Forecast' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class ProfitabilityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  forecastId = signal<number | null>(null);
  saving = signal<boolean>(false);
  projects = signal<Project[]>([]);

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE_FORECAST', label: 'Active Forecast' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ARCHIVED', label: 'Archived' }
  ];

  investmentBaseOptions: SelectOption[] = [
    { value: 'TOTAL_PROJECT_INVESTMENT', label: 'Total Project Cost (Enterprise Basis)' },
    { value: 'EQUITY_INVESTED', label: 'Equity Invested (Developer Equity Basis)' }
  ];

  projectOptions = computed<SelectOption[]>(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  // Computed totals for live display
  computedTotalRevenue = signal<number>(0);
  computedDevRevenue = signal<number>(0);
  computedTotalCost = signal<number>(0);
  computedNetProfit = signal<number>(0);
  computedRoi = signal<number>(0);
  computedActualProfit = signal<number>(0);
  computedActualRoi = signal<number>(0);
  computedBreakeven = signal<number>(0);

  // Stressed simulation signals
  simRevenue = signal<number>(0);
  simCost = signal<number>(0);
  simProfit = signal<number>(0);
  simRoi = signal<number>(0);

  form: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    forecast_code: ['', Validators.required],
    version_label: ['Base Case Financial Model V1.0', Validators.required],
    calculation_date: [new Date().toISOString().substring(0, 10), Validators.required],
    apartment_revenue_est: [0, Validators.min(0)],
    shop_revenue_est: [0, Validators.min(0)],
    office_revenue_est: [0, Validators.min(0)],
    parking_revenue_est: [0, Validators.min(0)],
    other_revenue_est: [0, Validators.min(0)],
    jv_sharing_ratio: ['50:50'],
    developer_share_pct: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    landowner_share_pct: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    construction_cost_est: [0, Validators.min(0)],
    consultant_fee_est: [0, Validators.min(0)],
    marketing_sales_cost_est: [0, Validators.min(0)],
    admin_overhead_est: [0, Validators.min(0)],
    financing_interest_cost_est: [0, Validators.min(0)],
    contingency_cost_est: [0, Validators.min(0)],
    defined_investment_base_type: ['TOTAL_PROJECT_INVESTMENT'],
    defined_investment_base_bdt: [0, Validators.min(0)],
    recognized_revenue: [0, Validators.min(0)],
    recognized_project_expenses: [0, Validators.min(0)],
    committed_costs: [0, Validators.min(0)],
    posted_expenses: [0, Validators.min(0)],
    revised_completion_date: [''],
    scenario_price_increase_pct: [0],
    scenario_sales_delay_months: [0],
    scenario_cost_overrun_pct: [0],
    status: ['ACTIVE_FORECAST', Validators.required],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.forecastId.set(Number(id));
      this.loadForecast(Number(id));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (!this.isEditMode() && data.length > 0 && !this.form.get('project_id')?.value) {
          this.form.patchValue({ project_id: data[0].id });
          this.form.patchValue({ forecast_code: `${data[0].project_code}-PRF-01` });
        }
      }
    });
  }

  loadForecast(id: number): void {
    this.projectService.getProfitabilityById(id).subscribe({
      next: (f: ProjectProfitability) => {
        this.form.patchValue({
          project_id: f.project_id,
          forecast_code: f.forecast_code,
          version_label: f.version_label,
          calculation_date: f.calculation_date ? f.calculation_date.substring(0, 10) : '',
          apartment_revenue_est: f.apartment_revenue_est,
          shop_revenue_est: f.shop_revenue_est,
          office_revenue_est: f.office_revenue_est,
          parking_revenue_est: f.parking_revenue_est,
          other_revenue_est: f.other_revenue_est,
          jv_sharing_ratio: f.jv_sharing_ratio,
          developer_share_pct: f.developer_share_pct,
          landowner_share_pct: f.landowner_share_pct,
          construction_cost_est: f.construction_cost_est,
          consultant_fee_est: f.consultant_fee_est,
          marketing_sales_cost_est: f.marketing_sales_cost_est,
          admin_overhead_est: f.admin_overhead_est,
          financing_interest_cost_est: f.financing_interest_cost_est,
          contingency_cost_est: f.contingency_cost_est,
          defined_investment_base_type: f.defined_investment_base_type,
          defined_investment_base_bdt: f.defined_investment_base_bdt,
          recognized_revenue: f.recognized_revenue,
          recognized_project_expenses: f.recognized_project_expenses,
          committed_costs: f.committed_costs,
          posted_expenses: f.posted_expenses,
          revised_completion_date: f.revised_completion_date ? f.revised_completion_date.substring(0, 10) : '',
          scenario_price_increase_pct: f.scenario_price_increase_pct,
          scenario_sales_delay_months: f.scenario_sales_delay_months,
          scenario_cost_overrun_pct: f.scenario_cost_overrun_pct,
          status: f.status,
          remarks: f.remarks
        });
        this.recalcTotals();
        this.runSimulation();
      }
    });
  }

  recalcTotals(): void {
    const val = this.form.value;
    const rev =
      Number(val.apartment_revenue_est || 0) +
      Number(val.shop_revenue_est || 0) +
      Number(val.office_revenue_est || 0) +
      Number(val.parking_revenue_est || 0) +
      Number(val.other_revenue_est || 0);

    const devPct = Number(val.developer_share_pct || 50);
    const devRev = rev * (devPct / 100.0);

    const cost =
      Number(val.construction_cost_est || 0) +
      Number(val.consultant_fee_est || 0) +
      Number(val.marketing_sales_cost_est || 0) +
      Number(val.admin_overhead_est || 0) +
      Number(val.financing_interest_cost_est || 0) +
      Number(val.contingency_cost_est || 0);

    const profit = devPct < 100 ? devRev - cost : rev - cost;
    const invBase = Number(val.defined_investment_base_bdt || 0) > 0 ? Number(val.defined_investment_base_bdt) : cost;
    const roi = invBase > 0 ? (profit / invBase) * 100.0 : 0;

    const actualProfit = Number(val.recognized_revenue || 0) - Number(val.recognized_project_expenses || 0);
    const actualRoi = invBase > 0 && Number(val.recognized_revenue || 0) > 0 ? (actualProfit / invBase) * 100.0 : 0;

    const breakeven = cost;

    this.computedTotalRevenue.set(rev);
    this.computedDevRevenue.set(devRev);
    this.computedTotalCost.set(cost);
    this.computedNetProfit.set(profit);
    this.computedRoi.set(roi);
    this.computedActualProfit.set(actualProfit);
    this.computedActualRoi.set(actualRoi);
    this.computedBreakeven.set(breakeven);

    this.runSimulation();
  }

  runSimulation(): void {
    const val = this.form.value;
    const baseRev = this.computedTotalRevenue();
    const baseCost = this.computedTotalCost();
    const invBase = Number(val.defined_investment_base_bdt || 0) > 0 ? Number(val.defined_investment_base_bdt) : baseCost;

    const priceDelta = Number(val.scenario_price_increase_pct || 0);
    const delayMonths = Number(val.scenario_sales_delay_months || 0);
    const costOverrun = Number(val.scenario_cost_overrun_pct || 0);

    const sRev = baseRev * (1.0 + priceDelta / 100.0);
    const delayCost = baseCost * (0.10 / 12.0) * delayMonths;
    const sCost = baseCost * (1.0 + costOverrun / 100.0) + delayCost;
    const sProfit = sRev - sCost;
    const sRoi = invBase > 0 ? (sProfit / invBase) * 100.0 : 0;

    this.simRevenue.set(sRev);
    this.simCost.set(sCost);
    this.simProfit.set(sProfit);
    this.simRoi.set(sRoi);
  }

  saveForecast(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form.value };
    payload.project_id = Number(payload.project_id);
    payload.developer_share_pct = Number(payload.developer_share_pct);
    payload.landowner_share_pct = Number(payload.landowner_share_pct);
    payload.apartment_revenue_est = Number(payload.apartment_revenue_est || 0);
    payload.shop_revenue_est = Number(payload.shop_revenue_est || 0);
    payload.office_revenue_est = Number(payload.office_revenue_est || 0);
    payload.parking_revenue_est = Number(payload.parking_revenue_est || 0);
    payload.other_revenue_est = Number(payload.other_revenue_est || 0);
    payload.construction_cost_est = Number(payload.construction_cost_est || 0);
    payload.consultant_fee_est = Number(payload.consultant_fee_est || 0);
    payload.marketing_sales_cost_est = Number(payload.marketing_sales_cost_est || 0);
    payload.admin_overhead_est = Number(payload.admin_overhead_est || 0);
    payload.financing_interest_cost_est = Number(payload.financing_interest_cost_est || 0);
    payload.contingency_cost_est = Number(payload.contingency_cost_est || 0);
    payload.defined_investment_base_bdt = Number(payload.defined_investment_base_bdt || 0);
    payload.recognized_revenue = Number(payload.recognized_revenue || 0);
    payload.recognized_project_expenses = Number(payload.recognized_project_expenses || 0);
    payload.committed_costs = Number(payload.committed_costs || 0);
    payload.posted_expenses = Number(payload.posted_expenses || 0);
    payload.scenario_price_increase_pct = Number(payload.scenario_price_increase_pct || 0);
    payload.scenario_sales_delay_months = Number(payload.scenario_sales_delay_months || 0);
    payload.scenario_cost_overrun_pct = Number(payload.scenario_cost_overrun_pct || 0);

    if (this.isEditMode() && this.forecastId()) {
      this.projectService.updateProfitability(this.forecastId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/profitability-roi']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to update forecast.');
        }
      });
    } else {
      this.projectService.createProfitability(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/profitability-roi']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to create forecast.');
        }
      });
    }
  }
}
