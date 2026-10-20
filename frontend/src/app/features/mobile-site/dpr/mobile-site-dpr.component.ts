import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteDprItem } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-dpr',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Daily Progress Reports (DPR)" subtitle="Log daily site activities, construction milestones achieved, weather conditions, on-site labor count and bottlenecks">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
          >
            <span>+</span> Submit New DPR
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by DPR #, project, engineer, works..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved by PM</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total DPRs: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">DPR Code</th>
                <th class="p-3">Report Date</th>
                <th class="p-3">Project</th>
                <th class="p-3">Weather Condition</th>
                <th class="p-3">Labour Count</th>
                <th class="p-3">Work Completed Summary</th>
                <th class="p-3">Engineer</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (dpr of dprs; track dpr.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ dpr.dpr_code }}
                  </td>
                  <td class="p-3 font-mono font-medium">
                    {{ dpr.dpr_date }}
                  </td>
                  <td class="p-3 font-medium text-slate-900 dark:text-slate-100">
                    {{ dpr.project_name }}
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      🌤️ {{ dpr.weather_condition }}
                    </span>
                  </td>
                  <td class="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {{ dpr.labour_count }} Persons
                  </td>
                  <td class="p-3 max-w-xs truncate" [title]="dpr.work_completed">
                    {{ dpr.work_completed }}
                  </td>
                  <td class="p-3 font-medium">
                    {{ dpr.site_engineer }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': dpr.status === 'APPROVED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': dpr.status === 'SUBMITTED',
                        'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400': dpr.status === 'DRAFT'
                      }"
                    >
                      {{ dpr.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(dpr)"
                        class="px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteDpr(dpr)"
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
                    No Daily Progress Reports found. Click "+ Submit New DPR" to create today's log.
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

      <!-- Modal Dialog for Add / Edit DPR -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingDprId ? 'Edit Daily Progress Report' : 'Submit Daily Progress Report (DPR)'"
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
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">DPR Date *</label>
              <input
                type="date"
                [(ngModel)]="formData.dpr_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Weather Condition</label>
              <input
                type="text"
                [(ngModel)]="formData.weather_condition"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Sunny (33°C), Dry"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Total Labour Count *</label>
              <input
                type="number"
                [(ngModel)]="formData.labour_count"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
                placeholder="68"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Site Engineer</label>
              <input
                type="text"
                [(ngModel)]="formData.site_engineer"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Engr. Sajjad Hossain"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Daily Work Completed (Detailed Log) *</label>
            <textarea
              [(ngModel)]="formData.work_completed"
              rows="3"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="Describe concrete casting, rebar tying, shuttering, brickwork completed today..."
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Bottlenecks, Delays or Material Shortages</label>
            <textarea
              [(ngModel)]="formData.delays_challenges"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="Ready-mix delay, power outage, water supply issues..."
            ></textarea>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Report Status</label>
            <select
              [(ngModel)]="formData.status"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="SUBMITTED">Submitted to Project Manager</option>
              <option value="APPROVED">Approved by PM</option>
              <option value="DRAFT">Draft</option>
            </select>
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
              (click)="saveDpr()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
            >
              {{ editingDprId ? 'Update Report' : 'Submit DPR' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSiteDprComponent implements OnInit {
  private service = inject(MobileSiteService);
  Math = Math;

  dprs: MobileSiteDprItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingDprId: number | null = null;
  formData: Partial<MobileSiteDprItem> = {
    project_name: 'BlueOceans Marina Bay',
    dpr_date: new Date().toISOString().slice(0, 10),
    weather_condition: 'Sunny (33°C), Dry',
    labour_count: 65,
    work_completed: '',
    delays_challenges: '',
    site_engineer: 'Engr. Sajjad Hossain',
    status: 'SUBMITTED'
  };

  ngOnInit(): void {
    this.loadDprs();
  }

  loadDprs(): void {
    this.service.getDprs({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.dprs = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load DPR records', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadDprs();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadDprs();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadDprs();
    }
  }

  openCreateModal(): void {
    this.editingDprId = null;
    this.formData = {
      project_name: 'BlueOceans Marina Bay',
      dpr_date: new Date().toISOString().slice(0, 10),
      weather_condition: 'Sunny (33°C), Dry',
      labour_count: 65,
      work_completed: '',
      delays_challenges: '',
      site_engineer: 'Engr. Sajjad Hossain',
      status: 'SUBMITTED'
    };
    this.isModalOpen = true;
  }

  openEditModal(dpr: MobileSiteDprItem): void {
    this.editingDprId = dpr.id;
    this.formData = { ...dpr };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveDpr(): void {
    if (!this.formData.project_name || !this.formData.work_completed) {
      alert('Please enter Project Name and Work Completed Summary.');
      return;
    }

    if (this.editingDprId) {
      this.service.updateDpr(this.editingDprId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadDprs();
        },
        error: (err) => console.error('Failed to update DPR', err)
      });
    } else {
      this.service.createDpr(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadDprs();
        },
        error: (err) => console.error('Failed to create DPR', err)
      });
    }
  }

  deleteDpr(dpr: MobileSiteDprItem): void {
    if (confirm(`Delete DPR record ${dpr.dpr_code} dated ${dpr.dpr_date}?`)) {
      this.service.deleteDpr(dpr.id).subscribe({
        next: () => this.loadDprs(),
        error: (err) => console.error('Failed to delete DPR', err)
      });
    }
  }
}
