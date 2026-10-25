import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsWorkflowService, WorkflowAuditLog } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-workflow-history-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent],
  template: `
    <app-card
      title="Complete Approval Audit History"
      subtitle="Immutable chronological log of all workflow actions, electronic signatures, and IP audit trails"
      badge="Workflow 12.10"
      paddingClass="p-0"
    >
      <!-- Search strip -->
      <div class="p-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div class="w-full sm:w-80">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search audit ref, request number, actor name..."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        @if (isLoading()) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading audit history logs from server...
          </div>
        } @else if (logs().length === 0) {
          <div class="py-12 text-center text-slate-400 text-xs">
            No audit log entries recorded.
          </div>
        } @else {
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3">Audit Stamp</th>
                <th class="px-4 py-3">Request Ref</th>
                <th class="px-4 py-3 text-center">Action Event</th>
                <th class="px-4 py-3">Signatory / Actor</th>
                <th class="px-4 py-3 text-center">Tier</th>
                <th class="px-4 py-3">Action Remarks</th>
                <th class="px-4 py-3">IP Address</th>
                <th class="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (log of logs(); track log.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {{ log.audit_ref }}
                  </td>
                  <td class="px-4 py-3 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {{ log.request_number }}
                  </td>
                  <td class="px-4 py-3 text-center whitespace-nowrap">
                    <span
                      [ngClass]="getEventBadgeClass(log.event_type)"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                    >
                      {{ log.event_type }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ log.actor_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ log.actor_role }}</div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    @if (log.tier_level) {
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-[10px]">
                        {{ log.tier_level }}
                      </span>
                    } @else {
                      <span class="text-slate-400">-</span>
                    }
                  </td>
                  <td class="px-4 py-3 max-w-sm text-slate-700 dark:text-slate-300">
                    {{ log.comments || 'No remarks recorded' }}
                  </td>
                  <td class="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {{ log.ip_address }}
                  </td>
                  <td class="px-4 py-3 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {{ log.timestamp ? (log.timestamp | date:'medium') : 'Recently' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Pagination Footer -->
      <div class="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing {{ offset() + 1 }} to {{ min(offset() + limit(), totalCount()) }} of {{ totalCount() }} audit logs
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="prevPage()"
            [disabled]="offset() === 0"
            class="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Previous
          </button>
          <button
            type="button"
            (click)="nextPage()"
            [disabled]="offset() + limit() >= totalCount()"
            class="px-3 py-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Next
          </button>
        </div>
      </div>
    </app-card>
  `
})
export class WorkflowHistoryListComponent implements OnInit {
  private service = inject(HrmsWorkflowService);

  logs = signal<WorkflowAuditLog[]>([]);
  totalCount = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.isLoading.set(true);
    this.service.getAuditHistory({
      search: this.searchQuery.trim() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.logs.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load audit logs', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadLogs();
  }

  getEventBadgeClass(eventType: string): string {
    switch (eventType) {
      case 'FULLY_APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
      case 'TIER_APPROVED':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'SUBMIT':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadLogs();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.totalCount()) {
      this.offset.update(v => v + this.limit());
      this.loadLogs();
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
