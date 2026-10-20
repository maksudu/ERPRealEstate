import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({ selector: 'app-risk-issue-form', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent], template: `
  <app-card-container [title]="editing ? 'Edit Risk / Issue' : 'New Risk / Issue'" subtitle="Record project risk and mitigation details">
    <a routerLink="/projects/risk-issues" class="mb-4 inline-block text-sm text-blue-700">Back to risk register</a>@if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> }
    <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 md:grid-cols-2">
      <app-searchable-select label="Project" [required]="true" [options]="projectOptions()" formControlName="project_id" placeholder="Select project" [allowCreateNew]="false"></app-searchable-select>
      <label class="grid gap-1 text-sm">Risk category<input formControlName="risk_category" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Title<input formControlName="risk_title" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Probability<input formControlName="probability" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Impact<input formControlName="impact" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm">Assigned owner<input formControlName="assigned_owner" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Status<input formControlName="status" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Mitigation strategy<textarea formControlName="mitigation_strategy" rows="4" class="rounded-lg border px-3 py-2"></textarea></label>
      <div class="flex justify-end gap-3 md:col-span-2"><a routerLink="/projects/risk-issues" class="rounded-lg border px-4 py-2">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save risk' }}</button></div>
    </form>
  </app-card-container>` })
export class RiskIssueFormComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(ProjectService); private route = inject(ActivatedRoute); private router = inject(Router); projects = signal<any[]>([]); error = signal(''); saving = signal(false); editing = false; id = 0;
  projectOptions = () => this.projects().map(p => ({ value: p.id, label: `${p.project_code} · ${p.project_name}` }));
  form = this.fb.group({ project_id: [null as number | null, Validators.required], risk_category: ['GENERAL', Validators.required], risk_title: ['', Validators.required], probability: ['MEDIUM', Validators.required], impact: ['MODERATE', Validators.required], mitigation_strategy: [''], assigned_owner: [''], status: ['OPEN', Validators.required] });
  ngOnInit() { this.id = Number(this.route.snapshot.paramMap.get('id') || 0); this.editing = !!this.id; this.api.getProjects({ limit: 500 }).subscribe({ next: rows => this.projects.set(rows || []), error: () => this.error.set('Could not load projects.') }); if (this.editing) this.api.getProjectRiskIssue(this.id).subscribe({ next: r => this.form.patchValue(r), error: e => this.error.set(e?.error?.detail || 'Could not load risk.') }); }
  save() { if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; } this.saving.set(true); const req = this.editing ? this.api.updateProjectRiskIssue(this.id, this.form.getRawValue()) : this.api.createProjectRiskIssue(this.form.getRawValue()); req.subscribe({ next: () => this.router.navigate(['/projects/risk-issues'], { state: { success: this.editing ? 'Risk / issue updated successfully.' : 'Risk / issue created successfully.' } }), error: e => { this.error.set(e?.error?.detail || 'Could not save risk / issue.'); this.saving.set(false); } }); }
}
