import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, AuditLogItem, ActiveSessionItem } from '../../../core/services/security.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Unified Top Header & Nav Tabs -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 class="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span class="w-2 h-5 bg-rose-600 rounded-full"></span>
            Enterprise Security Audit & Session Intelligence
          </h1>
          <p class="text-xs text-slate-500 mt-0.5">
            Tamper-resistant audit trails, administrative change records, active sessions and hardware remote-kill controls
          </p>
        </div>

        <!-- Navigation Tabs -->
        <div class="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs">
          <button
            type="button"
            (click)="setTab('audit_trail')"
            [ngClass]="activeTab === 'audit_trail' 
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-semibold' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2"
          >
            <span>📜 Audit Trail Logs</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
              {{ totalRecords }}
            </span>
          </button>

          <button
            type="button"
            (click)="setTab('active_sessions')"
            [ngClass]="activeTab === 'active_sessions' 
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold' 
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium'"
            class="px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-2"
          >
            <span>💻 Active User Sessions</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 font-bold">
              {{ sessionTotalRecords }}
            </span>
          </button>
        </div>
      </div>

      <!-- =================================================================== -->
      <!-- TAB 1: Enterprise Audit Trail & System Activity Logs -->
      <!-- =================================================================== -->
      @if (activeTab === 'audit_trail') {
        <app-card
          title="Enterprise Audit Trail & System Activity Logs"
          subtitle="Tamper-resistant audit history recording logins, role elevations, transactions, approvals and data exports"
        >
          <div card-actions>
            <button
              type="button"
              (click)="navigateToCreateAuditLog()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
            >
              <span>+</span> Record Audit Event
            </button>
          </div>

          <!-- Filter Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Audit Logs</label>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="onSearch()"
                placeholder="User, Audit Ref, Record Ref..."
                class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <app-searchable-select
                label="Module Name"
                placeholder="All Modules"
                [(ngModel)]="selectedModule"
                (ngModelChange)="onFilterChange()"
                [options]="moduleOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div>
              <app-searchable-select
                label="Event Type"
                placeholder="All Event Types"
                [(ngModel)]="selectedEventType"
                (ngModelChange)="onFilterChange()"
                [options]="eventTypeOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div>
              <app-searchable-select
                label="Result Status"
                placeholder="All Results"
                [(ngModel)]="selectedStatus"
                (ngModelChange)="onFilterChange()"
                [options]="statusOptions"
                [allowCreateNew]="false"
              />
            </div>
          </div>

          <!-- Table Listing -->
          <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                  <th class="p-3">Audit ID</th>
                  <th class="p-3">Actor User</th>
                  <th class="p-3">Event Type</th>
                  <th class="p-3">Module</th>
                  <th class="p-3">Record Ref</th>
                  <th class="p-3">IP Address</th>
                  <th class="p-3">Reason / Details</th>
                  <th class="p-3 text-center">Result</th>
                  <th class="p-3">Timestamp</th>
                  <th class="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                @if (loading) {
                  <tr>
                    <td colspan="10" class="p-6 text-center text-slate-400">Loading audit trail records...</td>
                  </tr>
                } @else if (logs.length === 0) {
                  <tr>
                    <td colspan="10" class="p-6 text-center text-slate-400">No audit log records found matching filters.</td>
                  </tr>
                } @else {
                  @for (item of logs; track item.id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {{ item.audit_ref }}
                      </td>
                      <td class="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {{ item.user_name }}
                      </td>
                      <td class="p-3 whitespace-nowrap">
                        <span
                          [ngClass]="{
                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400': item.event_type === 'CREATE',
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400': item.event_type === 'UPDATE',
                            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400': item.event_type === 'DELETE',
                            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400': item.event_type === 'LOGIN' || item.event_type === 'APPROVE',
                            'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400': item.event_type === 'EXPORT'
                          }"
                          class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border"
                        >
                          {{ item.event_type }}
                        </span>
                      </td>
                      <td class="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{{ item.module_name }}</td>
                      <td class="p-3 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {{ item.record_ref || 'N/A' }}
                      </td>
                      <td class="p-3 font-mono text-[10px] text-slate-500 whitespace-nowrap">{{ item.ip_address }}</td>
                      <td class="p-3 max-w-[280px] truncate text-slate-600 dark:text-slate-300" [title]="item.reason_notes">
                        {{ item.reason_notes || 'Activity completed successfully.' }}
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <span
                          [ngClass]="item.result_status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                          class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold border"
                        >
                          {{ item.result_status }}
                        </span>
                      </td>
                      <td class="p-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {{ item.created_at ? (item.created_at | date:'short') : 'Today' }}
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            (click)="navigateToEditAuditLog(item)"
                            class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                            title="Edit / Annotate Audit Log"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            (click)="deleteAuditLog(item)"
                            class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                            title="Delete Log"
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

          <!-- Pagination Bar -->
          <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {{ totalRecords === 0 ? 0 : offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} log entries
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="offset === 0"
                (click)="prevPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span>Page {{ currentPage }} of {{ totalPages || 1 }}</span>
              <button
                type="button"
                [disabled]="offset + limit >= totalRecords"
                (click)="nextPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </app-card>
      }

      <!-- =================================================================== -->
      <!-- TAB 2: Active User Sessions & Connected Devices -->
      <!-- =================================================================== -->
      @if (activeTab === 'active_sessions') {
        <app-card
          title="Active User Sessions & Connected Devices"
          subtitle="Live authorized sessions across desktop browsers, site terminals and mobile apps with remote kill-switch"
        >
          <div card-actions>
            <button
              type="button"
              (click)="navigateToCreateSession()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition"
            >
              <span>+</span> Register Connected Device
            </button>
          </div>

          <!-- Filter Controls -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Search Sessions & Devices</label>
              <input
                type="text"
                [(ngModel)]="sessionSearchQuery"
                (keyup.enter)="onSessionSearch()"
                placeholder="Username, IP, Device Model..."
                class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <app-searchable-select
                label="Session Authorization Status"
                placeholder="All Statuses"
                [(ngModel)]="selectedSessionStatus"
                (ngModelChange)="onSessionFilterChange()"
                [options]="sessionStatusOptions"
                [allowCreateNew]="false"
              />
            </div>

            <div class="flex items-end">
              <button
                type="button"
                (click)="loadSessions()"
                class="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Refresh Sessions
              </button>
            </div>
          </div>

          <!-- Table Listing -->
          <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                  <th class="p-3">Session ID</th>
                  <th class="p-3">Authorized User</th>
                  <th class="p-3">Device & Browser</th>
                  <th class="p-3">Client IP</th>
                  <th class="p-3">Location</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3">Login / Last Activity</th>
                  <th class="p-3 text-center">Remote Kill</th>
                  <th class="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                @if (sessionLoading) {
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-400">Loading active sessions...</td>
                  </tr>
                } @else if (sessions.length === 0) {
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-400">No active user sessions found matching criteria.</td>
                  </tr>
                } @else {
                  @for (ses of sessions; track ses.session_id) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td class="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {{ ses.session_id }}
                      </td>
                      <td class="p-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {{ ses.username }}
                      </td>
                      <td class="p-3 whitespace-nowrap">
                        <div class="font-medium text-slate-800 dark:text-slate-200">{{ ses.device_name }}</div>
                        <div class="text-[10px] text-slate-400">{{ ses.browser }}</div>
                      </td>
                      <td class="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{{ ses.ip_address }}</td>
                      <td class="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{{ ses.location }}</td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <span
                          [ngClass]="{
                            'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400': ses.status === 'ACTIVE',
                            'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400': ses.status === 'REVOKED',
                            'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400': ses.status === 'EXPIRED'
                          }"
                          class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        >
                          {{ ses.status }}
                        </span>
                      </td>
                      <td class="p-3 text-slate-400 text-[10px] whitespace-nowrap">
                        {{ ses.login_at ? (ses.login_at | date:'short') : 'Active Now' }}
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          (click)="revokeSession(ses.session_id)"
                          [disabled]="ses.status !== 'ACTIVE'"
                          class="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold disabled:opacity-30 transition"
                        >
                          Terminate
                        </button>
                      </td>
                      <td class="p-3 text-center whitespace-nowrap">
                        <div class="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            (click)="navigateToEditSession(ses)"
                            class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                            title="Edit Device Session"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            (click)="deleteSession(ses)"
                            class="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600"
                            title="Remove Session Record"
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

          <!-- Pagination Bar -->
          <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing {{ sessionTotalRecords === 0 ? 0 : sessionOffset + 1 }} to {{ Math.min(sessionOffset + sessionLimit, sessionTotalRecords) }} of {{ sessionTotalRecords }} active sessions
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                [disabled]="sessionOffset === 0"
                (click)="prevSessionPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Previous
              </button>
              <span>Page {{ currentSessionPage }} of {{ totalSessionPages || 1 }}</span>
              <button
                type="button"
                [disabled]="sessionOffset + sessionLimit >= sessionTotalRecords"
                (click)="nextSessionPage()"
                class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </app-card>
      }
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  Math = Math;
  activeTab: 'audit_trail' | 'active_sessions' = 'audit_trail';

  // Audit Logs State
  logs: AuditLogItem[] = [];
  totalRecords = 0;
  limit = 20;
  offset = 0;
  loading = false;

  searchQuery = '';
  selectedModule = '';
  selectedEventType = '';
  selectedStatus = '';

  moduleOptions: SelectOption[] = [
    { value: '', label: 'All Modules' },
    { value: 'User Management', label: 'User Management' },
    { value: 'Role & Permissions', label: 'Role & Permissions' },
    { value: 'Authentication & Policies', label: 'Authentication & Policies' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Budgeting & Cost Control', label: 'Budgeting & Cost Control' },
    { value: 'Fixed Assets', label: 'Fixed Assets' }
  ];

  eventTypeOptions: SelectOption[] = [
    { value: '', label: 'All Event Types' },
    { value: 'CREATE', label: 'CREATE' },
    { value: 'UPDATE', label: 'UPDATE' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'LOGIN', label: 'LOGIN' },
    { value: 'LOGOUT', label: 'LOGOUT' },
    { value: 'APPROVE', label: 'APPROVE' },
    { value: 'EXPORT', label: 'EXPORT' }
  ];

  statusOptions: SelectOption[] = [
    { value: '', label: 'All Results' },
    { value: 'SUCCESS', label: 'SUCCESS' },
    { value: 'DENIED', label: 'DENIED' },
    { value: 'FAILED', label: 'FAILED' }
  ];

  // Active Sessions State
  sessions: ActiveSessionItem[] = [];
  sessionTotalRecords = 0;
  sessionLimit = 20;
  sessionOffset = 0;
  sessionLoading = false;

  sessionSearchQuery = '';
  selectedSessionStatus = '';

  sessionStatusOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'ACTIVE' },
    { value: 'REVOKED', label: 'REVOKED' },
    { value: 'EXPIRED', label: 'EXPIRED' }
  ];

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  get currentSessionPage(): number {
    return Math.floor(this.sessionOffset / this.sessionLimit) + 1;
  }

  get totalSessionPages(): number {
    return Math.ceil(this.sessionTotalRecords / this.sessionLimit);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'active_sessions') {
        this.activeTab = 'active_sessions';
      } else {
        this.activeTab = 'audit_trail';
      }
      this.loadLogs();
      this.loadSessions();
    });
  }

  setTab(tab: 'audit_trail' | 'active_sessions'): void {
    this.activeTab = tab;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  // Audit Logs Data
  loadLogs(): void {
    this.loading = true;
    this.service.getAuditLogs({
      search: this.searchQuery,
      module_name: this.selectedModule,
      event_type: this.selectedEventType,
      result_status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.logs = res.items;
        this.totalRecords = res.total;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.offset = 0;
    this.loadLogs();
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadLogs();
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadLogs();
    }
  }

  navigateToCreateAuditLog(): void {
    this.router.navigate(['/security/audit-logs/create']);
  }

  navigateToEditAuditLog(item: AuditLogItem): void {
    this.router.navigate(['/security/audit-logs', item.id, 'edit']);
  }

  deleteAuditLog(item: AuditLogItem): void {
    if (confirm(`Are you sure you want to remove audit event record #${item.audit_ref}?`)) {
      this.service.deleteAuditLog(item.id).subscribe({
        next: () => this.loadLogs(),
        error: (err) => console.error('Failed to delete audit record', err)
      });
    }
  }

  // Active Sessions Data
  loadSessions(): void {
    this.sessionLoading = true;
    this.service.getActiveSessions({
      search: this.sessionSearchQuery,
      status_filter: this.selectedSessionStatus,
      limit: this.sessionLimit,
      offset: this.sessionOffset
    }).subscribe({
      next: (res) => {
        this.sessions = res.items || [];
        this.sessionTotalRecords = res.total || 0;
        this.sessionLoading = false;
      },
      error: (err) => {
        console.error('Failed to load active sessions', err);
        this.sessionLoading = false;
      }
    });
  }

  onSessionSearch(): void {
    this.sessionOffset = 0;
    this.loadSessions();
  }

  onSessionFilterChange(): void {
    this.sessionOffset = 0;
    this.loadSessions();
  }

  prevSessionPage(): void {
    if (this.sessionOffset >= this.sessionLimit) {
      this.sessionOffset -= this.sessionLimit;
      this.loadSessions();
    }
  }

  nextSessionPage(): void {
    if (this.sessionOffset + this.sessionLimit < this.sessionTotalRecords) {
      this.sessionOffset += this.sessionLimit;
      this.loadSessions();
    }
  }

  navigateToCreateSession(): void {
    this.router.navigate(['/security/audit-logs/sessions/create']);
  }

  navigateToEditSession(ses: ActiveSessionItem): void {
    this.router.navigate(['/security/audit-logs/sessions', ses.session_id, 'edit']);
  }

  revokeSession(sessionId: string): void {
    if (confirm(`Kill session ${sessionId}? The user will be logged out immediately.`)) {
      this.service.revokeSession(sessionId).subscribe({
        next: () => this.loadSessions(),
        error: (err) => console.error('Failed to revoke session', err)
      });
    }
  }

  deleteSession(ses: ActiveSessionItem): void {
    if (confirm(`Remove active session record ${ses.session_id} for user ${ses.username}?`)) {
      this.service.deleteActiveSession(ses.session_id).subscribe({
        next: () => this.loadSessions(),
        error: (err) => console.error('Failed to delete session', err)
      });
    }
  }
}
