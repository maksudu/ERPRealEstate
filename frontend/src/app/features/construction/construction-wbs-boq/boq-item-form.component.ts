import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower } from '../../../core/models/project.model';
import { WBSNode, BOQItemBudgetLock } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-boq-item-form',
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
            routerLink="/construction/wbs-boq"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to WBS & BOQ Master"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                Bill of Quantities (BOQ) Master
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Edit Item #' + boqId() : 'New Scope Estimation' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit BOQ Item & Rate Analysis' : 'Add New BOQ Line Item & Scope' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            type="button"
            (click)="fillExampleData()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer shadow-2xs"
            title="Load realistic Bangladesh construction demo data"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            <span>Example Data</span>
          </button>

          <a
            routerLink="/construction/wbs-boq"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="boqForm.invalid || isSaving()"
            (clicked)="saveBOQItem()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isEditMode() ? 'Update BOQ Item' : 'Create BOQ Item' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Feedback Notifications -->
      @if (feedbackMsg()) {
        <div role="status" class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-between shadow-xs">
          <span class="flex items-center gap-2">
            <span>✨</span>
            <span>{{ feedbackMsg() }}</span>
          </span>
          <button type="button" (click)="feedbackMsg.set('')" class="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      }

      @if (errorMsg()) {
        <div role="alert" class="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center justify-between shadow-xs">
          <span>{{ errorMsg() }}</span>
          <button type="button" (click)="errorMsg.set('')" class="text-rose-500 hover:text-rose-700">✕</button>
        </div>
      }

      <!-- Form Tabs Strip -->
      <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-secondary/60 border border-border overflow-x-auto scrollbar-none">
        @for (tab of formTabs; track tab.id) {
          <button
            type="button"
            (click)="activeTab.set(tab.id)"
            [class]="activeTab() === tab.id
              ? 'bg-card text-foreground font-bold shadow-xs border border-border'
              : 'text-muted-foreground hover:text-foreground font-medium hover:bg-card/50'"
            class="px-3.5 py-2 rounded-xl text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        }
      </div>

      <!-- Main Standalone Form Card -->
      <form [formGroup]="boqForm" (ngSubmit)="saveBOQItem()" class="flex flex-col gap-6">

        <!-- Section 1: Project Scope, Building & WBS Link -->
        @if (activeTab() === 'spatial' || activeTab() === 'all') {
          <app-card-container
            title="1. Spatial Hierarchy & WBS Linkage"
            subtitle="Associate BOQ scope with Project, specific Tower/Building, and WBS Activity Node"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-searchable-select
                  label="Construction Project *"
                  [options]="projectOptions"
                  formControlName="project_id"
                  [allowCreateNew]="false"
                  placeholder="Select project..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Building / Tower (Optional)"
                  [options]="towerOptions"
                  formControlName="tower_id"
                  [allowCreateNew]="false"
                  placeholder="Select building..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Linked WBS Milestone Node"
                  [options]="wbsNodeOptions"
                  formControlName="wbs_node_id"
                  [allowCreateNew]="false"
                  placeholder="Link to WBS node..."
                >
                </app-searchable-select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-custom-input
                  label="BOQ Item Code *"
                  placeholder="e.g. BOQ-STL-001"
                  formControlName="item_code"
                >
                </app-custom-input>

                <app-searchable-select
                  label="Construction Phase Category *"
                  categoryCode="CONSTRUCTION_PHASE"
                  [allowCreateNew]="true"
                  formControlName="wbs_phase_id"
                  placeholder="Select phase..."
                >
                </app-searchable-select>

                <app-searchable-select
                  label="Material & Trade Category *"
                  categoryCode="BOQ_ITEM_CATEGORY"
                  [allowCreateNew]="true"
                  formControlName="material_category_id"
                  placeholder="Select trade category..."
                >
                </app-searchable-select>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="sm:col-span-2">
                  <app-custom-input
                    label="Item Name & Short Description *"
                    placeholder="e.g. Reinforcement Steel (500W Deformed Bar)"
                    formControlName="item_description"
                  >
                  </app-custom-input>
                </div>

                <app-searchable-select
                  label="Unit of Measurement (UOM) *"
                  categoryCode="UNIT_OF_MEASURE"
                  [allowCreateNew]="true"
                  formControlName="unit_of_measure_id"
                  placeholder="Select unit..."
                >
                </app-searchable-select>
              </div>

              <app-custom-textarea
                label="Engineering Specifications & Quality Standards"
                placeholder="e.g. 500W grade high-strength deformed rebar conforming to BSTI BDS ISO 6935-2 and ASTM A615. Cold bent and tied with 20-gauge GI wire..."
                formControlName="specification"
                [rows]="3"
              >
              </app-custom-textarea>
            </div>
          </app-card-container>
        }

        <!-- Section 2: Rate Analysis & Breakdown Components -->
        @if (activeTab() === 'rates' || activeTab() === 'all') {
          <app-card-container
            title="2. Rate Analysis Breakdown Components (Labour, Material, Equipment & Subcontract)"
            subtitle="Detailed cost composition establishing the approved unit rate per measurement unit"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <app-custom-input
                  label="Material Supply Rate (BDT)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="85.00"
                  formControlName="material_rate"
                >
                </app-custom-input>

                <app-custom-input
                  label="Direct Labour Rate (BDT)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10.00"
                  formControlName="labour_rate"
                >
                </app-custom-input>

                <app-custom-input
                  label="Equipment & Machinery (BDT)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="3.00"
                  formControlName="equipment_rate"
                >
                </app-custom-input>

                <app-custom-input
                  label="Trade Subcontract (BDT)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2.00"
                  formControlName="subcontract_rate"
                >
                </app-custom-input>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-secondary/30">
                <div>
                  <span class="text-xs font-semibold text-muted-foreground block mb-1">Approved Unit Rate (BDT) *</span>
                  <input
                    type="number"
                    formControlName="estimated_unit_rate"
                    class="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-border bg-card text-foreground"
                  />
                  <span class="text-[10px] text-muted-foreground block mt-1">Sum of 4 components or manual contract rate</span>
                </div>

                <div>
                  <span class="text-xs font-semibold text-muted-foreground block mb-1">Estimated Quantity *</span>
                  <input
                    type="number"
                    formControlName="estimated_quantity"
                    class="w-full px-3 py-2 text-xs font-bold font-mono rounded-lg border border-border bg-card text-foreground"
                  />
                  <span class="text-[10px] text-muted-foreground block mt-1">Approved baseline scope quantity</span>
                </div>

                <div>
                  <span class="text-xs font-semibold text-muted-foreground block mb-1">Total Estimated Amount</span>
                  <div class="px-3 py-2 text-sm font-bold font-mono rounded-lg border border-border bg-secondary/60 text-primary">
                    BDT {{ totalEstimatedAmount() | number:'1.2-2' }}
                  </div>
                  <span class="text-[10px] text-muted-foreground block mt-1">Calculated budget allocation</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-custom-textarea
                  label="Rate Analysis Calculation Notes"
                  placeholder="e.g. BSRM 500W factory rate @ BDT 85/kg + cutting/bending labour @ BDT 10/kg + lifting crane & bending machine @ BDT 3/kg + trade subcontractor margin @ BDT 2/kg..."
                  formControlName="rate_analysis_notes"
                  [rows]="3"
                >
                </app-custom-textarea>

                <app-custom-input
                  label="Supporting Document / Quotation URL"
                  placeholder="https://.../rate-analysis-sheet.xlsx or PDF"
                  formControlName="supporting_document_url"
                >
                </app-custom-input>
              </div>
            </div>
          </app-card-container>
        }

        <!-- Section 3: Tender BOQ vs Approved Contract vs Revised -->
        @if (activeTab() === 'baselines' || activeTab() === 'all') {
          <app-card-container
            title="3. Tender BOQ vs Approved Contract vs Revised Baselines"
            subtitle="Preserve original tender and contract quantities to audit variation and scope drift"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-searchable-select
                  label="BOQ Lifecycle Stage *"
                  categoryCode="BOQ_STAGE"
                  [allowCreateNew]="true"
                  formControlName="stage"
                  placeholder="Select stage..."
                >
                </app-searchable-select>

                <app-custom-input
                  label="BOQ Version No."
                  type="number"
                  min="1"
                  placeholder="1"
                  formControlName="version_no"
                >
                </app-custom-input>

                <app-custom-input
                  label="105% Hard Lock Ceiling Percentage (%)"
                  type="number"
                  min="100"
                  max="200"
                  step="0.5"
                  placeholder="105.0"
                  formControlName="hard_lock_percentage"
                >
                </app-custom-input>
              </div>

              <!-- Baseline Comparison Columns -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <!-- Tender Baseline Card -->
                <div class="p-4 rounded-xl border border-border bg-secondary/20 flex flex-col gap-3">
                  <span class="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                    Tender BOQ (Original Bid)
                  </span>
                  <app-custom-input
                    label="Tender Quantity"
                    type="number"
                    placeholder="50000"
                    formControlName="tender_quantity"
                  >
                  </app-custom-input>
                  <app-custom-input
                    label="Tender Unit Rate (BDT)"
                    type="number"
                    placeholder="98.00"
                    formControlName="tender_unit_rate"
                  >
                  </app-custom-input>
                </div>

                <!-- Contract Baseline Card -->
                <div class="p-4 rounded-xl border border-border bg-emerald-500/5 border-emerald-500/20 flex flex-col gap-3">
                  <span class="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Approved Contract BOQ
                  </span>
                  <app-custom-input
                    label="Contract Quantity *"
                    type="number"
                    placeholder="50000"
                    formControlName="contract_quantity"
                  >
                  </app-custom-input>
                  <app-custom-input
                    label="Contract Unit Rate (BDT) *"
                    type="number"
                    placeholder="100.00"
                    formControlName="contract_unit_rate"
                  >
                  </app-custom-input>
                </div>

                <!-- Revised Baseline Card -->
                <div class="p-4 rounded-xl border border-border bg-secondary/20 flex flex-col gap-3">
                  <span class="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                    Revised BOQ (VO Adjusted)
                  </span>
                  <app-custom-input
                    label="Revised Quantity"
                    type="number"
                    placeholder="50000"
                    formControlName="revised_quantity"
                  >
                  </app-custom-input>
                  <app-custom-input
                    label="Revised Unit Rate (BDT)"
                    type="number"
                    placeholder="100.00"
                    formControlName="revised_unit_rate"
                  >
                  </app-custom-input>
                </div>
              </div>
            </div>
          </app-card-container>
        }

        <!-- Section 4: Physical Consumption, Progress & Approval Lock -->
        @if (activeTab() === 'progress' || activeTab() === 'all') {
          <app-card-container
            title="4. Physical Progress, Verification & Version Locking"
            subtitle="Track actual site consumption, completed quantities, remaining headroom, and approval lock"
          >
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <app-custom-input
                  label="Actual Consumed Quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.0"
                  formControlName="actual_consumed_quantity"
                >
                </app-custom-input>

                <app-custom-input
                  label="Verified Completed Quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.0"
                  formControlName="completed_quantity"
                >
                </app-custom-input>

                <app-custom-input
                  label="Approved By (Lead Consultant / PM)"
                  placeholder="Engr. Mainul Hossain, Chief Consultant"
                  formControlName="approved_by"
                >
                </app-custom-input>
              </div>

              <div class="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    formControlName="is_locked"
                    class="w-4 h-4 rounded text-rose-500 focus:ring-rose-500 border-border"
                  />
                  <div>
                    <span class="text-xs font-bold text-foreground block">Lock Approved BOQ Version</span>
                    <span class="text-[11px] text-muted-foreground block">
                      Prevents direct modifications to estimated quantities or rates without an authorized Variation Order (VO)
                    </span>
                  </div>
                </label>

                <div>
                  <span class="text-xs font-semibold text-muted-foreground block mb-1">Approval Date</span>
                  <input
                    type="date"
                    formControlName="approval_date"
                    class="px-3 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground font-mono"
                  />
                </div>
              </div>
            </div>
          </app-card-container>
        }

        <!-- Bottom Step Navigation & Action Footer -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            @if (activeTab() !== 'all' && activeTab() !== 'spatial') {
              <button
                type="button"
                (click)="goToPrevTab()"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                <span>Previous Step</span>
              </button>
            }
            @if (activeTab() !== 'all' && activeTab() !== 'progress') {
              <button
                type="button"
                (click)="goToNextTab()"
                class="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Next Step</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            }
          </div>

          <div class="flex items-center gap-3">
            <a
              routerLink="/construction/wbs-boq"
              class="px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="boqForm.invalid || isSaving()"
              (clicked)="saveBOQItem()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ isEditMode() ? 'Save Changes' : 'Create BOQ Line Item' }}
                }
              </span>
            </app-custom-button>
          </div>
        </div>
      </form>
    </div>
  `
})
export class BoqItemFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isSaving = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  boqId = signal<number | null>(null);

  activeTab = signal<string>('spatial');
  feedbackMsg = signal<string>('');
  errorMsg = signal<string>('');

  readonly formTabs = [
    { id: 'spatial', label: '1. Spatial & Scope', icon: '📐' },
    { id: 'rates', label: '2. Rate Analysis (4 Components)', icon: '৳' },
    { id: 'baselines', label: '3. Tender & 105% Locks', icon: '🔒' },
    { id: 'progress', label: '4. Progress & Approvals', icon: '✅' },
    { id: 'all', label: 'All Sections', icon: '📋' }
  ];

  private readonly tabOrder = ['spatial', 'rates', 'baselines', 'progress'];

  goToNextTab(): void {
    const currentIndex = this.tabOrder.indexOf(this.activeTab());
    if (currentIndex >= 0 && currentIndex < this.tabOrder.length - 1) {
      this.activeTab.set(this.tabOrder[currentIndex + 1]);
    }
  }

  goToPrevTab(): void {
    const currentIndex = this.tabOrder.indexOf(this.activeTab());
    if (currentIndex > 0) {
      this.activeTab.set(this.tabOrder[currentIndex - 1]);
    }
  }

  fillExampleData(): void {
    const today = new Date().toISOString().split('T')[0];
    const currentProjectId = this.boqForm.get('project_id')?.value || (this.projectOptions.length > 0 ? this.projectOptions[0].value : null);
    const towerId = this.towerOptions.length > 1 ? this.towerOptions[1].value : null;
    const wbsId = this.wbsNodeOptions.length > 1 ? this.wbsNodeOptions[1].value : null;

    this.boqForm.patchValue({
      project_id: currentProjectId,
      tower_id: towerId,
      wbs_node_id: wbsId,
      item_code: 'BOQ-CIV-STL-04',
      item_description: '500W High-Strength TMT Deformed Rebar (Grade 72.5)',
      wbs_phase_id: 'SUPERSTRUCTURE',
      material_category_id: 'REINFORCEMENT_STEEL',
      unit_of_measure_id: 'KG',
      specification: '500W grade high-yield deformed steel rebar conforming to BSTI BDS ISO 6935-2:2016 and ASTM A615. Cold bent, clean from loose rust, tied with 20-gauge GI wire.',

      material_rate: 86.0,
      labour_rate: 11.5,
      equipment_rate: 2.5,
      subcontract_rate: 2.0,
      estimated_unit_rate: 102.0,
      estimated_quantity: 15000.0,

      rate_analysis_notes: 'BSRM / AKS factory direct ex-mill supply @ BDT 86/kg + cutting & bending labour @ BDT 11.50/kg + crane lifting @ BDT 2.50/kg + contractor margin @ BDT 2.00/kg.',
      supporting_document_url: 'https://erp.blueoceans.com/docs/rate-analysis-rebar-2026.pdf',

      stage: 'CONTRACT',
      version_no: 1,
      hard_lock_percentage: 105.0,

      tender_quantity: 15000.0,
      tender_unit_rate: 98.0,
      contract_quantity: 15000.0,
      contract_unit_rate: 102.0,
      revised_quantity: 15000.0,
      revised_unit_rate: 102.0,

      actual_consumed_quantity: 3200.0,
      completed_quantity: 3200.0,
      approved_by: 'Engr. K. M. Rahman, Chief Consultant',
      approval_date: today,
      is_locked: true
    });

    this.recalcComponents();
    this.recalcTotal();
    this.feedbackMsg.set('✨ Example BOQ item loaded for 500W Deformed Rebar with 4 rate components.');
    setTimeout(() => this.feedbackMsg.set(''), 5000);
  }

  projectOptions: { value: any; label: string }[] = [];
  towerOptions: { value: any; label: string }[] = [];
  wbsNodeOptions: { value: any; label: string }[] = [];

  boqForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    tower_id: [null],
    wbs_node_id: [null],
    item_code: ['', Validators.required],
    item_description: ['', Validators.required],
    specification: [''],
    wbs_phase_id: ['FOUNDATION_STRUCTURE', Validators.required],
    material_category_id: ['REBAR_STEEL', Validators.required],
    unit_of_measure_id: ['KG', Validators.required],

    material_rate: [0.0],
    labour_rate: [0.0],
    equipment_rate: [0.0],
    subcontract_rate: [0.0],
    estimated_unit_rate: [0.0, [Validators.required, Validators.min(0)]],
    estimated_quantity: [0.0, [Validators.required, Validators.min(0)]],

    stage: ['APPROVED_CONTRACT_BOQ', Validators.required],
    tender_quantity: [0.0],
    tender_unit_rate: [0.0],
    contract_quantity: [0.0, Validators.required],
    contract_unit_rate: [0.0, Validators.required],
    revised_quantity: [0.0],
    revised_unit_rate: [0.0],

    actual_consumed_quantity: [0.0],
    completed_quantity: [0.0],
    hard_lock_percentage: [105.0],
    is_locked: [false],
    version_no: [1],
    approved_by: [''],
    approval_date: [null],
    rate_analysis_notes: [''],
    supporting_document_url: ['']
  });

  totalEstimatedAmount = signal<number>(0);

  ngOnInit(): void {
    this.loadProjects();

    // Recompute unit rate from breakdown if components change
    const compFields = ['material_rate', 'labour_rate', 'equipment_rate', 'subcontract_rate'];
    compFields.forEach(f => {
      this.boqForm.get(f)?.valueChanges.subscribe(() => this.recalcComponents());
    });

    // Recompute total estimated amount
    this.boqForm.get('estimated_quantity')?.valueChanges.subscribe(() => this.recalcTotal());
    this.boqForm.get('estimated_unit_rate')?.valueChanges.subscribe(() => this.recalcTotal());

    // Check if Edit mode
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      this.boqId.set(id);
      this.isEditMode.set(true);
      this.loadBOQDetails(id);
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));

        if (!this.isEditMode() && projs.length > 0) {
          const firstId = projs[0].id;
          this.boqForm.patchValue({ project_id: firstId });
          this.loadProjectSubData(firstId);
        }
      }
    });

    this.boqForm.get('project_id')?.valueChanges.subscribe((pId) => {
      if (pId) {
        this.loadProjectSubData(Number(pId));
      }
    });
  }

  loadProjectSubData(projectId: number): void {
    // Load Towers
    this.projectService.getTowers(projectId).subscribe({
      next: (towers) => {
        this.towerOptions = [
          { value: null, label: 'Entire Project / Common Civil' },
          ...towers.map(t => ({
            value: t.id,
            label: `${t.tower_name} (${t.tower_code})`
          }))
        ];
      }
    });

    // Load WBS Nodes
    this.constructionService.getWBSNodes({ project_id: projectId }).subscribe({
      next: (nodes) => {
        this.wbsNodeOptions = [
          { value: null, label: 'Unlinked / General BOQ Item' },
          ...nodes.map(n => ({
            value: n.id,
            label: `[${n.node_code}] ${n.node_name} (${n.wbs_tier})`
          }))
        ];
      }
    });
  }

  loadBOQDetails(id: number): void {
    this.constructionService.getBOQItemById(id).subscribe({
      next: (item) => {
        this.boqForm.patchValue({
          project_id: item.project_id,
          tower_id: item.tower_id,
          wbs_node_id: item.wbs_node_id,
          item_code: item.item_code,
          item_description: item.item_description,
          specification: item.specification || '',
          wbs_phase_id: item.wbs_phase_id,
          material_category_id: item.material_category_id,
          unit_of_measure_id: item.unit_of_measure_id,

          material_rate: item.material_rate || 0.0,
          labour_rate: item.labour_rate || 0.0,
          equipment_rate: item.equipment_rate || 0.0,
          subcontract_rate: item.subcontract_rate || 0.0,
          estimated_unit_rate: item.estimated_unit_rate,
          estimated_quantity: item.estimated_quantity,

          stage: item.stage || 'APPROVED_CONTRACT_BOQ',
          tender_quantity: item.tender_quantity || item.estimated_quantity,
          tender_unit_rate: item.tender_unit_rate || item.estimated_unit_rate,
          contract_quantity: item.contract_quantity || item.estimated_quantity,
          contract_unit_rate: item.contract_unit_rate || item.estimated_unit_rate,
          revised_quantity: item.revised_quantity || item.estimated_quantity,
          revised_unit_rate: item.revised_unit_rate || item.estimated_unit_rate,

          actual_consumed_quantity: item.actual_consumed_quantity || 0.0,
          completed_quantity: item.completed_quantity || 0.0,
          hard_lock_percentage: item.hard_lock_percentage || 105.0,
          is_locked: Boolean(item.is_locked),
          version_no: item.version_no || 1,
          approved_by: item.approved_by || '',
          approval_date: item.approval_date || null,
          rate_analysis_notes: item.rate_analysis_notes || '',
          supporting_document_url: item.supporting_document_url || ''
        });

        if (item.project_id) {
          this.loadProjectSubData(item.project_id);
        }
        this.recalcTotal();
      }
    });
  }

  recalcComponents(): void {
    const mat = Number(this.boqForm.get('material_rate')?.value) || 0;
    const lab = Number(this.boqForm.get('labour_rate')?.value) || 0;
    const eq = Number(this.boqForm.get('equipment_rate')?.value) || 0;
    const sub = Number(this.boqForm.get('subcontract_rate')?.value) || 0;
    const sum = mat + lab + eq + sub;
    if (sum > 0) {
      this.boqForm.patchValue({ estimated_unit_rate: sum }, { emitEvent: false });
      this.recalcTotal();
    }
  }

  recalcTotal(): void {
    const qty = Number(this.boqForm.get('estimated_quantity')?.value) || 0;
    const rate = Number(this.boqForm.get('estimated_unit_rate')?.value) || 0;
    this.totalEstimatedAmount.set(Math.round(qty * rate * 100) / 100);
  }

  saveBOQItem(): void {
    if (this.boqForm.invalid) {
      this.boqForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.boqForm.value;

    const payload = {
      project_id: Number(formVal.project_id),
      tower_id: formVal.tower_id ? Number(formVal.tower_id) : null,
      wbs_node_id: formVal.wbs_node_id ? Number(formVal.wbs_node_id) : null,
      item_code: formVal.item_code,
      item_description: formVal.item_description,
      specification: formVal.specification || null,
      wbs_phase_id: formVal.wbs_phase_id,
      material_category_id: formVal.material_category_id,
      unit_of_measure_id: formVal.unit_of_measure_id,

      estimated_quantity: Number(formVal.estimated_quantity) || 0.0,
      estimated_unit_rate: Number(formVal.estimated_unit_rate) || 0.0,
      material_rate: Number(formVal.material_rate) || 0.0,
      labour_rate: Number(formVal.labour_rate) || 0.0,
      equipment_rate: Number(formVal.equipment_rate) || 0.0,
      subcontract_rate: Number(formVal.subcontract_rate) || 0.0,

      stage: formVal.stage,
      tender_quantity: Number(formVal.tender_quantity) || Number(formVal.estimated_quantity),
      tender_unit_rate: Number(formVal.tender_unit_rate) || Number(formVal.estimated_unit_rate),
      contract_quantity: Number(formVal.contract_quantity) || Number(formVal.estimated_quantity),
      contract_unit_rate: Number(formVal.contract_unit_rate) || Number(formVal.estimated_unit_rate),
      revised_quantity: Number(formVal.revised_quantity) || Number(formVal.contract_quantity),
      revised_unit_rate: Number(formVal.revised_unit_rate) || Number(formVal.contract_unit_rate),

      actual_consumed_quantity: Number(formVal.actual_consumed_quantity) || 0.0,
      completed_quantity: Number(formVal.completed_quantity) || 0.0,
      hard_lock_percentage: Number(formVal.hard_lock_percentage) || 105.0,
      is_locked: Boolean(formVal.is_locked),
      version_no: Number(formVal.version_no) || 1,
      approved_by: formVal.approved_by || null,
      approval_date: formVal.approval_date || null,
      rate_analysis_notes: formVal.rate_analysis_notes || null,
      supporting_document_url: formVal.supporting_document_url || null
    };

    const currentId = this.boqId();
    if (this.isEditMode() && currentId) {
      this.constructionService.updateBOQItem(currentId, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/wbs-boq']);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.detail || 'Failed to update BOQ item.';
          this.errorMsg.set(msg);
        }
      });
    } else {
      this.constructionService.createBOQItem(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/wbs-boq']);
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.detail || 'Failed to create BOQ item.';
          this.errorMsg.set(msg);
        }
      });
    }
  }
}
