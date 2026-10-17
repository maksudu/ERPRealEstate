import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomButtonComponent } from '../../../shared/components/custom-button/custom-button.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { GovernanceService } from '../../../core/services/governance.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import {
  ApprovalPolicy,
  ApprovalRequest,
  ApprovalStep,
  ApprovalAuditLog,
  GovernanceNotification,
  GovernanceMetrics
} from '../../../core/models/governance.model';

type GovernanceTab = 'inbox' | 'policies' | 'audit_trail' | 'notifications';

@Component({
  selector: 'app-governance-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './governance-cockpit.component.html',
  styleUrls: ['./governance-cockpit.component.css']
})
export class GovernanceCockpitComponent implements OnInit {
  private fb = inject(FormBuilder);
  private governanceService = inject(GovernanceService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);

  // Active Tab
  activeTab = signal<GovernanceTab>('inbox');

  // KPI Metrics
  metrics = signal<GovernanceMetrics | null>(null);

  // Data signals
  policies = signal<ApprovalPolicy[]>([]);
  requests = signal<ApprovalRequest[]>([]);
  notifications = signal<GovernanceNotification[]>([]);
  projects = signal<Project[]>([]);

  // Selected Detail Modal
  selectedRequest = signal<ApprovalRequest | null>(null);
  isDetailModalOpen = signal<boolean>(false);
  isActionModalOpen = signal<boolean>(false);
  isCreateRequestModalOpen = signal<boolean>(false);
  isCreatePolicyModalOpen = signal<boolean>(false);

  // Selected Step for Action
  activeStepForAction = signal<ApprovalStep | null>(null);

  // Filters
  filterDocType = signal<string>('');
  filterStatus = signal<string>('');
  searchQuery = signal<string>('');

  // Forms
  actionForm!: FormGroup;
  newRequestForm!: FormGroup;
  newPolicyForm!: FormGroup;

  // Dynamic Search Select Options (from Lookups & Projects)
  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      id: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  );

  docTypeOptions = signal<{ value: string; id: string; label: string }[]>([
    { value: 'DISCOUNT_APPROVAL', id: 'DISCOUNT_APPROVAL', label: 'Sales Discount Approval' },
    { value: 'PURCHASE_ORDER', id: 'PURCHASE_ORDER', label: 'Purchase Order (PO)' },
    { value: 'BOOKING_CANCELLATION', id: 'BOOKING_CANCELLATION', label: 'Booking Cancellation & Refund' },
    { value: 'CONTRACTOR_RA_BILL', id: 'CONTRACTOR_RA_BILL', label: 'Contractor Running Account (RA) Bill' },
    { value: 'MATERIAL_REQUISITION', id: 'MATERIAL_REQUISITION', label: 'Material Requisition (PR)' },
    { value: 'JOURNAL_VOUCHER', id: 'JOURNAL_VOUCHER', label: 'Financial Journal Voucher' }
  ]);

  roleOptions = signal<{ value: string; id: string; label: string }[]>([
    { value: 'PROJECT_ENGINEER', id: 'PROJECT_ENGINEER', label: 'Project Site Engineer' },
    { value: 'PROCUREMENT_HEAD', id: 'PROCUREMENT_HEAD', label: 'Head of Procurement' },
    { value: 'SALES_MANAGER', id: 'SALES_MANAGER', label: 'Sales Manager' },
    { value: 'HEAD_OF_SALES', id: 'HEAD_OF_SALES', label: 'Head of Sales & Marketing' },
    { value: 'ACCOUNTS_MANAGER', id: 'ACCOUNTS_MANAGER', label: 'Accounts & Finance Manager' },
    { value: 'CHIEF_OPERATING_OFFICER', id: 'CHIEF_OPERATING_OFFICER', label: 'Chief Operating Officer (COO)' },
    { value: 'MANAGING_DIRECTOR', id: 'MANAGING_DIRECTOR', label: 'Managing Director (MD)' }
  ]);

  statusOptions = signal<{ value: string; id: string; label: string }[]>([
    { value: 'PENDING', id: 'PENDING', label: 'Pending Review' },
    { value: 'APPROVED', id: 'APPROVED', label: 'Approved & Authorized' },
    { value: 'REJECTED', id: 'REJECTED', label: 'Rejected' },
    { value: 'CORRECTION_REQUESTED', id: 'CORRECTION_REQUESTED', label: 'Correction Requested' }
  ]);

  // Filtered requests computed
  filteredRequests = computed(() => {
    let list = this.requests();
    const docType = this.filterDocType();
    const st = this.filterStatus();
    const q = this.searchQuery().toLowerCase().trim();

    if (docType) {
      list = list.filter(r => r.document_type === docType);
    }
    if (st) {
      list = list.filter(r => r.status === st);
    }
    if (q) {
      list = list.filter(r =>
        r.request_number.toLowerCase().includes(q) ||
        r.document_reference_no.toLowerCase().includes(q) ||
        r.maker_user_name.toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Flat audit trail computed across all loaded requests
  allAuditLogs = computed(() => {
    const logs: (ApprovalAuditLog & { request_ref?: string; doc_type?: string })[] = [];
    for (const req of this.requests()) {
      if (req.audit_logs) {
        for (const l of req.audit_logs) {
          logs.push({
            ...l,
            request_ref: req.document_reference_no,
            doc_type: req.document_type
          });
        }
      }
    }
    // Sort descending by timestamp
    return logs.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
  });

  constructor() {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadMasterData();
    this.loadCurrentTabData();
  }

  initForms(): void {
    this.actionForm = this.fb.group({
      action: ['APPROVE', Validators.required],
      comments: ['', Validators.required],
      approver_name: ['Authorized Executive', Validators.required]
    });

    this.newRequestForm = this.fb.group({
      document_type: ['DISCOUNT_APPROVAL', Validators.required],
      document_reference_no: ['', Validators.required],
      document_id: ['1', Validators.required],
      project_id: [null],
      maker_user_name: ['Current User', Validators.required],
      financial_amount: [0, [Validators.required, Validators.min(0)]],
      maker_notes: ['']
    });

    this.newPolicyForm = this.fb.group({
      policy_code: ['', Validators.required],
      policy_name: ['', Validators.required],
      document_type: ['DISCOUNT_APPROVAL', Validators.required],
      project_id: [null],
      description: [''],
      is_active: [true],
      rules: this.fb.array([])
    });

    // Add default initial rule
    this.addPolicyRule();
  }

  get policyRulesArray(): FormArray {
    return this.newPolicyForm.get('rules') as FormArray;
  }

  addPolicyRule(): void {
    const tierNum = this.policyRulesArray.length + 1;
    this.policyRulesArray.push(
      this.fb.group({
        tier_level: [tierNum, Validators.required],
        tier_name: [`Tier ${tierNum} Authorization`, Validators.required],
        min_threshold: [0, Validators.required],
        max_threshold: [null],
        required_role: ['SALES_MANAGER', Validators.required],
        is_mandatory: [true],
        sla_hours: [24, Validators.required],
        auto_escalate: [false]
      })
    );
  }

  removePolicyRule(index: number): void {
    this.policyRulesArray.removeAt(index);
  }

  loadMasterData(): void {
    // Load Projects
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs)
    });

    // Load Metrics
    this.governanceService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });

    // Load Dynamic Lookups if available
    this.lookupService.getItems('APPROVAL_DOC_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length > 0) {
          this.docTypeOptions.set(items.map(i => ({ value: i.item_code, id: i.item_code, label: i.item_name_en })));
        }
      }
    });

    this.lookupService.getItems('GOVERNANCE_ROLE').subscribe({
      next: (items: any[]) => {
        if (items && items.length > 0) {
          this.roleOptions.set(items.map(i => ({ value: i.item_code, id: i.item_code, label: i.item_name_en })));
        }
      }
    });
  }

  setTab(tab: GovernanceTab): void {
    this.activeTab.set(tab);
    this.loadCurrentTabData();
  }

  loadCurrentTabData(): void {
    const tab = this.activeTab();
    if (tab === 'inbox' || tab === 'audit_trail') {
      this.governanceService.getRequests().subscribe({
        next: (reqs) => {
          this.requests.set(reqs);
          // Auto load details for audit log aggregation
          reqs.slice(0, 10).forEach(r => {
            this.governanceService.getRequestDetail(r.id).subscribe({
              next: (detail) => {
                const current = this.requests().map(item => item.id === detail.id ? detail : item);
                this.requests.set(current);
              }
            });
          });
        }
      });
    } else if (tab === 'policies') {
      this.governanceService.getPolicies().subscribe({
        next: (pols) => this.policies.set(pols)
      });
    } else if (tab === 'notifications') {
      this.governanceService.getNotifications().subscribe({
        next: (notifs) => this.notifications.set(notifs)
      });
    }

    this.governanceService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m)
    });
  }

  viewRequestDetail(req: ApprovalRequest): void {
    this.governanceService.getRequestDetail(req.id).subscribe({
      next: (detail) => {
        this.selectedRequest.set(detail);
        this.isDetailModalOpen.set(true);
      }
    });
  }

  openActionModal(req: ApprovalRequest, step?: ApprovalStep): void {
    this.selectedRequest.set(req);
    // Find active step or specified step
    const targetStep = step || req.steps?.find(s => s.status === 'PENDING') || null;
    this.activeStepForAction.set(targetStep);
    this.actionForm.reset({
      action: 'APPROVE',
      comments: '',
      approver_name: 'Authorized Executive'
    });
    this.isActionModalOpen.set(true);
  }

  submitAction(): void {
    const req = this.selectedRequest();
    const step = this.activeStepForAction();
    if (!req || !step || this.actionForm.invalid) return;

    const payload = this.actionForm.value;
    this.governanceService.processStepAction(req.id, step.id, payload).subscribe({
      next: (updatedDetail) => {
        this.selectedRequest.set(updatedDetail);
        this.isActionModalOpen.set(false);
        this.loadCurrentTabData();
      },
      error: (err) => {
        alert(err.error?.detail || 'Action processing failed');
      }
    });
  }

  openCreateRequestModal(): void {
    this.newRequestForm.reset({
      document_type: 'DISCOUNT_APPROVAL',
      document_reference_no: '',
      document_id: '1',
      project_id: this.projects()[0]?.id || null,
      maker_user_name: 'Current User',
      financial_amount: 0,
      maker_notes: ''
    });
    this.isCreateRequestModalOpen.set(true);
  }

  submitNewRequest(): void {
    if (this.newRequestForm.invalid) return;
    const payload = this.newRequestForm.value;
    this.governanceService.createRequest(payload).subscribe({
      next: (newReq) => {
        this.isCreateRequestModalOpen.set(false);
        this.loadCurrentTabData();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to submit approval request');
      }
    });
  }

  openCreatePolicyModal(): void {
    this.newPolicyForm.reset({
      policy_code: '',
      policy_name: '',
      document_type: 'DISCOUNT_APPROVAL',
      project_id: null,
      description: '',
      is_active: true
    });
    this.policyRulesArray.clear();
    this.addPolicyRule();
    this.isCreatePolicyModalOpen.set(true);
  }

  submitNewPolicy(): void {
    if (this.newPolicyForm.invalid) return;
    const payload = this.newPolicyForm.value;
    this.governanceService.createPolicy(payload).subscribe({
      next: () => {
        this.isCreatePolicyModalOpen.set(false);
        this.loadCurrentTabData();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create approval policy');
      }
    });
  }

  markNotificationAsRead(id: number): void {
    this.governanceService.markNotificationRead(id).subscribe({
      next: () => {
        const notifs = this.notifications().map(n => n.id === id ? { ...n, status: 'READ' as const } : n);
        this.notifications.set(notifs);
      }
    });
  }
}
