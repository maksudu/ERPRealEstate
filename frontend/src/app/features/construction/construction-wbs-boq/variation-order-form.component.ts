import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { BOQItemBudgetLock } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-variation-order-form',
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
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                BOQ Hard Budget Locks
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                Hard Ceiling Expansion
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Issue Formal Variation Order (VO)
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
            [disabled]="voForm.invalid || isSaving()"
            (clicked)="saveVariationOrder()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Issue Variation Order
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Variation Order Scope & Quantity Adjustment"
        subtitle="Unlocks hard budget ceilings by approving additional quantity beyond 105% threshold"
      >
        <form [formGroup]="voForm" class="flex flex-col gap-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-searchable-select
              label="Select Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              (selectionChange)="onProjectSelected($event)"
              placeholder="Select project..."
            >
            </app-searchable-select>

            <app-searchable-select
              label="Target BOQ Item *"
              [options]="boqOptions"
              formControlName="boq_item_id"
              [allowCreateNew]="false"
              placeholder="Select BOQ item to expand..."
            >
            </app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="VO Reference Number *"
              placeholder="e.g. VO-PRJ01-2026-001"
              formControlName="vo_number"
            >
            </app-custom-input>

            <app-custom-input
              label="Approved Additional Quantity *"
              type="number"
              min="0.01"
              placeholder="500.00"
              formControlName="approved_quantity"
            >
            </app-custom-input>

            <app-custom-input
              label="Unit Rate (BDT) *"
              type="number"
              min="0"
              placeholder="1200.00"
              formControlName="unit_rate"
            >
            </app-custom-input>
          </div>

          <div class="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span class="text-xs text-muted-foreground block">Additional Approved Budget:</span>
              <span class="text-xl font-bold font-mono text-amber-500">
                BDT {{ (voForm.get('approved_quantity')?.value || 0) * (voForm.get('unit_rate')?.value || 0) | number:'1.2-2' }}
              </span>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              Expands 105% Requisition Limit
            </span>
          </div>

          <app-custom-textarea
            label="Technical Justification & Structural Variance Reason *"
            placeholder="Document rationale: architectural plan revision, soil condition variance, structural beam resizing..."
            formControlName="justification_reason"
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
              [disabled]="voForm.invalid || isSaving()"
              (clicked)="saveVariationOrder()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  Issue Variation Order
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class VariationOrderFormComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isSaving = signal<boolean>(false);
  projectOptions: { value: any; label: string }[] = [];
  boqOptions: { value: any; label: string }[] = [];

  voForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    boq_item_id: [null, Validators.required],
    vo_number: [`VO-2026-${Math.floor(100 + Math.random() * 900)}`, Validators.required],
    approved_quantity: [100.0, [Validators.required, Validators.min(0.01)]],
    unit_rate: [1200.0, [Validators.required, Validators.min(0)]],
    justification_reason: ['', Validators.required]
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

    this.constructionService.getBOQBudgetLocks().subscribe({
      next: (items) => {
        this.boqOptions = items.map(i => ({
          value: i.id,
          label: `${i.item_code || 'BOQ-' + i.id} - ${i.item_description} (Est: ${i.estimated_quantity} ${i.unit_of_measure_id})`
        }));
      }
    });
  }

  onProjectSelected(projectId: any): void {
    if (!projectId) return;
    this.constructionService.getBOQBudgetLocks({ project_id: Number(projectId) }).subscribe({
      next: (items) => {
        this.boqOptions = items.map(i => ({
          value: i.id,
          label: `${i.item_code || 'BOQ-' + i.id} - ${i.item_description} (Est: ${i.estimated_quantity} ${i.unit_of_measure_id})`
        }));
      }
    });
  }

  saveVariationOrder(): void {
    if (this.voForm.invalid) {
      this.voForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.voForm.value;
    const qty = Number(formVal.approved_quantity);
    const rate = Number(formVal.unit_rate);
    const payload = {
      project_id: Number(formVal.project_id),
      boq_item_id: Number(formVal.boq_item_id),
      vo_number: formVal.vo_number,
      additional_quantity: qty,
      approved_rate: rate,
      total_vo_amount: qty * rate,
      justification_reason: formVal.justification_reason
    };

    this.constructionService.createVariationOrder(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/wbs-boq']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
