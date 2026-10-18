import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { WBSNode, BOQItemBudgetLock, VariationOrder } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
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
    SearchableSelectComponent
  ],
  templateUrl: './construction-wbs-boq.component.html',
  styleUrls: ['./construction-wbs-boq.component.css']
})
export class ConstructionWbsBoqComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  activeTab = signal<'WBS' | 'BOQ' | 'VARIATION_ORDERS'>('WBS');

  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  wbsNodes = signal<WBSNode[]>([]);
  wbsTree = signal<WBSNode[]>([]);
  boqItems = signal<BOQItemBudgetLock[]>([]);
  variationOrders = signal<VariationOrder[]>([]);

  isLoading = signal<boolean>(false);
  projectOptions: { value: any; label: string }[] = [];

  // Computed KPI Metrics
  totalBOQBudget = computed(() => {
    return this.boqItems().reduce((acc, curr) => acc + (curr.estimated_quantity * curr.estimated_unit_rate), 0);
  });

  totalRequisitioned = computed(() => {
    return this.boqItems().reduce((acc, curr) => acc + ((curr.requisitioned_quantity || 0) * curr.estimated_unit_rate), 0);
  });

  hardLockedCount = computed(() => {
    return this.boqItems().filter(i => i.is_locked).length;
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
          this.loadProjectData(projs[0].id);
        } else {
          this.isLoading.set(false);
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadProjectData(projectId: number): void {
    this.isLoading.set(true);

    // 1. Load WBS Nodes (Flat and Tree)
    this.constructionService.getWBSNodes({ project_id: projectId }).subscribe({
      next: (nodes) => this.wbsNodes.set(nodes)
    });

    this.constructionService.getWBSNodes({ project_id: projectId, as_tree: true }).subscribe({
      next: (tree) => this.wbsTree.set(tree)
    });

    // 2. Load BOQ Budget Locks
    this.constructionService.getBOQBudgetLocks({ project_id: projectId }).subscribe({
      next: (items) => this.boqItems.set(items)
    });

    // 3. Load Variation Orders
    this.constructionService.getVariationOrders({ project_id: projectId }).subscribe({
      next: (vos) => {
        this.variationOrders.set(vos);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectChange(projectId: any): void {
    if (projectId) {
      this.selectedProjectId.set(Number(projectId));
      this.loadProjectData(Number(projectId));
    }
  }

  setTab(tab: 'WBS' | 'BOQ' | 'VARIATION_ORDERS'): void {
    this.activeTab.set(tab);
  }

  navigateToAddWBS(): void {
    this.router.navigate(['/construction/wbs-boq/wbs-create']);
  }

  navigateToCreateVO(): void {
    this.router.navigate(['/construction/wbs-boq/vo-create']);
  }

  approveVO(vo: VariationOrder): void {
    this.constructionService.approveVariationOrder(vo.id, {
      approved_by_pm: 'Engr. Project Director',
      status: 'APPROVED',
      approval_notes: 'Approved variance for site operations execution'
    }).subscribe({
      next: () => {
        if (this.selectedProjectId()) {
          this.loadProjectData(this.selectedProjectId()!);
        }
      }
    });
  }
}
