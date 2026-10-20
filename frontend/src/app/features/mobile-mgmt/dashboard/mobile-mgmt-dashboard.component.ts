import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MobileMgmtService, MgmtDashboardMetrics } from '../../../core/services/mobile-mgmt.service';
import { MobileMgmtNavComponent } from '../mobile-mgmt-nav/mobile-mgmt-nav.component';

@Component({
  selector: 'app-mobile-mgmt-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileMgmtNavComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-mgmt-nav activeTab="dashboard"></app-mobile-mgmt-nav>
      </div>

      <!-- Top Headline -->
      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Executive Management Cockpit</h1>
          <p class="text-sm text-slate-500 mt-1">Real-time financial performance, profitability margins, cashflow and governance overview</p>
        </div>
        <div class="flex items-center gap-3">
          <a routerLink="/mobile-mgmt/approvals" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Review Pending Approvals ({{ metrics?.pending_executive_approvals }})
          </a>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div class="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <!-- Total Revenue -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Booked Revenue</div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">
            ৳ {{ (metrics?.total_revenue || 0) / 10000000 | number:'1.2-2' }} Cr
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-600">
            <span>BDT {{ metrics?.total_revenue | number:'1.0-0' }}</span>
          </div>
        </div>

        <!-- Total Cost & Expenses -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Construction & Ops Cost</div>
          <div class="text-2xl font-extrabold text-slate-900 font-mono">
            ৳ {{ (metrics?.total_expenses || 0) / 10000000 | number:'1.2-2' }} Cr
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-slate-500">
            <span>Cumulative BOQ & Overhead Expenses</span>
          </div>
        </div>

        <!-- Net Profit & Margin -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Net Projected Profit</div>
          <div class="text-2xl font-extrabold text-emerald-600 font-mono">
            ৳ {{ (metrics?.net_profit || 0) / 10000000 | number:'1.2-2' }} Cr
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex">
            <span>Margin: {{ metrics?.profit_margin_percentage }}%</span>
          </div>
        </div>

        <!-- Collections vs Receivables -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Realized Collections</div>
          <div class="text-2xl font-extrabold text-indigo-600 font-mono">
            ৳ {{ (metrics?.total_collections || 0) / 10000000 | number:'1.2-2' }} Cr
          </div>
          <div class="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-600">
            <span>Receivables: ৳ {{ (metrics?.outstanding_receivables || 0) / 10000000 | number:'1.2-2' }} Cr</span>
          </div>
        </div>
      </div>

      <!-- Executive Quick Links Grid -->
      <div class="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <a routerLink="/mobile-mgmt/projects" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Project Portfolio & Profitability</h3>
          <p class="text-xs text-slate-500">Track EVM, construction progress %, cost variances and project-wise profitability benchmarks.</p>
        </a>

        <a routerLink="/mobile-mgmt/cashflow" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Cash Runway & Projections</h3>
          <p class="text-xs text-slate-500">Review monthly receivables vs. vendor payables and projected operational cash positions.</p>
        </a>

        <a routerLink="/mobile-mgmt/compliance" class="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:border-rose-300 hover:shadow-md transition-all group">
          <div class="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h3 class="text-lg font-bold text-slate-800 mb-1">Statutory Compliance & Deadlines</h3>
          <p class="text-xs text-slate-500">RAJUK approvals, environmental clearances, fire safety renewals and legal deadlines.</p>
        </a>
      </div>
    </div>
  `
})
export class MobileMgmtDashboardComponent implements OnInit {
  metrics: MgmtDashboardMetrics | null = null;

  constructor(private mgmtService: MobileMgmtService) {}

  ngOnInit() {
    this.mgmtService.getDashboardMetrics().subscribe(data => {
      this.metrics = data;
    });
  }
}
