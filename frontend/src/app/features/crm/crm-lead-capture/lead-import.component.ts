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
    <!-- Lead Bulk Import & History Wrapped in Single Card Container -->
    <app-card-container
      title="Lead Bulk Import & History"
      subtitle="Spec 4.2 — Upload CSV exported from Excel or paste JSON rows with automatic duplicate suppression and audit tracking"
      paddingClass="p-0"
    >
      <!-- Card Action Buttons -->
      <div card-actions class="flex items-center gap-2">
        <a
          routerLink="/crm/lead-capture"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <i class="ri-arrow-left-line text-sm"></i>
          <span>Back to Register</span>
        </a>
      </div>

      <!-- Navigation Tabs -->
      <div class="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800">
        <app-custom-tabs
          [tabs]="tabs"
          [activeTabId]="activeTab()"
          variant="emerald"
          (tabChange)="onTabChange($event)"
        ></app-custom-tabs>
      </div>

      <!-- Tab 1: Upload & Import -->
      @if (activeTab() === 'IMPORT') {
        <div class="p-4 sm:p-6">
          <form [formGroup]="importForm" class="flex flex-col gap-6">
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
                [allowCreateNew]="true"
                [required]="true"
              ></app-searchable-select>
            </div>

            <!-- CSV File Upload Section -->
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
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
                class="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer erp-input rounded-xl"
              />
              @if (parsedRows().length > 0) {
                <div class="flex items-center gap-2 text-xs text-emerald-600 font-medium pt-1">
                  <i class="ri-checkbox-circle-line text-sm"></i>
                  <span>Parsed {{ parsedRows().length }} rows from file successfully.</span>
                </div>
              }
            </div>

            <!-- JSON / Manual Paste -->
            <app-custom-textarea
              label="Or Paste JSON Array"
              placeholder='[{"lead_name":"Rafiqul Islam","primary_phone":"+8801711000000","email":"rafiq@example.com","lead_source_id":"EXHIBITION","campaign_name":"REHAB Winter Fair"}]'
              formControlName="jsonPayload"
              [rows]="6"
              hint="Each row must include lead_name and primary_phone. Other fields optional."
            ></app-custom-textarea>

            @if (importResult()) {
              <div class="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <i class="ri-checkbox-circle-line text-base shrink-0 mt-0.5"></i>
                <span>{{ importResult() }}</span>
              </div>
            }

            <div class="flex justify-end gap-3 pt-2">
              <a
                routerLink="/crm/lead-capture"
                class="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
              >
                Cancel
              </a>
              <app-custom-button
                variant="primary"
                [disabled]="importForm.invalid || isSubmitting() || (parsedRows().length === 0 && !importForm.get('jsonPayload')?.value)"
                [loading]="isSubmitting()"
                (clicked)="submitImport()"
              >
                <span class="flex items-center gap-1.5">
                  <i class="ri-upload-cloud-line text-sm"></i>
                  <span>Import Leads Now</span>
                </span>
              </app-custom-button>
            </div>
          </form>
        </div>
      } @else {
        <!-- Tab 2: Import History (server-side paged) -->
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
                      <div class="flex flex-col items-center gap-2">
                        <i class="ri-history-line text-4xl"></i>
                        <span>No import batches recorded yet.</span>
                      </div>
                    </td>
                  </tr>
                } @else {
                  @for (batch of importHistory(); track batch.id) {
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-colors">
                      <td class="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        IMP-{{ batch.id }}
                      </td>
                      <td class="px-4 py-3 text-slate-700 dark:text-slate-200 font-medium">{{ batch.filename }}</td>
                      <td class="px-4 py-3 text-slate-700 dark:text-slate-200">{{ batch.source_channel || '—' }}</td>
                      <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200 font-medium">{{ batch.total_rows }}</td>
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
          <div class="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
            <span class="text-[11px] text-slate-500 dark:text-slate-400">
              Showing {{ historyFromRow() }}–{{ historyToRow() }} of {{ historyTotal() }} batches · Page {{ historyPage() }} of {{ historyTotalPages() }}
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="historyPrev()"
                [disabled]="historyOffset() === 0"
                class="erp-button-secondary text-xs h-8 px-3 rounded-xl disabled:opacity-40 inline-flex items-center gap-1"
              >
                <i class="ri-arrow-left-s-line text-sm"></i>
                <span>Previous</span>
              </button>
              <button
                type="button"
                (click)="historyNext()"
                [disabled]="historyOffset() + historyLimit() >= historyTotal()"
                class="erp-button-secondary text-xs h-8 px-3 rounded-xl disabled:opacity-40 inline-flex items-center gap-1"
              >
                <span>Next</span>
                <i class="ri-arrow-right-s-line text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      }
    </app-card-container>
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

  ngOnInit(): void {}

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
        bedrooms: num('bedrooms') ? Math.floor(num('bedrooms')!) : null,
        notes: get('notes') || null
      });
    }
    return rows;
  }

  splitCsvLine(line: string): string[] {
    const values: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur);
    return values;
  }

  submitImport(): void {
    let rows: LeadImportRow[] = [...this.parsedRows()];
    const jsonText = this.importForm.get('jsonPayload')?.value?.trim();
    if (rows.length === 0 && jsonText) {
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          rows = parsed;
        } else {
          alert('JSON payload must be an array of objects.');
          return;
        }
      } catch (e) {
        alert('Invalid JSON: ' + (e as Error).message);
        return;
      }
    }

    if (rows.length === 0) {
      alert('No rows to import.');
      return;
    }

    this.isSubmitting.set(true);
    this.importResult.set(null);

    this.crmService.importLeads({
      filename: this.importForm.get('filename')?.value || 'manual_entry.csv',
      source_channel: this.importForm.get('source_channel')?.value || 'MANUAL_ENTRY',
      rows
    }).subscribe({
      next: (res: any) => {
        this.isSubmitting.set(false);
        this.importResult.set(
          `Import finished. Total: ${res.total_rows}, Success: ${res.success_count}, Duplicates Skipped: ${res.duplicate_count}, Failed: ${res.failed_count}. Batch: IMP-${res.batch_id}`
        );
        this.parsedRows.set([]);
        this.importForm.patchValue({ jsonPayload: '' });
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Import failed.');
      }
    });
  }
}
