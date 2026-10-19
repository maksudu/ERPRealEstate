import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectCompletion } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-project-completion-form',
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
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      <!-- Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/project-completion"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Handover Dashboard"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                [ngClass]="completionForm.get('stage_status')?.value === 'FORMALLY_CLOSED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'">
                {{ completionForm.get('stage_status')?.value || 'IN_RECONCILIATION' }}
              </span>
              <span class="text-xs font-mono text-muted-foreground">
                {{ isEditMode() ? 'Dossier #' + existingCompletion()?.completion_code : 'New Handover Dossier' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Closeout Dossier: ' + existingCompletion()?.completion_code : 'Initiate Project Handover & Closeout Dossier' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/project-completion"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="completionForm.invalid || isSaving()"
            (clicked)="saveForm()"
          >
            <i class="ri-save-line mr-1"></i>
            {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update Dossier' : 'Save Closeout Dossier') }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Project Information & Completion Milestones"
        subtitle="Verify 100% WBS progress, physical milestone handover dates, and lifecycle stage"
      >
        <form [formGroup]="completionForm" class="flex flex-col gap-6">
          <!-- Row 1: Code, Project, Target & Actual Date -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <app-custom-input
              label="Completion Code *"
              placeholder="e.g. CMP-2026-001"
              formControlName="completion_code"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Target Handover Date *"
              type="date"
              formControlName="target_handover_date"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Actual Completion Date"
              type="date"
              formControlName="actual_completion_date"
            ></app-custom-input>
          </div>

          <!-- Row 2: Stage & WBS Progress -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Closeout Stage Status *"
              categoryCode="COMPLETION_STAGE"
              formControlName="stage_status"
              [allowCreateNew]="true"
              placeholder="Select stage..."
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="WBS Activities Completion % *"
              type="number"
              formControlName="wbs_activities_completion_pct"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Total Reconciled BOQ Items Count"
              type="number"
              formControlName="total_boq_reconciled_items_count"
            ></app-custom-input>
          </div>

          <!-- Financial & Commercial Reconciliation Section -->
          <div class="p-4 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <i class="ri-file-chart-line text-primary"></i> Commercial Reconciliation & Budget Variance
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Original Approved Budget (৳)"
                type="number"
                formControlName="original_budget_cost_bdt"
              ></app-custom-input>

              <app-custom-input
                label="Final Certified Reconciled Cost (৳) *"
                type="number"
                formControlName="final_reconciled_cost_bdt"
                [required]="true"
              ></app-custom-input>

              <app-custom-input
                label="Cost Variance Amount (৳)"
                type="number"
                formControlName="cost_variance_amount_bdt"
              ></app-custom-input>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Outstanding Contractor Bills (৳)"
                type="number"
                formControlName="outstanding_contractor_bills_amount"
              ></app-custom-input>

              <app-custom-input
                label="Retention Money Locked (৳)"
                type="number"
                formControlName="retention_money_locked_bdt"
              ></app-custom-input>

              <div class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card mt-6">
                <input
                  type="checkbox"
                  id="retention_release"
                  formControlName="retention_release_authorized"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="retention_release" class="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Authorize Retention Release
                  <span class="block text-[10px] font-normal text-muted-foreground">Post-defect liability period expiry</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Quality, Safety & Store Reconciliation Gating -->
          <div class="p-4 rounded-2xl bg-secondary/20 border border-border flex flex-col gap-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Technical Closure & Site Clearance Verification
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card">
                <input
                  type="checkbox"
                  id="mat_store_cleared"
                  formControlName="materials_store_reconciliation_cleared"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="mat_store_cleared" class="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Materials Store Cleared
                  <span class="block text-[10px] font-normal text-muted-foreground">Zero unreturned materials</span>
                </label>
              </div>

              <div class="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card">
                <input
                  type="checkbox"
                  id="equip_store_cleared"
                  formControlName="equipment_store_reconciliation_cleared"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="equip_store_cleared" class="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Plant & Equipment Cleared
                  <span class="block text-[10px] font-normal text-muted-foreground">All hired scaffolding & tools demobilized</span>
                </label>
              </div>

              <div class="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                <input
                  type="checkbox"
                  id="mandatory_cleared"
                  formControlName="mandatory_items_all_cleared"
                  class="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                />
                <label for="mandatory_cleared" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer select-none">
                  Mandatory Items All Cleared
                  <span class="block text-[10px] font-normal text-emerald-600/80">Required for Taking-Over Certificate</span>
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Open Quality Defects Count (NCRs)"
                type="number"
                formControlName="open_quality_defects_count"
              ></app-custom-input>

              <app-custom-input
                label="Open Safety Incidents Count"
                type="number"
                formControlName="open_safety_incidents_count"
              ></app-custom-input>
            </div>
          </div>

          <!-- Handover Technical Documentation -->
          <div class="p-4 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h4 class="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <i class="ri-booklet-line text-primary"></i> As-Built Drawings, O&M Manuals & Warranties
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">As-Built Drawings Submitted</span>
                  <input type="checkbox" formControlName="as_built_drawings_submitted" class="w-4 h-4 rounded text-primary" />
                </div>
                <app-custom-input
                  label="As-Built Drawing Document Ref / URL"
                  placeholder="e.g. /vault/as-built/tower-a.pdf"
                  formControlName="as_built_drawings_ref_url"
                ></app-custom-input>
              </div>

              <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground">Operation & Maintenance Manuals</span>
                  <input type="checkbox" formControlName="om_manuals_submitted" class="w-4 h-4 rounded text-primary" />
                </div>
                <app-custom-input
                  label="O&M Manual Ref / Vault URL"
                  placeholder="e.g. /vault/om-manuals/mep-generator.pdf"
                  formControlName="om_manuals_ref_url"
                ></app-custom-input>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Warranties Collected Count"
                type="number"
                formControlName="warranties_collected_count"
              ></app-custom-input>

              <app-custom-input
                label="Taking-Over Certificate URL / Signed Scan"
                placeholder="e.g. /vault/certificates/toc-tower-a.pdf"
                formControlName="taking_over_certificate_url"
              ></app-custom-input>
            </div>
          </div>

          <!-- Overall Remarks -->
          <app-custom-textarea
            label="Handover Remarks & Exception Conditions"
            placeholder="Record handover notes, conditions precedent, municipal occupancy certificate status, or punchlist rectification deadlines..."
            formControlName="remarks"
            [rows]="3"
          ></app-custom-textarea>
        </form>
      </app-card-container>
    </div>
  `
})
export class ProjectCompletionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  completionId = signal<number | null>(null);
  existingCompletion = signal<ProjectCompletion | null>(null);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];

  completionForm: FormGroup = this.fb.group({
    completion_code: ['', Validators.required],
    project_id: [null, Validators.required],
    target_handover_date: [new Date().toISOString().substring(0, 10), Validators.required],
    actual_completion_date: [''],
    stage_status: ['IN_RECONCILIATION', Validators.required],
    wbs_activities_completion_pct: [100.0, Validators.required],
    total_boq_reconciled_items_count: [45],
    original_budget_cost_bdt: [0],
    final_reconciled_cost_bdt: [0, Validators.required],
    cost_variance_amount_bdt: [0],
    outstanding_contractor_bills_amount: [0],
    retention_money_locked_bdt: [0],
    retention_release_authorized: [false],
    materials_store_reconciliation_cleared: [true],
    equipment_store_reconciliation_cleared: [true],
    open_quality_defects_count: [0],
    open_safety_incidents_count: [0],
    as_built_drawings_submitted: [true],
    as_built_drawings_ref_url: [''],
    om_manuals_submitted: [true],
    om_manuals_ref_url: [''],
    warranties_collected_count: [6],
    mandatory_items_all_cleared: [false],
    taking_over_certificate_url: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();

    // Auto calculate variance when budget or actual changes
    this.completionForm.get('original_budget_cost_bdt')?.valueChanges.subscribe(() => this.calculateVariance());
    this.completionForm.get('final_reconciled_cost_bdt')?.valueChanges.subscribe(() => this.calculateVariance());

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.completionId.set(Number(id));
      this.isEditMode.set(true);
      this.loadCompletion(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.completionForm.patchValue({
        completion_code: `CMP-2026-${rand}`
      });
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res.data || [];
        this.projectOptions = list.map((p: Project) => ({
          value: p.id,
          label: p.project_name
        }));
      }
    });
  }

  calculateVariance(): void {
    const budget = Number(this.completionForm.get('original_budget_cost_bdt')?.value) || 0;
    const actual = Number(this.completionForm.get('final_reconciled_cost_bdt')?.value) || 0;
    const variance = actual - budget;
    this.completionForm.patchValue({ cost_variance_amount_bdt: variance }, { emitEvent: false });
  }

  loadCompletion(id: number): void {
    this.constructionService.getProjectCompletionById(id).subscribe({
      next: (comp) => {
        this.existingCompletion.set(comp);
        this.completionForm.patchValue({
          completion_code: comp.completion_code,
          project_id: comp.project_id,
          target_handover_date: comp.target_handover_date,
          actual_completion_date: comp.actual_completion_date,
          stage_status: comp.stage_status,
          wbs_activities_completion_pct: comp.wbs_activities_completion_pct,
          total_boq_reconciled_items_count: comp.total_boq_reconciled_items_count,
          original_budget_cost_bdt: comp.original_budget_cost_bdt,
          final_reconciled_cost_bdt: comp.final_reconciled_cost_bdt,
          cost_variance_amount_bdt: comp.cost_variance_amount_bdt,
          outstanding_contractor_bills_amount: comp.outstanding_contractor_bills_amount,
          retention_money_locked_bdt: comp.retention_money_locked_bdt,
          retention_release_authorized: comp.retention_release_authorized,
          materials_store_reconciliation_cleared: comp.materials_store_reconciliation_cleared,
          equipment_store_reconciliation_cleared: comp.equipment_store_reconciliation_cleared,
          open_quality_defects_count: comp.open_quality_defects_count,
          open_safety_incidents_count: comp.open_safety_incidents_count,
          as_built_drawings_submitted: comp.as_built_drawings_submitted,
          as_built_drawings_ref_url: comp.as_built_drawings_ref_url,
          om_manuals_submitted: comp.om_manuals_submitted,
          om_manuals_ref_url: comp.om_manuals_ref_url,
          warranties_collected_count: comp.warranties_collected_count,
          mandatory_items_all_cleared: comp.mandatory_items_all_cleared,
          taking_over_certificate_url: comp.taking_over_certificate_url,
          remarks: comp.remarks
        });
      }
    });
  }

  saveForm(): void {
    if (this.completionForm.invalid) return;
    this.isSaving.set(true);
    const formVal = this.completionForm.getRawValue();

    if (this.isEditMode() && this.completionId()) {
      this.constructionService.updateProjectCompletion(this.completionId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/project-completion']);
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createProjectCompletion(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/project-completion']);
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
