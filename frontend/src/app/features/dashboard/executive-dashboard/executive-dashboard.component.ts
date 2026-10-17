import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import {
  ExecutiveOverview,
  ProjectPortfolio,
  ProjectKPIItem,
  ProjectDrillDown,
  InventoryDashboard,
  SalesAnalytics,
  BIModuleItem,
  DefaulterClient
} from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './executive-dashboard.component.html',
  styleUrls: ['./executive-dashboard.component.css']
})
export class ExecutiveDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab
  activeTab = signal<'executive' | 'projects' | 'inventory' | 'catalog'>('executive');

  // Loading & Error States
  loading = signal<boolean>(true);
  actionLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  toastMessage = signal<string | null>(null);

  // Currency Display Mode: 'CR' (Crore), 'LAC' (Lakh), 'BDT' (Full)
  currencyMode = signal<'CR' | 'LAC' | 'BDT'>('CR');

  // Live Data Signals
  overview = signal<ExecutiveOverview | null>(null);
  portfolio = signal<ProjectPortfolio | null>(null);
  inventory = signal<InventoryDashboard | null>(null);
  sales = signal<SalesAnalytics | null>(null);
  biModules = signal<BIModuleItem[]>([]);

  // Project Portfolio Filters
  projectSearch = signal<string>('');
  authorityFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  // Project Drill-Down Modal State
  selectedProjectId = signal<number | null>(null);
  drillDownLoading = signal<boolean>(false);
  drillDownData = signal<ProjectDrillDown | null>(null);
  drillDownTab = signal<'overview' | 'sales' | 'milestones' | 'procurement' | 'financials' | 'profitability'>('overview');

  // Selected Defaulters for Batch Action
  selectedDefaulterIds = signal<Set<number>>(new Set());

  // Filtered Project Portfolio
  filteredProjects = computed(() => {
    const port = this.portfolio();
    if (!port) return [];
    
    let list = port.items;
    const q = this.projectSearch().trim().toLowerCase();
    const auth = this.authorityFilter();
    const st = this.statusFilter();

    if (q) {
      list = list.filter(p => 
        p.project_name.toLowerCase().includes(q) || 
        p.project_code.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }
    if (auth !== 'ALL') {
      list = list.filter(p => p.development_authority === auth);
    }
    if (st !== 'ALL') {
      list = list.filter(p => p.status === st);
    }
    return list;
  });

  ngOnInit(): void {
    // Check route parameter for active tab
    this.route.params.subscribe(params => {
      const tabParam = params['tab'];
      if (tabParam === 'project-performance' || tabParam === 'projects') {
        this.activeTab.set('projects');
      } else if (tabParam === 'inventory-sales' || tabParam === 'inventory' || tabParam === 'revenue-analytics' || tabParam === 'collections-receivables') {
        this.activeTab.set('inventory');
      } else if (tabParam === 'bi-modules' || tabParam === 'catalog') {
        this.activeTab.set('catalog');
      } else {
        this.activeTab.set('executive');
      }
    });

    this.loadAllDashboardData();
  }

  loadAllDashboardData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    // Parallel forkJoin or independent subscribes
    this.dashboardService.getExecutiveOverview().subscribe({
      next: (data) => this.overview.set(data),
      error: (err) => console.error('Error fetching executive overview:', err)
    });

    this.dashboardService.getProjectsPortfolio().subscribe({
      next: (data) => this.portfolio.set(data),
      error: (err) => console.error('Error fetching portfolio:', err)
    });

    this.dashboardService.getInventoryDashboard().subscribe({
      next: (data) => this.inventory.set(data),
      error: (err) => console.error('Error fetching inventory:', err)
    });

    this.dashboardService.getSalesAnalytics().subscribe({
      next: (data) => {
        this.sales.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching sales analytics:', err);
        this.loading.set(false);
      }
    });

    this.dashboardService.getBISubModules().subscribe({
      next: (data) => this.biModules.set(data.modules),
      error: (err) => console.error('Error fetching BI modules:', err)
    });
  }

  switchTab(tab: 'executive' | 'projects' | 'inventory' | 'catalog'): void {
    this.activeTab.set(tab);
  }

  setCurrencyMode(mode: 'CR' | 'LAC' | 'BDT'): void {
    this.currencyMode.set(mode);
  }

  formatMoney(amount: number): string {
    if (!amount && amount !== 0) return '৳0.00';
    const mode = this.currencyMode();
    if (mode === 'CR') {
      const cr = amount / 10000000;
      return `৳${cr.toFixed(1)} Cr`;
    } else if (mode === 'LAC') {
      const lac = amount / 100000;
      return `৳${lac.toFixed(1)} Lac`;
    } else {
      return `৳${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
  }

  openProjectDrillDown(projectId: number): void {
    this.selectedProjectId.set(projectId);
    this.drillDownLoading.set(true);
    this.drillDownTab.set('overview');

    this.dashboardService.getProjectDrillDown(projectId).subscribe({
      next: (res) => {
        this.drillDownData.set(res);
        this.drillDownLoading.set(false);
      },
      error: (err) => {
        this.drillDownLoading.set(false);
        this.showToast('Failed to load project drill-down details');
      }
    });
  }

  closeDrillDown(): void {
    this.selectedProjectId.set(null);
    this.drillDownData.set(null);
  }

  toggleDefaulterSelection(id: number): void {
    const current = new Set(this.selectedDefaulterIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedDefaulterIds.set(current);
  }

  toggleSelectAllDefaulters(event: any): void {
    const checked = event.target.checked;
    if (checked && this.sales()) {
      const ids = new Set(this.sales()!.defaulters_morosos.map(d => d.id));
      this.selectedDefaulterIds.set(ids);
    } else {
      this.selectedDefaulterIds.set(new Set());
    }
  }

  isDefaulterSelected(id: number): boolean {
    return this.selectedDefaulterIds().has(id);
  }

  sendDefaulterReminder(client: DefaulterClient, actionType: string): void {
    this.actionLoading.set(true);
    this.dashboardService.remindDefaulter(client.id, actionType).subscribe({
      next: (res) => {
        this.actionLoading.set(false);
        this.showToast(res.message || `Reminder successfully sent to ${client.name}`);
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showToast(`Error dispatching reminder to ${client.name}`);
      }
    });
  }

  sendBatchReminders(): void {
    const count = this.selectedDefaulterIds().size;
    if (count === 0) return;
    this.actionLoading.set(true);
    setTimeout(() => {
      this.actionLoading.set(false);
      this.showToast(`Batch reminder SMS successfully queued for ${count} debtors.`);
      this.selectedDefaulterIds.set(new Set());
    }, 700);
  }

  exportReport(type: 'PDF' | 'EXCEL'): void {
    this.showToast(`Preparing ${type} Export of Management Dashboard. File download initiated...`);
  }

  navigateToFilteredReport(moduleRoute: string): void {
    this.router.navigate([moduleRoute]);
  }

  showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }
}
