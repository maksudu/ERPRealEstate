import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteSafety } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-safety',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-site-nav activeTab="safety"></app-mobile-site-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">HSE & Safety Management</h1>
          <p class="text-sm text-slate-500 mt-1">Site incidents, toolbox meetings, PPE compliance and hazard tracking</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Report Incident / Safety Log
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search title, location, reporter..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500">
        </div>
        <select [(ngModel)]="severityFilter" (change)="onSeverityChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500">
          <option value="">All Severities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
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
                <th class="px-6 py-4">Incident / Topic</th>
                <th class="px-6 py-4">Type</th>
                <th class="px-6 py-4">Severity</th>
                <th class="px-6 py-4">Location</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4">Incident Date</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.title }}</div>
                  <div class="text-xs text-slate-400 font-mono">{{ row.reported_by }}</div>
                </td>
                <td class="px-6 py-4">
                  <span class="font-medium text-slate-800">{{ row.incident_type }}</span>
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-slate-100 text-slate-700 border-slate-200': row.severity === 'Low',
                    'bg-amber-50 text-amber-700 border-amber-200': row.severity === 'Medium',
                    'bg-orange-50 text-orange-700 border-orange-200': row.severity === 'High',
                    'bg-rose-50 text-rose-700 border-rose-200': row.severity === 'Critical'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.severity }}
                  </span>
                </td>
                <td class="px-6 py-4 text-slate-600">{{ row.location || 'Site Wide' }}</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.status === 'Resolved' || row.status === 'Closed',
                    'bg-rose-50 text-rose-700 border-rose-200': row.status === 'Open',
                    'bg-amber-50 text-amber-700 border-amber-200': row.status === 'Under Investigation'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-xs font-mono text-slate-500">{{ row.incident_date }}</td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-2">
                    <button (click)="openEditModal(row)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button (click)="deleteItem(row.id!)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="7" class="px-6 py-12 text-center text-slate-400">No safety records or incidents reported</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Safety Incident' : 'Report Safety Incident / Log'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-700 mb-1">Incident / Safety Title *</label>
              <input type="text" [(ngModel)]="formData.title" name="title" required placeholder="e.g. Scaffolding harness violation / Minor cut on hand" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Incident Type</label>
              <select [(ngModel)]="formData.incident_type" name="incident_type" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
                <option value="Near Miss">Near Miss</option>
                <option value="First Aid Case">First Aid Case</option>
                <option value="Unsafe Act/Condition">Unsafe Act/Condition</option>
                <option value="Toolbox Meeting">Toolbox Meeting</option>
                <option value="Medical Treatment">Medical Treatment</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
              <select [(ngModel)]="formData.severity" name="severity" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Location</label>
              <input type="text" [(ngModel)]="formData.location" name="location" placeholder="e.g. Basement 1 / Tower 2 Roof" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reported By</label>
              <input type="text" [(ngModel)]="formData.reported_by" name="reported_by" placeholder="Safety Officer name" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select [(ngModel)]="formData.status" name="status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
                <option value="Open">Open</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Incident Date</label>
              <input type="date" [(ngModel)]="formData.incident_date" name="incident_date" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Incident Description</label>
            <textarea [(ngModel)]="formData.description" name="description" rows="2" placeholder="Details of what happened..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"></textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Corrective Action Taken</label>
            <textarea [(ngModel)]="formData.corrective_action" name="corrective_action" rows="2" placeholder="PPE enforcement, caution tape placed, briefing given..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl">Save Safety Log</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileSiteSafetyComponent implements OnInit {
  items: MobileSiteSafety[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  severityFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MobileSiteSafety> = {};

  constructor(private siteService: MobileSiteService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.siteService.getSafetyList({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      severity: this.severityFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
  }

  onSeverityChange() {
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
      incident_type: 'Near Miss',
      title: '',
      severity: 'Medium',
      location: '',
      reported_by: 'Safety Engr. Maksudul',
      status: 'Open',
      incident_date: new Date().toISOString().split('T')[0]
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MobileSiteSafety) {
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
      this.siteService.updateSafety(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.siteService.createSafety(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Are you sure you want to delete this safety record?')) {
      this.siteService.deleteSafety(id).subscribe(() => this.loadData());
    }
  }
}
