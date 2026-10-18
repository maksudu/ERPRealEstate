import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import { Project } from '../../../core/models/project.model';
import { WBSNode } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-wbs-node-form',
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
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/wbs-boq"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to WBS & BOQ Master"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Work Breakdown Structure (WBS)
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                New Milestone Node
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Add WBS Milestone Activity Node
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/wbs-boq"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="wbsForm.invalid || isSaving()"
            (clicked)="saveWBSNode()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Create WBS Node
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="WBS Node Architecture & Schedule"
        subtitle="Define project tier hierarchy, phase category, weightage percentage, and planned timeline"
      >
        <form [formGroup]="wbsForm" class="flex flex-col gap-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-searchable-select
              label="Select Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
            >
            </app-searchable-select>

            <app-searchable-select
              label="Parent WBS Node (Hierarchical)"
              [options]="parentOptions"
              formControlName="parent_id"
              [allowCreateNew]="false"
              placeholder="Select parent node (optional)..."
            >
            </app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="WBS Node Code *"
              placeholder="e.g. WBS-SUB-01.02"
              formControlName="node_code"
            >
            </app-custom-input>

            <app-custom-input
              label="WBS Node Name / Activity Description *"
              placeholder="e.g. 5th Floor Slab Beam Reinforcement"
              formControlName="node_name"
            >
            </app-custom-input>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="WBS Tier Level *"
              [options]="tierOptions"
              formControlName="wbs_tier"
              [allowCreateNew]="false"
              placeholder="Select tier..."
            >
            </app-searchable-select>

            <app-searchable-select
              label="Construction Phase Category *"
              [options]="phaseOptions"
              formControlName="phase_category"
              [allowCreateNew]="true"
              categoryCode="CONSTRUCTION_PHASE"
              placeholder="Select phase..."
            >
            </app-searchable-select>

            <app-custom-input
              label="Weightage Percentage (%) *"
              type="number"
              min="0"
              max="100"
              placeholder="5.0"
              formControlName="weightage_percentage"
            >
            </app-custom-input>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Planned Start Date *"
              type="date"
              formControlName="planned_start_date"
            >
            </app-custom-input>

            <app-custom-input
              label="Planned End Date *"
              type="date"
              formControlName="planned_end_date"
            >
            </app-custom-input>

            <app-custom-input
              label="Responsible Project Engineer"
              placeholder="Engr. Tanvir Ahmed"
              formControlName="responsible_engineer"
            >
            </app-custom-input>
          </div>

          <app-custom-textarea
            label="Engineering Notes & Quality Checkpoints"
            placeholder="Specify technical drawing reference, curing guidelines, concrete testing requirements..."
            formControlName="remarks"
            [rows]="3"
          >
          </app-custom-textarea>

          <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
            <a
              routerLink="/construction/wbs-boq"
              class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="wbsForm.invalid || isSaving()"
              (clicked)="saveWBSNode()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  Create WBS Node
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class WbsNodeFormComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isSaving = signal<boolean>(false);
  projectOptions: { value: any; label: string }[] = [];
  parentOptions: { value: any; label: string }[] = [];

  tierOptions = [
    { value: 'PHASE', label: 'Tier 1: Major Phase (Substructure, Superstructure, MEP)' },
    { value: 'SUB_PHASE', label: 'Tier 2: Sub-Phase (Floor Casting, Masonry)' },
    { value: 'ACTIVITY', label: 'Tier 3: Construction Activity' },
    { value: 'TASK', label: 'Tier 4: Detailed Daily Task' }
  ];

  phaseOptions = [
    { value: 'SUBSTRUCTURE', label: 'Substructure & Foundation' },
    { value: 'SUPERSTRUCTURE', label: 'Superstructure & Framing' },
    { value: 'FINISHING', label: 'Interior & Exterior Finishing' },
    { value: 'MEP', label: 'Mechanical, Electrical & Plumbing (MEP)' }
  ];

  wbsForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    parent_id: [null],
    node_code: ['', Validators.required],
    node_name: ['', Validators.required],
    wbs_tier: ['ACTIVITY', Validators.required],
    phase_category: ['SUPERSTRUCTURE', Validators.required],
    weightage_percentage: [5.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    planned_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    planned_end_date: [new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], Validators.required],
    responsible_engineer: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
      }
    });

    this.constructionService.getWBSNodes().subscribe({
      next: (nodes) => {
        this.parentOptions = [
          { value: null, label: 'None (Root Node)' },
          ...nodes.map(n => ({
            value: n.id,
            label: `${n.node_code} - ${n.node_name}`
          }))
        ];
      }
    });
  }

  saveWBSNode(): void {
    if (this.wbsForm.invalid) {
      this.wbsForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.wbsForm.value;
    const payload = {
      project_id: Number(formVal.project_id),
      parent_id: formVal.parent_id ? Number(formVal.parent_id) : null,
      node_code: formVal.node_code,
      node_name: formVal.node_name,
      wbs_tier: formVal.wbs_tier,
      phase_category: formVal.phase_category,
      weightage_percentage: Number(formVal.weightage_percentage),
      planned_start_date: formVal.planned_start_date,
      planned_end_date: formVal.planned_end_date,
      responsible_engineer: formVal.responsible_engineer,
      remarks: formVal.remarks
    };

    this.constructionService.createWBSNode(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/wbs-boq']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
