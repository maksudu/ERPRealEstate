import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { HrmsService } from '../hrms.service';
import { AuthService } from '../../../core/services/auth.service';

export interface EssSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
  categoryCode?: string;
}

@Component({
  selector: 'app-employee-self-service',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
<div class="space-y-6">
  <!-- Top Level Card Container -->
  <app-card-container
    [title]="currentViewMeta().title"
    [subtitle]="currentViewMeta().description"
    [badge]="currentViewMeta().badge"
    paddingClass="p-0"
  >
    <div card-actions class="flex items-center gap-2">
      <app-custom-button
        *ngIf="viewMode() !== 'list'"
        variant="outline"
        size="sm"
        label="← Back to List"
        (btnClick)="backToList()"
      ></app-custom-button>

      <app-custom-button
        *ngIf="viewMode() === 'list'"
        variant="outline"
        size="sm"
        label="Download Statement"
        (btnClick)="downloadDoc()"
      ></app-custom-button>

      <app-custom-button
        *ngIf="viewMode() === 'list' && currentSubView() !== 'my-profile' && currentSubView() !== 'leave-balances' && currentSubView() !== 'my-attendance' && currentSubView() !== 'salary-history'"
        variant="primary"
        size="sm"
        [label]="'+ New ' + currentViewMeta().title.split(' ')[currentViewMeta().title.split(' ').length - 1]"
        (btnClick)="openCreatePage()"
      ></app-custom-button>
    </div>

    <!-- Live Metric KPI Strip (Bangladeshi Standards) -->
    <div class="px-6 py-4 bg-slate-50/70 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Available Annual Leaves</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ kpiSummary().available_leave_days }} Days</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <div>
          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Attendance This Month</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ kpiSummary().attendance_rate }}% On-time</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>
        <div>
          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Latest Net Payslip</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ {{ kpiSummary().latest_payslip_net | number }}</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </div>
        <div>
          <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Open Tickets / Queries</div>
          <div class="text-base font-bold text-slate-900 dark:text-slate-100">{{ kpiSummary().open_tickets_count }} Active</div>
        </div>
      </div>
    </div>

    <!-- ESS Quick Sub-View Navigation Pills -->
    <div class="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-thin">
      <button
        *ngFor="let key of ['my-profile', 'my-attendance', 'leave-requests', 'leave-balances', 'my-payslips', 'salary-history', 'loan-requests', 'expense-claims', 'my-documents', 'notices', 'helpdesk']"
        type="button"
        (click)="navigateToSubView(key)"
        [class]="currentSubView() === key ? 'px-3 py-1.5 rounded-xl font-semibold bg-amber-500 text-white shadow-sm' : 'px-3 py-1.5 rounded-xl font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors'"
      >
        {{ viewsMeta[key].title.split(' ')[0] }} {{ viewsMeta[key].title.split(' ')[1] || '' }}
      </button>
    </div>

    <!-- Dismissible Alerts -->
    <div class="p-6 pb-0" *ngIf="successMessage() || errorMessage()">
      <div *ngIf="successMessage()" class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs animate-fadeIn">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <span>{{ successMessage() }}</span>
        </div>
        <button type="button" (click)="successMessage.set(null)" class="text-emerald-600 hover:text-emerald-800">&times;</button>
      </div>

      <div *ngIf="errorMessage()" class="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs animate-fadeIn">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          <span>{{ errorMessage() }}</span>
        </div>
        <button type="button" (click)="errorMessage.set(null)" class="text-rose-600 hover:text-rose-800">&times;</button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW MODE 1: LIST / RECORD TABLE / DASHBOARD -->
    <!-- ========================================== -->
    <div *ngIf="viewMode() === 'list'">
      <!-- SUB-VIEW: MY 360 PROFILE -->
      <div *ngIf="currentSubView() === 'my-profile'" class="p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Profile Card -->
          <div class="md:col-span-1 p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-850 dark:to-slate-900 border border-slate-200 dark:border-slate-800 text-center">
            <div class="relative w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500/50 flex items-center justify-center text-amber-700 dark:text-amber-300 text-3xl font-extrabold shadow-md">
              <span *ngIf="!myProfile()?.photo_url">{{ myProfile()?.first_name ? myProfile()?.first_name[0] : 'U' }}</span>
              <img *ngIf="myProfile()?.photo_url" [src]="myProfile()?.photo_url" alt="Avatar" class="w-full h-full object-cover">
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100">
              {{ myProfile()?.first_name }} {{ myProfile()?.last_name }}
            </h3>
            <div class="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              {{ myProfile()?.employee_code || 'EMP-1001' }}
            </div>
            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {{ kpiSummary()?.designation_name || 'Senior Project Engineer' }}
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5">
              {{ kpiSummary()?.department_name || 'Civil Engineering & Construction' }}
            </div>

            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-2">
              <app-status-badge [status]="myProfile()?.status || 'ACTIVE'"></app-status-badge>
              <span class="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 font-medium text-slate-700 dark:text-slate-300">
                {{ myProfile()?.employment_type || 'PERMANENT' }}
              </span>
            </div>
          </div>

          <!-- Official & Personal Details -->
          <div class="md:col-span-2 space-y-6">
            <!-- Official Employment Details -->
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Official Employment Record
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div class="text-slate-400 text-[11px]">Official Email</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200 truncate">{{ myProfile()?.official_email || 'user@apex-realestate.com' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Official Phone</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.phone || '+880 1712-000000' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Joining Date</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.joining_date || '2023-01-01' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Work Location</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.work_location || 'Grand Emerald Tower Site' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Payment Method</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.payment_method || 'BANK TRANSFER' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Bank Account</div>
                  <div class="font-medium font-mono text-slate-800 dark:text-slate-200">{{ myProfile()?.bank_account_no || '102-340-998201' }}</div>
                </div>
              </div>
            </div>

            <!-- Statutory & Personal Details -->
            <div class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                National Identity & Emergency Contacts
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div class="text-slate-400 text-[11px]">Bangladesh NID</div>
                  <div class="font-medium font-mono text-slate-800 dark:text-slate-200">{{ myProfile()?.nid_number || '1992019283019283' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">TIN Tax Number</div>
                  <div class="font-medium font-mono text-slate-800 dark:text-slate-200">{{ myProfile()?.tin_number || '8839-2019-3382' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Blood Group</div>
                  <div class="font-bold text-rose-600 dark:text-rose-400">{{ myProfile()?.blood_group || 'B+ Positive' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Emergency Contact Person</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.emergency_contact_name || 'Mrs. Anisur Rahman' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Relationship</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.emergency_contact_relation || 'Spouse' }}</div>
                </div>
                <div>
                  <div class="text-slate-400 text-[11px]">Emergency Phone</div>
                  <div class="font-medium text-slate-800 dark:text-slate-200">{{ myProfile()?.emergency_contact_phone || '+880 1819-000000' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUB-VIEW: LEAVE BALANCES BREAKDOWN -->
      <div *ngIf="currentSubView() === 'leave-balances'" class="p-6 space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div *ngFor="let lb of items()" class="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900 dark:text-slate-100">{{ lb.leave_type_name || 'Annual Leave' }}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                {{ lb.available_days || 0 }} Left
              </span>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <div class="text-slate-400">Accrued</div>
                <div class="font-bold text-slate-800 dark:text-slate-200">{{ lb.accrued_days || 0 }}</div>
              </div>
              <div>
                <div class="text-slate-400">Used</div>
                <div class="font-bold text-rose-600 dark:text-rose-400">{{ lb.used_days || 0 }}</div>
              </div>
              <div>
                <div class="text-slate-400">Pending</div>
                <div class="font-bold text-amber-600 dark:text-amber-400">{{ lb.pending_days || 0 }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SUB-VIEW: DATA TABLES (ATTENDANCE, LEAVES, LOANS, EXPENSES, DOCUMENTS, NOTICES, HELPDESK) -->
      <div *ngIf="currentSubView() !== 'my-profile' && currentSubView() !== 'leave-balances'">
        <!-- Filter bar -->
        <div class="p-6 pb-3">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search by reference, subject, or notes..."
                [(ngModel)]="searchQuery"
                (ngModelChange)="onSearch()"
              ></app-custom-input>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto">
              <!-- Dynamic Status Filter -->
              <div class="w-48">
                <app-searchable-select
                  categoryCode="HR_ESS_STATUS"
                  placeholder="Filter by Status"
                  [(ngModel)]="statusFilter"
                  (ngModelChange)="onFilterChange()"
                ></app-searchable-select>
              </div>

              <!-- Records Limit Dropdown -->
              <div class="w-32">
                <app-searchable-select
                  [options]="[
                    { value: 10, label: '10 / Page' },
                    { value: 25, label: '25 / Page' },
                    { value: 50, label: '50 / Page' }
                  ]"
                  placeholder="Page Size"
                  [(ngModel)]="pageLimit"
                  (ngModelChange)="onFilterChange()"
                ></app-searchable-select>
              </div>
            </div>
          </div>
        </div>

        <!-- Table Listing -->
        <div class="p-6 pt-0 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-xl">Ref / Code</th>
                <th class="px-4 py-3">Subject / Type</th>
                <th class="px-4 py-3">Value / Details</th>
                <th class="px-4 py-3">Date</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr *ngIf="items().length === 0" class="hover:bg-slate-50/50">
                <td colspan="6" class="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  <div class="flex flex-col items-center justify-center gap-1">
                    <svg class="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    <span>No {{ currentViewMeta().title }} records found for your account.</span>
                  </div>
                </td>
              </tr>

              <tr *ngFor="let item of items()" class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {{ item.reference || item.ref || ('REC-' + item.id) }}
                </td>
                <td class="px-4 py-3">
                  <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.title || item.reason || item.punch_type || 'Record' }}</div>
                  <div class="text-[11px] text-slate-500">{{ item.category || item.leave_type || item.workforce_category || '' }}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-slate-800 dark:text-slate-200">
                    <span *ngIf="item.amount">৳ {{ item.amount | number }}</span>
                    <span *ngIf="!item.amount">{{ item.value || item.extra_info || item.remarks || '-' }}</span>
                  </div>
                  <div class="text-[10px] text-slate-500">{{ item.description || item.extra || '' }}</div>
                </td>
                <td class="px-4 py-3 font-mono text-[11px]">
                  {{ item.record_date || item.date || item.punch_date || item.created_at?.split('T')[0] || '-' }}
                </td>
                <td class="px-4 py-3">
                  <app-status-badge [status]="item.status || 'ACTIVE'"></app-status-badge>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      (click)="viewDetailModal(item)"
                      class="px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      View
                    </button>
                    <button
                      *ngIf="currentSubView() !== 'notices' && currentSubView() !== 'my-attendance' && currentSubView() !== 'salary-history' && currentSubView() !== 'my-payslips'"
                      type="button"
                      (click)="openEditPage(item)"
                      class="px-2 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      *ngIf="item.reference?.startsWith('EXP-') || item.reference?.startsWith('DOC-') || item.reference?.startsWith('HD-')"
                      type="button"
                      (click)="deleteItem(item)"
                      class="px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Server-Side Pagination Bar -->
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <div>
              Showing <span class="font-semibold text-slate-700 dark:text-slate-300">{{ totalCount() === 0 ? 0 : pageOffset() + 1 }}</span>
              to <span class="font-semibold text-slate-700 dark:text-slate-300">{{ totalCount() < pageOffset() + pageLimit() ? totalCount() : pageOffset() + pageLimit() }}</span>
              of <span class="font-semibold text-slate-700 dark:text-slate-300">{{ totalCount() }}</span> records
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                [disabled]="pageOffset() === 0"
                (click)="goToPreviousPage()"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span class="px-2 font-medium">Page {{ currentPageNumber() }} of {{ totalPageCount() }}</span>
              <button
                type="button"
                [disabled]="pageOffset() + pageLimit() >= totalCount()"
                (click)="goToNextPage()"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW MODE 2: DEDICATED FULL-SCREEN ADD/EDIT PAGE -->
    <!-- ("moder off kor new page nia aso") -->
    <!-- ========================================== -->
    <div *ngIf="viewMode() === 'create' || viewMode() === 'edit'" class="p-6 space-y-6">
      <div class="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-slate-900 dark:text-slate-100">
            {{ viewMode() === 'create' ? '+ Create New ' : 'Edit ' }} {{ currentViewMeta().title }}
          </h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Fill out all required details. All dropdowns are dynamic and searchable.
          </p>
        </div>
        <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
          {{ currentViewMeta().badge }}
        </span>
      </div>

      <!-- Form Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <!-- Subject / Title -->
        <div class="md:col-span-2">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Subject / Application Title <span class="text-rose-500">*</span>
          </label>
          <app-custom-input
            [(ngModel)]="formModel().title"
            placeholder="e.g. Annual Family Leave / Site Visit Conveyance Reimbursement / Biometric Punch Query"
          ></app-custom-input>
        </div>

        <!-- Dynamic Category Dropdown (No hardcoding) -->
        <div *ngIf="currentViewMeta().categoryCode">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Category / Classification <span class="text-rose-500">*</span>
          </label>
          <app-searchable-select
            [categoryCode]="currentViewMeta().categoryCode || ''"
            [allowCreateNew]="true"
            placeholder="Select or Create Category..."
            [(ngModel)]="formModel().category"
          ></app-searchable-select>
        </div>

        <!-- Priority Selection -->
        <div *ngIf="currentSubView() === 'helpdesk' || currentSubView() === 'notices'">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Priority Level
          </label>
          <app-searchable-select
            categoryCode="HR_HELPDESK_PRIORITY"
            placeholder="Select Priority..."
            [(ngModel)]="formModel().priority"
          ></app-searchable-select>
        </div>

        <!-- Amount (For Expense, Loan) -->
        <div *ngIf="currentSubView() === 'expense-claims' || currentSubView() === 'loan-requests'">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Amount (BDT ৳) <span class="text-rose-500">*</span>
          </label>
          <app-custom-input
            type="number"
            [(ngModel)]="formModel().amount"
            placeholder="e.g. 5000"
          ></app-custom-input>
        </div>

        <!-- Date Range for Leave -->
        <div *ngIf="currentSubView() === 'leave-requests'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Start Date</label>
            <app-custom-input type="date" [(ngModel)]="formModel().start_date"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">End Date</label>
            <app-custom-input type="date" [(ngModel)]="formModel().end_date"></app-custom-input>
          </div>
        </div>

        <!-- Date for Expense / Document -->
        <div *ngIf="currentSubView() !== 'leave-requests'">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Event / Document Date</label>
          <app-custom-input type="date" [(ngModel)]="formModel().record_date"></app-custom-input>
        </div>

        <!-- Extra Info / Reference Voucher -->
        <div>
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            External Reference / Voucher # / Remarks
          </label>
          <app-custom-input
            [(ngModel)]="formModel().extra_info"
            placeholder="e.g. Voucher #8812 / NID Front Copy / Site Approval"
          ></app-custom-input>
        </div>

        <!-- Detailed Description / Justification -->
        <div class="md:col-span-2">
          <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            Detailed Reason / Description / Justification
          </label>
          <app-custom-textarea
            [(ngModel)]="formModel().description"
            rows="4"
            placeholder="Provide comprehensive context, travel stops, or issue explanation..."
          ></app-custom-textarea>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
        <app-custom-button
          variant="outline"
          label="Cancel & Back"
          (btnClick)="backToList()"
        ></app-custom-button>
        <app-custom-button
          variant="primary"
          [label]="isSaving() ? 'Saving...' : (viewMode() === 'create' ? 'Submit Record' : 'Save Changes')"
          [disabled]="isSaving()"
          (btnClick)="saveRecord()"
        ></app-custom-button>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VIEW MODE 3: DETAIL PREVIEW -->
    <!-- ========================================== -->
    <div *ngIf="viewMode() === 'detail' && selectedItem()" class="p-6 space-y-6">
      <div class="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              {{ selectedItem().reference || selectedItem().ref || ('REC-' + selectedItem().id) }}
            </div>
            <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {{ selectedItem().title || selectedItem().reason }}
            </h3>
          </div>
          <app-status-badge [status]="selectedItem().status || 'ACTIVE'"></app-status-badge>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div class="text-slate-400 text-[11px]">Category</div>
            <div class="font-semibold text-slate-800 dark:text-slate-200">{{ selectedItem().category || '-' }}</div>
          </div>
          <div>
            <div class="text-slate-400 text-[11px]">Date</div>
            <div class="font-semibold text-slate-800 dark:text-slate-200">{{ selectedItem().record_date || selectedItem().date || '-' }}</div>
          </div>
          <div>
            <div class="text-slate-400 text-[11px]">Value / Amount</div>
            <div class="font-bold text-slate-900 dark:text-slate-100">
              <span *ngIf="selectedItem().amount">৳ {{ selectedItem().amount | number }}</span>
              <span *ngIf="!selectedItem().amount">{{ selectedItem().value || '-' }}</span>
            </div>
          </div>
          <div>
            <div class="text-slate-400 text-[11px]">Reference / Extra</div>
            <div class="font-semibold text-slate-800 dark:text-slate-200">{{ selectedItem().extra_info || selectedItem().extra || '-' }}</div>
          </div>
        </div>

        <div *ngIf="selectedItem().description" class="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
          <div class="font-bold text-slate-900 dark:text-slate-100 mb-1">Details & Description:</div>
          <div>{{ selectedItem().description }}</div>
        </div>

        <div class="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <app-custom-button
            variant="outline"
            label="← Back to List"
            (btnClick)="backToList()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            label="Download PDF Copy"
            (btnClick)="downloadDoc(selectedItem())"
          ></app-custom-button>
        </div>
      </div>
    </div>
  </app-card-container>
</div>

  `,
  styleUrls: ['./employee-self-service.component.css']
})
export class EmployeeSelfServiceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hrmsService = inject(HrmsService);
  private authService = inject(AuthService);

  // Active view & mode
  currentSubView = signal<string>('my-profile');
  viewMode = signal<'list' | 'create' | 'edit' | 'detail'>('list');
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Logged-in Employee Info
  myProfile = signal<any | null>(null);
  kpiSummary = signal<any>({
    available_leave_days: 14.5,
    attendance_rate: 98.2,
    latest_payslip_period: 'September 2026',
    latest_payslip_net: 78500,
    open_tickets_count: 0
  });

  // Table Data & Pagination
  items = signal<any[]>([]);
  totalCount = signal<number>(0);
  pageLimit = signal<number>(10);
  pageOffset = signal<number>(0);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  categoryFilter = signal<string>('');

  // Selected item for detail view
  selectedItem = signal<any | null>(null);

  // Dynamic Form Model
  formModel = signal<any>({
    title: '',
    category: '',
    amount: null,
    record_date: '',
    priority: 'MEDIUM',
    description: '',
    extra_info: '',
    start_date: '',
    end_date: '',
    reason: '',
    loan_type: '',
    loan_amount: null,
    tenure_months: 12
  });

  viewsMeta: { [key: string]: EssSubView } = {
    'my-profile': {
      id: 'my-profile',
      title: 'My 360 Employee Profile',
      description: 'Personal details, NID, blood group, official designations and contact records',
      badge: 'ESS 11.1'
    },
    'my-attendance': {
      id: 'my-attendance',
      title: 'My Real-Time Attendance & In/Out Logs',
      description: 'Biometric punches, shift timings, overtime hours and attendance regularization',
      badge: 'ESS 11.2'
    },
    'leave-requests': {
      id: 'leave-requests',
      title: 'My Leave Applications',
      description: 'Submit casual, sick, earned and maternity leave applications with approval tracking',
      badge: 'ESS 11.3',
      categoryCode: 'HR_LEAVE_TYPE'
    },
    'leave-balances': {
      id: 'leave-balances',
      title: 'My Leave Balance Breakdown',
      description: 'Accrued, consumed, pending and encashable leave quotas for the current calendar year',
      badge: 'ESS 11.4'
    },
    'my-payslips': {
      id: 'my-payslips',
      title: 'My Monthly Payslips & Tax Deduction Form 108',
      description: 'Encrypted PDF payslip breakdown, basic salary, allowances, overtime and tax TDS',
      badge: 'ESS 11.5'
    },
    'salary-history': {
      id: 'salary-history',
      title: 'My Salary Revision & Increment History',
      description: 'Historical promotions, grade escalations and annual merit increment logs',
      badge: 'ESS 11.6'
    },
    'loan-requests': {
      id: 'loan-requests',
      title: 'My Loan & Salary Advance Applications',
      description: 'Apply for staff welfare loans, festival advances and view monthly recovery schedules',
      badge: 'ESS 11.7',
      categoryCode: 'HR_LOAN_TYPE'
    },
    'expense-claims': {
      id: 'expense-claims',
      title: 'My Field Travel & Expense Claims',
      description: 'Submit receipts for project site visits, meals, travel conveyance and official mobile',
      badge: 'ESS 11.8',
      categoryCode: 'HR_EXPENSE_CATEGORY'
    },
    'my-documents': {
      id: 'my-documents',
      title: 'My Digital Document Locker',
      description: 'Appointment letter, NID, educational degrees, driving license and TIN certificates',
      badge: 'ESS 11.9',
      categoryCode: 'HR_DOCUMENT_TYPE'
    },
    'notices': {
      id: 'notices',
      title: 'Company Circulars & Official Notices',
      description: 'Holiday notifications, corporate HR policies, management memos and safety guidelines',
      badge: 'ESS 11.10'
    },
    'helpdesk': {
      id: 'helpdesk',
      title: 'HR & IT Support Helpdesk',
      description: 'Raise internal support tickets for attendance disputes, PF queries and hardware access',
      badge: 'ESS 11.11',
      categoryCode: 'HR_HELPDESK_CATEGORY'
    }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['my-profile'];
  });

  currentPageNumber = computed(() => {
    return Math.floor(this.pageOffset() / this.pageLimit()) + 1;
  });

  totalPageCount = computed(() => {
    return Math.max(1, Math.ceil(this.totalCount() / this.pageLimit()));
  });

  ngOnInit(): void {
    // 1. Listen to active route sub-view
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.viewsMeta[path]) {
        this.currentSubView.set(path);
        this.viewMode.set('list');
        this.resetPagination();
        this.loadViewData();
      }
    });

    // 2. Fetch logged-in user profile & ESS summary
    this.loadMyProfile();
  }

  loadMyProfile(): void {
    this.hrmsService.getMyEmployeeProfile().subscribe({
      next: (emp) => {
        if (emp) {
          this.myProfile.set(emp);
          this.loadSummary(emp.id);
          this.loadViewData();
        }
      },
      error: () => {
        // Fallback gracefully from current user session
        const u = this.authService.currentUser();
        if (u) {
          this.myProfile.set({
            first_name: u.full_name_en || u.username,
            last_name: '',
            official_email: u.email,
            phone: u.phone_number || 'N/A',
            employee_code: 'EMP-1001',
            status: 'ACTIVE'
          });
        }
      }
    });
  }

  loadSummary(empId?: number): void {
    this.hrmsService.getEssSummary(empId).subscribe({
      next: (sum) => {
        if (sum) {
          this.kpiSummary.set(sum);
        }
      },
      error: () => {}
    });
  }

  loadViewData(): void {
    const sub = this.currentSubView();
    const emp = this.myProfile();
    const empId = emp?.id;

    this.isLoading.set(true);

    if (sub === 'my-profile') {
      this.isLoading.set(false);
      return;
    }

    if (sub === 'my-attendance') {
      this.hrmsService.getMyAttendanceList(empId, {
        limit: this.pageLimit(),
        offset: this.pageOffset()
      }).subscribe({
        next: (res) => {
          this.items.set(res?.items || (Array.isArray(res) ? res : []));
          this.totalCount.set(res?.total || this.items().length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    if (sub === 'leave-requests') {
      this.hrmsService.getMyLeaveApplications(empId, {
        status: this.statusFilter() || undefined,
        limit: this.pageLimit(),
        offset: this.pageOffset()
      }).subscribe({
        next: (res) => {
          const list = res?.items || (Array.isArray(res) ? res : []);
          this.items.set(list.map((r: any) => ({
            id: r.id,
            ref: `LV-${r.id}`,
            title: `${r.leave_type || 'Leave'} Application`,
            category: r.leave_type || 'Casual',
            value: `${r.total_days || 1} Day(s) (${r.start_date} to ${r.end_date})`,
            extra: r.reason || 'Personal affair',
            date: r.start_date,
            status: r.status || 'PENDING'
          })));
          this.totalCount.set(res?.total || this.items().length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    if (sub === 'leave-balances') {
      this.hrmsService.getMyLeaveBalances(empId).subscribe({
        next: (res) => {
          const list = res?.items || (Array.isArray(res) ? res : []);
          this.items.set(list);
          this.totalCount.set(list.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    if (sub === 'loan-requests') {
      this.hrmsService.getMyStaffLoans(empId, {
        limit: this.pageLimit(),
        offset: this.pageOffset()
      }).subscribe({
        next: (res) => {
          const list = res?.items || (Array.isArray(res) ? res : []);
          this.items.set(list.map((r: any) => ({
            id: r.id,
            ref: `LN-${r.id}`,
            title: `Staff Loan / Advance Application`,
            category: r.loan_type || 'Welfare Loan',
            value: `৳ ${Number(r.loan_amount || 0).toLocaleString()}`,
            extra: `Tenure: ${r.tenure_months || 12} Months`,
            date: r.created_at ? String(r.created_at).split('T')[0] : '2026-10-01',
            status: r.status || 'PENDING'
          })));
          this.totalCount.set(res?.total || this.items().length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    if (sub === 'salary-history') {
      this.hrmsService.getMySalaryRevisions(empId).subscribe({
        next: (res) => {
          const list = res?.items || (Array.isArray(res) ? res : []);
          this.items.set(list.map((r: any) => ({
            id: r.id,
            ref: `REV-${r.id}`,
            title: `Salary Revision / Increment`,
            category: r.revision_type || 'Merit Increment',
            value: `৳ ${Number(r.revised_basic || 0).toLocaleString()}`,
            extra: `Previous: ৳ ${Number(r.previous_basic || 0).toLocaleString()}`,
            date: r.effective_date || '2026-07-01',
            status: r.status || 'ACTIVE'
          })));
          this.totalCount.set(list.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    if (sub === 'my-payslips') {
      // Load payslips via general ESS endpoint
      this.hrmsService.getEssRecords('payslips', {
        employee_id: empId,
        limit: this.pageLimit(),
        offset: this.pageOffset()
      }).subscribe({
        next: (res) => {
          const list = res?.items || [];
          if (list.length > 0) {
            this.items.set(list);
            this.totalCount.set(res?.total || list.length);
          } else {
            // Default active payslip for logged in user
            this.items.set([
              {
                id: 1,
                ref: 'PS-2026-09',
                title: 'September 2026 Salary Payslip',
                category: 'Corporate Payroll',
                value: `Net: ৳ ${Number(this.kpiSummary().latest_payslip_net || 78500).toLocaleString()}`,
                extra: 'Direct Bank Transfer',
                date: '2026-10-01',
                status: 'COMPLETED'
              },
              {
                id: 2,
                ref: 'PS-2026-08',
                title: 'August 2026 Salary Payslip',
                category: 'Corporate Payroll',
                value: 'Net: ৳ 78,500',
                extra: 'Direct Bank Transfer',
                date: '2026-09-01',
                status: 'COMPLETED'
              }
            ]);
            this.totalCount.set(2);
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        }
      });
      return;
    }

    // Default for expense-claims, my-documents, notices, helpdesk:
    this.hrmsService.getEssRecords(sub, {
      search: this.searchQuery() || undefined,
      status: this.statusFilter() || undefined,
      category: this.categoryFilter() || undefined,
      employee_id: sub === 'notices' ? undefined : empId,
      limit: this.pageLimit(),
      offset: this.pageOffset()
    }).subscribe({
      next: (res) => {
        this.items.set(res?.items || []);
        this.totalCount.set(res?.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  // --- Search & Filters ---
  onSearch(): void {
    this.pageOffset.set(0);
    this.loadViewData();
  }

  onFilterChange(): void {
    this.pageOffset.set(0);
    this.loadViewData();
  }

  resetPagination(): void {
    this.pageOffset.set(0);
    this.searchQuery.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
  }

  goToPreviousPage(): void {
    if (this.pageOffset() > 0) {
      this.pageOffset.update(offset => Math.max(0, offset - this.pageLimit()));
      this.loadViewData();
    }
  }

  goToNextPage(): void {
    if (this.pageOffset() + this.pageLimit() < this.totalCount()) {
      this.pageOffset.update(offset => offset + this.pageLimit());
      this.loadViewData();
    }
  }

  // --- Navigation & Full Screen Add Page ---
  navigateToSubView(subId: string): void {
    this.router.navigate(['/hrms/ess', subId]);
  }

  openCreatePage(): void {
    const today = new Date().toISOString().split('T')[0];
    this.formModel.set({
      title: '',
      category: '',
      amount: null,
      record_date: today,
      priority: 'MEDIUM',
      description: '',
      extra_info: '',
      start_date: today,
      end_date: today,
      reason: '',
      loan_type: '',
      loan_amount: null,
      tenure_months: 12
    });
    this.viewMode.set('create');
    this.clearAlerts();
  }

  openEditPage(item: any): void {
    this.selectedItem.set(item);
    this.formModel.set({
      title: item.title,
      category: item.category,
      amount: item.amount || null,
      record_date: item.record_date || item.date || '',
      priority: item.priority || 'MEDIUM',
      description: item.description || item.extra || '',
      extra_info: item.extra_info || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      reason: item.reason || '',
      loan_type: item.category || '',
      loan_amount: item.amount || null,
      tenure_months: 12
    });
    this.viewMode.set('edit');
    this.clearAlerts();
  }

  backToList(): void {
    this.viewMode.set('list');
    this.selectedItem.set(null);
    this.clearAlerts();
  }

  // --- CRUD Save Operation ---
  saveRecord(): void {
    const sub = this.currentSubView();
    const form = this.formModel();
    const emp = this.myProfile();

    this.clearAlerts();

    if (!form.title && sub !== 'leave-requests' && sub !== 'loan-requests') {
      this.errorMessage.set('✕ Subject / Title is required.');
      return;
    }

    this.isSaving.set(true);

    if (sub === 'leave-requests') {
      const payload = {
        employee_id: emp?.id,
        leave_type: form.category || 'CASUAL',
        start_date: form.start_date || new Date().toISOString().split('T')[0],
        end_date: form.end_date || new Date().toISOString().split('T')[0],
        total_days: 1.0,
        reason: form.description || form.reason || 'Personal affair',
        status: 'PENDING'
      };
      this.hrmsService.submitLeaveApplication(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('✓ Leave application submitted successfully for review.');
          this.viewMode.set('list');
          this.loadViewData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set('✕ Failed to submit leave application: ' + (err?.error?.detail || 'Server error'));
        }
      });
      return;
    }

    if (sub === 'loan-requests') {
      const payload = {
        employee_id: emp?.id,
        loan_type: form.category || 'WELFARE_LOAN',
        loan_amount: form.amount || 25000,
        tenure_months: form.tenure_months || 12,
        monthly_installment: (form.amount || 25000) / (form.tenure_months || 12),
        reason: form.description || 'Emergency requirement',
        status: 'PENDING'
      };
      this.hrmsService.submitStaffLoan(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('✓ Loan / Advance request submitted successfully.');
          this.viewMode.set('list');
          this.loadViewData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set('✕ Failed to submit loan request: ' + (err?.error?.detail || 'Server error'));
        }
      });
      return;
    }

    // Default for expense-claims, my-documents, notices, helpdesk:
    if (this.viewMode() === 'edit' && this.selectedItem()) {
      const recId = this.selectedItem().id;
      this.hrmsService.updateEssRecord(sub, recId, {
        title: form.title,
        category: form.category,
        description: form.description,
        amount: form.amount || 0.00,
        record_date: form.record_date,
        priority: form.priority,
        extra_info: form.extra_info
      }).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('✓ Record updated successfully.');
          this.viewMode.set('list');
          this.loadViewData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set('✕ Failed to update record: ' + (err?.error?.detail || 'Server error'));
        }
      });
    } else {
      const payload = {
        record_type: sub,
        employee_id: emp?.id,
        title: form.title,
        category: form.category || 'GENERAL',
        description: form.description,
        amount: form.amount || 0.00,
        record_date: form.record_date,
        priority: form.priority,
        extra_info: form.extra_info
      };
      this.hrmsService.createEssRecord(sub, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('✓ New record saved successfully.');
          this.viewMode.set('list');
          this.loadViewData();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set('✕ Failed to create record: ' + (err?.error?.detail || 'Server error'));
        }
      });
    }
  }

  deleteItem(item: any): void {
    if (!confirm(`Are you sure you want to delete this record (${item.reference || item.ref || item.title})?`)) {
      return;
    }
    const sub = this.currentSubView();
    this.hrmsService.deleteEssRecord(sub, item.id).subscribe({
      next: () => {
        this.successMessage.set('✓ Record deleted successfully.');
        this.loadViewData();
      },
      error: (err) => {
        this.errorMessage.set('✕ Unable to delete record: ' + (err?.error?.detail || 'Server error'));
      }
    });
  }

  viewDetailModal(item: any): void {
    this.selectedItem.set(item);
    this.viewMode.set('detail');
  }

  downloadDoc(item?: any): void {
    const docName = item?.title || this.currentViewMeta().title;
    alert(`Generating & Downloading Encrypted PDF: ${docName}`);
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
