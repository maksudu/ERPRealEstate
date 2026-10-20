import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetsService, AssetPhysicalVerification } from '../../../core/services/fixed-assets.service';
import { FixedAssetsNavComponent } from '../fixed-assets-nav/fixed-assets-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, FixedAssetsNavComponent, CardContainerComponent, ModalComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <app-fixed-assets-nav />

      <app-card title="Physical Asset Verification & Audit Log" subtitle="Reconcile physical on-site machinery and tools against registry for discrepancy identification">
        <div card-actions>
          <button
            type="button"
            (click)="openModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Log Physical Audit
          </button>
        </div>

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
                <th class="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">Loading audit records...</td>
                </tr>
              } @else if (verifications.length === 0) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">No physical audit records found.</td>
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
                    <td class="p-3 text-slate-500">{{ item.audit_date }}</td>
                    <td class="p-3 text-center font-mono font-medium">{{ item.total_assets_registered }}</td>
                    <td class="p-3 text-center font-mono font-medium text-emerald-600">{{ item.total_assets_found }}</td>
                    <td
                      [ngClass]="item.discrepancy_qty === 0 ? 'text-emerald-600' : 'text-rose-600 font-bold'"
                      class="p-3 text-center font-mono"
                    >
                      {{ item.discrepancy_qty === 0 ? '0 (None)' : item.discrepancy_qty + ' Missing' }}
                    </td>
                    <td class="p-3 max-w-[200px] truncate text-slate-600 dark:text-slate-300">
                      {{ item.condition_summary || 'Good working condition' }}
                    </td>
                    <td class="p-3 text-[11px]">{{ item.verified_by || 'Internal Audit' }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        {{ item.status }}
                      </span>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- Log Audit Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Record Physical Asset Verification Audit"
        subtitle="On-site tag scanning and physical inspection of machinery and fleet"
        badge="Internal Audit"
        size="lg"
        (close)="closeModal()"
      >
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
                [(ngModel)]="formData.audit_date"
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
              [(ngModel)]="formData.condition_summary"
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
                [(ngModel)]="formData.remarks"
                placeholder="e.g. 100% physically barcode verified"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
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
            (click)="saveVerification()"
            [disabled]="!formData.project_name"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Submit Audit
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class AssetVerificationComponent implements OnInit {
  private service = inject(FixedAssetsService);

  verifications: AssetPhysicalVerification[] = [];
  loading = false;
  isModalOpen = false;

  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Bay View Residential Enclave', label: 'Bay View Residential Enclave' },
    { value: 'Central Plant Yard', label: 'Central Plant Yard' }
  ];

  formData = {
    project_id: 1,
    project_name: 'Central Plant Yard',
    audit_date: new Date().toISOString().substring(0, 10),
    total_assets_registered: 5,
    total_assets_found: 5,
    condition_summary: 'All units operational with valid maintenance certificates',
    verified_by: 'Engr. Maksudul Hasan (Audit Lead)',
    remarks: 'No unrecorded assets or variances identified'
  };

  ngOnInit(): void {
    this.loadVerifications();
  }

  loadVerifications(): void {
    this.loading = true;
    this.service.getVerifications().subscribe({
      next: (data) => {
        this.verifications = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load physical verifications', err);
        this.loading = false;
      }
    });
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveVerification(): void {
    this.service.createVerification({
      project_id: this.formData.project_id,
      project_name: this.formData.project_name,
      audit_date: this.formData.audit_date,
      total_assets_registered: this.formData.total_assets_registered,
      total_assets_found: this.formData.total_assets_found,
      condition_summary: this.formData.condition_summary,
      verified_by: this.formData.verified_by,
      remarks: this.formData.remarks
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadVerifications();
      },
      error: (err) => console.error('Failed to save verification', err)
    });
  }
}
