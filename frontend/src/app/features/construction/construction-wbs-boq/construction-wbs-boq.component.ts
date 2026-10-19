import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { 
  WBSNode, 
  WBSMetrics, 
  ProjectCalendar, 
  BOQItemBudgetLock, 
  BOQMetrics,
  VariationOrder 
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-wbs-boq',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-wbs-boq.component.html',
  styleUrls: ['./construction-wbs-boq.component.css']
})
export class ConstructionWbsBoqComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Active Tab: WBS, Deliverable Tree, Project Calendar, BOQ Master Scope, BOQ Budget Locks, Variation Orders
  activeTab = signal<'WBS_TABLE' | 'WBS_TREE' | 'CALENDAR' | 'BOQ_MASTER' | 'BOQ_LOCKS' | 'VARIATION_ORDERS'>('WBS_TABLE');

  // Projects State
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedProjectName = signal<string>('');
  projectOptions: { value: any; label: string }[] = [];

  // WBS Server-Paged List State
  wbsNodes = signal<WBSNode[]>([]);
  wbsTree = signal<WBSNode[]>([]);
  totalCount = signal<number>(0);
  pageSize = signal<number>(15);
  currentPage = signal<number>(1);
  searchTerm = signal<string>('');
  filterPhase = signal<string>('');
  filterTier = signal<string>('');
  filterStatus = signal<string>('');
  filterCritical = signal<string>('');

  // WBS Schedule Metrics
  metrics = signal<WBSMetrics | null>(null);

  // Project Calendar State
  projectCalendar = signal<ProjectCalendar | null>(null);
  isSavingCalendar = signal<boolean>(false);

  // BOQ Master Server-Paged List State
  boqItemsPaged = signal<BOQItemBudgetLock[]>([]);
  boqTotalCount = signal<number>(0);
  boqPageSize = signal<number>(15);
  boqCurrentPage = signal<number>(1);
  boqSearchTerm = signal<string>('');
  boqFilterPhase = signal<string>('');
  boqFilterCategory = signal<string>('');
  boqFilterStage = signal<string>('');
  boqFilterLock = signal<string>('');

  // BOQ Executive Metrics (Tender vs Contract vs Actuals & Cost Variance)
  boqMetrics = signal<BOQMetrics | null>(null);

  // Selected BOQ item for Rate Analysis & Specifications Drawer
  selectedBOQForDetails = signal<BOQItemBudgetLock | null>(null);
  isBOQDetailsModalOpen = signal<boolean>(false);

  // BOQ Budget Locks & VO State
  boqItems = signal<BOQItemBudgetLock[]>([]);
  variationOrders = signal<VariationOrder[]>([]);

  isLoading = signal<boolean>(false);

  // Progress Update Modal State
  isProgressModalOpen = signal<boolean>(false);
  selectedNodeForProgress = signal<WBSNode | null>(null);
  isUpdatingProgress = signal<boolean>(false);
  progressVerifiedQty = signal<number>(0);
  progressApprovedQty = signal<number>(0);
  progressPercentage = signal<number>(0);
  progressStatus = signal<string>('IN_PROGRESS');
  progressActualStart = signal<string>('');
  progressActualEnd = signal<string>('');
  progressDelayDays = signal<number>(0);
  progressDelayReason = signal<string>('');
  progressCorrectiveAction = signal<string>('');
  progressWeatherConstraints = signal<string>('');
  progressSiteConstraints = signal<string>('');
  progressForecastedDate = signal<string>('');
  progressRemarks = signal<string>('');

  // Computed BOQ KPIs
  totalBOQBudget = computed(() => {
    return this.boqItems().reduce((acc, curr) => acc + (curr.estimated_quantity * curr.estimated_unit_rate), 0);
  });

  totalRequisitioned = computed(() => {
    return this.boqItems().reduce((acc, curr) => acc + ((curr.requisitioned_quantity || 0) * curr.estimated_unit_rate), 0);
  });

  hardLockedCount = computed(() => {
    return this.boqItems().filter(i => i.is_locked).length;
  });

  // Total pages for WBS
  totalPages = computed(() => {
    const total = this.totalCount();
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  // Total pages for BOQ
  boqTotalPages = computed(() => {
    const total = this.boqTotalCount();
    const size = this.boqPageSize();
    return Math.ceil(total / size) || 1;
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
        if (projs.length > 0) {
          this.selectedProjectId.set(projs[0].id);
          this.selectedProjectName.set(projs[0].project_name);
          this.loadAllProjectData(projs[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectChange(projectId: any): void {
    if (projectId) {
      const pid = Number(projectId);
      this.selectedProjectId.set(pid);
      const proj = this.projects().find(p => p.id === pid);
      if (proj) {
        this.selectedProjectName.set(proj.project_name);
      }
      this.currentPage.set(1);
      this.boqCurrentPage.set(1);
      this.loadAllProjectData(pid);
    }
  }

  loadAllProjectData(projectId: number): void {
    this.loadPagedWBS(projectId);
    this.loadWBSTree(projectId);
    this.loadWBSMetrics(projectId);
    this.loadProjectCalendar(projectId);
    this.loadPagedBOQ(projectId);
    this.loadBOQMetrics(projectId);
    this.loadBOQData(projectId);
  }

  loadPagedWBS(projectId?: number): void {
    const pid = projectId ?? this.selectedProjectId();
    if (!pid) return;

    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    const filters: any = {
      project_id: pid,
      limit: this.pageSize(),
      offset: offset
    };

    if (this.searchTerm().trim()) filters.search = this.searchTerm().trim();
    if (this.filterPhase()) filters.phase_category = this.filterPhase();
    if (this.filterTier()) filters.wbs_tier = this.filterTier();
    if (this.filterStatus()) filters.status = this.filterStatus();
    if (this.filterCritical() === 'CRITICAL') filters.is_critical_path = true;
    if (this.filterCritical() === 'MILESTONE') filters.is_milestone = true;

    this.constructionService.getWBSNodesPaged(filters).subscribe({
      next: (res) => {
        this.wbsNodes.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadWBSTree(projectId: number): void {
    this.constructionService.getWBSNodes({ project_id: projectId, as_tree: true }).subscribe({
      next: (tree) => this.wbsTree.set(tree)
    });
  }

  loadWBSMetrics(projectId: number): void {
    this.constructionService.getWBSMetrics(projectId).subscribe({
      next: (met) => this.metrics.set(met),
      error: () => this.metrics.set(null)
    });
  }

  loadProjectCalendar(projectId: number): void {
    this.constructionService.getProjectCalendar(projectId).subscribe({
      next: (cal) => this.projectCalendar.set(cal),
      error: () => this.projectCalendar.set(null)
    });
  }

  // --- BOQ Master Data Methods ---
  loadPagedBOQ(projectId?: number): void {
    const pid = projectId ?? this.selectedProjectId();
    if (!pid) return;

    this.isLoading.set(true);
    const offset = (this.boqCurrentPage() - 1) * this.boqPageSize();

    const filters: any = {
      project_id: pid,
      limit: this.boqPageSize(),
      offset: offset
    };

    if (this.boqSearchTerm().trim()) filters.search = this.boqSearchTerm().trim();
    if (this.boqFilterPhase()) filters.wbs_phase_id = this.boqFilterPhase();
    if (this.boqFilterCategory()) filters.material_category_id = this.boqFilterCategory();
    if (this.boqFilterStage()) filters.stage = this.boqFilterStage();
    if (this.boqFilterLock() === 'LOCKED') filters.is_locked = true;
    if (this.boqFilterLock() === 'UNLOCKED') filters.is_locked = false;

    this.constructionService.getBOQItemsPaged(filters).subscribe({
      next: (res) => {
        this.boqItemsPaged.set(res.items);
        this.boqTotalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadBOQMetrics(projectId: number): void {
    this.constructionService.getBOQMetrics(projectId).subscribe({
      next: (met) => this.boqMetrics.set(met),
      error: () => this.boqMetrics.set(null)
    });
  }

  loadBOQData(projectId: number): void {
    this.constructionService.getBOQBudgetLocks({ project_id: projectId }).subscribe({
      next: (items) => this.boqItems.set(items)
    });

    this.constructionService.getVariationOrders({ project_id: projectId }).subscribe({
      next: (vos) => this.variationOrders.set(vos)
    });
  }

  setTab(tab: 'WBS_TABLE' | 'WBS_TREE' | 'CALENDAR' | 'BOQ_MASTER' | 'BOQ_LOCKS' | 'VARIATION_ORDERS'): void {
    this.activeTab.set(tab);
    if (tab === 'WBS_TREE' && this.selectedProjectId()) {
      this.loadWBSTree(this.selectedProjectId()!);
    } else if (tab === 'CALENDAR' && this.selectedProjectId()) {
      this.loadProjectCalendar(this.selectedProjectId()!);
    } else if (tab === 'BOQ_MASTER' && this.selectedProjectId()) {
      this.loadPagedBOQ(this.selectedProjectId()!);
      this.loadBOQMetrics(this.selectedProjectId()!);
    }
  }

  // WBS Pagination & Filters
  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadPagedWBS();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadPagedWBS();
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.filterPhase.set('');
    this.filterTier.set('');
    this.filterStatus.set('');
    this.filterCritical.set('');
    this.currentPage.set(1);
    this.loadPagedWBS();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadPagedWBS();
    }
  }

  // BOQ Pagination & Filters
  onBOQSearchChange(): void {
    this.boqCurrentPage.set(1);
    this.loadPagedBOQ();
  }

  onBOQFilterChange(): void {
    this.boqCurrentPage.set(1);
    this.loadPagedBOQ();
  }

  resetBOQFilters(): void {
    this.boqSearchTerm.set('');
    this.boqFilterPhase.set('');
    this.boqFilterCategory.set('');
    this.boqFilterStage.set('');
    this.boqFilterLock.set('');
    this.boqCurrentPage.set(1);
    this.loadPagedBOQ();
  }

  goToBOQPage(page: number): void {
    if (page >= 1 && page <= this.boqTotalPages()) {
      this.boqCurrentPage.set(page);
      this.loadPagedBOQ();
    }
  }

  // Navigation handlers
  navigateToAddWBS(): void {
    this.router.navigate(['/construction/wbs-boq/wbs-create']);
  }

  navigateToEditWBS(nodeId: number): void {
    this.router.navigate(['/construction/wbs-boq/wbs-edit', nodeId]);
  }

  navigateToAddBOQ(): void {
    this.router.navigate(['/construction/wbs-boq/boq-create']);
  }

  navigateToEditBOQ(boqId: number): void {
    this.router.navigate(['/construction/wbs-boq/boq-edit', boqId]);
  }

  navigateToCreateVO(): void {
    this.router.navigate(['/construction/wbs-boq/vo-create']);
  }

  // BOQ Actions (Lock, Unlock, Delete, View Details)
  lockBOQItem(item: BOQItemBudgetLock): void {
    const engineer = prompt('Enter authorizing engineer / consultant name:', 'Engr. Mainul Hossain, Chief Consultant');
    if (!engineer) return;

    this.constructionService.lockBOQItem(item.id, engineer).subscribe({
      next: () => {
        this.loadPagedBOQ();
        if (this.selectedProjectId()) {
          this.loadBOQMetrics(this.selectedProjectId()!);
        }
      }
    });
  }

  unlockBOQItem(item: BOQItemBudgetLock): void {
    if (!confirm(`Are you sure you want to unlock BOQ item "${item.item_code} - ${item.item_description}" for quantity revision?`)) {
      return;
    }

    this.constructionService.unlockBOQItem(item.id).subscribe({
      next: () => {
        this.loadPagedBOQ();
        if (this.selectedProjectId()) {
          this.loadBOQMetrics(this.selectedProjectId()!);
        }
      }
    });
  }

  deleteBOQItem(item: BOQItemBudgetLock): void {
    if (!confirm(`Are you sure you want to delete BOQ Item "${item.item_code} - ${item.item_description}"?`)) {
      return;
    }

    this.constructionService.deleteBOQItem(item.id).subscribe({
      next: () => {
        this.loadPagedBOQ();
        if (this.selectedProjectId()) {
          this.loadBOQMetrics(this.selectedProjectId()!);
          this.loadBOQData(this.selectedProjectId()!);
        }
      },
      error: (err) => {
        alert(err?.error?.detail || 'Cannot delete BOQ item with recorded requisitions.');
      }
    });
  }

  openBOQDetailsModal(item: BOQItemBudgetLock): void {
    this.selectedBOQForDetails.set(item);
    this.isBOQDetailsModalOpen.set(true);
  }

  closeBOQDetailsModal(): void {
    this.isBOQDetailsModalOpen.set(false);
    this.selectedBOQForDetails.set(null);
  }

  deleteWBSNode(node: WBSNode): void {
    if (!confirm(`Are you sure you want to delete WBS Node "${node.node_code} - ${node.node_name}" and all sub-tasks?`)) {
      return;
    }

    this.constructionService.deleteWBSNode(node.id).subscribe({
      next: () => {
        this.loadPagedWBS();
        if (this.selectedProjectId()) {
          this.loadWBSMetrics(this.selectedProjectId()!);
          this.loadWBSTree(this.selectedProjectId()!);
        }
      }
    });
  }

  // --- Quick Progress Update Modal Actions ---
  openProgressModal(node: WBSNode): void {
    this.selectedNodeForProgress.set(node);
    this.progressVerifiedQty.set(node.verified_completed_quantity || 0);
    this.progressApprovedQty.set(node.approved_total_quantity || 0);
    this.progressPercentage.set(node.progress_percentage || 0);
    this.progressStatus.set(node.status || 'IN_PROGRESS');
    this.progressActualStart.set(node.actual_start_date || '');
    this.progressActualEnd.set(node.actual_end_date || '');
    this.progressDelayDays.set(node.delay_days || 0);
    this.progressDelayReason.set(node.delay_reason || '');
    this.progressCorrectiveAction.set(node.corrective_action || '');
    this.progressWeatherConstraints.set(node.weather_constraints || '');
    this.progressSiteConstraints.set(node.site_constraints || '');
    this.progressForecastedDate.set(node.forecasted_end_date || '');
    this.progressRemarks.set('');
    this.isProgressModalOpen.set(true);
  }

  closeProgressModal(): void {
    this.isProgressModalOpen.set(false);
    this.selectedNodeForProgress.set(null);
  }

  onVerifiedQtyChange(val: any): void {
    const v = Number(val) || 0;
    this.progressVerifiedQty.set(v);
    const app = this.progressApprovedQty();
    if (app > 0) {
      const pct = Math.min(100.0, Math.round((v / app) * 1000) / 10);
      this.progressPercentage.set(pct);
      if (pct >= 100.0) {
        this.progressStatus.set('COMPLETED');
      }
    }
  }

  submitProgressUpdate(): void {
    const node = this.selectedNodeForProgress();
    if (!node) return;

    this.isUpdatingProgress.set(true);
    const payload = {
      verified_completed_quantity: Number(this.progressVerifiedQty()),
      approved_total_quantity: Number(this.progressApprovedQty()),
      progress_percentage: Number(this.progressPercentage()),
      status: this.progressStatus(),
      actual_start_date: this.progressActualStart() || null,
      actual_end_date: this.progressActualEnd() || null,
      delay_days: Number(this.progressDelayDays()) || 0,
      delay_reason: this.progressDelayReason() || null,
      corrective_action: this.progressCorrectiveAction() || null,
      weather_constraints: this.progressWeatherConstraints() || null,
      site_constraints: this.progressSiteConstraints() || null,
      forecasted_end_date: this.progressForecastedDate() || null,
      remarks: this.progressRemarks() || null
    };

    this.constructionService.updateWBSProgress(node.id, payload).subscribe({
      next: () => {
        this.isUpdatingProgress.set(false);
        this.closeProgressModal();
        this.loadPagedWBS();
        if (this.selectedProjectId()) {
          this.loadWBSMetrics(this.selectedProjectId()!);
        }
      },
      error: () => this.isUpdatingProgress.set(false)
    });
  }

  // --- Project Calendar Saving ---
  saveCalendar(): void {
    const cal = this.projectCalendar();
    const pid = this.selectedProjectId();
    if (!cal || !pid) return;

    this.isSavingCalendar.set(true);
    this.constructionService.updateProjectCalendar(pid, cal).subscribe({
      next: (res) => {
        this.projectCalendar.set(res);
        this.isSavingCalendar.set(false);
        alert('Project Master Calendar updated successfully!');
      },
      error: () => this.isSavingCalendar.set(false)
    });
  }

  addHoliday(): void {
    const cal = this.projectCalendar();
    if (!cal) return;
    const h = [...(cal.holidays || []), { date: new Date().toISOString().split('T')[0], name: 'Official Holiday' }];
    this.projectCalendar.set({ ...cal, holidays: h });
  }

  removeHoliday(index: number): void {
    const cal = this.projectCalendar();
    if (!cal || !cal.holidays) return;
    const h = cal.holidays.filter((_, i) => i !== index);
    this.projectCalendar.set({ ...cal, holidays: h });
  }

  addShift(): void {
    const cal = this.projectCalendar();
    if (!cal) return;
    const s = [...(cal.shifts || []), { name: 'Special Shift', start_time: '14:00', end_time: '22:00', is_default: false }];
    this.projectCalendar.set({ ...cal, shifts: s });
  }

  removeShift(index: number): void {
    const cal = this.projectCalendar();
    if (!cal || !cal.shifts) return;
    const s = cal.shifts.filter((_, i) => i !== index);
    this.projectCalendar.set({ ...cal, shifts: s });
  }
}
