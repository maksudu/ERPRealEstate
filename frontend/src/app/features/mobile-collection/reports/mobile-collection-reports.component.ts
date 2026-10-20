import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MobileCollectionService, CollectionReportsData } from '../../../core/services/mobile-collection.service';
import { MobileCollectionNavComponent } from '../mobile-collection-nav/mobile-collection-nav.component';

@Component({
  selector: 'app-mobile-collection-reports',
  standalone: true,
  imports: [CommonModule, MobileCollectionNavComponent],
  template: `
    <div class="w-full min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div class="w-full mb-6">
        <app-mobile-collection-nav activeTab="reports"></app-mobile-collection-nav>
      </div>

      <div class="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Collection Executive & Performance Reports</h1>
          <p class="text-sm text-slate-500 mt-1">Daily realization trend, field collector recovery benchmarks & project-wise target summaries</p>
        </div>
        <button (click)="printReports()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
          Export & Print Report
        </button>
      </div>

      <!-- Report Section 1: Collector Performance -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          Field Recovery Officer Target Achievement
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
              <tr>
                <th class="px-6 py-3">Collector Name</th>
                <th class="px-6 py-3">Assigned Target</th>
                <th class="px-6 py-3">Total Collected</th>
                <th class="px-6 py-3">Recovery %</th>
                <th class="px-6 py-3">Performance Bar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let col of reports?.collector_performance">
                <td class="px-6 py-4 font-bold text-slate-900">{{ col.officer_name }}</td>
                <td class="px-6 py-4 font-mono font-medium text-slate-700">৳ {{ col.target | number:'1.2-2' }}</td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">৳ {{ col.collected | number:'1.2-2' }}</td>
                <td class="px-6 py-4 font-bold text-amber-600">{{ col.recovery_percentage }}%</td>
                <td class="px-6 py-4 min-w-[180px]">
                  <div class="w-full bg-slate-100 rounded-full h-2.5">
                    <div class="bg-amber-500 h-2.5 rounded-full" [style.width.%]="col.recovery_percentage"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Report Section 2: Project-wise Summaries -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          Project-Wise Realization vs. Overdue Outstanding
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
              <tr>
                <th class="px-6 py-3">Project Title</th>
                <th class="px-6 py-3">Target Realization</th>
                <th class="px-6 py-3">Collected (BDT)</th>
                <th class="px-6 py-3">Overdue Remaining (BDT)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let proj of reports?.project_wise_summaries">
                <td class="px-6 py-4 font-bold text-slate-900">{{ proj.project_name }}</td>
                <td class="px-6 py-4 font-mono font-medium text-slate-700">৳ {{ proj.target | number:'1.2-2' }}</td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">৳ {{ proj.collected | number:'1.2-2' }}</td>
                <td class="px-6 py-4 font-mono font-semibold text-rose-600">৳ {{ proj.overdue | number:'1.2-2' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Report Section 3: Daily Collections Trend -->
      <div class="w-full bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <h2 class="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          Last 7 Days Daily Collection Log
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-600">
            <thead class="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
              <tr>
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Total Realized (BDT)</th>
                <th class="px-6 py-3">Money Receipts Count</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr *ngFor="let d of reports?.daily_collections">
                <td class="px-6 py-4 font-mono text-slate-800 font-medium">{{ d.date }}</td>
                <td class="px-6 py-4 font-mono font-bold text-emerald-600">৳ {{ d.amount | number:'1.2-2' }}</td>
                <td class="px-6 py-4 font-mono text-slate-700">{{ d.receipt_count }} Receipts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class MobileCollectionReportsComponent implements OnInit {
  reports: CollectionReportsData | null = null;

  constructor(private collectionService: MobileCollectionService) {}

  ngOnInit() {
    this.collectionService.getReportsSummary().subscribe(data => {
      this.reports = data;
    });
  }

  printReports() {
    window.print();
  }
}
