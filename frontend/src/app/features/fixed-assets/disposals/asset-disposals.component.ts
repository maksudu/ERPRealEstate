import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FixedAssetsService, AssetDisposal, FixedAsset } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-disposals',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      @if (notice) { <div class="rounded-lg border px-4 py-3 text-sm" [ngClass]="notice.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'">{{ notice.text }}</div> }
      @if (!isFormPage) {
      <!-- Summary Banner -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sale Proceeds</div>
          <div class="mt-2 text-2xl font-bold font-display text-slate-900 dark:text-slate-100">
            ৳ {{ totalProceeds | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Asset scrap & auction recoveries</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Capital Gain / (Loss)</div>
          <div
            [ngClass]="totalGainLoss >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
            class="mt-2 text-2xl font-bold font-display"
          >
            ৳ {{ totalGainLoss | number:'1.2-2' }}
          </div>
          <div class="mt-1 text-xs text-slate-500">Credited/Debited to GL Account 4500</div>
        </div>

        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disposed Units</div>
          <div class="mt-2 text-2xl font-bold font-display text-indigo-600 dark:text-indigo-400">
            {{ disposals.length }}
          </div>
          <div class="mt-1 text-xs text-slate-500">De-capitalized from sub-ledger</div>
        </div>
      </div>

      <!-- Main Disposals Card -->
      <app-card title="Asset Disposals & Gain/Loss on Sale" subtitle="Complete record of decommissioned, scrapped, and auctioned capital assets">
        <div card-actions>
          <button
            type="button"
            (click)="openNewPage()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Decommission / Dispose Asset
          </button>
        </div>
        <div class="mb-3 flex flex-wrap items-end gap-3"><label class="text-xs">Search<input [(ngModel)]="search" (keyup.enter)="offset = 0; loadDisposals()" class="ml-2 rounded-lg border px-3 py-1.5" placeholder="Reference, buyer, reason" /></label><label class="text-xs">Rows<select [(ngModel)]="limit" (ngModelChange)="offset = 0; loadDisposals()" class="ml-2 rounded-lg border px-2 py-1.5"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select></label><button type="button" (click)="offset = 0; loadDisposals()" class="px-3 py-1.5 rounded-lg border text-xs">Search</button></div>

        <!-- Table Listing -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">Disposal Ref</th>
                <th class="p-3">Asset ID</th>
                <th class="p-3">Disposal Date</th>
                <th class="p-3">Type</th>
                <th class="p-3 text-right">Original Cost</th>
                <th class="p-3 text-right">Acc. Dep.</th>
                <th class="p-3 text-right">NBV at Sale</th>
                <th class="p-3 text-right">Sale Proceeds</th>
                <th class="p-3 text-right">Gain / (Loss)</th>
                <th class="p-3">Buyer / Auctioneer</th>
                <th class="p-3">JV Ref</th><th class="p-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="12" class="p-6 text-center text-slate-400">Loading disposals...</td>
                </tr>
              } @else if (disposals.length === 0) {
                <tr>
                  <td colspan="12" class="p-6 text-center text-slate-400">No asset disposals logged.</td>
                </tr>
              } @else {
                @for (item of disposals; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {{ item.disposal_ref }}
                    </td>
                    <td class="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      AST-{{ item.asset_id }}
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">{{ item.disposal_date }}</td>
                    <td class="p-3">
                      <span class="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {{ item.disposal_type }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-medium">
                      ৳ {{ item.original_cost_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right text-amber-600 font-medium">
                      ৳ {{ item.accumulated_depreciation_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-medium">
                      ৳ {{ item.nbv_at_disposal_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      ৳ {{ item.sale_proceeds_bdt | number:'1.2-2' }}
                    </td>
                    <td
                      [ngClass]="item.gain_loss_amount_bdt >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'"
                      class="p-3 text-right"
                    >
                      ৳ {{ item.gain_loss_amount_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-slate-600 dark:text-slate-300">{{ item.buyer_name || 'N/A' }}</td>
                    <td class="p-3 font-mono text-[10px] text-indigo-600">{{ item.journal_voucher_ref || 'JV-AUTO' }}</td>
                    <td class="p-3 whitespace-nowrap"><button type="button" (click)="openEditPage(item)" class="text-indigo-600 mr-2">Edit</button><button type="button" (click)="deleteDisposal(item.id)" class="text-rose-600">Delete</button></td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>
      <div class="flex items-center justify-between text-xs text-slate-500"><span>{{ totalRecords }} records · page {{ currentPage }} of {{ totalPages || 1 }}</span><div class="flex gap-2"><button type="button" [disabled]="offset === 0" (click)="offset = Math.max(0, offset - limit); loadDisposals()" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button type="button" [disabled]="offset + limit >= totalRecords" (click)="offset = offset + limit; loadDisposals()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
      }

      @if (isFormPage) { <app-card [title]="editingId ? 'Edit Asset Disposal' : 'Decommission & Dispose Capital Asset'" subtitle="Automatic NBV and gain/loss calculation">
        <div class="space-y-4 p-4 text-xs">
          <div>
            <app-searchable-select
              categoryCode="ASSET_LIST"
              label="Select Asset to Dispose *"
              placeholder="Search active asset..."
              [(ngModel)]="formData.asset_id"
              [options]="assetOptions"
              [allowCreateNew]="false"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <app-searchable-select
                categoryCode="DISPOSAL_TYPE"
                label="Disposal Method *"
                placeholder="Method..."
                [(ngModel)]="formData.disposal_type"
                [options]="disposalTypeOptions"
                [allowCreateNew]="false"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Disposal Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.disposal_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Sale / Salvage Proceeds (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.sale_proceeds_bdt"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Buyer / Salvage Auctioneer</label>
              <input
                type="text"
                [(ngModel)]="formData.buyer_name"
                placeholder="e.g. Dhaka Scrap & Machinery Traders"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Disposal Justification & Approval Notes</label>
            <textarea
              [(ngModel)]="formData.reason"
              rows="2"
              placeholder="e.g. Fully depreciated or damaged beyond economical repair..."
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            ></textarea>
          </div>
        </div>

        <div card-actions class="flex items-center justify-end gap-2">
          <button
            type="button"
            (click)="router.navigate(['/fixed-assets/disposals'])"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveDisposal()"
            [disabled]="saving || !formData.asset_id"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            {{ saving ? 'Saving...' : editingId ? 'Update Disposal' : 'Confirm Disposal' }}
          </button>
        </div>
      </app-card> }
    </div>
  `
})
export class AssetDisposalsComponent implements OnInit {
  private service = inject(FixedAssetsService);
  private route = inject(ActivatedRoute);
  router = inject(Router);

  Math = Math;
  disposals: AssetDisposal[] = [];
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
  disposalTypeOptions: SelectOption[] = [
    { value: 'AUCTION_SALE', label: 'Commercial Auction Sale' },
    { value: 'SCRAP', label: 'Scrap Metal & Material Recycling' },
    { value: 'DONATION', label: 'Donation / CSR' },
    { value: 'WRITE_OFF', label: 'Complete Write-Off (Damage/Lost)' }
  ];

  formData = {
    asset_id: null as any,
    disposal_type: 'AUCTION_SALE',
    disposal_date: new Date().toISOString().substring(0, 10),
    sale_proceeds_bdt: 0,
    buyer_name: '',
    reason: 'End of project lifecycle equipment replacement',
    approved_by: 'Managing Director'
  };

  get totalProceeds(): number {
    return this.disposals.reduce((acc, curr) => acc + curr.sale_proceeds_bdt, 0);
  }

  get totalGainLoss(): number {
    return this.disposals.reduce((acc, curr) => acc + curr.gain_loss_amount_bdt, 0);
  }

  ngOnInit(): void {
    const path = this.route.snapshot.routeConfig?.path || '';
    this.isFormPage = path.endsWith('/new') || path.includes(':id/edit');
    this.editingId = path.includes(':id/edit') ? Number(this.route.snapshot.paramMap.get('id')) : null;
    if (this.editingId && history.state?.disposal) this.formData = { ...this.formData, ...history.state.disposal };
    this.notice = history.state?.assetMessage ? { type: 'success', text: history.state.assetMessage } : null;
    if (!this.isFormPage) this.loadDisposals();
    this.loadAssetOptions();
  }

  loadDisposals(): void {
    this.loading = true;
    this.service.getDisposals({ search: this.search, limit: this.limit, offset: this.offset }).subscribe({
      next: (res) => {
        const payload = (res as any)?.data?.data ?? (res as any)?.data ?? res;
        this.disposals = payload?.items || (Array.isArray(payload) ? payload : []);
        this.totalRecords = payload?.total ?? this.disposals.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load disposals', err);
        this.notice = { type: 'error', text: err?.error?.detail || 'Could not load disposal records.' };
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
          subLabel: `NBV: ৳ ${a.net_book_value_bdt}`
        }));
      }
    });
  }

  get currentPage(): number { return Math.floor(this.offset / this.limit) + 1; }
  get totalPages(): number { return Math.ceil(this.totalRecords / this.limit); }

  openNewPage(): void {
    this.formData = { ...this.formData, asset_id: null };
    this.router.navigate(['/fixed-assets/disposals/new']);
  }

  openEditPage(item: AssetDisposal): void {
    this.formData = {
      ...this.formData,
      ...item,
      buyer_name: item.buyer_name || '',
      reason: item.reason || '',
      approved_by: item.approved_by || ''
    };
    this.editingId = item.id;
    this.router.navigate(['/fixed-assets/disposals', item.id, 'edit'], { state: { disposal: item } });
  }

  saveDisposal(): void {
    this.saving = true;
    const payload = {
      asset_id: Number(this.formData.asset_id),
      disposal_type: this.formData.disposal_type,
      disposal_date: this.formData.disposal_date,
      sale_proceeds_bdt: this.formData.sale_proceeds_bdt,
      buyer_name: this.formData.buyer_name,
      reason: this.formData.reason,
      approved_by: this.formData.approved_by
    };
    const request = this.editingId ? this.service.updateDisposal(this.editingId, payload) : this.service.createDisposal(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/fixed-assets/disposals'], { state: { assetMessage: this.editingId ? 'Disposal updated.' : 'Asset disposal saved.' } });
      },
      error: (err) => { this.saving = false; this.notice = { type: 'error', text: err?.error?.detail || 'Could not save disposal.' }; }
    });
  }

  deleteDisposal(id: number): void {
    if (!confirm('Delete this disposal record?')) return;
    this.service.deleteDisposal(id).subscribe({ next: () => { this.notice = { type: 'success', text: 'Disposal deleted; asset returned to ACTIVE status.' }; this.loadDisposals(); }, error: (err) => this.notice = { type: 'error', text: err?.error?.detail || 'Could not delete disposal.' } });
  }
}
