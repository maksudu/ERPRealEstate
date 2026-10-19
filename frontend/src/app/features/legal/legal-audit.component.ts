import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LegalAuditEvent, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { LegalService } from '../../core/services/legal.service';
import { CardContainerComponent, CustomButtonComponent, CustomInputComponent } from '../../shared/components';

@Component({
  selector: 'app-legal-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, CustomButtonComponent, CustomInputComponent],
  templateUrl: './legal-audit.component.html'
})
export class LegalAuditComponent implements OnInit {
  private legalService = inject(LegalService);
  private route = inject(ActivatedRoute);
  events: LegalAuditEvent[] = [];
  total = 0;
  offset = 0;
  readonly limit = 50;
  recordIdFilter: number | null = null;
  appliedRecordId: number | undefined;
  isLoading = false;
  error = '';
  readonly labels = LEGAL_AREA_LABELS;

  ngOnInit(): void {
    this.recordIdFilter = Number(this.route.snapshot.queryParamMap.get('record_id')) || null;
    this.appliedRecordId = this.recordIdFilter || undefined;
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.error = '';
    this.legalService.getAuditEvents({
      record_id: this.appliedRecordId,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: page => {
        this.events = page.items;
        this.total = page.total;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Audit history could not be loaded. Check your access and try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    this.appliedRecordId = this.recordIdFilter || undefined;
    this.offset = 0;
    this.load();
  }

  pageBy(delta: number): void {
    this.offset = Math.max(0, Math.min(this.offset + delta * this.limit, Math.max(0, this.total - 1)));
    this.load();
  }

  title(event: LegalAuditEvent): string {
    return event.after_data?.['title'] || event.before_data?.['title'] || 'Record removed';
  }

  get rangeStart(): number { return this.total === 0 ? 0 : this.offset + 1; }
  get rangeEnd(): number { return Math.min(this.total, this.offset + this.limit); }
}
