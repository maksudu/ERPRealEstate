import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectFinancialDimensionConfig } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  CustomButtonComponent,
  StatusBadgeComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-dimension-config-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ProjectIncomeExpenditureNavComponent,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    CustomButtonComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-project-income-expenditure-nav></app-project-income-expenditure-nav>

      <!-- Dimension Requirements Card Summary -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Dimensions</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">9 Dimensions</p>
          <p class="text-[11px] text-muted-foreground mt-1">
            Company, Project, Tower, Unit, Cost Centre, Phase, Category, Party, Budget
          </p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configured Active Rules</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">{{ totalRecords() }} Rules</p>
          <p class="text-[11px] text-muted-foreground mt-1">Configured for Accounts & Transaction Types</p>
        </div>

        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enforcement Status</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-2">Strict Validation</p>
          <p class="text-[11px] text-muted-foreground mt-1">Prevents untagged journal entries & out-of-budget leaks</p>
        </div>
      </div>

      <!-- Main Card Container -->
      <app-card-container
        title="11.1 Project Financial Dimensions Mandatory Configuration"
        subtitle="Not every account requires every dimension; configure which dimensions are mandatory for each account and transaction type"
        badge="Dimensions Engine"
      >
        <!-- Actions in Card Header -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="loadConfigs()"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <span>Refresh</span>
          </button>

          <a
            routerLink="/accounts/project-income-expenditure/dimensions/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Add Dimension Rule</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <app-custom-input
              placeholder="Search account code, name or notes..."
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
              categoryCode="TRANSACTION_TYPE"
              placeholder="All Transaction Types"
              [(ngModel)]="transactionTypeFilter"
              (selectionChange)="loadConfigs()"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>

          <div class="flex items-center justify-end">
            <span class="text-xs text-muted-foreground">
              Showing {{ items().length }} of {{ totalRecords() }} configuration rules
            </span>
          </div>
        </div>

        <!-- Dimension Configuration Rules Table -->
        <div class="overflow-x-auto border border-border rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-secondary/50 text-muted-foreground uppercase text-[10px] font-bold border-b border-border">
              <tr>
                <th class="py-3 px-3">Rule Target</th>
                <th class="py-3 px-3">Txn Type</th>
                <th class="py-3 px-2 text-center" title="Company & Branch">Company</th>
                <th class="py-3 px-2 text-center" title="Project">Project</th>
                <th class="py-3 px-2 text-center" title="Building / Tower">Tower</th>
                <th class="py-3 px-2 text-center" title="Unit / Apartment">Unit</th>
                <th class="py-3 px-2 text-center" title="Department / Cost Centre">Cost Centre</th>
                <th class="py-3 px-2 text-center" title="Construction Phase">Phase</th>
                <th class="py-3 px-2 text-center" title="Cost / Revenue Category">Cost Cat</th>
                <th class="py-3 px-2 text-center" title="Supplier / Customer">Party</th>
                <th class="py-3 px-2 text-center" title="Budget Line">Budget</th>
                <th class="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              @if (loading()) {
                <tr>
                  <td colspan="12" class="py-8 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-4 h-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
                      <span>Loading dimension configurations...</span>
                    </div>
                  </td>
                </tr>
              } @else if (items().length === 0) {
                <tr>
                  <td colspan="12" class="py-8 text-center text-muted-foreground">
                    <p class="font-medium">No dimension rules found matching your filters.</p>
                    <p class="text-[11px] mt-1">Click "Add Dimension Rule" above to create a new rule.</p>
                  </td>
                </tr>
              } @else {
                @for (r of items(); track r.id) {
                  <tr class="hover:bg-secondary/20 transition-colors">
                    <td class="py-3 px-3">
                      @if (r.account_code) {
                        <div class="font-bold text-foreground font-mono text-[11px]">{{ r.account_code }}</div>
                        <div class="text-[11px] text-muted-foreground">{{ r.account_name }}</div>
                      } @else if (r.account_type) {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-600">
                          Account Type: {{ r.account_type }}
                        </span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600">
                          Global Default Rule
                        </span>
                      }
                      @if (r.notes) {
                        <p class="text-[10px] text-muted-foreground italic mt-0.5">{{ r.notes }}</p>
                      }
                    </td>

                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-foreground">
                        {{ r.transaction_type }}
                      </span>
                    </td>

                    <!-- Mandatory indicators -->
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_company_branch_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_company_branch_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_project_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_project_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_tower_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_tower_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_unit_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_unit_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_department_cost_center_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_department_cost_center_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_construction_phase_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_construction_phase_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_cost_category_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_cost_category_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_party_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_party_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>
                    <td class="py-3 px-2 text-center">
                      <span [ngClass]="r.is_budget_line_mandatory ? 'text-emerald-600 font-bold' : 'text-slate-300 dark:text-slate-700'">
                        {{ r.is_budget_line_mandatory ? '● Req' : '—' }}
                      </span>
                    </td>

                    <td class="py-3 px-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/accounts/project-income-expenditure/dimensions/edit', r.id]"
                          class="p-1 rounded-lg hover:bg-secondary text-primary hover:text-primary/80 transition-colors"
                          title="Edit Dimension Rule"
                        >
                          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          (click)="deleteConfig(r.id!)"
                          class="p-1 rounded-lg hover:bg-secondary text-rose-600 hover:text-rose-700 transition-colors"
                          title="Delete Dimension Rule"
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
export class DimensionConfigListComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);

  items = signal<ProjectFinancialDimensionConfig[]>([]);
  totalRecords = signal<number>(0);
  loading = signal<boolean>(false);
  limit = 15;
  offset = signal<number>(0);

  searchQuery = '';
  transactionTypeFilter = '';

  currentPage = () => Math.floor(this.offset() / this.limit) + 1;
  totalPages = () => Math.max(1, Math.ceil(this.totalRecords() / this.limit));

  ngOnInit(): void {
    this.loadConfigs();
  }

  loadConfigs(): void {
    this.loading.set(true);
    this.service.getDimensionConfigs({
      search: this.searchQuery || undefined,
      transaction_type: this.transactionTypeFilter || undefined,
      limit: this.limit,
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.totalRecords.set(res.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.offset.set(0);
    this.loadConfigs();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.set(Math.max(0, this.offset() - this.limit));
      this.loadConfigs();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalRecords()) {
      this.offset.set(this.offset() + this.limit);
      this.loadConfigs();
    }
  }

  deleteConfig(id: number): void {
    if (confirm('Are you sure you want to delete this dimension rule?')) {
      this.service.deleteDimensionConfig(id).subscribe({
        next: () => {
          this.loadConfigs();
        }
      });
    }
  }
}
