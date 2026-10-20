import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectService } from '../../../core/services/project.service';
import { LandService } from '../../../core/services/land.service';
import { Project } from '../../../core/models/project.model';
import { LandParcel } from '../../../core/models/land.model';
import { CardContainerComponent, SearchableSelectComponent, SelectOption } from '../../../shared/components';

@Component({
  selector: 'app-project-land-allocation-form', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div><p class="text-xs font-semibold uppercase tracking-wide text-emerald-700">Project Land Allocation</p><h1 class="text-xl font-bold text-slate-900 dark:text-white">{{ editMode() ? 'Edit allocation' : 'Create allocation' }}</h1></div><a routerLink="/projects/land-allocation" class="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700">Back to list</a></div>
      @if (error()) { <div class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{{ error() }}</div> }
      @if (loading()) { <div class="py-12 text-center text-sm text-slate-500">Loading allocation details…</div> } @else {
      <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
        <app-card-container title="Project and parcel">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <app-searchable-select label="Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select a live project" [allowCreateNew]="false" (ngModelChange)="projectChanged($event)"></app-searchable-select>
            <app-searchable-select label="Land parcel" [options]="parcelOptions()" formControlName="parcel_id" placeholder="Select a registered parcel" [allowCreateNew]="false" (ngModelChange)="parcelChanged($event)"></app-searchable-select>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Allocation code *<input formControlName="allocation_code" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" required></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Project name *<input formControlName="project_name" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" required></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Parcel identifier *<input formControlName="parcel_identifier" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" required></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Effective date *<input type="date" formControlName="effective_date" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" required></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Allocation method<input formControlName="allocation_method" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Allocation basis notes<input formControlName="allocation_basis_notes" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></label>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" formControlName="is_shared_parcel"> Shared parcel</label>
          </div>
        </app-card-container>
        <app-card-container title="Area and cost allocation">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label *ngFor="let field of numericFields" class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ field.label }}<input type="number" min="0" step="any" [formControlName]="field.key" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></label>
            <label *ngFor="let field of textFields" class="text-xs font-semibold text-slate-700 dark:text-slate-300">{{ field.label }}<input [formControlName]="field.key" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Shared projects notes<textarea formControlName="shared_projects_notes" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></textarea></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Infrastructure scope<textarea formControlName="common_infrastructure_scope" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></textarea></label>
            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Remarks<textarea formControlName="remarks" rows="2" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"></textarea></label>
          </div>
        </app-card-container>
        <div class="flex justify-end gap-3"><a routerLink="/projects/land-allocation" class="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-700">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving…' : (editMode() ? 'Save changes' : 'Create allocation') }}</button></div>
      </form> }
    </div>`
})
export class ProjectLandAllocationFormComponent implements OnInit {
  private service = inject(ProjectService); private landService = inject(LandService); private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute); private router = inject(Router);
  projects = signal<Project[]>([]); parcels = signal<LandParcel[]>([]);
  loading = signal(false); saving = signal(false); error = signal(''); allocationId = signal<number | null>(null);
  editMode = computed(() => this.allocationId() !== null);
  projectOptions = computed<SelectOption[]>(() => this.projects().map(p => ({ value: p.id, label: `[${p.project_code}] ${p.project_name}`, subLabel: [p.thana_upazila, p.district].filter(Boolean).join(', ') })));
  parcelOptions = computed<SelectOption[]>(() => this.parcels().map(p => ({ value: p.id, label: `${p.parcel_id} — ${p.mouza_name}`, subLabel: `${p.district}, ${p.upazila_thana} · ${p.total_area_katha} Katha` })));
  numericFields = [
    { key: 'allocated_area_decimal', label: 'Allocated area (Decimal)' }, { key: 'allocated_area_katha', label: 'Allocated area (Katha)' },
    { key: 'allocated_area_sqft', label: 'Allocated area (SqFt)' }, { key: 'allocation_percentage', label: 'Allocation percentage' },
    { key: 'land_purchase_price', label: 'Land purchase price (BDT)' }, { key: 'legal_fees', label: 'Legal fees (BDT)' },
    { key: 'registration_costs', label: 'Registration costs (BDT)' }, { key: 'acquisition_related_expenses', label: 'Acquisition expenses (BDT)' },
    { key: 'total_allocated_cost', label: 'Total allocated cost (BDT)' }, { key: 'original_allocated_cost', label: 'Original allocated cost (BDT)' },
    { key: 'revised_allocated_cost', label: 'Revised allocated cost (BDT)' }, { key: 'unallocated_balance', label: 'Unallocated balance (BDT)' }
  ];
  textFields = [
    { key: 'reconciliation_status', label: 'Reconciliation status' }, { key: 'approval_status', label: 'Approval status' },
    { key: 'acquisition_ledger_ref', label: 'Acquisition ledger reference' }, { key: 'transfer_history_notes', label: 'Transfer history notes' }
  ];
  form = this.fb.group({
    project_id: [null as number | null, Validators.required], parcel_id: [null as number | null], allocation_code: ['', Validators.required],
    project_name: ['', Validators.required], parcel_identifier: ['', Validators.required], allocated_area_decimal: [0], allocated_area_katha: [0],
    allocated_area_sqft: [0], allocation_percentage: [100], effective_date: [new Date().toISOString().slice(0, 10), Validators.required],
    allocation_method: ['DIRECT_ASSIGNMENT', Validators.required], allocation_basis_notes: [''], is_shared_parcel: [false],
    shared_projects_notes: [''], common_infrastructure_scope: [''], land_purchase_price: [0], legal_fees: [0], registration_costs: [0],
    acquisition_related_expenses: [0], total_allocated_cost: [0], original_allocated_cost: [0], revised_allocated_cost: [0], unallocated_balance: [0],
    transfer_history_notes: [''], acquisition_ledger_ref: [''], reconciliation_status: ['RECONCILED', Validators.required],
    approval_status: ['APPROVED', Validators.required], remarks: ['']
  });
  ngOnInit(): void {
    this.loading.set(true);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.allocationId.set(Number.isFinite(id) && id > 0 ? id : null);
    forkJoin({ projects: this.service.getProjects({ limit: 500 }), parcels: this.landService.getParcels({ limit: 500 }) }).subscribe({
      next: ({ projects, parcels }) => {
        this.projects.set(projects || []); this.parcels.set(parcels || []);
        if (this.allocationId()) this.loadRecord(); else this.loading.set(false);
      },
      error: e => { this.error.set(e?.error?.detail || 'Could not load project and parcel options.'); this.loading.set(false); }
    });
  }
  private loadRecord(): void {
    const id = this.allocationId(); if (!id) return;
    this.service.getLandAllocation(id).subscribe({ next: record => { this.form.patchValue(record); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || 'Could not load this allocation.'); this.loading.set(false); } });
  }
  projectChanged(value: number | string | null): void {
    const project = this.projects().find(p => p.id === Number(value));
    if (project) this.form.patchValue({ project_name: project.project_name });
  }
  parcelChanged(value: number | string | null): void {
    const parcel = this.parcels().find(p => p.id === Number(value));
    if (parcel) this.form.patchValue({ parcel_identifier: `${parcel.parcel_id} — ${parcel.mouza_name}` });
  }
  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const payload = this.form.getRawValue(); this.saving.set(true); this.error.set('');
    const request = this.allocationId() ? this.service.updateLandAllocation(this.allocationId()!, payload) : this.service.createLandAllocation(payload);
    request.subscribe({ next: () => this.router.navigate(['/projects/land-allocation']), error: e => { this.error.set(e?.error?.detail || 'Could not save this allocation.'); this.saving.set(false); } });
  }
}
