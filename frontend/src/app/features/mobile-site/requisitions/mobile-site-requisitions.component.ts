import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteMaterialReqItem } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-requisitions',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Site Material Requisitions" subtitle="Raise urgent requisitions for cement, steel rebar, coarse sand, bricks and chemical admixtures with required on-site date">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
          >
            <span>+</span> Raise Material Requisition
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by req #, material, project..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Requisition Statuses</option>
              <option value="PENDING">Pending Store Review</option>
              <option value="APPROVED">Approved by PM</option>
              <option value="ISSUED">Material Issued to Site</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Requisitions: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Req Code</th>
                <th class="p-3">Category</th>
                <th class="p-3">Material Specification</th>
                <th class="p-3">Quantity</th>
                <th class="p-3">Urgency</th>
                <th class="p-3">Required By</th>
                <th class="p-3">Requested By</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (req of requisitions; track req.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ req.req_code }}
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {{ req.material_category }}
                    </span>
                  </td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ req.material_name }}
                  </td>
                  <td class="p-3 font-mono font-bold">
                    {{ req.quantity | number:'1.0-2' }} {{ req.unit }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': req.urgency === 'URGENT' || req.urgency === 'CRITICAL',
                        'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400': req.urgency === 'NORMAL'
                      }"
                    >
                      {{ req.urgency }}
                    </span>
                  </td>
                  <td class="p-3 font-mono">
                    {{ req.required_by_date }}
                  </td>
                  <td class="p-3 font-medium">
                    {{ req.requested_by }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': req.status === 'ISSUED',
                        'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-400': req.status === 'APPROVED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': req.status === 'PENDING',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': req.status === 'REJECTED'
                      }"
                    >
                      {{ req.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(req)"
                        class="px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteRequisition(req)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No material requisitions found. Click "+ Raise Material Requisition" to create one.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex items-center justify-between mt-4 text-xs text-slate-500">
          <div>
            Showing {{ Math.min(offset + 1, totalCount) }} to {{ Math.min(offset + limit, totalCount) }} of {{ totalCount }} records
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset === 0"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Previous
            </button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset + limit >= totalCount"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Modal Dialog for Add / Edit Requisition -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingReqId ? 'Edit Material Requisition' : 'Create Site Material Requisition'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Material Category</label>
              <select
                [(ngModel)]="formData.material_category"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="CEMENT">Cement (PCC / OPC)</option>
                <option value="STEEL">TMT Steel Rebar (60G / 72.5G)</option>
                <option value="SAND">Sylhet Coarse Sand / Local Sand</option>
                <option value="BRICKS">Auto Bricks / AAC Blocks</option>
                <option value="AGGREGATE">Stone Aggregate (3/4 down)</option>
                <option value="CHEMICALS">Waterproofing / Admixtures</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Material Brand & Exact Specification *</label>
            <input
              type="text"
              [(ngModel)]="formData.material_name"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Seven Rings Special PCC or BSRM 72.5G 16mm Rebar"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity Needed *</label>
              <input
                type="number"
                [(ngModel)]="formData.quantity"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                placeholder="500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Measuring Unit</label>
              <select
                [(ngModel)]="formData.unit"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="Bags">Bags</option>
                <option value="Tons">Tons</option>
                <option value="Cft">Cft (Cubic Feet)</option>
                <option value="Pcs">Pcs</option>
                <option value="Drum">Drums</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Site Urgency Level</label>
              <select
                [(ngModel)]="formData.urgency"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="NORMAL">Normal Routine</option>
                <option value="URGENT">Urgent (Within 48h)</option>
                <option value="CRITICAL">Critical (Immediate Slab Work)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Required On-Site By *</label>
              <input
                type="date"
                [(ngModel)]="formData.required_by_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Requested By Engineer</label>
              <input
                type="text"
                [(ngModel)]="formData.requested_by"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Engr. Sajjad Hossain"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Approval Status</label>
              <select
                [(ngModel)]="formData.status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="PENDING">Pending Store Review</option>
                <option value="APPROVED">Approved by PM</option>
                <option value="ISSUED">Issued to Site</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="saveRequisition()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
            >
              {{ editingReqId ? 'Update Requisition' : 'Submit Requisition' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSiteRequisitionsComponent implements OnInit {
  private service = inject(MobileSiteService);
  Math = Math;

  requisitions: MobileSiteMaterialReqItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingReqId: number | null = null;
  formData: Partial<MobileSiteMaterialReqItem> = {
    project_name: 'BlueOceans Marina Bay',
    material_name: '',
    material_category: 'CEMENT',
    quantity: 500,
    unit: 'Bags',
    urgency: 'NORMAL',
    required_by_date: new Date().toISOString().slice(0, 10),
    requested_by: 'Engr. Sajjad Hossain',
    status: 'PENDING'
  };

  ngOnInit(): void {
    this.loadRequisitions();
  }

  loadRequisitions(): void {
    this.service.getRequisitions({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.requisitions = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load requisitions', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadRequisitions();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadRequisitions();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadRequisitions();
    }
  }

  openCreateModal(): void {
    this.editingReqId = null;
    this.formData = {
      project_name: 'BlueOceans Marina Bay',
      material_name: '',
      material_category: 'CEMENT',
      quantity: 500,
      unit: 'Bags',
      urgency: 'NORMAL',
      required_by_date: new Date().toISOString().slice(0, 10),
      requested_by: 'Engr. Sajjad Hossain',
      status: 'PENDING'
    };
    this.isModalOpen = true;
  }

  openEditModal(req: MobileSiteMaterialReqItem): void {
    this.editingReqId = req.id;
    this.formData = { ...req };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveRequisition(): void {
    if (!this.formData.material_name || !this.formData.quantity) {
      alert('Please enter Material Name and Quantity.');
      return;
    }

    if (this.editingReqId) {
      this.service.updateRequisition(this.editingReqId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRequisitions();
        },
        error: (err) => console.error('Failed to update requisition', err)
      });
    } else {
      this.service.createRequisition(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRequisitions();
        },
        error: (err) => console.error('Failed to create requisition', err)
      });
    }
  }

  deleteRequisition(req: MobileSiteMaterialReqItem): void {
    if (confirm(`Remove material requisition ${req.req_code} (${req.material_name})?`)) {
      this.service.deleteRequisition(req.id).subscribe({
        next: () => this.loadRequisitions(),
        error: (err) => console.error('Failed to delete requisition', err)
      });
    }
  }
}
