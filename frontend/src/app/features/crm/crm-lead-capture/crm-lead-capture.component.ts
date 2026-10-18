import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, LeadTableFilters } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Lead } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-crm-lead-capture',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-lead-capture.component.html'
})
export class CrmLeadCaptureComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  leads = this.crmService.leadsTable;
  total = this.crmService.leadsTotal;
  limit = this.crmService.leadsLimit;
  offset = this.crmService.leadsOffset;
  isLoading = this.crmService.isLoadingLeads;

  projects = signal<Project[]>([]);
  salesReps = signal<{ id: number; full_name_en: string }[]>([]);

  selectedIds = signal<Set<number>>(new Set());
  isDeleting = signal<number | null>(null);

  readonly LOOKUP = {
    stage: 'CRM_LEAD_STAGE',
    source: 'CRM_LEAD_SOURCE',
    priority: 'CRM_LEAD_PRIORITY',
    propertyType: 'CRM_PROPERTY_TYPE'
  };

  readonly unassignedOptions = [
    { value: 'ALL', label: 'All Leads' },
    { value: 'true', label: 'Unassigned Only' },
    { value: 'false', label: 'Assigned Only' }
  ];

  readonly sortOptions = [
    { value: 'updated_at_desc', label: 'Recently Updated' },
    { value: 'updated_at_asc', label: 'Least Recently Updated' },
    { value: 'created_at_desc', label: 'Newest First' },
    { value: 'created_at_asc', label: 'Oldest First' },
    { value: 'lead_score_desc', label: 'Lead Score (High-Low)' },
    { value: 'lead_name_asc', label: 'Customer Name (A-Z)' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    lead_stage: [null],
    lead_source_id: [null],
    priority: [null],
    property_type: [null],
    sales_rep_id: [null],
    assignment_status: ['ALL'],
    sort_by: ['updated_at_desc'],
    date_from: [''],
    date_to: ['']
  });

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  fromRow = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  toRow = computed(() => Math.min(this.offset() + this.limit(), this.total()));
  allSelected = computed(() => {
    const rows = this.leads();
    return rows.length > 0 && rows.every(l => this.selectedIds().has(l.id));
  });

  salesRepOptions = computed(() =>
    this.salesReps().map(r => ({ value: String(r.id), label: r.full_name_en }))
  );

  ngOnInit(): void {
    this.loadLeads();
    this.loadProjects();
    this.loadSalesReps();

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => {
      this.offset.set(0);
      this.selectedIds.set(new Set());
      this.loadLeads();
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe(reps => this.salesReps.set(reps));
  }

  buildFilters(): LeadTableFilters {
    const v = this.filterForm.value;
    const assignmentStatus = v.assignment_status || 'ALL';
    return {
      search: (v.search || '').trim() || undefined,
      lead_stage: v.lead_stage || undefined,
      lead_source_id: v.lead_source_id || undefined,
      priority: v.priority || undefined,
      property_type: v.property_type || undefined,
      sales_rep_id: v.sales_rep_id ? +v.sales_rep_id : undefined,
      is_unassigned: assignmentStatus === 'true' ? true : assignmentStatus === 'false' ? false : undefined,
      date_from: v.date_from || undefined,
      date_to: v.date_to || undefined,
      sort_by: v.sort_by || 'updated_at_desc',
      limit: this.limit(),
      offset: this.offset()
    };
  }

  loadLeads(): void {
    this.crmService.loadLeadsTable(this.buildFilters()).subscribe();
  }

  resetFilters(): void {
    this.filterForm.reset({
      search: '',
      lead_stage: null,
      lead_source_id: null,
      priority: null,
      property_type: null,
      sales_rep_id: null,
      assignment_status: 'ALL',
      sort_by: 'updated_at_desc',
      date_from: '',
      date_to: ''
    });
    this.offset.set(0);
    this.loadLeads();
  }

  refresh(): void {
    this.loadLeads();
  }

  nextPage(): void {
    if (this.offset() + this.limit() < this.total()) {
      this.offset.update(v => v + this.limit());
      this.loadLeads();
    }
  }

  previousPage(): void {
    if (this.offset() >= this.limit()) {
      this.offset.update(v => v - this.limit());
      this.loadLeads();
    }
  }

  onPageSizeChange(event: Event): void {
    const size = +(event.target as HTMLSelectElement).value;
    this.limit.set(size);
    this.offset.set(0);
    this.loadLeads();
  }

  goCreate(): void {
    this.router.navigate(['/crm/lead-capture/new']);
  }

  goImport(): void {
    this.router.navigate(['/crm/lead-capture/import']);
  }

  goEdit(lead: Lead): void {
    this.router.navigate(['/crm/lead-capture', lead.id, 'edit']);
  }

  deleteLead(lead: Lead): void {
    if (!confirm(`Delete lead ${lead.lead_code || lead.lead_name}? This cannot be undone.`)) return;
    this.isDeleting.set(lead.id);
    this.crmService.deleteLead(lead.id).subscribe({
      next: () => {
        this.isDeleting.set(null);
        this.loadLeads();
      },
      error: (err) => {
        this.isDeleting.set(null);
        alert(err?.error?.detail || 'Failed to delete lead.');
      }
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.leads().map(l => l.id)));
    }
  }

  toggleSelect(id: number): void {
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  getProjectName(id: number | null | undefined): string {
    if (!id) return '—';
    return this.projects().find(p => p.id === id)?.project_name || `#${id}`;
  }

  getRepName(id: number | null | undefined): string {
    if (!id) return 'Unassigned';
    return this.salesReps().find(r => r.id === id)?.full_name_en || `#${id}`;
  }

  stageVariant(stage: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      NEW: 'info',
      CONTACTED: 'info',
      QUALIFIED: 'success',
      SITE_VISIT_SCHEDULED: 'warning',
      SITE_VISIT_COMPLETED: 'success',
      VISITED: 'success',
      NEGOTIATION: 'warning',
      TOKEN_BOOKED: 'success',
      BOOKED: 'success',
      LOST: 'danger',
      DROPPED: 'neutral'
    };
    return map[stage] || 'neutral';
  }

  priorityClasses(priority: string): string {
    const map: Record<string, string> = {
      URGENT: 'text-rose-600 bg-rose-500/10 border-rose-500/30',
      HIGH: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
      MEDIUM: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
      LOW: 'text-slate-500 bg-slate-500/10 border-slate-500/30'
    };
    return map[priority] || 'text-slate-500 bg-slate-500/10 border-slate-500/30';
  }

  formatBudget(lead: Lead): string {
    const min = lead.budget_range_min;
    const max = lead.budget_range_max;
    if (!min && !max) return '—';
    const fmt = (n: number) => n >= 10000000 ? `${(n / 10000000).toFixed(2)} Cr` : n.toLocaleString();
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  }

  trackById(index: number, item: Lead): number {
    return item.id;
  }
}
