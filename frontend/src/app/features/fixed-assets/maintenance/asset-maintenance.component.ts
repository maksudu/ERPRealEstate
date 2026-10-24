import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FixedAssetsService, AssetMaintenance, FixedAsset } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      @if (notice) { <div class="rounded-lg border px-4 py-3 text-sm" [ngClass]="notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'">{{ notice.text }}</div> }
      @if (!isFormPage) {
      <!-- Top Summary Metrics -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Maintenance Invoiced</div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ totalCost | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Scheduled servicing & emergency repairs</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumulative Equipment Downtime</div>
          <div class="mt-2 text-2xl font-bold font-display text-rose-600 dark:text-rose-400">
            {{ totalDowntime }} Hours
          </div>
          <div class="mt-1 text-xs text-rose-500">Site productivity impact tracked</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maintenance Events Logged</div>
          <div class="mt-2 text-2xl font-bold font-display text-indigo-600 dark:text-indigo-400">
            {{ maintenances.length }}
          </div>
          <div class="mt-1 text-xs text-slate-500">All vendor service vouchers verified</div>
        </div>
      </div>

      <!-- Main Log Card -->
      <app-card title="Maintenance Expenses & Downtime Analytics" subtitle="Service log, vendor billing, parts replaced and operational downtime tracking">
        <div card-actions>
          <button
            type="button"
            (click)="openNewPage()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Record Maintenance Event
          </button>
        </div>

        <div class="mb-3 flex flex-wrap items-end gap-3"><label class="text-xs">Search<input [(ngModel)]="search" (keyup.enter)="offset = 0; loadMaintenances()" class="ml-2 rounded-lg border px-3 py-1.5" placeholder="Code, vendor, description" /></label><label class="text-xs">Rows<select [(ngModel)]="limit" (ngModelChange)="offset = 0; loadMaintenances()" class="ml-2 rounded-lg border px-2 py-1.5"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select></label><button type="button" (click)="offset = 0; loadMaintenances()" class="px-3 py-1.5 rounded-lg border text-xs">Search</button></div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Mnt. Code</th>
                <th class="p-3">Asset ID</th>
                <th class="p-3">Service Type</th>
                <th class="p-3">Vendor / Workshop</th>
                <th class="p-3">Service Date</th>
                <th class="p-3 text-right">Maintenance Cost</th>
                <th class="p-3 text-right">Downtime (Hrs)</th>
                <th class="p-3">Invoice Ref</th>
                <th class="p-3 text-center">Scheduled</th><th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="10" class="p-6 text-center text-slate-400">Loading maintenance records...</td>
                </tr>
              } @else if (maintenances.length === 0) {
                <tr>
                  <td colspan="10" class="p-6 text-center text-slate-400">No maintenance records logged.</td>
                </tr>
              } @else {
                @for (item of maintenances; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.maintenance_code }}
                    </td>
                    <td class="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      AST-{{ item.asset_id }}
                    </td>
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.service_type }}
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">{{ item.vendor_name }}</td>
                    <td class="p-3 text-slate-500">{{ item.service_date }}</td>
                    <td class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ৳ {{ item.maintenance_cost_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-mono font-bold text-rose-600">
                      {{ item.downtime_hours }}h
                    </td>
                    <td class="p-3 font-mono text-[10px] text-slate-500">{{ item.voucher_ref || 'N/A' }}</td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800">
                        {{ item.is_scheduled ? 'SCHEDULED' : 'UNSCHEDULED' }}
                      </span>
                    </td>
                    <td class="p-3 text-center whitespace-nowrap"><button type="button" (click)="openEditPage(item)" class="text-indigo-600 mr-2">Edit</button><button type="button" (click)="deleteMaintenance(item.id)" class="text-rose-600">Delete</button></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>
      <div class="flex items-center justify-between text-xs text-slate-500"><span>{{ totalRecords }} records · page {{ currentPage }} of {{ totalPages || 1 }}</span><div class="flex gap-2"><button type="button" [disabled]="offset === 0" (click)="offset = Math.max(0, offset - limit); loadMaintenances()" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" [disabled]="offset + limit >= totalRecords" (click)="offset = offset + limit; loadMaintenances()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
      }

      @if (isFormPage) { <app-card [title]="editingId ? 'Edit Maintenance Record' : 'Record Equipment Maintenance & Repair'" subtitle="Log service costs, replaced parts and equipment downtime">
        <div class="space-y-4 p-4 text-xs">
          <div>
            <app-searchable-select
              categoryCode="ASSET_LIST"
              label="Select Equipment / Asset *"
              placeholder="Search machinery..."
              [(ngModel)]="formData.asset_id"
              [options]="assetOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="MAINTENANCE_TYPE"
                label="Service Type *"
                placeholder="Select service type..."
                [(ngModel)]="formData.service_type"
                [options]="serviceTypeOptions"
                [allowCreateNew]="true"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Workshop Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.vendor_name"
                placeholder="e.g. Bangladesh Heavy Machinery Workshop"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Service Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.service_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Maintenance Cost (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.maintenance_cost_bdt"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Downtime (Hours)</label>
              <input
                type="number"
                [(ngModel)]="formData.downtime_hours"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Parts Replaced</label>
              <input
                type="text"
                [(ngModel)]="formData.parts_replaced"
                placeholder="e.g. Hydraulic seals, wire ropes..."
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor Invoice Ref</label>
              <input
                type="text"
                [(ngModel)]="formData.voucher_ref"
                placeholder="e.g. INV-BHM-2025-992"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div card-actions class="flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="router.navigate(['/fixed-assets/maintenance'])"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveMaintenance()"
            [disabled]="saving || !formData.asset_id || !formData.vendor_name || !formData.maintenance_cost_bdt"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ saving ? 'Saving...' : editingId ? 'Update Record' : 'Save Record' }}
          </button>
        </div>
      </app-card> }
    </div>
  `
})
export class AssetMaintenanceComponent implements OnInit {
  private service = inject(FixedAssetsService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  Math = Math;
  maintenances: AssetMaintenance[] = [];
  loading = false;
  isFormPage = false;
  editingId: number | null = null;
  saving = false;
  notice: { type: 'success' | 'error'; text: string } | null = null;
  search = '';
  limit = 20;
  offset = 0;
  totalRecords = 0;

  assetOptions: SelectOption[] = [];
  serviceTypeOptions: SelectOption[] = [
    { value: 'Scheduled Preventive Overhaul', label: 'Scheduled Preventive Overhaul' },
    { value: 'Emergency Breakdown Repair', label: 'Emergency Breakdown Repair' },
    { value: 'Hydraulic System Calibration', label: 'Hydraulic System Calibration' },
    { value: 'Oil & Filter Replacement', label: 'Oil & Filter Replacement' }
  ];

  formData = {
    asset_id: null as any,
    service_type: 'Scheduled Preventive Overhaul',
    vendor_name: '',
    service_date: new Date().toISOString().substring(0, 10),
    maintenance_cost_bdt: 0,
    downtime_hours: 0,
    parts_replaced: '',
    voucher_ref: '',
    description: 'Routine equipment servicing',
    meter_reading: 0,
    is_scheduled: true,
    technician_name: ''
  };

  get totalCost(): number {
    return this.maintenances.reduce((acc, curr) => acc + curr.maintenance_cost_bdt, 0);
  }

  get totalDowntime(): number {
    return this.maintenances.reduce((acc, curr) => acc + curr.downtime_hours, 0);
  }

  get currentPage(): number { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages(): number { return Math.ceil(this.totalRecords / this.limit); }

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    this.isFormPage = path.endsWith('/new') || path.includes(':id/edit');
    this.editingId = path.includes(':id/edit') ? Number(this.route.snapshot.paramMap.get('id')) : null;
    if (this.editingId && history.state?.maintenance) this.formData = { ...this.formData, ...history.state.maintenance };
    this.notice = history.state?.assetMessage ? { type: 'success', text: history.state.assetMessage } : null;
    if (!this.isFormPage) this.loadMaintenances();
    this.loadAssetOptions();
  }

  loadMaintenances(): void {
    this.loading = true;
    this.service.getMaintenances({ search: this.search, limit: this.limit, offset: this.offset }).subscribe({
      next: (res) => {
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        this.maintenances = payload?.items || (Array.isArray(payload) ? payload : []);
        this.totalRecords = payload?.total ?? this.maintenances.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load maintenances', err);
        this.notice = { type: 'error', text: err?.error?.detail || 'Could not load maintenance records.' };
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
          subLabel: `${a.project_name || 'Central'}`
        }));
      }
    });
  }

  openNewPage(): void {
    this.formData = { ...this.formData, asset_id: null };
    this.router.navigate(['/fixed-assets/maintenance/new']);
  }

  openEditPage(item: AssetMaintenance): void {
    this.formData = { ...this.formData, ...item };
    this.editingId = item.id;
    this.router.navigate(['/fixed-assets/maintenance', item.id, 'edit'], { state: { maintenance: item } });
  }

  saveMaintenance(): void {
    this.saving = true;
    const payload = {
      asset_id: Number(this.formData.asset_id),
      service_type: this.formData.service_type,
      vendor_name: this.formData.vendor_name,
      service_date: this.formData.service_date,
      maintenance_cost_bdt: this.formData.maintenance_cost_bdt,
      downtime_hours: this.formData.downtime_hours,
      description: this.formData.description || this.formData.service_type,
      meter_reading: this.formData.meter_reading,
      is_scheduled: this.formData.is_scheduled,
      parts_replaced: this.formData.parts_replaced,
      voucher_ref: this.formData.voucher_ref,
      technician_name: this.formData.technician_name
    };
    const request = this.editingId ? this.service.updateMaintenance(this.editingId, payload) : this.service.createMaintenance(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/fixed-assets/maintenance'], { state: { assetMessage: this.editingId ? 'Maintenance record updated.' : 'Maintenance record saved.' } });
      },
      error: (err) => { this.saving = false; this.notice = { type: 'error', text: err?.error?.detail || 'Could not save maintenance record.' }; }
    });
  }

  deleteMaintenance(id: number): void {
    if (!confirm('Delete this maintenance record?')) return;
    this.service.deleteMaintenance(id).subscribe({ next: () => { this.notice = { type: 'success', text: 'Maintenance record deleted.' }; this.loadMaintenances(); }, error: (err) => this.notice = { type: 'error', text: err?.error?.detail || 'Could not delete maintenance record.' } });
  }
}
