import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SecurityIncidentItem, SecurityService } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-threat-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-card title="Threat Monitoring & Incident Analytics" subtitle="Search, review and manage persisted security incidents">
        <div card-actions>
          <button type="button" (click)="addIncident()" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700">
            + Add Incident
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Incidents</label>
            <input type="search" [(ngModel)]="search" (keyup.enter)="applyFilters()" placeholder="Code, description or source IP"
              class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
          </div>
          <app-searchable-select label="Severity" placeholder="All Severities" [(ngModel)]="severity"
            [options]="severityOptions" [allowCreateNew]="false" (ngModelChange)="applyFilters()" />
          <app-searchable-select label="Status" placeholder="All Statuses" [(ngModel)]="status"
            [options]="statusOptions" [allowCreateNew]="false" (ngModelChange)="applyFilters()" />
        </div>

        @if (errorMessage) {
          <div role="alert" class="mb-4 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">{{ errorMessage }}</div>
        }
        @if (successMessage) {
          <div role="status" class="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">{{ successMessage }}</div>
        }

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead><tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <th class="p-3">Incident Code</th><th class="p-3">Created</th><th class="p-3 text-center">Severity</th>
              <th class="p-3">Threat Description</th><th class="p-3">Source IP</th><th class="p-3">Target Account</th>
              <th class="p-3 text-center">Status</th><th class="p-3 text-right">Actions</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @if (loading) {
                <tr><td colspan="8" class="p-8 text-center text-slate-400">Loading incidents...</td></tr>
              } @else {
                @for (item of items; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td class="p-3 font-mono font-bold text-rose-600">{{ item.incident_code }}</td>
                    <td class="p-3 text-slate-500 whitespace-nowrap">{{ item.created_at ? (item.created_at | date:'short') : '—' }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold"
                        [ngClass]="severityClass(item.severity)">{{ item.severity }}</span>
                    </td>
                    <td class="p-3 min-w-64"><div class="font-medium">{{ item.incident_type }}</div><div>{{ item.description }}</div></td>
                    <td class="p-3 font-mono text-slate-500 text-[10px]">{{ item.source_ip || 'N/A' }}</td>
                    <td class="p-3 font-medium">{{ item.affected_user || 'system' }}</td>
                    <td class="p-3 text-center">{{ item.status }}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                      <button type="button" (click)="editIncident(item.id)" class="px-2 py-1 text-indigo-600 hover:underline">Edit</button>
                      <button type="button" (click)="deleteIncident(item)" class="px-2 py-1 text-rose-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="p-8 text-center text-slate-400">No threat incidents found.</td></tr>
                }
              }
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <div class="flex items-center gap-2">
            <span>Showing {{ startIndex }}–{{ endIndex }} of {{ total }} incidents</span>
            <label class="flex items-center gap-1">Per page:
              <select [ngModel]="limit" (ngModelChange)="changeLimit($event)" class="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                <option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="50">50</option><option [ngValue]="100">100</option>
              </select>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="previousPage()" [disabled]="offset === 0" class="px-2.5 py-1 rounded border disabled:opacity-40">Previous</button>
            <span>Page {{ currentPage }} of {{ totalPages }}</span>
            <button type="button" (click)="nextPage()" [disabled]="offset + limit >= total" class="px-2.5 py-1 rounded border disabled:opacity-40">Next</button>
          </div>
        </div>
      </app-card>
    </div>
  `
})
export class ThreatAnalyticsComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);

  items: SecurityIncidentItem[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  search = '';
  severity = '';
  status = '';
  limit = 25;
  offset = 0;
  total = 0;
  severityOptions: SelectOption[] = [{ value: '', label: 'All Severities' }];
  statusOptions: SelectOption[] = [{ value: '', label: 'All Statuses' }];

  ngOnInit(): void {
    this.service.getIncidents({ limit: 100, offset: 0 }).subscribe({
      next: (result) => {
        const severities = Array.from(new Set(result.items.map(item => item.severity).filter(Boolean))).sort();
        const statuses = Array.from(new Set(result.items.map(item => item.status).filter(Boolean))).sort();
        this.severityOptions = [{ value: '', label: 'All Severities' }, ...severities.map(value => ({ value, label: value }))];
        this.statusOptions = [{ value: '', label: 'All Statuses' }, ...statuses.map(value => ({ value, label: value }))];
      },
      error: (err) => {
        console.error('Failed to load incident filter options', err);
        this.errorMessage = err.error?.detail || 'Could not load incident filters.';
      }
    });
    this.loadIncidents();
  }

  get currentPage(): number { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.limit)); }
  get startIndex(): number { return this.total ? this.offset + 1 : 0; }
  get endIndex(): number { return Math.min(this.offset + this.limit, this.total); }

  loadIncidents(): void {
    this.loading = true;
    this.errorMessage = '';
    this.service.getReports('threat_analytics', {
      search: this.search.trim() || undefined,
      severity: this.severity || undefined,
      status_filter: this.status || undefined,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (result) => {
        this.items = result.items || [];
        this.total = result.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load threat analytics', err);
        this.errorMessage = err.error?.detail || 'Failed to load incidents.';
        this.loading = false;
      }
    });
  }

  applyFilters(): void { this.offset = 0; this.loadIncidents(); }
  changeLimit(value: number): void { this.limit = Number(value); this.offset = 0; this.loadIncidents(); }
  previousPage(): void { if (this.offset > 0) { this.offset -= this.limit; this.loadIncidents(); } }
  nextPage(): void { if (this.offset + this.limit < this.total) { this.offset += this.limit; this.loadIncidents(); } }
  addIncident(): void { this.router.navigate(['/security/threat-analytics/create']); }
  editIncident(id: number): void { this.router.navigate(['/security/threat-analytics', id, 'edit']); }

  deleteIncident(item: SecurityIncidentItem): void {
    if (!confirm(`Delete incident ${item.incident_code}?`)) return;
    this.service.deleteIncident(item.id).subscribe({
      next: () => {
        this.successMessage = `Incident ${item.incident_code} deleted.`;
        if (this.items.length === 1 && this.offset > 0) this.offset -= this.limit;
        this.loadIncidents();
      },
      error: (err) => {
        console.error('Failed to delete incident', err);
        this.errorMessage = err.error?.detail || 'Failed to delete incident.';
      }
    });
  }

  severityClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  }
}
