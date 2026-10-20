import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Chart, registerables } from 'chart.js';

import { BIService } from '../../../core/services/bi.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import {
  ExecutiveBICockpit,
  PortfolioValuation,
  CashRunwayHorizon,
  SalesVelocityItem,
  ProjectProfitabilityComparison,
  ProjectOverdueHeatmapRow
} from '../../../core/models/bi.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

Chart.register(...registerables);

@Component({
  selector: 'app-executive-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './executive-cockpit.component.html'
})
export class ExecutiveCockpitComponent implements OnInit, AfterViewInit, OnDestroy {
  private biService = inject(BIService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private routeSub?: Subscription;

  @ViewChild('runwayCanvas') runwayCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('evmCanvas') evmCanvas?: ElementRef<HTMLCanvasElement>;

  private runwayChartInstance: Chart | null = null;
  private evmChartInstance: Chart | null = null;

  // Active View Tab
  activeTab = signal<'OVERVIEW' | 'RUNWAY' | 'PROFITABILITY' | 'HEATMAP'>('OVERVIEW');

  // Loading States
  isLoading = signal<boolean>(false);
  isExportingPdf = signal<boolean>(false);
  isExportingExcel = signal<boolean>(false);

  // Core Data Signals
  cockpitData = signal<ExecutiveBICockpit | null>(null);
  projects = signal<Project[]>([]);
  activeHorizon = signal<CashRunwayHorizon | null>(null);
  selectedHorizonDays = signal<number>(90);

  // Filter Signals
  selectedProjectFilter = signal<string>('ALL');
  selectedRiskFilter = signal<string>('ALL');
  searchTerm = signal<string>('');

  // Dropdown Options
  horizonOptions = [
    { value: 90, label: '90 Days Horizon (Quarterly Liquidity Runway)' },
    { value: 180, label: '180 Days Horizon (Half-Year Operational Forecast)' },
    { value: 365, label: '365 Days Horizon (Annual Strategic Runway)' }
  ];

  projectOptions = computed(() => {
    const list = [{ value: 'ALL', label: 'All Projects (Consolidated Portfolio)' }];
    this.projects().forEach(p => {
      list.push({ value: p.id.toString(), label: `${p.project_name} (${p.project_code || 'PRJ'})` });
    });
    return list;
  });

  riskOptions = [
    { value: 'ALL', label: 'All Risk Categories' },
    { value: 'CRITICAL', label: 'Critical Risk (>180 Days Overdue)' },
    { value: 'HIGH', label: 'High Risk (91-180 Days)' },
    { value: 'MEDIUM', label: 'Medium Risk (31-90 Days)' },
    { value: 'LOW', label: 'Low Risk (0-30 Days)' }
  ];

  // Computed Filtered Lists
  filteredProfitability = computed(() => {
    const data = this.cockpitData();
    if (!data) return [];
    let items = data.profitability_comparisons;

    const pFilter = this.selectedProjectFilter();
    if (pFilter && pFilter !== 'ALL') {
      items = items.filter(i => i.project_id.toString() === pFilter);
    }

    const query = this.searchTerm().toLowerCase().trim();
    if (query) {
      items = items.filter(i =>
        i.project_name.toLowerCase().includes(query) ||
        i.evm_status.toLowerCase().includes(query)
      );
    }

    return items;
  });

  filteredHeatmap = computed(() => {
    const data = this.cockpitData();
    if (!data) return [];
    let rows = data.overdue_heatmap;

    const pFilter = this.selectedProjectFilter();
    if (pFilter && pFilter !== 'ALL') {
      rows = rows.filter(r => r.project_id.toString() === pFilter);
    }

    const rFilter = this.selectedRiskFilter();
    if (rFilter && rFilter !== 'ALL') {
      rows = rows.filter(r => r.buckets.some(b => b.risk_intensity === rFilter && b.overdue_amount_bdt > 0));
    }

    return rows;
  });

  ngOnInit(): void {
    this.syncTabWithRoute();
    this.routeSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.syncTabWithRoute();
    });
    this.route.queryParams.subscribe(() => {
      this.syncTabWithRoute();
    });
    this.loadInitialData();
  }

  private syncTabWithRoute(): void {
    const url = (this.router.url || '').toLowerCase();
    const queryTab = (this.route.snapshot.queryParams['tab'] || '').toUpperCase();

    if (url.includes('/bi/runway') || queryTab === 'RUNWAY') {
      this.activeTab.set('RUNWAY');
    } else if (url.includes('/bi/evm') || url.includes('/bi/profitability') || queryTab === 'PROFITABILITY' || queryTab === 'EVM') {
      this.activeTab.set('PROFITABILITY');
    } else if (url.includes('/bi/heatmap') || queryTab === 'HEATMAP') {
      this.activeTab.set('HEATMAP');
    } else {
      this.activeTab.set('OVERVIEW');
      setTimeout(() => this.renderCharts(), 150);
    }
  }

  ngAfterViewInit(): void {
    // Canvas charts will render once data loads
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    this.destroyCharts();
  }

  private destroyCharts(): void {
    if (this.runwayChartInstance) {
      this.runwayChartInstance.destroy();
      this.runwayChartInstance = null;
    }
    if (this.evmChartInstance) {
      this.evmChartInstance.destroy();
      this.evmChartInstance = null;
    }
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs),
      error: (err) => console.error('Failed to load projects', err)
    });

    this.biService.getCockpitSummary().subscribe({
      next: (data) => {
        this.cockpitData.set(data);
        this.activeHorizon.set(data.runway_90d);
        this.isLoading.set(false);
        setTimeout(() => this.renderCharts(), 150);
      },
      error: (err) => {
        console.error('Failed to load executive cockpit data', err);
        this.isLoading.set(false);
      }
    });
  }

  onHorizonChange(days: any): void {
    const horizon = Number(days);
    this.selectedHorizonDays.set(horizon);

    const currentData = this.cockpitData();
    if (horizon === 90 && currentData) {
      this.activeHorizon.set(currentData.runway_90d);
      setTimeout(() => this.renderRunwayChart(), 100);
      return;
    }
    if (horizon === 180 && currentData) {
      this.activeHorizon.set(currentData.runway_180d);
      setTimeout(() => this.renderRunwayChart(), 100);
      return;
    }

    this.biService.getCashRunway(horizon).subscribe({
      next: (r) => {
        this.activeHorizon.set(r);
        setTimeout(() => this.renderRunwayChart(), 100);
      },
      error: (err) => console.error('Failed to simulate runway horizon', err)
    });
  }

  private renderCharts(): void {
    this.renderRunwayChart();
    this.renderEVMChart();
  }

  private renderRunwayChart(): void {
    const horizon = this.activeHorizon();
    if (!this.runwayCanvas || !horizon) return;

    if (this.runwayChartInstance) {
      this.runwayChartInstance.destroy();
    }

    const ctx = this.runwayCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.runwayChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [
          'Installments',
          'PDC Vault',
          'Rental CAM',
          'Material POs',
          'Contractor RA',
          'Site Labour',
          'Overheads'
        ],
        datasets: [
          {
            label: 'Projected Cash Flow (BDT)',
            data: [
              horizon.projected_installment_inflow_bdt,
              horizon.projected_pdc_clearing_inflow_bdt,
              horizon.projected_rental_inflow_bdt,
              -horizon.committed_po_material_outflow_bdt,
              -horizon.committed_contractor_ra_outflow_bdt,
              -horizon.committed_labor_payroll_outflow_bdt,
              -horizon.committed_statutory_overhead_outflow_bdt
            ],
            backgroundColor: [
              '#10b981',
              '#059669',
              '#34d399',
              '#ef4444',
              '#f97316',
              '#f59e0b',
              '#64748b'
            ],
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const val = Number(context.raw);
                const prefix = val >= 0 ? 'Inflow: ৳ ' : 'Liability: ৳ ';
                return prefix + Math.abs(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
              }
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value: any) => {
                const v = Number(value);
                if (Math.abs(v) >= 10000000) {
                  return (v / 10000000).toFixed(1) + ' Cr';
                }
                if (Math.abs(v) >= 100000) {
                  return (v / 100000).toFixed(1) + ' L';
                }
                return v.toLocaleString();
              }
            },
            grid: { color: 'rgba(148, 163, 184, 0.15)' }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  private renderEVMChart(): void {
    const comparisons = this.cockpitData()?.profitability_comparisons;
    if (!this.evmCanvas || !comparisons || comparisons.length === 0) return;

    if (this.evmChartInstance) {
      this.evmChartInstance.destroy();
    }

    const ctx = this.evmCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = comparisons.map(c => c.project_name.length > 15 ? c.project_name.substring(0, 15) + '...' : c.project_name);
    const spiData = comparisons.map(c => c.spi_index);
    const cpiData = comparisons.map(c => c.cpi_index);
    const marginData = comparisons.map(c => c.gross_profit_margin_pct);

    this.evmChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'bar',
            label: 'Schedule Index (SPI)',
            data: spiData,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            type: 'bar',
            label: 'Cost Index (CPI)',
            data: cpiData,
            backgroundColor: '#8b5cf6',
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: 'Gross Margin %',
            data: marginData,
            borderColor: '#10b981',
            backgroundColor: '#10b981',
            pointBackgroundColor: '#10b981',
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const label = context.dataset.label || '';
                const val = Number(context.raw);
                if (label.includes('%')) {
                  return `${label}: ${val.toFixed(1)}%`;
                }
                return `${label}: ${val.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            min: 0.5,
            max: 1.5,
            title: { display: true, text: 'Index (1.0 = Baseline)', font: { size: 11 } },
            grid: { color: 'rgba(148, 163, 184, 0.15)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            min: 0,
            max: 50,
            title: { display: true, text: 'Margin %', font: { size: 11 } },
            grid: { display: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // 1-Click Exports
  exportBoardPdf(): void {
    this.isExportingPdf.set(true);
    this.biService.exportBoardPresentationPdf().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Board_Presentation_Executive_BI_${new Date().toISOString().slice(0, 10)}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExportingPdf.set(false);
      },
      error: (err) => {
        console.error('Failed to export Board PDF', err);
        this.isExportingPdf.set(false);
      }
    });
  }

  exportAuditExcel(): void {
    this.isExportingExcel.set(true);
    this.biService.exportAuditExcelWorkbook().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Executive_Financial_Audit_Workbook_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.isExportingExcel.set(false);
      },
      error: (err) => {
        console.error('Failed to export Audit Excel', err);
        this.isExportingExcel.set(false);
      }
    });
  }

  // Formatting Helpers
  formatBDT(amount: number): string {
    if (amount >= 10000000) {
      return '৳ ' + (amount / 10000000).toFixed(2) + ' Cr';
    }
    if (amount >= 100000) {
      return '৳ ' + (amount / 100000).toFixed(2) + ' Lac';
    }
    return '৳ ' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getRiskBadgeClass(intensity: string): string {
    switch (intensity) {
      case 'CRITICAL':
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30';
      case 'LOW':
      default:
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
    }
  }

  getEVMStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ON_TRACK':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
      case 'AHEAD_OF_SCHEDULE':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30';
      case 'SCHEDULE_DELAYED':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'COST_OVERRUN':
      default:
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';
    }
  }
}
