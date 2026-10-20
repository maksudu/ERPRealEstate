import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, SecurityIncidentItem, AccessReviewItem } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-monitoring-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-security-nav />

      <!-- Security Monitoring & Incident Alerts Section -->
      <app-card title="Security Monitoring & Threat Detection" subtitle="Automated alerts for brute-force login anomalies, privilege escalation and foreign IP attempts">
        <div card-actions>
          <button
            type="button"
            (click)="openIncidentModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Log Threat Incident
          </button>
        </div>

        <!-- Search Bar -->
        <div class="mb-4 max-w-sm">
          <input
            type="text"
            [(ngModel)]="searchIncident"
            (keyup.enter)="loadIncidents()"
            placeholder="Search incident code or account..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-4">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Incident Code</th>
                <th class="p-3 text-center">Severity</th>
                <th class="p-3">Threat Type</th>
                <th class="p-3">Source IP</th>
                <th class="p-3">Affected Account</th>
                <th class="p-3">Incident Description</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @for (item of incidents; track item.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-rose-600">{{ item.incident_code }}</td>
                  <td class="p-3 text-center">
                    <span
                      [ngClass]="{
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300': item.severity === 'HIGH' || item.severity === 'CRITICAL',
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300': item.severity === 'MEDIUM',
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300': item.severity === 'LOW'
                      }"
                      class="inline-flex px-2 py-0.5 rounded text-[9px] font-bold"
                    >
                      {{ item.severity }}
                    </span>
                  </td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">{{ item.incident_type }}</td>
                  <td class="p-3 font-mono text-slate-500">{{ item.source_ip || 'N/A' }}</td>
                  <td class="p-3 text-indigo-600 font-medium">&#64;{{ item.affected_user || 'system' }}</td>
                  <td class="p-3 max-w-[280px] text-slate-600 dark:text-slate-300">{{ item.description }}</td>
                  <td class="p-3 text-center">
                    <span
                      [ngClass]="item.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
                      class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    >
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        (click)="toggleIncidentStatus(item)"
                        class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-600"
                        [title]="item.status === 'RESOLVED' ? 'Reopen Incident' : 'Resolve Incident'"
                      >
                        {{ item.status === 'RESOLVED' ? '🔄' : '✅' }}
                      </button>
                      <button
                        type="button"
                        (click)="deleteIncident(item)"
                        class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete Incident"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Showing {{ incidentOffset + 1 }} to {{ Math.min(incidentOffset + incidentLimit, incidentTotal) }} of {{ incidentTotal }} incidents</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="incidentOffset === 0"
              (click)="prevIncidentPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              type="button"
              [disabled]="incidentOffset + incidentLimit >= incidentTotal"
              (click)="nextIncidentPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- User Access Certification Reviews -->
      <app-card title="Periodic User Access Review & Certification" subtitle="Scheduled audits to recertify user permissions, remove inactive staff and eliminate SoD conflicts">
        <div card-actions>
          <button
            type="button"
            (click)="openReviewModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Start Review Cycle
          </button>
        </div>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-4">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Review Code</th>
                <th class="p-3">Audit Cycle Name</th>
                <th class="p-3">Department</th>
                <th class="p-3">Lead Reviewer</th>
                <th class="p-3 text-center">Reviewed</th>
                <th class="p-3 text-center">Certified</th>
                <th class="p-3 text-center">Revoked</th>
                <th class="p-3 text-center">Audit Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @for (rev of accessReviews; track rev.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-rose-600">{{ rev.review_code }}</td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">{{ rev.cycle_name }}</td>
                  <td class="p-3 text-slate-600 dark:text-slate-300">{{ rev.department }}</td>
                  <td class="p-3 text-indigo-600 font-medium">{{ rev.reviewer_name }}</td>
                  <td class="p-3 text-center font-mono font-medium">{{ rev.total_users_reviewed }}</td>
                  <td class="p-3 text-center font-mono font-bold text-emerald-600">{{ rev.certified_count }}</td>
                  <td class="p-3 text-center font-mono font-bold text-rose-600">{{ rev.revoked_count }}</td>
                  <td class="p-3 text-center">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {{ rev.status }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      type="button"
                      (click)="toggleReviewStatus(rev)"
                      class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                    >
                      {{ rev.status === 'COMPLETED' ? 'Reopen' : 'Mark Completed' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- Data Privacy & Disaster Recovery Policies -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <app-card title="Data Privacy & Field Masking Rules" subtitle="Automated PII and sensitive data masking">
          <div class="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>National ID (NID) & Smart Card:</span>
              <span class="font-bold text-emerald-600">Masked (***-***-8841)</span>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>Employee Salary & Payroll Data:</span>
              <span class="font-bold text-emerald-600">Restricted to HR / Finance</span>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>Customer Bank & Cheque Numbers:</span>
              <span class="font-bold text-emerald-600">Masked on Reports</span>
            </div>
          </div>
        </app-card>

        <app-card title="Database Backup & Recovery Access" subtitle="Automated snapshots and off-site replication">
          <div class="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>Automated Daily Snapshot:</span>
              <span class="font-bold text-emerald-600">03:00 AM BD Time (Active)</span>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>Point-in-Time Recovery (PITR):</span>
              <span class="font-bold text-indigo-600">7 Days Retention</span>
            </div>
            <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
              <span>Authorized Restorers:</span>
              <span class="font-mono text-rose-600 font-bold">SUPER_ADMIN ONLY</span>
            </div>
          </div>
        </app-card>
      </div>

      <!-- Add Incident Modal -->
      <app-modal
        [isOpen]="isIncidentModalOpen"
        title="Log Security Threat Incident"
        subtitle="Record suspicious login spikes, privilege anomalies or foreign IP breaches"
        badge="Threat Intel"
        size="lg"
        (close)="closeIncidentModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Threat Incident Type *</label>
            <input
              type="text"
              [(ngModel)]="incidentForm.incident_type"
              placeholder="e.g. FAILED_LOGIN_SPIKE, PRIVILEGE_ESCALATION"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Severity *</label>
              <select
                [(ngModel)]="incidentForm.severity"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Affected Account</label>
              <input
                type="text"
                [(ngModel)]="incidentForm.affected_user"
                placeholder="e.g. admin or staff_username"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Description *</label>
            <textarea
              [(ngModel)]="incidentForm.description"
              rows="3"
              placeholder="Provide context and anomalous actions..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            ></textarea>
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeIncidentModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveIncident()"
            [disabled]="!incidentForm.incident_type || !incidentForm.description"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Submit Incident
          </button>
        </div>
      </app-modal>

      <!-- Add Review Modal -->
      <app-modal
        [isOpen]="isReviewModalOpen"
        title="Start Access Certification Review"
        subtitle="Initiate periodic user permission recertification audit"
        badge="Audit Compliance"
        size="lg"
        (close)="closeReviewModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Audit Cycle Name *</label>
            <input
              type="text"
              [(ngModel)]="reviewForm.cycle_name"
              placeholder="e.g. Q4 Real Estate Staff Access Recertification"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Department *</label>
              <input
                type="text"
                [(ngModel)]="reviewForm.department"
                placeholder="e.g. Finance & Engineering"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Reviewer Name</label>
              <input
                type="text"
                [(ngModel)]="reviewForm.reviewer_name"
                placeholder="e.g. Tariqul Islam (Chief Auditor)"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeReviewModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveReview()"
            [disabled]="!reviewForm.cycle_name || !reviewForm.department"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Launch Review
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class MonitoringReviewsComponent implements OnInit {
  private service = inject(SecurityService);

  incidents: SecurityIncidentItem[] = [];
  accessReviews: AccessReviewItem[] = [];
  Math = Math;

  searchIncident = '';
  incidentLimit = 10;
  incidentOffset = 0;
  incidentTotal = 0;

  isIncidentModalOpen = false;
  incidentForm = {
    incident_type: 'FAILED_LOGIN_SPIKE',
    severity: 'MEDIUM',
    affected_user: '',
    description: ''
  };

  isReviewModalOpen = false;
  reviewForm = {
    cycle_name: '',
    department: '',
    reviewer_name: 'Security Officer'
  };

  ngOnInit(): void {
    this.loadIncidents();
    this.loadAccessReviews();
  }

  loadIncidents(): void {
    this.service.getIncidents({
      search: this.searchIncident,
      limit: this.incidentLimit,
      offset: this.incidentOffset
    }).subscribe({
      next: (res) => {
        this.incidents = res.items || [];
        this.incidentTotal = res.total || 0;
      }
    });
  }

  nextIncidentPage(): void {
    if (this.incidentOffset + this.incidentLimit < this.incidentTotal) {
      this.incidentOffset += this.incidentLimit;
      this.loadIncidents();
    }
  }

  prevIncidentPage(): void {
    if (this.incidentOffset >= this.incidentLimit) {
      this.incidentOffset -= this.incidentLimit;
      this.loadIncidents();
    }
  }

  loadAccessReviews(): void {
    this.service.getAccessReviews().subscribe({
      next: (res) => {
        this.accessReviews = res.items || [];
      }
    });
  }

  openIncidentModal(): void {
    this.incidentForm = {
      incident_type: 'FAILED_LOGIN_SPIKE',
      severity: 'MEDIUM',
      affected_user: '',
      description: ''
    };
    this.isIncidentModalOpen = true;
  }

  closeIncidentModal(): void {
    this.isIncidentModalOpen = false;
  }

  saveIncident(): void {
    this.service.createIncident(this.incidentForm).subscribe({
      next: () => {
        this.closeIncidentModal();
        this.loadIncidents();
      },
      error: (err) => console.error('Failed to log incident', err)
    });
  }

  toggleIncidentStatus(item: SecurityIncidentItem): void {
    const newStatus = item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    this.service.updateIncident(item.id, { status: newStatus }).subscribe({
      next: () => this.loadIncidents()
    });
  }

  deleteIncident(item: SecurityIncidentItem): void {
    if (confirm(`Remove incident ${item.incident_code}?`)) {
      this.service.deleteIncident(item.id).subscribe({
        next: () => this.loadIncidents()
      });
    }
  }

  openReviewModal(): void {
    this.reviewForm = {
      cycle_name: '',
      department: '',
      reviewer_name: 'Security Officer'
    };
    this.isReviewModalOpen = true;
  }

  closeReviewModal(): void {
    this.isReviewModalOpen = false;
  }

  saveReview(): void {
    this.service.createAccessReview(this.reviewForm).subscribe({
      next: () => {
        this.closeReviewModal();
        this.loadAccessReviews();
      },
      error: (err) => console.error('Failed to launch review', err)
    });
  }

  toggleReviewStatus(rev: AccessReviewItem): void {
    const newStatus = rev.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    this.service.updateAccessReview(rev.id, { status: newStatus }).subscribe({
      next: () => this.loadAccessReviews()
    });
  }
}
