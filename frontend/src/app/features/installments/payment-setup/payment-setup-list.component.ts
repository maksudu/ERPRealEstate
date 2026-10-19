import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InstallmentService } from '../../../core/services/installment.service';
import { PaymentPlanConfig } from '../../../core/models/installment.model';
import { InstallmentsNavComponent } from '../installments-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-payment-setup-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    InstallmentsNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-4">
      <app-installments-nav />

      <app-card-container
        title="01. Customer Payment Plan Configuration"
        subtitle="Manage master payment plan templates, installment frequencies, milestones, late fee rules, and rebate policies"
        badge="Submodule 01"
      >
        <div card-actions class="flex items-center gap-2">
          <app-button
            variant="primary"
            size="sm"
            (btnClick)="navigateToCreate()"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Create Payment Plan
          </app-button>
        </div>

        <!-- Filter & Search Bar -->
        <div class="p-3 mb-4 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Search Plan</label>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (input)="onSearchChange()"
              placeholder="Search code or plan name..."
              class="erp-input text-xs w-full"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Property Type</label>
            <app-searchable-select
              categoryCode="PROPERTY_TYPE"
              placeholder="All Property Types"
              [allowCreateNew]="true"
              [(ngModel)]="selectedPropertyType"
              (selectionChange)="applyFilters()"
            />
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Installment Frequency</label>
            <app-searchable-select
              categoryCode="INSTALLMENT_FREQUENCY"
              placeholder="All Frequencies"
              [allowCreateNew]="true"
              [(ngModel)]="selectedFrequency"
              (selectionChange)="applyFilters()"
            />
          </div>

          <div class="flex items-end gap-2">
            <div class="flex-1">
              <label class="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">Approval Status</label>
              <app-searchable-select
                categoryCode="APPROVAL_STATUS"
                placeholder="All Statuses"
                [allowCreateNew]="true"
                [(ngModel)]="selectedStatus"
                (selectionChange)="applyFilters()"
              />
            </div>
            <app-button variant="outline" size="sm" (btnClick)="resetFilters()">
              Reset
            </app-button>
          </div>
        </div>

        <!-- Plans Table with Server Pagination -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
            <thead class="bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3 text-left">Plan Code & Name</th>
                <th class="px-4 py-3 text-left">Property Type</th>
                <th class="px-4 py-3 text-right">Booking %</th>
                <th class="px-4 py-3 text-right">Down Payment %</th>
                <th class="px-4 py-3 text-center">Frequency & Count</th>
                <th class="px-4 py-3 text-left">Late Fee / Rebate</th>
                <th class="px-4 py-3 text-center">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              @if (isLoading()) {
                <tr>
                  <td colspan="8" class="text-center py-8 text-slate-500">
                    <div class="inline-flex items-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading payment plans...</span>
                    </div>
                  </td>
                </tr>
              } @else if (plans().length === 0) {
                <tr>
                  <td colspan="8" class="text-center py-10 text-slate-500">
                    <p class="font-medium">No payment plan configurations found.</p>
                    <p class="text-[11px] text-slate-400 mt-1">Click "+ Create Payment Plan" to define customer amortization rules.</p>
                  </td>
                </tr>
              } @else {
                @for (plan of plans(); track plan.id) {
                  <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-bold text-slate-900 dark:text-white">{{ plan.plan_name }}</div>
                      <div class="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">{{ plan.plan_code }}</div>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {{ plan.property_type }}
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      {{ plan.booking_percent }}%
                    </td>
                    <td class="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-100">
                      {{ plan.down_payment_percent }}%
                    </td>
                    <td class="px-4 py-3 text-center">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {{ plan.installment_frequency }} ({{ plan.installment_count }}x)
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div>Fee: {{ plan.late_fee_rate }}{{ plan.late_fee_type === 'PERCENTAGE' ? '%' : ' ৳' }} ({{ plan.grace_period_days }}d grace)</div>
                      <div class="text-[10px] text-slate-500">Rebate: {{ plan.rebate_rate }}{{ plan.rebate_type === 'PERCENTAGE' ? '%' : ' ৳' }}</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-status-badge
                        [status]="plan.approval_status"
                        [labelEn]="plan.approval_status"
                        [variant]="plan.approval_status === 'APPROVED' ? 'success' : (plan.approval_status === 'REJECTED' ? 'danger' : 'warning')"
                      />
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          (click)="editPlan(plan.id)"
                          class="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Plan"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="deletePlan(plan.id)"
                          class="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Plan"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <!-- Paging Controls -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing <span class="font-semibold text-slate-900 dark:text-slate-100">{{ currentOffset() + 1 }}</span> to
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ Math.min(currentOffset() + currentLimit(), totalCount()) }}</span> of
            <span class="font-semibold text-slate-900 dark:text-slate-100">{{ totalCount() }}</span> plans
          </div>
          <div class="flex items-center gap-2">
            <button
              [disabled]="currentOffset() === 0"
              (click)="prevPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              [disabled]="currentOffset() + currentLimit() >= totalCount()"
              (click)="nextPage()"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>
    </div>
  `
})
export class PaymentSetupListComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private router = inject(Router);

  plans = signal<PaymentPlanConfig[]>([]);
  totalCount = signal<number>(0);
  currentLimit = signal<number>(20);
  currentOffset = signal<number>(0);
  isLoading = signal<boolean>(false);

  searchQuery = '';
  selectedPropertyType = '';
  selectedFrequency = '';
  selectedStatus = '';

  Math = Math;

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.isLoading.set(true);
    this.installmentService.getPaymentPlans({
      search: this.searchQuery || undefined,
      property_type: this.selectedPropertyType || undefined,
      frequency: this.selectedFrequency || undefined,
      status: this.selectedStatus || undefined,
      limit: this.currentLimit(),
      offset: this.currentOffset()
    }).subscribe({
      next: (res) => {
        this.plans.set(res.items);
        this.totalCount.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onSearchChange(): void {
    this.currentOffset.set(0);
    this.loadPlans();
  }

  applyFilters(): void {
    this.currentOffset.set(0);
    this.loadPlans();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedPropertyType = '';
    this.selectedFrequency = '';
    this.selectedStatus = '';
    this.currentOffset.set(0);
    this.loadPlans();
  }

  prevPage(): void {
    if (this.currentOffset() > 0) {
      this.currentOffset.set(Math.max(0, this.currentOffset() - this.currentLimit()));
      this.loadPlans();
    }
  }

  nextPage(): void {
    if (this.currentOffset() + this.currentLimit() < this.totalCount()) {
      this.currentOffset.set(this.currentOffset() + this.currentLimit());
      this.loadPlans();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/installments/payment-setup/create']);
  }

  editPlan(id: number): void {
    this.router.navigate(['/installments/payment-setup/edit', id]);
  }

  deletePlan(id: number): void {
    if (confirm('Are you sure you want to delete this payment plan?')) {
      this.installmentService.deletePaymentPlan(id).subscribe({
        next: () => {
          this.loadPlans();
        }
      });
    }
  }
}
