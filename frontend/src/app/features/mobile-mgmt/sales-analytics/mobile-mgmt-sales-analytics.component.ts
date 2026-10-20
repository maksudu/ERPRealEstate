import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtService, MgmtSalesAnalyticsItem } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-mgmt-sales-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="sales-analytics"></app-mobile-mgmt-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Sales Analytics & Portfolio Velocity</h1>
          <p class="text-sm text-slate-500 mt-1">Booked units, remaining inventory, sales target realizations & average SqFt pricing</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Project Target
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search project name..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
        </div>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Active Projects: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Project Title</th>
                <th class="px-6 py-4">Inventory (Sold / Total)</th>
                <th class="px-6 py-4">Conversion Rate</th>
                <th class="px-6 py-4">Sales Target (BDT)</th>
                <th class="px-6 py-4">Actual Realized (BDT)</th>
                <th class="px-6 py-4">Avg Rate / SqFt</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-900">{{ row.project_name }}</td>
                <td class="px-6 py-4 font-mono">
                  <span class="font-bold text-slate-900">{{ row.booked_units }}</span>
                  <span class="text-slate-400"> / {{ row.total_units }} units</span>
                  <div class="text-xs text-amber-600 font-semibold">{{ row.available_units }} units available</div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs font-mono text-emerald-600">{{ row.conversion_rate_percentage }}%</span>
                    <div class="w-20 bg-slate-100 rounded-full h-2">
                      <div class="bg-emerald-500 h-2 rounded-full" [style.width.%]="row.conversion_rate_percentage"></div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 font-mono font-medium text-slate-700">
                  ৳ {{ (row.sales_target / 10000000) | number:'1.2-2' }} Cr
                </td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">
                  ৳ {{ (row.actual_sales / 10000000) | number:'1.2-2' }} Cr
                </td>
                <td class="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
                  ৳ {{ row.average_price_per_sqft | number:'1.0-0' }} /sft
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
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No sales analytics data found</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Sales Analytics' : 'Record Project Sales Target'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Total Project Units</label>
              <input type="number" [(ngModel)]="formData.total_units" name="total_units" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Booked Units</label>
              <input type="number" [(ngModel)]="formData.booked_units" name="booked_units" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Available Units</label>
              <input type="number" [(ngModel)]="formData.available_units" name="available_units" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Sales Target (BDT)</label>
              <input type="number" [(ngModel)]="formData.sales_target" name="sales_target" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Actual Realized Sales (BDT)</label>
              <input type="number" [(ngModel)]="formData.actual_sales" name="actual_sales" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Average Price / SqFt (BDT)</label>
              <input type="number" [(ngModel)]="formData.average_price_per_sqft" name="average_price_per_sqft" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Save Target</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtSalesAnalyticsComponent implements OnInit {
  items: MgmtSalesAnalyticsItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MgmtSalesAnalyticsItem> = {};

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mgmtService.getSalesAnalytics({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
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
      project_name: '',
      total_units: 50,
      booked_units: 0,
      available_units: 50,
      sales_target: 0,
      actual_sales: 0,
      conversion_rate_percentage: 0,
      average_price_per_sqft: 12000
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MgmtSalesAnalyticsItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.formData.total_units && this.formData.booked_units !== undefined) {
      this.formData.available_units = Math.max(0, this.formData.total_units - this.formData.booked_units);
      this.formData.conversion_rate_percentage = Math.round((this.formData.booked_units / this.formData.total_units) * 100);
    }
    if (this.editingId) {
      this.mgmtService.updateSalesAnalytics(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.mgmtService.createSalesAnalytics(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this sales analytics record?')) {
      this.mgmtService.deleteSalesAnalytics(id).subscribe(() => this.loadData());
    }
  }
}
