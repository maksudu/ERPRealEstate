import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  StatusBadgeComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';
import { HrmsService } from '../hrms.service';

export interface SubViewConfig {
  id: string;
  title: string;
  description: string;
  badge: string;
  apiType: 'loan' | 'advance' | 'policy' | 'ess';
  essRecordType?: string;
}

export interface AmortizationScheduleRow {
  installmentNumber: number;
  period: string;
  openingBalance: number;
  principalComponent: number;
  interestComponent: number;
  emi: number;
  closingBalance: number;
}

@Component({
  selector: 'app-loans-benefits',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-6 max-w-7xl mx-auto">
      <!-- Navigation Pills for all 10 sub-modules -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
        @for (v of navViews; track v.id) {
          <button
            type="button"
            (click)="selectSubView(v.id)"
            class="px-3.5 py-2 text-xs font-semibold whitespace-nowrap rounded-xl transition-all duration-150 flex items-center gap-2"
            [ngClass]="{
              'bg-primary-600 text-white shadow-sm shadow-primary-500/20': currentSubView() === v.id,
              'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800': currentSubView() !== v.id
            }"
          >
            <span>{{ v.title }}</span>
            <span
              class="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
              [ngClass]="{
                'bg-white/20 text-white': currentSubView() === v.id,
                'bg-slate-100 dark:bg-slate-800 text-slate-500': currentSubView() !== v.id
              }"
            >{{ v.badge }}</span>
          </button>
        }
      </div>

      <!-- Dismissible Success / Error Alerts -->
      @if (alertMessage()) {
        <div
          class="flex items-center justify-between p-4 rounded-xl border transition-all text-xs font-medium animate-fadeIn"
          [ngClass]="{
            'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300': alertType() === 'success',
            'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300': alertType() === 'error'
          }"
        >
          <div class="flex items-center gap-2">
            @if (alertType() === 'success') {
              <svg class="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            } @else {
              <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            }
            <span>{{ alertMessage() }}</span>
          </div>
          <button (click)="alertMessage.set(null)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      }

      <!-- Main Shell Inside Single Card Container -->
      <app-card-container
        [title]="currentViewMeta().title"
        [subtitle]="currentViewMeta().description"
        [badge]="currentViewMeta().badge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          @if (viewMode() === 'list') {
            @if (currentSubView() === 'installment-schedules') {
              <app-custom-button
                variant="outline"
                size="sm"
                label="Recalculate Table"
                (btnClick)="loadCurrentViewData()"
              ></app-custom-button>
            }
            <app-custom-button
              variant="primary"
              size="sm"
              [label]="'+ Apply / New ' + getCreateLabel()"
              (btnClick)="openCreateForm()"
            ></app-custom-button>
          } @else {
            <app-custom-button
              variant="outline"
              size="sm"
              label="← Back to Register"
              (btnClick)="viewMode.set('list')"
            ></app-custom-button>
          }
        </div>

        <!-- 1. LIST VIEW MODE -->
        @if (viewMode() === 'list') {
          <!-- Metric KPI Strip -->
          <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Principal / Value</div>
                <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ {{ kpiTotalValue() | number:'1.0-0' }}</div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Recovered / Settled</div>
                <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ {{ kpiRecoveredValue() | number:'1.0-0' }}</div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </div>
              <div>
                <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Outstanding Balance</div>
                <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ {{ kpiBalanceValue() | number:'1.0-0' }}</div>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <div>
                <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Inquiries / Apps</div>
                <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ totalRecords() }} Records</div>
              </div>
            </div>
          </div>

          <!-- Filter & Search Toolbar -->
          <div class="p-6 pb-2">
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div class="w-full sm:w-80">
                <app-custom-input
                  placeholder="Search staff, code, reference..."
                  [(ngModel)]="searchQuery"
                  (ngModelChange)="onFilterChanged()"
                ></app-custom-input>
              </div>

              <div class="flex items-center gap-3 w-full sm:w-auto">
                <div class="w-48">
                  <app-searchable-select
                    categoryCode="HR_LOAN_STATUS"
                    placeholder="All Statuses"
                    [searchable]="true"
                    [allowCreateNew]="false"
                    [(ngModel)]="statusFilter"
                    (ngModelChange)="onFilterChanged()"
                  ></app-searchable-select>
                </div>

                <app-custom-button
                  variant="outline"
                  size="sm"
                  label="Refresh"
                  (btnClick)="loadCurrentViewData()"
                ></app-custom-button>
              </div>
            </div>
          </div>

          <!-- Loading Indicator -->
          @if (isLoading()) {
            <div class="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              <div class="inline-block animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mb-2"></div>
              <div>Loading real-time records from server...</div>
            </div>
          } @else if (tableItems().length === 0) {
            <!-- Empty state -->
            <div class="p-16 text-center">
              <div class="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
              </div>
              <div class="text-sm font-semibold text-slate-800 dark:text-slate-200">No records found</div>
              <div class="text-xs text-slate-500 max-w-sm mx-auto mt-1">There are no records matching your query. Click below to add a new record.</div>
              <div class="mt-4">
                <app-custom-button
                  variant="primary"
                  size="sm"
                  [label]="'+ Create ' + getCreateLabel()"
                  (btnClick)="openCreateForm()"
                ></app-custom-button>
              </div>
            </div>
          } @else {
            <!-- Dynamic Data Table based on Subview -->
            <div class="p-6 pt-2 overflow-x-auto">
              <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
                  <tr>
                    @if (isPolicyView()) {
                      <th class="px-4 py-3 rounded-l-xl">Policy Code</th>
                      <th class="px-4 py-3">Policy Name</th>
                      <th class="px-4 py-3">Category Type</th>
                      <th class="px-4 py-3">Employee %</th>
                      <th class="px-4 py-3">Employer %</th>
                      <th class="px-4 py-3">Eligibility</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3 text-right rounded-r-xl">Actions</th>
                    } @else if (isAdvanceView()) {
                      <th class="px-4 py-3 rounded-l-xl">Advance ID</th>
                      <th class="px-4 py-3">Staff Employee</th>
                      <th class="px-4 py-3">Advance Amount</th>
                      <th class="px-4 py-3">Recovery Period</th>
                      <th class="px-4 py-3">Recovered</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3 text-right rounded-r-xl">Actions</th>
                    } @else if (isEssView()) {
                      <th class="px-4 py-3 rounded-l-xl">Claim Code</th>
                      <th class="px-4 py-3">Employee</th>
                      <th class="px-4 py-3">Title / Destination</th>
                      <th class="px-4 py-3">Claim Amount</th>
                      <th class="px-4 py-3">Record Date</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3 text-right rounded-r-xl">Actions</th>
                    } @else {
                      <!-- Standard Staff Loan view (loans, loan-approvals, loan-disbursements, installment-schedules, loan-recoveries) -->
                      <th class="px-4 py-3 rounded-l-xl">Loan Code</th>
                      <th class="px-4 py-3">Staff Employee</th>
                      <th class="px-4 py-3">Loan Type</th>
                      <th class="px-4 py-3">Principal Amount</th>
                      <th class="px-4 py-3">Tenure & EMI</th>
                      <th class="px-4 py-3">Recovered / Balance</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3 text-right rounded-r-xl">Actions</th>
                    }
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  @for (item of tableItems(); track item.id) {
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition-colors">
                      @if (isPolicyView()) {
                        <td class="px-4 py-3 font-mono font-bold text-primary-600 dark:text-primary-400">{{ item.policy_code }}</td>
                        <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{{ item.policy_name }}</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold">{{ item.policy_type }}</span>
                        </td>
                        <td class="px-4 py-3 font-mono">{{ item.employee_contribution_pct }}%</td>
                        <td class="px-4 py-3 font-mono">{{ item.employer_contribution_pct }}%</td>
                        <td class="px-4 py-3">{{ item.eligibility_months }} Months</td>
                        <td class="px-4 py-3">
                          <app-status-badge [status]="item.is_active ? 'ACTIVE' : 'INACTIVE'"></app-status-badge>
                        </td>
                        <td class="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            (click)="editPolicy(item)"
                            class="px-2.5 py-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition-colors"
                          >Edit</button>
                          <button
                            type="button"
                            (click)="deleteItem(item.id)"
                            class="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          >Delete</button>
                        </td>
                      } @else if (isAdvanceView()) {
                        <td class="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">ADV-{{ item.id }}</td>
                        <td class="px-4 py-3">
                          <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employee_name || 'Staff Member' }}</div>
                          <div class="text-[10px] text-slate-500 font-mono">{{ item.employee_code || ('EMP-' + item.employee_id) }}</div>
                        </td>
                        <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳ {{ item.advance_amount | number }}</td>
                        <td class="px-4 py-3 font-mono">{{ item.recovery_period }}</td>
                        <td class="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">৳ {{ item.recovered_amount | number }}</td>
                        <td class="px-4 py-3">
                          <app-status-badge [status]="item.status"></app-status-badge>
                        </td>
                        <td class="px-4 py-3 text-right space-x-1">
                          @if (item.status === 'PENDING') {
                            <button
                              type="button"
                              (click)="quickApproveAdvance(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                            >Approve</button>
                          }
                          <button
                            type="button"
                            (click)="editAdvance(item)"
                            class="px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg"
                          >Edit</button>
                          <button
                            type="button"
                            (click)="deleteItem(item.id)"
                            class="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >Delete</button>
                        </td>
                      } @else if (isEssView()) {
                        <td class="px-4 py-3 font-mono font-bold text-purple-600 dark:text-purple-400">{{ item.reference }}</td>
                        <td class="px-4 py-3">
                          <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employee_name || 'Staff Employee' }}</div>
                          <div class="text-[10px] text-slate-500 font-mono">{{ item.employee_code || ('EMP-' + item.employee_id) }}</div>
                        </td>
                        <td class="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{{ item.title }}</td>
                        <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳ {{ item.amount | number }}</td>
                        <td class="px-4 py-3 font-mono">{{ item.record_date }}</td>
                        <td class="px-4 py-3">
                          <app-status-badge [status]="item.status"></app-status-badge>
                        </td>
                        <td class="px-4 py-3 text-right space-x-1">
                          <button
                            type="button"
                            (click)="viewEssDetail(item)"
                            class="px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg"
                          >View</button>
                          <button
                            type="button"
                            (click)="deleteItem(item.id)"
                            class="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                          >Delete</button>
                        </td>
                      } @else {
                        <!-- Standard Loan Table Item -->
                        <td class="px-4 py-3 font-mono font-bold text-amber-600 dark:text-amber-400">{{ item.loan_code }}</td>
                        <td class="px-4 py-3">
                          <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employee_name || 'Staff Employee' }}</div>
                          <div class="text-[10px] text-slate-500 font-mono">{{ item.employee_code || ('EMP-' + item.employee_id) }} • {{ item.department_name || 'Corporate' }}</div>
                        </td>
                        <td class="px-4 py-3">
                          <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.loan_type }}</div>
                          <div class="text-[10px] text-slate-500">Rate: {{ item.interest_rate }}% p.a.</div>
                        </td>
                        <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">৳ {{ item.principal_amount | number }}</td>
                        <td class="px-4 py-3">
                          <div class="font-mono">{{ item.tenure_months }} Mos (৳ {{ item.monthly_installment | number }}/mo)</div>
                          <div class="text-[10px] text-slate-500 font-mono">Disbursed: {{ item.disbursement_date }}</div>
                        </td>
                        <td class="px-4 py-3">
                          <div class="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">৳ {{ item.recovered_amount | number }}</div>
                          <div class="font-mono text-slate-500 text-[10px]">Bal: ৳ {{ item.remaining_balance | number }}</div>
                        </td>
                        <td class="px-4 py-3">
                          <app-status-badge [status]="item.status"></app-status-badge>
                        </td>
                        <td class="px-4 py-3 text-right space-x-1">
                          @if (currentSubView() === 'loan-approvals' && item.status === 'PENDING') {
                            <button
                              type="button"
                              (click)="quickApproveLoan(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg"
                            >Approve</button>
                            <button
                              type="button"
                              (click)="quickRejectLoan(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            >Reject</button>
                          } @else if (currentSubView() === 'loan-disbursements' && item.status === 'APPROVED') {
                            <button
                              type="button"
                              (click)="quickDisburseLoan(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                            >Disburse</button>
                          } @else {
                            <button
                              type="button"
                              (click)="viewLoanSchedule(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg"
                            >Schedule</button>
                            <button
                              type="button"
                              (click)="editLoan(item)"
                              class="px-2 py-1 text-[11px] font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg"
                            >Edit</button>
                            <button
                              type="button"
                              (click)="deleteItem(item.id)"
                              class="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                            >Delete</button>
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Server-Side Pagination Bar -->
            <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Showing <span class="font-semibold text-slate-800 dark:text-slate-200">{{ offset() + 1 }}</span>
                to <span class="font-semibold text-slate-800 dark:text-slate-200">{{ getEndOffset() }}</span>
                of <span class="font-semibold text-slate-800 dark:text-slate-200">{{ totalRecords() }}</span> entries
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  [disabled]="currentPage() <= 1"
                  (click)="prevPage()"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >Previous</button>

                <span class="px-2 font-mono">Page {{ currentPage() }} of {{ totalPages() }}</span>

                <button
                  type="button"
                  [disabled]="currentPage() >= totalPages()"
                  (click)="nextPage()"
                  class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >Next</button>
              </div>
            </div>
          }
        }

        <!-- 2. FULL-SCREEN CREATE / EDIT VIEW MODE -->
        @if (viewMode() === 'create' || viewMode() === 'edit') {
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
                  {{ viewMode() === 'create' ? 'Create New ' : 'Edit ' }} {{ currentViewMeta().title }}
                </h3>
                <p class="text-xs text-slate-500">Provide required information below to update records and audit ledger.</p>
              </div>
              <app-custom-button
                variant="outline"
                size="sm"
                label="Cancel & Return"
                (btnClick)="viewMode.set('list')"
              ></app-custom-button>
            </div>

            <!-- Dynamic Form Layout based on SubView -->
            @if (isPolicyView()) {
              <!-- Benefit Policy Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Code *</label>
                  <app-custom-input [(ngModel)]="formPolicyCode" placeholder="e.g. POL-PF-001"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Name *</label>
                  <app-custom-input [(ngModel)]="formPolicyName" placeholder="e.g. Recognized Provident Fund"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Category *</label>
                  <app-searchable-select
                    categoryCode="HR_BENEFIT_POLICY_TYPE"
                    [(ngModel)]="formPolicyType"
                    [allowCreateNew]="true"
                    [searchable]="true"
                    placeholder="Select or Create Policy Type"
                  ></app-searchable-select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Eligibility Period (Months)</label>
                  <app-custom-input type="number" [(ngModel)]="formEligibilityMonths" placeholder="6"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Contribution (%)</label>
                  <app-custom-input type="number" [(ngModel)]="formEmpContributionPct" placeholder="10.00"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employer Contribution (%)</label>
                  <app-custom-input type="number" [(ngModel)]="formEmployerContributionPct" placeholder="10.00"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Vesting Period (Years)</label>
                  <app-custom-input type="number" [(ngModel)]="formVestingYears" placeholder="3.0"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Calculation Basis</label>
                  <app-custom-input [(ngModel)]="formCalculationBasis" placeholder="BASIC_SALARY"></app-custom-input>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Description & Rules</label>
                  <app-custom-textarea [(ngModel)]="formDescription" placeholder="Statutory eligibility rules, contribution caps, and exit payout guidelines"></app-custom-textarea>
                </div>
              </div>
            } @else if (isAdvanceView()) {
              <!-- Salary Advance Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Employee *</label>
                  <app-searchable-select
                    [options]="employeeOptions()"
                    [(ngModel)]="formEmployeeId"
                    [allowCreateNew]="true"
                    (createNew)="navigateToEmployeeCreate()"
                    [searchable]="true"
                    placeholder="Search and Select Staff Member"
                  ></app-searchable-select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Amount (BDT ৳) *</label>
                  <app-custom-input type="number" [(ngModel)]="formAdvanceAmount" placeholder="e.g. 35000"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Requested Date *</label>
                  <app-custom-input type="date" [(ngModel)]="formRequestedDate"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recovery Payroll Month (YYYY-MM) *</label>
                  <app-custom-input [(ngModel)]="formRecoveryPeriod" placeholder="2026-11"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Approval Status</label>
                  <app-searchable-select
                    categoryCode="HR_LOAN_STATUS"
                    [(ngModel)]="formStatus"
                    [allowCreateNew]="false"
                    [searchable]="true"
                    placeholder="Status"
                  ></app-searchable-select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Reason / Purpose</label>
                  <app-custom-textarea [(ngModel)]="formReason" placeholder="Emergency medical, personal or festival advance reason"></app-custom-textarea>
                </div>
              </div>
            } @else if (isEssView()) {
              <!-- Claims / Reimbursements Form -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Employee *</label>
                  <app-searchable-select
                    [options]="employeeOptions()"
                    [(ngModel)]="formEmployeeId"
                    [allowCreateNew]="true"
                    (createNew)="navigateToEmployeeCreate()"
                    [searchable]="true"
                    placeholder="Select Claiming Staff"
                  ></app-searchable-select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Claim Title / Reference Purpose *</label>
                  <app-custom-input [(ngModel)]="formClaimTitle" placeholder="e.g. Hospitalization Bill or Site Tour TA"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Claim Amount (BDT ৳) *</label>
                  <app-custom-input type="number" [(ngModel)]="formClaimAmount" placeholder="e.g. 15000"></app-custom-input>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Claim Date *</label>
                  <app-custom-input type="date" [(ngModel)]="formClaimDate"></app-custom-input>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expense Breakdown / Diagnosis Notes</label>
                  <app-custom-textarea [(ngModel)]="formClaimDescription" placeholder="Attach details of invoices, prescriptions, ticket numbers..."></app-custom-textarea>
                </div>
              </div>
            } @else {
              <!-- Staff Loan Form (Full parameters) -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff Employee *</label>
                  <app-searchable-select
                    [options]="employeeOptions()"
                    [(ngModel)]="formEmployeeId"
                    [allowCreateNew]="true"
                    (createNew)="navigateToEmployeeCreate()"
                    [searchable]="true"
                    placeholder="Search Staff Member"
                  ></app-searchable-select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Loan Code / Ref *</label>
                  <app-custom-input [(ngModel)]="formLoanCode" placeholder="LN-2026-001"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Loan Type *</label>
                  <app-searchable-select
                    categoryCode="HR_LOAN_TYPE"
                    [(ngModel)]="formLoanType"
                    [allowCreateNew]="true"
                    [searchable]="true"
                    placeholder="Select or Create Loan Type"
                  ></app-searchable-select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Principal Amount (BDT ৳) *</label>
                  <app-custom-input type="number" [(ngModel)]="formPrincipalAmount" (ngModelChange)="recalcEMI()" placeholder="e.g. 150000"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tenure (Months) *</label>
                  <app-custom-input type="number" [(ngModel)]="formTenureMonths" (ngModelChange)="recalcEMI()" placeholder="12"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Annual Interest Rate (%)</label>
                  <app-custom-input type="number" [(ngModel)]="formInterestRate" (ngModelChange)="recalcEMI()" placeholder="0.00"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Calculated Monthly EMI (৳)</label>
                  <app-custom-input [(ngModel)]="formMonthlyInstallment" placeholder="Auto-calculated"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Disbursement Date *</label>
                  <app-custom-input type="date" [(ngModel)]="formDisbursementDate"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Recovery Starts (YYYY-MM) *</label>
                  <app-custom-input [(ngModel)]="formStartRecoveryPeriod" placeholder="2026-11"></app-custom-input>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Payment / Disbursement Method</label>
                  <app-searchable-select
                    categoryCode="HR_PAYMENT_METHOD"
                    [(ngModel)]="formPaymentMethod"
                    [allowCreateNew]="true"
                    [searchable]="true"
                    placeholder="Bank Transfer, Cheque, etc."
                  ></app-searchable-select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Loan Status</label>
                  <app-searchable-select
                    categoryCode="HR_LOAN_STATUS"
                    [(ngModel)]="formStatus"
                    [allowCreateNew]="false"
                    [searchable]="true"
                    placeholder="Status"
                  ></app-searchable-select>
                </div>
              </div>
            }

            <div class="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <app-custom-button
                variant="outline"
                label="Cancel"
                (btnClick)="viewMode.set('list')"
              ></app-custom-button>
              <app-custom-button
                variant="primary"
                [label]="isSaving() ? 'Saving...' : 'Save & Commit Record'"
                [disabled]="isSaving()"
                (btnClick)="saveCurrentForm()"
              ></app-custom-button>
            </div>
          </div>
        }

        <!-- 3. FULL-SCREEN AMORTIZATION SCHEDULE DETAIL VIEW -->
        @if (viewMode() === 'detail') {
          <div class="p-6 space-y-6">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="viewMode.set('list')"
                  class="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                </button>
                <div>
                  <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
                    Repayment Amortization Schedule & Ledger: {{ activeDetailItem()?.loan_code || activeDetailItem()?.reference }}
                  </h3>
                  <div class="text-xs text-slate-500">
                    Staff: <span class="font-semibold text-slate-800 dark:text-slate-200">{{ activeDetailItem()?.employee_name || 'Staff' }}</span>
                    • Principal: <span class="font-mono font-bold text-primary-600">৳ {{ (activeDetailItem()?.principal_amount || activeDetailItem()?.amount) | number }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                @if (activeDetailItem()?.status === 'PENDING') {
                  <app-custom-button
                    variant="primary"
                    size="sm"
                    label="Approve Loan"
                    (btnClick)="quickApproveLoan(activeDetailItem())"
                  ></app-custom-button>
                }
                <app-custom-button
                  variant="outline"
                  size="sm"
                  label="Back to Table"
                  (btnClick)="viewMode.set('list')"
                ></app-custom-button>
              </div>
            </div>

            <!-- Schedule Breakdown Table -->
            <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
                  <tr>
                    <th class="px-4 py-3">Inst #</th>
                    <th class="px-4 py-3">Due Period</th>
                    <th class="px-4 py-3">Opening Balance</th>
                    <th class="px-4 py-3">Principal EMI</th>
                    <th class="px-4 py-3">Interest Component</th>
                    <th class="px-4 py-3">Total Monthly Deduction</th>
                    <th class="px-4 py-3">Closing Balance</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  @for (row of amortizationSchedule(); track row.installmentNumber) {
                    <tr class="hover:bg-slate-50/70 dark:hover:bg-slate-850/50">
                      <td class="px-4 py-2.5 font-bold text-slate-500">{{ row.installmentNumber }}</td>
                      <td class="px-4 py-2.5 text-slate-800 dark:text-slate-200">{{ row.period }}</td>
                      <td class="px-4 py-2.5">৳ {{ row.openingBalance | number:'1.2-2' }}</td>
                      <td class="px-4 py-2.5 text-emerald-600 dark:text-emerald-400">৳ {{ row.principalComponent | number:'1.2-2' }}</td>
                      <td class="px-4 py-2.5 text-amber-600 dark:text-amber-400">৳ {{ row.interestComponent | number:'1.2-2' }}</td>
                      <td class="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">৳ {{ row.emi | number:'1.2-2' }}</td>
                      <td class="px-4 py-2.5">৳ {{ row.closingBalance | number:'1.2-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </app-card-container>
    </div>
  `
})
export class LoansBenefitsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hrmsService = inject(HrmsService);

  // Subviews definition
  navViews: SubViewConfig[] = [
    { id: 'loans', title: 'Staff Loans', description: 'Corporate welfare, motor-bike and personal installment loans', badge: '8.1', apiType: 'loan' },
    { id: 'salary-advances', title: 'Salary Advances', description: 'Emergency short-term advance against forthcoming monthly payroll', badge: '8.2', apiType: 'advance' },
    { id: 'loan-approvals', title: 'Approval Hierarchy', description: 'Multi-tier HR, Finance Director and Managing Director approvals', badge: '8.3', apiType: 'loan' },
    { id: 'loan-disbursements', title: 'Disbursement Register', description: 'Bank transfer vouchers, accounts cheque payments and disbursement dates', badge: '8.4', apiType: 'loan' },
    { id: 'installment-schedules', title: 'Repayment Schedules', description: 'Monthly principal and interest recovery schedules linked to payroll deductions', badge: '8.5', apiType: 'loan' },
    { id: 'loan-recoveries', title: 'Loan Recovery Ledger', description: 'Historical payroll deductions, early settlement and closure certificates', badge: '8.6', apiType: 'loan' },
    { id: 'medical-reimbursements', title: 'Medical Claims', description: 'Prescription, diagnostic bill verification and policy reimbursement limits', badge: '8.7', apiType: 'ess', essRecordType: 'medical-claim' },
    { id: 'travel-allowances', title: 'TA / DA Allowances', description: 'Site visits, project inspection travel and daily allowance claims', badge: '8.8', apiType: 'ess', essRecordType: 'travel-claim' },
    { id: 'expense-claims', title: 'Official Expense Claims', description: 'Site petty cash, mobile bills, internet and corporate entertainment claims', badge: '8.9', apiType: 'ess', essRecordType: 'expense-claim' },
    { id: 'benefits-master', title: 'Benefits Policy Master', description: 'Provident Fund (PF), Gratuity, Group Life Insurance and Health Coverage', badge: '8.10', apiType: 'policy' }
  ];

  currentSubView = signal<string>('loans');
  viewMode = signal<'list' | 'create' | 'edit' | 'detail'>('list');

  // Table state
  tableItems = signal<any[]>([]);
  totalRecords = signal<number>(0);
  limit = signal<number>(10);
  offset = signal<number>(0);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Detail / Amortization state
  activeDetailItem = signal<any>(null);
  amortizationSchedule = signal<AmortizationScheduleRow[]>([]);

  // Alerts
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'error'>('success');

  // Dynamic Employees options
  employees = signal<any[]>([]);
  employeeOptions = computed<SelectOption[]>(() => {
    return this.employees().map(emp => ({
      value: emp.id,
      label: `${emp.first_name} ${emp.last_name || ''}`.trim() + ` (${emp.employee_code || 'EMP-' + emp.id})`,
      sublabel: emp.department?.name || emp.department_name || emp.designation?.title || 'Staff'
    }));
  });

  // Current view meta
  currentViewMeta = computed(() => {
    return this.navViews.find(v => v.id === this.currentSubView()) || this.navViews[0];
  });

  // Pagination computed
  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalRecords() / this.limit())));

  // KPI Computations
  kpiTotalValue = computed(() => {
    return this.tableItems().reduce((sum, item) => sum + Number(item.principal_amount || item.advance_amount || item.amount || 0), 0);
  });
  kpiRecoveredValue = computed(() => {
    return this.tableItems().reduce((sum, item) => sum + Number(item.recovered_amount || 0), 0);
  });
  kpiBalanceValue = computed(() => {
    return this.tableItems().reduce((sum, item) => sum + Number(item.remaining_balance || (Number(item.advance_amount || 0) - Number(item.recovered_amount || 0))), 0);
  });

  // Form Fields
  editingId: number | null = null;
  formEmployeeId: any = null;
  formLoanCode: string = '';
  formLoanType: string = 'WELFARE_LOAN';
  formPrincipalAmount: string = '';
  formTenureMonths: string = '12';
  formInterestRate: string = '0';
  formMonthlyInstallment: string = '';
  formDisbursementDate: string = new Date().toISOString().split('T')[0];
  formStartRecoveryPeriod: string = '2026-11';
  formPaymentMethod: string = 'BANK_TRANSFER';
  formStatus: string = 'ACTIVE';

  // Advance Form Fields
  formAdvanceAmount: string = '';
  formRequestedDate: string = new Date().toISOString().split('T')[0];
  formRecoveryPeriod: string = '2026-11';
  formReason: string = '';

  // Policy Form Fields
  formPolicyCode: string = '';
  formPolicyName: string = '';
  formPolicyType: string = 'PROVIDENT_FUND';
  formEligibilityMonths: number = 6;
  formEmpContributionPct: number = 10;
  formEmployerContributionPct: number = 10;
  formVestingYears: number = 3;
  formCalculationBasis: string = 'BASIC_SALARY';
  formDescription: string = '';

  // Claims Form Fields
  formClaimTitle: string = '';
  formClaimAmount: string = '';
  formClaimDate: string = new Date().toISOString().split('T')[0];
  formClaimDescription: string = '';

  ngOnInit(): void {
    this.loadEmployeesList();

    // Track active sub-route or query param
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.navViews.some(v => v.id === path)) {
        this.currentSubView.set(path);
      }
      this.loadCurrentViewData();
    });

    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view && this.navViews.some(v => v.id === view)) {
        this.currentSubView.set(view);
        this.loadCurrentViewData();
      }
    });
  }

  loadEmployeesList(): void {
    this.hrmsService.loadEmployees().subscribe({
      next: emps => this.employees.set(emps || []),
      error: () => {}
    });
  }

  selectSubView(viewId: string): void {
    this.currentSubView.set(viewId);
    this.viewMode.set('list');
    this.offset.set(0);
    this.loadCurrentViewData();
  }

  isPolicyView(): boolean {
    return this.currentSubView() === 'benefits-master';
  }

  isAdvanceView(): boolean {
    return this.currentSubView() === 'salary-advances';
  }

  isEssView(): boolean {
    return ['medical-reimbursements', 'travel-allowances', 'expense-claims'].includes(this.currentSubView());
  }

  getCreateLabel(): string {
    const v = this.currentViewMeta();
    if (this.isPolicyView()) return 'Benefit Policy';
    if (this.isAdvanceView()) return 'Salary Advance';
    if (this.isEssView()) return 'Claim Request';
    return 'Staff Loan';
  }

  onFilterChanged(): void {
    this.offset.set(0);
    this.loadCurrentViewData();
  }

  getEndOffset(): number {
    return Math.min(this.offset() + this.limit(), this.totalRecords());
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.offset.set(Math.max(0, this.offset() - this.limit()));
      this.loadCurrentViewData();
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.offset.set(this.offset() + this.limit());
      this.loadCurrentViewData();
    }
  }

  loadCurrentViewData(): void {
    this.isLoading.set(true);
    const view = this.currentViewMeta();

    if (view.apiType === 'policy') {
      this.hrmsService.getBenefitPolicies({
        limit: this.limit(),
        offset: this.offset()
      }).subscribe({
        next: res => {
          this.tableItems.set(res?.items || []);
          this.totalRecords.set(res?.total || 0);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.showNotification('Error loading benefit policies: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else if (view.apiType === 'advance') {
      this.hrmsService.getSalaryAdvances({
        status: this.statusFilter() || undefined,
        limit: this.limit(),
        offset: this.offset()
      }).subscribe({
        next: res => {
          this.tableItems.set(res?.items || []);
          this.totalRecords.set(res?.total || 0);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.showNotification('Error loading salary advances: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else if (view.apiType === 'ess') {
      const recType = view.essRecordType || 'expense-claim';
      this.hrmsService.getEssRecords(recType, {
        search: this.searchQuery() || undefined,
        status: this.statusFilter() || undefined,
        limit: this.limit(),
        offset: this.offset()
      }).subscribe({
        next: res => {
          this.tableItems.set(res?.items || []);
          this.totalRecords.set(res?.total || 0);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.showNotification('Error loading claim records: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else {
      // Loan subviews: filter status if in approval or disbursement views
      let filterSt = this.statusFilter() || undefined;
      if (this.currentSubView() === 'loan-approvals' && !filterSt) {
        filterSt = 'PENDING';
      } else if (this.currentSubView() === 'loan-disbursements' && !filterSt) {
        filterSt = 'APPROVED';
      }

      this.hrmsService.getStaffLoans({
        search: this.searchQuery() || undefined,
        status: filterSt,
        limit: this.limit(),
        offset: this.offset()
      }).subscribe({
        next: res => {
          this.tableItems.set(res?.items || []);
          this.totalRecords.set(res?.total || 0);
          this.isLoading.set(false);
        },
        error: (err: any) => {
          this.isLoading.set(false);
          this.showNotification('Error loading staff loans: ' + (err.error?.detail || err.message), 'error');
        }
      });
    }
  }

  openCreateForm(): void {
    this.editingId = null;
    this.resetForms();
    this.viewMode.set('create');
  }

  resetForms(): void {
    this.formEmployeeId = this.employees()[0]?.id || null;
    this.formLoanCode = 'LN-2026-' + Math.floor(1000 + Math.random() * 9000);
    this.formLoanType = 'WELFARE_LOAN';
    this.formPrincipalAmount = '50000';
    this.formTenureMonths = '12';
    this.formInterestRate = '0';
    this.formDisbursementDate = new Date().toISOString().split('T')[0];
    this.formStartRecoveryPeriod = '2026-11';
    this.formPaymentMethod = 'BANK_TRANSFER';
    this.formStatus = this.currentSubView() === 'loan-approvals' ? 'PENDING' : 'ACTIVE';
    this.recalcEMI();

    this.formAdvanceAmount = '20000';
    this.formRequestedDate = new Date().toISOString().split('T')[0];
    this.formRecoveryPeriod = '2026-11';
    this.formReason = '';

    this.formPolicyCode = 'POL-' + Math.floor(100 + Math.random() * 900);
    this.formPolicyName = '';
    this.formPolicyType = 'PROVIDENT_FUND';
    this.formEligibilityMonths = 6;
    this.formEmpContributionPct = 10;
    this.formEmployerContributionPct = 10;
    this.formVestingYears = 3;
    this.formCalculationBasis = 'BASIC_SALARY';
    this.formDescription = '';

    this.formClaimTitle = '';
    this.formClaimAmount = '5000';
    this.formClaimDate = new Date().toISOString().split('T')[0];
    this.formClaimDescription = '';
  }

  recalcEMI(): void {
    const p = Number(this.formPrincipalAmount) || 0;
    const n = Math.max(1, Number(this.formTenureMonths) || 12);
    const r = (Number(this.formInterestRate) || 0) / 100 / 12;

    if (r === 0) {
      this.formMonthlyInstallment = Math.round(p / n).toString();
    } else {
      const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      this.formMonthlyInstallment = Math.round(emi).toString();
    }
  }

  saveCurrentForm(): void {
    const view = this.currentViewMeta();
    this.isSaving.set(true);

    if (view.apiType === 'policy') {
      if (!this.formPolicyCode || !this.formPolicyName) {
        this.showNotification('Policy code and name are required', 'error');
        this.isSaving.set(false);
        return;
      }
      const payload = {
        policy_code: this.formPolicyCode,
        policy_name: this.formPolicyName,
        policy_type: this.formPolicyType,
        eligibility_months: Number(this.formEligibilityMonths) || 6,
        employee_contribution_pct: Number(this.formEmpContributionPct) || 0,
        employer_contribution_pct: Number(this.formEmployerContributionPct) || 0,
        vesting_years: Number(this.formVestingYears) || 0,
        calculation_basis: this.formCalculationBasis,
        is_statutory: true,
        is_active: true,
        description: this.formDescription
      };

      const req$ = this.editingId
        ? this.hrmsService.updateBenefitPolicy(this.editingId, payload)
        : this.hrmsService.submitBenefitPolicy(payload);

      req$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showNotification('✓ Benefit Policy successfully committed!', 'success');
          this.viewMode.set('list');
          this.loadCurrentViewData();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          this.showNotification('✕ Error saving policy: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else if (view.apiType === 'advance') {
      if (!this.formEmployeeId || !this.formAdvanceAmount) {
        this.showNotification('Staff Employee and Advance Amount are required', 'error');
        this.isSaving.set(false);
        return;
      }
      const payload = {
        employee_id: Number(this.formEmployeeId),
        advance_amount: Number(this.formAdvanceAmount),
        requested_date: this.formRequestedDate,
        recovery_period: this.formRecoveryPeriod,
        reason: this.formReason,
        status: this.formStatus || 'PENDING'
      };

      const req$ = this.editingId
        ? this.hrmsService.updateSalaryAdvance(this.editingId, payload)
        : this.hrmsService.submitSalaryAdvance(payload);

      req$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showNotification('✓ Salary Advance record saved successfully!', 'success');
          this.viewMode.set('list');
          this.loadCurrentViewData();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          this.showNotification('✕ Error saving advance: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else if (view.apiType === 'ess') {
      const recType = view.essRecordType || 'expense-claim';
      const payload = {
        employee_id: Number(this.formEmployeeId),
        title: this.formClaimTitle || `${view.title} Application`,
        amount: Number(this.formClaimAmount) || 0,
        record_date: this.formClaimDate,
        description: this.formClaimDescription
      };

      this.hrmsService.createEssRecord(recType, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showNotification('✓ Claim application recorded successfully!', 'success');
          this.viewMode.set('list');
          this.loadCurrentViewData();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          this.showNotification('✕ Error saving claim: ' + (err.error?.detail || err.message), 'error');
        }
      });
    } else {
      // Staff Loan
      if (!this.formEmployeeId || !this.formPrincipalAmount) {
        this.showNotification('Staff employee and principal amount are required', 'error');
        this.isSaving.set(false);
        return;
      }
      const payload = {
        employee_id: Number(this.formEmployeeId),
        loan_code: this.formLoanCode,
        loan_type: this.formLoanType,
        principal_amount: Number(this.formPrincipalAmount),
        interest_rate: Number(this.formInterestRate) || 0,
        tenure_months: Number(this.formTenureMonths) || 12,
        monthly_installment: Number(this.formMonthlyInstallment) || 0,
        disbursement_date: this.formDisbursementDate,
        start_recovery_period: this.formStartRecoveryPeriod,
        status: this.formStatus || 'ACTIVE'
      };

      const req$ = this.editingId
        ? this.hrmsService.updateStaffLoan(this.editingId, payload)
        : this.hrmsService.submitStaffLoan(payload);

      req$.subscribe({
        next: () => {
          this.isSaving.set(false);
          this.showNotification('✓ Staff loan record saved successfully!', 'success');
          this.viewMode.set('list');
          this.loadCurrentViewData();
        },
        error: (err: any) => {
          this.isSaving.set(false);
          this.showNotification('✕ Error saving loan: ' + (err.error?.detail || err.message), 'error');
        }
      });
    }
  }

  editLoan(item: any): void {
    this.editingId = item.id;
    this.formEmployeeId = item.employee_id;
    this.formLoanCode = item.loan_code;
    this.formLoanType = item.loan_type;
    this.formPrincipalAmount = item.principal_amount?.toString() || '';
    this.formTenureMonths = item.tenure_months?.toString() || '12';
    this.formInterestRate = item.interest_rate?.toString() || '0';
    this.formMonthlyInstallment = item.monthly_installment?.toString() || '';
    this.formDisbursementDate = item.disbursement_date || new Date().toISOString().split('T')[0];
    this.formStartRecoveryPeriod = item.start_recovery_period || '2026-11';
    this.formStatus = item.status;
    this.viewMode.set('edit');
  }

  editAdvance(item: any): void {
    this.editingId = item.id;
    this.formEmployeeId = item.employee_id;
    this.formAdvanceAmount = item.advance_amount?.toString() || '';
    this.formRequestedDate = item.requested_date || new Date().toISOString().split('T')[0];
    this.formRecoveryPeriod = item.recovery_period || '2026-11';
    this.formReason = item.reason || '';
    this.formStatus = item.status;
    this.viewMode.set('edit');
  }

  editPolicy(item: any): void {
    this.editingId = item.id;
    this.formPolicyCode = item.policy_code;
    this.formPolicyName = item.policy_name;
    this.formPolicyType = item.policy_type;
    this.formEligibilityMonths = item.eligibility_months;
    this.formEmpContributionPct = item.employee_contribution_pct;
    this.formEmployerContributionPct = item.employer_contribution_pct;
    this.formVestingYears = item.vesting_years;
    this.formCalculationBasis = item.calculation_basis;
    this.formDescription = item.description || '';
    this.viewMode.set('edit');
  }

  deleteItem(id: number): void {
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    const view = this.currentViewMeta();

    let del$: Observable<any>;
    if (view.apiType === 'policy') del$ = this.hrmsService.deleteBenefitPolicy(id);
    else if (view.apiType === 'advance') del$ = this.hrmsService.deleteSalaryAdvance(id);
    else if (view.apiType === 'ess') del$ = this.hrmsService.deleteEssRecord(view.essRecordType || 'expense-claim', id);
    else del$ = this.hrmsService.deleteStaffLoan(id);

    del$.subscribe({
      next: () => {
        this.showNotification('✓ Record deleted successfully', 'success');
        this.loadCurrentViewData();
      },
      error: (err: any) => {
        this.showNotification('✕ Error deleting record: ' + (err.error?.detail || err.message), 'error');
      }
    });
  }

  quickApproveLoan(item: any): void {
    this.hrmsService.updateStaffLoan(item.id, {
      ...item,
      status: 'APPROVED'
    }).subscribe({
      next: () => {
        this.showNotification(`✓ Loan ${item.loan_code} successfully approved!`, 'success');
        this.loadCurrentViewData();
      },
      error: (err: any) => this.showNotification('✕ Approval failed: ' + (err.error?.detail || err.message), 'error')
    });
  }

  quickRejectLoan(item: any): void {
    this.hrmsService.updateStaffLoan(item.id, {
      ...item,
      status: 'REJECTED'
    }).subscribe({
      next: () => {
        this.showNotification(`✓ Loan ${item.loan_code} marked as rejected.`, 'success');
        this.loadCurrentViewData();
      },
      error: (err: any) => this.showNotification('✕ Action failed: ' + (err.error?.detail || err.message), 'error')
    });
  }

  quickDisburseLoan(item: any): void {
    this.hrmsService.updateStaffLoan(item.id, {
      ...item,
      status: 'ACTIVE',
      disbursed_amount: item.principal_amount,
      remaining_balance: item.principal_amount
    }).subscribe({
      next: () => {
        this.showNotification(`✓ Loan ${item.loan_code} successfully disbursed!`, 'success');
        this.loadCurrentViewData();
      },
      error: (err: any) => this.showNotification('✕ Disbursement failed: ' + (err.error?.detail || err.message), 'error')
    });
  }

  quickApproveAdvance(item: any): void {
    this.hrmsService.updateSalaryAdvance(item.id, {
      ...item,
      status: 'APPROVED'
    }).subscribe({
      next: () => {
        this.showNotification(`✓ Salary advance for ${item.employee_name || 'Staff'} approved!`, 'success');
        this.loadCurrentViewData();
      },
      error: (err: any) => this.showNotification('✕ Approval failed: ' + (err.error?.detail || err.message), 'error')
    });
  }

  viewEssDetail(item: any): void {
    this.activeDetailItem.set(item);
    this.viewMode.set('detail');
  }

  viewLoanSchedule(item: any): void {
    this.activeDetailItem.set(item);
    this.generateAmortizationSchedule(item);
    this.viewMode.set('detail');
  }

  generateAmortizationSchedule(item: any): void {
    const principal = Number(item.principal_amount) || 0;
    const months = Math.max(1, Number(item.tenure_months) || 12);
    const rateAnnual = (Number(item.interest_rate) || 0) / 100;
    const rateMonthly = rateAnnual / 12;

    let balance = principal;
    const monthlyPrincipal = principal / months;
    const rows: AmortizationScheduleRow[] = [];

    const startYear = 2026;
    const startMonth = 11; // November

    for (let i = 1; i <= months; i++) {
      const interest = balance * rateMonthly;
      const emi = monthlyPrincipal + interest;
      const opening = balance;
      const closing = Math.max(0, balance - monthlyPrincipal);

      const m = ((startMonth - 1 + (i - 1)) % 12) + 1;
      const y = startYear + Math.floor((startMonth - 1 + (i - 1)) / 12);
      const periodStr = `${y}-${m < 10 ? '0' + m : m}`;

      rows.push({
        installmentNumber: i,
        period: periodStr,
        openingBalance: opening,
        principalComponent: monthlyPrincipal,
        interestComponent: interest,
        emi: emi,
        closingBalance: closing
      });

      balance = closing;
    }

    this.amortizationSchedule.set(rows);
  }

  navigateToEmployeeCreate(): void {
    this.router.navigate(['/hrms/employees/new']);
  }

  showNotification(msg: string, type: 'success' | 'error'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === msg) {
        this.alertMessage.set(null);
      }
    }, 6000);
  }
}
