import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileNotificationItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Sales Executive Push Alerts & Dispatch Notifications" subtitle="Real-time broadcast for new lead assignments, SLA overdue follow-ups, and director approval decisions">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Send Broadcast Alert
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by title, message, alert type..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedReadFilter"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Alerts</option>
              <option value="UNREAD">Unread Alerts</option>
              <option value="READ">Read / Acknowledged</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Notifications: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Alert Ref</th>
                <th class="p-3">Type</th>
                <th class="p-3">Notification Subject</th>
                <th class="p-3">Message Content</th>
                <th class="p-3">Recipient</th>
                <th class="p-3">Read Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (n of notifications; track n.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition" [ngClass]="{ 'bg-teal-50/20': !n.is_read }">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ n.notification_code }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold"
                      [ngClass]="{
                        'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400': n.notification_type === 'LEAD_ASSIGNMENT',
                        'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400': n.notification_type === 'OVERDUE_FOLLOWUP',
                        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400': n.notification_type === 'APPROVAL_RESULT'
                      }"
                    >
                      {{ n.notification_type }}
                    </span>
                  </td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ n.title }}
                  </td>
                  <td class="p-3 max-w-sm truncate" [title]="n.message">
                    {{ n.message }}
                  </td>
                  <td class="p-3 font-medium">
                    {{ n.recipient_name }}
                  </td>
                  <td class="p-3">
                    @if (n.is_read) {
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Read
                      </span>
                    } @else {
                      <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 animate-pulse">
                        New Unread
                      </span>
                    }
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      @if (!n.is_read) {
                        <button
                          type="button"
                          (click)="markAsRead(n)"
                          class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                        >
                          Mark Read
                        </button>
                      }
                      <button
                        type="button"
                        (click)="deleteNotification(n)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" class="p-8 text-center text-slate-400">
                    No notifications or alert triggers found.
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

      <!-- Modal Dialog for Dispatching New Broadcast Alert -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Broadcast Field Notification / Lead Assignment"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Notification Category *</label>
              <select
                [(ngModel)]="formData.notification_type"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="LEAD_ASSIGNMENT">New Lead Assignment</option>
                <option value="OVERDUE_FOLLOWUP">Overdue Follow-up Escalation</option>
                <option value="APPROVAL_RESULT">Management Approval Decision</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Recipient Executive</label>
              <input
                type="text"
                [(ngModel)]="formData.recipient_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="Ashraful Alam"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Alert Headline / Subject *</label>
            <input
              type="text"
              [(ngModel)]="formData.title"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-1 focus:ring-teal-500"
              placeholder="e.g. Urgent: Lead First-Response SLA Due in 30 Mins"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Detailed Alert Message Content *</label>
            <textarea
              [(ngModel)]="formData.message"
              rows="3"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Enter full broadcast details or task instructions for field executive..."
            ></textarea>
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
              (click)="saveNotification()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              Dispatch Alert
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileNotificationsComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  notifications: MobileNotificationItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedReadFilter = 'ALL';

  isModalOpen = false;
  formData: Partial<MobileNotificationItem> = {
    title: '',
    notification_type: 'LEAD_ASSIGNMENT',
    message: '',
    recipient_name: 'Ashraful Alam',
    is_read: false
  };

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    let isReadParam: boolean | undefined;
    if (this.selectedReadFilter === 'UNREAD') isReadParam = false;
    else if (this.selectedReadFilter === 'READ') isReadParam = true;

    this.service.getNotifications({
      search: this.searchQuery,
      is_read: isReadParam,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.notifications = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load notifications', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadNotifications();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadNotifications();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadNotifications();
    }
  }

  openCreateModal(): void {
    this.formData = {
      title: '',
      notification_type: 'LEAD_ASSIGNMENT',
      message: '',
      recipient_name: 'Ashraful Alam',
      is_read: false
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveNotification(): void {
    if (!this.formData.title || !this.formData.message) {
      alert('Please enter Subject and Message Content.');
      return;
    }

    this.service.createNotification(this.formData).subscribe({
      next: () => {
        this.closeModal();
        this.loadNotifications();
      },
      error: (err) => console.error('Failed to broadcast alert', err)
    });
  }

  markAsRead(n: MobileNotificationItem): void {
    this.service.markNotificationRead(n.id).subscribe({
      next: () => this.loadNotifications(),
      error: (err) => console.error('Failed to mark alert read', err)
    });
  }

  deleteNotification(n: MobileNotificationItem): void {
    if (confirm(`Dismiss alert "${n.title}"?`)) {
      this.service.deleteNotification(n.id).subscribe({
        next: () => this.loadNotifications(),
        error: (err) => console.error('Failed to delete notification', err)
      });
    }
  }
}
