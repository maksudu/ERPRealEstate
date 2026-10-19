import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
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
import { CrmService, OpportunityFilters, BookingHandoverFilters } from '../../../core/services/crm.service';
import {
  Lead,
  FunnelStage,
  LeadStageTransition,
  Opportunity,
  BookingHandover,
  ConversionKpiResponse
} from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-funnel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-funnel.component.html'
})
export class CrmFunnelComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Math = Math;

  // Dynamic Lookup Category Codes (Spec 4.11 & Rule 1)
  readonly LOOKUP = {
    funnelStage: 'CRM_FUNNEL_STAGE',
    lostReason: 'CRM_LOST_REASON',
    handoverStatus: 'CRM_HANDOVER_STATUS'
  };

  // Active Tab: 'funnel' | 'opportunities' | 'handovers' | 'stages' | 'cohorts'
  activeTab = signal<'funnel' | 'opportunities' | 'handovers' | 'stages' | 'cohorts'>('funnel');

  // Funnel Analytics & Recommended KPIs Signal
  analytics = signal<ConversionKpiResponse>({
    cohort_period: 'LAST_30_DAYS',
    total_unique_leads: 0,
    eligible_unique_leads: 0,
    total_valid_bookings: 0,
    lead_to_booking_rate: 0,
    site_visits_completed: 0,
    bookings_from_site_visits: 0,
    site_visit_conversion_rate: 0,
    stages: [],
    by_source: [],
    by_sales_rep: [],
    by_project: [],
    generated_at: new Date().toISOString()
  });

  // Funnel Stages
  stages = signal<FunnelStage[]>([]);

  // Leads in Funnel (Paginated workbench)
  leads = signal<Lead[]>([]);
  totalLeads = signal<number>(0);
  leadPage = signal<number>(1);
  leadLimit = signal<number>(15);
  isLoadingLeads = signal<boolean>(false);

  leadFilterForm: FormGroup = this.fb.group({
    search: [''],
    stage: [''],
    health_grade: ['']
  });

  // Opportunities State
  opportunities = signal<Opportunity[]>([]);
  totalOpportunities = signal<number>(0);
  opportunityPage = signal<number>(1);
  opportunityLimit = signal<number>(15);
  isLoadingOpportunities = signal<boolean>(false);

  opportunityFilterForm: FormGroup = this.fb.group({
    search: [''],
    stage: ['']
  });

  // Booking Handovers State
  handovers = signal<BookingHandover[]>([]);
  totalHandovers = signal<number>(0);
  handoverPage = signal<number>(1);
  handoverLimit = signal<number>(15);
  isLoadingHandovers = signal<boolean>(false);

  handoverFilterForm: FormGroup = this.fb.group({
    search: [''],
    status: ['']
  });

  // Modal: Stage Transition
  selectedLead = signal<Lead | null>(null);
  isTransitionModalOpen = signal<boolean>(false);
  transitionForm: FormGroup = this.fb.group({
    to_stage: ['02_CONTACTED'],
    transition_notes: ['']
  });

  // Modal: Disqualify / Loss
  isDisqualifyModalOpen = signal<boolean>(false);
  disqualifyForm: FormGroup = this.fb.group({
    lost_reason: ['BUDGET_MISMATCH'],
    notes: ['']
  });

  // Modal: Reopen Lost Lead
  isReopenModalOpen = signal<boolean>(false);
  reopenForm: FormGroup = this.fb.group({
    reopen_notes: [''],
    target_stage: ['01_NEW_LEAD']
  });

  // Modal: Stage Dwell History
  isHistoryModalOpen = signal<boolean>(false);
  stageHistory = signal<LeadStageTransition[]>([]);
  isLoadingHistory = signal<boolean>(false);

  // Modal: Review Handover
  selectedHandover = signal<BookingHandover | null>(null);
  isReviewModalOpen = signal<boolean>(false);
  reviewForm: FormGroup = this.fb.group({
    decision: ['ACCEPT'],
    rejection_reason: [''],
    sales_booking_id: [null]
  });

  // Modal: Edit Stage Configuration
  selectedStage = signal<FunnelStage | null>(null);
  isStageModalOpen = signal<boolean>(false);
  stageConfigForm: FormGroup = this.fb.group({
    stage_name: [''],
    stage_order: [1],
    target_dwell_days: [3],
    entry_criteria: [''],
    exit_criteria: [''],
    color_code: ['#3b82f6']
  });

  isActionLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadFunnelStages();
    this.loadLeads();
    this.loadOpportunities();
    this.loadHandovers();

    // Debounced filter listeners
    this.leadFilterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.leadPage.set(1);
        this.loadLeads();
      });

    this.opportunityFilterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.opportunityPage.set(1);
        this.loadOpportunities();
      });

    this.handoverFilterForm.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handoverPage.set(1);
        this.loadHandovers();
      });
  }

  // --- Loaders ---
  loadAnalytics(): void {
    this.crmService.getFunnelAnalytics().subscribe({
      next: (res) => this.analytics.set(res),
      error: (err) => console.error('Failed to load funnel analytics', err)
    });
  }

  loadFunnelStages(): void {
    this.crmService.getFunnelStages().subscribe({
      next: (res) => this.stages.set(res || []),
      error: (err) => console.error('Failed to load funnel stages', err)
    });
  }

  loadLeads(): void {
    this.isLoadingLeads.set(true);
    const f = this.leadFilterForm.value;
    const offset = (this.leadPage() - 1) * this.leadLimit();

    this.crmService.loadLeadsTable({
      search: f.search || undefined,
      lead_stage: f.stage || undefined,
      offset: offset,
      limit: this.leadLimit()
    }).subscribe({
      next: (res) => {
        this.leads.set(res.items);
        this.totalLeads.set(res.total);
        this.isLoadingLeads.set(false);
      },
      error: (err) => {
        console.error('Failed to load leads', err);
        this.isLoadingLeads.set(false);
      }
    });
  }

  loadOpportunities(): void {
    this.isLoadingOpportunities.set(true);
    const f = this.opportunityFilterForm.value;
    const filters: OpportunityFilters = {
      search: f.search || undefined,
      stage: f.stage || undefined,
      page: this.opportunityPage(),
      limit: this.opportunityLimit()
    };

    this.crmService.getOpportunities(filters).subscribe({
      next: (res) => {
        this.opportunities.set(res.items);
        this.totalOpportunities.set(res.total);
        this.isLoadingOpportunities.set(false);
      },
      error: (err) => {
        console.error('Failed to load opportunities', err);
        this.isLoadingOpportunities.set(false);
      }
    });
  }

  loadHandovers(): void {
    this.isLoadingHandovers.set(true);
    const f = this.handoverFilterForm.value;
    const filters: BookingHandoverFilters = {
      search: f.search || undefined,
      status: f.status || undefined,
      page: this.handoverPage(),
      limit: this.handoverLimit()
    };

    this.crmService.getBookingHandovers(filters).subscribe({
      next: (res) => {
        this.handovers.set(res.items);
        this.totalHandovers.set(res.total);
        this.isLoadingHandovers.set(false);
      },
      error: (err) => {
        console.error('Failed to load handovers', err);
        this.isLoadingHandovers.set(false);
      }
    });
  }

  // --- Pagination ---
  onLeadPageChange(p: number): void {
    this.leadPage.set(p);
    this.loadLeads();
  }

  onOpportunityPageChange(p: number): void {
    this.opportunityPage.set(p);
    this.loadOpportunities();
  }

  onHandoverPageChange(p: number): void {
    this.handoverPage.set(p);
    this.loadHandovers();
  }

  // --- Navigation ---
  createNewOpportunity(): void {
    this.router.navigate(['/crm/funnel/opportunities/new']);
  }

  editOpportunity(opp: Opportunity): void {
    this.router.navigate(['/crm/funnel/opportunities', opp.id, 'edit']);
  }

  createNewHandover(opp?: Opportunity): void {
    if (opp) {
      this.router.navigate(['/crm/funnel/handovers/new'], {
        queryParams: { opportunity_id: opp.id }
      });
    } else {
      this.router.navigate(['/crm/funnel/handovers/new']);
    }
  }

  // --- Stage Transition Actions ---
  openTransitionModal(lead: Lead): void {
    this.selectedLead.set(lead);
    // Find next stage in sequence
    const currentIdx = this.stages().findIndex(s => s.stage_code === lead.lead_stage);
    const nextStage = currentIdx >= 0 && currentIdx < this.stages().length - 1
      ? this.stages()[currentIdx + 1].stage_code
      : '02_CONTACTED';

    this.transitionForm.reset({
      to_stage: nextStage,
      transition_notes: ''
    });
    this.isTransitionModalOpen.set(true);
  }

  closeTransitionModal(): void {
    this.isTransitionModalOpen.set(false);
    this.selectedLead.set(null);
  }

  submitStageTransition(): void {
    const lead = this.selectedLead();
    if (!lead) return;

    this.isActionLoading.set(true);
    const formVal = this.transitionForm.value;

    this.crmService.transitionLeadStage(lead.id, {
      to_stage: formVal.to_stage,
      transition_notes: formVal.transition_notes || undefined
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeTransitionModal();
        this.loadLeads();
        this.loadAnalytics();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Failed to advance stage');
      }
    });
  }

  // --- Disqualify / Loss Actions ---
  openDisqualifyModal(lead: Lead): void {
    this.selectedLead.set(lead);
    this.disqualifyForm.reset({
      lost_reason: 'BUDGET_MISMATCH',
      notes: ''
    });
    this.isDisqualifyModalOpen.set(true);
  }

  closeDisqualifyModal(): void {
    this.isDisqualifyModalOpen.set(false);
    this.selectedLead.set(null);
  }

  submitDisqualify(): void {
    const lead = this.selectedLead();
    if (!lead) return;

    this.isActionLoading.set(true);
    const formVal = this.disqualifyForm.value;

    this.crmService.disqualifyLead(lead.id, {
      lost_reason: formVal.lost_reason,
      notes: formVal.notes || undefined
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeDisqualifyModal();
        this.loadLeads();
        this.loadAnalytics();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Disqualification failed');
      }
    });
  }

  // --- Reopen Lost Lead Actions ---
  openReopenModal(lead: Lead): void {
    this.selectedLead.set(lead);
    this.reopenForm.reset({
      reopen_notes: '',
      target_stage: '01_NEW_LEAD'
    });
    this.isReopenModalOpen.set(true);
  }

  closeReopenModal(): void {
    this.isReopenModalOpen.set(false);
    this.selectedLead.set(null);
  }

  submitReopen(): void {
    const lead = this.selectedLead();
    if (!lead) return;

    const formVal = this.reopenForm.value;
    if (!formVal.reopen_notes?.trim()) {
      alert('Please specify the authorized justification to reopen this lead.');
      return;
    }

    this.isActionLoading.set(true);
    this.crmService.reopenLead(lead.id, {
      reopen_notes: formVal.reopen_notes.trim(),
      target_stage: formVal.target_stage || '01_NEW_LEAD'
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeReopenModal();
        this.loadLeads();
        this.loadAnalytics();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Reopening failed');
      }
    });
  }

  // --- Stage Dwell Time History ---
  openHistoryModal(lead: Lead): void {
    this.selectedLead.set(lead);
    this.isLoadingHistory.set(true);
    this.isHistoryModalOpen.set(true);

    this.crmService.getLeadStageHistory(lead.id).subscribe({
      next: (res) => {
        this.stageHistory.set(res || []);
        this.isLoadingHistory.set(false);
      },
      error: (err) => {
        console.error('Failed to load stage history', err);
        this.isLoadingHistory.set(false);
      }
    });
  }

  closeHistoryModal(): void {
    this.isHistoryModalOpen.set(false);
    this.selectedLead.set(null);
    this.stageHistory.set([]);
  }

  // --- Review Handover Actions ---
  openReviewModal(hnd: BookingHandover): void {
    this.selectedHandover.set(hnd);
    this.reviewForm.reset({
      decision: 'ACCEPT',
      rejection_reason: '',
      sales_booking_id: null
    });
    this.isReviewModalOpen.set(true);
  }

  closeReviewModal(): void {
    this.isReviewModalOpen.set(false);
    this.selectedHandover.set(null);
  }

  submitHandoverReview(): void {
    const hnd = this.selectedHandover();
    if (!hnd) return;

    this.isActionLoading.set(true);
    const formVal = this.reviewForm.value;

    this.crmService.reviewBookingHandover(hnd.id, {
      decision: formVal.decision,
      rejection_reason: formVal.rejection_reason || undefined,
      sales_booking_id: formVal.sales_booking_id || undefined
    }).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeReviewModal();
        this.loadHandovers();
        this.loadAnalytics();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Review failed');
      }
    });
  }

  // --- Stage Configuration ---
  openStageConfig(stage: FunnelStage): void {
    this.selectedStage.set(stage);
    this.stageConfigForm.patchValue({
      stage_name: stage.stage_name,
      stage_order: stage.stage_order,
      target_dwell_days: stage.target_dwell_days,
      entry_criteria: stage.entry_criteria,
      exit_criteria: stage.exit_criteria,
      color_code: stage.color_code
    });
    this.isStageModalOpen.set(true);
  }

  closeStageModal(): void {
    this.isStageModalOpen.set(false);
    this.selectedStage.set(null);
  }

  saveStageConfig(): void {
    const stage = this.selectedStage();
    if (!stage) return;

    this.isActionLoading.set(true);
    this.crmService.updateFunnelStage(stage.id, this.stageConfigForm.value).subscribe({
      next: () => {
        this.isActionLoading.set(false);
        this.closeStageModal();
        this.loadFunnelStages();
      },
      error: (err) => {
        this.isActionLoading.set(false);
        alert(err?.error?.detail || 'Failed to update stage config');
      }
    });
  }

  // --- Helpers ---
  getBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case '07_BOOKING':
      case 'BOOKING':
      case 'WON':
      case 'ACCEPTED_BY_OPS':
      case 'BOOKING_CREATED':
      case 'HOT':
        return 'success';
      case '03_QUALIFIED':
      case '04_SITE_VISIT':
      case '05_NEGOTIATION':
      case '06_QUOTATION':
      case 'WARM':
      case 'PENDING_SALES_OPS':
        return 'warning';
      case '01_NEW_LEAD':
      case '02_CONTACTED':
        return 'info';
      case 'LOST':
      case 'REJECTED':
      case 'COLD':
      case 'UNQUALIFIED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  formatBdt(amount: number): string {
    if (!amount) return '৳ 0';
    return '৳ ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
