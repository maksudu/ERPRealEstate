import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, ActiveSessionItem } from '../../../../core/services/security.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-session-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="p-4 sm:p-6 w-full max-w-4xl mx-auto space-y-6">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex items-center justify-between pb-2">
        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="goBack()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <span>&larr;</span> Back to Active Sessions
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Session & Connected Device
          </span>
        </div>
      </div>

      <!-- Main Form Card -->
      <app-card
        [title]="isEditMode ? 'Modify Device Session & Footprint' : 'Register Authorized Connected Device'"
        [subtitle]="isEditMode ? 'Update device profile or revoke remote authorization for session #' + sessionId : 'Authorize a mobile device, desktop terminal or site office machine into the enterprise session registry'"
      >
        @if (loadingData) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading session record details...
          </div>
        } @else {
          <form (ngSubmit)="saveSession()" class="space-y-6 text-xs">
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Section 1: User & Device Identity -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Authorized User & Hardware Identification
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <app-searchable-select
                    label="Authorized Username *"
                    placeholder="Select or enter username..."
                    [(ngModel)]="formData.username"
                    name="username"
                    [options]="userOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Device & Hardware Model *"
                    placeholder="Select or enter device..."
                    [(ngModel)]="formData.device_name"
                    name="device_name"
                    [options]="deviceOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Browser / Client App *"
                    placeholder="Select or enter browser..."
                    [(ngModel)]="formData.browser"
                    name="browser"
                    [options]="browserOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Client IP Address *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.ip_address"
                    name="ip_address"
                    placeholder="e.g. 103.145.112.18"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Section 2: Geolocation & Lifecycle -->
            <div class="pb-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Geolocation & Session Authorization Status
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <app-searchable-select
                    label="Location / Regional Site *"
                    placeholder="Select or enter location..."
                    [(ngModel)]="formData.location"
                    name="location"
                    [options]="locationOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Session Authorization Status *"
                    placeholder="Select status..."
                    [(ngModel)]="formData.status"
                    name="status"
                    [options]="statusOptions"
                    [allowCreateNew]="false"
                  />
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                (click)="goBack()"
                class="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                [disabled]="isSaving || !formData.username || !formData.device_name || !formData.browser || !formData.ip_address"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update Session Profile' : 'Authorize Device Session' }}</span>
                }
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class ActiveSessionFormComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  sessionId: string = '';
  loadingData = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    username: 'superadmin',
    device_name: 'Windows 11 Workstation',
    browser: 'Chrome 124.0.0',
    ip_address: '103.145.112.18',
    location: 'Dhaka, Bangladesh',
    status: 'ACTIVE'
  };

  userOptions: SelectOption[] = [
    { value: 'superadmin', label: 'Super Administrator', subLabel: '@superadmin' },
    { value: 'kamal_hossain', label: 'Engr. Kamal Hossain', subLabel: '@kamal_hossain' },
    { value: 'tariqul', label: 'Tariqul Islam', subLabel: '@tariqul' },
    { value: 'farhana_cfo', label: 'Farhana Ahmed', subLabel: '@farhana_cfo' },
    { value: 'rafiqul', label: 'Rafiqul Hassan', subLabel: '@rafiqul' }
  ];

  deviceOptions: SelectOption[] = [
    { value: 'Windows 11 Workstation', label: 'Windows 11 Enterprise Workstation' },
    { value: 'MacBook Pro M3 Max', label: 'MacBook Pro M3 Max (macOS 14.4)' },
    { value: 'Dell XPS 15 Workstation', label: 'Dell XPS 15 Workstation' },
    { value: 'Samsung Galaxy Tab S9 (Field Unit)', label: 'Samsung Galaxy Tab S9 (Site Field Unit)' },
    { value: 'iPhone 15 Pro Max', label: 'iPhone 15 Pro Max (Executive Mobile)' },
    { value: 'iPad Pro 12.9 (Architect Unit)', label: 'iPad Pro 12.9 (Architect Unit)' }
  ];

  browserOptions: SelectOption[] = [
    { value: 'Chrome 124.0.6367', label: 'Google Chrome 124 (Desktop)' },
    { value: 'Edge 124.0.2478', label: 'Microsoft Edge 124' },
    { value: 'Safari 17.4.1', label: 'Apple Safari 17.4 (macOS/iOS)' },
    { value: 'Firefox 125.0', label: 'Mozilla Firefox 125' },
    { value: 'BlueOceans Android App v2.4.1', label: 'BlueOceans Android App v2.4.1' },
    { value: 'BlueOceans iOS Enterprise v2.4.1', label: 'BlueOceans iOS Enterprise v2.4.1' }
  ];

  locationOptions: SelectOption[] = [
    { value: 'Dhaka Head Office (Gulshan)', label: 'Dhaka Head Office (Gulshan-2)' },
    { value: 'Dhaka Corporate Hub (Banani)', label: 'Dhaka Corporate Hub (Banani)' },
    { value: 'Chattogram Regional Office (Agrabad)', label: 'Chattogram Regional Office (Agrabad)' },
    { value: 'Sylhet Regional Project Center', label: 'Sylhet Regional Project Center' },
    { value: 'BlueOceans Bay Tower Site Office', label: 'BlueOceans Bay Tower Site Office' },
    { value: 'Green Valley Project Office (Purbachal)', label: 'Green Valley Project Office (Purbachal)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'ACTIVE (Live Connected)' },
    { value: 'REVOKED', label: 'REVOKED (Access Blocked)' },
    { value: 'EXPIRED', label: 'EXPIRED (Timeout)' }
  ];

  ngOnInit(): void {
    this.loadUserOptions();
    const idParam = this.route.snapshot.paramMap.get('sessionId');
    if (idParam) {
      this.sessionId = idParam;
      this.isEditMode = true;
      this.loadSessionData(this.sessionId);
    }
  }

  loadUserOptions(): void {
    this.service.getUsers({ limit: 100 }).subscribe({
      next: (res) => {
        if (res.items && res.items.length > 0) {
          const mapped = res.items.map(u => ({
            value: u.username,
            label: `${u.full_name_en} (${u.designation || u.primary_role})`,
            subLabel: `@${u.username}`
          }));
          const existing = new Set(mapped.map(m => m.value));
          const fallback = this.userOptions.filter(o => !existing.has(o.value));
          this.userOptions = [...mapped, ...fallback];
        }
      },
      error: (err) => console.error('Failed to load user list', err)
    });
  }

  loadSessionData(sessionId: string): void {
    this.loadingData = true;
    this.service.getActiveSessionById(sessionId).subscribe({
      next: (ses) => {
        this.formData = {
          username: ses.username || '',
          device_name: ses.device_name || '',
          browser: ses.browser || '',
          ip_address: ses.ip_address || '',
          location: ses.location || 'Dhaka, Bangladesh',
          status: ses.status || 'ACTIVE'
        };
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load session record', err);
        this.errorMessage = 'Unable to load session details. Please check connection.';
        this.loadingData = false;
      }
    });
  }

  saveSession(): void {
    if (!this.formData.username || !this.formData.device_name || !this.formData.browser || !this.formData.ip_address) {
      this.errorMessage = 'Please complete all required fields marked with *';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    if (this.isEditMode && this.sessionId) {
      this.service.updateActiveSession(this.sessionId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update session', err);
          this.errorMessage = err?.error?.detail || 'Failed to update session record.';
          this.isSaving = false;
        }
      });
    } else {
      this.service.createActiveSession(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to register session', err);
          this.errorMessage = err?.error?.detail || 'Failed to register connected device session.';
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/security/audit-logs'], { queryParams: { tab: 'active_sessions' } });
  }
}
