import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { HrmsLeavePagesService, LeavePageSection } from '../../../core/services/hrms-leave-pages.service';

interface LeavePageNavItem {
  section: LeavePageSection;
  label: string;
  route: string;
}

@Component({
  selector: 'app-leave-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  template: `
    <main class="min-h-screen bg-[#f4f7f6] text-slate-800">
      <div class="mx-auto max-w-[1480px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header class="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-teal-800">People operations <span class="px-1 text-slate-300">/</span> Leave desk</p>
            <h1 class="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{{ pageTitle }}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{{ pageDescription }}</p>
          </div>
          @if (mode === 'list' && section !== 'approvals') {
            <a [routerLink]="pathFor(section, 'new')" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-800 focus:ring-offset-2">
              <span class="text-xl leading-none" aria-hidden="true">+</span> {{ createLabel }}
            </a>
          } @else if (mode !== 'list') {
            <a [routerLink]="pathFor(section)" class="inline-flex min-h-11 items-center justify-center border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-800 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700">Back to register</a>
          }
        </header>

        <nav aria-label="Leave management" class="mb-7 flex gap-1 overflow-x-auto border-b border-slate-200">
          @for (item of navigation; track item.section) {
            <a [routerLink]="item.route" [attr.aria-current]="section === item.section ? 'page' : null"
               class="shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition"
               [class.border-teal-800]="section === item.section"
               [class.text-teal-900]="section === item.section"
               [class.border-transparent]="section !== item.section"
               [class.text-slate-500]="section !== item.section"
               [class.hover:text-slate-900]="section !== item.section">{{ item.label }}</a>
          }
          <a routerLink="/hrms/leave/approvals" class="shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition"
             [class.border-teal-800]="section === 'approvals'" [class.text-teal-900]="section === 'approvals'"
             [class.border-transparent]="section !== 'approvals'" [class.text-slate-500]="section !== 'approvals'">
            Approvals <span class="ml-1 border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">QUEUE</span>
          </a>
          <a routerLink="/hrms/leave/history" class="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-teal-900">History</a>
          <a routerLink="/hrms/leave/calendar" class="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-teal-900">Calendar</a>
          <a routerLink="/hrms/leave/holidays" class="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-teal-900">Holidays</a>
          <a routerLink="/hrms/leave/encashment" class="shrink-0 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-slate-500 transition hover:text-teal-900">Encashment</a>
          <a routerLink="/hrms/leave-overtime" class="ml-auto hidden shrink-0 border-b-2 border-transparent px-4 py-3 text-xs font-semibold text-slate-500 transition hover:text-teal-900 sm:block">Legacy leave & overtime</a>
        </nav>

        @if (successMessage) {
          <div role="status" class="mb-5 flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span>{{ successMessage }}</span><button type="button" (click)="successMessage = ''" aria-label="Dismiss success message">×</button>
          </div>
        }
        @if (errorMessage) {
          <div role="alert" class="mb-5 flex items-center justify-between border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <span>{{ errorMessage }}</span><button type="button" (click)="errorMessage = ''" aria-label="Dismiss error message">×</button>
          </div>
        }

        @if (mode === 'list') {
          <section aria-label="Leave register">
            <div class="mb-5 grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-[minmax(240px,1fr)_220px_auto] sm:items-end sm:p-5">
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Search register
                <input type="search" [(ngModel)]="search" (ngModelChange)="searchChanged()" placeholder="Name, code or reason"
                       class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 placeholder:text-slate-400 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
              </label>
              @if (section === 'applications' || section === 'approvals') {
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Workflow status
                  <select [(ngModel)]="statusFilter" (ngModelChange)="filterChanged()" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                    <option value="">All statuses</option><option value="PENDING_MANAGER">Manager review</option><option value="PENDING_HR">HR review</option>
                    <option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
              } @else if (section === 'entitlements') {
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Leave year
                  <input type="number" [(ngModel)]="yearFilter" (ngModelChange)="filterChanged()" min="2000" max="2200"
                         class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                </label>
              } @else {
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Record status
                  <select [(ngModel)]="activeFilter" (ngModelChange)="filterChanged()" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                    <option value="">All records</option><option value="true">Active</option><option value="false">Inactive</option>
                  </select>
                </label>
              }
              <button type="button" (click)="resetFilters()" class="h-11 border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-800 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700">Reset</button>
            </div>

            <div class="border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,.035)]">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 class="text-sm font-semibold text-slate-950">{{ section === 'approvals' ? 'Approval queue' : pageTitle + ' register' }}</h2>
                  <p class="mt-1 text-xs text-slate-500">Database-backed · organization-scoped · server filtered</p>
                </div>
                <span class="text-xs font-semibold tabular-nums text-slate-500">{{ total }} {{ total === 1 ? 'record' : 'records' }}</span>
              </div>
              @if (loading) {
                <div class="space-y-3 p-5" aria-live="polite" aria-label="Loading leave records">
                  @for (row of [1, 2, 3, 4]; track row) { <div class="h-12 animate-pulse bg-slate-100"></div> }
                </div>
              } @else if (rows.length) {
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[760px] text-left text-sm">
                    <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
                      <tr>
                        <th class="px-5 py-3">{{ referenceLabel }}</th>
                        <th class="px-5 py-3">{{ primaryLabel }}</th>
                        <th class="px-5 py-3">{{ secondaryLabel }}</th>
                        <th class="px-5 py-3">Status</th>
                        <th class="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (row of rows; track row.id) {
                        <tr class="transition hover:bg-teal-50/40">
                          <td class="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-teal-900">{{ referenceFor(row) }}</td>
                          <td class="px-5 py-4"><div class="font-semibold text-slate-900">{{ primaryFor(row) }}</div><div class="mt-1 max-w-sm truncate text-xs text-slate-500">{{ detailFor(row) }}</div></td>
                          <td class="px-5 py-4 text-sm text-slate-600">{{ secondaryFor(row) }}</td>
                          <td class="px-5 py-4"><span class="inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold" [class]="statusClass(row)"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>{{ statusLabel(row) }}</span></td>
                          <td class="whitespace-nowrap px-5 py-4 text-right">
                            <a [routerLink]="pathFor(section, row.id)" class="px-2 py-1 text-xs font-semibold text-teal-900 hover:underline">View</a>
                            @if (canEdit(row)) { <a [routerLink]="pathFor(section, row.id, 'edit')" class="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-teal-900">Edit</a> }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <footer class="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                  <span>Showing {{ offset + 1 }}–{{ Math.min(offset + limit, total) }} of {{ total }}</span>
                  <div class="flex gap-2">
                    <button type="button" (click)="changePage(-1)" [disabled]="offset === 0" class="border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    <button type="button" (click)="changePage(1)" [disabled]="offset + limit >= total" class="border border-slate-300 px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                  </div>
                </footer>
              } @else {
                <div class="px-6 py-14 text-center">
                  <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-teal-100 bg-teal-50 font-serif text-2xl text-teal-900" aria-hidden="true">L</div>
                  <h3 class="text-base font-semibold text-slate-900">{{ search || statusFilter ? 'No matching records' : 'Your register is ready' }}</h3>
                  <p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{{ search || statusFilter ? 'Adjust the search or filters and try again.' : emptyDescription }}</p>
                  @if (section !== 'approvals' && !search && !statusFilter) { <a [routerLink]="pathFor(section, 'new')" class="mt-5 inline-flex border border-teal-900 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-900 hover:text-white">Create {{ createLabel }}</a> }
                </div>
              }
            </div>
          </section>
        } @else if (loading && mode === 'detail') {
          <section class="border border-slate-200 bg-white p-6" aria-live="polite"><div class="h-6 w-48 animate-pulse bg-slate-100"></div><div class="mt-5 h-24 animate-pulse bg-slate-50"></div></section>
        } @else if (mode === 'detail') {
          @if (record) {
            <section class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article class="border border-slate-200 bg-white">
                <div class="border-b border-slate-200 px-5 py-5 sm:px-7">
                  <p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-800">{{ referenceLabel }} · {{ referenceFor(record) }}</p>
                  <h2 class="mt-2 font-serif text-2xl font-semibold text-slate-950">{{ primaryFor(record) }}</h2>
                  <p class="mt-1 text-sm text-slate-500">{{ detailFor(record) }}</p>
                </div>
                <dl class="grid gap-x-8 gap-y-6 px-5 py-6 sm:grid-cols-2 sm:px-7">
                  @for (item of detailItems(); track item.label) {
                    <div><dt class="text-[10px] font-bold uppercase tracking-[.15em] text-slate-500">{{ item.label }}</dt><dd class="mt-1.5 break-words text-sm font-medium text-slate-900">{{ item.value || '—' }}</dd></div>
                  }
                </dl>
                @if (isApplication) {
                  <div class="mx-5 mb-6 border-t border-slate-200 pt-5 sm:mx-7">
                    <h3 class="text-sm font-semibold text-slate-900">Approval trail</h3>
                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                      <div class="border border-slate-200 bg-slate-50 p-4"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">Manager review</p><p class="mt-2 text-sm font-semibold text-slate-900">{{ record.manager_approver_name || 'Awaiting review' }}</p><p class="mt-1 text-xs text-slate-600">{{ record.manager_remarks || 'No remarks recorded' }}</p></div>
                      <div class="border border-slate-200 bg-slate-50 p-4"><p class="text-[10px] font-bold uppercase tracking-wide text-slate-500">HR review</p><p class="mt-2 text-sm font-semibold text-slate-900">{{ record.hr_approver_name || 'Awaiting review' }}</p><p class="mt-1 text-xs text-slate-600">{{ record.hr_remarks || 'No remarks recorded' }}</p></div>
                    </div>
                  </div>
                }
              </article>
              <aside class="h-fit border border-slate-200 bg-white p-5">
                <h3 class="text-sm font-semibold text-slate-950">Record actions</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500">Actions respect current leave workflow and balance state.</p>
                <div class="mt-5 grid gap-2">
                  @if (canEdit(record)) { <a [routerLink]="pathFor(section, record.id, 'edit')" class="border border-slate-300 px-4 py-3 text-center text-sm font-semibold text-slate-800 hover:border-teal-800 hover:text-teal-900">Edit record</a> }
                  @if (record.status === 'PENDING_MANAGER') {
                    <label class="text-xs font-semibold text-slate-600">Manager remarks<textarea [(ngModel)]="reviewRemarks" rows="3" class="mt-1 block w-full border border-slate-300 p-3 text-sm focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800"></textarea></label>
                    <button type="button" (click)="review(true)" [disabled]="saving" class="bg-teal-900 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-50">Recommend to HR</button>
                    <button type="button" (click)="review(false)" [disabled]="saving" class="border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Reject request</button>
                  } @else if (record.status === 'PENDING_HR') {
                    <label class="text-xs font-semibold text-slate-600">HR remarks<textarea [(ngModel)]="reviewRemarks" rows="3" class="mt-1 block w-full border border-slate-300 p-3 text-sm focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800"></textarea></label>
                    <button type="button" (click)="review(true)" [disabled]="saving" class="bg-teal-900 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-50">Approve leave</button>
                    <button type="button" (click)="review(false)" [disabled]="saving" class="border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Reject request</button>
                  }
                  @if (isApplication && (record.status === 'APPROVED' || record.status === 'PENDING_HR' || record.status === 'PENDING_MANAGER')) {
                    <button type="button" (click)="cancelApplication()" [disabled]="saving" class="border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Cancel application</button>
                  }
                  @if (!isApplication) { <button type="button" (click)="deleteRecord()" [disabled]="saving" class="border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50">Delete record</button> }
                </div>
              </aside>
            </section>
          } @else {
            <section class="border border-slate-200 bg-white px-6 py-14 text-center"><h2 class="text-lg font-semibold text-slate-900">Record unavailable</h2><p class="mt-2 text-sm text-slate-500">It may have been removed or is outside your organization.</p><a [routerLink]="pathFor(section)" class="mt-5 inline-flex text-sm font-semibold text-teal-900 hover:underline">Return to register</a></section>
          }
        } @else {
          <section class="mx-auto max-w-4xl border border-slate-200 bg-white">
            <div class="border-b border-slate-200 px-5 py-5 sm:px-8">
              <p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-800">{{ mode === 'edit' ? 'Update existing record' : 'New database record' }}</p>
              <h2 class="mt-1 font-serif text-2xl font-semibold text-slate-950">{{ mode === 'edit' ? 'Edit ' + createLabel : 'Create ' + createLabel }}</h2>
              <p class="mt-1 text-sm text-slate-500">Changes are saved directly to the HRMS leave register.</p>
            </div>
            @if (loading) {
              <div class="space-y-4 p-6" aria-live="polite"><div class="h-10 animate-pulse bg-slate-100"></div><div class="h-24 animate-pulse bg-slate-100"></div></div>
            } @else {
              <form (ngSubmit)="save()" class="px-5 py-6 sm:px-8" #leaveForm="ngForm">
                @if (section === 'types') {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <label class="field-label">Type code<input name="type_code" [(ngModel)]="form.leave_type_code" required maxlength="50" placeholder="ANNUAL" class="field-control"></label>
                    <label class="field-label">English name<input name="name_en" [(ngModel)]="form.name_en" required maxlength="100" placeholder="Annual leave" class="field-control"></label>
                    <label class="field-label">Bangla name<input name="name_bn" [(ngModel)]="form.name_bn" maxlength="150" placeholder="বার্ষিক ছুটি" class="field-control"></label>
                    <label class="field-label">Color<input name="color" type="color" [(ngModel)]="form.color_code" class="field-control h-11 p-1.5"></label>
                    <label class="field-label sm:col-span-2">Description<textarea name="description" [(ngModel)]="form.description" rows="3" maxlength="255" class="field-control"></textarea></label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="is_paid" type="checkbox" [(ngModel)]="form.is_paid" class="accent-teal-800"> Paid leave</label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="is_active" type="checkbox" [(ngModel)]="form.is_active" class="accent-teal-800"> Active type</label>
                  </div>
                } @else if (section === 'policies') {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <div class="field-label sm:col-span-2"><app-searchable-select name="policy_type" label="Leave type" placeholder="Find a leave type" [options]="typeOptions" [(ngModel)]="form.leave_type_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <label class="field-label sm:col-span-2">Policy name<input name="policy_name" [(ngModel)]="form.policy_name" required maxlength="150" placeholder="Annual leave policy" class="field-control"></label>
                    <label class="field-label">Annual entitlement (days)<input name="annual_entitlement_days" type="number" min="0" step="0.5" [(ngModel)]="form.annual_entitlement_days" required class="field-control"></label>
                    <label class="field-label">Accrual frequency<select name="accrual_frequency" [(ngModel)]="form.accrual_frequency" class="field-control"><option value="YEARLY">Yearly</option><option value="MONTHLY">Monthly</option><option value="PRO_RATA">Pro rata</option></select></label>
                    <label class="field-label">Carry-forward cap (days)<input name="max_carry_forward_days" type="number" min="0" step="0.5" [(ngModel)]="form.max_carry_forward_days" class="field-control"></label>
                    <label class="field-label">Expiry (months)<input name="carry_forward_expiry_months" type="number" min="0" [(ngModel)]="form.carry_forward_expiry_months" class="field-control"></label>
                    <label class="field-label">Minimum service (days)<input name="min_service_days_required" type="number" min="0" [(ngModel)]="form.min_service_days_required" class="field-control"></label>
                    <label class="field-label">Gender applicability<select name="gender_applicability" [(ngModel)]="form.gender_applicability" class="field-control"><option value="ALL">All employees</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="encashment_allowed" type="checkbox" [(ngModel)]="form.encashment_allowed" class="accent-teal-800"> Allow encashment</label>
                    <label class="field-label">Maximum encashment (days)<input name="max_encashment_days" type="number" min="0" step="0.5" [(ngModel)]="form.max_encashment_days" class="field-control"></label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2"><input name="policy_active" type="checkbox" [(ngModel)]="form.is_active" class="accent-teal-800"> Active policy</label>
                  </div>
                } @else if (section === 'entitlements') {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <div class="field-label sm:col-span-2"><app-searchable-select name="employee" label="Employee" placeholder="Search employee by name or code" [options]="employeeOptions" [(ngModel)]="form.employee_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <div class="field-label sm:col-span-2"><app-searchable-select name="entitlement_type" label="Leave type" placeholder="Find a leave type" [options]="typeOptions" [(ngModel)]="form.leave_type_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <label class="field-label">Leave year<input name="year" type="number" min="2000" max="2200" [(ngModel)]="form.year" required class="field-control"></label>
                    <label class="field-label">Opening days<input name="opening_balance" type="number" min="0" step="0.5" [(ngModel)]="form.opening_balance" required class="field-control"></label>
                    <label class="field-label sm:col-span-2">Carry-forward days<input name="carried_forward" type="number" min="0" step="0.5" [(ngModel)]="form.carried_forward" class="field-control"></label>
                    @if (mode === 'edit') { <p class="sm:col-span-2 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Accrued, used and pending days are maintained by the approval workflow. Only opening and carry-forward values can be edited here.</p> }
                  </div>
                } @else {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <div class="field-label sm:col-span-2"><app-searchable-select name="app_employee" label="Employee" placeholder="Search employee by name or code" [options]="employeeOptions" [(ngModel)]="form.employee_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <div class="field-label sm:col-span-2"><app-searchable-select name="app_type" label="Leave type" placeholder="Find a leave type" [options]="typeOptions" [(ngModel)]="form.leave_type_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <label class="field-label">First day<input name="start_date" type="date" [(ngModel)]="form.start_date" required class="field-control"></label>
                    <label class="field-label">Last day<input name="end_date" type="date" [(ngModel)]="form.end_date" required [min]="form.start_date" class="field-control"></label>
                    <label class="field-label sm:col-span-2">Reason<textarea name="reason" [(ngModel)]="form.reason" rows="4" required maxlength="2000" placeholder="Share the reason for this leave request" class="field-control"></textarea></label>
                    <label class="field-label">Emergency contact<input name="emergency_contact" [(ngModel)]="form.emergency_contact" maxlength="64" placeholder="Phone number" class="field-control"></label>
                    <label class="field-label">Supporting document URL<input name="document_url" type="url" [(ngModel)]="form.document_url" maxlength="255" placeholder="https://…" class="field-control"></label>
                    @if (mode === 'edit') { <p class="sm:col-span-2 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Applications can only be edited while awaiting the manager's first review. Resubmission keeps the current workflow state.</p> }
                  </div>
                }
                <div class="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                  <a [routerLink]="mode === 'edit' ? pathFor(section, routeId) : pathFor(section)" class="inline-flex min-h-11 items-center justify-center border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Discard</a>
                  <button type="submit" [disabled]="saving || !leaveForm.valid" class="inline-flex min-h-11 items-center justify-center bg-teal-900 px-6 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50">
                    {{ saving ? 'Saving…' : (mode === 'edit' ? 'Save changes' : 'Create ' + createLabel) }}
                  </button>
                </div>
              </form>
            }
          </section>
        }
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .field-label { display: block; font-size: .75rem; font-weight: 650; color: #475569; }
    .field-control { display: block; width: 100%; margin-top: .5rem; min-height: 2.75rem; border: 1px solid #cbd5e1; background: white; padding: .65rem .8rem; font-size: .875rem; font-weight: 400; color: #0f172a; }
    .field-control:focus { outline: 1px solid #115e59; border-color: #115e59; }
  `]
})
export class LeaveManagementPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeeService = inject(HrmsEmployeeService);
  private service = inject(HrmsLeavePagesService);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly Math = Math;
  readonly navigation: LeavePageNavItem[] = [
    { section: 'types', label: 'Leave types', route: '/hrms/leave/types' },
    { section: 'policies', label: 'Policies', route: '/hrms/leave/policies' },
    { section: 'entitlements', label: 'Entitlements', route: '/hrms/leave/entitlements' },
    { section: 'applications', label: 'Applications', route: '/hrms/leave/applications' }
  ];

  section: LeavePageSection = 'applications';
  mode = 'list';
  routeId = 0;
  rows: any[] = [];
  record: any = null;
  total = 0;
  limit = 20;
  offset = 0;
  loading = false;
  saving = false;
  search = '';
  statusFilter = '';
  activeFilter = '';
  yearFilter = new Date().getFullYear();
  successMessage = '';
  errorMessage = '';
  reviewRemarks = '';
  typeOptions: SelectOption[] = [];
  typeCatalog: any[] = [];
  employeeOptions: SelectOption[] = [];
  form: any = {};

  ngOnInit(): void {
    this.successMessage = window.history.state?.successMessage || '';
    this.route.data.subscribe(data => {
      this.section = (data['leaveSection'] || 'applications') as LeavePageSection;
      this.mode = data['leaveMode'] || 'list';
      this.routeId = Number(this.route.snapshot.paramMap.get('id') || 0);
      this.statusFilter = this.section === 'approvals' ? 'PENDING_MANAGER' : '';
      this.activeFilter = '';
      this.search = '';
      this.offset = 0;
      this.record = null;
      this.successMessage = window.history.state?.successMessage || '';
      this.errorMessage = '';
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.setupForm();
      if (['policies', 'entitlements', 'applications', 'approvals'].includes(this.section)) {
        this.loadTypes();
      }
      if (['entitlements', 'applications', 'approvals'].includes(this.section)) {
        this.loadEmployees();
      }
      this.loadPage();
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  get isApplication(): boolean {
    return this.section === 'applications' || this.section === 'approvals';
  }

  get pageTitle(): string {
    return this.section === 'types' ? 'Leave types'
      : this.section === 'policies' ? 'Leave policies'
        : this.section === 'entitlements' ? 'Leave entitlements'
          : this.section === 'approvals' ? 'Leave approvals'
            : 'Leave applications';
  }

  get pageDescription(): string {
    return this.section === 'types' ? 'Configure the leave categories available to teams across the organization.'
      : this.section === 'policies' ? 'Define eligibility and annual leave rules once, then apply them consistently.'
        : this.section === 'entitlements' ? 'Review employee-specific allowances and the available days maintained by workflow.'
          : this.section === 'approvals' ? 'Work through manager and HR decisions without bypassing approval stages.'
            : 'Track requests from submission through manager recommendation and final HR decision.';
  }

  get createLabel(): string {
    return this.section === 'types' ? 'Leave type'
      : this.section === 'policies' ? 'Policy'
        : this.section === 'entitlements' ? 'Entitlement'
          : 'Application';
  }

  get emptyDescription(): string {
    return this.section === 'types' ? 'Create your first leave type to make it available in policies and applications.'
      : this.section === 'policies' ? 'Create a policy to define annual allowance and carry-forward terms.'
        : this.section === 'entitlements' ? 'No entitlement records exist for this year yet. Add an employee allowance to get started.'
          : 'New leave requests and workflow updates will appear here.';
  }

  get referenceLabel(): string {
    return this.section === 'types' ? 'Type code' : this.section === 'policies' ? 'Policy' : this.section === 'entitlements' ? 'Employee' : 'Request';
  }

  get primaryLabel(): string {
    return this.section === 'types' ? 'Leave category' : this.section === 'policies' ? 'Policy rules' : this.section === 'entitlements' ? 'Leave type' : 'Employee / leave';
  }

  get secondaryLabel(): string {
    return this.section === 'types' ? 'Allowance' : this.section === 'policies' ? 'Entitlement' : this.section === 'entitlements' ? 'Balance' : 'Dates';
  }

  pathFor(section: LeavePageSection, idOrMode?: number | string, suffix?: string): string {
    const routeSection = section === 'approvals' && idOrMode !== undefined ? 'applications' : section;
    const base = `/hrms/leave/${routeSection}`;
    if (idOrMode === undefined) return base;
    if (idOrMode === 'new') return `${base}/new`;
    if (suffix) return `${base}/${idOrMode}/${suffix}`;
    return `${base}/${idOrMode}`;
  }

  searchChanged(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.offset = 0;
    this.searchTimer = setTimeout(() => this.loadRows(), 300);
  }

  filterChanged(): void {
    this.offset = 0;
    this.loadRows();
  }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = this.section === 'approvals' ? 'PENDING_MANAGER' : '';
    this.activeFilter = '';
    this.offset = 0;
    this.loadRows();
  }

  changePage(direction: number): void {
    this.offset = Math.max(0, this.offset + direction * this.limit);
    this.loadRows();
  }

  loadPage(): void {
    if (this.mode === 'list') {
      this.loadRows();
      return;
    }
    if (this.mode === 'new') return;
    if (!this.routeId) {
      this.errorMessage = 'The requested record is not valid.';
      return;
    }
    this.loading = true;
    this.service.get(this.section, this.routeId).subscribe({
      next: item => {
        this.record = item;
        this.form = { ...item };
        this.loading = false;
        this.reviewRemarks = '';
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
        this.loading = false;
      }
    });
  }

  loadRows(): void {
    if (this.mode !== 'list') return;
    this.loading = true;
    const filters: Record<string, string | number | boolean | null> = {
      search: this.search.trim() || null,
      limit: this.limit,
      offset: this.offset
    };
    if (this.section === 'entitlements') filters['year'] = this.yearFilter;
    if (this.section === 'applications' || this.section === 'approvals') filters['status'] = this.statusFilter || null;
    if (this.section === 'types' || this.section === 'policies') filters['is_active'] = this.activeFilter === '' ? null : this.activeFilter === 'true';
    this.service.list(this.section, filters).subscribe({
      next: result => {
        this.rows = result.items || [];
        this.total = result.total || 0;
        this.limit = result.limit || this.limit;
        this.offset = result.offset || 0;
        this.loading = false;
      },
      error: error => {
        this.rows = [];
        this.errorMessage = this.errorFor(error);
        this.loading = false;
      }
    });
  }

  setupForm(): void {
    const currentDate = new Date();
    const today = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    this.form = this.section === 'types'
      ? { leave_type_code: '', name_en: '', name_bn: '', is_paid: true, color_code: '#0f766e', description: '', is_active: true }
      : this.section === 'policies'
        ? { leave_type_id: '', policy_name: '', annual_entitlement_days: 10, accrual_frequency: 'YEARLY', max_carry_forward_days: 0, carry_forward_expiry_months: 12, encashment_allowed: false, max_encashment_days: 0, min_service_days_required: 90, gender_applicability: 'ALL', is_active: true }
        : this.section === 'entitlements'
          ? { employee_id: '', leave_type_id: '', year: this.yearFilter, opening_balance: 0, carried_forward: 0 }
          : { employee_id: '', leave_type_id: '', start_date: today, end_date: today, reason: '', emergency_contact: '', document_url: '' };
  }

  loadTypes(): void {
    this.service.list('types', { limit: 100, offset: 0, is_active: true }).subscribe({
      next: result => {
        this.typeCatalog = result.items || [];
        this.typeOptions = this.typeCatalog.map(type => ({
          value: type.id,
          label: `${type.name_en} (${type.leave_type_code})`
        }));
      },
      error: error => this.errorMessage = this.errorFor(error)
    });
  }

  loadEmployees(): void {
    this.employeeService.loadEmployees({ limit: 100, offset: 0, all: true }).subscribe({
      next: result => this.employeeOptions = (result.items || []).map(employee => ({
        value: employee.id,
        label: `${employee.first_name} ${employee.last_name}`,
        subLabel: employee.employee_code
      })),
      error: error => this.errorMessage = this.errorFor(error)
    });
  }

  save(): void {
    if (this.saving) return;
    if (this.isApplication) {
      this.form.reason = String(this.form.reason || '').trim();
      if (!this.form.reason) {
        this.errorMessage = 'Enter a brief reason for this leave request.';
        return;
      }
      if (this.form.start_date && this.form.end_date && this.form.end_date < this.form.start_date) {
        this.errorMessage = 'End date must be on or after the start date.';
        return;
      }
      if (this.form.start_date && this.form.end_date && this.form.start_date.slice(0, 4) !== this.form.end_date.slice(0, 4)) {
        this.errorMessage = 'Leave applications must be within a single leave year.';
        return;
      }
    }
    this.saving = true;
    this.errorMessage = '';
    const payload = this.payload();
    const request = this.mode === 'edit'
      ? this.service.update(this.section, this.routeId, payload)
      : this.service.create(this.section, payload);
    const submit = () => request.subscribe({
      next: result => {
        this.saving = false;
        this.successMessage = this.mode === 'edit' ? `${this.createLabel} updated successfully.` : `${this.createLabel} created successfully.`;
        void this.router.navigate([this.pathFor(this.section, result.id)], { state: { successMessage: this.successMessage } });
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
        this.saving = false;
      }
    });
    if (this.mode === 'new' && this.isApplication) {
      const leaveType = this.typeCatalog.find(type => Number(type.id) === Number(payload['leave_type_id']));
      if (leaveType?.is_paid) {
        this.service.list('entitlements', {
          employee_id: payload['employee_id'],
          leave_type_id: payload['leave_type_id'],
          year: Number(String(payload['start_date']).slice(0, 4)),
          limit: 1,
          offset: 0
        }).subscribe({
          next: balances => {
            const balance = balances.items?.[0];
            const days = Math.round((new Date(`${payload['end_date']}T00:00:00`).getTime() - new Date(`${payload['start_date']}T00:00:00`).getTime()) / 86400000) + 1;
            if (!balance) {
              this.errorMessage = 'No leave entitlement exists for this employee, leave type and year. Add or correct the entitlement before submitting.';
              this.saving = false;
            } else if (Number(balance.available_days) < days) {
              this.errorMessage = `Insufficient leave balance. Available: ${balance.available_days} days; requested: ${days} days.`;
              this.saving = false;
            } else {
              submit();
            }
          },
          error: error => {
            this.errorMessage = this.errorFor(error);
            this.saving = false;
          }
        });
        return;
      }
    }
    submit();
  }

  private payload(): Record<string, any> {
    const payload = { ...this.form };
    if (['policies', 'entitlements', 'applications'].includes(this.section)) {
      payload['leave_type_id'] = Number(payload['leave_type_id']);
    }
    if (['entitlements', 'applications'].includes(this.section)) {
      payload['employee_id'] = Number(payload['employee_id']);
    }
    if (this.section === 'applications' || this.section === 'approvals') {
      delete payload['status'];
      delete payload['total_days'];
      delete payload['is_paid'];
      delete payload['manager_remarks'];
      delete payload['hr_remarks'];
      payload['reason'] = String(payload['reason'] || '').trim();
    }
    return payload;
  }

  canEdit(row: any): boolean {
    return !this.isApplication || row.status === 'PENDING_MANAGER';
  }

  referenceFor(row: any): string {
    if (this.section === 'types') return row.leave_type_code || '—';
    if (this.section === 'policies') return row.policy_name || `Policy #${row.id}`;
    if (this.section === 'entitlements') return row.employee_code || `Employee #${row.employee_id}`;
    return `LV-${String(row.id).padStart(5, '0')}`;
  }

  primaryFor(row: any): string {
    if (this.section === 'types') return row.name_en;
    if (this.section === 'policies') return row.leave_type_name || row.policy_name;
    if (this.section === 'entitlements') return row.leave_type_name || 'Leave entitlement';
    return `${row.employee_name || 'Employee'} · ${row.leave_type_name || row.leave_type || 'Leave'}`;
  }

  detailFor(row: any): string {
    if (this.section === 'types') return row.description || (row.is_paid ? 'Paid leave' : 'Unpaid leave');
    if (this.section === 'policies') return `${row.accrual_frequency || 'YEARLY'} accrual · ${row.max_carry_forward_days || 0} day carry-forward`;
    if (this.section === 'entitlements') return `${row.department_name || 'Department not assigned'} · ${row.year}`;
    return `${row.total_days || 0} calendar days · ${row.reason || 'No reason provided'}`;
  }

  secondaryFor(row: any): string {
    if (this.section === 'types') return row.is_paid ? 'Paid' : 'Unpaid';
    if (this.section === 'policies') return `${row.annual_entitlement_days || 0} days / year`;
    if (this.section === 'entitlements') return `${row.available_days ?? 0} available · ${row.pending_days ?? 0} pending`;
    return `${this.formatDate(row.start_date)} — ${this.formatDate(row.end_date)}`;
  }

  statusLabel(row: any): string {
    if (this.section === 'types' || this.section === 'policies') return row.is_active ? 'Active' : 'Inactive';
    if (this.section === 'entitlements') return row.is_paid ? 'Paid plan' : 'Unpaid plan';
    return String(row.status || 'PENDING_MANAGER').replaceAll('_', ' ');
  }

  statusClass(row: any): string {
    if ((this.section === 'types' || this.section === 'policies') && row.is_active) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if ((this.section === 'types' || this.section === 'policies') && !row.is_active) return 'border-slate-200 bg-slate-100 text-slate-600';
    if (this.section === 'entitlements') return 'border-teal-200 bg-teal-50 text-teal-900';
    if (row.status === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (row.status === 'REJECTED' || row.status === 'CANCELLED') return 'border-rose-200 bg-rose-50 text-rose-800';
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  detailItems(): { label: string; value: string }[] {
    const row = this.record || {};
    if (this.section === 'types') return [
      { label: 'Type code', value: row.leave_type_code }, { label: 'English name', value: row.name_en },
      { label: 'Bangla name', value: row.name_bn }, { label: 'Paid status', value: row.is_paid ? 'Paid' : 'Unpaid' },
      { label: 'Description', value: row.description }, { label: 'Status', value: row.is_active ? 'Active' : 'Inactive' }
    ];
    if (this.section === 'policies') return [
      { label: 'Leave type', value: row.leave_type_name }, { label: 'Annual entitlement', value: `${row.annual_entitlement_days ?? 0} days` },
      { label: 'Accrual frequency', value: row.accrual_frequency }, { label: 'Carry-forward cap', value: `${row.max_carry_forward_days ?? 0} days` },
      { label: 'Expiry period', value: `${row.carry_forward_expiry_months ?? 0} months` }, { label: 'Minimum service', value: `${row.min_service_days_required ?? 0} days` },
      { label: 'Gender applicability', value: row.gender_applicability }, { label: 'Encashment', value: row.encashment_allowed ? `Up to ${row.max_encashment_days} days` : 'Not allowed' }
    ];
    if (this.section === 'entitlements') return [
      { label: 'Employee', value: `${row.employee_name || ''} (${row.employee_code || row.employee_id})` }, { label: 'Leave type', value: row.leave_type_name },
      { label: 'Year', value: String(row.year) }, { label: 'Opening', value: `${row.opening_balance ?? 0} days` },
      { label: 'Carried forward', value: `${row.carried_forward ?? 0} days` }, { label: 'Accrued', value: `${row.accrued_days ?? 0} days` },
      { label: 'Used', value: `${row.used_days ?? 0} days` }, { label: 'Pending', value: `${row.pending_days ?? 0} days` },
      { label: 'Available', value: `${row.available_days ?? 0} days` }, { label: 'Encashed', value: `${row.encashed_days ?? 0} days` }
    ];
    return [
      { label: 'Employee', value: `${row.employee_name || ''} (${row.employee_code || row.employee_id})` },
      { label: 'Department', value: row.department_name }, { label: 'Leave type', value: row.leave_type_name },
      { label: 'Status', value: String(row.status || '').replaceAll('_', ' ') }, { label: 'Start date', value: this.formatDate(row.start_date) },
      { label: 'End date', value: this.formatDate(row.end_date) }, { label: 'Duration', value: `${row.total_days || 0} calendar days` },
      { label: 'Paid leave', value: row.is_paid ? 'Yes' : 'No' }, { label: 'Reason', value: row.reason },
      { label: 'Emergency contact', value: row.emergency_contact }, { label: 'Supporting document', value: row.document_url }
    ];
  }

  review(approved: boolean): void {
    if (!this.record || this.saving) return;
    const tier = this.record.status === 'PENDING_MANAGER' ? 'manager' : 'hr';
    this.saving = true;
    this.errorMessage = '';
    this.service.review(this.record.id, tier, approved, this.reviewRemarks).subscribe({
      next: updated => {
        this.record = updated;
        this.reviewRemarks = '';
        this.saving = false;
        this.successMessage = approved ? (tier === 'manager' ? 'Request recommended to HR.' : 'Leave application approved.') : 'Leave application rejected; reserved days were restored.';
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
        this.saving = false;
      }
    });
  }

  cancelApplication(): void {
    if (!this.record || this.saving || !window.confirm('Cancel this leave application?')) return;
    this.saving = true;
    this.service.cancel(this.record.id).subscribe({
      next: updated => {
        this.record = updated;
        this.saving = false;
        this.successMessage = 'Leave application cancelled and its balance reservation was released.';
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
        this.saving = false;
      }
    });
  }

  deleteRecord(): void {
    if (!this.record || this.saving || !window.confirm(`Delete this ${this.createLabel.toLowerCase()}?`)) return;
    this.saving = true;
    this.service.delete(this.section, this.record.id).subscribe({
      next: () => {
        void this.router.navigate([this.pathFor(this.section)], { state: { successMessage: `${this.createLabel} deleted.` } });
      },
      error: error => {
        this.errorMessage = this.errorFor(error);
        this.saving = false;
      }
    });
  }

  private formatDate(value: string): string {
    return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }

  private errorFor(error: any): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(item => item?.msg).filter(Boolean).join(' · ') || 'Please correct the highlighted information and retry.';
    }
    return error?.message || 'Unable to complete this request. Please retry.';
  }
}
