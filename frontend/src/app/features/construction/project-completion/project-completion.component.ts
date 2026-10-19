import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  ProjectCompletion,
  ProjectCompletionMetrics,
  PunchlistItem,
  Subcontractor
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-project-completion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './project-completion.component.html'
})
export class ProjectCompletionComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab: DOSSIERS | PUNCHLIST | FINANCIALS
  activeTab = signal<'DOSSIERS' | 'PUNCHLIST' | 'FINANCIALS'>('DOSSIERS');

  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);
  metrics = signal<ProjectCompletionMetrics | null>(null);
  isLoading = signal<boolean>(false);

  // Tab 1: Project Completion Dossiers
  completions = signal<ProjectCompletion[]>([]);
  completionsTotal = signal<number>(0);
  completionsPage = signal<number>(1);
  completionsPageSize = signal<number>(10);

  // Tab 2: Punchlist & Snag Register
  punchlists = signal<PunchlistItem[]>([]);
  punchlistsTotal = signal<number>(0);
  punchlistsPage = signal<number>(1);
  punchlistsPageSize = signal<number>(10);

  // Filters State
  searchQuery = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedStageStatus = signal<string>('');
  selectedSeverity = signal<string>('');
  selectedPunchlistStatus = signal<string>('');

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  // Quick Sign-off Modal
  isSignoffModalOpen = signal<boolean>(false);
  selectedCompletionForSignoff = signal<ProjectCompletion | null>(null);
  modalSignoffRole = signal<string>('PROJECT_MANAGER');
  modalSignerName = signal<string>('Engr. Tanvir Ahmed (Project Manager)');
  modalRemarks = signal<string>('');
  modalForceAllowSnags = signal<boolean>(false);
  isSubmittingSignoff = signal<boolean>(false);
  signoffErrorMessage = signal<string>('');

  // Pagination Computations
  completionsTotalPages = computed(() => Math.ceil(this.completionsTotal() / this.completionsPageSize()) || 1);
  punchlistsTotalPages = computed(() => Math.ceil(this.punchlistsTotal() / this.punchlistsPageSize()) || 1);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const t = String(params['tab']).toUpperCase();
        if (['DOSSIERS', 'PUNCHLIST', 'FINANCIALS'].includes(t)) {
          this.activeTab.set(t as any);
        }
      }
    });

    this.loadProjects();
    this.loadContractors();
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Construction Projects' },
          ...projs.map(p => ({ value: p.id, label: p.project_name }))
        ];
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractors.set(conts);
        this.contractorOptions = [
          { value: null, label: 'All Trade Contractors' },
          ...conts.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadMetrics(): void {
    this.constructionService.getProjectCompletionMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });
  }

  switchTab(tab: 'DOSSIERS' | 'PUNCHLIST' | 'FINANCIALS'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.refreshCurrentTabData();
  }

  refreshCurrentTabData(): void {
    if (this.activeTab() === 'DOSSIERS' || this.activeTab() === 'FINANCIALS') {
      this.loadCompletions();
    } else if (this.activeTab() === 'PUNCHLIST') {
      this.loadPunchlists();
    }
  }

  loadCompletions(): void {
    this.isLoading.set(true);
    const offset = (this.completionsPage() - 1) * this.completionsPageSize();
    const filters: any = {
      limit: this.completionsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedStageStatus()) filters.stage_status = this.selectedStageStatus();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getProjectCompletionsPaged(filters).subscribe({
      next: (res) => {
        this.completions.set(res.items);
        this.completionsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadPunchlists(): void {
    this.isLoading.set(true);
    const offset = (this.punchlistsPage() - 1) * this.punchlistsPageSize();
    const filters: any = {
      limit: this.punchlistsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedSeverity()) filters.severity = this.selectedSeverity();
    if (this.selectedPunchlistStatus()) filters.status = this.selectedPunchlistStatus();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getPunchlistItemsPaged(filters).subscribe({
      next: (res) => {
        this.punchlists.set(res.items);
        this.punchlistsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Quick Sign-Off Modal
  openSignoffModal(comp: ProjectCompletion): void {
    this.selectedCompletionForSignoff.set(comp);
    this.modalSignoffRole.set(comp.project_manager_signoff ? 'PROJECT_DIRECTOR' : 'PROJECT_MANAGER');
    this.modalSignerName.set(comp.project_manager_signoff ? 'Director Khondokar (Managing Director)' : 'Engr. Tanvir Ahmed (Project Manager)');
    this.modalRemarks.set('');
    this.modalForceAllowSnags.set(false);
    this.signoffErrorMessage.set('');
    this.isSignoffModalOpen.set(true);
  }

  closeSignoffModal(): void {
    this.isSignoffModalOpen.set(false);
    this.selectedCompletionForSignoff.set(null);
    this.signoffErrorMessage.set('');
  }

  submitSignoff(): void {
    const comp = this.selectedCompletionForSignoff();
    if (!comp || !comp.id) return;

    this.isSubmittingSignoff.set(true);
    this.signoffErrorMessage.set('');

    this.constructionService.signoffProjectCompletion(comp.id, {
      signoff_role: this.modalSignoffRole(),
      signer_name: this.modalSignerName(),
      remarks: this.modalRemarks(),
      force_allow_minor_snags: this.modalForceAllowSnags()
    }).subscribe({
      next: () => {
        this.isSubmittingSignoff.set(false);
        this.closeSignoffModal();
        this.loadCompletions();
        this.loadMetrics();
      },
      error: (err) => {
        this.isSubmittingSignoff.set(false);
        this.signoffErrorMessage.set(err.error?.detail || 'Sign-off rejected: Mandatory items or critical snags are still open.');
      }
    });
  }

  deleteCompletion(comp: ProjectCompletion): void {
    if (!comp.id || !confirm(`Delete completion closeout record #${comp.completion_code}?`)) return;
    this.constructionService.deleteProjectCompletion(comp.id).subscribe({
      next: () => {
        this.loadCompletions();
        this.loadMetrics();
      }
    });
  }

  deletePunchlist(snag: PunchlistItem): void {
    if (!snag.id || !confirm(`Delete snag item #${snag.item_code}?`)) return;
    this.constructionService.deletePunchlistItem(snag.id).subscribe({
      next: () => {
        this.loadPunchlists();
        this.loadMetrics();
      }
    });
  }

  onFilterChange(): void {
    this.completionsPage.set(1);
    this.punchlistsPage.set(1);
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  changePage(delta: number): void {
    if (this.activeTab() === 'DOSSIERS' || this.activeTab() === 'FINANCIALS') {
      const p = this.completionsPage() + delta;
      if (p >= 1 && p <= this.completionsTotalPages()) {
        this.completionsPage.set(p);
        this.loadCompletions();
      }
    } else if (this.activeTab() === 'PUNCHLIST') {
      const p = this.punchlistsPage() + delta;
      if (p >= 1 && p <= this.punchlistsTotalPages()) {
        this.punchlistsPage.set(p);
        this.loadPunchlists();
      }
    }
  }
}
