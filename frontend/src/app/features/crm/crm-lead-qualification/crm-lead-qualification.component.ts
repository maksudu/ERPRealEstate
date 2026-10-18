import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule, Flame, Snowflake, Leaf, Ban, AlertTriangle, RefreshCw, Edit3, Eye } from 'lucide-angular';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService, QualificationFilters } from '../../../core/services/crm.service';
import { Lead, LeadHealthGrade } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-lead-qualification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './crm-lead-qualification.component.html'
})
export class CrmLeadQualificationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly Flame = Flame;
  readonly Snowflake = Snowflake;
  readonly Leaf = Leaf;
  readonly Ban = Ban;
  readonly AlertTriangle = AlertTriangle;
  readonly RefreshCw = RefreshCw;
  readonly Edit3 = Edit3;
  readonly Eye = Eye;

  leads = this.crmService.leadsTable;
  total = this.crmService.leadsTotal;
  limit = this.crmService.leadsLimit;
  offset = this.crmService.leadsOffset;
  isLoading = this.crmService.isLoadingLeads;

  selectedIds = signal<Set<number>>(new Set());
  isSaving = signal<number | null>(null);

  // Modal state for manual qualification override
  qualModalOpen = signal(false);
  activeLead = signal<Lead | null>(null);
  qualForm: FormGroup = this.fb.group({
    health_grade: ['COLD'],
    manual_score_override: [null],
    qualification_reasons: [''],
    financing_ready: [null],
    decision_maker_available: [null]
  });
  qualError = signal<string | null>(null);

  readonly LOOKUP = {
    health: 'CRM_LEAD_HEALTH',
    stage: 'CRM_LEAD_STAGE',
    priority: 'CRM_LEAD_PRIORITY'
  };

  readonly gradeMeta: Record<string, { label: string; class: string; icon: any }> = {
    HOT: { label: 'Hot', class: 'bg-red-100 text-red-700 border-red-200', icon: Flame },
    WARM: { label: 'Warm', class: 'bg-amber-100 text-amber-700 border-amber-200', icon: Flame },
    COLD: { label: 'Cold', class: 'bg-blue-100 text-blue-700 border-blue-200', icon: Snowflake },
    NURTURE: { label: 'Nurture', class: 'bg-purple-100 text-purple-700 border-purple-200', icon: Leaf },
    UNQUALIFIED: { label: 'Unqualified', class: 'bg-slate-100 text-slate-600 border-slate-200', icon: Ban }
  };

  readonly gradeOptions = [
    { value: 'ALL', label: 'All Grades' },
    { value: 'HOT', label: 'Hot' },
    { value: 'WARM', label: 'Warm' },
    { value: 'COLD', label: 'Cold' },
    { value: 'NURTURE', label: 'Nurture' },
    { value: 'UNQUALIFIED', label: 'Unqualified' }
  ];

  readonly financingOptions = [
    { value: 'ALL', label: 'Any Financing Status' },
    { value: 'true', label: 'Financing Ready' },
    { value: 'false', label: 'Not Financing Ready' }
  ];

  readonly decisionOptions = [
    { value: 'ALL', label: 'Any Decision-Maker' },
    { value: 'true', label: 'Decision-Maker Available' },
    { value: 'false', label: 'Decision-Maker Not Available' }
  ];

  readonly sortOptions = [
    { value: 'lead_score_desc', label: 'Score (High-Low)' },
    { value: 'lead_score_asc', label: 'Score (Low-High)' },
    { value: 'created_at_desc', label: 'Newest First' },
    { value: 'created_at_asc', label: 'Oldest First' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    health_grade: ['ALL'],
    lead_stage: [null],
    financing_ready: ['ALL'],
    decision_maker_available: ['ALL'],
    sort_by: ['lead_score_desc']
  });

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  fromRow = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  toRow = computed(() => Math.min(this.offset() + this.limit(), this.total()));
  allSelected = computed(() => {
    const rows = this.leads();
    return rows.length > 0 && rows.every(l => this.selectedIds().has(l.id));
  });

  gradeCounts = computed(() => {
    const counts: Record<string, number> = { HOT: 0, WARM: 0, COLD: 0, NURTURE: 0, UNQUALIFIED: 0 };
    for (const l of this.leads()) {
      if (l.health_grade && counts[l.health_grade] !== undefined) counts[l.health_grade]++;
    }
    return counts;
  });

  ngOnInit(): void {
    this.loadTable();

    this.filterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.applyFilters());

    this.filterForm.get('search')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.applyFilters());
  }

  private buildFilters(): QualificationFilters {
    const v = this.filterForm.value;
    const filters: QualificationFilters = {
      limit: this.limit(),
      offset: this.offset(),
      sort_by: v.sort_by || 'lead_score_desc'
    };
    if (v.search?.trim()) filters.search = v.search.trim();
    if (v.health_grade && v.health_grade !== 'ALL') filters.health_grade = v.health_grade;
    if (v.lead_stage) filters.lead_stage = v.lead_stage;
    if (v.financing_ready === 'true') filters.financing_ready = true;
    else if (v.financing_ready === 'false') filters.financing_ready = false;
    if (v.decision_maker_available === 'true') filters.decision_maker_available = true;
    else if (v.decision_maker_available === 'false') filters.decision_maker_available = false;
    return filters;
  }

  loadTable(): void {
    this.crmService.loadQualificationTable(this.buildFilters()).subscribe();
  }

  applyFilters(): void {
    this.crmService.leadsOffset.set(0);
    this.loadTable();
  }

  setPage(page: number): void {
    const newOffset = (page - 1) * this.limit();
    if (newOffset < 0 || newOffset >= this.total()) return;
    this.crmService.leadsOffset.set(newOffset);
    this.loadTable();
  }

  toggleAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.leads().map(l => l.id)));
    }
  }

  toggleRow(id: number): void {
    const s = new Set(this.selectedIds());
    if (s.has(id)) s.delete(id); else s.add(id);
    this.selectedIds.set(s);
  }

  gradeClass(grade: string | null | undefined): string {
    return this.gradeMeta[grade ?? '']?.class ?? 'bg-slate-100 text-slate-600 border-slate-200';
  }

  scoreBarColor(score: number): string {
    if (score >= 75) return 'bg-red-500';
    if (score >= 55) return 'bg-amber-500';
    if (score >= 35) return 'bg-blue-500';
    if (score >= 15) return 'bg-purple-500';
    return 'bg-slate-400';
  }

  openQualModal(lead: Lead): void {
    this.activeLead.set(lead);
    this.qualError.set(null);
    this.qualForm.patchValue({
      health_grade: lead.health_grade || 'COLD',
      manual_score_override: lead.manual_score_override,
      qualification_reasons: lead.qualification_reasons || '',
      financing_ready: lead.financing_ready,
      decision_maker_available: lead.decision_maker_available
    });
    this.qualModalOpen.set(true);
  }

  closeQualModal(): void {
    this.qualModalOpen.set(false);
    this.activeLead.set(null);
  }

  saveQualification(): void {
    const lead = this.activeLead();
    if (!lead) return;
    const v = this.qualForm.value;
    this.isSaving.set(lead.id);
    this.qualError.set(null);

    const payload: any = {
      health_grade: v.health_grade,
      qualification_reasons: v.qualification_reasons || null
    };
    if (v.manual_score_override !== null && v.manual_score_override !== '' && !Number.isNaN(Number(v.manual_score_override))) {
      payload.manual_score_override = Number(v.manual_score_override);
    }
    if (v.financing_ready !== null && v.financing_ready !== 'ALL') {
      payload.financing_ready = v.financing_ready === true || v.financing_ready === 'true';
    }
    if (v.decision_maker_available !== null && v.decision_maker_available !== 'ALL') {
      payload.decision_maker_available = v.decision_maker_available === true || v.decision_maker_available === 'true';
    }

    this.crmService.updateLeadQualification(lead.id, payload).subscribe({
      next: () => {
        this.isSaving.set(null);
        this.closeQualModal();
        this.loadTable();
      },
      error: (err) => {
        this.isSaving.set(null);
        this.qualError.set(err?.error?.detail || 'Failed to update qualification.');
      }
    });
  }

  viewHistory(lead: Lead): void {
    this.router.navigate(['/crm/lead-capture', lead.id, 'edit']);
  }

  editLead(lead: Lead): void {
    this.router.navigate(['/crm/lead-capture', lead.id, 'edit']);
  }

  refresh(): void {
    this.loadTable();
  }
}
