import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, ApiKeyItem, MobilePolicyItem } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-api-mobile-security',
  standalone: true,
  imports: [CommonModule, FormsModule, SecurityNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-security-nav />

      <!-- Top API Keys Section -->
      <app-card title="API Keys & Service Accounts Integration" subtitle="Authorized programmatic integration credentials with rate limiting and scoped tokens">
        <div card-actions>
          <button
            type="button"
            (click)="openModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-2xs transition"
          >
            <span>+</span> Generate API Key
          </button>
        </div>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl mb-6">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Application / Service</th>
                <th class="p-3">Client ID</th>
                <th class="p-3">API Key (Masked)</th>
                <th class="p-3">Authorized Scopes</th>
                <th class="p-3 text-right">Rate Limit / Min</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @for (item of apiKeys; track item.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">{{ item.app_name }}</td>
                  <td class="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">{{ item.client_id }}</td>
                  <td class="p-3 font-mono text-slate-500">{{ item.api_key_masked }}</td>
                  <td class="p-3">
                    <span class="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-indigo-600">
                      {{ item.allowed_scopes?.join(', ') || 'read:all' }}
                    </span>
                  </td>
                  <td class="p-3 text-right font-mono font-semibold">{{ item.rate_limit_per_minute }} req/m</td>
                  <td class="p-3 text-center">
                    <span
                      [ngClass]="item.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'"
                      class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    >
                      {{ item.is_active ? 'ACTIVE' : 'REVOKED' }}
                    </span>
                  </td>
                  <td class="p-3 text-center">
                    <button
                      type="button"
                      (click)="revokeKey(item.id)"
                      [disabled]="!item.is_active"
                      class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      title="Revoke Key"
                    >
                      🚫
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- Mobile Application Security Section -->
      <app-card title="Mobile Application Governance & Policies" subtitle="Access control policies for Sales, Site Engineer, Collection and Executive mobile apps">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          @for (mob of mobilePolicies; track mob.id) {
            <div class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-slate-900 dark:text-slate-100 text-sm">{{ mob.app_name }}</span>
                <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Min v{{ mob.min_supported_version }}
                </span>
              </div>

              <div class="space-y-1.5 pt-1 text-slate-600 dark:text-slate-300">
                <div class="flex items-center justify-between">
                  <span>Biometric Fingerprint/FaceID Unlock:</span>
                  <span class="font-bold text-emerald-600">{{ mob.require_biometrics ? 'Enforced' : 'Optional' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Encrypted Offline Cache:</span>
                  <span class="font-bold">{{ mob.allow_offline_cache ? 'Enabled' : 'Disabled' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Direct File / PDF Download:</span>
                  <span class="font-bold text-rose-600">{{ mob.restrict_document_download ? 'Blocked' : 'Allowed' }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Token Lifetime:</span>
                  <span class="font-mono">{{ mob.session_lifetime_hours }} Hours</span>
                </div>
              </div>
            </div>
          }
        </div>
      </app-card>

      <!-- Generate Key Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Generate New API Integration Key"
        subtitle="Provision dedicated service credentials with scoped permissions"
        badge="API Security"
        size="md"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Integration Application Name *</label>
            <input
              type="text"
              [(ngModel)]="formData.app_name"
              placeholder="e.g. Bank Payment Gateway bKash"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Rate Limit per Minute</label>
            <input
              type="number"
              [(ngModel)]="formData.rate_limit_per_minute"
              placeholder="120"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveApiKey()"
            [disabled]="!formData.app_name"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Generate Key
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class ApiMobileSecurityComponent implements OnInit {
  private service = inject(SecurityService);

  apiKeys: ApiKeyItem[] = [];
  mobilePolicies: MobilePolicyItem[] = [];
  isModalOpen = false;

  formData = {
    app_name: '',
    rate_limit_per_minute: 120
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.service.getApiKeys().subscribe({
      next: (data) => this.apiKeys = data
    });
    this.service.getMobilePolicies().subscribe({
      next: (data) => this.mobilePolicies = data
    });
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveApiKey(): void {
    this.service.generateApiKey({
      app_name: this.formData.app_name,
      allowed_scopes: ['read:reports', 'write:transactions'],
      rate_limit_per_minute: this.formData.rate_limit_per_minute
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadData();
      },
      error: (err) => console.error('Failed to generate key', err)
    });
  }

  revokeKey(id: number): void {
    if (confirm('Are you sure you want to revoke this API integration key?')) {
      this.service.revokeApiKey(id).subscribe({
        next: () => this.loadData(),
        error: (err) => console.error('Failed to revoke API key', err)
      });
    }
  }
}
