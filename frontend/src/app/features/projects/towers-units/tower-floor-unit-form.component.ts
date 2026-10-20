import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { SearchableSelectComponent, CardContainerComponent } from '../../../shared/components';

type Entity = 'towers' | 'floors' | 'units';
@Component({
  selector: 'app-tower-floor-unit-form', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SearchableSelectComponent, CardContainerComponent],
  template: `
    <app-card-container [title]="(editing ? 'Edit ' : 'New ') + title" subtitle="Record changes are saved to the project database">
      <div class="mb-4"><a routerLink="/projects/towers-units" class="text-sm text-blue-700">← Back to Towers, Floors & Units</a></div>
      @if (error()) { <div role="alert" class="mb-4 rounded-lg bg-rose-50 p-3 text-rose-700">{{ error() }}</div> }
      @if (success()) { <div role="status" class="mb-4 rounded-lg bg-emerald-50 p-3 text-emerald-700">{{ success() }}</div> }
      @if (loading()) { <p class="py-8 text-center text-slate-500">Loading record…</p> }
      @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 md:grid-cols-2">
        <app-searchable-select label="Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select project..." [allowCreateNew]="false"></app-searchable-select>
        @if (entity !== 'towers') { <app-searchable-select label="Tower" [required]="true" [options]="towerOptions()" formControlName="tower_id" placeholder="Select tower..." [allowCreateNew]="false"></app-searchable-select> }
        @if (entity === 'units') { <app-searchable-select label="Floor" [options]="floorOptions()" formControlName="floor_id" placeholder="Select floor (optional)..." [allowCreateNew]="false"></app-searchable-select> }
        @for (field of fields; track field.key) {
          <label class="block text-sm font-medium text-slate-700">{{ field.label }} <span *ngIf="field.required" class="text-rose-600">*</span>
            @if (field.options) { <app-searchable-select [label]="''" [options]="fieldOptions(field)" [formControlName]="field.key" [allowCreateNew]="false" [searchable]="true"></app-searchable-select> }
            @else if (field.type === 'textarea') { <textarea class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" rows="3" [formControlName]="field.key"></textarea> }
            @else { <input class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" [type]="field.type || 'text'" [formControlName]="field.key" /> }
          </label>
        }
        <div class="md:col-span-2 flex justify-end gap-3 border-t pt-4"><a routerLink="/projects/towers-units" class="rounded-lg border px-4 py-2">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving…' : editing ? 'Save changes' : 'Create ' + title }}</button></div>
      </form> }
    </app-card-container>`
})
export class TowerFloorUnitFormComponent implements OnInit {
  private api = inject(ProjectService); private route = inject(ActivatedRoute); private router = inject(Router); private fb = inject(FormBuilder);
  entity: Entity = 'towers'; editing = false; id = 0; title = 'Tower'; loading = signal(false); saving = signal(false); error = signal(''); success = signal('');
  projects = signal<any[]>([]); towers = signal<any[]>([]); floors = signal<any[]>([]);
  projectOptions = () => this.projects().map(x => ({ value: x.id, label: `${x.project_code} — ${x.project_name}` }));
  towerOptions = () => this.towers().map(x => ({ value: x.id, label: `${x.tower_code} — ${x.tower_name}` }));
  floorOptions = () => this.floors().map(x => ({ value: x.id, label: `${x.display_name} (${x.floor_number})` }));
  fieldOptions = (field: any) => (field.options || []).map((value: string) => ({ value, label: value.replaceAll('_', ' ') }));
  fields: any[] = [];
  form = this.fb.group({ project_id: [null as number | null, Validators.required], tower_id: [null as number | null], floor_id: [null as number | null] });
  ngOnInit() {
    this.entity = this.route.snapshot.paramMap.get('entity') as Entity; this.id = Number(this.route.snapshot.paramMap.get('id') || 0); this.editing = !!this.id;
    this.title = this.entity === 'towers' ? 'Tower' : this.entity === 'floors' ? 'Floor' : 'Unit';
    this.configureFields();
    this.api.getProjects().subscribe({ next: p => this.projects.set(p || []), error: () => this.error.set('Could not load projects.') });
    this.form.controls.project_id.valueChanges.subscribe(id => { if (id) { this.api.getTowers(Number(id)).subscribe({ next: rows => this.towers.set(rows || []), error: () => this.error.set('Could not load towers.') }); } else this.towers.set([]); });
    this.form.controls.tower_id.valueChanges.subscribe(id => { if (id && this.entity === 'units') this.api.getFloors({ tower_id: Number(id), limit: 200 }).subscribe({ next: p => this.floors.set(p.items || []), error: () => this.error.set('Could not load floors.') }); else this.floors.set([]); });
    if (this.editing) this.loadRecord();
  }
  configureFields() {
    const definitions: Record<Entity, any[]> = {
      towers: [
        { key: 'tower_code', label: 'Tower code', required: true }, { key: 'tower_name', label: 'Tower name', required: true },
        { key: 'building_code', label: 'Building code' }, { key: 'building_type', label: 'Building type', options: ['RESIDENTIAL','COMMERCIAL','MIXED_USE','SHOPPING_COMPLEX'] },
        { key: 'total_floors', label: 'Total floors', type: 'number' }, { key: 'basement_floors', label: 'Basement floors', type: 'number' }, { key: 'podium_floors', label: 'Podium floors', type: 'number' }, { key: 'residential_floors', label: 'Residential floors', type: 'number' }, { key: 'commercial_floors', label: 'Commercial floors', type: 'number' }, { key: 'total_lifts', label: 'Total lifts', type: 'number' }, { key: 'approved_height_m', label: 'Approved height (m)', type: 'number' }, { key: 'approved_floor_area_sqft', label: 'Approved floor area (sq ft)', type: 'number' }, { key: 'structural_system', label: 'Structural system' }, { key: 'construction_status', label: 'Construction status', options: ['PLANNING','NOT_STARTED','FOUNDATION','UNDER_CONSTRUCTION','COMPLETED'] }, { key: 'building_specifications', label: 'Building specifications', type: 'textarea' }
      ],
      floors: [
        { key: 'floor_number', label: 'Floor number', type: 'number', required: true }, { key: 'display_name', label: 'Display name', required: true }, { key: 'floor_type', label: 'Floor type', options: ['BASEMENT','GROUND','PODIUM','RESIDENTIAL','COMMERCIAL','SERVICE','ROOF'] }, { key: 'floor_area_sqft', label: 'Floor area (sq ft)', type: 'number' }, { key: 'common_area_sqft', label: 'Common area (sq ft)', type: 'number' }, { key: 'planned_units_count', label: 'Planned units', type: 'number' }, { key: 'construction_status', label: 'Construction status', options: ['NOT_STARTED','PLANNING','FOUNDATION','UNDER_CONSTRUCTION','CASTING','COMPLETED'] }, { key: 'inspection_status', label: 'Inspection status', options: ['PENDING','IN_PROGRESS','APPROVED','REJECTED'] }, { key: 'inspection_history', label: 'Inspection history', type: 'textarea' }
      ],
      units: [
        { key: 'unit_code', label: 'Unit code', required: true }, { key: 'floor_number', label: 'Floor number', type: 'number', required: true }, { key: 'unit_type', label: 'Unit type' }, { key: 'bedroom_count', label: 'Bedrooms', type: 'number' }, { key: 'bathroom_count', label: 'Bathrooms', type: 'number' }, { key: 'balcony_count', label: 'Balconies', type: 'number' }, { key: 'saleable_area_sqft', label: 'Saleable area (sq ft)', type: 'number' }, { key: 'usable_carpet_area_sqft', label: 'Carpet area (sq ft)', type: 'number' }, { key: 'common_area_allocated_sqft', label: 'Allocated common area (sq ft)', type: 'number' }, { key: 'unit_orientation', label: 'Orientation' }, { key: 'planned_price_bdt', label: 'Planned price (BDT)', type: 'number' }, { key: 'ownership_classification', label: 'Ownership', options: ['DEVELOPER_INVENTORY','LANDOWNER_ALLOCATION','JV_PARTNER','INVESTOR_RETAINED'] }, { key: 'unit_status', label: 'Unit status', options: ['AVAILABLE','RESERVED','BOOKED','SOLD','ALLOCATED'] }, { key: 'configuration_stage', label: 'Configuration stage', options: ['PLANNED','APPROVED','UNDER_CONSTRUCTION','COMPLETED'] }, { key: 'parking_details', label: 'Parking details' }, { key: 'specifications', label: 'Specifications', type: 'textarea' }
      ]
    };
    this.fields = definitions[this.entity]; const controls: any = { project_id: [null, Validators.required], tower_id: [null], floor_id: [null] };
    for (const f of this.fields) controls[f.key] = [f.type === 'number' ? 0 : (f.options?.[0] || ''), f.required ? Validators.required : []];
    this.form = this.fb.group(controls);
  }
  loadRecord() {
    this.loading.set(true); const request = this.entity === 'towers' ? this.api.getTower(this.id) : this.entity === 'floors' ? this.api.getFloor(this.id) : this.api.getUnit(this.id);
    request.subscribe({ next: r => { this.form.patchValue(r); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || `Could not load ${this.title.toLowerCase()}.`); this.loading.set(false); } });
  }
  save() {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set(''); const payload: any = { ...this.form.getRawValue() };
    for (const f of this.fields) if (f.type === 'number') payload[f.key] = Number(payload[f.key] || 0);
    if (this.entity === 'towers' && !payload.project_id) delete payload.project_id;
    if (this.entity !== 'towers' && this.entity !== 'units') delete payload.floor_id;
    const request = this.editing ? (this.entity === 'towers' ? this.api.updateTower(this.id, payload) : this.entity === 'floors' ? this.api.updateFloor(this.id, payload) : this.api.updateUnit(this.id, payload)) : (this.entity === 'towers' ? this.api.createTower(payload) : this.entity === 'floors' ? this.api.createFloor(payload) : this.api.createUnit(payload));
    request.subscribe({ next: () => { this.saving.set(false); this.router.navigate(['/projects/towers-units'], { state: { success: `${this.title} saved successfully.` } }); }, error: e => { this.saving.set(false); this.error.set(e?.error?.detail || `Could not save ${this.title.toLowerCase()}.`); } });
  }
}
