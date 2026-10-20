import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtService, MgmtConstructionItem } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-mgmt-construction',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="construction"></app-mobile-mgmt-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Construction Monitoring & Critical Path</h1>
          <p class="text-sm text-slate-500 mt-1">Milestone deadlines, delay days analysis, subcontractor scorecards & site bottlenecks</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Record Critical Milestone
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search milestone, project, contractor..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
        </div>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">All Milestone Statuses</option>
          <option value="ON_TRACK">ON_TRACK</option>
          <option value="AT_RISK">AT_RISK</option>
          <option value="DELAYED">DELAYED</option>
        </select>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Monitored Milestones: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Milestone Code</th>
                <th class="px-6 py-4">Project & Milestone</th>
                <th class="px-6 py-4">Target Date</th>
                <th class="px-6 py-4">Delay Days</th>
                <th class="px-6 py-4">Contractor</th>
                <th class="px-6 py-4">Score</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <span class="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border">
                    {{ row.milestone_code }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.milestone_name }}</div>
                  <div class="text-xs text-slate-400 font-medium">{{ row.project_name }}</div>
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">{{ row.target_completion_date }}</td>
                <td class="px-6 py-4 font-mono font-bold" [ngClass]="row.delay_days > 0 ? 'text-rose-600' : 'text-emerald-600'">
                  {{ row.delay_days > 0 ? '+' + row.delay_days + ' Days' : '0 Days' }}
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">{{ row.contractor_name }}</td>
                <td class="px-6 py-4 font-mono font-bold text-indigo-600">{{ row.contractor_performance_score }}%</td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.status === 'ON_TRACK',
                    'bg-amber-50 text-amber-700 border-amber-200': row.status === 'AT_RISK',
                    'bg-rose-50 text-rose-700 border-rose-200': row.status === 'DELAYED'
                  }" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.status }}
                  </span>
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
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No construction milestones recorded</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Construction Milestone' : 'Record Critical Construction Milestone'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Milestone Name *</label>
              <input type="text" [(ngModel)]="formData.milestone_name" name="milestone_name" required placeholder="e.g. Tower 1: 12th Floor RCC Slab Casting" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Target Completion Date *</label>
              <input type="date" [(ngModel)]="formData.target_completion_date" name="target_completion_date" required class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Delay (Days)</label>
              <input type="number" [(ngModel)]="formData.delay_days" name="delay_days" placeholder="0" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Contractor Name *</label>
              <input type="text" [(ngModel)]="formData.contractor_name" name="contractor_name" required placeholder="e.g. Unique Builders Ltd." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Contractor Score (%)</label>
              <input type="number" step="0.1" [(ngModel)]="formData.contractor_performance_score" name="contractor_performance_score" placeholder="e.g. 94.5" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select [(ngModel)]="formData.status" name="status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
                <option value="ON_TRACK">ON_TRACK</option>
                <option value="AT_RISK">AT_RISK</option>
                <option value="DELAYED">DELAYED</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Critical Issues / Bottlenecks</label>
            <textarea [(ngModel)]="formData.critical_issues" name="critical_issues" rows="2" placeholder="Detail any equipment, labour or material blockers..." class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900"></textarea>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Save Milestone</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtConstructionComponent implements OnInit {
  items: MgmtConstructionItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  statusFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MgmtConstructionItem> = {};

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mgmtService.getConstructions({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery,
      status: this.statusFilter
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
    });
  }

  onSearchChange() {
    this.offset = 0;
    this.loadData();
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

  openAddModal() {
    this.editingId = null;
    this.formData = {
      project_name: 'BlueOceans Marina Bay',
      milestone_name: '',
      target_completion_date: new Date().toISOString().split('T')[0],
      delay_days: 0,
      contractor_name: '',
      contractor_performance_score: 90,
      status: 'ON_TRACK',
      critical_issues: ''
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MgmtConstructionItem) {
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
      this.mgmtService.updateConstruction(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.mgmtService.createConstruction(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this construction milestone?')) {
      this.mgmtService.deleteConstruction(id).subscribe(() => this.loadData());
    }
  }
}
