import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LegalService } from '../../core/services/legal.service';
import { LegalArea, LegalDashboard, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { CardContainerComponent, CustomButtonComponent } from '../../shared/components';

@Component({
  selector: 'app-legal-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, CardContainerComponent, CustomButtonComponent],
  templateUrl: './legal-dashboard.component.html'
})
export class LegalDashboardComponent implements OnInit {
  private legalService = inject(LegalService);
  dashboard: LegalDashboard | null = null;
  isLoading = true;
  error = '';
  readonly areaLabels = LEGAL_AREA_LABELS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = '';
    this.legalService.getLegalDashboard().subscribe({
      next: value => {
        this.dashboard = value;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Legal operations could not be loaded. Check your access and try again.';
        this.isLoading = false;
      }
    });
  }

  areaUrl(area: LegalArea): string {
    return `/legal/records/${area}`;
  }
}
