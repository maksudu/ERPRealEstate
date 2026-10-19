import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import {
  Subcontractor,
  ContractorMetrics,
  ContractorRate,
  ContractorDispute,
  ContractorFilter
} from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-contractors',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './contractors.component.html'
})
export class ContractorsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Active Tab
  currentTab = signal<'CONTRACTORS' | 'RATES' | 'DISPUTES' | 'COMPLIANCE'>('CONTRACTORS');

  // Loading & Data State
  isLoading = signal<boolean>(false);
  contractors = signal<Subcontractor[]>([]);
  totalContractors = signal<number>(0);
  metrics = signal<ContractorMetrics | null>(null);

  // Rate Cards & Disputes
  selectedContractorForRates = signal<Subcontractor | null>(null);
  ratesList = signal<ContractorRate[]>([]);
  disputesList = signal<ContractorDispute[]>([]);
  projects = signal<Project[]>([]);
  projectOptions = signal<{ label: string; value: any }[]>([]);
  contractorOptions = signal<{ label: string; value: any }[]>([]);

  // Filters & Pagination
  searchQuery = '';
  selectedType = '';
  selectedTrade = '';
  selectedOnboardingStatus = '';
  selectedCompletionStatus = '';
  pageSize = 10;
  currentPage = 1;

  // Modals
  showStatusModal = signal<boolean>(false);
  selectedContractorForStatus = signal<Subcontractor | null>(null);
  newOnboardingStatus = 'APPROVED';
  statusRemarks = '';

  showRateModal = signal<boolean>(false);
  rateForm = {
    contractor_id: 0,
    project_id: null as number | null,
    item_code: '',
    trade_item_name: '',
    specification: '',
    unit_of_measure: 'SFT',
    approved_unit_rate: 0,
    scope_boundary_definition: '',
    effective_start_date: new Date().toISOString().split('T')[0]
  };

  showDisputeModal = signal<boolean>(false);
  disputeForm = {
    contractor_id: 0,
    project_id: 1,
    dispute_category: 'MEASUREMENT_DISCREPANCY',
    dispute_title: '',
    description: '',
    claimed_amount: 0,
    approved_deduction_amount: 0,
    retention_held_amount: 0
  };

  showResolveModal = signal<boolean>(false);
  selectedDisputeForResolve = signal<ContractorDispute | null>(null);
  resolveForm = {
    status: 'DEDUCTED',
    approved_deduction_amount: 0,
    resolution_notes: ''
  };

  isSavingModal = signal<boolean>(false);

  ngOnInit(): void {
    this.loadMetrics();
    this.loadProjects();
    this.loadContractors();
  }

  loadMetrics(): void {
    this.constructionService.getContractorMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: (e) => console.error('Failed to load contractor metrics', e)
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (list: Project[]) => {
        const safeList = list || [];
        this.projects.set(safeList);
        this.projectOptions.set(safeList.map((p: Project) => ({ label: p.project_name || p.project_code, value: p.id })));
      },
      error: () => {}
    });
  }

  loadContractors(): void {
    this.isLoading.set(true);
    const filter: ContractorFilter = {
      search: this.searchQuery || undefined,
      contractor_type: this.selectedType || undefined,
      trade_category: this.selectedTrade || undefined,
      onboarding_status: this.selectedOnboardingStatus || undefined,
      completion_status: this.selectedCompletionStatus || undefined,
      limit: this.pageSize,
      offset: (this.currentPage - 1) * this.pageSize
    };

    this.constructionService.getContractorsPaged(filter).subscribe({
      next: (res) => {
        this.contractors.set(res.items);
        this.totalContractors.set(res.total);
        this.isLoading.set(false);

        // Update dropdown options
        const opts = res.items.map(c => ({
          label: `${c.company_name} (${c.contractor_code})`,
          value: c.id
        }));
        this.contractorOptions.set(opts);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load contractors', err);
      }
    });
  }

  onTabChange(tab: 'CONTRACTORS' | 'RATES' | 'DISPUTES' | 'COMPLIANCE'): void {
    this.currentTab.set(tab);
    if (tab === 'RATES') {
      if (this.contractors().length > 0 && !this.selectedContractorForRates()) {
        this.selectContractorForRates(this.contractors()[0]);
      }
    } else if (tab === 'DISPUTES') {
      this.loadDisputes();
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.loadContractors();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedType = '';
    this.selectedTrade = '';
    this.selectedOnboardingStatus = '';
    this.selectedCompletionStatus = '';
    this.currentPage = 1;
    this.loadContractors();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage = page;
    this.loadContractors();
  }

  totalPages(): number {
    return Math.ceil(this.totalContractors() / this.pageSize) || 1;
  }

  navigateToCreate(): void {
    this.router.navigate(['/construction/contractors/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/construction/contractors/edit', id]);
  }

  // --- Rate Cards Handling ---
  selectContractorForRates(c: Subcontractor): void {
    this.selectedContractorForRates.set(c);
    this.constructionService.getContractorRates(c.id).subscribe({
      next: (rates) => this.ratesList.set(rates),
      error: (e) => console.error('Failed to load rates', e)
    });
  }

  openAddRateModal(c?: Subcontractor): void {
    const target = c || this.selectedContractorForRates() || (this.contractors().length > 0 ? this.contractors()[0] : null);
    if (!target) return;

    this.rateForm = {
      contractor_id: target.id,
      project_id: 1,
      item_code: '',
      trade_item_name: '',
      specification: '',
      unit_of_measure: 'SFT',
      approved_unit_rate: 0,
      scope_boundary_definition: '',
      effective_start_date: new Date().toISOString().split('T')[0]
    };
    this.showRateModal.set(true);
  }

  saveRate(): void {
    if (!this.rateForm.contractor_id || !this.rateForm.trade_item_name || !this.rateForm.approved_unit_rate) {
      alert('Please enter trade item name and approved unit rate.');
      return;
    }
    this.isSavingModal.set(true);
    this.constructionService.addContractorRate(this.rateForm.contractor_id, this.rateForm).subscribe({
      next: () => {
        this.isSavingModal.set(false);
        this.showRateModal.set(false);
        if (this.selectedContractorForRates()) {
          this.selectContractorForRates(this.selectedContractorForRates()!);
        }
        this.loadContractors();
      },
      error: (err) => {
        this.isSavingModal.set(false);
        console.error('Failed to add rate', err);
      }
    });
  }

  deleteRate(rateId: number): void {
    if (!confirm('Are you sure you want to remove this approved rate item?')) return;
    this.constructionService.deleteContractorRate(rateId).subscribe({
      next: () => {
        if (this.selectedContractorForRates()) {
          this.selectContractorForRates(this.selectedContractorForRates()!);
        }
      },
      error: (err) => console.error('Failed to delete rate', err)
    });
  }

  // --- Disputes Handling ---
  loadDisputes(): void {
    this.constructionService.getContractorDisputes().subscribe({
      next: (list) => this.disputesList.set(list),
      error: (err) => console.error('Failed to load disputes', err)
    });
  }

  openRaiseDisputeModal(c?: Subcontractor): void {
    const defaultContractorId = c ? c.id : (this.contractors().length > 0 ? this.contractors()[0].id : 0);
    this.disputeForm = {
      contractor_id: defaultContractorId,
      project_id: 1,
      dispute_category: 'MEASUREMENT_DISCREPANCY',
      dispute_title: '',
      description: '',
      claimed_amount: 0,
      approved_deduction_amount: 0,
      retention_held_amount: 0
    };
    this.showDisputeModal.set(true);
  }

  saveDispute(): void {
    if (!this.disputeForm.contractor_id || !this.disputeForm.dispute_title || !this.disputeForm.description) {
      alert('Please fill out contractor, dispute title, and description.');
      return;
    }
    this.isSavingModal.set(true);
    this.constructionService.createContractorDispute(this.disputeForm).subscribe({
      next: () => {
        this.isSavingModal.set(false);
        this.showDisputeModal.set(false);
        this.loadDisputes();
        this.loadMetrics();
        this.loadContractors();
      },
      error: (err) => {
        this.isSavingModal.set(false);
        console.error('Failed to raise dispute', err);
      }
    });
  }

  openResolveModal(dispute: ContractorDispute): void {
    this.selectedDisputeForResolve.set(dispute);
    this.resolveForm = {
      status: 'DEDUCTED',
      approved_deduction_amount: dispute.claimed_amount,
      resolution_notes: ''
    };
    this.showResolveModal.set(true);
  }

  saveResolveDispute(): void {
    if (!this.selectedDisputeForResolve() || !this.resolveForm.resolution_notes) {
      alert('Please enter resolution notes.');
      return;
    }
    this.isSavingModal.set(true);
    this.constructionService.resolveContractorDispute(this.selectedDisputeForResolve()!.id, this.resolveForm).subscribe({
      next: () => {
        this.isSavingModal.set(false);
        this.showResolveModal.set(false);
        this.loadDisputes();
        this.loadMetrics();
        this.loadContractors();
      },
      error: (err) => {
        this.isSavingModal.set(false);
        console.error('Failed to resolve dispute', err);
      }
    });
  }

  // --- Onboarding Status Review ---
  openStatusModal(c: Subcontractor): void {
    this.selectedContractorForStatus.set(c);
    this.newOnboardingStatus = c.onboarding_status;
    this.statusRemarks = c.remarks || '';
    this.showStatusModal.set(true);
  }

  saveStatusReview(): void {
    if (!this.selectedContractorForStatus()) return;
    this.isSavingModal.set(true);
    this.constructionService.updateContractorOnboardingStatus(
      this.selectedContractorForStatus()!.id,
      this.newOnboardingStatus,
      this.statusRemarks
    ).subscribe({
      next: () => {
        this.isSavingModal.set(false);
        this.showStatusModal.set(false);
        this.loadMetrics();
        this.loadContractors();
      },
      error: (err) => {
        this.isSavingModal.set(false);
        console.error('Failed to update status', err);
      }
    });
  }

  deleteContractor(c: Subcontractor): void {
    if (!confirm(`Are you sure you want to deactivate or remove ${c.company_name}?`)) return;
    this.constructionService.deleteContractor(c.id).subscribe({
      next: () => {
        this.loadContractors();
        this.loadMetrics();
      },
      error: (err) => console.error('Failed to delete contractor', err)
    });
  }

  // Badge helpers
  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'MAIN_CONTRACTOR':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'SUBCONTRACTOR':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'SPECIALIZED_TRADE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }

  getOnboardingBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'UNDER_REVIEW':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'SUSPENDED':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20';
      case 'BLACKLISTED':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }

  getCompletionBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'ONGOING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'DEFECT_LIABILITY':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'TERMINATED':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }

  getDisputeStatusClass(status: string): string {
    switch (status) {
      case 'OPEN':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'UNDER_MEDIATION':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'DEDUCTED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'RESOLVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }
}
