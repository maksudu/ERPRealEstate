import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  private router = inject(Router);
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

  navigateToCreate(): void {
    this.router.navigate(['/land/proposals/create']);
  }

  navigateToEdit(proposal: LandBank): void {
    this.router.navigate(['/land/proposals', proposal.id, 'edit']);
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
