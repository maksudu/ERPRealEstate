import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { SecurityService } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

export interface ReportTab {
  id: string;
  name: string;
  tag: string;
}

@Component({
  selector: 'app-security-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-security-nav />

      <!-- Compliance Statement Banner -->
      <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 flex items-start gap-3 shadow-2xs">
        <div class="p-1.5 rounded-lg bg-rose-600 text-white shrink-0">
          📜
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wider font-display">
              Enterprise Access Certification & Statutory Security Audit
            </h4>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-600 text-white">
              AUDIT COMPLIANT
            </span>
          </div>
          <p class="text-[11px] text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
            All user roles, privileged accounts, and system access rights are certified in accordance with ISO/IEC 27001 Access Control and Bangladesh National Cyber Security Guidelines.
          </p>
        </div>
      </div>

      <!-- Main Reports Container -->
      <app-card title="Security & Access Audit Reports Suite" subtitle="Executive reports for privileged accounts, role matrices, failed logins and export audit statements">
        <div card-actions class="flex items-center gap-2">
          <button
            type="button"
            (click)="printReport()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-2xs transition"
          >
            <span>🖨️</span> Print / Export PDF
          </button>
        </div>

        <!-- Report Tabs Strip -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 mb-4 scrollbar-thin">
          @for (tab of reportTabs; track tab.id) {
            <button
              type="button"
              (click)="selectReport(tab.id)"
              [ngClass]="activeTab === tab.id
                ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80'"
              class="px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors flex items-center gap-1.5"
            >
              <span class="text-[10px] opacity-75 font-mono">{{ tab.tag }}</span>
              <span>{{ tab.name }}</span>
            </button>
          }
        </div>

        <!-- Report Content Rendering -->
        @if (loading) {
          <div class="p-8 text-center text-slate-400 text-xs">Generating security audit statement...</div>
        } @else {
          <!-- 1. User Access Matrix -->
          @if (activeTab === 'user_access_matrix') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Username</th>
                    <th class="p-3">Employee Name</th>
                    <th class="p-3">Department</th>
                    <th class="p-3">Designation</th>
                    <th class="p-3">Primary Role</th>
                    <th class="p-3 text-center">MFA</th>
                    <th class="p-3">Last Login</th>
                    <th class="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of reportData?.items; track item.username) {
                    <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td class="p-3 font-mono font-bold text-rose-600">&#64;{{ item.username }}</td>
                      <td class="p-3 font-medium">{{ item.full_name }}</td>
                      <td class="p-3">{{ item.department }}</td>
                      <td class="p-3 text-slate-500">{{ item.designation }}</td>
                      <td class="p-3 font-semibold text-indigo-600">{{ item.primary_role }}</td>
                      <td class="p-3 text-center font-bold text-[10px]">{{ item.mfa }}</td>
                      <td class="p-3 text-slate-500 text-[11px]">{{ item.last_login }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {{ item.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 2. Privileged Accounts Statement -->
          @if (activeTab === 'privileged_accounts') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">User Code</th>
                    <th class="p-3">Username</th>
                    <th class="p-3">Administrator Name</th>
                    <th class="p-3">Privileged Role</th>
                    <th class="p-3">Department</th>
                    <th class="p-3 text-center">MFA Compliance</th>
                    <th class="p-3">Last Known IP</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of reportData?.items; track item.user_code) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-rose-600">{{ item.user_code }}</td>
                      <td class="p-3 font-medium">&#64;{{ item.username }}</td>
                      <td class="p-3 font-semibold">{{ item.full_name }}</td>
                      <td class="p-3 text-indigo-600 font-bold">{{ item.role }}</td>
                      <td class="p-3">{{ item.department }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {{ item.mfa_status }}
                        </span>
                      </td>
                      <td class="p-3 font-mono text-slate-500 text-[10px]">{{ item.last_login_ip }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <!-- 3. Threat Analytics & Failed Logins -->
          @if (activeTab === 'threat_analytics') {
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left border-collapse text-xs">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                    <th class="p-3">Incident Code</th>
                    <th class="p-3 text-center">Severity</th>
                    <th class="p-3">Threat Description</th>
                    <th class="p-3">Source IP</th>
                    <th class="p-3">Target Account</th>
                    <th class="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of reportData?.items; track item.id) {
                    <tr class="hover:bg-slate-50/50">
                      <td class="p-3 font-mono font-bold text-rose-600">{{ item.incident_code }}</td>
                      <td class="p-3 text-center font-bold text-[10px]">{{ item.severity }}</td>
                      <td class="p-3">{{ item.description }}</td>
                      <td class="p-3 font-mono text-slate-500 text-[10px]">{{ item.source_ip || 'N/A' }}</td>
                      <td class="p-3 font-medium">&#64;{{ item.affected_user || 'system' }}</td>
                      <td class="p-3 text-center">
                        <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          {{ item.status }}
                        </span>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </app-card>
    </div>
  `
})
export class SecurityReportsComponent implements OnInit {
  private service = inject(SecurityService);
  private route = inject(ActivatedRoute);

  activeTab = 'user_access_matrix';
  reportData: any = null;
  loading = false;

  reportTabs: ReportTab[] = [
    { id: 'user_access_matrix', name: 'User Access Matrix', tag: 'SEC-RPT-01' },
    { id: 'privileged_accounts', name: 'Privileged Accounts Audit', tag: 'SEC-RPT-02' },
    { id: 'threat_analytics', name: 'Threat & Failed Login Analytics', tag: 'SEC-RPT-03' }
  ];

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
      this.loadReport();
    });
  }

  selectReport(tabId: string): void {
    this.activeTab = tabId;
    this.loadReport();
  }

  loadReport(): void {
    this.loading = true;
    this.service.getReports(this.activeTab).subscribe({
      next: (data) => {
        this.reportData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load security report', err);
        this.loading = false;
      }
    });
  }

  printReport(): void {
    window.print();
  }
}
