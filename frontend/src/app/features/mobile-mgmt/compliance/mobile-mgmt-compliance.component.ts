import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { MobileMgmtService, MobileMgmtCompliance } from '../../../core/services/mobile-mgmt.service';

@Component({
  selector: 'app-mobile-mgmt-compliance',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileMgmtNavComponent, ModalComponent],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col w-full">
      <app-mobile-mgmt-nav activeTab="compliance"></app-mobile-mgmt-nav>

      <div class="p-4 md:p-6 space-y-6 flex-1 w-full">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 class="text-xl font-bold text-slate-800">Compliance & Legal Alerts</h1>
            <p class="text-xs text-slate-500">RAJUK approvals, Fire safety, DoE environmental clearances, lease deeds & court notices</p>
          </div>
          <div class="flex items-center gap-3">
            <button (click)="openAddModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-2">
              <i class="fas fa-plus"></i> Add Compliance Item
            </button>
          </div>
        </div>

        <!-- Filters & Search -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div class="relative flex-1 md:w-72">
              <i class="fas fa-search absolute left-3 top-3 text-slate-400 text-xs"></i>
              <input type="text" [(ngModel)]="searchQuery" (keyup.enter)="loadData()" placeholder="Search authority, project, license..."
                class="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <select [(ngModel)]="statusFilter" (change)="loadData()" class="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
            <select [(ngModel)]="riskFilter" (change)="loadData()" class="border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none">
              <option value="">All Risk Levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div class="text-xs text-slate-500">
            Total Items: <span class="font-bold text-slate-800">{{ total }}</span>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-600">
              <thead class="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4">Authority / Document</th>
                  <th class="py-3 px-4">Project</th>
                  <th class="py-3 px-4">Reference No</th>
                  <th class="py-3 px-4">Expiry Date</th>
                  <th class="py-3 px-4">Days Left</th>
                  <th class="py-3 px-4">Risk Level</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr *ngFor="let item of items" class="hover:bg-slate-50 transition-colors">
                  <td class="py-3 px-4">
                    <div class="font-bold text-slate-800">{{ item.authority }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.document_type }}</div>
                  </td>
                  <td class="py-3 px-4 font-medium text-slate-800">{{ item.project_name }}</td>
                  <td class="py-3 px-4 font-mono text-slate-600">{{ item.reference_number || 'N/A' }}</td>
                  <td class="py-3 px-4">{{ item.expiry_date }}</td>
                  <td class="py-3 px-4 font-bold" [ngClass]="item.days_remaining <= 30 ? 'text-rose-600' : 'text-slate-700'">
                    {{ item.days_remaining }} days
                  </td>
                  <td class="py-3 px-4">
                    <span [ngClass]="{
                      'bg-rose-100 text-rose-700 border-rose-200': item.risk_level === 'High',
                      'bg-amber-100 text-amber-700 border-amber-200': item.risk_level === 'Medium',
                      'bg-emerald-100 text-emerald-700 border-emerald-200': item.risk_level === 'Low'
                    }" class="px-2 py-0.5 rounded text-[10px] font-semibold border">
                      {{ item.risk_level }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span [ngClass]="{
                      'bg-rose-100 text-rose-700': item.status === 'Expired',
                      'bg-amber-100 text-amber-700': item.status === 'Expiring Soon',
                      'bg-emerald-100 text-emerald-700': item.status === 'Active'
                    }" class="px-2 py-0.5 rounded text-[10px] font-semibold">
                      {{ item.status }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button (click)="openEditModal(item)" class="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button (click)="deleteItem(item.id)" class="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="items.length === 0">
                  <td colspan="8" class="text-center py-8 text-slate-400">No compliance records found.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing {{ items.length ? offset + 1 : 0 }} to {{ offset + items.length }} of {{ total }}
            </div>
            <div class="flex items-center gap-2">
              <button [disabled]="offset === 0" (click)="prevPage()" class="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-100">
                Previous
              </button>
              <button [disabled]="offset + limit >= total" (click)="nextPage()" class="px-3 py-1 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-100">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal -->
      <app-modal [isOpen]="isModalOpen" [title]="isEditing ? 'Edit Compliance Item' : 'New Compliance Item'" (closeModal)="isModalOpen = false">
        <form (ngSubmit)="saveItem()" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Regulatory Authority *</label>
              <input type="text" [(ngModel)]="currentItem.authority" name="authority" required class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. RAJUK, DoE, Fire Service" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Document / Clearance Type *</label>
              <input type="text" [(ngModel)]="currentItem.document_type" name="document_type" required class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" placeholder="e.g. Building Plan Approval" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" [(ngModel)]="currentItem.project_name" name="project_name" required class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Reference / File No</label>
              <input type="text" [(ngModel)]="currentItem.reference_number" name="reference_number" class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Issue Date</label>
              <input type="date" [(ngModel)]="currentItem.issue_date" name="issue_date" class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
              <input type="date" [(ngModel)]="currentItem.expiry_date" name="expiry_date" required class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Risk Level</label>
              <select [(ngModel)]="currentItem.risk_level" name="risk_level" class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Status</label>
              <select [(ngModel)]="currentItem.status" name="status" class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500">
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Responsible Officer / Lawyer</label>
            <input type="text" [(ngModel)]="currentItem.responsible_person" name="responsible_person" class="w-full border border-slate-300 rounded p-2 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button type="button" (click)="isModalOpen = false" class="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </app-modal>
    </div>
  `
})
export class MobileMgmtComplianceComponent implements OnInit {
  items: MobileMgmtCompliance[] = [];
  total = 0;
  offset = 0;
  limit = 10;
  searchQuery = '';
  statusFilter = '';
  riskFilter = '';

  isModalOpen = false;
  isEditing = false;
  currentItem: Partial<MobileMgmtCompliance> = {};

  constructor(private service: MobileMgmtService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.service.getCompliance({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery || undefined,
      status: this.statusFilter || undefined,
      risk_level: this.riskFilter || undefined
    }).subscribe((res: any) => {
      this.items = res.items;
      this.total = res.total;
    });
  }

  prevPage(): void {
    if (this.offset > 0) {
      this.offset = Math.max(0, this.offset - this.limit);
      this.loadData();
    }
  }

  nextPage(): void {
    if (this.offset + this.limit < this.total) {
      this.offset += this.limit;
      this.loadData();
    }
  }

  openAddModal(): void {
    this.isEditing = false;
    this.currentItem = {
      authority: '',
      document_type: '',
      project_name: '',
      reference_number: '',
      issue_date: new Date().toISOString().substring(0, 10),
      expiry_date: new Date(Date.now() + 90 * 86400000).toISOString().substring(0, 10),
      risk_level: 'Medium',
      status: 'Active',
      responsible_person: ''
    };
    this.isModalOpen = true;
  }

  openEditModal(item: MobileMgmtCompliance): void {
    this.isEditing = true;
    this.currentItem = { ...item };
    this.isModalOpen = true;
  }

  saveItem(): void {
    if (this.isEditing && this.currentItem.id) {
      this.service.updateCompliance(this.currentItem.id, this.currentItem).subscribe(() => {
        this.isModalOpen = false;
        this.loadData();
      });
    } else {
      this.service.createCompliance(this.currentItem).subscribe(() => {
        this.isModalOpen = false;
        this.loadData();
      });
    }
  }

  deleteItem(id: number | undefined): void {
    if (!id) return;
    if (confirm('Are you sure you want to delete this compliance record?')) {
      this.service.deleteCompliance(id).subscribe(() => {
        this.loadData();
      });
    }
  }
}
