import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { LandBank } from '../../../core/models/land.model';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components';

@Component({
  selector: 'app-acquisition-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './acquisition-search.component.html'
})
export class AcquisitionSearchComponent implements OnInit {
  private readonly landService = inject(LandService);
  private readonly router = inject(Router);

  projectCode = '';
  opportunityTitle = '';
  location = '';
  status = '';
  dealType = '';
  readonly statuses = ['DRAFT_PROPOSAL', 'LEGAL_VETTING', 'SURVEY_IN_PROGRESS', 'JV_SIGNED', 'ACQUIRED', 'REJECTED'];
  readonly dealTypes = ['JOINT_VENTURE', 'OUTRIGHT_PURCHASE', 'REVENUE_SHARE'];
  titleOptions: SelectOption[] = [];
  locationOptions: SelectOption[] = [];
  filterOptionsLoading = signal(false);
  filterOptionsError = signal('');
  results = signal<LandBank[]>([]);
  selected = signal<LandBank | null>(null);
  searched = signal(false);
  loading = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    this.filterOptionsLoading.set(true);
    this.filterOptionsError.set('');
    this.landService.getProposals({ limit: 100 }).subscribe({
      next: records => {
        const titles = new Map<string, SelectOption>();
        const locations = new Map<string, SelectOption>();
        records.forEach(record => {
          const title = record.proposal_title?.trim();
          if (title) titles.set(title, { value: title, label: title });

          const mouza = record.mouza_name?.trim();
          if (mouza) {
            const key = `${mouza.toLocaleLowerCase()}|${record.upazila_thana || ''}|${record.district || ''}`;
            const locationLabel = [mouza, record.upazila_thana, record.district].filter(Boolean).join(', ');
            locations.set(key, { value: mouza, label: locationLabel });
          }
        });
        this.titleOptions = [...titles.values()].sort((a, b) => a.label.localeCompare(b.label));
        this.locationOptions = [...locations.values()].sort((a, b) => a.label.localeCompare(b.label));
        this.filterOptionsLoading.set(false);
      },
      error: err => {
        this.filterOptionsLoading.set(false);
        this.filterOptionsError.set(err?.error?.detail || 'Could not load search options from acquisition records.');
      }
    });
  }

  search(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.searched.set(true);
    this.selected.set(null);
    this.landService.getProposals({
      project_code: this.projectCode.trim() || undefined,
      proposal_title: this.opportunityTitle.trim() || undefined,
      location: this.location.trim() || undefined,
      status: this.status || undefined,
      deal_type: this.dealType || undefined,
      limit: 100
    }).subscribe({
      next: records => {
        this.results.set(records);
        this.selected.set(records[0] ?? null);
        this.loading.set(false);
      },
      error: err => {
        this.results.set([]);
        this.loading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Could not load acquisition records. Check the connection and try again.');
      }
    });
  }

  reset(): void {
    this.projectCode = '';
    this.opportunityTitle = '';
    this.location = '';
    this.status = '';
    this.dealType = '';
    this.results.set([]);
    this.selected.set(null);
    this.searched.set(false);
    this.errorMessage.set('');
  }

  editSelected(): void {
    const record = this.selected();
    if (record) this.router.navigate(['/land/proposals', record.id, 'edit']);
  }

  statusLabel(value?: string): string {
    return (value || '-').replaceAll('_', ' ');
  }
}
