import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { HrmsLeavePagesService } from '../../../core/services/hrms-leave-pages.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

type WorkflowPage = 'history' | 'calendar' | 'holidays' | 'encashment';
type WorkflowMode = 'list' | 'new' | 'edit' | 'detail';

interface WorkflowNavItem {
  label: string;
  path: string;
  page?: WorkflowPage;
}

@Component({
  selector: 'app-leave-workflow-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  template: `
    <main class="min-h-screen bg-[#f4f7f6] text-slate-800">
      <div class="mx-auto max-w-[1480px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <header class="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-teal-800">People operations <span class="px-1 text-slate-300">/</span> Leave desk</p>
            <h1 class="font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{{ title }}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{{ description }}</p>
          </div>
          @if (mode === 'list' && canCreate) {
            <a [routerLink]="pagePath('new')" class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-teal-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-800 focus:ring-offset-2">
              <span class="text-xl leading-none" aria-hidden="true">+</span> {{ createLabel }}
            </a>
          } @else if (mode !== 'list' && kind !== 'calendar') {
            <a [routerLink]="pagePath()" class="inline-flex min-h-11 items-center justify-center border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-800 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700">Back to register</a>
          }
        </header>

        <nav aria-label="Leave management" class="mb-7 flex gap-1 overflow-x-auto border-b border-slate-200">
          @for (item of navigation; track item.path) {
            <a [routerLink]="item.path" [attr.aria-current]="item.page === kind ? 'page' : null"
               class="shrink-0 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4"
               [class.border-teal-800]="item.page === kind" [class.text-teal-900]="item.page === kind"
               [class.border-transparent]="item.page !== kind" [class.text-slate-500]="item.page !== kind"
               [class.hover:text-slate-900]="item.page !== kind">{{ item.label }}</a>
          }
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

        @if (kind === 'calendar' && mode === 'list') {
          <section aria-label="Leave calendar">
            <div class="mb-5 flex flex-wrap items-end justify-between gap-3 border border-slate-200 bg-white p-4 sm:p-5">
              <div>
                <p class="text-xs font-bold uppercase tracking-[.14em] text-teal-800">Monthly overview</p>
                <h2 class="mt-1 font-serif text-2xl font-semibold text-slate-950">{{ monthLabel }}</h2>
              </div>
              <div class="flex flex-wrap gap-2">
                <button type="button" (click)="shiftMonth(-1)" class="h-10 border border-slate-300 px-3 text-sm font-semibold hover:border-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700" aria-label="Previous month">← Previous</button>
                <button type="button" (click)="goToToday()" class="h-10 border border-slate-300 px-3 text-sm font-semibold hover:border-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700">Today</button>
                <button type="button" (click)="shiftMonth(1)" class="h-10 border border-slate-300 px-3 text-sm font-semibold hover:border-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700">Next →</button>
                <a routerLink="/hrms/leave/applications/new" class="inline-flex h-10 items-center bg-teal-900 px-3 text-sm font-semibold text-white hover:bg-teal-950">Apply for leave</a>
                <a routerLink="/hrms/leave/holidays/new" class="inline-flex h-10 items-center border border-teal-900 px-3 text-sm font-semibold text-teal-900 hover:bg-teal-50">Add holiday</a>
              </div>
            </div>
            <div class="grid grid-cols-7 border-l border-t border-slate-200 bg-white text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">
              @for (day of weekDays; track day) { <div class="border-b border-r border-slate-200 py-2">{{ day }}</div> }
            </div>
            <div class="grid grid-cols-7 border-l border-slate-200 bg-white">
              @for (day of calendarCells; track $index) {
                <div class="min-h-24 border-b border-r border-slate-200 p-1.5 sm:min-h-32 sm:p-2" [class.bg-slate-50]="day && day.slice(0, 7) !== monthKey">
                  @if (day) {
                    <div class="mb-1 text-xs font-semibold" [class.text-teal-900]="day === today" [class.text-slate-700]="day !== today">{{ day.slice(8, 10) }}</div>
                    <div class="space-y-1">
                      @for (event of eventsForDay(day).slice(0, 3); track event.key) {
                        <a [routerLink]="event.path" class="block truncate border-l-2 px-1.5 py-1 text-left text-[10px] leading-4 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-700 sm:text-xs"
                           [class.border-amber-500]="event.type === 'holiday'" [class.bg-amber-50]="event.type === 'holiday'" [class.text-amber-900]="event.type === 'holiday'"
                           [class.border-teal-700]="event.type === 'leave'" [class.bg-teal-50]="event.type === 'leave'" [class.text-teal-950]="event.type === 'leave'">{{ event.title }}</a>
                      }
                      @if (eventsForDay(day).length > 3) { <p class="text-[10px] text-slate-500">+{{ eventsForDay(day).length - 3 }} more</p> }
                    </div>
                  }
                </div>
              }
            </div>
            <div class="mt-5 border border-slate-200 bg-white">
              <div class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h3 class="text-sm font-semibold text-slate-950">This month’s activity</h3>
                <span class="text-xs text-slate-500">{{ calendarEvents.length }} records · server filtered</span>
              </div>
              @if (loading) { <p class="px-4 py-8 text-sm text-slate-500" aria-live="polite">Loading calendar events…</p> }
              @else if (calendarEvents.length) {
                <div class="divide-y divide-slate-100">
                  @for (event of calendarEvents; track event.key) {
                    <a [routerLink]="event.path" class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-700">
                      <span class="w-24 shrink-0 text-xs font-semibold text-slate-500">{{ event.date | date:'dd MMM yyyy' }}</span>
                      <span class="min-w-0 flex-1 text-sm font-semibold text-slate-900">{{ event.title }}</span>
                      <span class="border px-2 py-1 text-[10px] font-bold uppercase tracking-wide" [class.border-amber-200]="event.type === 'holiday'" [class.bg-amber-50]="event.type === 'holiday'" [class.text-amber-900]="event.type === 'holiday'" [class.border-teal-200]="event.type === 'leave'" [class.bg-teal-50]="event.type === 'leave'" [class.text-teal-900]="event.type === 'leave'">{{ event.label }}</span>
                    </a>
                  }
                </div>
              } @else if (!loading) { <p class="px-4 py-8 text-center text-sm text-slate-500">No leave or holiday records fall in this month.</p> }
            </div>
          </section>
        } @else if (mode === 'list') {
          <section [attr.aria-label]="title + ' register'">
            <div class="mb-5 grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)_auto] sm:p-5">
              <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Search register
                <input type="search" [(ngModel)]="search" (ngModelChange)="searchChanged()" placeholder="Employee, code or reason" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal normal-case tracking-normal text-slate-900 placeholder:text-slate-400 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
              </label>
              @if (kind === 'history' || kind === 'encashment') {
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <app-searchable-select name="filter_employee" label="Employee" placeholder="All employees" [options]="employeeOptions" [(ngModel)]="employeeFilter" (ngModelChange)="filterChanged()" [allowCreateNew]="false"></app-searchable-select>
                </div>
                <div class="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <app-searchable-select name="filter_type" label="Leave type" placeholder="All leave types" [options]="typeOptions" [(ngModel)]="typeFilter" (ngModelChange)="filterChanged()" [allowCreateNew]="false"></app-searchable-select>
                </div>
              } @else {
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Holiday category
                  <input type="text" [(ngModel)]="holidayTypeFilter" (ngModelChange)="filterChanged()" placeholder="All categories" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                </label>
                <div class="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Active state
                  <div class="mt-2 flex h-11 items-center gap-1" role="group" aria-label="Holiday active filter">
                    <button type="button" (click)="setActiveFilter('')" [attr.aria-pressed]="activeFilter === ''" class="h-9 border px-3 text-xs font-semibold" [class.border-teal-800]="activeFilter === ''" [class.text-teal-900]="activeFilter === ''">All</button>
                    <button type="button" (click)="setActiveFilter('true')" [attr.aria-pressed]="activeFilter === 'true'" class="h-9 border px-3 text-xs font-semibold" [class.border-teal-800]="activeFilter === 'true'" [class.text-teal-900]="activeFilter === 'true'">Active</button>
                    <button type="button" (click)="setActiveFilter('false')" [attr.aria-pressed]="activeFilter === 'false'" class="h-9 border px-3 text-xs font-semibold" [class.border-teal-800]="activeFilter === 'false'" [class.text-teal-900]="activeFilter === 'false'">Inactive</button>
                  </div>
                </div>
              }
              <div class="flex items-end gap-2 lg:contents">
                @if (kind === 'history' || kind === 'encashment') {
                  <label class="block min-w-24 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {{ kind === 'history' ? 'Status' : 'State' }}
                    <input type="text" [(ngModel)]="statusFilter" (ngModelChange)="filterChanged()" [placeholder]="kind === 'history' ? 'All / APPROVED' : 'All / DRAFT'" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                  </label>
                  @if (kind === 'history') {
                    <label class="flex min-h-11 items-center gap-2 text-xs font-medium normal-case text-slate-700">
                      <input type="checkbox" [(ngModel)]="includeOpenRequests" (ngModelChange)="filterChanged()" class="accent-teal-800"> Include open requests
                    </label>
                  }
                  <label class="block w-28 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Year
                    <input type="number" [(ngModel)]="yearFilter" (ngModelChange)="filterChanged()" min="2000" max="2200" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                  </label>
                } @else {
                  <label class="block min-w-32 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Year
                    <input type="number" [(ngModel)]="yearFilter" (ngModelChange)="filterChanged()" min="2000" max="2200" class="mt-2 block h-11 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                  </label>
                }
                <button type="button" (click)="resetFilters()" class="h-11 border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-800 hover:text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700">Reset</button>
              </div>
            </div>
            @if (kind === 'history' || kind === 'holidays') {
              <div class="mb-5 grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-2">
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">From date
                  <input type="date" [(ngModel)]="fromDate" (ngModelChange)="filterChanged()" class="mt-2 block h-11 w-full border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                </label>
                <label class="block text-xs font-semibold uppercase tracking-wide text-slate-600">Through date
                  <input type="date" [(ngModel)]="throughDate" (ngModelChange)="filterChanged()" [min]="fromDate" class="mt-2 block h-11 w-full border border-slate-300 px-3 text-sm font-normal text-slate-900 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800">
                </label>
              </div>
            }
            <div class="border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,.035)]">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
                <div><h2 class="text-sm font-semibold text-slate-950">{{ title }} register</h2><p class="mt-1 text-xs text-slate-500">Database-backed · organization-scoped · server filtered</p></div>
                <span class="text-xs font-medium text-slate-500">{{ total }} record{{ total === 1 ? '' : 's' }}</span>
              </div>
              @if (loading) {
                <div class="space-y-3 p-5" aria-live="polite"><div class="h-10 animate-pulse bg-slate-100"></div><div class="h-10 animate-pulse bg-slate-100"></div><div class="h-10 animate-pulse bg-slate-100"></div></div>
              } @else if (rows.length) {
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[760px] text-left text-sm">
                    <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-[.14em] text-slate-500"><tr>
                      <th class="px-5 py-3">{{ kind === 'holidays' ? 'Holiday' : 'Reference' }}</th><th class="px-5 py-3">{{ kind === 'holidays' ? 'Category / dates' : 'Employee / leave' }}</th><th class="px-5 py-3">Period / details</th><th class="px-5 py-3">Status</th><th class="px-5 py-3 text-right">Actions</th>
                    </tr></thead>
                    <tbody class="divide-y divide-slate-100">
                      @for (row of rows; track row.id) {
                        <tr class="transition hover:bg-slate-50/70">
                          <td class="px-5 py-4"><a [routerLink]="pagePath(row.id)" class="font-semibold text-teal-900 hover:underline">{{ reference(row) }}</a><div class="mt-1 max-w-xs truncate text-xs text-slate-500">{{ row.description || row.reason || '—' }}</div></td>
                          <td class="px-5 py-4"><div class="font-semibold text-slate-900">{{ primary(row) }}</div><div class="mt-1 text-xs text-slate-500">{{ secondary(row) }}</div></td>
                          <td class="px-5 py-4 text-sm text-slate-700">{{ period(row) }}</td>
                          <td class="px-5 py-4"><span class="inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide" [ngClass]="statusClass(row)">{{ statusLabel(row) }}</span></td>
                          <td class="px-5 py-4 text-right whitespace-nowrap"><a [routerLink]="pagePath(row.id)" class="px-2 py-1 text-xs font-semibold text-teal-900 hover:underline">View</a>@if (canEdit(row)) { <a [routerLink]="pagePath(row.id, 'edit')" class="px-2 py-1 text-xs font-semibold text-slate-600 hover:text-teal-900">Edit</a> }</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                  <label class="flex items-center gap-2 text-xs text-slate-600">Rows per page <select [(ngModel)]="limit" (ngModelChange)="pageSizeChanged()" class="h-9 border border-slate-300 bg-white px-2 focus:border-teal-800 focus:outline-none focus:ring-1 focus:ring-teal-800"><option [ngValue]="10">10</option><option [ngValue]="20">20</option><option [ngValue]="50">50</option></select></label>
                  <div class="flex items-center gap-3"><span class="text-xs text-slate-500">{{ offset + 1 }}–{{ Math.min(offset + limit, total) }} of {{ total }}</span><button type="button" (click)="changePage(-1)" [disabled]="offset === 0" class="h-9 border border-slate-300 px-3 text-xs font-semibold disabled:opacity-40">Previous</button><button type="button" (click)="changePage(1)" [disabled]="offset + limit >= total" class="h-9 border border-slate-300 px-3 text-xs font-semibold disabled:opacity-40">Next</button></div>
                </footer>
              } @else {
                <div class="px-6 py-16 text-center"><p class="font-serif text-xl font-semibold text-slate-950">No {{ title.toLowerCase() }} found</p><p class="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{{ emptyMessage }}</p>
                  @if (canCreate && !search) { <a [routerLink]="pagePath('new')" class="mt-5 inline-flex border border-teal-900 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-900 hover:text-white">Create {{ createLabel }}</a> }
                </div>
              }
            </div>
          </section>
        } @else if (loading && mode === 'detail') {
          <div class="border border-slate-200 bg-white p-8" aria-live="polite"><div class="h-7 w-48 animate-pulse bg-slate-100"></div><div class="mt-5 h-28 animate-pulse bg-slate-100"></div></div>
        } @else if (mode === 'detail') {
          @if (record) {
            <section class="border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,.035)]">
              <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-8">
                <div><p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-800">{{ reference(record) }}</p><h2 class="mt-1 font-serif text-2xl font-semibold text-slate-950">{{ primary(record) }}</h2><p class="mt-1 text-sm text-slate-500">{{ period(record) }}</p></div>
                <span class="border px-3 py-1.5 text-xs font-bold uppercase tracking-wide" [ngClass]="statusClass(record)">{{ statusLabel(record) }}</span>
              </div>
              <dl class="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                @for (item of detailItems(); track item.label) { <div class="bg-white px-5 py-4 sm:px-7"><dt class="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{{ item.label }}</dt><dd class="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">{{ item.value || '—' }}</dd></div> }
              </dl>
              @if (kind === 'encashment' && record.status === 'DRAFT') {
                <div class="flex flex-wrap gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
                  <button type="button" (click)="runAction('approve')" [disabled]="saving" class="min-h-10 bg-teal-900 px-4 text-sm font-semibold text-white hover:bg-teal-950 disabled:opacity-50">Approve & settle balance</button>
                  <button type="button" (click)="runAction('archive')" [disabled]="saving" class="min-h-10 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 disabled:opacity-50">Archive draft</button>
                  <button type="button" (click)="deleteRecord()" [disabled]="saving" class="min-h-10 border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-800 disabled:opacity-50">Delete draft</button>
                  <a [routerLink]="pagePath(record.id, 'edit')" class="inline-flex min-h-10 items-center border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700">Edit draft</a>
                </div>
              } @else if (kind === 'encashment' && record.status === 'APPROVED') {
                <div class="border-t border-amber-200 bg-amber-50 px-5 py-4 sm:px-8"><p class="text-sm text-amber-950">Approved settlement is locked for audit. Reversal restores the exact days to this entitlement.</p><button type="button" (click)="runAction('reverse')" [disabled]="saving" class="mt-3 min-h-10 border border-amber-700 bg-white px-4 text-sm font-semibold text-amber-950 disabled:opacity-50">Reverse settlement</button></div>
              } @else if (kind === 'holidays') {
                <div class="flex flex-wrap gap-3 border-t border-slate-200 px-5 py-4 sm:px-8"><a [routerLink]="pagePath(record.id, 'edit')" class="inline-flex min-h-10 items-center border border-slate-300 px-4 text-sm font-semibold text-slate-700">Edit holiday</a><button type="button" (click)="deleteRecord()" [disabled]="saving" class="min-h-10 border border-rose-300 px-4 text-sm font-semibold text-rose-800 disabled:opacity-50">Delete holiday</button></div>
              }
            </section>
          } @else { <section class="border border-slate-200 bg-white px-6 py-14 text-center"><h2 class="text-lg font-semibold text-slate-900">Record unavailable</h2><p class="mt-2 text-sm text-slate-500">It may have been removed or is outside your organization.</p><a [routerLink]="pagePath()" class="mt-5 inline-flex text-sm font-semibold text-teal-900 hover:underline">Return to register</a></section> }
        } @else {
          <section class="border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,.035)]">
            <div class="border-b border-slate-200 px-5 py-5 sm:px-8"><p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-800">{{ mode === 'edit' ? 'Update existing record' : 'New database record' }}</p><h2 class="mt-1 font-serif text-2xl font-semibold text-slate-950">{{ mode === 'edit' ? 'Edit ' + createLabel : 'Create ' + createLabel }}</h2><p class="mt-1 text-sm text-slate-500">Changes are saved directly to the organization leave register.</p></div>
            @if (loading) { <div class="space-y-4 p-6" aria-live="polite"><div class="h-10 animate-pulse bg-slate-100"></div><div class="h-24 animate-pulse bg-slate-100"></div></div> }
            @else {
              <form (ngSubmit)="save()" class="px-5 py-6 sm:px-8" #workflowForm="ngForm">
                @if (kind === 'holidays') {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <label class="field-label sm:col-span-2">Holiday name<input name="holiday_name" [(ngModel)]="form.holiday_name" required maxlength="150" class="field-control" placeholder="Victory Day"></label>
                    <label class="field-label">Category<input name="holiday_type" [(ngModel)]="form.holiday_type" required maxlength="32" class="field-control" placeholder="PUBLIC_HOLIDAY"></label>
                    <label class="field-label">Duration (days)<input name="total_days" type="number" min="1" [(ngModel)]="form.total_days" class="field-control"></label>
                    <label class="field-label">Start date<input name="start_date" type="date" [(ngModel)]="form.start_date" required class="field-control"></label>
                    <label class="field-label">End date<input name="end_date" type="date" [(ngModel)]="form.end_date" required [min]="form.start_date" class="field-control"></label>
                    <label class="field-label sm:col-span-2">Description<textarea name="description" [(ngModel)]="form.description" maxlength="2000" rows="3" class="field-control"></textarea></label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="recurring" type="checkbox" [(ngModel)]="form.is_recurring_yearly" class="accent-teal-800"> Recurs yearly</label>
                    <label class="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="active" type="checkbox" [(ngModel)]="form.is_active" class="accent-teal-800"> Active holiday</label>
                  </div>
                } @else {
                  <div class="grid gap-5 sm:grid-cols-2">
                    <div class="field-label sm:col-span-2"><app-searchable-select name="employee" label="Employee" placeholder="Search employee by name or code" [options]="employeeOptions" [(ngModel)]="form.employee_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <div class="field-label sm:col-span-2"><app-searchable-select name="leave_type" label="Paid leave type" placeholder="Find an encashment-enabled leave type" [options]="paidTypeOptions" [(ngModel)]="form.leave_type_id" [required]="true" [allowCreateNew]="false"></app-searchable-select></div>
                    <label class="field-label">Leave year<input name="year" type="number" min="2000" max="2200" [(ngModel)]="form.year" required class="field-control"></label>
                    <label class="field-label">Days to encash<input name="days" type="number" min="0.01" step="0.5" [(ngModel)]="form.days" required class="field-control"></label>
                    <label class="field-label sm:col-span-2">Reason<textarea name="reason" [(ngModel)]="form.reason" rows="4" required maxlength="500" class="field-control" placeholder="Explain this encashment request"></textarea></label>
                    @if (mode === 'edit') { <p class="sm:col-span-2 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">Draft requests only. Approval applies eligibility, available-balance and annual-cap checks atomically.</p> }
                  </div>
                }
                <div class="mt-7 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  <a [routerLink]="mode === 'edit' ? pagePath(routeId) : pagePath()" class="inline-flex min-h-11 items-center border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Discard</a>
                  <button type="submit" [disabled]="saving || !workflowForm.valid" class="inline-flex min-h-11 items-center bg-teal-900 px-6 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:cursor-not-allowed disabled:opacity-50">{{ saving ? 'Saving…' : (mode === 'edit' ? 'Save changes' : 'Create ' + createLabel) }}</button>
                </div>
              </form>
            }
          </section>
        }
      </div>
    </main>
  `,
  styles: [`
    .field-label { display: block; color: #475569; font-size: .75rem; font-weight: 600; letter-spacing: .025em; }
    .field-control { display: block; width: 100%; margin-top: .5rem; min-height: 2.75rem; border: 1px solid #cbd5e1; background: white; padding: .65rem .75rem; color: #0f172a; font-size: .875rem; font-weight: 400; letter-spacing: normal; }
    .field-control:focus { border-color: #115e59; outline: 2px solid transparent; box-shadow: 0 0 0 1px #115e59; }
  `]
})
export class LeaveWorkflowPageComponent implements OnInit, OnDestroy {
  @Input({ required: true }) kind: WorkflowPage = 'history';
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(HrmsLeavePagesService);
  private employeeService = inject(HrmsEmployeeService);
  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly Math = Math;
  readonly today = this.localDate(new Date());
  readonly navigation: WorkflowNavItem[] = [
    { label: 'Types', path: '/hrms/leave/types' },
    { label: 'Policies', path: '/hrms/leave/policies' },
    { label: 'Entitlements', path: '/hrms/leave/entitlements' },
    { label: 'Applications', path: '/hrms/leave/applications' },
    { label: 'Approvals', path: '/hrms/leave/approvals' },
    { label: 'History', path: '/hrms/leave/history', page: 'history' },
    { label: 'Calendar', path: '/hrms/leave/calendar', page: 'calendar' },
    { label: 'Holidays', path: '/hrms/leave/holidays', page: 'holidays' },
    { label: 'Encashment', path: '/hrms/leave/encashment', page: 'encashment' }
  ];
  weekDays = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  mode: WorkflowMode = 'list';
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
  employeeFilter: number | string = '';
  typeFilter: number | string = '';
  activeFilter = '';
  includeOpenRequests = false;
  holidayTypeFilter = '';
  yearFilter = new Date().getFullYear();
  fromDate = '';
  throughDate = '';
  successMessage = '';
  errorMessage = '';
  form: any = {};
  employeeOptions: SelectOption[] = [];
  typeOptions: SelectOption[] = [];
  paidTypeOptions: SelectOption[] = [];
  calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  calendarApplications: any[] = [];
  calendarHolidays: any[] = [];

  ngOnInit(): void {
    if (this.kind === 'history' || this.kind === 'encashment') this.loadOptions();
    this.route.data.subscribe(data => {
      this.mode = (data['workflowMode'] || 'list') as WorkflowMode;
      this.routeId = Number(this.route.snapshot.paramMap.get('id') || 0);
      this.successMessage = window.history.state?.successMessage || '';
      this.errorMessage = '';
      this.offset = 0;
      this.record = null;
      this.setupForm();
      this.loadPage();
    });
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  get title(): string {
    return this.kind === 'history' ? 'Leave history' : this.kind === 'calendar' ? 'Leave calendar' : this.kind === 'holidays' ? 'Holiday calendar' : 'Leave encashment';
  }

  get description(): string {
    return this.kind === 'history' ? 'A searchable, auditable view of completed employee leave requests and their decisions.'
      : this.kind === 'calendar' ? 'See approved and pending leave alongside organization holidays in a date-oriented monthly view.'
        : this.kind === 'holidays' ? 'Maintain organization holidays with server-backed filters and an auditable detail view.'
          : 'Review proposed leave encashments and settle eligible requests against employee entitlements.';
  }

  get createLabel(): string { return this.kind === 'holidays' ? 'Holiday' : 'Encashment request'; }
  get canCreate(): boolean { return this.kind === 'holidays' || this.kind === 'encashment'; }
  get emptyMessage(): string {
    return this.kind === 'history' ? 'Closed leave applications will appear here. Adjust your filters to search older records.'
      : this.kind === 'holidays' ? 'No holidays match the current search and date filters.'
        : 'No encashment records match the current filters.';
  }
  get monthKey(): string { return `${this.calendarMonth.getFullYear()}-${String(this.calendarMonth.getMonth() + 1).padStart(2, '0')}`; }
  get monthLabel(): string { return this.calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }); }
  get calendarCells(): (string | null)[] {
    const firstDay = this.calendarMonth.getDay();
    const fridayFirstOffset = (firstDay + 2) % 7;
    const days = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 0).getDate();
    return [...Array(fridayFirstOffset).fill(null), ...Array.from({ length: days }, (_, index) => this.localDate(new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth(), index + 1)))];
  }
  get calendarEvents(): any[] {
    const holidayEvents = this.calendarHolidays.filter(item => item.is_active).map(item => ({
      key: `holiday-${item.id}`, type: 'holiday', label: 'Holiday', date: item.start_date,
      title: item.holiday_name, path: `/hrms/leave/holidays/${item.id}`, start: item.start_date, end: item.end_date
    }));
    const leaveEvents = this.calendarApplications.map(item => ({
      key: `leave-${item.id}`, type: 'leave', label: String(item.status || 'Leave').replaceAll('_', ' '),
      date: item.start_date, title: `${item.employee_name || 'Employee'} · ${item.leave_type_name || item.leave_type}`,
      path: `/hrms/leave/applications/${item.id}`, start: item.start_date, end: item.end_date
    }));
    return [...holidayEvents, ...leaveEvents].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }

  get formValid(): boolean {
    if (this.kind === 'holidays') return !!this.form.holiday_name?.trim() && !!this.form.holiday_type?.trim()
      && !!this.form.start_date && !!this.form.end_date && this.form.end_date >= this.form.start_date;
    return Number(this.form.employee_id) > 0 && Number(this.form.leave_type_id) > 0
      && Number(this.form.days) > 0 && !!this.form.reason?.trim();
  }

  pagePath(idOrMode?: number | string, suffix?: string): string {
    const base = `/hrms/leave/${this.kind}`;
    if (idOrMode === undefined) return base;
    if (idOrMode === 'new') return `${base}/new`;
    return suffix ? `${base}/${idOrMode}/${suffix}` : `${base}/${idOrMode}`;
  }

  loadOptions(): void {
    this.employeeService.loadEmployees({ limit: 100, offset: 0, all: true }).subscribe({
      next: result => this.employeeOptions = (result.items || []).map((item: any) => ({
        value: item.id, label: `${item.first_name} ${item.last_name}`, subLabel: item.employee_code
      })),
      error: error => this.errorMessage = this.errorFor(error)
    });
    forkJoin({
      types: this.service.list('types', { limit: 100, offset: 0, is_active: true }),
      policies: this.service.list('policies', { limit: 100, offset: 0, is_active: true })
    }).subscribe({
      next: result => {
        const encashableTypes = new Set((result.policies.items || [])
          .filter((policy: any) => policy.encashment_allowed && Number(policy.max_encashment_days) > 0)
          .map((policy: any) => Number(policy.leave_type_id)));
        this.typeOptions = (result.types.items || []).map((item: any) => ({ value: item.id, label: `${item.name_en} (${item.leave_type_code})` }));
        this.paidTypeOptions = (result.types.items || []).filter((item: any) => item.is_paid && encashableTypes.has(Number(item.id)))
          .map((item: any) => ({ value: item.id, label: `${item.name_en} (${item.leave_type_code})` }));
      },
      error: error => this.errorMessage = this.errorFor(error)
    });
  }

  loadPage(): void {
    if (this.mode === 'new') return;
    if (this.mode === 'detail' || this.mode === 'edit') {
      if (!this.routeId) { this.errorMessage = 'The requested record is not valid.'; return; }
      this.loading = true;
      const request = this.kind === 'holidays' ? this.service.getHoliday(this.routeId)
        : this.kind === 'history' ? this.service.get('applications', this.routeId)
          : this.service.getEncashment(this.routeId);
      request.subscribe({
        next: item => { this.record = item; this.form = { ...item }; this.loading = false; },
        error: error => { this.errorMessage = this.errorFor(error); this.loading = false; }
      });
      return;
    }
    if (this.kind === 'calendar') { this.loadCalendar(); return; }
    this.loadRows();
  }

  private loadRows(): void {
    const filters: Record<string, string | number | boolean | null> = {
      search: this.search.trim() || null, limit: this.limit, offset: this.offset
    };
    if (this.kind === 'history') {
      filters['status'] = this.statusFilter.trim().toUpperCase() || null;
      filters['employee_id'] = this.employeeFilter ? Number(this.employeeFilter) : null;
      filters['leave_type_id'] = this.typeFilter ? Number(this.typeFilter) : null;
      filters['year'] = this.yearFilter || null;
      filters['closed_only'] = !this.includeOpenRequests && !this.statusFilter.trim();
      filters['from_date'] = this.fromDate || null;
      filters['through_date'] = this.throughDate || null;
    } else {
      filters['status'] = this.statusFilter.trim().toUpperCase() || null;
      filters['employee_id'] = this.employeeFilter ? Number(this.employeeFilter) : null;
      filters['leave_type_id'] = this.typeFilter ? Number(this.typeFilter) : null;
      filters['year'] = this.yearFilter || null;
      filters['holiday_type'] = this.holidayTypeFilter.trim().toUpperCase() || null;
      filters['is_active'] = this.activeFilter === '' ? null : this.activeFilter === 'true';
      filters['from_date'] = this.fromDate || null;
      filters['through_date'] = this.throughDate || null;
    }
    this.loading = true;
    const request = this.kind === 'holidays' ? this.service.listHolidays(filters) : this.service.listEncashments(filters);
    request.subscribe({
      next: result => { this.rows = result.items || []; this.total = result.total || 0; this.limit = result.limit || this.limit; this.offset = result.offset || 0; this.loading = false; },
      error: error => { this.rows = []; this.errorMessage = this.errorFor(error); this.loading = false; }
    });
  }

  private loadCalendar(): void {
    const first = this.localDate(this.calendarMonth);
    const last = this.localDate(new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 0));
    this.loading = true;
    forkJoin({
      applications: this.service.list('applications', { from_date: first, through_date: last, limit: 100, offset: 0 }),
      holidays: this.service.listHolidays({ from_date: first, through_date: last, is_active: true, limit: 100, offset: 0 })
    }).subscribe({
      next: results => { this.calendarApplications = results.applications.items || []; this.calendarHolidays = results.holidays.items || []; this.loading = false; },
      error: error => { this.calendarApplications = []; this.calendarHolidays = []; this.errorMessage = this.errorFor(error); this.loading = false; }
    });
  }

  private setupForm(): void {
    const date = this.localDate(new Date());
    this.form = this.kind === 'holidays'
      ? { holiday_name: '', holiday_type: 'PUBLIC_HOLIDAY', start_date: date, end_date: date, total_days: 1, is_recurring_yearly: false, description: '', is_active: true }
      : { employee_id: '', leave_type_id: '', year: new Date().getFullYear(), days: '', reason: '' };
  }

  searchChanged(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.offset = 0;
    this.searchTimer = setTimeout(() => this.loadRows(), 300);
  }

  filterChanged(): void { this.offset = 0; this.loadRows(); }
  resetFilters(): void {
    this.search = ''; this.statusFilter = ''; this.employeeFilter = ''; this.typeFilter = '';
    this.activeFilter = ''; this.includeOpenRequests = false; this.holidayTypeFilter = ''; this.fromDate = ''; this.throughDate = '';
    this.yearFilter = new Date().getFullYear(); this.offset = 0; this.loadRows();
  }
  setActiveFilter(value: string): void { this.activeFilter = value; this.filterChanged(); }
  pageSizeChanged(): void { this.offset = 0; this.loadRows(); }
  changePage(direction: number): void { this.offset = Math.max(0, this.offset + direction * this.limit); this.loadRows(); }
  shiftMonth(delta: number): void { this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + delta, 1); this.loadCalendar(); }
  goToToday(): void { this.calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); this.loadCalendar(); }

  eventsForDay(day: string): any[] {
    return this.calendarEvents.filter(event => event.start <= day && event.end >= day);
  }

  save(): void {
    if (this.saving) return;
    if (!this.formValid) {
      if (this.kind === 'encashment' && !this.form.reason?.trim()) this.errorMessage = 'Enter a reason before submitting the encashment request.';
      else if (this.kind === 'encashment') this.errorMessage = 'Select an employee and paid leave type, then enter a positive number of days.';
      else if (this.kind === 'holidays' && this.form.end_date < this.form.start_date) this.errorMessage = 'End date must be on or after the start date.';
      else this.errorMessage = 'Enter a holiday name, category and valid start/end dates.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    const payload = { ...this.form };
    let request;
    if (this.kind === 'holidays') {
      payload.holiday_name = payload.holiday_name.trim();
      payload.holiday_type = payload.holiday_type.trim().toUpperCase();
      payload.total_days = Math.max(1, Math.floor((new Date(`${payload.end_date}T00:00:00`).getTime() - new Date(`${payload.start_date}T00:00:00`).getTime()) / 86400000) + 1);
      request = this.service.saveHoliday(payload, this.mode === 'edit' ? this.routeId : undefined);
    } else {
      payload.employee_id = Number(payload.employee_id);
      payload.leave_type_id = Number(payload.leave_type_id);
      payload.year = Number(payload.year);
      payload.days = Number(payload.days);
      payload.reason = String(payload.reason || '').trim();
      request = this.service.saveEncashment(payload, this.mode === 'edit' ? this.routeId : undefined);
    }
    request.subscribe({
      next: item => {
        this.saving = false;
        this.successMessage = this.mode === 'edit' ? `${this.createLabel} updated successfully.` : `${this.createLabel} created successfully.`;
        void this.router.navigate([this.pagePath(item.id)], { state: { successMessage: this.successMessage } });
      },
      error: error => { this.errorMessage = this.errorFor(error); this.saving = false; }
    });
  }

  canEdit(row: any): boolean { return this.kind === 'holidays' || row.status === 'DRAFT'; }
  reference(row: any): string {
    return this.kind === 'holidays' ? `HOL-${String(row.id).padStart(5, '0')}` : this.kind === 'history' ? `LV-${String(row.id).padStart(5, '0')}` : `ENC-${String(row.id).padStart(5, '0')}`;
  }
  primary(row: any): string {
    return this.kind === 'holidays' ? row.holiday_name : `${row.employee_name || 'Employee'} · ${row.leave_type_name || row.leave_type || 'Leave'}`;
  }
  secondary(row: any): string {
    return this.kind === 'holidays' ? row.holiday_type?.replaceAll('_', ' ') : row.employee_code || `Employee #${row.employee_id}`;
  }
  period(row: any): string {
    if (this.kind === 'holidays') return `${this.formatDate(row.start_date)} — ${this.formatDate(row.end_date)} · ${row.total_days || 1} day(s)`;
    if (this.kind === 'encashment') return `${row.days} days · ${row.year}`;
    return `${this.formatDate(row.start_date)} — ${this.formatDate(row.end_date)} · ${row.total_days || 0} days`;
  }
  statusLabel(row: any): string {
    if (this.kind === 'holidays') return row.is_active ? 'Active' : 'Inactive';
    return String(row.status || 'PENDING_MANAGER').replaceAll('_', ' ');
  }
  statusClass(row: any): string {
    if (this.kind === 'holidays') return row.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600';
    if (row.status === 'APPROVED') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (row.status === 'REJECTED' || row.status === 'CANCELLED' || row.status === 'REVERSED') return 'border-rose-200 bg-rose-50 text-rose-800';
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }
  detailItems(): { label: string; value: string }[] {
    const row = this.record || {};
    if (this.kind === 'holidays') return [
      { label: 'Holiday category', value: row.holiday_type?.replaceAll('_', ' ') }, { label: 'Start date', value: this.formatDate(row.start_date) },
      { label: 'End date', value: this.formatDate(row.end_date) }, { label: 'Duration', value: `${row.total_days || 1} day(s)` },
      { label: 'Recurring yearly', value: row.is_recurring_yearly ? 'Yes' : 'No' }, { label: 'Status', value: row.is_active ? 'Active' : 'Inactive' },
      { label: 'Description', value: row.description || '—' }
    ];
    if (this.kind === 'history') return [
      { label: 'Employee', value: `${row.employee_name || '—'} (${row.employee_code || row.employee_id})` }, { label: 'Department', value: row.department_name || '—' },
      { label: 'Leave type', value: row.leave_type_name || row.leave_type }, { label: 'Status', value: this.statusLabel(row) },
      { label: 'Start date', value: this.formatDate(row.start_date) }, { label: 'End date', value: this.formatDate(row.end_date) },
      { label: 'Duration', value: `${row.total_days || 0} calendar days` }, { label: 'Reason', value: row.reason || '—' },
      { label: 'Manager remarks', value: row.manager_remarks || '—' }, { label: 'HR remarks', value: row.hr_remarks || '—' },
      { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : '—' }
    ];
    return [
      { label: 'Employee', value: `${row.employee_name || '—'} (${row.employee_code || row.employee_id})` }, { label: 'Leave type', value: row.leave_type_name || '—' },
      { label: 'Leave year', value: String(row.year) }, { label: 'Days', value: `${row.days || 0} days` },
      { label: 'Status', value: this.statusLabel(row) }, { label: 'Reason', value: row.reason || '—' },
      { label: 'Created', value: row.created_at ? new Date(row.created_at).toLocaleString() : '—' },
      { label: 'Settled at', value: row.approved_at ? new Date(row.approved_at).toLocaleString() : '—' },
      { label: 'Archived at', value: row.archived_at ? new Date(row.archived_at).toLocaleString() : '—' }
    ];
  }

  runAction(action: 'approve' | 'archive' | 'reverse'): void {
    if (!this.record || this.saving) return;
    const text = action === 'approve' ? 'Approve this request and deduct the days from the employee entitlement?' : action === 'reverse' ? 'Reverse this settlement and restore the days to the entitlement?' : 'Archive this draft request?';
    if (!window.confirm(text)) return;
    this.saving = true;
    this.service.encashmentAction(this.record.id, action).subscribe({
      next: item => { this.record = item; this.saving = false; this.successMessage = action === 'approve' ? 'Encashment approved and entitlement updated.' : action === 'reverse' ? 'Settlement reversed and entitlement restored.' : 'Draft encashment archived.'; },
      error: error => { this.errorMessage = this.errorFor(error); this.saving = false; }
    });
  }

  deleteRecord(): void {
    if (!this.record || this.saving || !window.confirm(`Delete this ${this.kind === 'holidays' ? 'holiday' : 'draft encashment'}?`)) return;
    this.saving = true;
    const request = this.kind === 'holidays' ? this.service.deleteHoliday(this.record.id) : this.service.deleteEncashment(this.record.id);
    request.subscribe({
      next: () => void this.router.navigate([this.pagePath()], { state: { successMessage: `${this.kind === 'holidays' ? 'Holiday' : 'Draft encashment'} deleted.` } }),
      error: error => { this.errorMessage = this.errorFor(error); this.saving = false; }
    });
  }

  private localDate(value: Date): string {
    const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return date.toISOString().slice(0, 10);
  }
  private formatDate(value: string): string {
    return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  }
  private errorFor(error: any): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map(item => item?.msg).filter(Boolean).join(' · ') || 'Please correct the highlighted information and retry.';
    return error?.message || 'Unable to complete this request. Please retry.';
  }
}

@Component({ selector: 'app-leave-history-page', standalone: true, imports: [LeaveWorkflowPageComponent], template: '<app-leave-workflow-page kind="history" />' })
export class LeaveHistoryPageComponent {}

@Component({ selector: 'app-leave-calendar-page', standalone: true, imports: [LeaveWorkflowPageComponent], template: '<app-leave-workflow-page kind="calendar" />' })
export class LeaveCalendarPageComponent {}

@Component({ selector: 'app-leave-holidays-page', standalone: true, imports: [LeaveWorkflowPageComponent], template: '<app-leave-workflow-page kind="holidays" />' })
export class LeaveHolidaysPageComponent {}

@Component({ selector: 'app-leave-encashment-page', standalone: true, imports: [LeaveWorkflowPageComponent], template: '<app-leave-workflow-page kind="encashment" />' })
export class LeaveEncashmentPageComponent {}
