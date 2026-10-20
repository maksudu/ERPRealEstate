import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, AuditLogItem, ActiveSessionItem } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-security-nav />

      <!-- Active Sessions & Remote Revocation Section -->
      <app-card title="Active User Sessions & Connected Devices" subtitle="Live active sessions across desktop browsers and Android/iOS field apps with remote kill-switch">
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Session ID</th>
                <th class="p-3">User</th>
                <th class="p-3">Device & Browser</th>
                <th class="p-3">Client IP</th>
                <th class="p-3">Location</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Remote Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @for (ses of sessions; track ses.session_id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-rose-600">{{ ses.session_id }}</td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">{{ ses.username }}</td>
                  <td class="p-3">
                    <div>{{ ses.device_name }}</div>
                    <div class="text-[10px] text-slate-400">{{ ses.browser }}</div>
                  </td>
                  <td class="p-3 font-mono text-slate-500">{{ ses.ip_address }}</td>
                  <td class="p-3 text-slate-600 dark:text-slate-300">{{ ses.location }}</td>
                  <td class="p-3 text-center">
                    <span
                      [ngClass]="ses.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                      class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    >
                      {{ ses.status }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      type="button"
                      (click)="revokeSession(ses.session_id)"
                      [disabled]="ses.status !== 'ACTIVE'"
                      class="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-semibold disabled:opacity-40"
                    >
                      Terminate
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- Main Audit Trail Section -->
      <app-card title="Enterprise Audit Trail & System Activity Logs" subtitle="Tamper-resistant audit history recording all logins, permission edits, approvals and data exports">
        <!-- Filter Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Search User</label>
            <input
              type="text"
              [(ngModel)]="searchUser"
              (keyup.enter)="loadLogs()"
              placeholder="Username..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label class="block text-[11px] font-medium text-slate-500 mb-1">Module Name</label>
            <input
              type="text"
              [(ngModel)]="searchModule"
              (keyup.enter)="loadLogs()"
              placeholder="e.g. Construction, Sales, Role..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div class="flex items-end">
            <button
              type="button"
              (click)="loadLogs()"
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              Filter Logs
            </button>
          </div>
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Audit ID</th>
                <th class="p-3">User</th>
                <th class="p-3">Event Type</th>
                <th class="p-3">Module</th>
                <th class="p-3">Record Ref</th>
                <th class="p-3">IP Address</th>
                <th class="p-3">Details / Reason</th>
                <th class="p-3 text-center">Result</th>
                <th class="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">Loading audit trail...</td>
                </tr>
              } @else if (logs.length === 0) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">No audit log records found.</td>
                </tr>
              } @else {
                @for (item of logs; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {{ item.audit_ref }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.user_name }}
                    </td>
                    <td class="p-3 font-bold text-slate-700 dark:text-slate-300">
                      {{ item.event_type }}
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">{{ item.module_name }}</td>
                    <td class="p-3 font-mono text-[10px] text-indigo-600">{{ item.record_ref || 'N/A' }}</td>
                    <td class="p-3 font-mono text-[10px] text-slate-500">{{ item.ip_address }}</td>
                    <td class="p-3 max-w-[250px] truncate text-slate-500">{{ item.reason_notes }}</td>
                    <td class="p-3 text-center">
                      <span
                        [ngClass]="item.result_status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                        class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold"
                      >
                        {{ item.result_status }}
                      </span>
                    </td>
                    <td class="p-3 text-slate-400 text-[10px]">
                      {{ item.created_at ? (item.created_at | date:'short') : 'Today' }}
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} log entries</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="offset === 0"
              (click)="prevPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
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
    </div>
  `
})
export class AuditLogsComponent implements OnInit {
  private service = inject(SecurityService);

  Math = Math;
  logs: AuditLogItem[] = [];
  sessions: ActiveSessionItem[] = [];
  totalRecords = 0;
  limit = 20;
  offset = 0;
  loading = false;

  searchUser = '';
  searchModule = '';

  ngOnInit(): void {
    this.loadLogs();
    this.loadSessions();
  }

  loadLogs(): void {
    this.loading = true;
    this.service.getAuditLogs({
      user_name: this.searchUser,
      module_name: this.searchModule,
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

  loadSessions(): void {
    this.service.getActiveSessions().subscribe({
      next: (data) => this.sessions = data
    });
  }

  revokeSession(sessionId: string): void {
    if (confirm(`Kill session ${sessionId}? The user will be logged out immediately.`)) {
      this.service.revokeSession(sessionId).subscribe({
        next: () => this.loadSessions(),
        error: (err) => console.error('Failed to revoke session', err)
      });
    }
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
}
