import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, SecurityIncidentItem } from '../../../../core/services/security.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-threat-incident-form',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-6">
      <!-- Top Breadcrumb -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span>&larr;</span> Back to Threat Incidents
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            Threat Intelligence
          </span>
        </div>
      </div>

      <!-- Main Form Card -->
      <app-card
        [title]="isEditMode ? 'Modify Security Threat Incident' : 'Log Security Threat Incident'"
        [subtitle]="isEditMode ? 'Update threat investigation record #' + incidentCode : 'Record suspicious login spikes, privilege anomalies or foreign IP breaches into the SIEM log'"
      >
        @if (loadingData) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading security incident details...
          </div>
        } @else {
          <form (ngSubmit)="saveIncident()" class="space-y-6 text-xs">
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Threat Classification -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-rose-500 rounded-full"></span>
                Threat Classification & Impact Level
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <app-searchable-select
                    label="Threat Incident Type *"
                    placeholder="Select or enter incident type..."
                    [(ngModel)]="formData.incident_type"
                    name="incident_type"
                    [options]="incidentTypeOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Severity Level *"
                    placeholder="Select severity..."
                    [(ngModel)]="formData.severity"
                    name="severity"
                    [options]="severityOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>
              </div>
            </div>

            <!-- Target & Attribution -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Target Account, Source Network & Status
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <app-searchable-select
                    label="Target / Affected Account"
                    placeholder="Select or enter account..."
                    [(ngModel)]="formData.affected_user"
                    name="affected_user"
                    [options]="userOptions"
                    [allowCreateNew]="true"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Source IP Address</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.source_ip"
                    name="source_ip"
                    placeholder="e.g. 185.220.101.5 / 103.145.112.5"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Investigation Status *"
                    placeholder="Select status..."
                    [(ngModel)]="formData.status"
                    name="status"
                    [options]="statusOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>
              </div>
            </div>

            <!-- Description -->
            <div class="pb-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Incident Description & Triage Details
              </h3>

              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description & Context *</label>
                <textarea
                  rows="4"
                  [(ngModel)]="formData.description"
                  name="description"
                  placeholder="Detail observed anomaly, authentication failures, impacted modules, and mitigation actions taken..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                ></textarea>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="goBack()"
                class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="isSaving || !formData.incident_type || !formData.severity || !formData.description"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update Threat Incident' : 'Record Threat Incident' }}</span>
                }
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
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  incidentId: number | null = null;
  incidentCode: string = '';
  loadingData = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    incident_type: 'FAILED_LOGIN_SPIKE',
    severity: 'MEDIUM',
    source_ip: '',
    affected_user: 'kamal_hossain',
    description: '',
    status: 'OPEN'
  };

  incidentTypeOptions: SelectOption[] = [
    { value: 'FAILED_LOGIN_SPIKE', label: 'FAILED_LOGIN_SPIKE (Multiple Password Errors)' },
    { value: 'PRIVILEGE_ESCALATION', label: 'PRIVILEGE_ESCALATION (Unauthorized Role Elevation)' },
    { value: 'EXPORT_ANOMALY', label: 'EXPORT_ANOMALY (Mass Customer / Financial Export)' },
    { value: 'UNAUTHORIZED_ACCESS', label: 'UNAUTHORIZED_ACCESS (Direct Object Reference / URL Tampering)' },
    { value: 'BRUTE_FORCE_ATTEMPT', label: 'BRUTE_FORCE_ATTEMPT (Credential Stuffing Attack)' },
    { value: 'FOREIGN_IP_LOGIN', label: 'FOREIGN_IP_LOGIN (Login from Suspicious Geolocation)' }
  ];

  severityOptions: SelectOption[] = [
    { value: 'LOW', label: 'LOW (Minor Anomaly)' },
    { value: 'MEDIUM', label: 'MEDIUM (Operational Warning)' },
    { value: 'HIGH', label: 'HIGH (Elevated Threat)' },
    { value: 'CRITICAL', label: 'CRITICAL (Active Breach Response)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'OPEN', label: 'OPEN (Active Incident)' },
    { value: 'UNDER_INVESTIGATION', label: 'UNDER_INVESTIGATION (In Triage)' },
    { value: 'RESOLVED', label: 'RESOLVED (Mitigated)' },
    { value: 'FALSE_POSITIVE', label: 'FALSE_POSITIVE (Dismissed)' }
  ];

  userOptions: SelectOption[] = [
    { value: 'superadmin', label: 'superadmin (Super Administrator)', subLabel: '@superadmin' },
    { value: 'kamal_hossain', label: 'kamal_hossain (Engr. Kamal Hossain)', subLabel: '@kamal_hossain' },
    { value: 'tariqul', label: 'tariqul (Tariqul Islam)', subLabel: '@tariqul' },
    { value: 'farhana_cfo', label: 'farhana_cfo (Farhana Ahmed)', subLabel: '@farhana_cfo' },
    { value: 'system', label: 'system (Automated Background Worker)', subLabel: '@system' }
  ];

  ngOnInit(): void {
    this.loadUserOptions();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.incidentId = Number(idParam);
      this.isEditMode = true;
      this.loadIncidentData(this.incidentId);
    }
  }

  loadUserOptions(): void {
    this.service.getUsers({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          const mapped = res.items.map(u => ({
            value: u.username,
            label: `${u.username} (${u.full_name_en})`,
            subLabel: `@${u.username}`
          }));
          const existing = new Set(mapped.map(m => m.value));
          const fallback = this.userOptions.filter(o => !existing.has(o.value));
          this.userOptions = [...mapped, ...fallback];
        }
      },
      error: (err) => console.error('Failed to load user list', err)
    });
  }

  loadIncidentData(id: number): void {
    this.loadingData = true;
    this.service.getIncidentById(id).subscribe({
      next: (inc) => {
        this.incidentCode = inc.incident_code;
        this.formData = {
          incident_type: inc.incident_type || 'FAILED_LOGIN_SPIKE',
          severity: inc.severity || 'MEDIUM',
          source_ip: inc.source_ip || '',
          affected_user: inc.affected_user || '',
          description: inc.description || '',
          status: inc.status || 'OPEN'
        };
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load incident', err);
        this.errorMessage = 'Unable to load incident details. Please check connection.';
        this.loadingData = false;
      }
    });
  }

  saveIncident(): void {
    if (!this.formData.incident_type || !this.formData.severity || !this.formData.description) {
      this.errorMessage = 'Please complete all required fields marked with *';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    const payload = {
      ...this.formData,
      source_ip: this.formData.source_ip?.trim() || null,
      affected_user: this.formData.affected_user?.trim() || null
    };

    if (this.isEditMode && this.incidentId) {
      this.service.updateIncident(this.incidentId, payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update incident', err);
          this.errorMessage = err?.error?.detail || 'Failed to update threat incident.';
          this.isSaving = false;
        }
      });
    } else {
      this.service.createIncident(payload).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to create incident', err);
          this.errorMessage = err?.error?.detail || 'Failed to record threat incident.';
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/security/monitoring-reviews'], { queryParams: { tab: 'threat_incidents' } });
  }
}
