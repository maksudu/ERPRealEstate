import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { DPRReport, DPRMetrics, WeeklyMonthlyProgressReport, DPRFilter } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-dpr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-dpr.component.html'
})
export class ConstructionDprComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Active Main Sub-Tab
  activeTab = signal<'DAILY_DPR' | 'WEEKLY_MONTHLY' | 'EQUIPMENT_LABOR' | 'OFFLINE_SYNC'>('DAILY_DPR');

  // Core Data Signals
  dprReports = signal<DPRReport[]>([]);
  projects = signal<Project[]>([]);
  metrics = signal<DPRMetrics | null>(null);
  progressReport = signal<WeeklyMonthlyProgressReport | null>(null);

  // Connectivity & Offline Sync Signals
  isOnline = signal<boolean>(navigator.onLine);
  offlineQueue = signal<any[]>([]);
  isSyncingBatch = signal<boolean>(false);
  syncFeedback = signal<{ status: string; message: string } | null>(null);

  // Filter States
  selectedProjectId = signal<number | null>(null);
  selectedTowerId = signal<number | null>(null);
  selectedWeather = signal<string>('');
  selectedSupervisorStatus = signal<string>('');
  selectedSyncStatus = signal<string>('');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');
  searchQuery = signal<string>('');

  // Weekly & Monthly Controls
  periodType = signal<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  progressReferenceDate = signal<string>(new Date().toISOString().split('T')[0]);
  isLoadingProgress = signal<boolean>(false);

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);
  totalPages = signal<number>(1);
  isLoading = signal<boolean>(false);

  // Modals & Slide-overs
  inspectDpr = signal<DPRReport | null>(null);
  approvalModalDpr = signal<DPRReport | null>(null);
  approvalAction = signal<'VERIFY_ENGINEER' | 'APPROVE_PM' | 'REJECT_REVISE'>('VERIFY_ENGINEER');
  approvalSupervisorName = signal<string>('Engr. Rafiqul Islam');
  approvalSupervisorRole = signal<string>('Site In-Charge');
  approvalComments = signal<string>('');
  approvalSignature = signal<string>('VERIFIED-ENG-' + Date.now().toString().slice(-4));
  isSubmittingApproval = signal<boolean>(false);

  // Dynamic Options for Selectors
  projectOptions: { value: any; label: string }[] = [];
  towerOptions: { value: any; label: string }[] = [];

  ngOnInit(): void {
    this.setupNetworkListeners();
    this.refreshOfflineQueue();
    this.loadProjects();
    this.loadMetrics();
    this.loadDPRReports();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.refreshOfflineQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  refreshOfflineQueue(): void {
    try {
      const queue = JSON.parse(localStorage.getItem('offline_dpr_queue') || '[]');
      this.offlineQueue.set(queue);
    } catch {
      this.offlineQueue.set([]);
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Projects (Consolidated View)' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
          }))
        ];
      }
    });
  }

  loadMetrics(): void {
    const pId = this.selectedProjectId() || 0;
    this.constructionService.getDPRMetrics(pId).subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadDPRReports(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const filters: DPRFilter = {
      limit: this.pageSize(),
      offset: offset
    };

    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId()!;
    if (this.selectedTowerId()) filters.tower_id = this.selectedTowerId()!;
    if (this.selectedWeather()) filters.weather_condition_id = this.selectedWeather();
    if (this.selectedSupervisorStatus()) filters.supervisor_approval_status = this.selectedSupervisorStatus();
    if (this.selectedSyncStatus()) filters.sync_status = this.selectedSyncStatus();
    if (this.dateFrom()) filters.date_from = this.dateFrom();
    if (this.dateTo()) filters.date_to = this.dateTo();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getDPRReportsPaged(filters).subscribe({
      next: (res) => {
        this.dprReports.set(res.items);
        this.totalRecords.set(res.total);
        this.totalPages.set(Math.ceil(res.total / this.pageSize()) || 1);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Sub-Tab Switcher
  switchTab(tab: 'DAILY_DPR' | 'WEEKLY_MONTHLY' | 'EQUIPMENT_LABOR' | 'OFFLINE_SYNC'): void {
    this.activeTab.set(tab);
    if (tab === 'WEEKLY_MONTHLY') {
      this.loadWeeklyMonthlySummary();
    } else if (tab === 'OFFLINE_SYNC') {
      this.refreshOfflineQueue();
    }
  }

  loadWeeklyMonthlySummary(): void {
    const pId = this.selectedProjectId() || (this.projects().length > 0 ? this.projects()[0].id : 1);
    this.isLoadingProgress.set(true);
    this.constructionService.getWeeklyMonthlyProgressSummary(pId, this.periodType(), this.progressReferenceDate()).subscribe({
      next: (rep) => {
        this.progressReport.set(rep);
        this.isLoadingProgress.set(false);
      },
      error: () => this.isLoadingProgress.set(false)
    });
  }

  onProjectFilterChange(projectId: any): void {
    this.selectedProjectId.set(projectId ? Number(projectId) : null);
    this.currentPage.set(1);
    this.loadDPRReports();
    this.loadMetrics();
    if (this.activeTab() === 'WEEKLY_MONTHLY') {
      this.loadWeeklyMonthlySummary();
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  clearFilters(): void {
    this.selectedProjectId.set(null);
    this.selectedTowerId.set(null);
    this.selectedWeather.set('');
    this.selectedSupervisorStatus.set('');
    this.selectedSyncStatus.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadDPRReports();
    this.loadMetrics();
  }

  // Pagination Handlers
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadDPRReports();
    }
  }

  onPageSizeChange(newSize: any): void {
    this.pageSize.set(Number(newSize));
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  // Navigation
  navigateToCreate(): void {
    this.router.navigate(['/construction/dpr/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/construction/dpr/edit', id]);
  }

  navigateToView(id: number): void {
    this.router.navigate(['/construction/dpr/view', id]);
  }

  // Slide-over Inspector
  openInspectModal(dpr: DPRReport): void {
    this.inspectDpr.set(dpr);
  }

  closeInspectModal(): void {
    this.inspectDpr.set(null);
  }

  // Supervisor Approval Action Modal
  openApprovalModal(dpr: DPRReport): void {
    this.approvalModalDpr.set(dpr);
    this.approvalAction.set('VERIFY_ENGINEER');
    this.approvalComments.set('');
  }

  closeApprovalModal(): void {
    this.approvalModalDpr.set(null);
    this.isSubmittingApproval.set(false);
  }

  submitApprovalAction(): void {
    const dpr = this.approvalModalDpr();
    if (!dpr) return;

    this.isSubmittingApproval.set(true);
    const payload = {
      action: this.approvalAction(),
      supervisor_name: this.approvalSupervisorName(),
      supervisor_role: this.approvalSupervisorRole(),
      comments: this.approvalComments(),
      signature_data: this.approvalSignature()
    };

    this.constructionService.executeDPRApprovalAction(dpr.id, payload).subscribe({
      next: () => {
        this.closeApprovalModal();
        this.loadDPRReports();
        this.loadMetrics();
      },
      error: (err) => {
        this.isSubmittingApproval.set(false);
        alert('Failed to execute supervisor approval: ' + (err?.error?.detail || err?.message));
      }
    });
  }

  // Mobile Offline Sync Actions
  syncAllOfflineDrafts(): void {
    const queue = this.offlineQueue();
    if (queue.length === 0) {
      alert('No offline drafts currently queued.');
      return;
    }

    this.isSyncingBatch.set(true);
    this.syncFeedback.set(null);

    this.constructionService.syncOfflineDPRBatch(queue).subscribe({
      next: (res) => {
        this.isSyncingBatch.set(false);
        this.syncFeedback.set({
          status: res.status,
          message: `Successfully synchronized ${res.synced_count} offline DPR reports. Conflicts detected: ${res.conflicts_count}`
        });
        // Clear successfully synced drafts
        localStorage.removeItem('offline_dpr_queue');
        this.refreshOfflineQueue();
        this.loadDPRReports();
        this.loadMetrics();
      },
      error: (err) => {
        this.isSyncingBatch.set(false);
        alert('Offline Sync Batch failed: ' + (err?.error?.detail || err?.message));
      }
    });
  }

  clearOfflineQueue(): void {
    if (confirm('Are you sure you want to discard all locally stored offline drafts?')) {
      localStorage.removeItem('offline_dpr_queue');
      this.refreshOfflineQueue();
    }
  }

  deleteDPR(id: number): void {
    if (confirm(`Are you sure you want to permanently delete DPR #${id}? This action cannot be undone.`)) {
      this.constructionService.deleteDPRReport(id).subscribe({
        next: () => {
          this.loadDPRReports();
          this.loadMetrics();
        },
        error: (err) => alert('Delete error: ' + (err?.error?.detail || err?.message))
      });
    }
  }
}
