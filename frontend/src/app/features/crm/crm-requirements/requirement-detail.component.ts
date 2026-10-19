import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import {
  CustomerRequirement,
  InventoryMatchUnit,
  InventoryRecommendation,
  RequirementAuditLog
} from '../../../core/models/crm.model';

@Component({
  selector: 'app-requirement-detail',
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
  templateUrl: './requirement-detail.component.html'
})
export class RequirementDetailComponent implements OnInit {
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Dynamic Lookup Category Codes (Spec 4.6 & Rule 1)
  readonly LOOKUP = {
    rejectionReason: 'CRM_REJECTION_REASON',
    recommendationStatus: 'CRM_RECOMMENDATION_STATUS'
  };

  reqId = signal<number>(0);
  requirement = signal<CustomerRequirement | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Active Tab: 'matching' | 'recommendations' | 'audit'
  activeTab = signal<'matching' | 'recommendations' | 'audit'>('matching');

  // Tab 1: Live Matching Units
  matches = signal<InventoryMatchUnit[]>([]);
  isLoadingMatches = signal(false);
  isRecommending = signal<number | null>(null);

  // Tab 2: Recommendations History
  recommendations = signal<InventoryRecommendation[]>([]);
  isLoadingRecs = signal(false);

  // Tab 3: Audit Logs
  auditLogs = signal<RequirementAuditLog[]>([]);
  isLoadingAudit = signal(false);

  // Feedback Modal State
  feedbackModalOpen = signal(false);
  activeRec = signal<InventoryRecommendation | null>(null);
  isSubmittingFeedback = signal(false);
  feedbackError = signal<string | null>(null);

  feedbackForm: FormGroup = this.fb.group({
    status: ['SHORTLISTED', [Validators.required]],
    rejection_reason: [''],
    rejection_notes: ['']
  });

  readonly feedbackStatusOptions = [
    { value: 'SHORTLISTED', label: 'Shortlisted by Customer' },
    { value: 'SITE_VISITED', label: 'Site Visit Scheduled / Completed' },
    { value: 'ACCEPTED', label: 'Accepted for Booking Allotment' },
    { value: 'REJECTED', label: 'Rejected by Customer' }
  ];

  isRejectedStatus = computed(() => this.feedbackForm.get('status')?.value === 'REJECTED');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.reqId.set(id);
      this.loadRequirement();
      this.loadMatches();
      this.loadRecommendations();
      this.loadAuditLogs();
    }
  }

  loadRequirement(): void {
    this.isLoading.set(true);
    this.crmService.getRequirement(this.reqId()).subscribe({
      next: (req) => {
        this.requirement.set(req);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load requirement profile.');
      }
    });
  }

  loadMatches(): void {
    this.isLoadingMatches.set(true);
    this.crmService.getInventoryMatches(this.reqId()).subscribe({
      next: (items) => {
        this.matches.set(items || []);
        this.isLoadingMatches.set(false);
      },
      error: () => this.isLoadingMatches.set(false)
    });
  }

  loadRecommendations(): void {
    this.isLoadingRecs.set(true);
    this.crmService.getRequirementRecommendations(this.reqId()).subscribe({
      next: (items) => {
        this.recommendations.set(items || []);
        this.isLoadingRecs.set(false);
      },
      error: () => this.isLoadingRecs.set(false)
    });
  }

  loadAuditLogs(): void {
    this.isLoadingAudit.set(true);
    this.crmService.getRequirementAuditLogs(this.reqId()).subscribe({
      next: (logs) => {
        this.auditLogs.set(logs || []);
        this.isLoadingAudit.set(false);
      },
      error: () => this.isLoadingAudit.set(false)
    });
  }

  recommendUnit(unit: InventoryMatchUnit): void {
    this.isRecommending.set(unit.unit_id);
    this.crmService.recommendUnit(this.reqId(), {
      unit_id: unit.unit_id,
      match_score_percentage: unit.match_score_percentage,
      match_details_json: JSON.stringify(unit.match_breakdown)
    }).subscribe({
      next: () => {
        this.isRecommending.set(null);
        unit.is_already_recommended = true;
        unit.recommendation_status = 'RECOMMENDED';
        this.successMessage.set(`Unit ${unit.unit_number} successfully recommended to customer.`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadRecommendations();
        this.loadRequirement();
      },
      error: () => {
        this.isRecommending.set(null);
      }
    });
  }

  openFeedbackModal(rec: InventoryRecommendation): void {
    this.activeRec.set(rec);
    this.feedbackError.set(null);
    this.feedbackForm.patchValue({
      status: rec.status === 'RECOMMENDED' ? 'SHORTLISTED' : rec.status,
      rejection_reason: rec.rejection_reason || '',
      rejection_notes: rec.rejection_notes || ''
    });
    this.feedbackModalOpen.set(true);
  }

  saveFeedback(): void {
    const rec = this.activeRec();
    if (!rec) return;

    const val = this.feedbackForm.value;
    if (val.status === 'REJECTED' && !val.rejection_reason) {
      this.feedbackError.set('Please select a rejection reason when customer rejects the unit.');
      return;
    }

    this.isSubmittingFeedback.set(true);
    this.crmService.updateRecommendationStatus(rec.id, {
      status: val.status,
      rejection_reason: val.status === 'REJECTED' ? val.rejection_reason : undefined,
      rejection_notes: (val.rejection_notes || '').trim() || undefined
    }).subscribe({
      next: () => {
        this.isSubmittingFeedback.set(false);
        this.feedbackModalOpen.set(false);
        this.activeRec.set(null);
        this.loadRecommendations();
        this.loadMatches();
        this.loadRequirement();
      },
      error: (err) => {
        this.isSubmittingFeedback.set(false);
        this.feedbackError.set(err?.error?.detail || 'Failed to record customer feedback.');
      }
    });
  }

  goToEdit(): void {
    this.router.navigate(['/crm/requirements', this.reqId(), 'edit']);
  }

  goBack(): void {
    this.router.navigate(['/crm/requirements']);
  }

  formatBdt(val: number | null | undefined): string {
    if (val === null || val === undefined) return '—';
    if (val >= 10000000) {
      return `৳${(val / 10000000).toFixed(2)} Cr`;
    }
    if (val >= 100000) {
      return `৳${(val / 100000).toFixed(2)} Lakh`;
    }
    return `৳${val.toLocaleString('en-US')}`;
  }
}
