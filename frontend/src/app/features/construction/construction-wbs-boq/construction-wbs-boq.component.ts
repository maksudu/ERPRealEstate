import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  WBSNode,
  BOQItemBudgetLock,
  VariationOrder
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-wbs-boq',
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
  templateUrl: './construction-wbs-boq.component.html',
  styleUrls: ['./construction-wbs-boq.component.css']
})
export class ConstructionWbsBoqComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Tab: 'WBS' | 'BOQ' | 'VARIATION_ORDERS'
  activeTab = signal<'WBS' | 'BOQ' | 'VARIATION_ORDERS'>('WBS');

  // Data signals
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  wbsNodes = signal<WBSNode[]>([]);
  wbsTree = signal<WBSNode[]>([]);
  boqItems = signal<BOQItemBudgetLock[]>([]);
  variationOrders = signal<VariationOrder[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreateWBSModalOpen = signal<boolean>(false);
  isUpdateProgressModalOpen = signal<boolean>(false);
  isRequisitionModalOpen = signal<boolean>(false);
  isCreateVOModalOpen = signal<boolean>(false);

  // Selected entities for modals
  selectedWBSNode = signal<WBSNode | null>(null);
  selectedBOQItem = signal<BOQItemBudgetLock | null>(null);

  // Pre-flight check result
  requisitionCheckResult = signal<any | null>(null);

  // Forms
  wbsForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    tower_id: [null],
    parent_id: [null],
    node_code: ['', Validators.required],
    node_name: ['', Validators.required],
    wbs_tier: ['ACTIVITY', Validators.required],
    phase_category: ['SUBSTRUCTURE', Validators.required],
    activity_type: ['PILING'],
    planned_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    planned_end_date: [new Date().toISOString().split('T')[0], Validators.required],
    weightage_percentage: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    responsible_engineer: [''],
    remarks: ['']
  });

  progressForm: FormGroup = this.fb.group({
    progress_percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    actual_start_date: [''],
    actual_end_date: [''],
    status: ['IN_PROGRESS'],
    remarks: ['']
  });

  requisitionForm: FormGroup = this.fb.group({
    requested_quantity: [0, [Validators.required, Validators.min(0.01)]],
    requisition_memo_no: ['']
  });

  voForm: FormGroup = this.fb.group({
    boq_item_id: [null, Validators.required],
    additional_quantity: [100, [Validators.required, Validators.min(0.01)]],
    revised_rate: [null],
    reason: ['', Validators.required]
  });

  // Dropdown Options
  phaseOptions = [
    { value: 'SUBSTRUCTURE', label: 'Substructure Works (Foundation & Basement)' },
    { value: 'SUPERSTRUCTURE', label: 'Superstructure Reinforced Concrete Framing' },
    { value: 'FINISHING', label: 'Architectural Finishing & Masonry' },
    { value: 'MEP', label: 'Mechanical, Electrical & Plumbing (MEP)' }
  ];

  tierOptions = [
    { value: 'PHASE', label: 'Level 1: Main Project Phase' },
    { value: 'SUB_PHASE', label: 'Level 2: Structural Sub-Phase' },
    { value: 'ACTIVITY', label: 'Level 3: Trade Activity Master' },
    { value: 'TASK', label: 'Level 4: Detailed Site Task' }
  ];

  activityOptions = [
    { value: 'PILING', label: 'Cast-in-situ Bored Piling' },
    { value: 'MAT_CASTING', label: 'Raft / Mat Foundation Casting' },
    { value: 'COLUMN', label: 'Columns & Shear Walls' },
    { value: 'BEAM_SLAB', label: 'Post-Tensioned Beams & Slabs' },
    { value: 'BRICKWORK', label: 'AAC Block & Brick Masonry' },
    { value: 'PLASTER', label: 'Internal / External Plaster' },
    { value: 'TILES', label: 'Vitrified Tiles & Marble' },
    { value: 'MEP', label: 'Concealed Conduit & Sanitary Rough-in' }
  ];

  statusOptions = [
    { value: 'NOT_STARTED', label: 'Not Started (অপেক্ষমান)' },
    { value: 'IN_PROGRESS', label: 'In Progress (চলমান)' },
    { value: 'COMPLETED', label: 'Completed (সম্পূর্ণ)' },
    { value: 'DELAYED', label: 'Delayed (বিলম্বিত)' },
    { value: 'CRITICAL_PATH', label: 'Critical Path (জরুরী পর্যায়)' }
  ];

  // Computed metrics
  totalBOQBudget = computed(() => {
    return this.boqItems().reduce((sum, item) => sum + (Number(item.total_estimated_cost) || 0), 0);
  });

  totalRequisitionedCost = computed(() => {
    return this.boqItems().reduce((sum, item) => {
      const rate = Number(item.estimated_unit_rate) || 0;
      const req = Number(item.requisitioned_quantity) || 0;
      return sum + (rate * req);
    }, 0);
  });

  lockedItemsCount = computed(() => {
    return this.boqItems().filter(b => b.is_locked).length;
  });

  totalVOQuantity = computed(() => {
    return this.boqItems().reduce((sum, item) => sum + (Number(item.variation_order_quantity) || 0), 0);
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        if (projs.length > 0) {
          this.selectedProjectId.set(projs[0].id);
          this.loadWBSAndBOQ(projs[0].id);
        }
      }
    });
  }

  onProjectChange(projectId: number): void {
    this.selectedProjectId.set(projectId);
    this.loadWBSAndBOQ(projectId);
  }

  loadWBSAndBOQ(projectId: number): void {
    this.isLoading.set(true);

    // 1. Load WBS tree
    this.constructionService.getWBSNodes({ project_id: projectId, as_tree: true }).subscribe({
      next: (tree) => {
        this.wbsTree.set(tree);
      }
    });

    // 2. Load flat WBS nodes for parent selectors
    this.constructionService.getWBSNodes({ project_id: projectId }).subscribe({
      next: (nodes) => {
        this.wbsNodes.set(nodes);
      }
    });

    // 3. Load BOQ budget locks
    this.constructionService.getBOQBudgetLocks({ project_id: projectId }).subscribe({
      next: (items) => {
        this.boqItems.set(items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // 4. Load Variation Orders
    this.constructionService.getVariationOrders({ project_id: projectId }).subscribe({
      next: (vos) => {
        this.variationOrders.set(vos);
      }
    });
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  get parentWBSOptions() {
    return [
      { value: null, label: 'None (Top-Level Phase Root)' },
      ...this.wbsNodes().map(n => ({
        value: n.id,
        label: `[${n.node_code}] ${n.node_name} (${n.wbs_tier})`
      }))
    ];
  }

  get boqItemOptions() {
    return this.boqItems().map(b => ({
      value: b.id,
      label: `[${b.item_code || 'BOQ'}] ${b.item_description} (Est: ${b.estimated_quantity} ${b.unit_of_measure_id})`
    }));
  }

  // --- WBS Actions ---
  openCreateWBSModal(): void {
    this.wbsForm.reset({
      project_id: this.selectedProjectId(),
      parent_id: null,
      node_code: `WBS-${Date.now().toString().slice(-4)}`,
      node_name: '',
      wbs_tier: 'ACTIVITY',
      phase_category: 'SUBSTRUCTURE',
      activity_type: 'PILING',
      planned_start_date: new Date().toISOString().split('T')[0],
      planned_end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      weightage_percentage: 10,
      responsible_engineer: '',
      remarks: ''
    });
    this.isCreateWBSModalOpen.set(true);
  }

  submitWBSNode(): void {
    if (this.wbsForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createWBSNode(this.wbsForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isCreateWBSModalOpen.set(false);
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openUpdateProgressModal(node: WBSNode): void {
    this.selectedWBSNode.set(node);
    this.progressForm.reset({
      progress_percentage: node.progress_percentage || 0,
      actual_start_date: node.actual_start_date || '',
      actual_end_date: node.actual_end_date || '',
      status: node.status || 'IN_PROGRESS',
      remarks: ''
    });
    this.isUpdateProgressModalOpen.set(true);
  }

  submitProgressUpdate(): void {
    const node = this.selectedWBSNode();
    if (!node || this.progressForm.invalid) return;

    this.isSubmitting.set(true);
    this.constructionService.updateWBSProgress(node.id, this.progressForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isUpdateProgressModalOpen.set(false);
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // --- BOQ Requisition & Hard Budget Lock ---
  openRequisitionModal(item: BOQItemBudgetLock): void {
    this.selectedBOQItem.set(item);
    this.requisitionCheckResult.set(null);
    this.requisitionForm.reset({
      requested_quantity: 0,
      requisition_memo_no: `MEMO-${Date.now().toString().slice(-4)}`
    });
    this.isRequisitionModalOpen.set(true);
  }

  onRequisitionQtyChange(): void {
    const item = this.selectedBOQItem();
    const qty = Number(this.requisitionForm.get('requested_quantity')?.value) || 0;
    if (!item || qty <= 0) {
      this.requisitionCheckResult.set(null);
      return;
    }

    this.constructionService.checkBOQBudgetLock({
      boq_item_id: item.id,
      requested_quantity: qty,
      requisition_memo_no: this.requisitionForm.get('requisition_memo_no')?.value
    }).subscribe({
      next: (res) => this.requisitionCheckResult.set(res)
    });
  }

  submitRequisition(): void {
    const item = this.selectedBOQItem();
    if (!item || this.requisitionForm.invalid) return;

    this.isSubmitting.set(true);
    this.constructionService.processBOQRequisition({
      boq_item_id: item.id,
      requested_quantity: Number(this.requisitionForm.get('requested_quantity')?.value),
      requisition_memo_no: this.requisitionForm.get('requisition_memo_no')?.value
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isRequisitionModalOpen.set(false);
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Requisition failed due to Hard Budget Lock!');
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      }
    });
  }

  // --- Variation Orders ---
  openCreateVOModal(item?: BOQItemBudgetLock): void {
    this.voForm.reset({
      boq_item_id: item ? item.id : (this.boqItems()[0]?.id || null),
      additional_quantity: 100,
      revised_rate: item ? item.estimated_unit_rate : null,
      reason: ''
    });
    this.isCreateVOModalOpen.set(true);
  }

  submitVariationOrder(): void {
    if (this.voForm.invalid || !this.selectedProjectId()) return;

    this.isSubmitting.set(true);
    const payload = {
      ...this.voForm.value,
      project_id: this.selectedProjectId()
    };

    this.constructionService.createVariationOrder(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isCreateVOModalOpen.set(false);
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  approveVO(vo: VariationOrder): void {
    if (!confirm(`Are you sure you want to approve Variation Order ${vo.vo_number} for ${vo.additional_quantity} units? This will immediately unlock BOQ headroom.`)) {
      return;
    }

    this.constructionService.approveVariationOrder(vo.id, {
      approved_by_pm: 'Engr. Project Director',
      status: 'APPROVED',
      approval_notes: 'Approved via Construction Management Cockpit.'
    }).subscribe({
      next: () => {
        if (this.selectedProjectId()) {
          this.loadWBSAndBOQ(this.selectedProjectId()!);
        }
      }
    });
  }
}
