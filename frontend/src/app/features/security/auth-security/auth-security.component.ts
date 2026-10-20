import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, SecurityPolicyConfig } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-auth-security',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-security-nav />

      <!-- Global Policy Card -->
      <app-card title="Authentication, Password & Login Security Policy" subtitle="Configure corporate password complexity, account lockout thresholds, session timeouts and multi-factor authentication (MFA)">
        <div card-actions>
          <button
            type="button"
            (click)="savePolicies()"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            Update Security Policies
          </button>
        </div>

        <div class="space-y-6 text-xs max-w-3xl">
          <!-- Password Rules Section -->
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <h4 class="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              1. Password Complexity Requirements
            </h4>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Minimum Password Length</label>
                <input
                  type="number"
                  [(ngModel)]="policy.min_password_length"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div class="space-y-2 pt-2">
                <label class="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <input type="checkbox" [(ngModel)]="policy.require_special_char" class="rounded text-rose-600" />
                  <span>Require at least one special character (!&#64;#$%^&*)</span>
                </label>
                <label class="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <input type="checkbox" [(ngModel)]="policy.require_numbers" class="rounded text-rose-600" />
                  <span>Require at least one numerical digit (0-9)</span>
                </label>
                <label class="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                  <input type="checkbox" [(ngModel)]="policy.require_uppercase" class="rounded text-rose-600" />
                  <span>Require uppercase and lowercase letters</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Account Lockout Section -->
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <h4 class="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              2. Failed Login Throttling & Account Lockout
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Max Consecutive Failed Logins</label>
                <input
                  type="number"
                  [(ngModel)]="policy.max_failed_attempts"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <span class="text-[10px] text-slate-500">Account will be temporarily locked after exceeding attempts</span>
              </div>
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lockout Duration (Minutes)</label>
                <input
                  type="number"
                  [(ngModel)]="policy.lockout_duration_minutes"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <!-- Session & MFA Section -->
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <h4 class="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              3. Session Lifetime & MFA Enforcement
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Idle Session Timeout (Minutes)</label>
                <input
                  type="number"
                  [(ngModel)]="policy.session_idle_timeout_minutes"
                  class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">MFA Mandatory for Roles</label>
                <div class="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                  SUPER_ADMIN, SYS_ADMIN, FIN_MGR, MD
                </div>
              </div>
            </div>
          </div>

          <!-- IP Allowlisting -->
          <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-3">
            <h4 class="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-[11px]">
              4. Corporate Network IP Allowlisting
            </h4>

            <div>
              <label class="flex items-center gap-2 mb-2 text-slate-800 dark:text-slate-200 font-medium">
                <input type="checkbox" [(ngModel)]="policy.ip_allowlist_enabled" class="rounded text-rose-600" />
                <span>Restrict administrator access strictly to authorized corporate IP subnets</span>
              </label>
              <textarea
                [(ngModel)]="policy.allowed_ip_ranges"
                rows="2"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono text-[11px]"
              ></textarea>
            </div>
          </div>
        </div>
      </app-card>
    </div>
  `
})
export class AuthSecurityComponent implements OnInit {
  private service = inject(SecurityService);

  policy: SecurityPolicyConfig = {
    id: 1,
    policy_name: 'Corporate Policy',
    min_password_length: 8,
    require_special_char: true,
    require_numbers: true,
    require_uppercase: true,
    max_failed_attempts: 5,
    lockout_duration_minutes: 30,
    session_idle_timeout_minutes: 60,
    ip_allowlist_enabled: false,
    allowed_ip_ranges: '103.145.0.0/16, 192.168.1.0/24'
  };

  ngOnInit(): void {
    this.service.getPolicies().subscribe({
      next: (data) => this.policy = data,
      error: (err) => console.error('Failed to load security policies', err)
    });
  }

  savePolicies(): void {
    this.service.updatePolicies(this.policy).subscribe({
      next: () => alert('Corporate security policies updated successfully.'),
      error: (err) => console.error('Failed to update policies', err)
    });
  }
}
