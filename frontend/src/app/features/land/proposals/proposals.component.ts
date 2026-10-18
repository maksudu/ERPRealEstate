import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  LandBank, 
  DeedChainVerification, 
  LandFeasibilityReport, 
  LandProposalComparisonItem 
} from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-proposals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './proposals.component.html'
})
export class ProposalsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  proposals = signal<LandBank[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedProposal = signal<LandBank | null>(null);

  // Filters
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('');
  selectedWorkflowStage = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];

  // Feasibility Report Modal State
  isFeasibilityModalOpen = signal<boolean>(false);
  isLoadingFeasibility = signal<boolean>(false);
  feasibilityReport = signal<LandFeasibilityReport | null>(null);

  // Opportunity Comparison Modal State
  isCompareModalOpen = signal<boolean>(false);
  isLoadingCompare = signal<boolean>(false);
  comparisonList = signal<LandProposalComparisonItem[]>([]);

  // Deed Chain Verification Modal State
  isChainModalOpen = signal<boolean>(false);
  chainVerification = signal<DeedChainVerification | null>(null);
  isLoadingChain = signal<boolean>(false);

  // Create Modal State
  isCreateModalOpen = signal<boolean>(false);
  createError = signal<string | null>(null);
  createActiveTab = signal<'basic' | 'potential' | 'landowner'>('basic');

  // Conversion Preview Signal
  calculatedSqft = signal<number>(0);
  calculatedDecimal = signal<number>(0);
  calculatedBigha = signal<number>(0);
  calculatedBuiltupSqft = signal<number>(0);

  unitOptions = [
    { value: 'KATHA', label: 'Katha (কাঠা - 720 Sq Ft)', subLabel: 'Urban residential standard in Dhaka' },
    { value: 'DECIMAL', label: 'Decimal / Shotok (শতাংশ - 435.60 Sq Ft)', subLabel: 'Government registry record standard' },
    { value: 'BIGHA', label: 'Bigha (বিঘা - 20 Katha / 14,400 Sq Ft)', subLabel: 'Township / large tract standard' },
    { value: 'SQFT', label: 'Square Feet (বর্গফুট)', subLabel: 'Architectural FAR standard' }
  ];

  workflowStages = [
    { value: 'IDENTIFIED', label: '1. Opportunity Identified', color: 'bg-slate-100 text-slate-800' },
    { value: 'SCREENING_INSPECTION', label: '2. Screening & Site Inspection', color: 'bg-blue-100 text-blue-800' },
    { value: 'FEASIBILITY_VALUATION', label: '3. Feasibility & Preliminary Valuation', color: 'bg-purple-100 text-purple-800' },
    { value: 'MANAGEMENT_APPROVAL', label: '4. Management Approval', color: 'bg-amber-100 text-amber-800' },
    { value: 'DUE_DILIGENCE_NEGOTIATION', label: '5. Due Diligence & Negotiation', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'ACQUIRED', label: 'Acquired & Finalized', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'REJECTED', label: 'Rejected', color: 'bg-rose-100 text-rose-800' }
  ];

  proposalForm: FormGroup = this.fb.group({
    project_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    proposal_title: ['', Validators.required],
    mouza_name: ['', Validators.required],
    jl_number: ['', Validators.required],
    upazila_thana: ['Gulshan', Validators.required],
    district: ['Dhaka', Validators.required],
    sub_registry_office: ['Gulshan Sub-Registry Office', Validators.required],
    input_unit: ['KATHA', Validators.required],
    input_value: [15, [Validators.required, Validators.min(0.01)]],
    deal_type: ['JOINT_VENTURE', Validators.required],
    opportunity_source: ['BROKER', Validators.required],
    source_contact_details: [''],
    road_access_width_ft: [40.0, [Validators.required, Validators.min(0)]],
    surrounding_development: [''],
    proposed_development_type: ['RESIDENTIAL', Validators.required],
    far_potential: [4.50, [Validators.required, Validators.min(0.1)]],
    max_allowable_floors: [14, [Validators.required, Validators.min(1)]],
    ground_coverage_percent: [50.00, [Validators.required, Validators.min(1), Validators.max(100)]],
    indicative_cost_total: [0],
    status: ['DRAFT_PROPOSAL'],
    workflow_stage: ['IDENTIFIED'],
    location_description: [''],
    preliminary_valuation_notes: [''],
    owner_name_en: ['', Validators.required],
    owner_nid: [''],
    owner_phone: ['']
  });

  // Filtered computed
  filteredProposals = computed(() => {
    let list = this.proposals();
    const term = this.searchTerm().trim().toLowerCase();
    const st = this.selectedStatus();
    const wf = this.selectedWorkflowStage();

    if (st) {
      list = list.filter(p => p.status === st);
    }
    if (wf) {
      list = list.filter(p => p.workflow_stage === wf);
    }
    if (term) {
      list = list.filter(p =>
        p.project_code.toLowerCase().includes(term) ||
        p.proposal_title.toLowerCase().includes(term) ||
        p.mouza_name.toLowerCase().includes(term) ||
        (p.upazila_thana && p.upazila_thana.toLowerCase().includes(term))
      );
    }
    return list;
  });

  paginatedProposals = computed(() => {
    const list = this.filteredProposals();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredProposals().length / this.pageSize()) || 1;
  });

  // Metrics computed
  totalProposalsCount = computed(() => this.proposals().length);
  inNegotiationCount = computed(() => this.proposals().filter(p => p.workflow_stage === 'DUE_DILIGENCE_NEGOTIATION').length);
  managementApprovalCount = computed(() => this.proposals().filter(p => p.workflow_stage === 'MANAGEMENT_APPROVAL').length);
  totalPotentialKatha = computed(() => {
    return this.proposals().reduce((sum, p) => sum + Number(p.total_area_katha || 0), 0);
  });

  ngOnInit(): void {
    this.loadProposals();
  }

  loadProposals(): void {
    this.isLoading.set(true);
    this.landService.getProposals().subscribe({
      next: (data) => {
        this.proposals.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  onStatusFilter(val: any): void {
    this.selectedStatus.set(val || '');
    this.currentPage.set(1);
  }

  onWorkflowFilter(val: any): void {
    this.selectedWorkflowStage.set(val || '');
    this.currentPage.set(1);
  }

  onPageSizeChange(val: any): void {
    this.pageSize.set(Number(val));
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onAreaInput(): void {
    const unit = this.proposalForm.get('input_unit')?.value || 'KATHA';
    const val = Number(this.proposalForm.get('input_value')?.value || 0);
    const far = Number(this.proposalForm.get('far_potential')?.value || 4.5);

    if (val <= 0) {
      this.calculatedSqft.set(0);
      this.calculatedDecimal.set(0);
      this.calculatedBuiltupSqft.set(0);
      return;
    }

    let sqft = 0;
    if (unit === 'KATHA') {
      sqft = val * 720;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(Number((sqft / 435.6).toFixed(2)));
      this.calculatedBigha.set(Number((val / 20).toFixed(2)));
    } else if (unit === 'DECIMAL') {
      sqft = val * 435.6;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(val);
      this.calculatedBigha.set(Number(((sqft / 720) / 20).toFixed(2)));
    } else if (unit === 'BIGHA') {
      sqft = val * 14400;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(Number((sqft / 435.6).toFixed(2)));
      this.calculatedBigha.set(val);
    } else {
      sqft = val;
      this.calculatedSqft.set(val);
      this.calculatedDecimal.set(Number((val / 435.6).toFixed(2)));
      this.calculatedBigha.set(Number(((val / 720) / 20).toFixed(2)));
    }

    this.calculatedBuiltupSqft.set(Math.round(sqft * far));
  }

  openCreateModal(): void {
    this.createActiveTab.set('basic');
    this.proposalForm.reset({
      project_code: `PRJ-LND-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      proposal_title: '',
      mouza_name: '',
      jl_number: '',
      upazila_thana: 'Gulshan',
      district: 'Dhaka',
      sub_registry_office: 'Gulshan Sub-Registry Office',
      input_unit: 'KATHA',
      input_value: 15,
      deal_type: 'JOINT_VENTURE',
      opportunity_source: 'BROKER',
      source_contact_details: '',
      road_access_width_ft: 40.0,
      surrounding_development: '',
      proposed_development_type: 'RESIDENTIAL',
      far_potential: 4.50,
      max_allowable_floors: 14,
      ground_coverage_percent: 50.00,
      indicative_cost_total: 0,
      status: 'DRAFT_PROPOSAL',
      workflow_stage: 'IDENTIFIED',
      location_description: '',
      preliminary_valuation_notes: '',
      owner_name_en: '',
      owner_nid: '',
      owner_phone: ''
    });
    this.createError.set(null);
    this.onAreaInput();
    this.isCreateModalOpen.set(true);
  }

  submitProposal(): void {
    if (this.proposalForm.invalid) {
      this.proposalForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.createError.set(null);

    const f = this.proposalForm.value;
    const payload = {
      project_code: f.project_code,
      proposal_title: f.proposal_title,
      mouza_name: f.mouza_name,
      jl_number: f.jl_number,
      upazila_thana: f.upazila_thana,
      district: f.district,
      sub_registry_office: f.sub_registry_office,
      input_unit: f.input_unit,
      input_value: Number(f.input_value),
      deal_type: f.deal_type,
      opportunity_source: f.opportunity_source,
      source_contact_details: f.source_contact_details || null,
      road_access_width_ft: Number(f.road_access_width_ft || 40.0),
      surrounding_development: f.surrounding_development || null,
      proposed_development_type: f.proposed_development_type,
      far_potential: Number(f.far_potential || 4.50),
      max_allowable_floors: Number(f.max_allowable_floors || 14),
      ground_coverage_percent: Number(f.ground_coverage_percent || 50.00),
      indicative_cost_total: Number(f.indicative_cost_total || 0),
      status: f.status || 'DRAFT_PROPOSAL',
      workflow_stage: f.workflow_stage || 'IDENTIFIED',
      location_description: f.location_description,
      preliminary_valuation_notes: f.preliminary_valuation_notes,
      landowners: f.owner_name_en ? [
        {
          owner_type: 'INDIVIDUAL',
          full_name_en: f.owner_name_en,
          nid_number: f.owner_nid || null,
          phone_number: f.owner_phone || null,
          ownership_share_ratio: 1.0
        }
      ] : []
    };

    this.landService.createProposal(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
        this.proposals.update(list => [created, ...list]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.createError.set(err.error?.detail || 'Failed to create land proposal.');
      }
    });
  }

  // Feasibility Report Modal
  openFeasibilityReport(proposal: LandBank): void {
    this.selectedProposal.set(proposal);
    this.isFeasibilityModalOpen.set(true);
    this.isLoadingFeasibility.set(true);
    this.landService.getProposalFeasibilityReport(proposal.id).subscribe({
      next: (report) => {
        this.feasibilityReport.set(report);
        this.isLoadingFeasibility.set(false);
      },
      error: (err) => {
        console.error('Error loading feasibility report:', err);
        this.isLoadingFeasibility.set(false);
      }
    });
  }

  // Comparison Matrix Modal
  openComparisonModal(): void {
    this.isCompareModalOpen.set(true);
    this.isLoadingCompare.set(true);
    this.landService.compareProposals().subscribe({
      next: (data) => {
        this.comparisonList.set(data);
        this.isLoadingCompare.set(false);
      },
      error: (err) => {
        console.error('Error comparing proposals:', err);
        this.isLoadingCompare.set(false);
      }
    });
  }

  // Workflow Stage Advancement
  advanceWorkflow(proposal: LandBank, nextStage: string): void {
    if (!confirm(`Advance "${proposal.project_code}" to stage: ${nextStage}?`)) return;

    this.landService.advanceWorkflowStage(proposal.id, nextStage).subscribe({
      next: (updated) => {
        this.proposals.update(list => list.map(p => p.id === updated.id ? updated : p));
      },
      error: (err) => alert(err.error?.detail || 'Failed to advance workflow')
    });
  }

  // Deed Chain Verification Modal
  viewDeedChain(proposal: LandBank): void {
    this.selectedProposal.set(proposal);
    this.isChainModalOpen.set(true);
    this.isLoadingChain.set(true);
    this.landService.verifyDeedChain(proposal.id).subscribe({
      next: (chain) => {
        this.chainVerification.set(chain);
        this.isLoadingChain.set(false);
      },
      error: () => this.isLoadingChain.set(false)
    });
  }

  getWorkflowBadgeClass(stage: string): string {
    switch (stage) {
      case 'IDENTIFIED': return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      case 'SCREENING_INSPECTION': return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'FEASIBILITY_VALUATION': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'MANAGEMENT_APPROVAL': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'DUE_DILIGENCE_NEGOTIATION': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'ACQUIRED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED': return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  }
}
