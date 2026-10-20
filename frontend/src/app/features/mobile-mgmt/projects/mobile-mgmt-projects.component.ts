import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtService, MgmtProjectItem } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-mgmt-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="projects"></app-mobile-mgmt-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Project Performance & Profitability</h1>
          <p class="text-sm text-slate-500 mt-1">Earned Value Management (EVM), budget variances, progress % and estimated ROI</p>
        </div>
        <button (click)="openAddModal()" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Project Benchmark
        </button>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search project name, location..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900">
        </div>
        <select [(ngModel)]="statusFilter" (change)="onStatusChange()" class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-900">
          <option value="">All Statuses</option>
          <option value="ON_SCHEDULE">ON_SCHEDULE</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="DELAYED">DELAYED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
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
                <th class="px-6 py-4">Project & Location</th>
                <th class="px-6 py-4">Total Budget (BDT)</th>
                <th class="px-6 py-4">Actual Cost (BDT)</th>
                <th class="px-6 py-4">Variance</th>
                <th class="px-6 py-4">Progress %</th>
                <th class="px-6 py-4">Est. Profitability</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4">
                  <div class="font-bold text-slate-900">{{ row.project_name }}</div>
                  <div class="text-xs text-slate-400">{{ row.location }}</div>
                </td>
                <td class="px-6 py-4 font-mono font-medium text-slate-800">
                  ৳ {{ row.total_budget | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-bold text-slate-900">
                  ৳ {{ row.actual_cost | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono font-semibold" [ngClass]="row.cost_variance >= 0 ? 'text-rose-600' : 'text-emerald-600'">
                  ৳ {{ row.cost_variance | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 min-w-[140px]">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-xs font-mono">{{ row.progress_percentage }}%</span>
                    <div class="w-24 bg-slate-100 rounded-full h-2">
                      <div class="bg-indigo-600 h-2 rounded-full" [style.width.%]="row.progress_percentage"></div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 font-bold text-emerald-600 font-mono">
                  {{ row.projected_profitability_percentage }}%
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-emerald-50 text-emerald-700 border-emerald-200': row.status === 'ON_SCHEDULE' || row.status === 'COMPLETED',
                    'bg-amber-50 text-amber-700 border-amber-200': row.status === 'IN_PROGRESS',
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
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No project benchmarks found</td>
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
      <app-modal [isOpen]="isModalOpen" [title]="editingId ? 'Edit Project Benchmark' : 'Add Project Benchmark'" (close)="closeModal()">
        <form (ngSubmit)="saveItem()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="formData.project_name" name="project_name" required placeholder="e.g. BlueOceans Marina Bay" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
              <input type="text" [(ngModel)]="formData.location" name="location" required placeholder="e.g. Banani, Dhaka" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Total Approved Budget (BDT)</label>
              <input type="number" [(ngModel)]="formData.total_budget" name="total_budget" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Actual Cost Incurred (BDT)</label>
              <input type="number" [(ngModel)]="formData.actual_cost" name="actual_cost" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Progress Percentage (%)</label>
              <input type="number" step="0.1" [(ngModel)]="formData.progress_percentage" name="progress_percentage" placeholder="e.g. 68.5" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Estimated Revenue (BDT)</label>
              <input type="number" [(ngModel)]="formData.estimated_revenue" name="estimated_revenue" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Projected Profitability (%)</label>
              <input type="number" step="0.1" [(ngModel)]="formData.projected_profitability_percentage" name="projected_profitability_percentage" placeholder="e.g. 33.8" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select [(ngModel)]="formData.status" name="status" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900">
                <option value="ON_SCHEDULE">ON_SCHEDULE</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="DELAYED">DELAYED</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button type="button" (click)="closeModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Cancel</button>
            <button type="submit" class="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl">Save Benchmark</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtProjectsComponent implements OnInit {
  items: MgmtProjectItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  statusFilter = '';

  isModalOpen = false;
  editingId: number | null = null;
  formData: Partial<MgmtProjectItem> = {};

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.mgmtService.getProjects({
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
      project_name: '',
      location: '',
      total_budget: 0,
      actual_cost: 0,
      cost_variance: 0,
      progress_percentage: 0,
      estimated_revenue: 0,
      projected_profitability_percentage: 30,
      status: 'IN_PROGRESS'
    };
    this.isModalOpen = true;
  }

  openEditModal(row: MgmtProjectItem) {
    this.editingId = row.id!;
    this.formData = { ...row };
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.editingId = null;
  }

  saveItem() {
    if (this.formData.total_budget && this.formData.actual_cost) {
      this.formData.cost_variance = this.formData.actual_cost - this.formData.total_budget;
    }
    if (this.editingId) {
      this.mgmtService.updateProject(this.editingId, this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    } else {
      this.mgmtService.createProject(this.formData).subscribe(() => {
        this.closeModal();
        this.loadData();
      });
    }
  }

  deleteItem(id: number) {
    if (confirm('Delete this project performance benchmark?')) {
      this.mgmtService.deleteProject(id).subscribe(() => this.loadData());
    }
  }
}
