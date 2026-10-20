import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteOfflineSync } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-offline-sync',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-site-nav activeTab="offline-sync"></app-mobile-site-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Offline Queue & Synchronization</h1>
          <p class="text-sm text-slate-500 mt-1">Automatic sync engine for offline field reports, photos and material slips</p>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="syncAll()" [disabled]="isSyncing" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-5 h-5" [ngClass]="{'animate-spin': isSyncing}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ isSyncing ? 'Synchronizing...' : 'Sync All Pending Queue' }}
          </button>
          <button (click)="openAddModal()" class="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Queue Manual Entry
          </button>
        </div>
      </div>

      <!-- Sync Status Card -->
      <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sync State</div>
            <div class="text-lg font-bold text-slate-800">Online & Ready</div>
          </div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Batches</div>
            <div class="text-lg font-bold text-slate-800">{{ pendingCount }} Items</div>
          </div>
        </div>
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Local Storage Storage</div>
            <div class="text-lg font-bold text-slate-800">IndexedDB Active</div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">All Sync Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Synced">Synced</option>
          <option value="Failed">Failed</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Total Queue: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Client ID / Entity</th>
                <th class="px-6 py-4">Action</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Payload Snapshot</th>
                <th class="px-6 py-4">Sync Timestamp</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.entity_name }}</div>
                  <div class="text-xs text-slate-400 font-mono">{{ row.client_generated_id }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {{ row.action }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-amber-50 text-amber-700 border-amber-200': row.sync_status === 'Pending',
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.sync_status === 'Synced',
                    'bg-rose-50 text-rose-700 border-rose-200': row.sync_status === 'Failed'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.sync_status }}
                  </span>
                </td>
                <td class="px-6 py-4 max-w-xs truncate text-xs font-mono text-slate-500">
                  {{ row.payload_json }}
                </td>
                <td class="px-6 py-4 text-xs font-mono text-slate-500">
                  {{ row.synced_at || 'Pending trigger' }}
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button *ngIf="row.sync_status !== 'Synced'" (click)="syncSingle(row.id!)" class="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
                      Sync Now
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="6" class="px-6 py-12 text-center text-slate-400">Offline queue is empty. All items are synchronized.</td>
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

      <!-- Add Modal (NO static add form beneath table) -->
      <app-modal [isOpen]="isModalOpen" title="Queue Offline Item Manually" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Entity Name *</label>
              <select [(ngModel)]="formData.entity_name" name="entity_name" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="daily_progress">Daily Progress Report</option>
                <option value="material_requisition">Material Requisition</option>
                <option value="task_update">Task Progress Update</option>
                <option value="photo_doc">Photo Documentation</option>
                <option value="safety_incident">Safety Incident</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Action</label>
              <select [(ngModel)]="formData.action" name="action" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Payload JSON *</label>
            <textarea [(ngModel)]="formData.payload_json" name="payload_json" rows="4" required placeholder="Raw JSON offline data..." class="w-full font-mono text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl">Queue Item</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileSiteOfflineSyncComponent implements OnInit {
  items: MobileSiteOfflineSync[] = [];
  totalCount = 0;
  pendingCount = 0;
  limit = 10;
  offset = 0;
  statusFilter = '';
  isSyncing = false;

  isModalOpen = false;
  formData: Partial<MobileSiteOfflineSync> = {};

  constructor(private siteService: MobileSiteService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.siteService.getOfflineQueue({
      limit: this.limit,
      offset: this.offset,
      sync_status: this.statusFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
      this.pendingCount = this.items.filter(i => i.sync_status === 'Pending').length;
    });
  }

  onStatusChange() {
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

  syncAll() {
    this.isSyncing = true;
    setTimeout(() => {
      this.items.forEach(item => {
        if (item.sync_status === 'Pending') {
          this.siteService.updateOfflineItem(item.id!, {
            sync_status: 'Synced',
            synced_at: new Date().toISOString()
          }).subscribe();
        }
      });
      setTimeout(() => {
        this.isSyncing = false;
        this.loadData();
      }, 600);
    }, 800);
  }

  syncSingle(id: number) {
    this.siteService.updateOfflineItem(id, {
      sync_status: 'Synced',
      synced_at: new Date().toISOString()
    }).subscribe(() => this.loadData());
  }

  openAddModal() {
    this.formData = {
      client_generated_id: 'OFFLINE-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      entity_name: 'daily_progress',
      action: 'CREATE',
      payload_json: JSON.stringify({ project_id: 1, date: new Date().toISOString().split('T')[0], labour: 35, work: 'Plastering complete' }, null, 2),
      sync_status: 'Pending'
    };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  saveItem() {
    this.siteService.queueOfflineItem(this.formData).subscribe(() => {
      this.closeModal();
      this.loadData();
    });
  }

  deleteItem(id: number) {
    if (confirm('Delete this offline queue item?')) {
      this.siteService.deleteOfflineItem(id).subscribe(() => this.loadData());
    }
  }
}
