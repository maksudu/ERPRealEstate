import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, SecurityIncidentItem, AccessReviewItem } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-monitoring-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-security-nav />

      <!-- Security Monitoring & Incident Alerts Section -->
      <app-card title="Security Monitoring & Threat Detection" subtitle="Automated alerts for brute-force login anomalies, privilege escalation and foreign IP attempts">
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
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
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- User Access Certification Reviews -->
      <app-card title="Periodic User Access Review & Certification" subtitle="Scheduled audits to recertify user permissions, remove inactive staff and eliminate SoD conflicts">
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
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
    </div>
  `
})
export class MonitoringReviewsComponent implements OnInit {
  private service = inject(SecurityService);

  incidents: SecurityIncidentItem[] = [];
  accessReviews: AccessReviewItem[] = [];

  ngOnInit(): void {
    this.service.getIncidents().subscribe({
      next: (data) => this.incidents = data
    });
    this.service.getAccessReviews().subscribe({
      next: (data) => this.accessReviews = data
    });
  }
}
