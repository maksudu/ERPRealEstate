import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FixedAssetsService, AssetPhysicalVerification } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      @if (notice) { <div class="rounded-lg border px-4 py-3 text-sm" [ngClass]="notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'">{{ notice.text }}</div> }
      @if (!isFormPage) {
      <app-card title="Physical Asset Verification & Audit Log" subtitle="Reconcile physical on-site machinery and tools against registry for discrepancy identification">
        <div card-actions>
          <button
            type="button"
            (click)="openNewPage()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Log Physical Audit
          </button>
        </div>
        <div class="mb-3 flex flex-wrap items-end gap-3"><label class="text-xs">Search<input [(ngModel)]="search" (keyup.enter)="offset = 0; loadVerifications()" class="ml-2 rounded-lg border px-3 py-1.5" placeholder="Audit, project, auditor" /></label><label class="text-xs">Rows<select [(ngModel)]="limit" (ngModelChange)="offset = 0; loadVerifications()" class="ml-2 rounded-lg border px-2 py-1.5"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select></label><button type="button" (click)="offset = 0; loadVerifications()" class="px-3 py-1.5 rounded-lg border text-xs">Search</button></div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Audit Code</th>
                <th class="p-3">Project / Site</th>
                <th class="p-3">Audit Date</th>
                <th class="p-3 text-center">Registered Qty</th>
                <th class="p-3 text-center">Physically Found</th>
                <th class="p-3 text-center">Discrepancy</th>
                <th class="p-3">Condition Summary</th>
                <th class="p-3">Auditor</th>
                <th class="p-3 text-center">Condition</th><th class="p-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="10" class="p-6 text-center text-slate-400">Loading audit records...</td>
                </tr>
              } @else if (verifications.length === 0) {
                <tr>
                  <td colspan="10" class="p-6 text-center text-slate-400">No physical audit records found.</td>
                </tr>
              } @else {
                @for (item of verifications; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.audit_code }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.project_name || 'Central Facility' }}
                    </td>
                    <td class="p-3 text-slate-500">{{ item.verification_date }}</td>
                    <td class="p-3 text-center font-mono font-medium">{{ item.total_assets_registered }}</td>
                    <td class="p-3 text-center font-mono font-medium text-emerald-600">{{ item.total_assets_found }}</td>
                    <td
                      [ngClass]="item.discrepancy_qty === 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'"
                      class="p-3 text-center font-mono"
                    >
                      {{ item.discrepancy_qty === 0 ? '0 (None)' : item.discrepancy_qty + ' Missing' }}
                    </td>
                    <td class="p-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300">
                      {{ item.discrepancy_notes || item.condition_status }}
                    </td>
                    <td class="p-3 text-[11px]">{{ item.verified_by || 'Internal Audit' }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        {{ item.condition_status }}
                      </span>
                    </td>
                    <td class="p-3 whitespace-nowrap"><button type="button" (click)="openEditPage(item)" class="text-indigo-600 mr-2">Edit</button><button type="button" (click)="deleteVerification(item.id)" class="text-rose-600">Delete</button></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>
      <div class="flex items-center justify-between text-xs text-slate-500"><span>{{ totalRecords }} audits · page {{ currentPage }} of {{ totalPages || 1 }}</span><div class="flex gap-2"><button type="button" [disabled]="offset === 0" (click)="offset = Math.max(0, offset - limit); loadVerifications()" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" [disabled]="offset + limit >= totalRecords" (click)="offset = offset + limit; loadVerifications()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
      }

      @if (isFormPage) { <app-card [title]="editingId ? 'Edit Physical Verification' : 'Record Physical Asset Verification Audit'" subtitle="Record site audit totals, condition and findings">
        <div class="space-y-4 p-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="PROJECT_LOCATION"
                label="Project / Yard Site *"
                placeholder="Select project..."
                [(ngModel)]="formData.project_name"
                [options]="projectOptions"
                [allowCreateNew]="true"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Audit Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.verification_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Assets on Register *</label>
              <input
                type="number"
                [(ngModel)]="formData.total_assets_registered"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Physically Verified / Found *</label>
              <input
                type="number"
                [(ngModel)]="formData.total_assets_found"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Equipment Condition Summary</label>
            <input
              type="text"
              [(ngModel)]="formData.discrepancy_notes"
              placeholder="e.g. All cranes operational; 1 generator due for service"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Auditor Name</label>
              <input
                type="text"
                [(ngModel)]="formData.verified_by"
                placeholder="e.g. Internal Audit Officer"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Remarks</label>
              <input
                type="text"
                [(ngModel)]="formData.action_taken"
                placeholder="e.g. 100% physically barcode verified"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div card-actions class="flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="router.navigate(['/fixed-assets/verification'])"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveVerification()"
            [disabled]="saving || !formData.project_name"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ saving ? 'Saving...' : editingId ? 'Update Audit' : 'Submit Audit' }}
          </button>
        </div>
      </app-card> }
    </div>
  `
})
export class AssetVerificationComponent implements OnInit {
  private service = inject(FixedAssetsService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  Math = Math;
  verifications: AssetPhysicalVerification[] = [];
  loading = false;
  isFormPage = false;
  editingId: number | null = null;
  saving = false;
  notice: { type: 'success' | 'error'; text: string } | null = null;
  search = '';
  limit = 20;
  offset = 0;
  totalRecords = 0;

  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Bay View Residential Enclave', label: 'Bay View Residential Enclave' },
    { value: 'Central Plant Yard', label: 'Central Plant Yard' }
  ];

  formData = {
    project_id: 1,
    project_name: 'Central Plant Yard',
    verification_date: new Date().toISOString().substring(0, 10),
    location: 'Central Plant Yard',
    total_assets_registered: 5,
    total_assets_found: 5,
    condition_status: 'SATISFACTORY',
    discrepancy_notes: 'All units operational with valid maintenance certificates',
    verified_by: 'Engr. Maksudul Hasan (Audit Lead)',
    action_taken: 'No unrecorded assets or variances identified'
  };

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    this.isFormPage = path.endsWith('/new') || path.includes(':id/edit');
    this.editingId = path.includes(':id/edit') ? Number(this.route.snapshot.paramMap.get('id')) : null;
    if (this.editingId && history.state?.verification) this.formData = { ...this.formData, ...history.state.verification };
    this.notice = history.state?.assetMessage ? { type: 'success', text: history.state.assetMessage } : null;
    if (!this.isFormPage) this.loadVerifications();
  }

  loadVerifications(): void {
    this.loading = true;
    this.service.getVerifications({ search: this.search, limit: this.limit, offset: this.offset }).subscribe({
      next: (res) => {
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        this.verifications = payload?.items || (Array.isArray(payload) ? payload : []);
        this.totalRecords = payload?.total ?? this.verifications.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load physical verifications', err);
        this.notice = { type: 'error', text: err?.error?.detail || 'Could not load audit records.' };
        this.loading = false;
      }
    });
  }

  get currentPage(): number { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages(): number { return Math.ceil(this.totalRecords / this.limit); }

  openNewPage(): void {
    this.formData = { ...this.formData };
    this.router.navigate(['/fixed-assets/verification/new']);
  }

  openEditPage(item: AssetPhysicalVerification): void {
    this.formData = { ...this.formData, ...item };
    this.editingId = item.id;
    this.router.navigate(['/fixed-assets/verification', item.id, 'edit'], { state: { verification: item } });
  }

  saveVerification(): void {
    this.saving = true;
    const payload = {
      project_id: this.formData.project_id,
      project_name: this.formData.project_name,
      verification_date: this.formData.verification_date,
      location: this.formData.location,
      total_assets_registered: this.formData.total_assets_registered,
      total_assets_found: this.formData.total_assets_found,
      condition_status: this.formData.condition_status,
      discrepancy_notes: this.formData.discrepancy_notes,
      action_taken: this.formData.action_taken,
      verified_by: this.formData.verified_by,
    };
    const request = this.editingId ? this.service.updateVerification(this.editingId, payload) : this.service.createVerification(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/fixed-assets/verification'], { state: { assetMessage: this.editingId ? 'Audit updated successfully.' : 'Audit saved successfully.' } });
      },
      error: (err) => { this.saving = false; this.notice = { type: 'error', text: err?.error?.detail || 'Could not save audit.' }; }
    });
  }

  deleteVerification(id: number): void {
    if (!confirm('Delete this physical verification record?')) return;
    this.service.deleteVerification(id).subscribe({ next: () => { this.notice = { type: 'success', text: 'Verification record deleted.' }; this.loadVerifications(); }, error: (err) => this.notice = { type: 'error', text: err?.error?.detail || 'Could not delete audit.' } });
  }
}
