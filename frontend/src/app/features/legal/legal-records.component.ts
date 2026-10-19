import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LegalService } from '../../core/services/legal.service';
import { LegalArea, LegalRecord, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { CardContainerComponent, CustomButtonComponent, CustomInputComponent, SearchableSelectComponent } from '../../shared/components';

@Component({
  selector: 'app-legal-records',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, CustomButtonComponent, CustomInputComponent, SearchableSelectComponent],
  templateUrl: './legal-records.component.html'
})
export class LegalRecordsComponent implements OnInit {
  private legalService = inject(LegalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  area!: LegalArea;
  records: LegalRecord[] = [];
  total = 0;
  limit = 25;
  offset = 0;
  searchText = '';
  statusFilter = '';
  appliedSearch = '';
  appliedStatus = '';
  isLoading = false;
  error = '';
  readonly labels = LEGAL_AREA_LABELS;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const value = params.get('area') as LegalArea;
      if (!(value in LEGAL_AREA_LABELS)) {
        this.router.navigateByUrl('/legal/dashboard');
        return;
      }
      this.area = value;
      this.offset = 0;
      this.load();
    });
  }

  load(): void {
    this.isLoading = true;
    this.error = '';
    this.legalService.listRecords({
      area: this.area,
      limit: this.limit,
      offset: this.offset,
      q: this.appliedSearch,
      status: this.appliedStatus
    }).subscribe({
      next: result => {
        this.records = result.items;
        this.total = result.total;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Records could not be loaded. Check your access and try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.appliedSearch = this.searchText.trim();
    this.appliedStatus = this.statusFilter;
    this.offset = 0;
    this.load();
  }

  pageBy(step: number): void {
    this.offset = Math.max(0, Math.min(this.offset + step * this.limit, Math.max(0, this.total - 1)));
    this.load();
  }

  openRecord(record: LegalRecord): void {
    this.router.navigate(['/legal/records', this.area, record.id]);
  }

  editRecord(record: LegalRecord): void {
    this.router.navigate(['/legal/records', this.area, record.id, 'edit']);
  }

  deleteRecord(record: LegalRecord): void {
    if (!window.confirm(`Delete “${record.title}”? The action will remain in the audit trail.`)) return;
    this.legalService.deleteRecord(record.id).subscribe({
      next: () => this.load(),
      error: () => this.error = 'This record could not be deleted.'
    });
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : this.offset + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.offset + this.limit, this.total);
  }
}
