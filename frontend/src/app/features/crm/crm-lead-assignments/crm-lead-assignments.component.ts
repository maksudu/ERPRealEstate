import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent,
  CustomTabsComponent,
  TabItem
} from '../../../shared/components';
import { CrmService, AssignmentFilters, RuleFilters } from '../../../core/services/crm.service';
import { LeadAssignment, LeadAssignmentRule } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-lead-assignments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent,
    CustomTabsComponent
  ],
  templateUrl: './crm-lead-assignments.component.html'
})
export class CrmLeadAssignmentsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);

  activeTab = signal<'QUEUE' | 'RULES'>('QUEUE');

  // Queue state
  assignments = this.crmService.assignments;
  assignmentsTotal = this.crmService.assignmentsTotal;
  assignmentsLimit = this.crmService.assignmentsLimit;
  assignmentsOffset = this.crmService.assignmentsOffset;
  isLoadingAssignments = this.crmService.isLoadingAssignments;
  stats = signal<{ total_leads: number; unassigned_leads: number; overdue_first_response: number; assigned_today: number; reassigned_total: number; escalated_total: number } | null>(null);

  // Rules state
  rules = signal<LeadAssignmentRule[]>([]);
  rulesTotal = signal(0);
  rulesLimit = signal(20);
  rulesOffset = signal(0);
  isLoadingRules = signal(false);

  salesReps = signal<{ id: number; full_name_en: string }[]>([]);
  selectedIds = signal<Set<number>>(new Set());

  // Bulk / single assign modal
  isAssignModalOpen = signal(false);
  isSubmitting = signal(false);
  assignMode = signal<'SINGLE' | 'BULK'>('BULK');
  assignLeadId = signal<number | null>(null);
  assignLeadLabel = signal('');
  assignForm: FormGroup = this.fb.group({
    assigned_to_id: [null],
    assignment_method: ['MANUAL'],
    assignment_reason: [''],
    response_sla_hours: [24]
  });

  // Escalate modal
  isEscalateModalOpen = signal(false);
  escalateAssignmentId = signal<number | null>(null);
  escalateReason = signal('');

  readonly LOOKUP = {
    method: 'CRM_ASSIGNMENT_METHOD',
    priority: 'CRM_LEAD_PRIORITY'
  };

  readonly statusOptions = [
    { value: 'ALL', label: 'All Assignments' },
    { value: 'ACTIVE', label: 'Active Only' },
    { value: 'INACTIVE', label: 'Released Only' }
  ];

  readonly escalatedOptions = [
    { value: 'ALL', label: 'Any Escalation Status' },
    { value: 'true', label: 'Escalated Only' },
    { value: 'false', label: 'Not Escalated' }
  ];

  readonly ruleStatusOptions = [
    { value: 'ALL', label: 'All Rules' },
    { value: 'true', label: 'Active Rules' },
    { value: 'false', label: 'Inactive Rules' }
  ];

  queueFilterForm: FormGroup = this.fb.group({
    search: [''],
    assigned_to_id: [null],
    status: ['ALL'],
    assignment_method: [null],
    escalated: ['ALL']
  });

  ruleFilterForm: FormGroup = this.fb.group({
    search: [''],
    is_active: ['ALL'],
    method: [null]
  });

  tabs: TabItem[] = [
    { id: 'QUEUE', label: 'Assignment Queue' },
    { id: 'RULES', label: 'Distribution Rules' }
  ];

  salesRepOptions = computed(() =>
    this.salesReps().map(r => ({ value: String(r.id), label: r.full_name_en }))
  );

  queuePage = computed(() => Math.floor(this.assignmentsOffset() / this.assignmentsLimit()) + 1);
  queueTotalPages = computed(() => Math.max(1, Math.ceil(this.assignmentsTotal() / this.assignmentsLimit())));
  queueFromRow = computed(() => (this.assignmentsTotal() === 0 ? 0 : this.assignmentsOffset() + 1));
  queueToRow = computed(() => Math.min(this.assignmentsOffset() + this.assignmentsLimit(), this.assignmentsTotal()));
  allSelected = computed(() => {
    const rows = this.assignments();
    return rows.length > 0 && rows.every(a => this.selectedIds().has(a.id));
  });

  rulesPage = computed(() => Math.floor(this.rulesOffset() / this.rulesLimit()) + 1);
  rulesTotalPages = computed(() => Math.max(1, Math.ceil(this.rulesTotal() / this.rulesLimit())));
  rulesFromRow = computed(() => (this.rulesTotal() === 0 ? 0 : this.rulesOffset() + 1));
  rulesToRow = computed(() => Math.min(this.rulesOffset() + this.rulesLimit(), this.rulesTotal()));

  ngOnInit(): void {
    this.loadSalesReps();
    this.loadStats();
    this.loadQueue();

    this.queueFilterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.assignmentsOffset.set(0);
      this.selectedIds.set(new Set());
      this.loadQueue();
    });

    this.ruleFilterForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    ).subscribe(() => {
      this.rulesOffset.set(0);
      this.loadRules();
    });
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe(reps => this.salesReps.set(reps));
  }

  loadStats(): void {
    this.crmService.getAssignmentQueueStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null)
    });
  }

  // ---------------- Queue ----------------
  buildQueueFilters(): AssignmentFilters {
    const v = this.queueFilterForm.value;
    const status = v.status || 'ALL';
    const escalated = v.escalated || 'ALL';
    return {
      search: (v.search || '').trim() || undefined,
      assigned_to_id: v.assigned_to_id ? +v.assigned_to_id : undefined,
      is_active: status === 'ACTIVE' ? true : status === 'INACTIVE' ? false : undefined,
      assignment_method: v.assignment_method || undefined,
      is_escalated: escalated === 'true' ? true : escalated === 'false' ? false : undefined,
      limit: this.assignmentsLimit(),
      offset: this.assignmentsOffset()
    };
  }

  loadQueue(): void {
    this.crmService.loadAssignments(this.buildQueueFilters()).subscribe();
  }

  resetQueueFilters(): void {
    this.queueFilterForm.reset({
      search: '',
      assigned_to_id: null,
      status: 'ALL',
      assignment_method: null,
      escalated: 'ALL'
    });
    this.assignmentsOffset.set(0);
    this.loadQueue();
  }

  refresh(): void {
    if (this.activeTab() === 'RULES') {
      this.loadRules();
    } else {
      this.loadQueue();
      this.loadStats();
    }
  }

  queueNext(): void {
    if (this.assignmentsOffset() + this.assignmentsLimit() < this.assignmentsTotal()) {
      this.assignmentsOffset.update(v => v + this.assignmentsLimit());
      this.loadQueue();
    }
  }

  queuePrev(): void {
    if (this.assignmentsOffset() >= this.assignmentsLimit()) {
      this.assignmentsOffset.update(v => v - this.assignmentsLimit());
      this.loadQueue();
    }
  }

  onQueuePageSize(event: Event): void {
    this.assignmentsLimit.set(+(event.target as HTMLSelectElement).value);
    this.assignmentsOffset.set(0);
    this.loadQueue();
  }

  // ---------------- Rules ----------------
  buildRuleFilters(): RuleFilters {
    const v = this.ruleFilterForm.value;
    const active = v.is_active || 'ALL';
    return {
      search: (v.search || '').trim() || undefined,
      is_active: active === 'true' ? true : active === 'false' ? false : undefined,
      method: v.method || undefined,
      limit: this.rulesLimit(),
      offset: this.rulesOffset()
    };
  }

  loadRules(): void {
    this.isLoadingRules.set(true);
    this.crmService.loadAssignmentRules(this.buildRuleFilters()).subscribe({
      next: (res) => {
        this.rules.set(res.items || []);
        this.rulesTotal.set(res.total || 0);
        this.isLoadingRules.set(false);
      },
      error: () => {
        this.isLoadingRules.set(false);
        alert('Failed to load assignment rules.');
      }
    });
  }

  resetRuleFilters(): void {
    this.ruleFilterForm.reset({
      search: '',
      is_active: 'ALL',
      method: null
    });
    this.rulesOffset.set(0);
    this.loadRules();
  }

  rulesNext(): void {
    if (this.rulesOffset() + this.rulesLimit() < this.rulesTotal()) {
      this.rulesOffset.update(v => v + this.rulesLimit());
      this.loadRules();
    }
  }

  rulesPrev(): void {
    if (this.rulesOffset() >= this.rulesLimit()) {
      this.rulesOffset.update(v => v - this.rulesLimit());
      this.loadRules();
    }
  }

  goCreateRule(): void {
    this.router.navigate(['/crm/lead-assignments/rules/new']);
  }

  goEditRule(rule: LeadAssignmentRule): void {
    this.router.navigate(['/crm/lead-assignments/rules', rule.id, 'edit']);
  }

  deleteRule(rule: LeadAssignmentRule): void {
    if (!confirm(`Delete rule "${rule.rule_name}"? This cannot be undone.`)) return;
    this.crmService.deleteAssignmentRule(rule.id).subscribe({
      next: () => this.loadRules(),
      error: (err) => alert(err?.error?.detail || 'Failed to delete rule.')
    });
  }

  // ---------------- Tabs ----------------
  onTabChange(tabId: string): void {
    this.activeTab.set(tabId as 'QUEUE' | 'RULES');
    if (tabId === 'RULES') {
      this.loadRules();
    } else {
      this.loadStats();
    }
  }

  // ---------------- Selection ----------------
  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.assignments().map(a => a.id)));
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

  // ---------------- Assign / Bulk Assign ----------------
  openBulkAssignModal(): void {
    if (this.selectedIds().size === 0) {
      alert('Select at least one assignment row to bulk assign.');
      return;
    }
    this.assignMode.set('BULK');
    this.assignLeadId.set(null);
    this.assignLeadLabel.set(`${this.selectedIds().size} selected assignment(s)`);
    this.assignForm.reset({
      assigned_to_id: null,
      assignment_method: 'MANUAL',
      assignment_reason: '',
      response_sla_hours: 24
    });
    this.isAssignModalOpen.set(true);
  }

  openSingleAssignModal(assignment: LeadAssignment): void {
    this.assignMode.set('SINGLE');
    this.assignLeadId.set(assignment.lead_id);
    this.assignLeadLabel.set(`${assignment.lead_code || 'Lead #' + assignment.lead_id} — ${assignment.lead_name || ''}`);
    this.assignForm.reset({
      assigned_to_id: assignment.assigned_to_id,
      assignment_method: 'MANUAL',
      assignment_reason: '',
      response_sla_hours: 24
    });
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
  }

  submitAssign(): void {
    const v = this.assignForm.value;
    if (!v.assignment_method) {
      alert('Select an assignment method.');
      return;
    }
    if (v.assignment_method === 'MANUAL' && !v.assigned_to_id) {
      alert('Select a sales representative for manual assignment.');
      return;
    }

    this.isSubmitting.set(true);
    if (this.assignMode() === 'BULK') {
      const leadIds = this.assignments()
        .filter(a => this.selectedIds().has(a.id))
        .map(a => a.lead_id);
      if (leadIds.length === 0) {
        this.isSubmitting.set(false);
        alert('No leads found on the current page for the selected assignments.');
        return;
      }
      this.crmService.bulkAssign({
        lead_ids: leadIds,
        assignment_method: v.assignment_method,
        assigned_to_id: v.assigned_to_id ? +v.assigned_to_id : null,
        assignment_reason: v.assignment_reason || null,
        response_sla_hours: +v.response_sla_hours || 24
      }).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.closeAssignModal();
          this.selectedIds.set(new Set());
          this.loadQueue();
          this.loadStats();
          alert(res.message || `Assigned ${res.assigned_count} leads.`);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert(err?.error?.detail || 'Bulk assign failed.');
        }
      });
    } else {
      const leadId = this.assignLeadId();
      if (!leadId) {
        this.isSubmitting.set(false);
        return;
      }
      this.crmService.assignLead(leadId, {
        assigned_to_id: +v.assigned_to_id,
        assignment_method: v.assignment_method,
        assignment_reason: v.assignment_reason || undefined,
        response_sla_hours: +v.response_sla_hours || 24
      }).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeAssignModal();
          this.loadQueue();
          this.loadStats();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          alert(err?.error?.detail || 'Assignment failed.');
        }
      });
    }
  }

  // ---------------- Escalate ----------------
  openEscalateModal(assignment: LeadAssignment): void {
    this.escalateAssignmentId.set(assignment.id);
    this.escalateReason.set('');
    this.isEscalateModalOpen.set(true);
  }

  closeEscalateModal(): void {
    this.isEscalateModalOpen.set(false);
  }

  submitEscalate(): void {
    const id = this.escalateAssignmentId();
    const reason = this.escalateReason().trim();
    if (!id) return;
    if (!reason) {
      alert('Enter an escalation reason.');
      return;
    }
    this.isSubmitting.set(true);
    this.crmService.escalateAssignment(id, reason).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeEscalateModal();
        this.loadQueue();
        this.loadStats();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Escalation failed.');
      }
    });
  }

  methodVariant(method: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
      MANUAL: 'info',
      ROUND_ROBIN: 'success',
      PROJECT_WISE: 'warning',
      LOCATION_WISE: 'warning',
      PROPERTY_TYPE: 'warning',
      CAMPAIGN_SPECIFIC: 'info',
      BROKER_REFERRAL: 'neutral',
      WORKLOAD: 'neutral'
    };
    return map[method] || 'neutral';
  }

  trackById(index: number, item: LeadAssignment | LeadAssignmentRule): number {
    return item.id;
  }

  isOverdue(item: LeadAssignment): boolean {
    if (!item.response_sla_deadline) return false;
    return new Date(item.response_sla_deadline).getTime() < Date.now() && item.status === 'ACTIVE';
  }

  getManagerName(managerId?: number | null): string {
    if (!managerId) return '—';
    const rep = this.salesReps().find(r => r.id === managerId);
    return rep ? rep.full_name_en : `Manager #${managerId}`;
  }
}
