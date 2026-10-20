import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SecurityService, AuditLogItem } from '../../../../core/services/security.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-audit-log-form',
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
            <span>&larr;</span> Back to Audit Logs
          </button>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            Compliance & Audit Trail
          </span>
        </div>
      </div>

      <!-- Main Form Card -->
      <app-card
        [title]="isEditMode ? 'Annotate / Edit Audit Event Entry' : 'Record Enterprise Audit Event'"
        [subtitle]="isEditMode ? 'Update compliance notes and record references for security event #' + auditRef : 'Record an authorized administrative or system audit trail entry in the security ledger'"
      >
        @if (loadingData) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading audit record details...
          </div>
        } @else {
          <form (ngSubmit)="saveLog()" class="space-y-6 text-xs">
            @if (errorMessage) {
              <div class="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs">
                {{ errorMessage }}
              </div>
            }

            <!-- Section 1: User & Action Event -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-rose-500 rounded-full"></span>
                Event Actor & Classification
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Actor User Name *</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.user_name"
                    name="user_name"
                    placeholder="e.g. Super Administrator / Kamal Hossain"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Event Action Type *"
                    placeholder="Select event type..."
                    [(ngModel)]="formData.event_type"
                    name="event_type"
                    [options]="eventTypeOptions"
                    [allowCreateNew]="false"
                    [required]="true"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Module Name *"
                    placeholder="Select or enter module..."
                    [(ngModel)]="formData.module_name"
                    name="module_name"
                    [options]="moduleOptions"
                    [allowCreateNew]="true"
                    [required]="true"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Record Reference</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.record_ref"
                    name="record_ref"
                    placeholder="e.g. USR-004, VOUCH-2025-102, PO-0081"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            <!-- Section 2: Environment & Network Context -->
            <div class="border-b border-slate-200 dark:border-slate-800 pb-5">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                Network, Device Session & Result
              </h3>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Client IP Address</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.ip_address"
                    name="ip_address"
                    placeholder="e.g. 103.145.112.5"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Device / Client Session</label>
                  <input
                    type="text"
                    [(ngModel)]="formData.device_session"
                    name="device_session"
                    placeholder="e.g. Admin Portal Web, Mobile Android"
                    class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <app-searchable-select
                    label="Result Status *"
                    placeholder="Select status..."
                    [(ngModel)]="formData.result_status"
                    name="result_status"
                    [options]="resultStatusOptions"
                    [allowCreateNew]="false"
                  />
                </div>
              </div>
            </div>

            <!-- Section 3: Detailed Notes -->
            <div class="pb-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
                Audit Details & Justification Notes
              </h3>

              <div>
                <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Detailed Reason / Activity Log *</label>
                <textarea
                  rows="4"
                  [(ngModel)]="formData.reason_notes"
                  name="reason_notes"
                  placeholder="Provide precise details of the action performed, authorized personnel, or compliance rationale..."
                  class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  required
                ></textarea>
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
                [disabled]="isSaving || !formData.user_name || !formData.event_type || !formData.module_name"
                class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 shadow-xs transition"
              >
                @if (isSaving) {
                  <span class="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Saving...</span>
                } @else {
                  <span>{{ isEditMode ? 'Update Audit Entry' : 'Record Audit Event' }}</span>
                }
              </button>
            </div>
          </form>
        }
      </app-card>
    </div>
  `
})
export class AuditLogFormComponent implements OnInit {
  private service = inject(SecurityService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = false;
  logId: number | null = null;
  auditRef: string = '';
  loadingData = false;
  isSaving = false;
  errorMessage: string | null = null;

  formData: any = {
    user_name: 'Super Administrator',
    event_type: 'CREATE',
    module_name: 'User Management',
    record_ref: '',
    ip_address: '103.145.112.5',
    device_session: 'Admin Portal Web',
    result_status: 'SUCCESS',
    reason_notes: ''
  };

  eventTypeOptions: SelectOption[] = [
    { value: 'CREATE', label: 'CREATE (New Record Created)' },
    { value: 'UPDATE', label: 'UPDATE (Record Modification)' },
    { value: 'DELETE', label: 'DELETE (Record Removal)' },
    { value: 'LOGIN', label: 'LOGIN (Authentication Success)' },
    { value: 'LOGOUT', label: 'LOGOUT (Session End)' },
    { value: 'APPROVE', label: 'APPROVE (Workflow Sign-off)' },
    { value: 'EXPORT', label: 'EXPORT (Data Extraction)' },
    { value: 'SECURITY_ALERT', label: 'SECURITY_ALERT (Policy Breach)' }
  ];

  moduleOptions: SelectOption[] = [
    { value: 'User Management', label: 'User Management & Identity' },
    { value: 'Role & Permissions', label: 'Role & Permissions (RBAC)' },
    { value: 'Authentication & Policies', label: 'Authentication & Policies' },
    { value: 'Construction Operations', label: 'Construction Operations' },
    { value: 'Finance & Accounts', label: 'Finance & Accounts' },
    { value: 'Sales & Marketing', label: 'Sales & Marketing' },
    { value: 'Legal & Compliance', label: 'Legal & Compliance' },
    { value: 'Budgeting & Cost Control', label: 'Budgeting & Cost Control' },
    { value: 'Fixed Assets', label: 'Fixed Assets' }
  ];

  resultStatusOptions: SelectOption[] = [
    { value: 'SUCCESS', label: 'SUCCESS (Authorized)' },
    { value: 'DENIED', label: 'DENIED (Access Blocked)' },
    { value: 'FAILED', label: 'FAILED (Execution Error)' }
  ];

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.logId = Number(idParam);
      this.isEditMode = true;
      this.loadLogData(this.logId);
    }
  }

  loadLogData(id: number): void {
    this.loadingData = true;
    this.service.getAuditLogById(id).subscribe({
      next: (log) => {
        this.auditRef = log.audit_ref;
        this.formData = {
          user_name: log.user_name || '',
          event_type: log.event_type || 'CREATE',
          module_name: log.module_name || 'User Management',
          record_ref: log.record_ref || '',
          ip_address: log.ip_address || '',
          device_session: log.device_session || '',
          result_status: log.result_status || 'SUCCESS',
          reason_notes: log.reason_notes || ''
        };
        this.loadingData = false;
      },
      error: (err) => {
        console.error('Failed to load audit record', err);
        this.errorMessage = 'Unable to load audit record. Please check connection.';
        this.loadingData = false;
      }
    });
  }

  saveLog(): void {
    if (!this.formData.user_name || !this.formData.event_type || !this.formData.module_name) {
      this.errorMessage = 'Please complete all required fields marked with *';
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    if (this.isEditMode && this.logId) {
      this.service.updateAuditLog(this.logId, this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to update audit log', err);
          this.errorMessage = err?.error?.detail || 'Failed to update audit entry.';
          this.isSaving = false;
        }
      });
    } else {
      this.service.createAuditLog(this.formData).subscribe({
        next: () => {
          this.isSaving = false;
          this.goBack();
        },
        error: (err) => {
          console.error('Failed to create audit log', err);
          this.errorMessage = err?.error?.detail || 'Failed to create audit event entry.';
          this.isSaving = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/security/audit-logs'], { queryParams: { tab: 'audit_trail' } });
  }
}
