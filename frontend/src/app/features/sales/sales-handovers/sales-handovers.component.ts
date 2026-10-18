import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { PropertyHandover, PaginatedPropertyHandovers } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-sales-handovers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-handovers.component.html'
})
export class SalesHandoversComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Data signals
  handoverData = signal<PaginatedPropertyHandovers | null>(null);
  isLoading = signal<boolean>(true);
  actionMessage = signal<string>('');

  // Filters
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('');
  selectedPossessionStatus = signal<string>('');

  // Pagination
  limit = signal<number>(20);
  offset = signal<number>(0);
  readonly Math = Math;

  // Filter Dropdown Options
  statusOptions: SelectOption[] = [
    { label: 'All Handover Stages', value: '' },
    { label: 'Not Started', value: 'NOT_STARTED' },
    { label: 'Prerequisites in Review', value: 'PREREQUISITES_IN_REVIEW' },
    { label: 'Inspection Scheduled', value: 'INSPECTION_SCHEDULED' },
    { label: 'Snagging & Defect Recording', value: 'SNAGGING_IN_PROGRESS' },
    { label: 'Rectification Pending', value: 'RECTIFICATION_PENDING' },
    { label: 'Ready for Final Handover', value: 'READY_FOR_HANDOVER' },
    { label: 'Possession Handed Over', value: 'POSSESSION_HANDED_OVER' },
    { label: 'Completed & Warranty Active', value: 'COMPLETED' }
  ];

  possessionOptions: SelectOption[] = [
    { label: 'All Possession Statuses', value: '' },
    { label: 'Not Taken', value: 'NOT_TAKEN' },
    { label: 'Conditional Fit-out Possession', value: 'CONDITIONAL_FITOUT' },
    { label: 'Full Physical Possession', value: 'FULL_PHYSICAL_POSSESSION' }
  ];

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => {
    const tot = this.handoverData()?.total || 0;
    return Math.ceil(tot / this.limit()) || 1;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getHandoversPaged({
      search: this.searchQuery() || undefined,
      status: this.selectedStatus() || undefined,
      possession_status: this.selectedPossessionStatus() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res: PaginatedPropertyHandovers) => {
        this.handoverData.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onSearch(val: string): void {
    this.searchQuery.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onStatusChange(val: string): void {
    this.selectedStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onPossessionChange(val: string): void {
    this.selectedPossessionStatus.set(val);
    this.offset.set(0);
    this.loadData();
  }

  onPageChange(page: number): void {
    const newOffset = (page - 1) * this.limit();
    this.offset.set(newOffset);
    this.loadData();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'POSSESSION_HANDED_OVER':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'READY_FOR_HANDOVER':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'INSPECTION_SCHEDULED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SNAGGING_IN_PROGRESS':
      case 'RECTIFICATION_PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'PREREQUISITES_IN_REVIEW':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getPossessionBadgeClass(possession: string): string {
    switch (possession) {
      case 'FULL_PHYSICAL_POSSESSION':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold';
      case 'CONDITIONAL_FITOUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getPrerequisiteCompletion(h: PropertyHandover): { completed: number; total: number; percentage: number } {
    if (!h.prerequisites_checklist || h.prerequisites_checklist.length === 0) {
      return { completed: 0, total: 8, percentage: 0 };
    }
    const completed = h.prerequisites_checklist.filter(i => i.completed).length;
    const total = h.prerequisites_checklist.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  }
}
