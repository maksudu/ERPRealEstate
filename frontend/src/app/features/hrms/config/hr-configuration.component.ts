import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

export interface ConfigSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-hr-configuration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-card-container
        [title]="currentViewMeta().title"
        [subtitle]="currentViewMeta().description"
        [badge]="currentViewMeta().badge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          <app-custom-button
            variant="outline"
            size="sm"
            label="Backup Configuration"
            (btnClick)="backupConfig()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Configure ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Security Audit Score</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">99.8% Compliant</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Configured RBAC Roles</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">14 Enterprise Roles</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Biometric Terminals</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">8 Online Devices</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">External Webhook APIs</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">4 Active Integrations</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search config key, parameter, role, device..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Rules & Devices</option>
              <option value="ACTIVE">Enabled / Active</option>
              <option value="PENDING">Draft / Testing</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Setting Key / ID</th>
                <th class="px-4 py-3">Parameter Name</th>
                <th class="px-4 py-3">Configured Value / Logic</th>
                <th class="px-4 py-3">Scope / Module</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.key }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.desc }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                    {{ item.value }}
                  </td>
                  <td class="px-4 py-3">{{ item.scope }}</td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="viewDetails(item)"
                      class="px-2.5 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'Configure ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Setting Key / Identifier</label>
            <app-custom-input [(ngModel)]="formKey" placeholder="e.g. PAYROLL_CUTOFF_DAY"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Configured Value</label>
            <app-custom-input [(ngModel)]="formVal" placeholder="e.g. 25"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Description & Operational Notes</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Explain the behavior and impact of this setting"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save Setting" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class HrConfigurationSecurityComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('settings');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formKey = '';
  formVal = '';
  formNotes = '';

  viewsMeta: { [key: string]: ConfigSubView } = {
    'settings': { id: 'settings', title: 'Global HR Settings & Parameters', description: 'Enterprise currency, fiscal year definition, probation periods and attendance grace minutes', badge: 'Security 16.1' },
    'salary-rules': { id: 'salary-rules', title: 'Salary Calculation Rules Engine', description: 'Formula expressions for Basic (50%), House Rent (25%), Medical, Conveyance and PF contribution', badge: 'Security 16.2' },
    'leave-rules': { id: 'leave-rules', title: 'Leave Rules & Quota Matrix', description: 'Earned leave accrual frequency, casual/sick quotas, maximum carry-forward limits and sandwich rules', badge: 'Security 16.3' },
    'shift-rules': { id: 'shift-rules', title: 'Shift & Break Policy Rules', description: 'Overtime calculation threshold, grace period for late punch-in and minimum hours for half-day', badge: 'Security 16.4' },
    'payroll-calendar': { id: 'payroll-calendar', title: 'Monthly Payroll Processing Calendar', description: 'Attendance cutoff dates, salary review windows, bank disbursement dates and payout freeze locks', badge: 'Security 16.5' },
    'notification-templates': { id: 'notification-templates', title: 'Notification Templates (Email, SMS & Push)', description: 'Automated email templates for offer letters, payslip delivery, leave approvals and warnings', badge: 'Security 16.6' },
    'communication': { id: 'communication', title: 'Email, SMS & Push Gateway Settings', description: 'SMTP mailer credentials, Twilio / local SMS gateways and web push notification webhooks', badge: 'Security 16.7' },
    'communication-settings': { id: 'communication-settings', title: 'Email, SMS & Push Gateway Settings', description: 'SMTP mailer credentials, Twilio / local SMS gateways and web push notification webhooks', badge: 'Security 16.7' },
    'user-roles': { id: 'user-roles', title: 'HR User Roles & Access Groups', description: 'HR Admin, Department Head, Project In-Charge, Site Supervisor and Employee roles', badge: 'Security 16.8' },
    'permissions': { id: 'permissions', title: 'Granular Feature & Field Permissions', description: 'CRUD access controls, salary visibility masking and financial approval limits', badge: 'Security 16.9' },
    'audit-logs': { id: 'audit-logs', title: 'System Security & Event Audit Logs', description: 'Tracking administrative actions, permission changes, salary edits and user logins', badge: 'Security 16.10' },
    'biometric-devices': { id: 'biometric-devices', title: 'ZKTeco Biometric Devices & Cloud Sync', description: 'Network IP, port, device serial numbers, live heartbeat monitor and ADMS cloud push sync', badge: 'Security 16.11' },
    'api-integrations': { id: 'api-integrations', title: 'Third-Party API & Webhook Settings', description: 'ERP Accounting general ledger sync, corporate bank disbursement API and WhatsApp bots', badge: 'Security 16.12' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['settings'];
  });

  items = signal<any[]>([
    { id: 1, key: 'HR_GRACE_PERIOD_MINS', name: 'Attendance Late Grace Period', desc: 'Allowable late punch-in minutes before marking Late', value: '15 Minutes', scope: 'Attendance & Punches', status: 'ACTIVE' },
    { id: 2, key: 'PAYROLL_CUTOFF_DAY', name: 'Monthly Attendance Cutoff Date', desc: 'Day of month attendance closes for payroll generation', value: '25th of Month', scope: 'Payroll Calculation', status: 'ACTIVE' },
    { id: 3, key: 'ZKTECO_SITE_01_IP', name: 'Gulshan Site Biometric IP', desc: 'ZKTeco K40 biometric clocking terminal at Site Gate 1', value: '192.168.1.204:4370', scope: 'Biometric Devices', status: 'ACTIVE' },
    { id: 4, key: 'NBR_TAX_YEAR', name: 'Current Bangladesh Income Tax Fiscal Year', desc: 'Income Year for tax calculation slabs', value: '2026-2027', scope: 'Statutory & Tax', status: 'ACTIVE' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    return this.items().filter(item => {
      return !q || item.key.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.scope.toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.viewsMeta[path]) {
        this.currentSubView.set(path);
      }
    });
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view && this.viewsMeta[view]) {
        this.currentSubView.set(view);
      }
    });
  }

  backupConfig(): void {
    alert('Security Snapshot & Configuration Schema Backup exported successfully.');
  }

  openActionModal(): void {
    this.formKey = '';
    this.formVal = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formKey) return;
    this.items.update(list => [
      {
        id: Date.now(),
        key: this.formKey.toUpperCase(),
        name: this.currentViewMeta().title,
        desc: this.formNotes || 'User Defined Setting',
        value: this.formVal || 'Enabled',
        scope: 'Enterprise Core',
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Configuration Details for ${item.key}\nName: ${item.name}\nValue: ${item.value}`);
  }
}
