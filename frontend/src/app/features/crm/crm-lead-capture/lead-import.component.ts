import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  CustomTabsComponent,
  TabItem
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { LeadImportRow } from '../../../core/models/crm.model';

@Component({
  selector: 'app-lead-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    CustomTabsComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <a
            routerLink="/crm/lead-capture"
            class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Lead Capture Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 4.2 · Bulk Import
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">Excel / CSV / JSON</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              Lead Bulk Import & History
            </h1>
          </div>
        </div>
        <a
          routerLink="/crm/lead-capture"
          class="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors w-fit"
        >
          Back to List
        </a>
      </div>

      <app-card-container
        title="Import Leads from Spreadsheet"
        subtitle="Upload CSV exported from Excel or paste JSON rows — duplicates are auto-detected and skipped, full import history is retained"
        paddingClass="p-0"
      >
        <div class="px-3.5 sm:px-6 pt-2">
          <app-custom-tabs
            [tabs]="tabs"
            [activeTabId]="activeTab()"
            variant="emerald"
            (tabChange)="onTabChange($event)"
          ></app-custom-tabs>
        </div>

        @if (activeTab() === 'IMPORT') {
          <div class="p-3.5 sm:p-6">
            <form [formGroup]="importForm" class="flex flex-col gap-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <app-custom-input
                  label="Source Filename"
                  placeholder="auto-filled from upload"
                  formControlName="filename"
                ></app-custom-input>
                <app-searchable-select
                  label="Source Channel *"
                  [categoryCode]="LOOKUP.source"
                  formControlName="source_channel"
                  placeholder="Select source channel..."
                  [required]="true"
                ></app-searchable-select>
              </div>

              <!-- CSV File Upload -->
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                  Upload CSV File
                  <span class="text-[11px] font-normal text-slate-500 dark:text-slate-400 ml-1">
                    (Export Excel sheet as CSV — headers: lead_name, primary_phone, email, lead_source_id, campaign_name, property_type, preferred_location, budget_range_min, budget_range_max, bedrooms, notes)
                  </span>
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  (change)="onFileSelected($event)"
                  class="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer erp-input"
                />
                @if (parsedRows().length > 0) {
                  <p class="text-[11px] text-emerald-600 font-medium">
                    Parsed {{ parsedRows().length }} rows from file successfully.
                  </p>
                }
              </div>

              <!-- JSON / Manual Paste -->
              <app-custom-textarea
                label="Or Paste JSON Array"
                placeholder='[{"lead_name":"John Doe","primary_phone":"+8801711111111","email":"john@example.com","lead_source_id":"EXHIBITION","campaign_name":"Eid Fair"}]'
                formControlName="jsonPayload"
                [rows]="8"
                hint="Each row must include lead_name and primary_phone. Other fields optional."
              ></app-custom-textarea>

              @if (importResult()) {
                <div class="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
                  {{ importResult() }}
                </div>
              }

              <div class="flex justify-end gap-3">
                <a routerLink="/crm/lead-capture" class="erp-button-secondary text-xs">Cancel</a>
                <app-custom-button
                  variant="primary"
                  [disabled]="importForm.invalid || isSubmitting() || (parsedRows().length === 0 && !importForm.get('jsonPayload')?.value)"
                  [loading]="isSubmitting()"
                  (clicked)="submitImport()"
                >
                  Import Leads
                </app-custom-button>
              </div>
            </form>
          </div>
        } @else {
          <!-- Import History (server-paged) -->
          <div class="flex flex-col">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100/80 dark:bg-slate-850 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th class="px-4 py-3">Batch ID</th>
                    <th class="px-4 py-3">Filename</th>
                    <th class="px-4 py-3">Source Channel</th>
                    <th class="px-4 py-3 text-right">Total Rows</th>
                    <th class="px-4 py-3 text-right">Success</th>
                    <th class="px-4 py-3 text-right">Duplicates</th>
                    <th class="px-4 py-3 text-right">Failed</th>
                    <th class="px-4 py-3">Imported At</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-200/70 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  @if (isLoadingHistory()) {
                    @for (i of [1, 2, 3, 4, 5]; track i) {
                      <tr>
                        <td colspan="8" class="px-4 py-4">
                          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-full"></div>
                        </td>
                      </tr>
                    }
                  } @else if (importHistory().length === 0) {
                    <tr>
                      <td colspan="8" class="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                        No import batches yet.
                      </td>
                    </tr>
                  } @else {
                    @for (batch of importHistory(); track batch.id) {
                      <tr class="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                        <td class="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          IMP-{{ batch.id }}
                        </td>
                        <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ batch.filename }}</td>
                        <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ batch.source_channel || '—' }}</td>
                        <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">{{ batch.total_rows }}</td>
                        <td class="px-4 py-3 text-right font-semibold text-emerald-600">{{ batch.success_count }}</td>
                        <td class="px-4 py-3 text-right font-semibold text-amber-600">{{ batch.duplicate_count }}</td>
                        <td class="px-4 py-3 text-right font-semibold text-rose-600">{{ batch.failed_count }}</td>
                        <td class="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {{ batch.imported_at ? (batch.imported_at | date:'dd MMM yyyy, h:mm a') : '—' }}
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <div class="px-3.5 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
              <span class="text-[11px] text-slate-500 dark:text-slate-400">
                Showing {{ historyFromRow() }}–{{ historyToRow() }} of {{ historyTotal() }} batches · Page {{ historyPage() }} of {{ historyTotalPages() }}
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="historyPrev()"
                  [disabled]="historyOffset() === 0"
                  class="erp-button-secondary text-xs h-8 px-3 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  (click)="historyNext()"
                  [disabled]="historyOffset() + historyLimit() >= historyTotal()"
                  class="erp-button-secondary text-xs h-8 px-3 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        }
      </app-card-container>
    </div>
  `
})
export class LeadImportComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);

  activeTab = signal<'IMPORT' | 'HISTORY'>('IMPORT');
  isSubmitting = signal(false);
  parsedRows = signal<LeadImportRow[]>([]);
  importResult = signal<string | null>(null);

  importHistory = signal<any[]>([]);
  historyTotal = signal(0);
  historyLimit = signal(20);
  historyOffset = signal(0);
  isLoadingHistory = signal(false);
  private _historyLoaded = false;

  tabs: TabItem[] = [
    { id: 'IMPORT', label: 'Import Leads' },
    { id: 'HISTORY', label: 'Import History' }
  ];

  readonly LOOKUP = { source: 'CRM_LEAD_SOURCE' };

  historyPage = computed(() => Math.floor(this.historyOffset() / this.historyLimit()) + 1);
  historyTotalPages = computed(() => Math.max(1, Math.ceil(this.historyTotal() / this.historyLimit())));
  historyFromRow = computed(() => (this.historyTotal() === 0 ? 0 : this.historyOffset() + 1));
  historyToRow = computed(() => Math.min(this.historyOffset() + this.historyLimit(), this.historyTotal()));

  importForm: FormGroup = this.fb.group({
    filename: ['bulk_import.csv', Validators.required],
    source_channel: ['MANUAL_ENTRY', Validators.required],
    jsonPayload: ['']
  });

  ngOnInit(): void {
    // History loads lazily on first HISTORY tab open
  }

  loadHistory(): void {
    this.isLoadingHistory.set(true);
    this.crmService.getImportHistory(this.historyLimit(), this.historyOffset()).subscribe({
      next: (res) => {
        this.importHistory.set(res.items || []);
        this.historyTotal.set(res.total || 0);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.isLoadingHistory.set(false);
        alert('Failed to load import history.');
      }
    });
  }

  historyNext(): void {
    if (this.historyOffset() + this.historyLimit() < this.historyTotal()) {
      this.historyOffset.update(v => v + this.historyLimit());
      this.loadHistory();
    }
  }

  historyPrev(): void {
    if (this.historyOffset() >= this.historyLimit()) {
      this.historyOffset.update(v => v - this.historyLimit());
      this.loadHistory();
    }
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId as 'IMPORT' | 'HISTORY');
    if (tabId === 'HISTORY') {
      this.loadHistory();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.importForm.patchValue({ filename: file.name });
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = this.parseCsv(text);
      this.parsedRows.set(rows);
      if (rows.length === 0) {
        alert('Could not parse any valid rows from the CSV. Ensure headers include lead_name and primary_phone.');
      }
    };
    reader.readAsText(file);
  }

  parseCsv(text: string): LeadImportRow[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = this.splitCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    const nameIdx = headers.indexOf('lead_name');
    const phoneIdx = headers.indexOf('primary_phone');
    if (nameIdx === -1 || phoneIdx === -1) return [];

    const rows: LeadImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);
      const lead_name = (cols[nameIdx] || '').trim();
      const primary_phone = (cols[phoneIdx] || '').trim();
      if (!lead_name || !primary_phone) continue;

      const get = (key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? (cols[idx] || '').trim() : '';
      };
      const num = (key: string) => {
        const v = get(key);
        return v ? +v : null;
      };

      rows.push({
        lead_name,
        primary_phone,
        email: get('email') || null,
        lead_source_id: get('lead_source_id') || this.importForm.get('source_channel')?.value || 'MANUAL_ENTRY',
        campaign_name: get('campaign_name') || null,
        property_type: get('property_type') || null,
        preferred_location: get('preferred_location') || null,
        budget_range_min: num('budget_range_min'),
        budget_range_max: num('budget_range_max'),
        bedrooms: num('bedrooms'),
        notes: get('notes') || null
      });
    }
    return rows;
  }

  splitCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
  }

  submitImport(): void {
    let rows: LeadImportRow[] = this.parsedRows();

    if (rows.length === 0) {
      const raw = this.importForm.get('jsonPayload')?.value;
      if (!raw || !raw.trim()) {
        alert('Upload a CSV file or paste a JSON array of lead rows.');
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array of lead rows.');
        rows = parsed;
      } catch (e: any) {
        alert('Invalid JSON: ' + (e?.message || 'parse error'));
        return;
      }
    }

    this.isSubmitting.set(true);
    this.crmService.importLeads({
      filename: this.importForm.get('filename')?.value || 'bulk_import.csv',
      source_channel: this.importForm.get('source_channel')?.value || 'MANUAL_ENTRY',
      rows
    }).subscribe({
      next: (batch) => {
        this.isSubmitting.set(false);
        this.importResult.set(
          `Imported ${batch.success_count}/${batch.total_rows} leads` +
          (batch.duplicate_count ? `, ${batch.duplicate_count} duplicates skipped` : '') +
          (batch.failed_count ? `, ${batch.failed_count} failed` : '') + '.'
        );
        this.parsedRows.set([]);
        this._historyLoaded = true;
        this.loadHistory();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Import failed.');
      }
    });
  }
}
