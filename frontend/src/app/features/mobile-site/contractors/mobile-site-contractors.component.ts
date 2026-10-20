import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteContractor } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-contractors',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-site-nav activeTab="contractors"></app-mobile-site-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Contractor Management</h1>
          <p class="text-sm text-slate-500 mt-1">Work progress, measurement sheets, bill certification and approvals</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Contractor Measurement
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search contractor, trade, work scope..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        </div>
        <select [(ngModel)]="billStatusFilter" (change)="onBillStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">All Bill Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Verified">Verified</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Total: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Contractor / Trade</th>
                <th class="px-6 py-4">Work Scope</th>
                <th class="px-6 py-4">Measured Qty</th>
                <th class="px-6 py-4">Certified Amount</th>
                <th class="px-6 py-4">Bill Status</th>
                <th class="px-6 py-4">Measurement Date</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.contractor_name }}</div>
                  <div class="text-xs text-indigo-600 font-semibold">{{ row.trade_type }}</div>
                </td>
                <td class="px-6 py-4 text-slate-700 max-w-xs truncate">{{ row.work_scope }}</td>
                <td class="px-6 py-4 font-mono font-medium text-slate-900">
                  {{ row.measured_qty }} {{ row.unit }}
                </td>
                <td class="px-6 py-4 font-mono font-semibold text-emerald-600">
                  ৳ {{ row.certified_amount | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-slate-100 text-slate-700 border-slate-200': row.bill_status === 'Draft',
                    'bg-amber-50 text-amber-700 border-amber-200': row.bill_status === 'Verified',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.bill_status === 'Approved' || row.bill_status === 'Paid'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.bill_status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs font-mono text-slate-500">{{ row.measurement_date }}</td>
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
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No contractor measurement sheets recorded</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Contractor Record' : 'Record Contractor Measurement'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Contractor Name *</label>
              <input type="text" [(ngModel)]="formData.contractor_name" name="contractor_name" required placeholder="e.g. Unique Engineering & Builders" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Trade / Subcontract Type *</label>
              <input type="text" [(ngModel)]="formData.trade_type" name="trade_type" required placeholder="e.g. Civil RCC Works, Electrical, Plumbing" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Work Scope *</label>
              <input type="text" [(ngModel)]="formData.work_scope" name="work_scope" required placeholder="e.g. 5th floor beam and slab casting shuttering and rebar" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Measured Quantity</label>
              <input type="number" step="0.01" [(ngModel)]="formData.measured_qty" name="measured_qty" placeholder="e.g. 1500" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
              <input type="text" [(ngModel)]="formData.unit" name="unit" placeholder="sft, rft, cft, etc." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Certified Bill Amount (BDT)</label>
              <input type="number" step="0.01" [(ngModel)]="formData.certified_amount" name="certified_amount" placeholder="e.g. 250000" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Bill Status</label>
              <select [(ngModel)]="formData.bill_status" name="bill_status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
                <option value="Draft">Draft</option>
                <option value="Verified">Verified</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Measurement Date</label>
              <input type="date" [(ngModel)]="formData.measurement_date" name="measurement_date" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Site Engineer Notes</label>
            <textarea [(ngModel)]="formData.notes" name="notes" rows="2" placeholder="Deductions, retention or quality remarks..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl">Save Contractor Record</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileSiteContractorsComponent implements OnInit {
  items: MobileSiteContractor[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  billStatusFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MobileSiteContractor> = {};

  constructor(private siteService: MobileSiteService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.siteService.getContractorList({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      bill_status: this.billStatusFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
  }

  onBillStatusChange() {
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
      project_id: 1,
      contractor_name: '',
      trade_type: '',
      work_scope: '',
      measured_qty: 0,
      unit: 'sft',
      certified_amount: 0,
      bill_status: 'Draft',
      measurement_date: new Date().toISOString().split('T')[0]
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MobileSiteContractor) {
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
      this.siteService.updateContractor(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.siteService.createContractor(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this contractor measurement sheet?')) {
      this.siteService.deleteContractor(id).subscribe(() => this.loadData());
    }
  }
}
