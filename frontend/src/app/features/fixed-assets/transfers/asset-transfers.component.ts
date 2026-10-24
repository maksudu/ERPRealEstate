import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FixedAssetsService, AssetTransfer, FixedAsset } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-transfers',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      @if (notice) { <div class="rounded-lg border px-4 py-3 text-sm" [ngClass]="notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'">{{ notice.text }}</div> }
      @if (!isFormPage) {
      <app-card title="Inter-Site Asset Transfer History" subtitle="Track real estate equipment, plant, and machinery movement across project sites">
        <div card-actions>
          <button
            type="button"
            (click)="openNewPage()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Initiate Asset Transfer
          </button>
        </div>

        <div class="mb-3 flex flex-wrap items-end gap-3">
          <label class="text-xs">Search transfers
            <input [(ngModel)]="search" (keyup.enter)="offset = 0; loadTransfers()" class="ml-2 rounded-lg border px-3 py-1.5" placeholder="Reference, site, location" />
          </label>
          <label class="text-xs">Rows
            <select [(ngModel)]="limit" (ngModelChange)="offset = 0; loadTransfers()" class="ml-2 rounded-lg border px-2 py-1.5"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select>
          </label>
          <button type="button" (click)="offset = 0; loadTransfers()" class="px-3 py-1.5 rounded-lg border text-xs">Search</button>
        </div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Transfer Ref</th>
                <th class="p-3">Asset ID</th>
                <th class="p-3">Origin (From)</th>
                <th class="p-3">Destination (To)</th>
                <th class="p-3">Transfer Date</th>
                <th class="p-3">Reason</th>
                <th class="p-3">Authorizer</th>
                <th class="p-3 text-center">Status</th><th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">Loading transfer history...</td>
                </tr>
              } @else if (transfers.length === 0) {
                <tr>
                  <td colspan="9" class="p-6 text-center text-slate-400">No asset transfer records found.</td>
                </tr>
              } @else {
                @for (item of transfers; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.transfer_ref }}
                    </td>
                    <td class="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      AST-{{ item.asset_id }}
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.from_project_name || 'Central Yard' }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.from_location || 'Dhaka Yard' }}</div>
                    </td>
                    <td class="p-3">
                      <div class="font-semibold text-emerald-600 dark:text-emerald-400">{{ item.to_project_name }}</div>
                      <div class="text-[10px] text-slate-400">{{ item.to_location }}</div>
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">{{ item.transfer_date }}</td>
                    <td class="p-3 max-w-[200px] truncate text-slate-500">{{ item.reason || 'Project Site Deployment' }}</td>
                    <td class="p-3 text-[11px]">{{ item.transferred_by || 'Plant Engineer' }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        {{ item.status }}
                      </span>
                    </td>
                    <td class="p-3 text-center whitespace-nowrap"><button type="button" (click)="openEditPage(item)" class="text-indigo-600 mr-2">Edit</button><button type="button" (click)="deleteTransfer(item.id)" class="text-rose-600">Delete</button></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        <div class="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{{ totalRecords }} transfers · page {{ currentPage }} of {{ totalPages || 1 }}</span><div class="flex gap-2"><button type="button" [disabled]="offset === 0" (click)="offset = Math.max(0, offset - limit); loadTransfers()" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" [disabled]="offset + limit >= totalRecords" (click)="offset = offset + limit; loadTransfers()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
      </app-card>
      }

      @if (isFormPage) { <app-card [title]="editingId ? 'Edit Asset Transfer' : 'Initiate Inter-Project Asset Transfer'" subtitle="Relocate equipment to another construction site">
        <div class="space-y-4 p-4 text-xs">
          <div>
            <app-searchable-select
              categoryCode="ASSET_LIST"
              label="Select Asset to Transfer *"
              placeholder="Search active asset..."
              [(ngModel)]="formData.asset_id"
              [options]="assetOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="PROJECT_LOCATION"
                label="Destination Project Site *"
                placeholder="Select project..."
                [(ngModel)]="formData.to_project_name"
                [options]="projectOptions"
                [allowCreateNew]="true"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Destination Location / Yard *</label>
              <input
                type="text"
                [(ngModel)]="formData.to_location"
                placeholder="e.g. Tower A Basework"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Transfer Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.transfer_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Authorizing Engineer / Custodian</label>
              <input
                type="text"
                [(ngModel)]="formData.transferred_by"
                placeholder="e.g. Engr. Tanvir Ahmed"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Transfer Reason / Work Order</label>
            <textarea
              [(ngModel)]="formData.reason"
              rows="2"
              placeholder="e.g. Relocated for superstructure casting at Tower B..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            ></textarea>
          </div>
        </div>

        <div card-actions class="flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="router.navigate(['/fixed-assets/transfers'])"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveTransfer()"
            [disabled]="saving || !formData.asset_id || !formData.to_location"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ saving ? 'Saving...' : editingId ? 'Update Transfer' : 'Confirm Transfer' }}
          </button>
        </div>
      </app-card> }
    </div>
  `
})
export class AssetTransfersComponent implements OnInit {
  private service = inject(FixedAssetsService);

  transfers: AssetTransfer[] = [];
  loading = false;
  isModalOpen = false;

  assetOptions: SelectOption[] = [];
  projectOptions: SelectOption[] = [
    { value: 'Ocean Heights Luxury Tower', label: 'Ocean Heights Luxury Tower' },
    { value: 'BlueOceans Commercial Plaza', label: 'BlueOceans Commercial Plaza' },
    { value: 'Bay View Residential Enclave', label: 'Bay View Residential Enclave' },
    { value: 'Central Plant Yard', label: 'Central Plant Yard' }
  ];

  formData = {
    asset_id: null as any,
    to_project_id: 1,
    to_project_name: 'BlueOceans Commercial Plaza',
    to_location: 'Tower A Site',
    transfer_date: new Date().toISOString().substring(0, 10),
    transferred_by: 'Plant Operations Manager',
    reason: 'Heavy casting requirement'
  };

  ngOnInit(): void {
    this.loadTransfers();
    this.loadAssetOptions();
  }

  loadTransfers(): void {
    this.loading = true;
    this.service.getTransfers().subscribe({
      next: (res) => {
        this.transfers = res.items;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load transfers', err);
        this.loading = false;
      }
    });
  }

  loadAssetOptions(): void {
    this.service.getAssets({ limit: 100 }).subscribe({
      next: (res) => {
        this.assetOptions = res.items.map(a => ({
          value: a.id,
          label: `${a.asset_tag} - ${a.asset_name}`,
          subLabel: `${a.project_name || 'Central'} (${a.category})`
        }));
      }
    });
  }

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveTransfer(): void {
    this.service.createTransfer({
      asset_id: Number(this.formData.asset_id),
      to_project_id: 2,
      to_project_name: this.formData.to_project_name,
      to_location: this.formData.to_location,
      transfer_date: this.formData.transfer_date,
      transferred_by: this.formData.transferred_by,
      reason: this.formData.reason
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadTransfers();
      },
      error: (err) => console.error('Failed to create transfer', err)
    });
  }
}
