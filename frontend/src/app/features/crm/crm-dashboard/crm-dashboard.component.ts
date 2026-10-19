import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  CrmDashboardResponse,
  CrmDrilldownResponse,
  CrmDrilldownLeadItem
} from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './crm-dashboard.component.html'
})
export class CrmDashboardComponent implements OnInit {
  protected readonly Math = Math;
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Reactive state
  dashboardData = signal<CrmDashboardResponse | null>(null);
  isLoading = signal<boolean>(true);
  isRefreshing = signal<boolean>(false);

  // Filters
  selectedProjectId = signal<number | null>(null);
  selectedSalesRepId = signal<number | null>(null);
  selectedDateRange = signal<string>('THIS_MONTH');

  // Active Tab for dashboard widgets
  activeTab = signal<string>('FUNNEL');

  // Dynamic Options for Searchable Selects
  projectOptions = signal<{ value: any; label: string }[]>([]);
  salesRepOptions = signal<{ value: any; label: string }[]>([]);

  // Drilldown Slide-Over State
  isDrilldownOpen = signal<boolean>(false);
  drilldownTitle = signal<string>('Drilldown Leads');
  drilldownSubtitle = signal<string>('');
  drilldownWidgetType = signal<string>('TOTAL_LEADS');
  drilldownFilterValue = signal<string | null>(null);
  drilldownData = signal<CrmDrilldownResponse | null>(null);
  drilldownLoading = signal<boolean>(false);
  drilldownSearch = signal<string>('');
  drilldownLimit = signal<number>(15);
  drilldownOffset = signal<number>(0);

  // Date Range Options
  dateRangeOptions = [
    { value: 'THIS_MONTH', label: 'Current Month' },
    { value: 'LAST_30_DAYS', label: 'Last 30 Days' },
    { value: 'THIS_QUARTER', label: 'This Quarter (Q2)' },
    { value: 'THIS_YEAR', label: 'Full Year 2026' }
  ];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadDashboardData();
  }

  loadFilterOptions(): void {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const list = Array.isArray(projects) ? projects : [];
        this.projectOptions.set([
          { value: null, label: 'All Projects (Consolidated)' },
          ...list.map(p => ({ value: p.id, label: p.project_name }))
        ]);
      },
      error: () => {
        this.projectOptions.set([
          { value: null, label: 'All Projects (Consolidated)' },
          { value: 1, label: 'Blue Ocean Pinnacle (Gulshan)' },
          { value: 2, label: 'Bayview Heights (Dhanmondi)' },
          { value: 3, label: 'Azure Horizon Residency (Uttara)' },
          { value: 4, label: 'Lakefront Crest (Banani)' }
        ]);
      }
    });

    this.crmService.getSalesReps().subscribe({
      next: (reps) => {
        this.salesRepOptions.set([
          { value: null, label: 'All Sales Representatives' },
          ...reps.map(r => ({ value: r.id, label: `${r.full_name_en} (${r.email || 'Advisor'})` }))
        ]);
      },
      error: () => {
        this.salesRepOptions.set([
          { value: null, label: 'All Sales Representatives' },
          { value: 1, label: 'Anisur Rahman (Senior Property Consultant)' },
          { value: 2, label: 'Farhana Sultana (Assistant Manager - Sales)' },
          { value: 3, label: 'Tanvir Hasan (Real Estate Advisor)' },
          { value: 4, label: 'Sadia Islam (Sales Executive)' },
          { value: 5, label: 'Mahbub Alam (Client Relations)' }
        ]);
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    const filters: any = {};
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedSalesRepId()) filters.sales_rep_id = this.selectedSalesRepId();

    this.crmService.getCrmDashboardKpis(filters).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      },
      error: (err) => {
        console.error('Failed to load CRM dashboard KPIs', err);
        this.isLoading.set(false);
        this.isRefreshing.set(false);
      }
    });
  }

  onProjectChange(projectId: any): void {
    this.selectedProjectId.set(projectId);
    this.loadDashboardData();
  }

  onSalesRepChange(repId: any): void {
    this.selectedSalesRepId.set(repId);
    this.loadDashboardData();
  }

  onDateRangeChange(range: string): void {
    this.selectedDateRange.set(range);
    this.loadDashboardData();
  }

  refreshDashboard(): void {
    this.isRefreshing.set(true);
    this.loadDashboardData();
  }

  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
  }

  // ============================================================
  // Drill-down Logic (Managers drill-down into underlying leads)
  // ============================================================
  openDrilldown(widgetType: string, filterValue: string | null, title: string, subtitle: string): void {
    this.drilldownWidgetType.set(widgetType);
    this.drilldownFilterValue.set(filterValue);
    this.drilldownTitle.set(title);
    this.drilldownSubtitle.set(subtitle);
    this.drilldownSearch.set('');
    this.drilldownOffset.set(0);
    this.isDrilldownOpen.set(true);
    this.loadDrilldown();
  }

  loadDrilldown(): void {
    this.drilldownLoading.set(true);
    const filters: any = {
      limit: this.drilldownLimit(),
      offset: this.drilldownOffset()
    };
    if (this.drilldownFilterValue()) filters.filter_value = this.drilldownFilterValue();
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedSalesRepId()) filters.sales_rep_id = this.selectedSalesRepId();
    if (this.drilldownSearch()) filters.search = this.drilldownSearch();

    this.crmService.getCrmDashboardDrilldown(this.drilldownWidgetType(), filters).subscribe({
      next: (res) => {
        this.drilldownData.set(res);
        this.drilldownLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load drilldown leads', err);
        this.drilldownLoading.set(false);
      }
    });
  }

  closeDrilldown(): void {
    this.isDrilldownOpen.set(false);
  }

  onDrilldownSearch(term: string): void {
    this.drilldownSearch.set(term);
    this.drilldownOffset.set(0);
    this.loadDrilldown();
  }

  nextDrilldownPage(): void {
    const data = this.drilldownData();
    if (!data) return;
    if (this.drilldownOffset() + this.drilldownLimit() < data.total) {
      this.drilldownOffset.update(v => v + this.drilldownLimit());
      this.loadDrilldown();
    }
  }

  prevDrilldownPage(): void {
    if (this.drilldownOffset() > 0) {
      this.drilldownOffset.update(v => Math.max(0, v - this.drilldownLimit()));
      this.loadDrilldown();
    }
  }

  viewLead(lead: CrmDrilldownLeadItem): void {
    this.closeDrilldown();
    this.router.navigate(['/crm/leads'], { queryParams: { lead_id: lead.id } });
  }

  exportDrilldownCsv(): void {
    const data = this.drilldownData();
    if (!data || !data.items || data.items.length === 0) return;

    const headers = ['Lead Code', 'Name', 'Phone', 'Email', 'Source', 'Stage', 'Priority', 'Score', 'Project', 'Sales Rep'];
    const rows = data.items.map(l => [
      `"${l.lead_code || ''}"`,
      `"${l.lead_name}"`,
      `"${l.primary_phone}"`,
      `"${l.email || ''}"`,
      `"${l.lead_source_id}"`,
      `"${l.lead_stage}"`,
      `"${l.priority}"`,
      `"${l.lead_score}"`,
      `"${l.project_name || ''}"`,
      `"${l.sales_rep_name || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `crm_drilldown_${this.drilldownWidgetType().toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================================
  // Helpers & Badges
  // ============================================================
  formatBdt(val: number | null | undefined): string {
    if (val === null || val === undefined) return '৳0';
    if (val >= 10000000) {
      return `৳${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `৳${(val / 100000).toFixed(2)} Lac`;
    }
    return `৳${val.toLocaleString('en-IN')}`;
  }

  getHealthBadgeClass(grade: string | null | undefined): string {
    switch ((grade || '').toUpperCase()) {
      case 'HOT': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      case 'WARM': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'COLD': return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30';
      case 'NURTURE': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30';
      default: return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30';
    }
  }

  getStageBadgeClass(stage: string): string {
    switch (stage.toUpperCase()) {
      case 'NEW': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      case 'CONTACTED': return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30';
      case 'SITE_VISIT_SCHEDULED': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      case 'SITE_VISIT_COMPLETED': return 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30';
      case 'NEGOTIATION': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30';
      case 'TOKEN_BOOKED':
      case 'BOOKED': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      case 'LOST':
      case 'DROPPED': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      default: return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30';
    }
  }

  getPriorityBadgeClass(priority: string): string {
    switch (priority.toUpperCase()) {
      case 'HIGH':
      case 'URGENT': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
      case 'MEDIUM': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
      default: return 'bg-slate-500/15 text-slate-600 dark:text-slate-400';
    }
  }
}
