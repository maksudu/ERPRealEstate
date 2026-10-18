import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { PriceNegotiationProposal, DiscountLimitPolicy } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-discounts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-discounts.component.html'
})
export class SalesDiscountsComponent implements OnInit {
  protected readonly Math = Math;
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Tab
  activeTab = signal<'PROPOSALS' | 'POLICIES'>('PROPOSALS');

  // Proposals State
  proposals = signal<PriceNegotiationProposal[]>([]);
  totalProposals = signal<number>(0);
  isLoadingProposals = signal<boolean>(false);

  // Policies State
  policies = signal<DiscountLimitPolicy[]>([]);
  isLoadingPolicies = signal<boolean>(false);

  // Projects for Filter
  projects = signal<Project[]>([]);
  projectOptions = signal<Array<{ label: string; value: any }>>([]);

  // Filters & Pagination
  searchTerm = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedStatus = signal<string>('');
  selectedTier = signal<string>('');
  limit = signal<number>(10);
  offset = signal<number>(0);

  // Quick Action Modal (Authorize / Reject)
  isQuickModalOpen = signal<boolean>(false);
  selectedProposal = signal<PriceNegotiationProposal | null>(null);
  quickDecision = signal<'APPROVED' | 'REJECTED'>('APPROVED');
  isQuickSubmitting = signal<boolean>(false);

  quickActionForm: FormGroup = this.fb.group({
    approved_by_name: ['Executive Management', Validators.required],
    approval_comments: ['', Validators.required],
    biometric_token: ['']
  });

  // Policy Creation Modal
  isPolicyModalOpen = signal<boolean>(false);
  isPolicySubmitting = signal<boolean>(false);
  policyForm: FormGroup = this.fb.group({
    role_name: ['', Validators.required],
    project_id: [null],
    max_discount_percentage: [5.0, [Validators.required, Validators.min(0), Validators.max(100)]],
    max_discount_amount: [null],
    requires_justification: [true],
    requires_attachment: [false],
    is_active: [true]
  });

  // Role options for policy dropdown
  roleOptions = [
    { label: 'Sales Representative', value: 'Sales Representative' },
    { label: 'Assistant Sales Manager', value: 'Assistant Sales Manager' },
    { label: 'Sales Manager', value: 'Sales Manager' },
    { label: 'Head of Sales / Director', value: 'Head of Sales / Director' },
    { label: 'Chief Commercial Officer', value: 'Chief Commercial Officer' },
    { label: 'Managing Director', value: 'Managing Director' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadProposals();
    this.loadPolicies();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        const list = res || [];
        this.projects.set(list);
        this.projectOptions.set([
          { label: 'All Projects', value: null },
          ...list.map((p) => ({ label: `${p.project_name} (${p.project_code || 'PRJ'})`, value: p.id }))
        ]);
      }
    });
  }

  loadProposals(): void {
    this.isLoadingProposals.set(true);
    this.salesService.getDiscountProposals({
      search: this.searchTerm() || undefined,
      project_id: this.selectedProjectId() || undefined,
      status: this.selectedStatus() || undefined,
      required_tier: this.selectedTier() || undefined,
      limit: this.limit(),
      offset: this.offset()
    }).subscribe({
      next: (res) => {
        this.proposals.set(res || []);
        // Approximation of total count based on array length and offset
        this.totalProposals.set((this.offset() + (res?.length || 0)) + (res?.length === this.limit() ? this.limit() : 0));
        this.isLoadingProposals.set(false);
      },
      error: () => this.isLoadingProposals.set(false)
    });
  }

  loadPolicies(): void {
    this.isLoadingPolicies.set(true);
    this.salesService.getDiscountLimitPolicies().subscribe({
      next: (res) => {
        this.policies.set(res || []);
        this.isLoadingPolicies.set(false);
      },
      error: () => this.isLoadingPolicies.set(false)
    });
  }

  onSearch(term: string): void {
    this.searchTerm.set(term);
    this.offset.set(0);
    this.loadProposals();
  }

  onProjectFilterChange(projId: any): void {
    this.selectedProjectId.set(projId ? Number(projId) : null);
    this.offset.set(0);
    this.loadProposals();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus.set(status);
    this.offset.set(0);
    this.loadProposals();
  }

  onTierFilterChange(tier: string): void {
    this.selectedTier.set(tier);
    this.offset.set(0);
    this.loadProposals();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.set(Math.max(0, this.offset() - this.limit()));
      this.loadProposals();
    }
  }

  nextPage(): void {
    if (this.proposals().length === this.limit()) {
      this.offset.set(this.offset() + this.limit());
      this.loadProposals();
    }
  }

  // Quick Action Modal Logic
  openQuickActionModal(proposal: PriceNegotiationProposal, decision: 'APPROVED' | 'REJECTED'): void {
    this.selectedProposal.set(proposal);
    this.quickDecision.set(decision);
    this.quickActionForm.reset({
      approved_by_name: 'Executive Commercial Committee',
      approval_comments: decision === 'APPROVED'
        ? 'Discount approved under authorized sales governance authority.'
        : 'Discount concession rejected due to minimum project margin floor.',
      biometric_token: proposal.required_approval_tier === 'MANAGING_DIRECTOR' ? 'BIO-MD-TOUCH-ID-AUTH-TOKEN-2026' : ''
    });
    this.isQuickModalOpen.set(true);
  }

  closeQuickModal(): void {
    this.isQuickModalOpen.set(false);
    this.selectedProposal.set(null);
  }

  submitQuickAction(): void {
    const proposal = this.selectedProposal();
    if (!proposal || !proposal.id || this.quickActionForm.invalid) return;

    this.isQuickSubmitting.set(true);
    const payload = {
      decision: this.quickDecision(),
      approved_by_name: this.quickActionForm.value.approved_by_name,
      approved_discount_amount: this.quickDecision() === 'APPROVED' ? proposal.requested_discount_amount : 0,
      approval_comments: this.quickActionForm.value.approval_comments,
      biometric_token: this.quickActionForm.value.biometric_token
    };

    this.salesService.reviewDiscountProposal(proposal.id, payload).subscribe({
      next: () => {
        this.isQuickSubmitting.set(false);
        this.closeQuickModal();
        this.loadProposals();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Decision recording failed.');
        this.isQuickSubmitting.set(false);
      }
    });
  }

  // Policy Modal Logic
  openPolicyModal(): void {
    this.policyForm.reset({
      role_name: 'Sales Representative',
      project_id: null,
      max_discount_percentage: 2.0,
      max_discount_amount: null,
      requires_justification: true,
      requires_attachment: false,
      is_active: true
    });
    this.isPolicyModalOpen.set(true);
  }

  closePolicyModal(): void {
    this.isPolicyModalOpen.set(false);
  }

  submitPolicy(): void {
    if (this.policyForm.invalid) return;
    this.isPolicySubmitting.set(true);

    const val = this.policyForm.value;
    const payload = {
      role_name: val.role_name,
      project_id: val.project_id ? Number(val.project_id) : null,
      max_discount_percentage: Number(val.max_discount_percentage) || 0,
      max_discount_amount: val.max_discount_amount ? Number(val.max_discount_amount) : null,
      requires_justification: Boolean(val.requires_justification),
      requires_attachment: Boolean(val.requires_attachment),
      is_active: Boolean(val.is_active)
    };

    this.salesService.createDiscountLimitPolicy(payload).subscribe({
      next: () => {
        this.isPolicySubmitting.set(false);
        this.closePolicyModal();
        this.loadPolicies();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to save discount policy.');
        this.isPolicySubmitting.set(false);
      }
    });
  }

  deletePolicy(policyId: number | undefined): void {
    if (!policyId) return;
    if (confirm('Are you sure you want to remove this delegated discount limit policy?')) {
      this.salesService.deleteDiscountLimitPolicy(policyId).subscribe({
        next: () => this.loadPolicies(),
        error: (err) => alert(err?.error?.detail || 'Failed to delete policy.')
      });
    }
  }
}
