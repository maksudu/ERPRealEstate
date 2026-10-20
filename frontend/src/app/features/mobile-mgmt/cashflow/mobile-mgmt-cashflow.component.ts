import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtService, MgmtCashFlowItem } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-mgmt-cashflow',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="cashflow"></app-mobile-mgmt-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Executive Cash Flow Monitoring</h1>
          <p class="text-sm text-slate-500 mt-1">Cash runway projection, customer receivables vs vendor payables & liquidity position</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Monthly Projection
        </button>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Fiscal Period / Month</th>
                <th class="px-6 py-4">Receivables Due (BDT)</th>
                <th class="px-6 py-4">Payables Due (BDT)</th>
                <th class="px-6 py-4">Net Cash Position</th>
                <th class="px-6 py-4">Projected Collections</th>
                <th class="px-6 py-4">Surplus / (Deficit)</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-900">{{ row.period_month }}</td>
                <td class="px-6 py-4 font-mono font-medium text-slate-900">
                  ৳ {{ row.receivables_due | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-medium text-rose-600">
                  ৳ {{ row.payables_due | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-bold text-slate-900">
                  ৳ {{ row.net_cash_position | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-medium text-indigo-600">
                  ৳ {{ row.projected_collections | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-bold" [ngClass]="row.actual_surplus_deficit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                  ৳ {{ row.actual_surplus_deficit | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openEditModal(row)" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No cash flow projections found</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span class="text-xs text-slate-500">
            Showing {{ offset + 1 }} to {{ getEndIndex() }} of {{ totalCount }} records
          </span>
          <div class="flex items-center gap-2">
            <button [disabled]="offset === 0" (click)="prevPage()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold rounded-lg text-slate-700">Prev</button>
            <button [disabled]="offset + limit >= totalCount" (click)="nextPage()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-semibold rounded-lg text-slate-700">Next</button>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal (NO static add form beneath table) -->
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Cash Flow Forecast' : 'Record Monthly Cash Flow Forecast'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Period Month *</label>
              <input type="text" [(ngModel)]="formData.period_month" name="period_month" required placeholder="e.g. November 2026" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Receivables Due (BDT)</label>
              <input type="number" [(ngModel)]="formData.receivables_due" name="receivables_due" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Payables Due (BDT)</label>
              <input type="number" [(ngModel)]="formData.payables_due" name="payables_due" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Net Cash Position (BDT)</label>
              <input type="number" [(ngModel)]="formData.net_cash_position" name="net_cash_position" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Projected Collections (BDT)</label>
              <input type="number" [(ngModel)]="formData.projected_collections" name="projected_collections" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estimated Surplus / (Deficit)</label>
              <input type="number" [(ngModel)]="formData.actual_surplus_deficit" name="actual_surplus_deficit" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Save Forecast</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtCashFlowComponent implements OnInit {
  items: MgmtCashFlowItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MgmtCashFlowItem> = {};

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mgmtService.getCashFlows({
      limit: this.limit,
      offset: this.offset
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  prevPage() {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadData();
    }
  }

  nextPage() {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadData();
    }
  }

  getEndIndex(): number {
    return Math.min(this.offset + this.limit, this.totalCount);
  }

  openAddModal() {
    this.editingId = null;
    this.formData = {
      period_month: '',
      receivables_due: 0,
      payables_due: 0,
      net_cash_position: 0,
      projected_collections: 0,
      actual_surplus_deficit: 0
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MgmtCashFlowItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.editingId) {
      this.mgmtService.updateCashFlow(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.mgmtService.createCashFlow(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this cash flow projection?')) {
      this.mgmtService.deleteCashFlow(id).subscribe(() => this.loadData());
    }
  }
}
