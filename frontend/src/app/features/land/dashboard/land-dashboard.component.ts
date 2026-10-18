import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

interface ProjectItem {
  id: number;
  name: string;
  location: string;
  totalPlots: number;
  totalAreaAcres: number;
  status: 'Active' | 'In Progress' | 'Review' | 'Completed';
  lastUpdated: string;
}

interface ActivityItem {
  id: number;
  title: string;
  subtitle: string;
  timestamp: string;
  type: 'upload' | 'verified' | 'litigation' | 'team';
  iconBg: string;
  iconColor: string;
}

@Component({
  selector: 'app-land-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardContainerComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './land-dashboard.component.html',
  styleUrls: []
})
export class LandDashboardComponent implements OnInit {
  private landService = inject(LandService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  // Time filters
  selectedPeriod = 'Last 30 Days';
  timePeriods = ['Today', 'Last 7 Days', 'Last 30 Days', 'Last Quarter', 'Year to Date'];

  // AI Modal
  isAiModalOpen = false;
  aiQuery = '';
  aiResponse = '';
  isAiThinking = false;

  // Real backend metrics
  realParcelCount = 0;
  realTotalAreaDecimal = 0;
  realNegotiationsCount = 0;
  realDueDiligenceCount = 0;

  // KPIs
  kpis = {
    totalProjects: 128,
    totalProjectsTrend: '+18%',
    totalPlots: 1248,
    totalPlotsTrend: '+12%',
    totalAreaAcres: 12584,
    totalAreaTrend: '+9%',
    activeCases: 86,
    activeCasesTrend: '-4%',
    complianceRate: 92,
    complianceRateTrend: '+7%'
  };

  // Horizontal Bar Chart: Project Overview by Layers
  layerStages = [
    { name: 'Plot Layer', count: 320, percentage: 100, color: 'bg-blue-600 dark:bg-blue-500' },
    { name: 'Village Layer', count: 280, percentage: 87.5, color: 'bg-blue-500 dark:bg-blue-400' },
    { name: 'District Layer', count: 180, percentage: 56.2, color: 'bg-indigo-500 dark:bg-indigo-400' },
    { name: 'State Layer', count: 120, percentage: 37.5, color: 'bg-cyan-500 dark:bg-cyan-400' }
  ];

  // Litigation Data
  litigationCases = {
    total: 86,
    ongoing: 42,
    ongoingPct: 49,
    disposed: 26,
    disposedPct: 30,
    pending: 12,
    pendingPct: 14,
    appealed: 6,
    appealedPct: 7
  };

  // Summary Report
  summaryReport = {
    successRate: 89,
    inProgressRate: 7,
    atRiskRate: 4
  };

  // Data Layer Distribution
  layerDistribution = {
    total: 1248,
    plotLayer: 45,
    villageLayer: 30,
    districtLayer: 15,
    stateLayer: 10
  };

  // Recent Projects
  recentProjects: ProjectItem[] = [
    { id: 1, name: 'Guwahati Smart City', location: 'Guwahati, Assam', totalPlots: 320, totalAreaAcres: 2450, status: 'Active', lastUpdated: '2 min ago' },
    { id: 2, name: 'Dholera SIR Mega Park', location: 'Ahmedabad, Gujarat', totalPlots: 210, totalAreaAcres: 1850, status: 'Active', lastUpdated: '15 min ago' },
    { id: 3, name: 'Mumbai Metro Phase 3 Land', location: 'Mumbai, Maharashtra', totalPlots: 145, totalAreaAcres: 980, status: 'In Progress', lastUpdated: '1 hr ago' },
    { id: 4, name: 'Bangalore Tech Park East', location: 'Bangalore, Karnataka', totalPlots: 98, totalAreaAcres: 560, status: 'Review', lastUpdated: '3 hrs ago' },
    { id: 5, name: 'Uttara Sector 11 Land Bank', location: 'Uttara, Dhaka', totalPlots: 85, totalAreaAcres: 420, status: 'Active', lastUpdated: '5 hrs ago' }
  ];

  // Activity Feed
  activityFeed: ActivityItem[] = [
    {
      id: 1,
      title: 'New plot data uploaded',
      subtitle: 'Project: Guwahati Smart City',
      timestamp: '5 min ago',
      type: 'upload',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 2,
      title: 'Land record verified',
      subtitle: 'Project: Dholera SIR',
      timestamp: '25 min ago',
      type: 'verified',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      id: 3,
      title: 'Case update added',
      subtitle: 'Case ID: OXL-2024-1256',
      timestamp: '1 hr ago',
      type: 'litigation',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      id: 4,
      title: 'New team member added',
      subtitle: 'John Smith joined the workspace',
      timestamp: '2 hrs ago',
      type: 'team',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

  // Financial & Assets Overview
  myAssets = {
    acres: 67,
    netExpensesFormatted: '৳ 1,20,921/-',
    netExpensesTrend: '+8%',
    reportsGenerated: 24
  };

  // Geospatial Map Metrics
  mapMetrics = {
    totalParcels: 1248,
    mappedAreaAcres: 12584,
    unmappedAreaAcres: 2416
  };

  isLoading = false;

  // Banner State
  isNotificationBannerVisible = true;
  isProfileBannerVisible = true;

  ngOnInit(): void {
    this.loadRealData();
  }

  loadRealData(): void {
    this.isLoading = true;
    this.landService.getDashboardAnalytics(this.selectedPeriod).subscribe({
      next: (res: any) => {
        if (res) {
          if (res.kpis) this.kpis = res.kpis;
          if (res.layerStages) this.layerStages = res.layerStages;
          if (res.litigationCases) this.litigationCases = res.litigationCases;
          if (res.summaryReport) this.summaryReport = res.summaryReport;
          if (res.myAssets) this.myAssets = res.myAssets;
          if (res.layerDistribution) this.layerDistribution = res.layerDistribution;
          if (res.recentProjects) this.recentProjects = res.recentProjects;
          if (res.activityFeed) this.activityFeed = res.activityFeed;
          if (res.mapMetrics) this.mapMetrics = res.mapMetrics;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching live dashboard analytics from database', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPeriodChange(): void {
    this.loadRealData();
  }

  // --- Actions ---
  dismissProfileBanner(): void {
    this.isProfileBannerVisible = false;
  }

  openAiAssistant(): void {
    this.isAiModalOpen = true;
    this.aiQuery = '';
    this.aiResponse = 'Hello! I am your Land Intelligence AI. I can analyze land acquisition risks, inspect GIS boundaries, check deed chain verifications, or summarize current litigations. How can I assist you today?';
  }

  askAi(): void {
    if (!this.aiQuery) return;
    this.isAiThinking = true;
    const query = this.aiQuery;
    setTimeout(() => {
      this.isAiThinking = false;
      this.aiResponse = `Analysis for "${query}":
- Total 128 active projects analyzed across 12,584 acres.
- Title chain consistency: 92% compliance verified with zero critical mortgage encumbrances.
- 4 minor litigation cases pending in High Court civil revision, none threatening possession.
- Recommendations: Complete physical boundary demarcation for Guwahati Smart City Plot #42 before releasing final registry settlement.`;
    }, 800);
  }

  navigateToParcels(): void {
    this.router.navigate(['/land/parcels']);
  }

  navigateToLitigation(): void {
    this.router.navigate(['/land/due-diligence']);
  }

  exportPdf(): void {
    window.print();
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'Active':
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Review':
        return 'warning';
      default:
        return 'neutral';
    }
  }
}
