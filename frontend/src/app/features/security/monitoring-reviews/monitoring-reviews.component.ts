import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, SecurityIncidentItem, AccessReviewItem } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-monitoring-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Top Title & Navigation Tabs -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span class="w-2 h-5 bg-rose-600 rounded-full"></span>
            Security Monitoring, Threat Intelligence & Access Reviews
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Automated threat triage, credential breach alerts, periodic access recertification cycles and disaster recovery policies
          </p>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            (click)="setTab('threat_incidents')"
            [ngClass]="activeTab === 'threat_incidents' 
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2"
          >
            <span>🛡️ Threat Incidents</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
              {{ incidentTotal }}
            </span>
          </button>

          <button
            type="button"
            (click)="setTab('access_reviews')"
            [ngClass]="activeTab === 'access_reviews' 
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2"
          >
            <span>📋 Access Certifications</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
              {{ reviewTotal }}
            </span>
          </button>

          <button
            type="button"
            (click)="setTab('privacy_rules')"
            [ngClass]="activeTab === 'privacy_rules' 
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2"
          >
            <span>🔒 Privacy & DR Rules</span>
          </button>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 1: Security Monitoring & Threat Detection -->
      <!-- =================================================================== -->
      @if (activeTab === 'threat_incidents') {
        <app-card
          title="Security Monitoring & Threat Detection"
          subtitle="Automated alerts for brute-force login anomalies, privilege escalation, export spikes and foreign IP attempts"
        >
          <div card-actions>
            <button
              type="button"
              (click)="navigateToCreateIncident()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
            >
              <span>+</span> Log Threat Incident
            </button>
          </div>

          <!-- Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Incidents</label>
              <input
                type="text"
                [(ngModel)]="searchIncident"
                (keyup.enter)="onIncidentSearch()"
                placeholder="Code, User or Description..."
                class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <app-searchable-select
                label="Severity Level"
                placeholder="All Severities"
                [(ngModel)]="selectedIncidentSeverity"
                (ngModelChange)="onIncidentFilterChange()"
                [options]="severityFilterOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div>
              <app-searchable-select
                label="Incident Status"
                placeholder="All Statuses"
                [(ngModel)]="selectedIncidentStatus"
                (ngModelChange)="onIncidentFilterChange()"
                [options]="incidentStatusFilterOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div class="flex items-end">
              <button
                type="button"
                (click)="loadIncidents()"
                class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Filter Incidents
              </button>
            </div>
          </div>

          <!-- Incidents Table -->
          <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-4">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                  <th class="p-3">Incident Code</th>
                  <th class="p-3 text-center">Severity</th>
                  <th class="p-3">Threat Type</th>
                  <th class="p-3">Source IP</th>
                  <th class="p-3">Target Account</th>
                  <th class="p-3">Incident Description</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                @if (incidentLoading) {
                  <tr>
                    <td colspan="8" class="p-6 text-center text-slate-400">Loading security incidents...</td>
                  </tr>
                } @else if (incidents.length === 0) {
                  <tr>
                    <td colspan="8" class="p-6 text-center text-slate-400">No threat incident alerts found matching criteria.</td>
                  </tr>
                } @else {
                  @for (item of incidents; track item.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {{ item.incident_code }}
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <span
                          [ngClass]="{
                            'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300': item.severity === 'HIGH' || item.severity === 'CRITICAL',
                            'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300': item.severity === 'MEDIUM',
                            'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300': item.severity === 'LOW'
                          }"
                          class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border"
                        >
                          {{ item.severity }}
                        </span>
                      </td>
                      <td class="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {{ item.incident_type }}
                      </td>
                      <td class="p-3 font-mono text-slate-500 whitespace-nowrap">{{ item.source_ip || 'N/A' }}</td>
                      <td class="p-3 text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">
                        &#64;{{ item.affected_user || 'system' }}
                      </td>
                      <td class="p-3 max-w-[300px] truncate text-slate-600 dark:text-slate-300" [title]="item.description">
                        {{ item.description }}
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <span
                          [ngClass]="item.status === 'RESOLVED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'"
                          class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        >
                          {{ item.status }}
                        </span>
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
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
                            (click)="navigateToEditIncident(item)"
                            class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                            title="Edit Incident"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            (click)="deleteIncident(item)"
                            class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                            title="Delete Incident"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <!-- Incidents Pagination Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {{ incidentTotal === 0 ? 0 : incidentOffset + 1 }} to {{ Math.min(incidentOffset + incidentLimit, incidentTotal) }} of {{ incidentTotal }} incidents
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="incidentOffset === 0"
                (click)="prevIncidentPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span>Page {{ currentIncidentPage }} of {{ totalIncidentPages || 1 }}</span>
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
      }

      <!-- =================================================================== -->
      <!-- TAB 2: User Access Reviews & Certification -->
      <!-- =================================================================== -->
      @if (activeTab === 'access_reviews') {
        <app-card
          title="Periodic User Access Review & Certification"
          subtitle="Scheduled audits to recertify user permissions, remove inactive staff and eliminate segregation of duties (SoD) conflicts"
        >
          <div card-actions>
            <button
              type="button"
              (click)="navigateToCreateReview()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition"
            >
              <span>+</span> Start Review Cycle
            </button>
          </div>

          <!-- Filters -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Review Cycles</label>
              <input
                type="text"
                [(ngModel)]="searchReview"
                (keyup.enter)="onReviewSearch()"
                placeholder="Cycle, Department, Lead..."
                class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <app-searchable-select
                label="Department Scope"
                placeholder="All Departments"
                [(ngModel)]="selectedReviewDept"
                (ngModelChange)="onReviewFilterChange()"
                [options]="departmentFilterOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div>
              <app-searchable-select
                label="Audit Status"
                placeholder="All Statuses"
                [(ngModel)]="selectedReviewStatus"
                (ngModelChange)="onReviewFilterChange()"
                [options]="reviewStatusFilterOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div class="flex items-end">
              <button
                type="button"
                (click)="loadReviews()"
                class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Filter Cycles
              </button>
            </div>
          </div>

          <!-- Reviews Table -->
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
                @if (reviewLoading) {
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-400">Loading access review cycles...</td>
                  </tr>
                } @else if (accessReviews.length === 0) {
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-400">No access review cycles found matching criteria.</td>
                  </tr>
                } @else {
                  @for (rev of accessReviews; track rev.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {{ rev.review_code }}
                      </td>
                      <td class="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {{ rev.cycle_name }}
                      </td>
                      <td class="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{{ rev.department }}</td>
                      <td class="p-3 text-indigo-600 dark:text-indigo-400 font-medium whitespace-nowrap">
                        {{ rev.reviewer_name }}
                      </td>
                      <td class="p-3 text-center font-mono font-medium whitespace-nowrap">{{ rev.total_users_reviewed }}</td>
                      <td class="p-3 text-center font-mono font-bold text-emerald-600 whitespace-nowrap">{{ rev.certified_count }}</td>
                      <td class="p-3 text-center font-mono font-bold text-rose-600 whitespace-nowrap">{{ rev.revoked_count }}</td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <span
                          [ngClass]="{
                            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400': rev.status === 'COMPLETED',
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400': rev.status === 'IN_PROGRESS',
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400': rev.status === 'PENDING_SIGNOFF',
                            'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400': rev.status === 'ARCHIVED'
                          }"
                          class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                        >
                          {{ rev.status }}
                        </span>
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            (click)="toggleReviewStatus(rev)"
                            class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                            [title]="rev.status === 'COMPLETED' ? 'Reopen Cycle' : 'Mark Completed'"
                          >
                            {{ rev.status === 'COMPLETED' ? 'Reopen' : 'Complete' }}
                          </button>
                          <button
                            type="button"
                            (click)="navigateToEditReview(rev)"
                            class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                            title="Edit Review Cycle"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            (click)="deleteReview(rev)"
                            class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                            title="Delete Review Cycle"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <!-- Reviews Pagination Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {{ reviewTotal === 0 ? 0 : reviewOffset + 1 }} to {{ Math.min(reviewOffset + reviewLimit, reviewTotal) }} of {{ reviewTotal }} review cycles
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="reviewOffset === 0"
                (click)="prevReviewPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span>Page {{ currentReviewPage }} of {{ totalReviewPages || 1 }}</span>
              <button
                type="button"
                [disabled]="reviewOffset + reviewLimit >= reviewTotal"
                (click)="nextReviewPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </app-card>
      }

      <!-- =================================================================== -->
      <!-- TAB 3: Data Privacy & Disaster Recovery Rules -->
      <!-- =================================================================== -->
      @if (activeTab === 'privacy_rules') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <app-card title="Data Privacy & Field Masking Rules" subtitle="Automated PII and sensitive data masking controls">
            <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>National ID (NID) & Smart Card:</span>
                <span class="font-bold text-emerald-600">Masked (***-***-8841)</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Employee Salary & Payroll Data:</span>
                <span class="font-bold text-emerald-600">Restricted to HR / Finance</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Customer Bank & Cheque Numbers:</span>
                <span class="font-bold text-emerald-600">Masked on Reports</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Buyer Phone Number on Public Prints:</span>
                <span class="font-bold text-emerald-600">Partial Mask (01711***000)</span>
              </div>
            </div>
          </app-card>

          <app-card title="Database Backup & Recovery Access" subtitle="Automated snapshots, point-in-time recovery and off-site replication">
            <div class="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Automated Daily Snapshot:</span>
                <span class="font-bold text-emerald-600">03:00 AM BD Time (Active)</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Point-in-Time Recovery (PITR):</span>
                <span class="font-bold text-indigo-600">7 Days Retention Active</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Authorized Restorers:</span>
                <span class="font-mono text-rose-600 font-bold">SUPER_ADMIN ONLY</span>
              </div>
              <div class="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 flex items-center justify-between">
                <span>Off-Site Cloud Mirror (Secondary Zone):</span>
                <span class="font-bold text-emerald-600">Synchronized (Singapore Zone)</span>
              </div>
            </div>
          </app-card>
        </div>
      }
    </div>
  `
})
export class MonitoringReviewsComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  Math = Math;
  activeTab: 'threat_incidents' | 'access_reviews' | 'privacy_rules' = 'threat_incidents';

  // Threat Incidents State
  incidents: SecurityIncidentItem[] = [];
  incidentTotal = 0;
  incidentLimit = 20;
  incidentOffset = 0;
  incidentLoading = false;

  searchIncident = '';
  selectedIncidentSeverity = '';
  selectedIncidentStatus = '';

  severityFilterOptions: SelectOption[] = [
    { value: '', label: 'All Severities' },
    { value: 'LOW', label: 'LOW' },
    { value: 'MEDIUM', label: 'MEDIUM' },
    { value: 'HIGH', label: 'HIGH' },
    { value: 'CRITICAL', label: 'CRITICAL' }
  ];

  incidentStatusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'OPEN', label: 'OPEN' },
    { value: 'UNDER_INVESTIGATION', label: 'UNDER_INVESTIGATION' },
    { value: 'RESOLVED', label: 'RESOLVED' },
    { value: 'FALSE_POSITIVE', label: 'FALSE_POSITIVE' }
  ];

  // Access Reviews State
  accessReviews: AccessReviewItem[] = [];
  reviewTotal = 0;
  reviewLimit = 20;
  reviewOffset = 0;
  reviewLoading = false;

  searchReview = '';
  selectedReviewDept = '';
  selectedReviewStatus = '';

  departmentFilterOptions: SelectOption[] = [
    { value: '', label: 'All Departments' },
    { value: 'Executive Management', label: 'Executive Management' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'IT & Infrastructure', label: 'IT & Infrastructure' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Internal Audit', label: 'Internal Audit' }
  ];

  reviewStatusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
    { value: 'PENDING_SIGNOFF', label: 'PENDING_SIGNOFF' },
    { value: 'COMPLETED', label: 'COMPLETED' },
    { value: 'ARCHIVED', label: 'ARCHIVED' }
  ];

  get currentIncidentPage(): number {
    return Math.floor(this.incidentOffset / this.incidentLimit) + 1;
  }

  get totalIncidentPages(): number {
    return Math.ceil(this.incidentTotal / this.incidentLimit);
  }

  get currentReviewPage(): number {
    return Math.floor(this.reviewOffset / this.reviewLimit) + 1;
  }

  get totalReviewPages(): number {
    return Math.ceil(this.reviewTotal / this.reviewLimit);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'access_reviews') {
        this.activeTab = 'access_reviews';
      } else if (tabParam === 'privacy_rules') {
        this.activeTab = 'privacy_rules';
      } else {
        this.activeTab = 'threat_incidents';
      }
      this.loadIncidents();
      this.loadReviews();
    });
  }

  setTab(tab: 'threat_incidents' | 'access_reviews' | 'privacy_rules'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // Incidents Data
  loadIncidents(): void {
    this.incidentLoading = true;
    this.service.getIncidents({
      search: this.searchIncident,
      severity: this.selectedIncidentSeverity,
      status_filter: this.selectedIncidentStatus,
      limit: this.incidentLimit,
      offset: this.incidentOffset
    }).subscribe({
      next: (res) => {
        this.incidents = res.items;
        this.incidentTotal = res.total;
        this.incidentLoading = false;
      },
      error: (err) => {
        console.error('Failed to load incidents', err);
        this.incidentLoading = false;
      }
    });
  }

  onIncidentSearch(): void {
    this.incidentOffset = 0;
    this.loadIncidents();
  }

  onIncidentFilterChange(): void {
    this.incidentOffset = 0;
    this.loadIncidents();
  }

  prevIncidentPage(): void {
    if (this.incidentOffset >= this.incidentLimit) {
      this.incidentOffset -= this.incidentLimit;
      this.loadIncidents();
    }
  }

  nextIncidentPage(): void {
    if (this.incidentOffset + this.incidentLimit < this.incidentTotal) {
      this.incidentOffset += this.incidentLimit;
      this.loadIncidents();
    }
  }

  navigateToCreateIncident(): void {
    this.router.navigate(['/security/monitoring-reviews/incidents/create']);
  }

  navigateToEditIncident(item: SecurityIncidentItem): void {
    this.router.navigate(['/security/monitoring-reviews/incidents', item.id, 'edit']);
  }

  toggleIncidentStatus(item: SecurityIncidentItem): void {
    const newStatus = item.status === 'RESOLVED' ? 'OPEN' : 'RESOLVED';
    this.service.updateIncident(item.id, { status: newStatus }).subscribe({
      next: () => this.loadIncidents(),
      error: (err) => console.error('Failed to change incident status', err)
    });
  }

  deleteIncident(item: SecurityIncidentItem): void {
    if (confirm(`Are you sure you want to remove incident ${item.incident_code}?`)) {
      this.service.deleteIncident(item.id).subscribe({
        next: () => this.loadIncidents(),
        error: (err) => console.error('Failed to delete incident', err)
      });
    }
  }

  // Access Reviews Data
  loadReviews(): void {
    this.reviewLoading = true;
    this.service.getAccessReviews({
      search: this.searchReview,
      department: this.selectedReviewDept,
      status_filter: this.selectedReviewStatus,
      limit: this.reviewLimit,
      offset: this.reviewOffset
    }).subscribe({
      next: (res) => {
        this.accessReviews = res.items;
        this.reviewTotal = res.total;
        this.reviewLoading = false;
      },
      error: (err) => {
        console.error('Failed to load access reviews', err);
        this.reviewLoading = false;
      }
    });
  }

  onReviewSearch(): void {
    this.reviewOffset = 0;
    this.loadReviews();
  }

  onReviewFilterChange(): void {
    this.reviewOffset = 0;
    this.loadReviews();
  }

  prevReviewPage(): void {
    if (this.reviewOffset >= this.reviewLimit) {
      this.reviewOffset -= this.reviewLimit;
      this.loadReviews();
    }
  }

  nextReviewPage(): void {
    if (this.reviewOffset + this.reviewLimit < this.reviewTotal) {
      this.reviewOffset += this.reviewLimit;
      this.loadReviews();
    }
  }

  navigateToCreateReview(): void {
    this.router.navigate(['/security/monitoring-reviews/reviews/create']);
  }

  navigateToEditReview(rev: AccessReviewItem): void {
    this.router.navigate(['/security/monitoring-reviews/reviews', rev.id, 'edit']);
  }

  toggleReviewStatus(rev: AccessReviewItem): void {
    const newStatus = rev.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    this.service.updateAccessReview(rev.id, { status: newStatus }).subscribe({
      next: () => this.loadReviews(),
      error: (err) => console.error('Failed to change review status', err)
    });
  }

  deleteReview(rev: AccessReviewItem): void {
    if (confirm(`Are you sure you want to remove review cycle ${rev.review_code}?`)) {
      this.service.deleteAccessReview(rev.id).subscribe({
        next: () => this.loadReviews(),
        error: (err) => console.error('Failed to delete access review', err)
      });
    }
  }
}
