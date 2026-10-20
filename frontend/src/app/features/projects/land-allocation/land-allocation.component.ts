import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { CardContainerComponent, SearchableSelectComponent, SelectOption } from '../../../shared/components';

interface Allocation {
  id: number; project_id: number; project_name: string; parcel_id?: number | null;
  allocation_code: string; parcel_identifier: string; allocated_area_decimal: number;
  allocated_area_katha: number; allocated_area_sqft: number; allocation_percentage: number;
  effective_date: string; allocation_method: string; land_purchase_price: number;
  total_allocated_cost: number; reconciliation_status: string; approval_status: string;
  is_shared_parcel: boolean; remarks?: string;
}

@Component({
  selector: 'app-project-land-allocation', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="space-y-5">
      <app-card-container title="Project-wise Land Allocation Register" subtitle="Allocate acquired land parcels and track area, cost, and reconciliation.">
        <div card-actions><a routerLink="create" class="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">+ Add allocation</a></div>
        <div class="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/40">
          <input class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Search code, project or parcel" [(ngModel)]="search" (keyup.enter)="applyFilters()">
          <app-searchable-select label="Project" [options]="projectOptions()" [ngModel]="projectId" (ngModelChange)="projectId=$event; applyFilters()" placeholder="All projects" [allowCreateNew]="false"></app-searchable-select>
          <input class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Allocation method" [(ngModel)]="method" (keyup.enter)="applyFilters()">
          <input class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" placeholder="Approval status" [(ngModel)]="status" (keyup.enter)="applyFilters()">
          <div class="flex gap-2 md:col-span-4"><button (click)="applyFilters()" class="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white">Search</button><button (click)="resetFilters()" class="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700">Reset</button></div>
        </div>
        @if (error()) { <div class="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{{ error() }} <button (click)="load()" class="ml-2 font-semibold underline">Retry</button></div> }
        @if (success()) { <div role="status" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{{ success() }}</div> }
        @if (loading()) { <div class="py-14 text-center text-sm text-slate-500">Loading land allocations…</div> }
        @else {
          <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table class="w-full min-w-[900px] text-left text-xs">
              <thead class="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th class="p-3">Allocation / Project</th><th class="p-3">Parcel</th><th class="p-3">Allocated Area</th><th class="p-3">Method</th><th class="p-3">Allocated Cost</th><th class="p-3">Status</th><th class="p-3 text-right">Actions</th></tr></thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                @for (a of allocations(); track a.id) { <tr class="text-slate-700 dark:text-slate-300"><td class="p-3"><b>{{ a.allocation_code }}</b><div>{{ a.project_name }}</div></td><td class="p-3">{{ a.parcel_identifier }}</td><td class="p-3">{{ a.allocated_area_katha | number:'1.0-2' }} Katha<div class="text-slate-400">{{ a.allocated_area_decimal | number:'1.0-3' }} Decimal</div></td><td class="p-3">{{ a.allocation_method }}</td><td class="p-3">৳{{ a.total_allocated_cost | number:'1.0-2' }}</td><td class="p-3">{{ a.approval_status }}<div class="text-slate-400">{{ a.reconciliation_status }}</div></td><td class="p-3 text-right"><a [routerLink]="[a.id, 'edit']" class="mr-3 font-semibold text-blue-600">Edit</a><button (click)="remove(a)" class="font-semibold text-rose-600">Delete</button></td></tr> }
                @empty { <tr><td colspan="7" class="p-12 text-center text-sm text-slate-500">No land allocations found.</td></tr> }
              </tbody>
            </table>
          </div>
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{{ total() ? offset + 1 : 0 }}–{{ min(offset + limit, total()) }} of {{ total() }}</span><div class="flex items-center gap-2"><button (click)="page(-1)" [disabled]="offset===0" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button (click)="page(1)" [disabled]="offset+limit>=total()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
        }
      </app-card-container>
    </div>`
})
export class ProjectLandAllocationComponent implements OnInit {
  private service = inject(ProjectService);
  private route = inject(ActivatedRoute);
  allocations = signal<Allocation[]>([]); projects = signal<Project[]>([]);
  total = signal(0); loading = signal(false); error = signal(''); success = signal('');
  search = ''; method = ''; status = ''; projectId: number | null = null;
  limit = 10; offset = 0;
  projectOptions = computed<SelectOption[]>(() => [{ value: '', label: 'All projects' }, ...this.projects().map(p => ({ value: p.id, label: `[${p.project_code}] ${p.project_name}` }))]);
  ngOnInit(): void { this.success.set(history.state?.success || ''); this.service.getProjects({ limit: 500 }).subscribe({ next: p => this.projects.set(p || []), error: () => this.projects.set([]) }); this.load(); }
  load(): void {
    this.loading.set(true); this.error.set('');
    this.service.getLandAllocations({ project_id: this.projectId || undefined, allocation_method: this.method.trim() || undefined, status: this.status.trim() || undefined, search: this.search.trim() || undefined, limit: this.limit, offset: this.offset }).subscribe({
      next: r => { this.allocations.set(r?.items || []); this.total.set(Number(r?.total || 0)); this.loading.set(false); },
      error: e => { this.allocations.set([]); this.total.set(0); this.error.set(e?.error?.detail || 'Could not load land allocations.'); this.loading.set(false); }
    });
  }
  applyFilters(): void { this.offset = 0; this.load(); }
  resetFilters(): void { this.search = ''; this.method = ''; this.status = ''; this.projectId = null; this.applyFilters(); }
  page(direction: number): void { this.offset = Math.max(0, this.offset + direction * this.limit); this.load(); }
  remove(row: Allocation): void { if (!confirm(`Delete allocation ${row.allocation_code}?`)) return; this.service.deleteLandAllocation(row.id).subscribe({ next: () => { this.success.set(`Allocation ${row.allocation_code} deleted successfully.`); this.load(); }, error: e => this.error.set(e?.error?.detail || 'Could not delete this allocation.') }); }
  min(a: number, b: number): number { return Math.min(a, b); }
}
