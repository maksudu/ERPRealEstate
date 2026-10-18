import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { Subcontractor } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-work-order-form',
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
            routerLink="/construction/ra-bills"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to RA Bills & Contracts"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Civil Contracts & Work Orders
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                New Subcontractor Service Agreement
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Issue Subcontractor Work Order (WO)
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/ra-bills"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="woForm.invalid || isSaving()"
            (clicked)="saveWorkOrder()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                Issue Work Order
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Work Order Scope & Financial Retention Terms"
        subtitle="Specify project, assigned trade contractor, contract value, retention terms, and DLP"
      >
        <form [formGroup]="woForm" class="flex flex-col gap-6">
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
              label="Select Subcontractor *"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select trade contractor..."
            >
            </app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Contract Type *"
              [options]="contractTypeOptions"
              formControlName="contract_type"
              [allowCreateNew]="false"
              placeholder="Select contract type..."
            >
            </app-searchable-select>

            <app-custom-input
              label="Total Contract Value (BDT) *"
              type="number"
              min="0"
              placeholder="12,000,000"
              formControlName="total_contract_value"
            >
            </app-custom-input>

            <app-custom-input
              label="Retention Money Percent (%) *"
              type="number"
              min="0"
              max="20"
              placeholder="5.0"
              formControlName="retention_money_percent"
            >
            </app-custom-input>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Defects Liability Period (Months) *"
              type="number"
              min="0"
              placeholder="12"
              formControlName="defect_liability_months"
            >
            </app-custom-input>

            <div class="p-3 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
              <div>
                <span class="text-xs text-muted-foreground block">5% Retention Security:</span>
                <span class="text-sm font-bold text-foreground font-mono">
                  BDT {{ (woForm.get('total_contract_value')?.value || 0) * 0.05 | number:'1.2-2' }}
                </span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                Protected Cash Flow
              </span>
            </div>
          </div>

          <app-custom-textarea
            label="Detailed Scope of Work & Structural Specifications *"
            placeholder="Specify bill of quantities reference, structural milestones, completion deadlines, safety penalty clauses..."
            formControlName="scope_of_work"
            [rows]="4"
          >
          </app-custom-textarea>

          <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
            <a
              routerLink="/construction/ra-bills"
              class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="woForm.invalid || isSaving()"
              (clicked)="saveWorkOrder()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  Issue Work Order
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class WorkOrderFormComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  isSaving = signal<boolean>(false);
  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  contractTypeOptions = [
    { value: 'ITEM_RATE', label: 'Item Rate Contract (BOQ Measured)' },
    { value: 'LUMP_SUM', label: 'Lump Sum Fixed Price' },
    { value: 'COST_PLUS', label: 'Cost Plus Margin (Percentage Fee)' },
    { value: 'LABOR_ONLY', label: 'Labor Supply Only (Client Materials)' }
  ];

  woForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    contractor_id: [null, Validators.required],
    contract_type: ['ITEM_RATE', Validators.required],
    total_contract_value: [12000000, [Validators.required, Validators.min(1000)]],
    retention_money_percent: [5.0, [Validators.required, Validators.min(0), Validators.max(20)]],
    defect_liability_months: [12, [Validators.required, Validators.min(1)]],
    scope_of_work: ['', Validators.required]
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

    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractorOptions = conts.map(c => ({
          value: c.id,
          label: `${c.company_name} (${c.contractor_code})`
        }));
      }
    });
  }

  saveWorkOrder(): void {
    if (this.woForm.invalid) {
      this.woForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.woForm.value;
    const payload = {
      project_id: Number(formVal.project_id),
      contractor_id: Number(formVal.contractor_id),
      contract_type: formVal.contract_type,
      total_contract_value: Number(formVal.total_contract_value),
      retention_money_percent: Number(formVal.retention_money_percent),
      defect_liability_months: Number(formVal.defect_liability_months),
      scope_of_work: formVal.scope_of_work
    };

    this.constructionService.createWorkOrder(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/ra-bills']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
