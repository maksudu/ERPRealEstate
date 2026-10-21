import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { LandService } from '../../../core/services/land.service';
import { SearchableSelectComponent, CardContainerComponent } from '../../../shared/components';

type Entity = 'towers' | 'floors' | 'units' | 'revisions';

@Component({
  selector: 'app-tower-floor-unit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, CardContainerComponent],
  template: `
    <app-card-container [title]="(editing ? 'Edit ' : 'New ') + title" subtitle="Record changes are saved to the project development database">
      <div class="mb-4 flex items-center justify-between">
        <a routerLink="/projects/towers-units" class="text-sm font-semibold text-blue-700 hover:underline flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Towers, Floors & Units
        </a>
        <span class="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Module: {{ entity }}
        </span>
      </div>

      @if (error()) { <div role="alert" class="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">{{ error() }}</div> }
      @if (success()) { <div role="status" class="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{{ success() }}</div> }

      @if (loading()) {
        <div class="py-12 text-center text-slate-500">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-emerald-600 mb-2"></div>
          <p>Loading {{ title.toLowerCase() }} record…</p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">
          <!-- Hierarchy Link Section -->
          <div class="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid gap-4 md:grid-cols-3">
            <div>
              <app-searchable-select label="Parent Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select project..." [allowCreateNew]="false"></app-searchable-select>
            </div>
            
            @if (entity === 'towers') {
              <div>
                <app-searchable-select label="Acquired Land Parcel (Link)" [required]="false" [options]="parcelOptions()" formControlName="land_parcel_id" placeholder="Link Land Parcel (Optional)..." [allowCreateNew]="false"></app-searchable-select>
              </div>
            }

            @if (entity !== 'towers') {
              <div>
                <app-searchable-select label="Parent Tower / Building" [required]="entity !== 'revisions'" [options]="towerOptions()" formControlName="tower_id" placeholder="Select tower..." [allowCreateNew]="false"></app-searchable-select>
              </div>
            }

            @if (entity === 'units' || (entity === 'revisions' && form.get('target_level')?.value === 'UNIT')) {
              <div>
                <app-searchable-select label="Parent Floor" [options]="floorOptions()" formControlName="floor_id" placeholder="Select floor..." [allowCreateNew]="false"></app-searchable-select>
              </div>
            }
          </div>

          <!-- Dynamic Field Sections -->
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            @for (field of fields; track field.key) {
              <div [class.md:col-span-2]="field.type === 'textarea'" [class.lg:col-span-3]="field.type === 'textarea' || field.fullWidth">
                <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  {{ field.label }} <span *ngIf="field.required" class="text-rose-600">*</span>
                </label>

                @if (field.options) {
                  <app-searchable-select [label]="''" [options]="fieldOptions(field)" [formControlName]="field.key" [allowCreateNew]="false" [searchable]="true"></app-searchable-select>
                } @else if (field.type === 'textarea') {
                  <textarea class="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" rows="3" [formControlName]="field.key" [placeholder]="field.placeholder || ''"></textarea>
                } @else if (field.type === 'checkbox') {
                  <div class="flex items-center gap-2 mt-2">
                    <input type="checkbox" [formControlName]="field.key" class="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                    <span class="text-sm text-slate-600 dark:text-slate-400">{{ field.hint || 'Yes / Required' }}</span>
                  </div>
                } @else {
                  <input class="w-full rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" [type]="field.type || 'text'" [formControlName]="field.key" [placeholder]="field.placeholder || ''" />
                }
                @if (field.hint && field.type !== 'checkbox') {
                  <span class="text-[11px] text-slate-500 mt-0.5 block">{{ field.hint }}</span>
                }
              </div>
            }
          </div>

          <!-- Footer Actions -->
          <div class="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-5">
            <a routerLink="/projects/towers-units" class="rounded-lg border border-slate-300 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </a>
            <button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-colors flex items-center gap-2">
              @if (saving()) {
                <span class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>Saving…</span>
              } @else {
                <span>{{ editing ? 'Save Changes' : 'Create ' + title }}</span>
              }
            </button>
          </div>
        </form>
      }
    </app-card-container>`
})
export class TowerFloorUnitFormComponent implements OnInit {
  private api = inject(ProjectService);
  private landApi = inject(LandService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  entity: Entity = 'towers';
  editing = false;
  id = 0;
  title = 'Tower';
  loading = signal(false);
  saving = signal(false);
  error = signal('');
  success = signal('');

  projects = signal<any[]>([]);
  parcels = signal<any[]>([]);
  towers = signal<any[]>([]);
  floors = signal<any[]>([]);

  projectOptions = () => this.projects().map(x => ({ value: x.id, label: `${x.project_code} — ${x.project_name}` }));
  parcelOptions = () => this.parcels().map(x => ({ value: x.id, label: `${x.parcel_code || 'LND'} — ${x.mouza || ''} (Khatian: ${x.khatian_number || 'N/A'}, CS/RS: ${x.dag_number || 'N/A'})` }));
  towerOptions = () => this.towers().map(x => ({ value: x.id, label: `${x.tower_code} — ${x.tower_name} (${x.building_name || 'Main'})` }));
  floorOptions = () => this.floors().map(x => ({ value: x.id, label: `${x.display_name} (Floor ${x.floor_number})` }));
  fieldOptions = (field: any) => (field.options || []).map((value: string) => ({ value, label: value.replaceAll('_', ' ') }));

  fields: any[] = [];
  form = this.fb.group({
    project_id: [null as number | null, Validators.required],
    land_parcel_id: [null as number | null],
    tower_id: [null as number | null],
    floor_id: [null as number | null]
  });

  ngOnInit() {
    this.entity = (this.route.snapshot.paramMap.get('entity') as Entity) || 'towers';
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.editing = !!this.id;
    this.title = this.entity === 'towers' ? 'Building / Tower' : this.entity === 'floors' ? 'Floor' : this.entity === 'units' ? 'Unit / Space' : 'Design Revision';

    this.configureFields();

    this.api.getProjects().subscribe({
      next: p => this.projects.set(p || []),
      error: () => this.error.set('Could not load projects.')
    });

    if (this.entity === 'towers') {
      this.landApi.getParcels().subscribe({
        next: p => this.parcels.set(p || []),
        error: () => {}
      });
    }

    this.form.controls.project_id.valueChanges.subscribe(id => {
      if (id) {
        this.api.getTowers(Number(id)).subscribe({
          next: rows => this.towers.set(rows || []),
          error: () => this.error.set('Could not load towers.')
        });
      } else {
        this.towers.set([]);
      }
    });

    this.form.controls.tower_id.valueChanges.subscribe(id => {
      if (id && (this.entity === 'units' || this.entity === 'revisions')) {
        this.api.getFloors({ tower_id: Number(id), limit: 200 }).subscribe({
          next: p => this.floors.set(p.items || []),
          error: () => this.error.set('Could not load floors.')
        });
      } else {
        this.floors.set([]);
      }
    });

    if (this.editing) {
      this.loadRecord();
    }
  }

  configureFields() {
    const definitions: Record<Entity, any[]> = {
      towers: [
        { key: 'building_name', label: 'Building Name / Complex', placeholder: 'e.g. Building 1, North Block' },
        { key: 'tower_code', label: 'Tower Code', required: true, placeholder: 'e.g. TWR-A' },
        { key: 'tower_name', label: 'Tower / Wing Name', required: true, placeholder: 'e.g. Tower Alpha' },
        { key: 'building_code', label: 'Building Code', placeholder: 'e.g. BLD-01' },
        { key: 'building_type', label: 'Building Space Type', options: ['RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'SHOPPING_COMPLEX', 'OFFICE'] },
        { key: 'configuration_stage', label: 'Configuration Stage', options: ['PROPOSED', 'APPROVED', 'AS_BUILT', 'REVISED'] },
        { key: 'total_floors', label: 'Total Floors', type: 'number', hint: 'Including basements & podium' },
        { key: 'basement_floors', label: 'Basement Floors', type: 'number', hint: 'Below ground' },
        { key: 'podium_floors', label: 'Podium Floors', type: 'number' },
        { key: 'residential_floors', label: 'Residential Floors', type: 'number' },
        { key: 'commercial_floors', label: 'Commercial Floors', type: 'number' },
        { key: 'total_lifts', label: 'Passenger & Service Lifts', type: 'number' },
        { key: 'staircase_count', label: 'Fire & Main Staircases', type: 'number' },
        { key: 'parking_capacity_cars', label: 'Car Parking Capacity (Bays)', type: 'number' },
        { key: 'approved_height_m', label: 'Approved Height (Meters)', type: 'number' },
        { key: 'approved_floor_area_sqft', label: 'Approved Total Floor Area (sq ft)', type: 'number' },
        { key: 'structural_system', label: 'Structural System', placeholder: 'e.g. RCC Shear Wall, Post-Tensioned' },
        { key: 'construction_status', label: 'Construction Status', options: ['PLANNING', 'NOT_STARTED', 'FOUNDATION', 'UNDER_CONSTRUCTION', 'COMPLETED'] },
        { key: 'approved_architectural_plan_ref', label: 'Arch. Plan Drawing Reference', placeholder: 'e.g. RAJUK/BP-2024/981' },
        { key: 'structural_drawing_ref', label: 'Structural Drawing Ref', placeholder: 'e.g. STR-DWG-001/Rev2' },
        { key: 'electrical_drawing_ref', label: 'Electrical Drawing Ref', placeholder: 'e.g. ELEC-SCH-004' },
        { key: 'plumbing_drawing_ref', label: 'Plumbing & Sanitation Ref', placeholder: 'e.g. PLMB-ISO-002' },
        { key: 'fire_safety_drawing_ref', label: 'Fire Safety NOC Reference', placeholder: 'e.g. FSCD/NOC/2024-512' },
        { key: 'lobby_corridor_details', label: 'Lobby & Corridor Facilities', type: 'textarea', placeholder: 'Describe reception lobby, security gates, entrance porch...' },
        { key: 'common_facilities_description', label: 'Common Facilities (Gym, Pool, Community Hall)', type: 'textarea', placeholder: 'Community hall on 2nd floor, rooftop swimming pool, gym...' },
        { key: 'rooftop_service_details', label: 'Rooftop & Utility Area Configuration', type: 'textarea', placeholder: 'Water reservoir, solar panels, elevator machine room, helipad...' },
        { key: 'building_specifications', label: 'General Building Specifications', type: 'textarea' }
      ],
      floors: [
        { key: 'floor_number', label: 'Floor Number (e.g. -2, 0, 1..30)', type: 'number', required: true, hint: '-2 for B2, 0 for Ground, 1+ for Upper' },
        { key: 'display_name', label: 'Display Name', required: true, placeholder: 'e.g. Basement 1, Ground Floor, 14th Floor' },
        { key: 'floor_type', label: 'Floor Space Type', options: ['BASEMENT', 'GROUND', 'PODIUM', 'RESIDENTIAL', 'COMMERCIAL', 'SERVICE', 'ROOF'] },
        { key: 'configuration_stage', label: 'Configuration Stage', options: ['PROPOSED', 'APPROVED', 'AS_BUILT', 'REVISED'] },
        { key: 'floor_area_sqft', label: 'Total Floor Area (sq ft)', type: 'number', required: true },
        { key: 'common_area_sqft', label: 'Common Area (sq ft)', type: 'number' },
        { key: 'lobby_area_sqft', label: 'Lobby Area (sq ft)', type: 'number' },
        { key: 'corridor_area_sqft', label: 'Corridor Area (sq ft)', type: 'number' },
        { key: 'staircase_count', label: 'Staircase Count', type: 'number' },
        { key: 'lift_count', label: 'Lifts Serving Floor', type: 'number' },
        { key: 'planned_units_count', label: 'Planned Units on Floor', type: 'number' },
        { key: 'approved_plan_ref', label: 'Floor Approved Drawing Reference', placeholder: 'e.g. FLR-PLAN-05/RAJUK' },
        { key: 'construction_status', label: 'Construction Status', options: ['NOT_STARTED', 'PLANNING', 'FOUNDATION', 'UNDER_CONSTRUCTION', 'CASTING', 'COMPLETED'] },
        { key: 'inspection_status', label: 'Quality / Rebar Inspection', options: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'] },
        { key: 'utility_service_details', label: 'Utility & MEP Shaft Configuration', type: 'textarea', placeholder: 'Electrical duct, plumbing riser, trash chute, AHU room...' },
        { key: 'inspection_history', label: 'Structural Inspection History & Notes', type: 'textarea' }
      ],
      units: [
        { key: 'unit_code', label: 'Unit Code', required: true, placeholder: 'e.g. U-1402, APT-B3' },
        { key: 'floor_number', label: 'Floor Number', type: 'number', required: true },
        { key: 'space_type', label: 'Space Classification', options: ['RESIDENTIAL', 'COMMERCIAL', 'RETAIL', 'OFFICE', 'SHOP', 'PENTHOUSE', 'DUPLEX', 'PARKING_BAY', 'STUDIO'] },
        { key: 'unit_type', label: 'Unit Typology', placeholder: 'e.g. 3-BHK Type A, Corner Shop' },
        { key: 'configuration_stage', label: 'Configuration Stage', options: ['PROPOSED', 'APPROVED', 'AS_BUILT', 'REVISED'] },
        { key: 'bedroom_count', label: 'Bedrooms', type: 'number' },
        { key: 'bathroom_count', label: 'Bathrooms', type: 'number' },
        { key: 'balcony_count', label: 'Balconies', type: 'number' },
        { key: 'usable_carpet_area_sqft', label: 'Usable Carpet Area (sq ft)', type: 'number', hint: 'Net internal living area' },
        { key: 'balcony_area_sqft', label: 'Balcony Area (sq ft)', type: 'number' },
        { key: 'common_area_allocated_sqft', label: 'Allocated Common Area (sq ft)', type: 'number' },
        { key: 'gross_area_sqft', label: 'Gross Area (sq ft)', type: 'number' },
        { key: 'saleable_area_sqft', label: 'Total Saleable Area (sq ft)', type: 'number', required: true },
        { key: 'parking_bay_count', label: 'Allocated Parking Bays', type: 'number' },
        { key: 'parking_bay_number', label: 'Parking Bay Numbers', placeholder: 'e.g. B1-04, B2-12' },
        { key: 'unit_orientation', label: 'Orientation / Facing', placeholder: 'e.g. South-East Lake Facing' },
        { key: 'planned_price_bdt', label: 'Planned Price (BDT ৳)', type: 'number' },
        { key: 'ownership_classification', label: 'Ownership', options: ['DEVELOPER_INVENTORY', 'LANDOWNER_ALLOCATION', 'JV_PARTNER', 'INVESTOR_RETAINED'] },
        { key: 'unit_status', label: 'Commercial Status', options: ['AVAILABLE', 'RESERVED', 'BOOKED', 'SOLD', 'ALLOCATED'] },
        { key: 'approved_plan_reference', label: 'Approved Unit Layout Ref', placeholder: 'e.g. APT-LAYOUT-14B' },
        { key: 'regulatory_approval_memo', label: 'Regulatory Approval Memo', placeholder: 'e.g. RAJUK-APP-2024-88' },
        { key: 'parking_details', label: 'Parking Bay Description' },
        { key: 'specifications', label: 'Unit Finishes & Fittings Specifications', type: 'textarea' }
      ],
      revisions: [
        { key: 'revision_code', label: 'Revision Code', required: true, placeholder: 'e.g. REV-2024-001' },
        { key: 'revision_title', label: 'Revision Title', required: true, placeholder: 'e.g. Living room layout expansion & MEP rerouting' },
        { key: 'revision_type', label: 'Revision Discipline', options: ['ARCHITECTURAL', 'STRUCTURAL', 'MEP', 'FIRE_SAFETY', 'UNIT_CONFIG', 'FACADE', 'REGULATORY'] },
        { key: 'target_level', label: 'Hierarchy Level', options: ['PROJECT', 'BUILDING', 'TOWER', 'FLOOR', 'UNIT'] },
        { key: 'revision_status', label: 'Approval Status', options: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED'] },
        { key: 'requires_regulatory_approval', label: 'Requires RAJUK/CDA Approval?', type: 'checkbox', hint: 'Check if this revision requires authority resubmission' },
        { key: 'regulatory_authority', label: 'Regulatory Authority', placeholder: 'e.g. RAJUK, CDA, KDA, RDA' },
        { key: 'approval_memo_number', label: 'Approval Memo / Sanction #', placeholder: 'e.g. RAJUK/Dev/2024-912' },
        { key: 'cost_impact_bdt', label: 'Cost Impact (BDT ৳)', type: 'number', hint: 'Positive for cost increase, negative for saving' },
        { key: 'area_impact_sqft', label: 'Area Impact (sq ft)', type: 'number', hint: 'Net change in saleable or built area' },
        { key: 'drawing_reference_old', label: 'Superseded Drawing Ref', placeholder: 'e.g. DWG-ARCH-001-Rev0' },
        { key: 'drawing_reference_new', label: 'New Revision Drawing Ref', placeholder: 'e.g. DWG-ARCH-001-Rev1' },
        { key: 'description', label: 'Revision Description', type: 'textarea', placeholder: 'Detailed description of the architectural or structural alteration...' },
        { key: 'justification', label: 'Engineering / Commercial Justification', type: 'textarea', placeholder: 'Why this revision was initiated...' },
        { key: 'impact_summary', label: 'Impact on Delivery Schedule & Compliance', type: 'textarea' }
      ]
    };

    this.fields = definitions[this.entity] || [];
    const controls: any = {
      project_id: [null, Validators.required],
      land_parcel_id: [null],
      tower_id: [null],
      floor_id: [null]
    };

    for (const f of this.fields) {
      if (f.type === 'number') {
        controls[f.key] = [0, f.required ? Validators.required : []];
      } else if (f.type === 'checkbox') {
        controls[f.key] = [false];
      } else {
        controls[f.key] = [f.options ? f.options[0] : '', f.required ? Validators.required : []];
      }
    }

    this.form = this.fb.group(controls);
  }

  loadRecord() {
    this.loading.set(true);
    const request = this.entity === 'towers'
      ? this.api.getTower(this.id)
      : this.entity === 'floors'
      ? this.api.getFloor(this.id)
      : this.entity === 'units'
      ? this.api.getUnit(this.id)
      : this.api.getDesignRevision(this.id);

    request.subscribe({
      next: r => {
        this.form.patchValue(r);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.detail || `Could not load ${this.title.toLowerCase()}.`);
        this.loading.set(false);
      }
    });
  }

  save() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');

    const payload: any = { ...this.form.getRawValue() };
    for (const f of this.fields) {
      if (f.type === 'number') {
        payload[f.key] = Number(payload[f.key] || 0);
      }
    }

    if (this.entity === 'towers' && !payload.land_parcel_id) {
      payload.land_parcel_id = null;
    }
    if (this.entity !== 'towers' && this.entity !== 'units' && this.entity !== 'revisions') {
      delete payload.floor_id;
    }

    const request = this.editing
      ? (this.entity === 'towers'
        ? this.api.updateTower(this.id, payload)
        : this.entity === 'floors'
        ? this.api.updateFloor(this.id, payload)
        : this.entity === 'units'
        ? this.api.updateUnit(this.id, payload)
        : this.api.updateDesignRevision(this.id, payload))
      : (this.entity === 'towers'
        ? this.api.createTower(payload)
        : this.entity === 'floors'
        ? this.api.createFloor(payload)
        : this.entity === 'units'
        ? this.api.createUnit(payload)
        : this.api.createDesignRevision(payload));

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/projects/towers-units'], {
          state: { success: `${this.title} saved successfully.` }
        });
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.detail || `Could not save ${this.title.toLowerCase()}.`);
      }
    });
  }
}

