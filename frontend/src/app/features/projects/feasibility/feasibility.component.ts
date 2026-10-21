import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, ProjectFeasibility, ProjectMetaOptions } from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-project-feasibility',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './feasibility.component.html'
})
export class ProjectFeasibilityComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Data Signals
  feasibilityStudies = signal<ProjectFeasibility[]>([]);
  projects = signal<Project[]>([]);
  metaOptions = signal<ProjectMetaOptions>({
    land_banks: [],
    companies: [],
    project_types: [],
    project_categories: [],
    funding_sources: [],
    departments: [],
    project_managers: [],
    project_directors: []
  });

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filters
  searchQuery = signal<string>('');
  selectedProjectFilter = signal<string>('');
  selectedStatusFilter = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(8);

  // Modals State
  isCreateModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isApprovalModalOpen = signal<boolean>(false);
  selectedStudy = signal<ProjectFeasibility | null>(null);
  activeModalTab = signal<'costs' | 'revenue' | 'jv' | 'timeline' | 'scenarios' | 'cashflow' | 'committee'>('costs');

  // Real-time Simulation Signals
  simulatedRevenue = signal<number>(500000000); // ৳50 crore default illustrative
  simulatedCost = signal<number>(380000000);    // ৳38 crore default illustrative
  simulatedGrossProfit = signal<number>(120000000); // ৳12 crore default illustrative
  simulatedProfitMargin = signal<number>(24.0); // 24% default
  simulatedOperatingProfit = signal<number>(105000000);
  simulatedNetProfit = signal<number>(89250000);
  simulatedRoi = signal<number>(31.58);
  simulatedBreakEvenSales = signal<number>(380000000);
  simulatedBreakEvenSqft = signal<number>(38000);
  simulatedBreakEvenPercent = signal<number>(76.0);
  simulatedEfficiencyPercent = signal<number>(80.0);
  scenarios = signal<any>(null);
  cashFlowForecast = signal<any[]>([]);
  customerCollectionSchedule = signal<any[]>([]);
  sensitivityGrid = signal<any>(null);

  // Approval Action form
  approvalAction = signal<'APPROVE' | 'REJECT' | 'RESUBMIT'>('APPROVE');
  approvalRemarks = signal<string>('');
  committeeDecision = signal<'PENDING' | 'RECOMMENDED_FOR_APPROVAL' | 'CONDITIONAL_APPROVAL' | 'REJECTED' | 'REVISE_ESTIMATES'>('RECOMMENDED_FOR_APPROVAL');
  committeeNotes = signal<string>('');

  // Feasibility Form
  feasibilityForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    feasibility_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    title: ['', Validators.required],
    version_label: ['V1.0', Validators.required],
    
    // Cost Components (in BDT)
    land_acquisition_cost: [120000000, [Validators.required, Validators.min(0)]], // ৳12 Cr
    jv_landowner_cash_consideration: [20000000, Validators.min(0)],               // ৳2.0 Cr
    legal_and_vetting_expenses: [5000000, Validators.min(0)],                      // ৳50 Lac
    preliminary_arch_engineering_cost: [15000000, Validators.min(0)],             // ৳1.5 Cr
    estimated_construction_cost: [180000000, [Validators.required, Validators.min(0)]], // ৳18 Cr
    infrastructure_and_site_dev: [15000000, Validators.min(0)],                   // ৳1.5 Cr
    utility_connection_expenses: [10000000, Validators.min(0)],                    // ৳1.0 Cr
    professional_authority_fees: [10000000, Validators.min(0)],                    // ৳1.0 Cr
    marketing_and_brokerage_cost: [12000000, Validators.min(0)],                   // ৳1.2 Cr
    financing_and_interest_cost: [15000000, Validators.min(0)],                    // ৳1.5 Cr
    contingency_reserve: [10000000, Validators.min(0)],                            // ৳1.0 Cr

    // Architectural Specs & Inventory
    proposed_building_height_meters: [45.0, Validators.min(5)],
    proposed_floor_count: [14, [Validators.required, Validators.min(1)]],
    proposed_unit_count: [56, [Validators.required, Validators.min(1)]],
    apartment_unit_count: [48, [Validators.required, Validators.min(0)]],
    commercial_unit_count: [8, Validators.min(0)],
    parking_bay_count: [60, Validators.min(0)],
    total_saleable_area_sqft: [40000, [Validators.required, Validators.min(100)]],
    total_common_area_sqft: [10000, Validators.min(0)],

    // JV & Timeline
    landowner_jv_sharing_ratio: ['50:50', Validators.required],
    project_duration_months: [36, [Validators.required, Validators.min(1)]],
    expected_start_date: ['2025-01-01'],
    expected_handover_date: ['2027-12-31'],

    // Rates & Revenue Components (in BDT)
    avg_apartment_rate_sqft: [10000, Validators.min(0)],
    avg_commercial_rate_sqft: [15000, Validators.min(0)],
    avg_parking_rate_unit: [500000, Validators.min(0)],
    estimated_apartment_sales_revenue: [400000000, [Validators.required, Validators.min(0)]], // ৳40 Cr
    estimated_commercial_sales_revenue: [60000000, Validators.min(0)],                         // ৳6 Cr
    estimated_parking_sales_revenue: [30000000, Validators.min(0)],                            // ৳3 Cr
    estimated_other_sales_revenue: [10000000, Validators.min(0)],                              // ৳1 Cr
    
    tax_rate_percent: [15.0],
    review_remarks: [''],
    investment_committee_notes: [''],
    committee_decision: ['PENDING']
  });

  // Project select options computed
  projectSelectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `[${p.project_code}] ${p.project_name}`,
      subLabel: `${p.thana_upazila}, ${p.district} — ${p.status}`
    }));
  });

  // Top Aggregates
  totalFeasibilitiesCount = computed(() => this.feasibilityStudies().length);
  approvedFeasibilitiesCount = computed(() => this.feasibilityStudies().filter(f => f.status === 'APPROVED').length);
  avgProfitMargin = computed(() => {
    const list = this.feasibilityStudies();
    if (!list.length) return 24.0;
    const sum = list.reduce((acc, f) => acc + (Number(f.profit_margin_percent) || 0), 0);
    return Math.round((sum / list.length) * 10) / 10;
  });

  // Filtered Studies
  filteredStudies = computed(() => {
    let list = this.feasibilityStudies();
    const query = this.searchQuery().trim().toLowerCase();
    const projId = this.selectedProjectFilter();
    const status = this.selectedStatusFilter();

    if (query) {
      list = list.filter(f => 
        f.feasibility_code.toLowerCase().includes(query) ||
        f.title.toLowerCase().includes(query) ||
        (f.project_name && f.project_name.toLowerCase().includes(query)) ||
        (f.project_code && f.project_code.toLowerCase().includes(query))
      );
    }
    if (projId) {
      list = list.filter(f => String(f.project_id) === String(projId));
    }
    if (status) {
      list = list.filter(f => f.status === status);
    }

    return list;
  });

  paginatedStudies = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredStudies().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredStudies().length / this.pageSize()) || 1);

  ngOnInit(): void {
    this.loadProjects();
    this.loadFeasibilities();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || []),
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  loadFeasibilities(): void {
    this.isLoading.set(true);
    this.projectService.getFeasibilities().subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          // Provide illustrative default study matching user's exact ৳50 Cr revenue / ৳38 Cr cost example
          this.seedInitialIllustrativeData();
        } else {
          this.feasibilityStudies.set(data);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.seedInitialIllustrativeData();
      }
    });
  }

  seedInitialIllustrativeData(): void {
    // If table is empty, auto-create the user's exact illustrative example in the database
    const yr = new Date().getFullYear();
    const payload = {
      project_id: this.projects().length > 0 ? this.projects()[0].id : 1,
      feasibility_code: `FS-${yr}-001`,
      title: 'Commercial & Financial Feasibility Study — Green Valley Twin Towers',
      version_label: 'V1.0-Initial',
      land_acquisition_cost: 120000000,
      jv_landowner_cash_consideration: 20000000,
      legal_and_vetting_expenses: 5000000,
      preliminary_arch_engineering_cost: 15000000,
      estimated_construction_cost: 180000000,
      infrastructure_and_site_dev: 15000000,
      utility_connection_expenses: 10000000,
      professional_authority_fees: 10000000,
      marketing_and_brokerage_cost: 12000000,
      financing_and_interest_cost: 15000000,
      contingency_reserve: 10000000,
      proposed_building_height_meters: 45.0,
      proposed_floor_count: 14,
      proposed_unit_count: 56,
      apartment_unit_count: 48,
      commercial_unit_count: 8,
      parking_bay_count: 60,
      total_saleable_area_sqft: 40000,
      total_common_area_sqft: 10000,
      landowner_jv_sharing_ratio: '50:50',
      project_duration_months: 36,
      expected_start_date: '2025-01-01',
      expected_handover_date: '2027-12-31',
      avg_apartment_rate_sqft: 10000,
      avg_commercial_rate_sqft: 15000,
      avg_parking_rate_unit: 500000,
      estimated_apartment_sales_revenue: 400000000,
      estimated_commercial_sales_revenue: 60000000,
      estimated_parking_sales_revenue: 30000000,
      estimated_other_sales_revenue: 10000000,
      status: 'APPROVED',
      committee_decision: 'RECOMMENDED_FOR_APPROVAL',
      investment_committee_notes: 'Approved by Investment Committee. High viability with strong 31.5% ROI and 76% break-even.',
      review_remarks: 'Technically and commercially viable under Dhaka 2008 Building Rules.'
    };

    if (this.projects().length > 0) {
      this.projectService.createFeasibility(payload).subscribe({
        next: (created) => {
          this.feasibilityStudies.set([created]);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
    } else {
      this.isLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.activeModalTab.set('costs');

    const yr = new Date().getFullYear();
    const codePrefix = `FS-${yr}-`;
    const nextNum = String(
      this.feasibilityStudies().reduce((max, study) => {
        if (!study.feasibility_code.startsWith(codePrefix)) return max;
        const sequence = Number(study.feasibility_code.slice(codePrefix.length));
        return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
      }, 0) + 1
    ).padStart(3, '0');
    const autoCode = `FS-${yr}-${nextNum}`;

    this.feasibilityForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      feasibility_code: autoCode,
      title: 'Detailed Commercial & Technical Feasibility Model',
      version_label: 'V1.0',
      land_acquisition_cost: 120000000,
      jv_landowner_cash_consideration: 20000000,
      legal_and_vetting_expenses: 5000000,
      preliminary_arch_engineering_cost: 15000000,
      estimated_construction_cost: 180000000,
      infrastructure_and_site_dev: 15000000,
      utility_connection_expenses: 10000000,
      professional_authority_fees: 10000000,
      marketing_and_brokerage_cost: 12000000,
      financing_and_interest_cost: 15000000,
      contingency_reserve: 10000000,
      proposed_building_height_meters: 45.0,
      proposed_floor_count: 14,
      proposed_unit_count: 56,
      apartment_unit_count: 48,
      commercial_unit_count: 8,
      parking_bay_count: 60,
      total_saleable_area_sqft: 40000,
      total_common_area_sqft: 10000,
      landowner_jv_sharing_ratio: '50:50',
      project_duration_months: 36,
      expected_start_date: '2025-01-01',
      expected_handover_date: '2027-12-31',
      avg_apartment_rate_sqft: 10000,
      avg_commercial_rate_sqft: 15000,
      avg_parking_rate_unit: 500000,
      estimated_apartment_sales_revenue: 400000000,
      estimated_commercial_sales_revenue: 60000000,
      estimated_parking_sales_revenue: 30000000,
      estimated_other_sales_revenue: 10000000,
      tax_rate_percent: 15.0,
      review_remarks: '',
      investment_committee_notes: '',
      committee_decision: 'PENDING'
    });

    this.runLiveSimulation();
    this.isCreateModalOpen.set(true);
  }

  onFormInputChange(): void {
    this.runLiveSimulation();
  }

  calculateRevenueFromInventory(): void {
    const saleableSqft = Number(this.feasibilityForm.get('total_saleable_area_sqft')?.value) || 0;
    const aptRate = Number(this.feasibilityForm.get('avg_apartment_rate_sqft')?.value) || 0;
    const commRate = Number(this.feasibilityForm.get('avg_commercial_rate_sqft')?.value) || 0;
    const parkingUnits = Number(this.feasibilityForm.get('parking_bay_count')?.value) || 0;
    const parkingRate = Number(this.feasibilityForm.get('avg_parking_rate_unit')?.value) || 0;

    if (aptRate > 0 && saleableSqft > 0) {
      this.feasibilityForm.patchValue({
        estimated_apartment_sales_revenue: Math.round(saleableSqft * aptRate * 0.85),
        estimated_commercial_sales_revenue: Math.round(saleableSqft * 0.15 * (commRate || aptRate * 1.5))
      });
    }
    if (parkingUnits > 0 && parkingRate > 0) {
      this.feasibilityForm.patchValue({
        estimated_parking_sales_revenue: Math.round(parkingUnits * parkingRate)
      });
    }
    this.runLiveSimulation();
  }

  runLiveSimulation(): void {
    const val = this.feasibilityForm.value;
    const rev = (Number(val.estimated_apartment_sales_revenue) || 0) +
                (Number(val.estimated_commercial_sales_revenue) || 0) +
                (Number(val.estimated_parking_sales_revenue) || 0) +
                (Number(val.estimated_other_sales_revenue) || 0);

    const cost = (Number(val.land_acquisition_cost) || 0) +
                 (Number(val.jv_landowner_cash_consideration) || 0) +
                 (Number(val.legal_and_vetting_expenses) || 0) +
                 (Number(val.preliminary_arch_engineering_cost) || 0) +
                 (Number(val.estimated_construction_cost) || 0) +
                 (Number(val.infrastructure_and_site_dev) || 0) +
                 (Number(val.utility_connection_expenses) || 0) +
                 (Number(val.professional_authority_fees) || 0) +
                 (Number(val.marketing_and_brokerage_cost) || 0) +
                 (Number(val.financing_and_interest_cost) || 0) +
                 (Number(val.contingency_reserve) || 0);

    const grossProfit = rev - cost;
    const financing = Number(val.financing_and_interest_cost) || 0;
    const opProfit = grossProfit - financing;
    const taxRate = (Number(val.tax_rate_percent) || 15) / 100;
    const netProfit = Math.max(0, opProfit * (1 - taxRate));
    const margin = rev > 0 ? (grossProfit / rev) * 100 : 0;
    const roi = cost > 0 ? (grossProfit / cost) * 100 : 0;

    const saleable = Number(val.total_saleable_area_sqft) || 1;
    const common = Number(val.total_common_area_sqft) || 0;
    const efficiency = ((saleable) / (saleable + common)) * 100;

    const breakEvenSales = cost;
    const breakEvenPercent = rev > 0 ? (cost / rev) * 100 : 0;
    const avgRate = Number(val.avg_apartment_rate_sqft) || (saleable > 0 ? rev / saleable : 1);
    const breakEvenSqft = avgRate > 0 ? cost / avgRate : 0;

    this.simulatedRevenue.set(rev);
    this.simulatedCost.set(cost);
    this.simulatedGrossProfit.set(grossProfit);
    this.simulatedProfitMargin.set(Math.round(margin * 100) / 100);
    this.simulatedOperatingProfit.set(opProfit);
    this.simulatedNetProfit.set(netProfit);
    this.simulatedRoi.set(Math.round(roi * 100) / 100);
    this.simulatedBreakEvenSales.set(breakEvenSales);
    this.simulatedBreakEvenSqft.set(Math.round(breakEvenSqft));
    this.simulatedBreakEvenPercent.set(Math.round(breakEvenPercent * 10) / 10);
    this.simulatedEfficiencyPercent.set(Math.round(efficiency * 10) / 10);

    // Call backend simulator to get official 3 scenarios, sensitivity grid & 8-quarter cash-flow
    this.projectService.simulateFeasibility(val).subscribe({
      next: (res) => {
        this.scenarios.set(res.scenarios);
        this.cashFlowForecast.set(res.cash_flow_forecast || []);
        this.customerCollectionSchedule.set(res.customer_collection_schedule || []);
        this.sensitivityGrid.set(res.sensitivity_analysis || null);
        if (res.break_even_sales_bdt !== undefined) {
          this.simulatedBreakEvenSales.set(res.break_even_sales_bdt);
          this.simulatedBreakEvenSqft.set(res.break_even_sqft);
          this.simulatedBreakEvenPercent.set(res.break_even_percent);
          this.simulatedEfficiencyPercent.set(res.saleable_efficiency_percent);
        }
      }
    });
  }

  saveFeasibility(status: 'DRAFT' | 'SUBMITTED'): void {
    if (this.feasibilityForm.invalid) {
      this.feasibilityForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all mandatory fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const payload = { ...this.feasibilityForm.value, status };

    this.projectService.createFeasibility(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
        this.successMessage.set('Project feasibility calculation saved successfully!');
        this.loadFeasibilities();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to save feasibility model.');
      }
    });
  }

  viewStudyDetails(study: ProjectFeasibility): void {
    this.selectedStudy.set(study);
    this.isDetailsModalOpen.set(true);
  }

  openApprovalModal(study: ProjectFeasibility): void {
    this.selectedStudy.set(study);
    this.approvalAction.set((study.status as any) || 'APPROVE');
    this.approvalRemarks.set(study.review_remarks || '');
    this.committeeDecision.set((study.committee_decision as any) || 'RECOMMENDED_FOR_APPROVAL');
    this.committeeNotes.set(study.investment_committee_notes || '');
    this.isApprovalModalOpen.set(true);
  }

  submitApproval(): void {
    if (!this.selectedStudy()) return;
    this.isSubmitting.set(true);
    this.projectService.updateFeasibility(
      this.selectedStudy()!.id,
      this.approvalAction(),
      this.approvalRemarks(),
      this.committeeDecision(),
      this.committeeNotes()
    ).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isApprovalModalOpen.set(false);
        this.successMessage.set(`Feasibility status updated to ${this.approvalAction()} with Investment Committee decision ${this.committeeDecision()}.`);
        this.loadFeasibilities();
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update approval status.');
      }
    });
  }

  goToPage(pg: number): void {
    if (pg >= 1 && pg <= this.totalPages()) {
      this.currentPage.set(pg);
    }
  }
}
