import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, QualificationFilters } from '../../../core/services/crm.service';
import { Lead } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-lead-qualification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-lead-qualification.component.html'
})
export class CrmLeadQualificationComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

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
    { value: 'score_desc', label: 'Score: High to Low' },
    { value: 'score_asc', label: 'Score: Low to High' },
    { value: 'newest', label: 'Newest Inbound' },
    { value: 'oldest', label: 'Oldest Inbound' }
  ];

  filterForm: FormGroup = this.fb.group({
    search: [''],
    health_grade: ['ALL'],
    lead_stage: [null],
    financing_ready: ['ALL'],
    decision_maker_available: ['ALL'],
    sort_by: ['score_desc']
  });

  // Client-side grade distribution of currently loaded list for KPI widgets
  gradeCounts = computed(() => {
    const list = this.leads();
    const counts: Record<string, number> = {
      HOT: 0,
      WARM: 0,
      COLD: 0,
      NURTURE: 0,
      UNQUALIFIED: 0
    };
    for (const lead of list) {
      const g = (lead.health_grade || 'COLD').toUpperCase();
      if (counts[g] !== undefined) counts[g]++;
    }
    return counts;
  });

  currentPage = computed(() => Math.floor(this.offset() / this.limit()) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.limit())));
  fromRow = computed(() => (this.total() === 0 ? 0 : this.offset() + 1));
  toRow = computed(() => Math.min(this.offset() + this.limit(), this.total()));

  allSelected = computed(() => {
    const rows = this.leads();
    return rows.length > 0 && rows.every(l => this.selectedIds().has(l.id));
  });

  ngOnInit(): void {
    this.loadData();

    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.limit.set(20);
        this.offset.set(0);
        this.selectedIds.set(new Set());
        this.loadData();
      });
  }

  buildFilters(): QualificationFilters {
    const v = this.filterForm.value;
    const grade = v.health_grade || 'ALL';
    const fin = v.financing_ready || 'ALL';
    const dec = v.decision_maker_available || 'ALL';

    return {
      search: (v.search || '').trim() || undefined,
      health_grade: grade !== 'ALL' ? grade : undefined,
      lead_stage: v.lead_stage || undefined,
      financing_ready: fin === 'true' ? true : fin === 'false' ? false : undefined,
      decision_maker_available: dec === 'true' ? true : dec === 'false' ? false : undefined,
      sort_by: v.sort_by || 'score_desc',
      limit: this.limit(),
      offset: this.offset()
    };
  }

  loadData(): void {
    this.crmService.loadQualificationTable(this.buildFilters()).subscribe();
  }

  refresh(): void {
    this.loadData();
  }

  setPage(page: number): void {
    const clamped = Math.max(1, Math.min(page, this.totalPages()));
    this.offset.set((clamped - 1) * this.limit());
    this.loadData();
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
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.selectedIds.set(s);
  }

  // --- Modal Override ---
  openQualModal(lead: Lead): void {
    this.activeLead.set(lead);
    this.qualError.set(null);
    this.qualForm.patchValue({
      health_grade: lead.health_grade || 'COLD',
      manual_score_override: lead.manual_score_override ?? null,
      qualification_reasons: lead.qualification_reasons || '',
      financing_ready: lead.financing_ready === true ? 'true' : lead.financing_ready === false ? 'false' : null,
      decision_maker_available: lead.decision_maker_available === true ? 'true' : lead.decision_maker_available === false ? 'false' : null
    });
    this.qualModalOpen.set(true);
  }

  closeQualModal(): void {
    this.qualModalOpen.set(false);
    this.activeLead.set(null);
    this.qualError.set(null);
  }

  saveQualification(): void {
    const lead = this.activeLead();
    if (!lead) return;

    const val = this.qualForm.value;
    const override = val.manual_score_override !== null && val.manual_score_override !== ''
      ? Number(val.manual_score_override)
      : null;

    if (override !== null && (override < 0 || override > 100)) {
      this.qualError.set('Manual score override must be between 0 and 100.');
      return;
    }

    const payload: any = {
      health_grade: val.health_grade || 'COLD',
      manual_score_override: override !== null ? override : undefined,
      qualification_reasons: (val.qualification_reasons || '').trim() || undefined,
      financing_ready: val.financing_ready === 'true' ? true : val.financing_ready === 'false' ? false : undefined,
      decision_maker_available: val.decision_maker_available === 'true' ? true : val.decision_maker_available === 'false' ? false : undefined
    };

    this.isSaving.set(lead.id);
    this.crmService.updateLeadQualification(lead.id, payload).subscribe({
      next: () => {
        this.isSaving.set(null);
        this.closeQualModal();
        this.loadData();
      },
      error: (err: any) => {
        this.isSaving.set(null);
        this.qualError.set(err?.error?.detail || 'Failed to update lead qualification.');
      }
    });
  }

  editLead(lead: Lead): void {
    this.router.navigate(['/crm/lead-capture', lead.id, 'edit']);
  }

  gradeClass(grade?: string | null): string {
    const g = (grade || 'COLD').toUpperCase();
    switch (g) {
      case 'HOT':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/30';
      case 'WARM':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/30';
      case 'COLD':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/30';
      case 'NURTURE':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/30';
      case 'UNQUALIFIED':
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/30';
    }
  }

  scoreColor(score: number): string {
    if (score >= 75) return 'text-rose-600';
    if (score >= 55) return 'text-amber-600';
    if (score >= 35) return 'text-blue-600';
    return 'text-slate-500';
  }

  scoreBarColor(score: number): string {
    if (score >= 75) return 'bg-rose-500';
    if (score >= 55) return 'bg-amber-500';
    if (score >= 35) return 'bg-blue-500';
    return 'bg-slate-400';
  }
}
