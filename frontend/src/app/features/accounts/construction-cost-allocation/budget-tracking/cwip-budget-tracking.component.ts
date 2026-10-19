import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CWIPAllocationService } from '../../../../core/services/cwip-allocation.service';
import {
  CWIPBudgetTrackingResponse,
  CWIPBudgetVsActualItem
} from '../../../../core/models/cwip-allocation.model';
import { CWIPAllocationNavComponent } from '../cwip-allocation-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent, StatusVariant } from '../../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-cwip-budget-tracking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CWIPAllocationNavComponent,
    CardContainerComponent,
    StatusBadgeComponent
  ],
  templateUrl: './cwip-budget-tracking.component.html'
})
export class CWIPBudgetTrackingComponent implements OnInit {
  private cwipService = inject(CWIPAllocationService);

  loading: boolean = false;
  trackingData: CWIPBudgetTrackingResponse | null = null;
  filteredProjects: CWIPBudgetVsActualItem[] = [];
  searchTerm: string = '';
  selectedAgingFilter: string = 'ALL';

  ngOnInit(): void {
    this.loadBudgetTracking();
  }

  loadBudgetTracking(): void {
    this.loading = true;
    this.cwipService.getBudgetTracking().subscribe({
      next: (res) => {
        this.trackingData = res;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load budget tracking data:', err);
        this.loading = false;
      }
    });
  }

  applyFilter(): void {
    if (!this.trackingData) return;
    let list = this.trackingData.projects || [];

    if (this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase();
      list = list.filter(p =>
        p.project_name.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q)
      );
    }

    if (this.selectedAgingFilter !== 'ALL') {
      list = list.filter(p => p.wip_aging_status === this.selectedAgingFilter);
    }

    this.filteredProjects = list;
  }

  onSearch(): void {
    this.applyFilter();
  }

  onAgingFilterChange(status: string): void {
    this.selectedAgingFilter = status;
    this.applyFilter();
  }

  getVarianceVariant(varianceAmount: number): StatusVariant {
    if (varianceAmount >= 0) {
      return 'success'; // Under budget
    } else {
      return 'danger'; // Over budget
    }
  }

  getAgingVariant(agingStatus: string): StatusVariant {
    if (agingStatus.includes('Under 90 Days') || agingStatus.includes('Active')) {
      return 'info';
    } else if (agingStatus.includes('90-180 Days')) {
      return 'warning';
    } else {
      return 'danger';
    }
  }
}
