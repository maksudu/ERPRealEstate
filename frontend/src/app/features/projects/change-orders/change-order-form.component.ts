import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BudgetingService } from '../../../core/services/budgeting.service';
import { ProjectService } from '../../../core/services/project.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({ selector: 'app-change-order-form', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent], template: `
  <app-card-container [title]="editing ? 'Edit Change Order' : 'New Change Order'" subtitle="Create or update a project budget variation">
    <a routerLink="/projects/change-orders" class="mb-4 inline-block text-sm text-blue-700">Back to change orders</a>@if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> }
    <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 md:grid-cols-2">
      <app-searchable-select label="Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select project" [allowCreateNew]="false"></app-searchable-select>
      <label class="grid gap-1 text-sm">Variation code<input formControlName="variation_code" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Title<input formControlName="title" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Reason category<input formControlName="reason_category" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Tower / building<input formControlName="tower_name" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Original quantity<input type="number" formControlName="original_qty" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Revised quantity<input type="number" formControlName="revised_qty" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Original cost (BDT)<input type="number" formControlName="original_cost_bdt" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Revised cost (BDT)<input type="number" formControlName="revised_cost_bdt" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Stage<input formControlName="stage" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Approved by<input formControlName="approved_by" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Justification<textarea formControlName="justification" rows="3" class="rounded-lg border px-3 py-2"></textarea></label>
      <div class="flex justify-end gap-3 md:col-span-2"><a routerLink="/projects/change-orders" class="rounded-lg border px-4 py-2">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save change order' }}</button></div>
    </form>
  </app-card-container>` })
export class ChangeOrderFormComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(BudgetingService); private projectApi = inject(ProjectService); private route = inject(ActivatedRoute); private router = inject(Router); projects = signal<any[]>([]); error = signal(''); saving = signal(false); editing = false; id = 0;
  projectOptions = () => this.projects().map(p => ({ value: p.id, label: `${p.project_code} · ${p.project_name}` }));
  form = this.fb.group({ project_id: [null as number | null, Validators.required], variation_code: [''], tower_name: [''], title: ['', Validators.required], reason_category: ['Scope Change', Validators.required], justification: [''], original_qty: [0], revised_qty: [0], original_cost_bdt: [0], revised_cost_bdt: [0], stage: ['SUBMITTED', Validators.required], approved_by: [''] });
  ngOnInit() { this.id = Number(this.route.snapshot.paramMap.get('id') || 0); this.editing = !!this.id; this.projectApi.getProjects({ limit: 500 }).subscribe({ next: rows => this.projects.set(rows || []), error: () => this.error.set('Could not load projects.') }); if (this.editing) this.api.getVariation(this.id).subscribe({ next: item => this.form.patchValue(item as any), error: e => this.error.set(e?.error?.detail || 'Could not load change order.') }); }
  save() { if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; } this.saving.set(true); const payload = this.form.getRawValue(); const req = this.editing ? this.api.updateVariation(this.id, payload as any) : this.api.createVariation(payload as any); req.subscribe({ next: () => this.router.navigate(['/projects/change-orders'], { state: { success: this.editing ? 'Change order updated successfully.' : 'Change order created successfully.' } }), error: e => { this.error.set(e?.error?.detail || 'Could not save change order.'); this.saving.set(false); } }); }
}
