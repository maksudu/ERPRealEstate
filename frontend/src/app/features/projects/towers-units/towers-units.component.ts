import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { CardContainerComponent } from '../../../shared/components';

type Entity = 'towers' | 'floors' | 'units';
type Row = Record<string, any> & { id: number };
type Page = { items: Row[]; total: number; limit: number; offset: number };

@Component({
  selector: 'app-project-towers-units', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent],
  template: `
    <div class="space-y-4">
      <app-card-container title="Buildings, Floors & Units" subtitle="Manage project building hierarchy from live records">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div class="flex gap-2" role="tablist">
            @for (tab of tabs; track tab.key) {
              <button type="button" (click)="select(tab.key)" [class]="entity() === tab.key ? activeTab : idleTab">{{ tab.label }}</button>
            }
          </div>
          <a [routerLink]="['/projects/towers-units', entity(), 'new']" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add {{ label() }}</a>
        </div>
        <div class="grid gap-3 sm:grid-cols-[1fr_220px_auto] mb-4">
          <input class="rounded-lg border border-slate-300 px-3 py-2" [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search records..." />
          <select class="rounded-lg border border-slate-300 px-3 py-2" [(ngModel)]="projectId" (change)="load()">
            <option value="">All projects</option>
            @for (p of projects(); track p.id) { <option [value]="p.id">{{ p.project_code }} — {{ p.project_name }}</option> }
          </select>
          <button type="button" (click)="load()" class="rounded-lg border px-4 py-2">Search</button>
        </div>
        @if (error()) { <div role="alert" class="mb-3 rounded-lg bg-rose-50 p-3 text-rose-700">{{ error() }}</div> }
        @if (success()) { <div role="status" class="mb-3 rounded-lg bg-emerald-50 p-3 text-emerald-700">{{ success() }}</div> }
        <div class="overflow-x-auto rounded-lg border">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-50"><tr>@for (col of columns(); track col.key) { <th class="whitespace-nowrap px-3 py-3">{{ col.label }}</th> }<th class="px-3 py-3 text-right">Actions</th></tr></thead>
            <tbody>
              @if (loading()) { <tr><td [attr.colspan]="columns().length + 1" class="p-8 text-center text-slate-500">Loading {{ label().toLowerCase() }}…</td></tr> }
              @else if (!rows().length) { <tr><td [attr.colspan]="columns().length + 1" class="p-8 text-center text-slate-500">No {{ label().toLowerCase() }} found.</td></tr> }
              @else { @for (row of rows(); track row.id) { <tr class="border-t hover:bg-slate-50">@for (col of columns(); track col.key) { <td class="px-3 py-3">{{ display(row, col.key) }}</td> }<td class="whitespace-nowrap px-3 py-3 text-right"><a class="mr-3 text-blue-700" [routerLink]="['/projects/towers-units', entity(), row.id, 'edit']">Edit</a><button type="button" class="text-rose-700" (click)="remove(row)">Delete</button></td></tr> } }
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex items-center justify-between text-sm">
          <span>{{ total() }} records · Page {{ pageNumber() }} of {{ pageCount() }}</span>
          <div class="flex gap-2"><button class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="offset() === 0 || loading()" (click)="move(-1)">Previous</button><button class="rounded border px-3 py-1 disabled:opacity-40" [disabled]="offset() + limit() >= total() || loading()" (click)="move(1)">Next</button></div>
        </div>
      </app-card-container>
    </div>`
})
export class ProjectTowersUnitsComponent implements OnInit {
  private api = inject(ProjectService);
  readonly tabs: { key: Entity; label: string }[] = [{ key: 'towers', label: 'Towers' }, { key: 'floors', label: 'Floors' }, { key: 'units', label: 'Units' }];
  readonly activeTab = 'rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white';
  readonly idleTab = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700';
  entity = signal<Entity>('towers'); rows = signal<Row[]>([]); projects = signal<any[]>([]);
  loading = signal(false); error = signal(''); success = signal(''); total = signal(0); offset = signal(0); limit = signal(20);
  search = ''; projectId = '';
  label = () => this.tabs.find(t => t.key === this.entity())!.label;
  pageNumber = () => Math.floor(this.offset() / this.limit()) + 1;
  pageCount = () => Math.max(1, Math.ceil(this.total() / this.limit()));
  columns = () => ({
    towers: [{ key: 'tower_code', label: 'Code' }, { key: 'tower_name', label: 'Tower' }, { key: 'building_type', label: 'Building type' }, { key: 'total_floors', label: 'Floors' }, { key: 'total_lifts', label: 'Lifts' }, { key: 'construction_status', label: 'Status' }],
    floors: [{ key: 'tower_name', label: 'Tower' }, { key: 'floor_number', label: 'Floor #' }, { key: 'display_name', label: 'Name' }, { key: 'floor_type', label: 'Type' }, { key: 'floor_area_sqft', label: 'Area (sq ft)' }, { key: 'construction_status', label: 'Status' }],
    units: [{ key: 'unit_code', label: 'Unit' }, { key: 'tower_name', label: 'Tower' }, { key: 'floor_number', label: 'Floor' }, { key: 'unit_type', label: 'Type' }, { key: 'saleable_area_sqft', label: 'Area (sq ft)' }, { key: 'planned_price_bdt', label: 'Price (BDT)' }, { key: 'unit_status', label: 'Status' }]
  }[this.entity()]);
  ngOnInit() { this.success.set(history.state?.success || ''); this.api.getProjects().subscribe({ next: x => this.projects.set(x || []), error: () => this.error.set('Could not load projects.') }); this.load(); }
  select(entity: Entity) { if (this.entity() !== entity) { this.entity.set(entity); this.offset.set(0); this.load(); } }
  display(row: Row, key: string) { const val = row[key]; return val === null || val === undefined || val === '' ? 'N/A' : val; }
  move(dir: number) { this.offset.update(x => Math.max(0, x + dir * this.limit())); this.load(); }
  load() {
    this.loading.set(true); this.error.set(''); this.success.set('');
    const filters: any = { search: this.search.trim() || undefined, project_id: this.projectId ? Number(this.projectId) : undefined, limit: this.limit(), offset: this.offset() };
    const req = this.entity() === 'towers' ? this.api.getTowersPaged(filters) : this.entity() === 'floors' ? this.api.getFloors(filters) : this.api.getUnits(filters);
    req.subscribe({ next: (page: Page | Row[]) => { const result = Array.isArray(page) ? { items: page, total: page.length, limit: this.limit(), offset: this.offset() } : page; this.rows.set(result.items || []); this.total.set(result.total || 0); this.limit.set(result.limit || 20); this.offset.set(result.offset || 0); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || `Could not load ${this.label().toLowerCase()}.`); this.loading.set(false); } });
  }
  remove(row: Row) {
    if (!confirm(`Delete this ${this.entity().slice(0, -1)}?`)) return;
    const req = this.entity() === 'towers' ? this.api.deleteTower(row.id) : this.entity() === 'floors' ? this.api.deleteFloor(row.id) : this.api.deleteUnit(row.id);
    req.subscribe({ next: () => { const message = `${this.label().slice(0, -1)} deleted.`; this.load(); this.success.set(message); }, error: e => this.error.set(e?.error?.detail || 'Delete failed.') });
  }
}
