import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HrmsWorkflowService, WorkflowDelegation } from '../../../../core/services/hrms-workflow.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-workflow-delegation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent],
  template: `
    <app-card
      title="Authority Delegation & Proxy Management"
      subtitle="Temporarily transfer sanctioning authority during planned leave, official site visits or overseas tours"
      badge="Workflow 12.9"
      paddingClass="p-0"
    >
      <div card-actions class="flex items-center gap-2">
        <a
          routerLink="/hrms/workflow/delegation/create"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
        >
          <span>+ New Authority Delegation</span>
        </a>
      </div>

      <!-- Search strip -->
      <div class="p-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
        <div class="w-full sm:w-80">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search delegation code, delegator, delegatee..."
            class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        @if (isLoading()) {
          <div class="py-12 text-center text-slate-400 text-xs">
            Loading delegation records from server...
          </div>
        } @else if (delegations().length === 0) {
          <div class="py-12 text-center text-slate-400 text-xs">
            No authority delegation rules found.
          </div>
        } @else {
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3">Delegation Code</th>
                <th class="px-4 py-3">Delegator (Originator)</th>
                <th class="px-4 py-3">Delegatee (Proxy)</th>
                <th class="px-4 py-3">Scope</th>
                <th class="px-4 py-3">Validity Period</th>
                <th class="px-4 py-3">Reason</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (del of delegations(); track del.id) {
                <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                    {{ del.delegation_code }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ del.delegator_name }}</div>
                    <div class="text-[10px] text-slate-400">{{ del.delegator_designation }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ del.delegatee_name }}</div>
                    <div class="text-[10px] text-slate-400">{{ del.delegatee_designation }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="px-2 py-0.5 rounded font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[10px]">
                      {{ del.module_scope }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap font-mono text-[11px]">
                    {{ del.start_date }} &rarr; {{ del.end_date }}
                  </td>
                  <td class="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-400">
                    {{ del.reason || 'Not specified' }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      [class.bg-emerald-50]="del.is_active"
                      [class.text-emerald-700]="del.is_active"
                      [class.dark:bg-emerald-950]="del.is_active"
                      [class.dark:text-emerald-300]="del.is_active"
                      [class.bg-slate-100]="!del.is_active"
                      [class.text-slate-600]="!del.is_active"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold border border-current"
                    >
                      {{ del.is_active ? 'ACTIVE' : 'EXPIRED' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right whitespace-nowrap space-x-1">
                    <button
                      type="button"
                      (click)="deleteDelegation(del)"
                      class="px-2 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-500 hover:text-rose-600 transition"
                      title="Revoke Delegation"
                    >
                      Revoke
                    </button>
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
          Showing {{ offset() + 1 }} to {{ min(offset() + limit(), totalCount()) }} of {{ totalCount() }} delegations
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
export class WorkflowDelegationListComponent implements OnInit {
  private service = inject(HrmsWorkflowService);

  delegations = signal<WorkflowDelegation[]>([]);
  totalCount = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  isLoading = signal<boolean>(false);
  searchQuery = '';

  ngOnInit(): void {
    this.loadDelegations();
  }

  loadDelegations(): void {
    this.isLoading.set(true);
    this.service.getDelegations({
      search: this.searchQuery.trim() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.delegations.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load delegations', err);
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadDelegations();
  }

  deleteDelegation(del: WorkflowDelegation): void {
    if (confirm(`Revoke authority delegation "${del.delegation_code}" from ${del.delegator_name} to ${del.delegatee_name}?`)) {
      this.service.deleteDelegation(del.id).subscribe({
        next: () => this.loadDelegations(),
        error: (err) => alert(err?.error?.detail || 'Failed to delete delegation.')
      });
    }
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(v => Math.max(0, v - this.limit()));
      this.loadDelegations();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.totalCount()) {
      this.offset.update(v => v + this.limit());
      this.loadDelegations();
    }
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
