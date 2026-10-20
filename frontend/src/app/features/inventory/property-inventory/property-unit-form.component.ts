import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower } from '../../../core/models/project.model';
import { Unit } from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-property-unit-form',
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
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <a routerLink="/inventory" class="text-blue-600 hover:underline font-medium">Inventory</a>
          <span>/</span>
          <span class="text-slate-800 dark:text-slate-200 font-semibold">
            {{ isEdit ? ('Edit Unit #' + unitId) : 'Register New Unit' }}
          </span>
        </div>
        <a routerLink="/inventory" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Cancel & Return
        </a>
      </div>

      <app-card-container [title]="isEdit ? 'Edit Property Unit Record' : 'Register New Property Unit'" subtitle="Setup architectural spatial specs, pricing rate card, and allocation parameters" badge="Inventory Master">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
          
          @if (errorMessage()) {
            <div class="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold">
              {{ errorMessage() }}
            </div>
          }
          @if (successMessage()) {
            <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold">
              {{ successMessage() }}
            </div>
          }

          <!-- SECTION 1: PROJECT & SPATIAL LOCATION -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              1. Spatial Location & Project Hierarchy
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <app-searchable-select
                  label="Project *"
                  placeholder="Select Project"
                  [options]="projectOptions()"
                  [value]="form.get('project_id')?.value ? String(form.get('project_id')?.value) : ''"
                  [showAddButton]="true"
                  categoryCode="REAL_ESTATE_PROJECT"
                  (selectionChange)="onProjectSelected($event)"
                ></app-searchable-select>
              </div>

              <div>
                <app-searchable-select
                  label="Tower / Block *"
                  placeholder="Select Tower"
                  [options]="towerOptions()"
                  [value]="form.get('tower_id')?.value ? String(form.get('tower_id')?.value) : ''"
                  (selectionChange)="onTowerSelected($event)"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Floor Number *
                </label>
                <input
                  type="number"
                  formControlName="floor_number"
                  min="0"
                  max="100"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Unit Number / Code *
                </label>
                <input
                  type="text"
                  formControlName="unit_number"
                  placeholder="e.g. A-801, 3B"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-semibold"
                />
              </div>
            </div>
          </div>

          <!-- SECTION 2: ARCHITECTURAL CONFIGURATION -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              2. Architectural Specifications & Area
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <app-searchable-select
                  label="Property Type *"
                  placeholder="Select Type"
                  [options]="unitTypeOptions"
                  [value]="form.get('unit_type_id')?.value"
                  (selectionChange)="form.patchValue({ unit_type_id: $event.value })"
                ></app-searchable-select>
              </div>

              <div>
                <app-searchable-select
                  label="Orientation / Facing *"
                  placeholder="Select Facing"
                  [options]="facingOptions"
                  [value]="form.get('facing_id')?.value"
                  (selectionChange)="form.patchValue({ facing_id: $event.value })"
                ></app-searchable-select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Gross Saleable Area (SFT) *
                </label>
                <input
                  type="number"
                  formControlName="gross_saleable_area_sqft"
                  min="100"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Net Carpet Area (SFT) *
                </label>
                <input
                  type="number"
                  formControlName="net_carpet_area_sqft"
                  min="50"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Bedrooms</label>
                <input type="number" formControlName="bed_count" min="0" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Bathrooms</label>
                <input type="number" formControlName="bath_count" min="0" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Balconies</label>
                <input type="number" formControlName="balcony_count" min="0" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
              </div>

              <div>
                <app-searchable-select
                  label="Initial Inventory Status *"
                  placeholder="Select Status"
                  [options]="statusOptions"
                  [value]="form.get('status_id')?.value"
                  (selectionChange)="form.patchValue({ status_id: $event.value })"
                ></app-searchable-select>
              </div>
            </div>
          </div>

          <!-- SECTION 3: DYNAMIC PRICING RATE CARD -->
          <div>
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              3. Dynamic Rate Card & Ancillary Charges
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Base Rate Per SFT (BDT) *
                </label>
                <input
                  type="number"
                  formControlName="base_rate_per_sqft"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Floor Escalation Rate (Per Floor)
                </label>
                <input
                  type="number"
                  formControlName="floor_escalation_rate"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Facing / View Premium
                </label>
                <input
                  type="number"
                  formControlName="facing_premium_rate"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Parking Space Allocation Fee
                </label>
                <input
                  type="number"
                  formControlName="parking_charge"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Utility Connection Charge
                </label>
                <input
                  type="number"
                  formControlName="utility_connection_fee"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Max Allowable Discount
                </label>
                <input
                  type="number"
                  formControlName="max_discount_amount"
                  min="0"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                />
              </div>

              <div class="sm:col-span-2 flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="landowner_share"
                  formControlName="is_landowner_share"
                  class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label for="landowner_share" class="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Assign as Landowner Share (JV Agreement Quota)
                </label>
              </div>
            </div>

            <!-- Price Summary Panel -->
            <div class="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-100 dark:bg-blue-950/30 dark:border-blue-900 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p class="text-xs font-bold text-blue-900 dark:text-blue-300">Auto-Calculated Unit Base Price:</p>
                <p class="text-[11px] text-blue-700 dark:text-blue-400">
                  Effective Rate: ৳{{ computedEffectiveRate() | number:'1.0-0' }}/sq ft
                </p>
              </div>
              <div class="text-right">
                <span class="text-2xl font-black text-blue-900 dark:text-white">
                  ৳{{ computedTotalPrice() | number:'1.0-0' }}
                </span>
              </div>
            </div>
          </div>

          <!-- SUBMIT ACTIONS -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <a routerLink="/inventory" class="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Cancel
            </a>
            <button
              type="submit"
              [disabled]="form.invalid || isSubmitting()"
              class="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              {{ isSubmitting() ? 'Saving Unit...' : (isEdit ? 'Update Unit Record' : 'Register Unit') }}
            </button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class PropertyUnitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);

  isEdit = false;
  unitId: number | null = null;
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  projects = signal<Project[]>([]);
  towers = signal<Tower[]>([]);

  form!: FormGroup;

  unitTypeOptions: SelectOption[] = [
    { label: 'Apartment', value: 'Apartment' },
    { label: 'Commercial Unit', value: 'Commercial Unit' },
    { label: 'Shop', value: 'Shop' },
    { label: 'Penthouse', value: 'Penthouse' },
    { label: 'Duplex Apartment', value: 'Duplex' },
    { label: 'Studio Apartment', value: 'Studio' }
  ];

  facingOptions: SelectOption[] = [
    { label: 'South facing', value: 'South facing' },
    { label: 'North facing', value: 'North facing' },
    { label: 'East facing', value: 'East facing' },
    { label: 'West facing', value: 'West facing' },
    { label: 'Lake View', value: 'Lake View' },
    { label: 'Corner Plot (Dual View)', value: 'Corner Plot' }
  ];

  statusOptions: SelectOption[] = [
    { label: 'Available', value: 'Available' },
    { label: 'Reserved', value: 'Reserved' },
    { label: 'On Hold (15-Min Lock)', value: 'On Hold' },
    { label: 'Booked', value: 'Booked' },
    { label: 'Sold', value: 'Sold' },
    { label: 'Handed Over', value: 'Handed Over' },
    { label: 'Landowner Share', value: 'Landowner Share' },
    { label: 'Blocked', value: 'Blocked' }
  ];

  projectOptions = computed<SelectOption[]>(() => {
    return this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code})`,
      value: String(p.id)
    }));
  });

  towerOptions = computed<SelectOption[]>(() => {
    return this.towers().map(t => ({
      label: t.tower_name,
      value: String(t.id)
    }));
  });

  String = String;

  ngOnInit(): void {
    this.initForm();
    this.loadProjects();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEdit = true;
        this.unitId = Number(id);
        this.loadUnitForEdit(this.unitId);
      }
    });
  }

  private initForm(): void {
    this.form = this.fb.group({
      project_id: [null, [Validators.required]],
      tower_id: [null, [Validators.required]],
      floor_number: [1, [Validators.required, Validators.min(0)]],
      unit_number: ['', [Validators.required]],
      unit_type_id: ['Apartment', [Validators.required]],
      facing_id: ['South facing', [Validators.required]],
      gross_saleable_area_sqft: [1450, [Validators.required, Validators.min(10)]],
      net_carpet_area_sqft: [1200, [Validators.required, Validators.min(10)]],
      bed_count: [3, [Validators.min(0)]],
      bath_count: [3, [Validators.min(0)]],
      balcony_count: [2, [Validators.min(0)]],
      base_rate_per_sqft: [8500, [Validators.required, Validators.min(0)]],
      floor_escalation_rate: [0, [Validators.min(0)]],
      facing_premium_rate: [0, [Validators.min(0)]],
      parking_charge: [500000, [Validators.min(0)]],
      utility_connection_fee: [250000, [Validators.min(0)]],
      max_discount_amount: [150000, [Validators.min(0)]],
      status_id: ['Available', [Validators.required]],
      is_landowner_share: [false]
    });
  }

  private loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any)?.items || [];
        this.projects.set(list);
      }
    });
  }

  onProjectSelected(opt: SelectOption): void {
    const pId = Number(opt.value);
    this.form.patchValue({ project_id: pId, tower_id: null });
    this.loadTowersForProject(pId);
  }

  onTowerSelected(opt: SelectOption): void {
    this.form.patchValue({ tower_id: Number(opt.value) });
  }

  private loadTowersForProject(projectId: number): void {
    this.projectService.getProject(projectId).subscribe({
      next: (p) => {
        const tws = (p as any)?.towers || [];
        if (tws.length > 0) {
          this.towers.set(tws);
        } else {
          this.towers.set([
            { id: 1, project_id: projectId, tower_code: 'TWA', tower_name: 'Tower A', total_floors: 15 } as any,
            { id: 2, project_id: projectId, tower_code: 'TWB', tower_name: 'Tower B', total_floors: 12 } as any
          ]);
        }
      }
    });
  }

  private loadUnitForEdit(id: number): void {
    this.inventoryService.getUnitById(id).subscribe({
      next: (u) => {
        this.form.patchValue({
          project_id: u.project_id,
          tower_id: u.tower_id,
          floor_number: u.floor_number,
          unit_number: u.unit_number,
          unit_type_id: u.unit_type_id,
          facing_id: u.facing_id,
          gross_saleable_area_sqft: u.gross_saleable_area_sqft,
          net_carpet_area_sqft: u.net_carpet_area_sqft,
          bed_count: u.bed_count || 3,
          bath_count: u.bath_count || 3,
          balcony_count: u.balcony_count || 2,
          base_rate_per_sqft: u.base_rate_per_sqft,
          floor_escalation_rate: u.floor_escalation_rate || 0,
          facing_premium_rate: u.facing_premium_rate || 0,
          parking_charge: u.parking_charge || 0,
          utility_connection_fee: u.utility_connection_fee || 250000,
          max_discount_amount: u.max_discount_amount || 0,
          status_id: u.status_id,
          is_landowner_share: u.is_landowner_share || false
        });
        if (u.project_id) {
          this.loadTowersForProject(u.project_id);
        }
      },
      error: (err) => {
        this.errorMessage.set('Could not load unit details for editing.');
      }
    });
  }

  computedEffectiveRate(): number {
    const base = Number(this.form.get('base_rate_per_sqft')?.value) || 0;
    const floor = Number(this.form.get('floor_escalation_rate')?.value) || 0;
    const facing = Number(this.form.get('facing_premium_rate')?.value) || 0;
    return base + floor + facing;
  }

  computedTotalPrice(): number {
    const area = Number(this.form.get('gross_saleable_area_sqft')?.value) || 0;
    return Math.round(area * this.computedEffectiveRate());
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const val = this.form.value;
    const payload = {
      ...val,
      effective_rate_per_sqft: this.computedEffectiveRate(),
      total_unit_price: this.computedTotalPrice()
    };

    if (this.isEdit && this.unitId) {
      this.inventoryService.updateUnit(this.unitId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Unit updated successfully.');
          setTimeout(() => this.router.navigate(['/inventory/units', this.unitId]), 800);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update unit record.');
        }
      });
    } else {
      this.inventoryService.createUnit(payload).subscribe({
        next: (created) => {
          this.isSubmitting.set(false);
          this.successMessage.set('Unit registered successfully.');
          setTimeout(() => this.router.navigate(['/inventory']), 800);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create unit record.');
        }
      });
    }
  }
}
