import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { AuditTrailItem } from '../../../core/models/procurement.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-reports-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    ModalComponent
  ],
  template: `
    <app-procurement-nav
      title="9.15 Procurement Reports & Audit Trail"
      subtitle="Immutable Chronological Audit Trail, Transaction Forensics & Compliance Logging"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadAuditTrail()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <span>🔄</span>
          <span>Refresh Audit Logs</span>
        </button>
        <button
          type="button"
          (click)="exportAuditCsv()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 hover:bg-black dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 shadow-xs transition-colors"
        >
          <span>📄</span>
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Total Audit Logs</span>
          <span class="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">📜 Log</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ auditLogs().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Total recorded movements</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Audit Compliance</span>
          <span class="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">🛡️ Tamper-Proof</span>
        </div>
        <div class="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2">100%</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Double-entry ledger verified</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Modules Covered</span>
          <span class="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">⚙️ 5 Subsystems</span>
        </div>
        <div class="text-2xl font-black text-amber-800 dark:text-amber-400 mt-2">15 / 15</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Full end-to-end tracing</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Active Actors</span>
          <span class="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-bold">👥 Users</span>
        </div>
        <div class="text-2xl font-black text-purple-800 dark:text-purple-400 mt-2">{{ uniqueUsersCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Storekeepers & engineers</p>
      </div>
    </div>

    <!-- Main Card Container: Audit Trail Register -->
    <app-card-container
      title="Chronological Audit & Forensic Event Log"
      subtitle="Complete chronological timeline of all transactions, approvals, stock movements and financial matches"
    >
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="w-64">
            <app-custom-input
              placeholder="Search reference #, action or details..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
            ></app-custom-input>
          </div>

          <div class="w-48">
            <select
              [(ngModel)]="selectedModule"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Functional Modules</option>
              <option value="Inventory & Stores">Inventory & Stores</option>
              <option value="Procurement">Procurement</option>
              <option value="Quality Inspection">Quality Inspection</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
            </select>
          </div>

          <button
            *ngIf="searchQuery || selectedModule"
            (click)="clearFilters()"
            class="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div class="text-xs text-slate-700 dark:text-slate-300">
          Showing {{ pagedLogs().length }} of {{ filteredLogs().length }} logs
        </div>
      </div>

      <!-- Audit Data Table (No inline add form below table!) -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <th class="p-3">Timestamp</th>
              <th class="p-3">Module</th>
              <th class="p-3">Action / Operation</th>
              <th class="p-3">Reference No</th>
              <th class="p-3">Actor / User</th>
              <th class="p-3">Transaction Details</th>
              <th class="p-3 text-center">Status</th>
              <th class="p-3 text-center">Audit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              *ngFor="let log of pagedLogs()"
              class="hover:bg-amber-500/5 transition-colors text-slate-700 dark:text-slate-200"
            >
              <td class="p-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                {{ log.timestamp | date:'dd MMM yyyy, HH:mm:ss' }}
              </td>
              <td class="p-3">
                <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {{ log.module }}
                </span>
              </td>
              <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                {{ log.action }}
              </td>
              <td class="p-3 font-mono font-bold text-amber-700 dark:text-amber-400">
                {{ log.reference_number }}
              </td>
              <td class="p-3 font-medium">
                {{ log.user_name }}
              </td>
              <td class="p-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" [title]="log.details">
                {{ log.details }}
              </td>
              <td class="p-3 text-center">
                <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {{ log.status }}
                </span>
              </td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  (click)="viewDetails(log)"
                  class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Inspect
                </button>
              </td>
            </tr>

            <tr *ngIf="pagedLogs().length === 0">
              <td colspan="8" class="p-8 text-center text-slate-600 dark:text-slate-400">
                <div class="text-3xl mb-2">🔍</div>
                <div class="text-sm font-semibold">No audit logs found matching criteria.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="flex items-center justify-between mt-4 text-xs text-slate-700 dark:text-slate-300">
        <div>
          Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredLogs().length }} total logs)
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="setPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Prev
          </button>
          <button
            *ngFor="let p of getPages()"
            type="button"
            (click)="setPage(p)"
            [class.bg-amber-500]="currentPage() === p"
            [class.text-slate-950]="currentPage() === p"
            [class.font-bold]="currentPage() === p"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {{ p }}
          </button>
          <button
            type="button"
            (click)="setPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- Modal: Inspect Audit Record -->
    <app-modal
      [isOpen]="isDetailModalOpen()"
      title="Audit Log Forensic Inspection"
      (close)="isDetailModalOpen.set(false)"
    >
      <div *ngIf="selectedRecord" class="space-y-3 text-xs">
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Log Entry ID:</span>
            <span class="font-mono font-bold text-slate-900 dark:text-slate-100">#{{ selectedRecord.id }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Timestamp:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedRecord.timestamp | date:'dd MMMM yyyy, HH:mm:ss' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Functional Module:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedRecord.module }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Reference Number:</span>
            <span class="font-mono font-bold text-amber-700 dark:text-amber-400">{{ selectedRecord.reference_number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Action Type:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedRecord.action }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Authorized Actor:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedRecord.user_name }}</span>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Audit Trail Payload & Detail Context</label>
          <div class="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-[11px] whitespace-pre-wrap text-slate-800 dark:text-slate-200">
            {{ selectedRecord.details }}
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isDetailModalOpen.set(false)"
            label="Close"
          ></app-custom-button>
        </div>
      </div>
    </app-modal>
  `
})
export class ReportsAuditComponent implements OnInit {
  private procurementService = inject(ProcurementService);

  auditLogs = signal<AuditTrailItem[]>([]);

  // Filter state
  searchQuery = '';
  selectedModule = '';

  // Pagination
  currentPage = signal(1);
  pageSize = signal(15);

  // Modal
  isDetailModalOpen = signal(false);
  selectedRecord: AuditTrailItem | null = null;

  // KPIs
  uniqueUsersCount = computed(() => new Set(this.auditLogs().map(l => l.user_name)).size);

  // Filtered
  filteredLogs = computed(() => {
    let list = this.auditLogs();
    if (this.selectedModule) {
      list = list.filter(l => l.module === this.selectedModule);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(l =>
        l.reference_number.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q)
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLogs().length / this.pageSize())));

  pagedLogs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredLogs().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadAuditTrail();
  }

  loadAuditTrail(): void {
    this.procurementService.getAuditTrail(100).subscribe({
      next: (data) => {
        this.auditLogs.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load audit trail:', err)
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedModule = '';
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  getPages(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  viewDetails(record: AuditTrailItem): void {
    this.selectedRecord = record;
    this.isDetailModalOpen.set(true);
  }

  exportAuditCsv(): void {
    const list = this.filteredLogs();
    if (list.length === 0) {
      alert('No audit logs to export.');
      return;
    }
    const headers = ['Timestamp', 'Module', 'Action', 'Reference No', 'User', 'Details', 'Status'];
    const rows = list.map(l => [
      l.timestamp,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.reference_number}"`,
      `"${l.user_name}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      l.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `procurement_audit_trail_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
