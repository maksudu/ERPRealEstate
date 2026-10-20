import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SecurityService, SecurityDashboardSummary } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-security-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Top Executive Metrics Cockpit -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Metric 1: Total Users -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total User Accounts</span>
            <span class="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 text-sm">👥</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            {{ summary?.total_users_count || 0 }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span class="text-emerald-600 font-semibold">{{ summary?.active_users_count || 0 }} Active</span>
            <span>• {{ summary?.suspended_users_count || 0 }} Suspended</span>
          </div>
        </div>

        <!-- Metric 2: Roles Configured -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configured Roles</span>
            <span class="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 text-sm">🔑</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-blue-600 dark:text-blue-400">
            {{ summary?.total_roles_count || 0 }}
          </div>
          <div class="mt-1 text-xs text-slate-500">
            <span>25 Pre-configured Real Estate Templates</span>
          </div>
        </div>

        <!-- Metric 3: MFA Adoption -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">MFA Adoption Rate</span>
            <span class="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 text-sm">📱</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
            {{ summary?.mfa_enabled_percent || 0 }}%
          </div>
          <div class="mt-1 text-xs text-slate-500">
            <span>Enforced on Admins & Finance</span>
          </div>
        </div>

        <!-- Metric 4: Active Sessions & Incidents -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Device Sessions</span>
            <span class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/70 text-rose-600 text-sm">💻</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            {{ summary?.active_sessions_count || 0 }}
          </div>
          <div class="mt-1 flex items-center gap-2 text-xs">
            <span class="text-rose-600 font-semibold">{{ summary?.open_security_incidents || 0 }} Open Incidents</span>
          </div>
        </div>
      </div>

      <!-- Security Status Banners -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-900/60 flex items-center gap-3">
          <div class="text-2xl">🔒</div>
          <div>
            <div class="text-xs font-bold text-emerald-800 dark:text-emerald-300">Project-Scoped Deny-by-Default</div>
            <div class="text-[11px] text-emerald-700 dark:text-emerald-400">
              Backend verifies X-Project-Id header on all mutating API calls.
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 dark:border-amber-900/60 flex items-center gap-3">
          <div class="text-2xl">⚖️</div>
          <div>
            <div class="text-xs font-bold text-amber-800 dark:text-amber-300">Maker-Checker Separation Active</div>
            <div class="text-[11px] text-amber-700 dark:text-amber-400">
              Users are strictly blocked from approving their own financial vouchers.
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-blue-200 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-900/60 flex items-center gap-3">
          <div class="text-2xl">📋</div>
          <div>
            <div class="text-xs font-bold text-blue-800 dark:text-blue-300">Audit Trail Retention</div>
            <div class="text-[11px] text-blue-700 dark:text-blue-400">
              All logins, exports, and permission changes recorded with client IP.
            </div>
          </div>
        </div>
      </div>

      <!-- Main Visual Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Distribution by Role -->
        <app-card title="User Distribution by Role" subtitle="Current workforce authorization breakdown across corporate and field roles">
          <div class="divide-y divide-slate-100 dark:divide-slate-800">
            @for (item of summary?.logins_by_role; track item.role) {
              <div class="py-2.5 flex items-center justify-between text-xs">
                <span class="font-medium text-slate-800 dark:text-slate-200">{{ item.role }}</span>
                <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-indigo-600">
                  {{ item.count }} Users
                </span>
              </div>
            }
          </div>
        </app-card>

        <!-- Recent Role & Permission Activity -->
        <app-card title="Recent Role & Privilege Changes" subtitle="Audit stream of security policy adjustments and role grants">
          <div class="space-y-3">
            @for (change of summary?.recent_role_changes; track change.record) {
              <div class="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 text-xs">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{ change.action }}</span>
                  <span class="text-[10px] text-slate-400">{{ change.time }}</span>
                </div>
                <div class="text-slate-600 dark:text-slate-300 text-[11px]">
                  Target: <span class="font-mono text-indigo-600 font-semibold">{{ change.record }}</span> by {{ change.user }}
                </div>
              </div>
            }
          </div>
        </app-card>
      </div>

      <!-- Quick Action Modules Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a routerLink="/security/users" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-rose-500 transition group shadow-2xs">
          <div class="text-xl mb-1">👤</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">User Accounts</div>
          <div class="text-[10px] text-slate-500">Add, Invite & Lifecycle</div>
        </a>

        <a routerLink="/security/roles" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-rose-500 transition group shadow-2xs">
          <div class="text-xl mb-1">🔑</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">Role Management</div>
          <div class="text-[10px] text-slate-500">25 Default Templates</div>
        </a>

        <a routerLink="/security/workflow-security" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-rose-500 transition group shadow-2xs">
          <div class="text-xl mb-1">⚖️</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">Maker-Checker Matrix</div>
          <div class="text-[10px] text-slate-500">Separation of Duties</div>
        </a>

        <a routerLink="/security/audit-logs" class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center hover:border-rose-500 transition group shadow-2xs">
          <div class="text-xl mb-1">📜</div>
          <div class="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600">Audit Logs & Sessions</div>
          <div class="text-[10px] text-slate-500">Tamper-Proof Trails</div>
        </a>
      </div>
    </div>
  `
})
export class SecurityDashboardComponent implements OnInit {
  private service = inject(SecurityService);

  summary: SecurityDashboardSummary | null = null;
  loading = false;

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading = true;
    this.service.getDashboardSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load security dashboard summary', err);
        this.loading = false;
      }
    });
  }
}
