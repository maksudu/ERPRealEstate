import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectIncomeTransaction } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  StatusBadgeComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-project-income-list',
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
        <!-- KPI 1: Recognized Revenue -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recognized Revenue</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">
            ৳{{ (totalRecognized() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Recognized under approved policy (IFRS 15 / POC)</p>
        </div>

        <!-- KPI 2: Cash Inflow Collected -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Cash Inflow</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">
            ৳{{ (totalCollected() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Actual installments & booking advances collected</p>
        </div>

        <!-- KPI 3: Unearned Revenue -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unearned Revenue</span>
            <span class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-2">
            ৳{{ (totalUnearned() / 10000000) | number:'1.2-2' }} Cr
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Advances collected in excess of recognized revenue</p>
        </div>

        <!-- KPI 4: Transaction Count -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Income Entries</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">
            {{ totalRecords() }}
          </p>
          <p class="text-[11px] text-muted-foreground mt-1">Across 5 project revenue categories</p>
        </div>
      </div>

      <!-- Main Income Register Card -->
      <app-card-container
        title="11.2 Project Income Register & Revenue Recognition"
        subtitle="Property-sale income, rental income, service income, parking and other contractual revenues with 11.1 dimension tagging"
        badge="Section 11.2"
      >
        <!-- Card Actions -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="loadIncomes()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh</span>
          </button>

          <a
            routerLink="/accounts/project-income-expenditure/income/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Project Income</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <app-custom-input
              placeholder="Search income #, customer, ref..."
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
              categoryCode="INCOME_TYPE"
              placeholder="All Income Categories"
              [(ngModel)]="categoryFilter"
              (selectionChange)="loadIncomes()"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>

          <div>
            <select
              [(ngModel)]="statusFilter"
              (change)="loadIncomes()"
              class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="POSTED">POSTED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="AUDITED">AUDITED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
          </div>

          <div class="flex items-center justify-end">
            <span class="text-xs text-muted-foreground">
              Showing {{ items().length }} of {{ totalRecords() }} transactions
            </span>
          </div>
        </div>

        <!-- Table of Incomes -->
        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th class="py-3 px-3">Income Ref & Date</th>
                <th class="py-3 px-3">Project & Financial Dimensions</th>
                <th class="py-3 px-3">Category & Party</th>
                <th class="py-3 px-2">Recognition Policy</th>
                <th class="py-3 px-3 text-right">Recognized Revenue</th>
                <th class="py-3 px-3 text-right">Cash Inflow</th>
                <th class="py-3 px-3 text-right">Unearned (Adv)</th>
                <th class="py-3 px-2 text-center">Status</th>
                <th class="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @if (loading()) {
                <tr>
                  <td colspan="9" class="py-8 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                      <span>Loading project incomes...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="9" class="py-8 text-center text-muted-foreground">
                    <p class="font-medium">No project income records found.</p>
                    <p class="text-[11px] mt-1">Click "Record Project Income" above to register property revenue.</p>
                  </td>
                </tr>
              } @else {
                @for (r of items(); track r.id) {
                  <tr class="hover:bg-secondary/20 transition-colors">
                    <td class="py-3 px-3">
                      <div class="font-mono font-bold text-foreground text-[11px]">{{ r.income_number }}</div>
                      <div class="text-[11px] text-muted-foreground">{{ r.transaction_date }}</div>
                      @if (r.reference_no) {
                        <div class="text-[10px] text-muted-foreground mt-0.5">Ref: {{ r.reference_no }}</div>
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
                        @if (r.unit_number) {
                          <span class="px-1.5 py-0.2 rounded text-[10px] bg-secondary text-muted-foreground border border-border">
                            Unit: {{ r.unit_number }}
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
                      <div class="text-[11px] text-muted-foreground">{{ r.party_name || r.customer_name || 'Customer' }}</div>
                    </td>

                    <td class="py-3 px-2">
                      <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        {{ r.recognition_policy }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        ৳{{ r.recognized_amount | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-bold font-mono text-blue-600 dark:text-blue-400">
                        ৳{{ r.cash_collected_amount | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <span class="font-mono text-amber-600 dark:text-amber-400" [ngClass]="{'font-bold': r.unearned_revenue > 0}">
                        ৳{{ r.unearned_revenue | number:'1.2-2' }}
                      </span>
                    </td>

                    <td class="py-3 px-2 text-center">
                      <app-status-badge [status]="r.status"></app-status-badge>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/accounts/project-income-expenditure/income/edit', r.id]"
                          class="p-1 rounded-lg hover:bg-secondary text-primary hover:text-primary/80 transition-colors"
                          title="Edit Income"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          (click)="deleteIncome(r.id!)"
                          class="p-1 rounded-lg hover:bg-secondary text-rose-600 hover:text-rose-700 transition-colors"
                          title="Delete Income"
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
export class ProjectIncomeListComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);

  items = signal<ProjectIncomeTransaction[]>([]);
  totalRecords = signal<number>(0);
  loading = signal<boolean>(false);
  limit = 15;
  offset = signal<number>(0);

  totalRecognized = signal<number>(0);
  totalCollected = signal<number>(0);
  totalUnearned = signal<number>(0);

  searchQuery = '';
  categoryFilter = '';
  statusFilter = '';

  currentPage = () => Math.floor(this.offset() / this.limit) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.totalRecords() / this.limit));

  ngOnInit(): void {
    this.loadIncomes();
  }

  loadIncomes(): void {
    this.loading.set(true);
    this.service.getIncomes({
      search: this.searchQuery || undefined,
      cost_category: this.categoryFilter || undefined,
      status: this.statusFilter || undefined,
      limit: this.limit,
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalRecords.set(res.total);
        this.totalRecognized.set(Number(res.total_recognized_amount) || 0);
        this.totalCollected.set(Number(res.total_collected_amount) || 0);
        this.totalUnearned.set(Number(res.total_unearned_revenue) || 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadIncomes();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.set(Math.max(0, this.offset() - this.limit));
      this.loadIncomes();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalRecords()) {
      this.offset.set(this.offset() + this.limit);
      this.loadIncomes();
    }
  }

  deleteIncome(id: number): void {
    if (confirm('Are you sure you want to delete this project income record?')) {
      this.service.deleteIncome(id).subscribe({
        next: () => {
          this.loadIncomes();
        }
      });
    }
  }
}
