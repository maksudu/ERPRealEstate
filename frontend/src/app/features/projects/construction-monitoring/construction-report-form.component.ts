import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({ selector: 'app-construction-report-form', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent], template: `
  <app-card-container [title]="editing ? 'Edit Daily Progress Report' : 'New Daily Progress Report'" subtitle="Save daily site progress to the construction register">
    <a routerLink="/projects/construction-monitoring" class="mb-4 inline-block text-sm text-blue-700">Back to reports</a>
    @if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> }
    <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 md:grid-cols-2">
      <app-searchable-select label="Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select project" [allowCreateNew]="false"></app-searchable-select>
      <label class="grid gap-1 text-sm">Report date<input type="date" formControlName="report_date" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Weather<input formControlName="weather_condition_id" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Floor / location<input formControlName="floor_unit_location" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Activity summary<textarea formControlName="structural_activity_summary" rows="3" class="rounded-lg border px-3 py-2"></textarea></label>
      <label class="grid gap-1 text-sm">Workers onsite<input type="number" formControlName="total_workers_onsite" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Concrete poured (CFT)<input type="number" formControlName="concrete_casting_cft" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Steel consumed (MT)<input type="number" formControlName="steel_rod_consumed_mt" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Supervisor review<input formControlName="supervisor_approval_status" class="rounded-lg border px-3 py-2"></label>
      <div class="flex justify-end gap-3 md:col-span-2"><a routerLink="/projects/construction-monitoring" class="rounded-lg border px-4 py-2">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save report' }}</button></div>
    </form>
  </app-card-container>` })
export class ConstructionReportFormComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(ConstructionService); private projectsApi = inject(ProjectService); private route = inject(ActivatedRoute); private router = inject(Router);
  projects = signal<any[]>([]); error = signal(''); loading = signal(false); saving = signal(false); editing = false; id = 0;
  projectOptions = () => this.projects().map(p => ({ value: p.id, label: `${p.project_code} · ${p.project_name}` }));
  form = this.fb.group({ project_id: [null as number | null, Validators.required], report_date: [new Date().toISOString().slice(0, 10), Validators.required], weather_condition_id: ['SUNNY', Validators.required], floor_unit_location: [''], structural_activity_summary: ['', Validators.required], total_workers_onsite: [0], concrete_casting_cft: [0], steel_rod_consumed_mt: [0], supervisor_approval_status: ['PENDING_REVIEW'] });
  ngOnInit() { this.id = Number(this.route.snapshot.paramMap.get('id') || 0); this.editing = !!this.id; this.projectsApi.getProjects({ limit: 500 }).subscribe({ next: rows => this.projects.set(rows || []), error: () => this.error.set('Could not load projects.') }); if (this.editing) { this.loading.set(true); this.api.getDPRReportById(this.id).subscribe({ next: r => { this.form.patchValue(r as any); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || 'Could not load report.'); this.loading.set(false); } }); } }
  save() { if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; } this.saving.set(true); const payload = this.form.getRawValue(); const req = this.editing ? this.api.updateDPRReport(this.id, payload as any) : this.api.createDPRReport(payload as any); req.subscribe({ next: () => this.router.navigate(['/projects/construction-monitoring'], { state: { success: this.editing ? 'Daily report updated successfully.' : 'Daily report created successfully.' } }), error: e => { this.error.set(e?.error?.detail || 'Could not save report.'); this.saving.set(false); } }); }
}
