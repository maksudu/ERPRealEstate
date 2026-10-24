import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetsService, AssetDisposal, FixedAsset } from '../../../core/services/fixed-assets.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-asset-disposals',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, ModalComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
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
            (click)="openModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition"
          >
            <span>+</span> Decommission / Dispose Asset
          </button>
        </div>

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
                <th class="p-3">JV Ref</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="11" class="p-6 text-center text-slate-400">Loading disposals...</td>
                </tr>
              } @else if (disposals.length === 0) {
                <tr>
                  <td colspan="11" class="p-6 text-center text-slate-400">No asset disposals logged.</td>
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
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </app-card>

      <!-- Decommission Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Decommission & Dispose Capital Asset"
        subtitle="Automatic calculation of Net Book Value vs Proceeds for Capital Gain/Loss"
        badge="Asset Retirement"
        size="lg"
        (close)="closeModal()"
      >
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
            (click)="saveDisposal()"
            [disabled]="!formData.asset_id"
            class="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Confirm Disposal
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class AssetDisposalsComponent implements OnInit {
  private service = inject(FixedAssetsService);

  disposals: AssetDisposal[] = [];
  loading = false;
  isModalOpen = false;

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
    this.loadDisposals();
    this.loadAssetOptions();
  }

  loadDisposals(): void {
    this.loading = true;
    this.service.getDisposals().subscribe({
      next: (data) => {
        this.disposals = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load disposals', err);
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

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveDisposal(): void {
    this.service.createDisposal({
      asset_id: Number(this.formData.asset_id),
      disposal_type: this.formData.disposal_type,
      disposal_date: this.formData.disposal_date,
      sale_proceeds_bdt: this.formData.sale_proceeds_bdt,
      buyer_name: this.formData.buyer_name,
      reason: this.formData.reason,
      approved_by: this.formData.approved_by
    }).subscribe({
      next: () => {
        this.closeModal();
        this.loadDisposals();
      },
      error: (err) => console.error('Failed to create disposal', err)
    });
  }
}
