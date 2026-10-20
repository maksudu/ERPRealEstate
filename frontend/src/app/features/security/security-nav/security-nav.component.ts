import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SecurityNavTab {
  id: string;
  label: string;
  code: string;
  route: string;
  badge?: string;
}

@Component({
  selector: 'app-security-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-5 shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2.5 px-1">
        <div class="flex items-center gap-2.5">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white font-bold text-xs shadow-xs">
            🛡️
          </span>
          <div>
            <h1 class="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-display">
              User, Role & Security Management
            </h1>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Bangladesh Real Estate ERP — Multi-Tenant RBAC, Project Scopes, Maker-Checker Workflows, MFA & Audit Trails
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            NCSA / ISO 27001 Compliant
          </span>
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Zero Trust Enforced
          </span>
        </div>
      </div>

      <!-- Scrollable Tabs Strip -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-rose-600 text-white font-medium shadow-xs dark:bg-rose-600"
            [routerLinkActiveOptions]="{ exact: false }"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-normal whitespace-nowrap transition-colors duration-150 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent"
          >
            <span class="text-[10px] font-bold opacity-80 font-mono">{{ tab.code }}</span>
            <span>{{ tab.label }}</span>
            @if (tab.badge) {
              <span class="ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-semibold bg-white/20 text-inherit">
                {{ tab.badge }}
              </span>
            }
          </a>
        }
      </div>
    </div>
  `
})
export class SecurityNavComponent {
  tabs: SecurityNavTab[] = [
    { id: 'dashboard', label: 'Executive Cockpit', code: 'SEC-01', route: '/security/dashboard' },
    { id: 'users', label: 'User Accounts & Lifecycle', code: 'SEC-02', route: '/security/users' },
    { id: 'roles', label: 'Role Management (25 Roles)', code: 'SEC-03', route: '/security/roles' },
    { id: 'permissions', label: 'Permission Matrix', code: 'SEC-04', route: '/security/permissions' },
    { id: 'project-access', label: 'Project & Scope Access', code: 'SEC-05', route: '/security/project-access' },
    { id: 'workflow-security', label: 'Maker-Checker Approval', code: 'SEC-06', route: '/security/workflow-security' },
    { id: 'auth-security', label: 'Auth & Password Policy', code: 'SEC-07', route: '/security/auth-security' },
    { id: 'api-mobile-security', label: 'API & Mobile Security', code: 'SEC-08', route: '/security/api-mobile-security' },
    { id: 'audit-logs', label: 'Audit Trail & Sessions', code: 'SEC-09', route: '/security/audit-logs' },
    { id: 'monitoring-reviews', label: 'Incidents & Reviews', code: 'SEC-10', route: '/security/monitoring-reviews' },
    { id: 'reports', label: 'Security Reports Suite', code: 'SEC-11', route: '/security/reports' }
  ];
}
