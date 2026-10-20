import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-threat-incident-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-5xl mx-auto space-y-5">
      <button type="button" (click)="goBack()" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
        ← Back to Threat Analytics
      </button>

      <app-card [title]="isEditMode ? 'Edit Security Incident' : 'Register Security Incident'"
        subtitle="Changes are saved to the security incident database.">
        @if (loading) {
          <div class="py-12 text-center text-slate-400 text-xs">Loading incident...</div>
        } @else {
          <form (ngSubmit)="save()" class="space-y-5">
            @if (errorMessage) {
              <div role="alert" class="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">{{ errorMessage }}</div>
            }
            @if (successMessage) {
              <div role="status" class="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs">{{ successMessage }}</div>
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium mb-1">Incident Type *</label>
                <input name="incident_type" [(ngModel)]="form.incident_type" required maxlength="64"
                  placeholder="e.g. FAILED_LOGIN_SPIKE" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
              </div>
              <app-searchable-select label="Severity *" placeholder="Select severity" name="severity"
                [(ngModel)]="form.severity" [options]="severityOptions" [allowCreateNew]="false" [required]="true" />
              <div>
                <label class="block text-xs font-medium mb-1">Source IP</label>
                <input name="source_ip" [(ngModel)]="form.source_ip" maxlength="45"
                  placeholder="IPv4 / IPv6 address" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
              </div>
              <div>
                <label class="block text-xs font-medium mb-1">Target Account</label>
                <input name="affected_user" [(ngModel)]="form.affected_user" maxlength="64"
                  placeholder="Username (if known)" class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
              </div>
              <app-searchable-select label="Status *" placeholder="Select status" name="status"
                [(ngModel)]="form.status" [options]="statusOptions" [allowCreateNew]="false" [required]="true" />
            </div>

            <div>
              <label class="block text-xs font-medium mb-1">Description *</label>
              <textarea name="description" [(ngModel)]="form.description" required rows="4"
                placeholder="Describe the observed incident and relevant context."
                class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"></textarea>
            </div>

            <div class="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button type="button" (click)="goBack()" class="px-3 py-2 rounded-lg border text-xs">Cancel</button>
              <button type="submit" [disabled]="saving" class="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold disabled:opacity-50">
                {{ saving ? 'Saving...' : (isEditMode ? 'Update Incident' : 'Save Incident') }}
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class ThreatIncidentFormComponent implements OnInit {
  private service = inject(SecurityService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = false;
  incidentId: number | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';
  severityOptions: SelectOption[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'CRITICAL', label: 'Critical' }
  ];
  statusOptions: SelectOption[] = [
    { value: 'OPEN', label: 'Open' },
    { value: 'UNDER_INVESTIGATION', label: 'Under Investigation' },
    { value: 'RESOLVED', label: 'Resolved' }
  ];
  form = {
    incident_type: '',
    severity: 'MEDIUM',
    source_ip: '',
    affected_user: '',
    description: '',
    status: 'OPEN'
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) return;
    this.incidentId = Number(idParam);
    if (!Number.isInteger(this.incidentId) || this.incidentId <= 0) {
      this.errorMessage = 'Invalid incident ID.';
      return;
    }
    this.isEditMode = true;
    this.loading = true;
    this.service.getIncidentById(this.incidentId).subscribe({
      next: (incident) => {
        this.form = {
          incident_type: incident.incident_type,
          severity: incident.severity,
          source_ip: incident.source_ip || '',
          affected_user: incident.affected_user || '',
          description: incident.description,
          status: incident.status
        };
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load incident', err);
        this.errorMessage = err.error?.detail || 'Failed to load incident.';
        this.loading = false;
      }
    });
  }

  save(): void {
    if (!this.form.incident_type.trim() || !this.form.description.trim()) {
      this.errorMessage = 'Incident type and description are required.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    const payload = {
      ...this.form,
      incident_type: this.form.incident_type.trim(),
      description: this.form.description.trim(),
      source_ip: this.form.source_ip.trim() || undefined,
      affected_user: this.form.affected_user.trim() || undefined
    };
    const request = this.isEditMode && this.incidentId
      ? this.service.updateIncident(this.incidentId, payload)
      : this.service.createIncident(payload);
    request.subscribe({
      next: () => {
        this.successMessage = this.isEditMode ? 'Incident updated successfully.' : 'Incident created successfully.';
        this.saving = false;
      },
      error: (err) => {
        console.error('Failed to save incident', err);
        this.errorMessage = err.error?.detail || 'Failed to save incident.';
        this.saving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/security/threat-analytics']);
  }
}
