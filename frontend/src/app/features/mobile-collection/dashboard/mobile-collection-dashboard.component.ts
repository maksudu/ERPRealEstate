import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MobileCollectionService, CollectionDashboardMetrics } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';

@Component({
  selector: 'app-mobile-collection-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileCollectionNavComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="dashboard"></app-mobile-collection-nav>
      </div>

      <!-- Top Headline -->
      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Collection Executive Cockpit</h1>
          <p class="text-sm text-slate-500 mt-1">Real-time recovery tracking, target realization, overdue aging & pending verifications</p>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/mobile-collection/payments" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Record Instant Payment
          </a>
        </div>
      </div>

      <!-- KPI Metrics Grid -->
      <div class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <!-- Today's Collection -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Today's Collection</div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">
            ৳ {{ metrics?.today_collection | number:'1.2-2' }}
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            <span>Live Field Receipts</span>
          </div>
          <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 opacity-40">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
        </div>

        <!-- Monthly Target & Progress -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Monthly Target Realization</div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">
            ৳ {{ metrics?.monthly_collection | number:'1.0-0' }}
          </div>
          <div class="mt-2">
            <div class="flex justify-between text-xs text-slate-500 font-medium mb-1">
              <span>Target: ৳ {{ metrics?.monthly_target | number:'1.0-0' }}</span>
              <span class="font-bold text-amber-600">{{ metrics?.collection_achievement_percentage }}%</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2">
              <div class="bg-amber-500 h-2 rounded-full transition-all" [style.width.%]="metrics?.collection_achievement_percentage || 0"></div>
            </div>
          </div>
        </div>

        <!-- Overdue Amount -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Overdue Outstanding</div>
          <div class="text-2xl font-extrabold text-rose-600 font-mono">
            ৳ {{ metrics?.total_overdue | number:'1.2-2' }}
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-rose-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Recovery follow-up required</span>
          </div>
        </div>

        <!-- Pending Receipt Verification -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Pending Receipts for Audit</div>
          <div class="text-2xl font-extrabold text-amber-600 font-mono">
            {{ metrics?.pending_receipts_count }} Receipts
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Awaiting Accounts posting</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Cards Grid -->
      <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <a routerLink="/mobile-collection/customers" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-amber-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Instant Customer Search</h3>
          <p class="text-xs text-slate-500">Search customer portfolio by name, phone, project or booking ID with 1-click ledger inquiry.</p>
        </a>

        <a routerLink="/mobile-collection/due-overdue" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-rose-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Due & Overdue Aging Tracking</h3>
          <p class="text-xs text-slate-500">Track 30/60/90+ days aging buckets, automated late fees calculation and SMS reminders.</p>
        </a>

        <a routerLink="/mobile-collection/loans" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Bank Loan Disbursement Hub</h3>
          <p class="text-xs text-slate-500">Track financial institution approvals, pending loan tranches and construction milestone certificates.</p>
        </a>
      </div>
    </div>
  `
})
export class MobileCollectionDashboardComponent implements OnInit {
  metrics: CollectionDashboardMetrics | null = null;

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.collectionService.getDashboardMetrics().subscribe(data => {
      this.metrics = data;
    });
  }
}
