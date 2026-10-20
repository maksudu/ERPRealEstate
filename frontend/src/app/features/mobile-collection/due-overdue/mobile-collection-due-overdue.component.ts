import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileCollectionService, CollectionScheduleItem } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';

@Component({
  selector: 'app-mobile-collection-due-overdue',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileCollectionNavComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="due-overdue"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Due & Overdue Aging Tracking</h1>
          <p class="text-sm text-slate-500 mt-1">Aging analysis, delinquency tracking, NI Act notice monitoring & 1-click reminders</p>
        </div>
      </div>

      <!-- Aging Buckets Cards -->
      <div class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase">1 - 30 Days Due</div>
          <div class="text-xl font-bold text-slate-800 font-mono mt-1">
            ৳ {{ agingBuckets?.bucket_1_30_days | number:'1.2-2' }}
          </div>
          <div class="text-xs text-amber-600 font-medium mt-1">Grace Period / Friendly Alert</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase">31 - 60 Days Overdue</div>
          <div class="text-xl font-bold text-amber-600 font-mono mt-1">
            ৳ {{ agingBuckets?.bucket_31_60_days | number:'1.2-2' }}
          </div>
          <div class="text-xs text-amber-600 font-medium mt-1">Formal Follow-up Letter</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase">61 - 90 Days Overdue</div>
          <div class="text-xl font-bold text-orange-600 font-mono mt-1">
            ৳ {{ agingBuckets?.bucket_61_90_days | number:'1.2-2' }}
          </div>
          <div class="text-xs text-orange-600 font-medium mt-1">Final Notice Before Action</div>
        </div>
        <div class="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase">90+ Days Critical</div>
          <div class="text-xl font-bold text-rose-600 font-mono mt-1">
            ৳ {{ agingBuckets?.bucket_90_plus_days | number:'1.2-2' }}
          </div>
          <div class="text-xs text-rose-600 font-medium mt-1">Legal / NI Act 138 Proceeding</div>
        </div>
      </div>

      <!-- Filters -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        <div class="flex-1 min-w-[240px]">
          <input type="text" [(ngModel)]="searchQuery" (input)="onSearchChange()" placeholder="Search overdue customer, booking ID..." class="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
        </div>
        <span class="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg ml-auto">
          Overdue Count: {{ totalCount }}
        </span>
      </div>

      <!-- Table View -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th class="px-6 py-4">Customer</th>
                <th class="px-6 py-4">Booking / Unit</th>
                <th class="px-6 py-4">Installment Milestone</th>
                <th class="px-6 py-4">Due Date</th>
                <th class="px-6 py-4">Balance Outstanding</th>
                <th class="px-6 py-4">Late Fee</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Reminder Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let row of items" class="hover:bg-slate-50/70 transition-colors">
                <td class="px-6 py-4 font-bold text-slate-900">{{ row.customer_name }}</td>
                <td class="px-6 py-4 font-mono text-slate-600">
                  {{ row.booking_number }}
                  <span class="text-xs text-slate-400 block">{{ row.project_name }} ({{ row.unit_number }})</span>
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">{{ row.installment_name }}</td>
                <td class="px-6 py-4 text-xs font-mono text-rose-600 font-semibold">{{ row.due_date }}</td>
                <td class="px-6 py-4 font-mono font-bold text-rose-600">
                  ৳ {{ (row.amount - row.paid_amount) | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4 font-mono text-xs text-slate-500">
                  ৳ {{ row.late_fee | number:'1.2-2' }}
                </td>
                <td class="px-6 py-4">
                  <span [ngClass]="row.status === 'OVERDUE' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'" class="px-2.5 py-1 rounded-full text-xs font-semibold border inline-block">
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right whitespace-nowrap">
                  <button (click)="sendReminder(row.id!)" class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1.5 ml-auto">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                    Send Reminder
                  </button>
                </td>
              </tr>
              <tr *ngIf="items.length === 0">
                <td colspan="8" class="px-6 py-12 text-center text-slate-400">No overdue milestones found! All accounts are in good standing.</td>
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
    </div>
  `
})
export class MobileCollectionDueOverdueComponent implements OnInit {
  items: CollectionScheduleItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;
  searchQuery = '';
  agingBuckets: any = null;

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.collectionService.getDueOverdue({
      limit: this.limit,
      offset: this.offset,
      search: this.searchQuery
    }).subscribe(res => {
      this.items = res.items;
      this.totalCount = res.total;
      this.agingBuckets = res.aging_buckets;
    });
  }

  onSearchChange() {
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

  sendReminder(id: number) {
    this.collectionService.sendPaymentReminder(id).subscribe(res => {
      alert(res.message);
    });
  }
}
