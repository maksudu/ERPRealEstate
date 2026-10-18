import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { Subcontractor, DPRReport } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-labor-muster-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/labor-muster"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Labor Muster Roll"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Site Labor Operations
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Editing Entry #' + musterId() : 'New Muster Roll Log' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Daily Labor Muster Record' : 'Record Subcontractor Daily Labor Muster' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/labor-muster"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="musterForm.invalid || isSaving()"
            (clicked)="saveMuster()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                Saving...
              } @else {
                {{ isEditMode() ? 'Update Muster Entry' : 'Save Muster Record' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Labor Muster Entry & Daily Wage Allotment"
        subtitle="Associate trade subcontractor, headcounts, daily wage rates, and DPR diary report"
      >
        <form [formGroup]="musterForm" class="flex flex-col gap-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-searchable-select
              label="Associated DPR Site Diary Report *"
              [options]="dprOptions"
              formControlName="dpr_id"
              [allowCreateNew]="false"
              placeholder="Select DPR report..."
            >
            </app-searchable-select>

            <app-searchable-select
              label="Assigned Subcontractor *"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select trade subcontractor..."
            >
            </app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Trade Specialization Category *"
              [options]="tradeOptions"
              formControlName="trade_category"
              [allowCreateNew]="true"
              categoryCode="CONSTRUCTION_TRADE"
              placeholder="Select trade category..."
            >
            </app-searchable-select>

            <app-custom-input
              label="Worker Headcount *"
              type="number"
              min="1"
              placeholder="1"
              formControlName="worker_count"
            >
            </app-custom-input>

            <app-custom-input
              label="Daily Wage Rate (BDT) *"
              type="number"
              min="0"
              placeholder="800.00"
              formControlName="daily_wage_rate"
            >
            </app-custom-input>
          </div>

          <!-- Total Calculation Banner -->
          <div class="p-4 rounded-xl border border-border bg-secondary/30 flex items-center justify-between">
            <div>
              <span class="text-xs text-muted-foreground block">Calculated Daily Wage Bill:</span>
              <span class="text-lg font-bold text-foreground font-mono">
                BDT {{ calculatedTotalWage() | number:'1.2-2' }}
              </span>
            </div>
            <div class="text-xs text-muted-foreground">
              {{ musterForm.get('worker_count')?.value || 0 }} workers &times; BDT {{ musterForm.get('daily_wage_rate')?.value || 0 | number:'1.2-2' }}
            </div>
          </div>

          <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
            <a
              routerLink="/construction/labor-muster"
              class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="musterForm.invalid || isSaving()"
              (clicked)="saveMuster()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  {{ isEditMode() ? 'Update Muster Entry' : 'Save Muster Record' }}
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class LaborMusterFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);

  isEditMode = signal<boolean>(false);
  musterId = signal<number | null>(null);
  isSaving = signal<boolean>(false);

  contractors = signal<Subcontractor[]>([]);
  dprReports = signal<DPRReport[]>([]);

  contractorOptions: { value: any; label: string }[] = [];
  dprOptions: { value: any; label: string }[] = [];

  tradeOptions = [
    { value: 'CIVIL_MASONRY', label: 'Civil & Masonry' },
    { value: 'REBAR_TYING', label: 'Rebar Tying & Cutting' },
    { value: 'SHUTTERING_CARPENTER', label: 'Shuttering & Formwork' },
    { value: 'PLUMBING_SANITARY', label: 'Plumbing & Sanitary' },
    { value: 'ELECTRICAL_CONDUITING', label: 'Electrical Conduiting' },
    { value: 'TILE_MARBLE', label: 'Tile & Marble Work' },
    { value: 'PAINTING_POLISH', label: 'Painting & Polishing' },
    { value: 'GENERAL_LABOR', label: 'General Site Helper / Labor' }
  ];

  musterForm: FormGroup = this.fb.group({
    dpr_id: [null, Validators.required],
    contractor_id: [null, Validators.required],
    trade_category: ['CIVIL_MASONRY', Validators.required],
    worker_count: [1, [Validators.required, Validators.min(1)]],
    daily_wage_rate: [800.00, [Validators.required, Validators.min(0)]]
  });

  calculatedTotalWage(): number {
    const count = Number(this.musterForm.get('worker_count')?.value) || 0;
    const rate = Number(this.musterForm.get('daily_wage_rate')?.value) || 0;
    return count * rate;
  }

  ngOnInit(): void {
    this.loadMasters();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.musterId.set(id);
        this.loadMuster(id);
      }
    }
  }

  loadMasters(): void {
    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractors.set(conts);
        this.contractorOptions = conts.map(c => ({
          value: c.id,
          label: `${c.company_name} (${c.contractor_code}) - ${c.trade_specialization}`
        }));
      }
    });

    this.constructionService.getDPRReports().subscribe({
      next: (dprs) => {
        this.dprReports.set(dprs);
        this.dprOptions = dprs.map(d => ({
          value: d.id,
          label: `DPR #${d.id} - ${d.report_date} (${d.project_name || 'Project ' + d.project_id}) - ${d.floor_unit_location}`
        }));
      }
    });
  }

  loadMuster(id: number): void {
    this.constructionService.getLaborMusterById(id).subscribe({
      next: (m) => {
        this.musterForm.patchValue({
          dpr_id: m.dpr_id,
          contractor_id: m.contractor_id,
          trade_category: m.trade_category,
          worker_count: m.worker_count,
          daily_wage_rate: m.daily_wage_rate
        });
      }
    });
  }

  saveMuster(): void {
    if (this.musterForm.invalid) {
      this.musterForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.musterForm.value;
    const payload = {
      dpr_id: Number(formVal.dpr_id),
      contractor_id: Number(formVal.contractor_id),
      trade_category: formVal.trade_category,
      worker_count: Number(formVal.worker_count),
      daily_wage_rate: Number(formVal.daily_wage_rate)
    };

    const action$ = this.isEditMode() && this.musterId()
      ? this.constructionService.updateLaborMuster(this.musterId()!, payload)
      : this.constructionService.createLaborMuster(payload);

    action$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/labor-muster']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
