import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower } from '../../../core/models/project.model';
import { WBSNode, BOQItemBudgetLock, SiteMaterialRequisition } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-material-requisition-form',
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
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      <!-- Top Navigation & Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/material-requisitions"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Material Requisitions"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Site Material Requisition
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Indent #' + reqId() : 'New Material Indent' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Site Material Requisition' : 'Create Site Material Requisition & Indent' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <app-custom-button
            variant="outline"
            routerLink="/construction/material-requisitions"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            (btnClick)="onSubmit()"
            [disabled]="reqForm.invalid || isSubmitting()"
            [loading]="isSubmitting()"
            [label]="isEditMode() ? 'Save Changes' : 'Submit Requisition'"
            icon="M5 13l4 4L19 7"
          ></app-custom-button>
        </div>
      </div>

      <!-- Main Form Container -->
      <app-card-container [hasHeader]="false">
        <form [formGroup]="reqForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6">

          <!-- Section 1: Project, Tower & Activity Scoping -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 class="text-base font-semibold text-foreground">Project, Location & WBS Scope</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Project *</label>
                <app-searchable-select
                  [options]="projectOptions()"
                  formControlName="project_id"
                  placeholder="Select Project"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Building / Tower</label>
                <app-searchable-select
                  [options]="towerOptions()"
                  formControlName="tower_id"
                  placeholder="Select Tower (Optional)"
                  [allowCreateNew]="true"
                  categoryCode="PROJECT_TOWER"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="Floor / Elevation"
                  formControlName="floor_number"
                  placeholder="e.g. 5th Floor, Basement 1"
                  hint="Work location on site"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Work Package *</label>
                <app-searchable-select
                  categoryCode="MATERIAL_WORK_PACKAGE"
                  formControlName="work_package"
                  placeholder="Select Work Package"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">WBS Milestone / Activity Node</label>
                <app-searchable-select
                  [options]="wbsNodeOptions()"
                  formControlName="wbs_node_id"
                  placeholder="Select Linked WBS Node"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
            </div>
          </div>

          <div class="border-t border-border"></div>

          <!-- Section 2: Material Item & BOQ Budget Link -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h2 class="text-base font-semibold text-foreground">Material Selection & BOQ Ceiling Check</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Material Catalog SKU *</label>
                <app-searchable-select
                  [options]="materialOptions()"
                  formControlName="material_id"
                  placeholder="Search Material Catalog..."
                  [allowCreateNew]="true"
                  categoryCode="MATERIAL_ITEM_MASTER"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Linked BOQ Item (Hard Budget Lock)</label>
                <app-searchable-select
                  [options]="boqItemOptions()"
                  formControlName="boq_item_id"
                  placeholder="Select BOQ Scope Item..."
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
            </div>

            <!-- BOQ Headroom Banner -->
            <div *ngIf="selectedBoqItem()" class="mt-4 p-4 rounded-xl bg-secondary/50 border border-border">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  BOQ Budget Lock Status: {{ selectedBoqItem()?.item_code }}
                </span>
                <span class="text-xs font-mono font-bold text-primary">
                  105% Allowable Ceiling
                </span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span class="text-muted-foreground block">Estimated Qty:</span>
                  <span class="font-semibold text-foreground">{{ selectedBoqItem()?.estimated_quantity | number:'1.2-2' }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground block">Requisitioned So Far:</span>
                  <span class="font-semibold text-foreground">{{ selectedBoqItem()?.requisitioned_quantity | number:'1.2-2' }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground block">Variation Orders:</span>
                  <span class="font-semibold text-foreground">+{{ selectedBoqItem()?.variation_order_quantity | number:'1.2-2' }}</span>
                </div>
                <div>
                  <span class="text-muted-foreground block">Remaining Headroom:</span>
                  <span class="font-bold text-emerald-600 dark:text-emerald-400">
                    {{ selectedBoqItem()?.allowable_quantity || 0 | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <app-custom-input
                  label="Material Code"
                  formControlName="material_code"
                  placeholder="Auto-populated or SKU code"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Grade / Quality"
                  formControlName="grade"
                  placeholder="e.g. 500W Grade 60, 4000 PSI"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Unit of Measurement (UOM) *</label>
                <app-searchable-select
                  categoryCode="UNIT_OF_MEASURE"
                  formControlName="unit_of_measure"
                  placeholder="Select UOM"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>
            </div>

            <div class="mt-4">
              <app-custom-textarea
                label="Detailed Technical Specification"
                formControlName="specification"
                placeholder="Enter testing specifications, standard codes, or delivery requirements..."
                [rows]="2"
              ></app-custom-textarea>
            </div>
          </div>

          <div class="border-t border-border"></div>

          <!-- Section 3: Quantity, Store Stock & Real-time Shortage Check -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 class="text-base font-semibold text-foreground">Requested Quantity & Store Stock Reconciliation</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <app-custom-input
                  label="Requested Quantity *"
                  type="number"
                  formControlName="requested_quantity"
                  placeholder="0.00"
                  hint="Units to indent for site work"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Target Store / Central Warehouse</label>
                <app-searchable-select
                  [options]="storeOptions()"
                  formControlName="store_id"
                  placeholder="Select Store"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="Allowed Site Wastage (%)"
                  type="number"
                  formControlName="allowed_wastage_percentage"
                  placeholder="2.50"
                  hint="Standard cutting/handling tolerance"
                ></app-custom-input>
              </div>
            </div>

            <!-- Live Stock vs Shortage Card -->
            <div class="mt-4 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  </div>
                  <div>
                    <span class="text-xs text-muted-foreground block">Real-Time Available Store Stock</span>
                    <span class="text-base font-bold text-foreground">
                      {{ liveStoreStock() | number:'1.2-2' }} {{ reqForm.get('unit_of_measure')?.value || 'Units' }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <div *ngIf="stockShortage() > 0" class="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span>Store Shortage: {{ stockShortage() | number:'1.2-2' }} Units (PR Trigger Available)</span>
                  </div>
                  <div *ngIf="stockShortage() === 0 && (reqForm.get('requested_quantity')?.value || 0) > 0" class="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <span>100% In-Stock & Ready for Immediate Issue</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <app-custom-input
                  label="Required By Date"
                  type="date"
                  formControlName="required_by_date"
                  hint="Target delivery deadline on site"
                ></app-custom-input>
              </div>

              <div>
                <label class="block text-xs font-medium text-foreground mb-1.5">Priority Classification *</label>
                <app-searchable-select
                  categoryCode="REQUISITION_PRIORITY"
                  formControlName="priority"
                  placeholder="Select Priority"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              </div>
            </div>
          </div>

          <div class="border-t border-border"></div>

          <!-- Section 4: Logistics & Notes -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h2 class="text-base font-semibold text-foreground">Logistics, Batch/Lot & Purpose</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <app-custom-input
                  label="Preferred Supplier / Manufacturer"
                  formControlName="supplier_name"
                  placeholder="e.g. BSRM, Shah Cement, Mir Ceramic"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Batch / Heat / Lot Number"
                  formControlName="batch_lot_number"
                  placeholder="e.g. BATCH-2026-08"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Site Storage Location"
                  formControlName="storage_location"
                  placeholder="e.g. Ground Yard A, Level 4 Shed"
                ></app-custom-input>
              </div>
            </div>

            <div class="mt-4">
              <app-custom-textarea
                label="Purpose of Requisition & Engineer Remarks"
                formControlName="purpose_remarks"
                placeholder="Explain the necessity, casting phase, or site requirements..."
                [rows]="3"
              ></app-custom-textarea>
            </div>
          </div>

          <!-- Form Actions Footer -->
          <div class="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <span class="text-xs text-muted-foreground">
              All quantities undergo BOQ ceiling validation and real-time inventory ledger checks.
            </span>
            <div class="flex items-center gap-3 w-full sm:w-auto">
              <app-custom-button
                variant="outline"
                routerLink="/construction/material-requisitions"
                label="Cancel"
                class="w-full sm:w-auto"
              ></app-custom-button>
              <app-custom-button
                variant="primary"
                type="submit"
                [disabled]="reqForm.invalid || isSubmitting()"
                [loading]="isSubmitting()"
                [label]="isEditMode() ? 'Save Changes' : 'Submit Requisition'"
                icon="M5 13l4 4L19 7"
                class="w-full sm:w-auto"
              ></app-custom-button>
            </div>
          </div>

        </form>
      </app-card-container>
    </div>
  `
})
export class MaterialRequisitionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isEditMode = signal<boolean>(false);
  reqId = signal<number | null>(null);
  isSubmitting = signal<boolean>(false);

  projectOptions = signal<{ label: string; value: any }[]>([]);
  towerOptions = signal<{ label: string; value: any }[]>([]);
  wbsNodeOptions = signal<{ label: string; value: any }[]>([]);
  materialOptions = signal<{ label: string; value: any }[]>([]);
  boqItemOptions = signal<{ label: string; value: any }[]>([]);
  storeOptions = signal<{ label: string; value: any }[]>([]);

  selectedBoqItem = signal<any | null>(null);
  liveStoreStock = signal<number>(0);
  stockShortage = signal<number>(0);

  reqForm: FormGroup = this.fb.group({
    project_id: [1, Validators.required],
    tower_id: [null],
    tower_name: [''],
    floor_number: [''],
    work_package: ['CIVIL_STRUCTURE', Validators.required],
    wbs_node_id: [null],
    material_id: [null, Validators.required],
    boq_item_id: [null],
    material_code: [''],
    material_name: [''],
    specification: [''],
    grade: [''],
    unit_of_measure: ['BAG', Validators.required],
    requested_quantity: [0, [Validators.required, Validators.min(0.0001)]],
    allowed_wastage_percentage: [2.50, [Validators.min(0), Validators.max(50)]],
    store_id: [1],
    supplier_name: [''],
    batch_lot_number: [''],
    storage_location: [''],
    required_by_date: [''],
    priority: ['NORMAL', Validators.required],
    purpose_remarks: ['']
  });

  ngOnInit(): void {
    this.loadDropdowns();

    // Check Route Params
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.reqId.set(Number(id));
      this.loadRequisition(Number(id));
    }

    // React to requested_quantity changes
    this.reqForm.get('requested_quantity')?.valueChanges.subscribe(() => {
      this.recalculateShortage();
    });

    // React to material selection
    this.reqForm.get('material_id')?.valueChanges.subscribe(matId => {
      if (matId) {
        this.onMaterialChange(matId);
      }
    });

    // React to BOQ item selection
    this.reqForm.get('boq_item_id')?.valueChanges.subscribe(boqId => {
      if (boqId) {
        this.onBOQItemChange(boqId);
      } else {
        this.selectedBoqItem.set(null);
      }
    });
  }

  loadDropdowns(): void {
    // 1. Projects
    this.projectService.getProjects().subscribe({
      next: (projects: Project[]) => {
        this.projectOptions.set(projects.map(p => ({ label: `${p.project_code} - ${p.project_name}`, value: p.id })));
      }
    });

    // 2. Towers for Project 1
    this.projectService.getTowers(1).subscribe({
      next: (towers: Tower[]) => {
        this.towerOptions.set(towers.map(t => ({ label: `${t.tower_code || ''} ${t.tower_name}`, value: t.id })));
      }
    });

    // 3. WBS Nodes
    this.constructionService.getWBSNodes({ project_id: 1 }).subscribe({
      next: (nodes: WBSNode[]) => {
        this.wbsNodeOptions.set(nodes.map(n => ({ label: `${n.node_code} - ${n.node_name}`, value: n.id })));
      }
    });

    // 4. BOQ Items
    this.constructionService.getBOQItemsPaged({ project_id: 1, limit: 100 }).subscribe({
      next: res => {
        this.boqItemOptions.set(res.items.map(b => ({
          label: `${b.item_code || ''} - ${b.item_description} (${b.unit_of_measure_id})`,
          value: b.id
        })));
      }
    });

    // 5. Material Items & Stores
    this.materialOptions.set([
      { label: 'MAT-REBAR-500W: 500W TMT Deformed Rebar (TON)', value: 1 },
      { label: 'MAT-CEM-PCC: Portland Composite Cement (PCC 42.5N) (BAG)', value: 2 },
      { label: 'MAT-SAND-SYLHET: Sylhet Coarse Sand FM 2.5 (CFT)', value: 3 },
      { label: 'MAT-STONE-CHIPS: 20mm Down Black Bholaganj Stone Chips (CFT)', value: 4 },
      { label: 'MAT-BRICK-AUTO: 1st Class Auto Machine Bricks (NOS)', value: 5 },
      { label: 'MAT-TILES-PORC: 60x60cm Glazed Mirror Polish Tiles (SQFT)', value: 6 }
    ]);

    this.storeOptions.set([
      { label: '1: Gulshan Emerald Project Site Store', value: 1 },
      { label: '2: Central Warehouse - Tejgaon Industrial Area', value: 2 }
    ]);

    // Initial stock
    this.liveStoreStock.set(45);
  }

  onMaterialChange(matId: number): void {
    const mat = this.materialOptions().find(m => m.value === matId);
    if (mat) {
      this.reqForm.patchValue({
        material_name: mat.label.split(':')[1]?.trim() || mat.label,
        material_code: mat.label.split(':')[0]?.trim() || ''
      });
    }

    // Set stock values based on material
    if (matId === 1) this.liveStoreStock.set(45);
    else if (matId === 2) this.liveStoreStock.set(1200);
    else if (matId === 5) this.liveStoreStock.set(8000);
    else if (matId === 6) this.liveStoreStock.set(300);
    else this.liveStoreStock.set(100);

    this.recalculateShortage();
  }

  onBOQItemChange(boqId: number): void {
    this.constructionService.getBOQItemById(boqId).subscribe({
      next: boq => {
        this.selectedBoqItem.set(boq);
        if (boq.unit_of_measure_id) {
          this.reqForm.patchValue({ unit_of_measure: boq.unit_of_measure_id });
        }
      }
    });
  }

  recalculateShortage(): void {
    const req = Number(this.reqForm.get('requested_quantity')?.value || 0);
    const stock = Number(this.liveStoreStock() || 0);
    this.stockShortage.set(Math.max(0, req - stock));
  }

  loadRequisition(id: number): void {
    this.constructionService.getMaterialRequisitionById(id).subscribe({
      next: (req: SiteMaterialRequisition) => {
        this.reqForm.patchValue({
          project_id: req.project_id,
          tower_id: req.tower_id,
          tower_name: req.tower_name,
          floor_number: req.floor_number,
          work_package: req.work_package,
          wbs_node_id: req.wbs_node_id,
          material_id: req.material_id,
          boq_item_id: req.boq_item_id,
          material_code: req.material_code,
          material_name: req.material_name,
          specification: req.specification,
          grade: req.grade,
          unit_of_measure: req.unit_of_measure,
          requested_quantity: req.requested_quantity,
          allowed_wastage_percentage: req.allowed_wastage_percentage,
          store_id: req.store_id || 1,
          supplier_name: req.supplier_name,
          batch_lot_number: req.batch_lot_number,
          storage_location: req.storage_location,
          required_by_date: req.required_by_date,
          priority: req.priority,
          purpose_remarks: req.purpose_remarks
        });

        if (req.boq_item_id) {
          this.onBOQItemChange(req.boq_item_id);
        }
        this.recalculateShortage();
      }
    });
  }

  onSubmit(): void {
    if (this.reqForm.invalid) return;

    this.isSubmitting.set(true);
    const payload = this.reqForm.getRawValue();

    if (this.isEditMode() && this.reqId()) {
      this.constructionService.updateMaterialRequisition(this.reqId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/construction/material-requisitions']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert(err.error?.detail || 'Failed to update material requisition');
        }
      });
    } else {
      this.constructionService.createMaterialRequisition(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/construction/material-requisitions']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert(err.error?.detail || 'Failed to create material requisition');
        }
      });
    }
  }
}
