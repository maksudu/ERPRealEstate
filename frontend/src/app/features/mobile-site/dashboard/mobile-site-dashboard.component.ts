import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MobileSiteService, MobileSiteDashboardKpis } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-mobile-site-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MobileSiteNavComponent, CardContainerComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Active Project Banner -->
      <div class="p-4 rounded-xl bg-linear-to-r from-amber-600 to-amber-700 text-white shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 uppercase tracking-wider">
              Active Construction Site
            </span>
            <span class="text-xs text-amber-100">Zone-02 Gulshan-2, Dhaka</span>
          </div>
          <h2 class="text-lg font-bold mt-1 font-display">
            {{ kpis?.active_project ?? 'BlueOceans Marina Bay (Tower Alpha & Beta)' }}
          </h2>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-[11px] text-amber-100 block">Overall Milestone Progress</span>
            <span class="text-2xl font-bold font-mono">{{ kpis?.project_overall_progress_percent ?? 68.5 }}%</span>
          </div>
        </div>
      </div>

      <!-- KPI Metric Cards Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <!-- Site Labour Strength -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Labour Strength</span>
            <span class="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-sm">👷</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {{ kpis?.active_labour_strength_today ?? 142 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span>On-site head count today</span>
          </div>
        </div>

        <!-- Pending Tasks -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Tasks</span>
            <span class="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-sm">📋</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
            {{ kpis?.pending_tasks ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
            <span>Slab, Rebar & Shuttering</span>
          </div>
        </div>

        <!-- Material Requisitions -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">Material Reqs</span>
            <span class="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 text-sm">📦</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
            {{ kpis?.material_requests ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-teal-600 dark:text-teal-400 font-medium">
            <span>Cement & Steel due</span>
          </div>
        </div>

        <!-- Inspection Alerts -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">QC Alerts</span>
            <span class="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 text-sm">🔬</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
            {{ kpis?.inspection_alerts ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-slate-500 dark:text-slate-400">
            <span>Checklists & Cube Tests</span>
          </div>
        </div>

        <!-- Safety Incidents -->
        <div class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-sm transition">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-500 dark:text-slate-400">HSE Incidents</span>
            <span class="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-sm">🦺</span>
          </div>
          <div class="mt-2 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {{ kpis?.open_safety_incidents ?? 0 }}
          </div>
          <div class="mt-1 flex items-center text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Zero Lost Time Injury</span>
          </div>
        </div>
      </div>

      <!-- Quick Action Modules Bar -->
      <app-card title="Site Field Execution Controls" subtitle="Direct access to Daily Progress Reports, requisitions, photo documentation and QC inspection logs">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <a routerLink="/mobile-site/dpr" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">📝</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Daily DPR</span>
            <span class="text-[10px] text-slate-400">Progress log</span>
          </a>

          <a routerLink="/mobile-site/tasks" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">🎯</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Tasks & WBS</span>
            <span class="text-[10px] text-slate-400">Deadlines</span>
          </a>

          <a routerLink="/mobile-site/requisitions" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">📦</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Material Reqs</span>
            <span class="text-[10px] text-slate-400">Cement & Steel</span>
          </a>

          <a routerLink="/mobile-site/photos" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">📸</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Geotagged Photos</span>
            <span class="text-[10px] text-slate-400">GPS & Timestamp</span>
          </a>

          <a routerLink="/mobile-site/quality" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">🔬</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Quality (QC)</span>
            <span class="text-[10px] text-slate-400">Cube crushing test</span>
          </a>

          <a routerLink="/mobile-site/contractors" class="flex flex-col items-center justify-center p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition text-center group">
            <span class="text-2xl mb-1 group-hover:scale-110 transition-transform">👷</span>
            <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">Contractor Bills</span>
            <span class="text-[10px] text-slate-400">Measurements</span>
          </a>
        </div>
      </app-card>

      <!-- Live Site Activity & Workfront Snapshot -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-card title="Active Trade Headcount & Muster Roll" subtitle="Daily labor allocation by specialized subcontractor trade">
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Shuttering & Formwork Carpenters</span>
                <span class="font-mono font-bold text-amber-600">48 Workers</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-amber-500 h-2 rounded-full" style="width: 34%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Rebar Binders & Steel Fixers</span>
                <span class="font-mono font-bold text-sky-600">42 Workers</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-sky-500 h-2 rounded-full" style="width: 30%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Masonry, Brickwork & Plastering</span>
                <span class="font-mono font-bold text-teal-600">32 Workers</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-teal-500 h-2 rounded-full" style="width: 22%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-xs font-medium mb-1">
                <span class="text-slate-700 dark:text-slate-300">Plumbing & Electrical (MEP) Trades</span>
                <span class="font-mono font-bold text-purple-600">20 Workers</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-purple-500 h-2 rounded-full" style="width: 14%"></div>
              </div>
            </div>
          </div>
        </app-card>

        <app-card title="Key Milestone Status & Health" subtitle="Critical path construction targets under supervision">
          <div class="space-y-3 text-xs">
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-800 dark:text-slate-200">Tower Alpha: 14th Floor Slab Casting</div>
                <div class="text-[11px] text-slate-500">Casting window: Tomorrow morning 06:00 AM</div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400">
                85% READY
              </span>
            </div>

            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-800 dark:text-slate-200">Tower Beta: 8th Floor Brick Masonry</div>
                <div class="text-[11px] text-slate-500">Auto-aerated concrete (AAC) blocks stacking complete</div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400">
                ON SCHEDULE
              </span>
            </div>

            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div class="font-bold text-slate-800 dark:text-slate-200">Basement 2: Fire Sprinkler & Waterproofing</div>
                <div class="text-[11px] text-slate-500">Pressure testing & chemical membrane curing</div>
              </div>
              <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-400">
                VERIFIED PASS
              </span>
            </div>
          </div>
        </app-card>
      </div>
    </div>
  `
})
export class MobileSiteDashboardComponent implements OnInit {
  private service = inject(MobileSiteService);
  kpis: MobileSiteDashboardKpis | null = null;

  ngOnInit(): void {
    this.service.getDashboardKpis().subscribe({
      next: (data) => this.kpis = data,
      error: (err) => console.error('Failed to load site dashboard KPIs', err)
    });
  }
}
