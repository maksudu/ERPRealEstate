import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectExpenditureTransaction } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  StatusBadgeComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-project-expenditure-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ProjectIncomeExpenditureNavComponent,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-project-income-expenditure-nav></app-project-income-expenditure-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- KPI 1: Gross Posted Costs -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gross Incurred Cost</span>
            <span class="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-red-600 dark:text-red-400 mt-2">
            ৳{{ (totalGross() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Total posted invoices & work orders across 12 categories</p>
        </div>

        <!-- KPI 2: Statutory Deductions (TDS/VDS & Retention) -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">TDS & Withholdings</span>
            <span class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-2">
            ৳{{ (totalTax() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">NBR Section 52 TDS and VDS withholding deducted</p>
        </div>

        <!-- KPI 3: Net Cash Disbursed -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actual Cash Paid</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">
            ৳{{ (totalPaid() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Disbursed via Bank Transfer / Cheque</p>
        </div>

        <!-- KPI 4: Total Expenditures Count -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cost Entries</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">
            {{ totalRecords() }}
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Across 12 eligible expenditure categories</p>
        </div>
      </div>

      <!-- Main Expenditure Register Card -->
      <app-card-container
        title="11.3 Project Expenditure Register & Cost Accounting"
        subtitle="Tracking Land, Civil, MEP, Finishing, Contractor Bills, Site Ops, Financing Costs & Overheads with PO overlap reconciliation"
        badge="Section 11.3"
      >
        <!-- Card Actions -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="loadExpenditures()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh</span>
          </button>

          <a
            routerLink="/accounts/project-income-expenditure/expenditure/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Project Expenditure</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <app-custom-input
              placeholder="Search exp #, supplier, PO ref..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
              iconPosition="left"
            >
              <svg icon class="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </app-custom-input>
          </div>

          <div>
            <app-searchable-select
              categoryCode="EXPENDITURE_CATEGORY"
              placeholder="All Expenditure Categories"
              [(ngModel)]="categoryFilter"
              (selectionChange)="loadExpenditures()"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>

          <div>
            <app-searchable-select
              categoryCode="CONSTRUCTION_PHASE"
              placeholder="All Construction Phases"
              [(ngModel)]="phaseFilter"
              (selectionChange)="loadExpenditures()"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>

          <div class="flex items-center justify-end">
            <span class="text-xs text-muted-foreground">
              Showing {{ items().length }} of {{ totalRecords() }} expenditure entries
            </span>
          </div>
        </div>

        <!-- Table of Expenditures -->
        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th class="py-3 px-3">Exp Ref & Date</th>
                <th class="py-3 px-3">Project & Dimensions</th>
                <th class="py-3 px-3">Cost Category & Phase</th>
                <th class="py-3 px-3">Supplier / Party</th>
                <th class="py-3 px-3 text-right">Gross Amount</th>
                <th class="py-3 px-3 text-right">TDS / Ret.</th>
                <th class="py-3 px-3 text-right">Net Payable</th>
                <th class="py-3 px-3 text-right">Paid Amount</th>
                <th class="py-3 px-2 text-center">PO Reconciled</th>
                <th class="py-3 px-2 text-center">Payment</th>
                <th class="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @if (loading()) {
                <tr>
                  <td colspan="11" class="py-8 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                      <span>Loading project expenditures...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="11" class="py-8 text-center text-muted-foreground">
                    <p class="font-medium">No project expenditure records found.</p>
                    <p class="text-[11px] mt-1">Click "Record Project Expenditure" above to enter costs.</p>
                  </td>
                </tr>
              } @else {
                @for (r of items(); track r.id) {
                  <tr class="hover:bg-secondary/20 transition-colors">
                    <td class="py-3 px-3">
                      <div class="font-mono font-bold text-foreground text-[11px]">{{ r.expenditure_number }}</div>
                      <div class="text-[11px] text-muted-foreground">{{ r.transaction_date }}</div>
                      @if (r.committed_po_reference) {
                        <div class="text-[10px] text-blue-600 font-mono mt-0.5" title="Purchase Order Reference">
                          PO: {{ r.committed_po_reference }}
                        </div>
                      }
                    </td>

                    <td class="py-3 px-3">
                      <div class="font-bold text-foreground">{{ r.project_name || 'Project #' + r.project_id }}</div>
                      <div class="flex flex-wrap items-center gap-1.5 mt-1">
                        <span class="px-1.5 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border">
                          {{ r.branch_name }}
                        </span>
                        @if (r.tower_name) {
                          <span class="px-1.5 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border">
                            Tower: {{ r.tower_name }}
                          </span>
                        }
                        @if (r.cost_center_name) {
                          <span class="px-1.5 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border">
                            CC: {{ r.cost_center_name }}
                          </span>
                        }
                      </div>
                    </td>

                    <td class="py-3 px-3">
                      <div class="font-medium text-foreground text-[11px]">{{ r.cost_category }}</div>
                      <div class="text-[10px] text-muted-foreground">
                        Phase: {{ r.construction_phase || 'General Site' }}
                      </div>
                    </td>

                    <td class="py-3 px-3">
                      <div class="font-medium text-foreground text-[11px]">{{ r.party_display_name || r.party_name || 'Allied Party' }}</div>
                      <div class="text-[10px] text-muted-foreground">{{ r.party_type }}</div>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-bold font-mono text-foreground">
                        ৳{{ r.gross_amount | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-mono text-amber-600 dark:text-amber-400">
                        ৳{{ (r.tax_vat_deducted + r.retention_deducted) | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-bold font-mono text-red-600 dark:text-red-400">
                        ৳{{ r.net_payable_amount | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-bold font-mono text-blue-600 dark:text-blue-400">
                        ৳{{ r.paid_amount | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-2 text-center">
                      @if (r.committed_po_reference) {
                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Reconciled against committed PO">
                          Reconciled
                        </span>
                      } @else {
                        <span class="text-muted-foreground text-[10px]">Direct</span>
                      }
                    </td>

                    <td class="py-3 px-2 text-center">
                      <span
                        class="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        [ngClass]="{
                          'bg-emerald-500/10 text-emerald-600': r.payment_status === 'PAID',
                          'bg-amber-500/10 text-amber-600': r.payment_status === 'PARTIALLY_PAID',
                          'bg-red-500/10 text-red-600': r.payment_status === 'UNPAID'
                        }"
                      >
                        {{ r.payment_status }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/accounts/project-income-expenditure/expenditure/edit', r.id]"
                          class="p-1 rounded-lg hover:bg-secondary text-primary hover:text-primary/80 transition-colors"
                          title="Edit Expenditure"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          (click)="deleteExpenditure(r.id!)"
                          class="p-1 rounded-lg hover:bg-secondary text-rose-600 hover:text-rose-700 transition-colors"
                          title="Delete Expenditure"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-border">
          <div class="text-xs text-muted-foreground">
            Page {{ currentPage() }} of {{ totalPages() }}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="offset() === 0"
              (click)="prevPage()"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              [disabled]="offset() + limit >= totalRecords()"
              (click)="nextPage()"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-secondary disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class ProjectExpenditureListComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);

  items = signal<ProjectExpenditureTransaction[]>([]);
  totalRecords = signal<number>(0);
  loading = signal<boolean>(false);
  limit = 15;
  offset = signal<number>(0);

  totalGross = signal<number>(0);
  totalTax = signal<number>(0);
  totalPaid = signal<number>(0);

  searchQuery = '';
  categoryFilter = '';
  phaseFilter = '';

  currentPage = () => Math.floor(this.offset() / this.limit) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.totalRecords() / this.limit));

  ngOnInit(): void {
    this.loadExpenditures();
  }

  loadExpenditures(): void {
    this.loading.set(true);
    this.service.getExpenditures({
      search: this.searchQuery || undefined,
      cost_category: this.categoryFilter || undefined,
      construction_phase: this.phaseFilter || undefined,
      limit: this.limit,
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalRecords.set(res.total);
        this.totalGross.set(Number(res.total_gross_amount) || 0);
        this.totalTax.set(Number(res.total_tax_vat_deducted) || 0);
        this.totalPaid.set(Number(res.total_paid_amount) || 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadExpenditures();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.set(Math.max(0, this.offset() - this.limit));
      this.loadExpenditures();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalRecords()) {
      this.offset.set(this.offset() + this.limit);
      this.loadExpenditures();
    }
  }

  deleteExpenditure(id: number): void {
    if (confirm('Are you sure you want to delete this expenditure entry?')) {
      this.service.deleteExpenditure(id).subscribe({
        next: () => {
          this.loadExpenditures();
        }
      });
    }
  }
}
