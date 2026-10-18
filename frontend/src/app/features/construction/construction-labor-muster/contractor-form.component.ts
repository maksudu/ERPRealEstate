import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-contractor-form',
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
                Trade Contractors Directory
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Editing Subcontractor #' + contractorId() : 'New Enlistment' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Subcontractor Profile' : 'Enlist New Trade Subcontractor' }}
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
            [disabled]="contractorForm.invalid || isSaving()"
            (clicked)="saveContractor()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isEditMode() ? 'Update Subcontractor' : 'Enlist Subcontractor' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        title="Subcontractor Corporate & Commercial Details"
        subtitle="Trade specialization, tax identification (TIN/BIN), authorized contact, and phone registry"
      >
        <form [formGroup]="contractorForm" class="flex flex-col gap-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Company / Enterprise Name *"
              placeholder="e.g. Meghna Civil Works & Engineering Ltd."
              formControlName="company_name"
            >
            </app-custom-input>

            <app-searchable-select
              label="Trade Specialization *"
              [options]="tradeOptions"
              formControlName="trade_specialization"
              [allowCreateNew]="true"
              categoryCode="CONSTRUCTION_TRADE"
              placeholder="Select trade specialization..."
            >
            </app-searchable-select>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="Primary Contact Person *"
              placeholder="e.g. Md. Rafiqul Islam (Proprietor)"
              formControlName="contact_person"
            >
            </app-custom-input>

            <app-custom-input
              label="Primary Contact Mobile *"
              placeholder="+880 1711-XXXXXX"
              formControlName="primary_phone"
            >
            </app-custom-input>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-custom-input
              label="TIN Number (e-TIN)"
              placeholder="12-digit e-TIN number"
              formControlName="tin_number"
            >
            </app-custom-input>

            <app-custom-input
              label="BIN Number (VAT Registration)"
              placeholder="13-digit BIN / VAT number"
              formControlName="bin_number"
            >
            </app-custom-input>
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
              [disabled]="contractorForm.invalid || isSaving()"
              (clicked)="saveContractor()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  Saving...
                } @else {
                  {{ isEditMode() ? 'Update Subcontractor' : 'Enlist Subcontractor' }}
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class ContractorFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);

  isEditMode = signal<boolean>(false);
  contractorId = signal<number | null>(null);
  isSaving = signal<boolean>(false);

  tradeOptions = [
    { value: 'CIVIL_MASONRY', label: 'Civil & Masonry' },
    { value: 'REBAR_FABRICATION', label: 'Rebar Cutting, Bending & Tying' },
    { value: 'SHUTTERING_FORMWORK', label: 'Shuttering, Scaffolding & Formwork' },
    { value: 'PLUMBING_DRAINAGE', label: 'Sanitary & Internal/External Plumbing' },
    { value: 'ELECTRICAL_SUBSTATION', label: 'Electrical Wiring, Substation & Conduiting' },
    { value: 'TILE_MARBLE_FINISHING', label: 'Tile, Marble, Granite & Floor Finishing' },
    { value: 'PAINTING_DECORATION', label: 'Weather-Proof Painting & Wall Finishes' },
    { value: 'PILING_DEEP_FOUNDATION', label: 'Cast-in-Situ Piling & Deep Foundation' },
    { value: 'HVAC_FIRE_PROTECTION', label: 'HVAC Ventilation & Fire Fighting Systems' },
    { value: 'ALUMINUM_GLASS_FACADE', label: 'Curtain Wall, Aluminum & Glass Facade' }
  ];

  contractorForm: FormGroup = this.fb.group({
    company_name: ['', Validators.required],
    trade_specialization: ['CIVIL_MASONRY', Validators.required],
    contact_person: ['', Validators.required],
    primary_phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{8,20}$/)]],
    tin_number: [''],
    bin_number: ['']
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.contractorId.set(id);
        this.loadContractor(id);
      }
    }
  }

  loadContractor(id: number): void {
    this.constructionService.getContractorById(id).subscribe({
      next: (c) => {
        this.contractorForm.patchValue({
          company_name: c.company_name,
          trade_specialization: c.trade_specialization,
          contact_person: c.contact_person,
          primary_phone: c.primary_phone,
          tin_number: c.tin_number,
          bin_number: c.bin_number
        });
      }
    });
  }

  saveContractor(): void {
    if (this.contractorForm.invalid) {
      this.contractorForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload = this.contractorForm.value;

    const action$ = this.isEditMode() && this.contractorId()
      ? this.constructionService.updateContractor(this.contractorId()!, payload)
      : this.constructionService.createContractor(payload);

    action$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/labor-muster']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
