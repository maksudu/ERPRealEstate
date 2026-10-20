import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileSiteVisitItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-visit-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Project Site Visits & Field Appointments" subtitle="Schedule client inspections, assign site executives, record inspection feedback and trigger follow-up alerts">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Schedule Site Visit
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by visit #, client, project, executive..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Visits</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Visits: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Visit Code</th>
                <th class="p-3">Client Details</th>
                <th class="p-3">Project & Unit</th>
                <th class="p-3">Site Executive</th>
                <th class="p-3">Scheduled Timing</th>
                <th class="p-3">Feedback & Notes</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (v of siteVisits; track v.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ v.visit_code }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium text-slate-900 dark:text-slate-100">{{ v.customer_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ v.customer_phone }}</div>
                  </td>
                  <td class="p-3">
                    <div class="font-medium">{{ v.project_name }}</div>
                    @if (v.unit_number) {
                      <div class="text-[10px] text-slate-400 font-mono font-semibold">{{ v.unit_number }}</div>
                    }
                  </td>
                  <td class="p-3 font-medium">
                    {{ v.sales_executive }}
                  </td>
                  <td class="p-3 font-mono">
                    {{ v.scheduled_at | date:'medium' }}
                  </td>
                  <td class="p-3 max-w-xs truncate" [title]="v.feedback || ''">
                    {{ v.feedback || 'Awaiting visit' }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': v.status === 'COMPLETED',
                        'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-400': v.status === 'SCHEDULED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': v.status === 'RESCHEDULED',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': v.status === 'CANCELLED'
                      }"
                    >
                      {{ v.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(v)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteSiteVisit(v)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">
                    No site visits recorded yet.
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

      <!-- Modal Dialog for Add / Edit Site Visit -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingVisitId ? 'Update Site Visit Status & Feedback' : 'Schedule Project Site Visit'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Dr. Nuzhat Fatema"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Phone *</label>
              <input
                type="text"
                [(ngModel)]="formData.customer_phone"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="+88018XXXXXXXX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="BlueOceans Skyline"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Unit (Optional)</label>
              <input
                type="text"
                [(ngModel)]="formData.unit_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="SV-803"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Site Sales Executive</label>
              <input
                type="text"
                [(ngModel)]="formData.sales_executive"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="Ashraful Alam"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                [(ngModel)]="formData.scheduled_at"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Visit Status</label>
              <select
                [(ngModel)]="formData.status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="RESCHEDULED">Rescheduled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Inspection Feedback & Client Reactions</label>
            <textarea
              [(ngModel)]="formData.feedback"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Liked corner view, requested revision in parking slot location, asked for discount proposal..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                [(ngModel)]="formData.follow_up_date"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
              />
            </div>
            <div class="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="reminderCheck"
                [(ngModel)]="formData.reminder_sent"
                class="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <label for="reminderCheck" class="text-xs text-slate-700 dark:text-slate-300">
                Send SMS & Push Reminder to Client
              </label>
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
              (click)="saveSiteVisit()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingVisitId ? 'Update Visit' : 'Confirm Schedule' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSiteVisitManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  siteVisits: MobileSiteVisitItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingVisitId: number | null = null;
  formData: Partial<MobileSiteVisitItem> = {
    customer_name: '',
    customer_phone: '',
    project_name: 'BlueOceans Skyline',
    unit_number: 'SV-803',
    sales_executive: 'Ashraful Alam',
    scheduled_at: new Date().toISOString().slice(0, 16),
    status: 'SCHEDULED',
    feedback: '',
    reminder_sent: true
  };

  ngOnInit(): void {
    this.loadSiteVisits();
  }

  loadSiteVisits(): void {
    this.service.getSiteVisits({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.siteVisits = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load site visits', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadSiteVisits();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadSiteVisits();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadSiteVisits();
    }
  }

  openCreateModal(): void {
    this.editingVisitId = null;
    this.formData = {
      customer_name: '',
      customer_phone: '',
      project_name: 'BlueOceans Skyline',
      unit_number: 'SV-803',
      sales_executive: 'Ashraful Alam',
      scheduled_at: new Date().toISOString().slice(0, 16),
      status: 'SCHEDULED',
      feedback: '',
      reminder_sent: true
    };
    this.isModalOpen = true;
  }

  openEditModal(v: MobileSiteVisitItem): void {
    this.editingVisitId = v.id;
    this.formData = { ...v };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveSiteVisit(): void {
    if (!this.formData.customer_name || !this.formData.customer_phone || !this.formData.scheduled_at) {
      alert('Please enter Customer Name, Phone and Scheduled Timing.');
      return;
    }

    if (this.editingVisitId) {
      this.service.updateSiteVisit(this.editingVisitId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadSiteVisits();
        },
        error: (err) => console.error('Failed to update site visit', err)
      });
    } else {
      this.service.createSiteVisit(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadSiteVisits();
        },
        error: (err) => console.error('Failed to create site visit', err)
      });
    }
  }

  deleteSiteVisit(v: MobileSiteVisitItem): void {
    if (confirm(`Cancel/remove site visit ${v.visit_code} for ${v.customer_name}?`)) {
      this.service.deleteSiteVisit(v.id).subscribe({
        next: () => this.loadSiteVisits(),
        error: (err) => console.error('Failed to delete site visit', err)
      });
    }
  }
}
