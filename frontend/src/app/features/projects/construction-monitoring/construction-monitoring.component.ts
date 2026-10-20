import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({
  selector: 'app-project-construction-monitoring', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent],
  template: `
    <app-card-container title="Construction Progress Monitoring" subtitle="Daily progress reports from the construction database">
      <div card-actions><a routerLink="create" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Add Daily Report</a></div>
      <div class="mb-4 grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
        <app-searchable-select label="Project" [options]="projectOptions()" [ngModel]="projectId" (ngModelChange)="projectId=$event" placeholder="All projects" [allowCreateNew]="false"></app-searchable-select>
        <input [(ngModel)]="search" (keyup.enter)="apply()" placeholder="Search report or activity" class="rounded-lg border px-3 py-2">
        <button (click)="apply()" class="rounded-lg bg-blue-600 px-4 py-2 text-white">Search</button><button (click)="reset()" class="rounded-lg border px-4 py-2">Reset</button>
      </div>
      @if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> }
      @if (success()) { <p role="status" class="mb-3 rounded bg-emerald-50 p-3 text-emerald-700">{{ success() }}</p> }
      <div class="overflow-x-auto rounded-xl border"><table class="w-full min-w-[780px] text-left text-sm"><thead class="bg-slate-50"><tr><th class="p-3">Report</th><th class="p-3">Project</th><th class="p-3">Date</th><th class="p-3">Activity</th><th class="p-3">Workers</th><th class="p-3">Progress</th><th class="p-3">Actions</th></tr></thead><tbody>
        @if (loading()) { <tr><td colspan="7" class="p-8 text-center">Loading reports...</td></tr> }
        @else if (!items().length) { <tr><td colspan="7" class="p-8 text-center text-slate-500">No construction reports found.</td></tr> }
        @else { @for (r of items(); track r.id) { <tr class="border-t"><td class="p-3 font-mono">{{ r.report_number || ('DPR-' + r.id) }}</td><td class="p-3">{{ r.project_name || r.project_id }}</td><td class="p-3">{{ r.report_date }}</td><td class="p-3">{{ r.structural_activity_summary }}</td><td class="p-3">{{ r.total_workers_onsite }}</td><td class="p-3">{{ r.supervisor_approval_status }}</td><td class="p-3"><a [routerLink]="[r.id, 'edit']" class="mr-3 text-blue-700">Edit</a><button (click)="remove(r)" class="text-rose-700">Delete</button></td></tr> } }
      </tbody></table></div>
      <div class="mt-4 flex justify-between text-sm"><span>{{ total() }} records · page {{ page() }}</span><div class="flex gap-2"><button (click)="move(-1)" [disabled]="offset()===0" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button (click)="move(1)" [disabled]="offset()+limit()>=total()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
    </app-card-container>`
})
export class ProjectConstructionMonitoringComponent implements OnInit {
  private api = inject(ConstructionService); private projectsApi = inject(ProjectService);
  items = signal<any[]>([]); projects = signal<any[]>([]); total = signal(0); offset = signal(0); limit = signal(20);
  loading = signal(false); error = signal(''); success = signal(''); search = ''; projectId: number | null = null;
  projectOptions = () => [{ value: '', label: 'All projects' }, ...this.projects().map(p => ({ value: p.id, label: `${p.project_code} · ${p.project_name}` }))];
  page = () => Math.floor(this.offset() / this.limit()) + 1;
  ngOnInit() { this.success.set(history.state?.success || ''); this.projectsApi.getProjects({ limit: 500 }).subscribe({ next: rows => this.projects.set(rows || []) }); this.load(); }
  apply() { this.offset.set(0); this.load(); }
  reset() { this.search = ''; this.projectId = null; this.offset.set(0); this.load(); }
  move(delta: number) { this.offset.update(n => Math.max(0, n + delta * this.limit())); this.load(); }
  load() { this.loading.set(true); this.error.set(''); this.api.getDPRReportsPaged({ project_id: this.projectId || undefined, search: this.search.trim() || undefined, limit: this.limit(), offset: this.offset() }).subscribe({ next: page => { this.items.set(page.items || []); this.total.set(page.total || 0); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || 'Could not load construction reports.'); this.loading.set(false); } }); }
  remove(r: any) { if (!confirm(`Delete ${r.report_number || 'this report'}?`)) return; this.api.deleteDPRReport(r.id).subscribe({ next: () => { this.success.set('Daily report deleted successfully.'); if (this.items().length === 1 && this.offset()) this.offset.update(n => n - this.limit()); this.load(); }, error: e => this.error.set(e?.error?.detail || 'Could not delete the report.') }); }
}
