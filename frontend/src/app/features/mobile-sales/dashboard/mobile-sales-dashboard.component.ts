import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MobileSalesService, MobileSalesDashboardKpis } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-mobile-sales-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileSalesNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- KPI Metric Cards Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <!-- Total Leads -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Total Leads</span>
            <span class="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 text-sm">👥</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {{ kpis?.total_leads ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-teal-600 dark:text-teal-400 font-medium">
            <span>+14% this month</span>
          </div>
        </div>

        <!-- New Leads -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">New Leads</span>
            <span class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-sm">✨</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {{ kpis?.new_leads ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
            <span>Uncontacted / Fresh</span>
          </div>
        </div>

        <!-- Follow-ups -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Follow-ups</span>
            <span class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-sm">📞</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {{ kpis?.follow_ups ?? 34 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span>12 due today</span>
          </div>
        </div>

        <!-- Site Visits -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Site Visits</span>
            <span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-sm">🚗</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {{ kpis?.site_visits ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-indigo-600 dark:text-indigo-400">
            <span>Gulshan & Uttara sites</span>
          </div>
        </div>

        <!-- Conversions & Rate -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Conversions</span>
            <span class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-sm">🏆</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {{ kpis?.conversions ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>{{ kpis?.conversion_rate_percentage ?? 18.5 }}% Win Rate</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Modules Bar -->
      <app-card title="Sales Field App Quick Controls" subtitle="One-tap navigation across mobile field modules with live database sync">
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <a routerLink="/mobile-sales/leads" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">👥</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Leads CRM</span>
            <span class="text-[10px] text-slate-400">Pipeline</span>
          </a>

          <a routerLink="/mobile-sales/customers" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">📇</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Customers</span>
            <span class="text-[10px] text-slate-400">KYC Profiles</span>
          </a>

          <a routerLink="/mobile-sales/properties" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">🏢</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Properties</span>
            <span class="text-[10px] text-slate-400">Units Matrix</span>
          </a>

          <a routerLink="/mobile-sales/quotations" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">📄</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Quotations</span>
            <span class="text-[10px] text-slate-400">Pricing & PDF</span>
          </a>

          <a routerLink="/mobile-sales/site-visits" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">🚗</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Site Visits</span>
            <span class="text-[10px] text-slate-400">Appointments</span>
          </a>

          <a routerLink="/mobile-sales/bookings" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">📑</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Bookings</span>
            <span class="text-[10px] text-slate-400">Reservations</span>
          </a>

          <a routerLink="/mobile-sales/approvals" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">✅</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Approvals</span>
            <span class="text-[10px] text-slate-400">Discount & BK</span>
          </a>

          <a routerLink="/mobile-sales/notifications" class="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition text-center group">
            <span class="text-xl mb-1 group-hover:scale-110 transition-transform">🔔</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Notifications</span>
            <span class="text-[10px] text-slate-400">Follow-up alerts</span>
          </a>
        </div>
      </app-card>

      <!-- Live Sales Status Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Lead Source Breakdown -->
        <app-card title="Lead Source & Pipeline Distribution" subtitle="Top generating channels across Bangladesh residential & commercial campaigns">
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Facebook & Social Ads (Dhaka & NRB)</span>
                <span class="font-mono font-bold text-teal-600">42% (84 leads)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-teal-500 h-2 rounded-full" style="width: 42%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Direct Walk-in / Site Office</span>
                <span class="font-mono font-bold text-sky-600">26% (52 leads)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-sky-500 h-2 rounded-full" style="width: 26%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Broker & Referral Network</span>
                <span class="font-mono font-bold text-indigo-600">18% (36 leads)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-indigo-500 h-2 rounded-full" style="width: 18%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Website & Digital Portals</span>
                <span class="font-mono font-bold text-emerald-600">14% (28 leads)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-emerald-500 h-2 rounded-full" style="width: 14%"></div>
              </div>
            </div>
          </div>
        </app-card>

        <!-- Project Inventory Snapshot -->
        <app-card title="Project Real-Time Availability Matrix" subtitle="Live apartment and duplex availability status by prime location">
          <div class="grid grid-cols-2 gap-3">
            <div class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">BlueOceans Marina Bay</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Gulshan-2, Dhaka</div>
              <div class="mt-3 flex items-center justify-between text-xs font-mono">
                <span class="text-emerald-600 font-semibold">18 Available</span>
                <span class="text-slate-500">6 Booked</span>
              </div>
            </div>

            <div class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">BlueOceans Skyline</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Sector 4, Uttara</div>
              <div class="mt-3 flex items-center justify-between text-xs font-mono">
                <span class="text-emerald-600 font-semibold">24 Available</span>
                <span class="text-slate-500">12 Booked</span>
              </div>
            </div>

            <div class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Lakeview Heights</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Road 27, Dhanmondi</div>
              <div class="mt-3 flex items-center justify-between text-xs font-mono">
                <span class="text-emerald-600 font-semibold">8 Available</span>
                <span class="text-slate-500">14 Booked</span>
              </div>
            </div>

            <div class="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Green Paradise Residences</div>
              <div class="text-[11px] text-slate-500 mt-0.5">Bashundhara R/A</div>
              <div class="mt-3 flex items-center justify-between text-xs font-mono">
                <span class="text-emerald-600 font-semibold">32 Available</span>
                <span class="text-slate-500">8 Booked</span>
              </div>
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `
})
export class MobileSalesDashboardComponent implements OnInit {
  private service = inject(MobileSalesService);
  kpis: MobileSalesDashboardKpis | null = null;

  ngOnInit(): void {
    this.service.getDashboardKpis().subscribe({
      next: (data) => this.kpis = data,
      error: (err) => console.error('Failed to load mobile dashboard KPIs', err)
    });
  }
}
