import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomTabsComponent,
  TabItem,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';
import { HrmsLeaveService } from '../../../core/services/hrms-leave.service';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  LeaveType,
  LeaveTypeCreate,
  LeavePolicy,
  LeavePolicyCreate,
  LeaveBalance,
  LeaveBalanceImport,
  LeaveApplication,
  LeaveApplicationCreate,
  LeaveApprovalAction,
  OvertimeRequest,
  OvertimeRequestCreate,
  OvertimeVerificationAction,
  OvertimeApprovalAction,
  PayrollInput,
  PayrollSyncRequest
} from '../../../core/models/hrms-leave.model';
import { LookupItem } from '../../../core/models/lookup.model';

@Component({
  selector: 'app-leave-overtime',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './leave-overtime.component.html'
})
export class LeaveOvertimeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  leaveService = inject(HrmsLeaveService);
  employeeService = inject(HrmsEmployeeService);
  projectService = inject(ProjectService);
  lookupService = inject(LookupService);

  // --- Active Tab State ---
  activeTab = signal<string>('applications');
  tabs: TabItem[] = [
    { id: 'applications', label: 'Leave Applications & Workflow', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'balances', label: 'Employee Leave Balances', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'overtime', label: 'Overtime & Field Logs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'policies', label: 'Leave Types & Entitlement Policies', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'payroll', label: 'Payroll Integration Ledger', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'settings', label: 'Dynamic Lookups & Codes', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  // --- Feedback Notifications ---
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // --- Dynamic Dropdown Options ---
  employeeOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);
  leaveTypeOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);
  projectOptions = signal<{ value: number; label: string }[]>([]);

  // -------------------------------------------------------------
  // 1. Leave Applications Filter & Paging State
  // -------------------------------------------------------------
  appSearch = signal<string>('');
  appStatusFilter = signal<string>('');
  appEmployeeFilter = signal<number | null>(null);
  appStartDateFilter = signal<string>('');
  appEndDateFilter = signal<string>('');
  appLimit = signal<number>(15);
  appOffset = signal<number>(0);

  // -------------------------------------------------------------
  // 2. Leave Balances Filter & Paging State
  // -------------------------------------------------------------
  balanceYearFilter = signal<number>(new Date().getFullYear());
  balanceEmployeeFilter = signal<number | null>(null);
  balanceTypeFilter = signal<number | null>(null);
  balanceLimit = signal<number>(15);
  balanceOffset = signal<number>(0);

  // -------------------------------------------------------------
  // 3. Overtime Requests Filter & Paging State
  // -------------------------------------------------------------
  otSearch = signal<string>('');
  otStatusFilter = signal<string>('');
  otEmployeeFilter = signal<number | null>(null);
  otDateFilter = signal<string>('');
  otLimit = signal<number>(15);
  otOffset = signal<number>(0);

  // -------------------------------------------------------------
  // 4. Leave Types & Policies State
  // -------------------------------------------------------------
  typeSearch = signal<string>('');
  policyYearFilter = signal<number>(new Date().getFullYear());

  // -------------------------------------------------------------
  // 5. Payroll Sync Filter & Paging State
  // -------------------------------------------------------------
  payrollMonth = signal<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  payrollEmployeeFilter = signal<number | null>(null);
  payrollLimit = signal<number>(15);
  payrollOffset = signal<number>(0);

  // -------------------------------------------------------------
  // 6. Settings Dynamic Lookups State
  // -------------------------------------------------------------
  selectedLookupCategory = signal<string>('HR_LEAVE_STATUS');
  lookupItems = signal<LookupItem[]>([]);
  isLookupModalOpen = signal<boolean>(false);
  lookupForm = signal<{ id?: number; item_code: string; item_name_en: string; item_name_bn: string; sort_order: number; is_active: boolean }>({
    item_code: '',
    item_name_en: '',
    item_name_bn: '',
    sort_order: 1,
    is_active: true
  });

  // -------------------------------------------------------------
  // Dedicated Modal States (Zero forms under tables)
  // -------------------------------------------------------------
  // Apply Leave Modal
  isApplyModalOpen = signal<boolean>(false);
  applyForm = signal<LeaveApplicationCreate>({
    employee_id: 0,
    leave_type_id: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    emergency_contact: '',
    document_url: ''
  });

  // Action / Approval Modal (Manager & HR)
  isActionModalOpen = signal<boolean>(false);
  selectedApplicationForAction = signal<LeaveApplication | null>(null);
  actionPayload = signal<LeaveApprovalAction>({
    action: 'RECOMMEND',
    remarks: ''
  });

  // Import / Adjust Balance Modal
  isBalanceModalOpen = signal<boolean>(false);
  balanceForm = signal<LeaveBalanceImport>({
    employee_id: 0,
    leave_type_id: 0,
    year: new Date().getFullYear(),
    opening_balance: 0,
    carried_forward: 0,
    accrued_days: 0,
    used_days: 0,
    pending_days: 0,
    encashed_days: 0
  });

  // Overtime Request Modal
  isOtModalOpen = signal<boolean>(false);
  otForm = signal<OvertimeRequestCreate>({
    employee_id: 0,
    project_id: undefined,
    ot_date: new Date().toISOString().split('T')[0],
    requested_hours: 2,
    ot_type: 'NORMAL_OT',
    task_description: ''
  });

  // Overtime Verification Modal
  isOtVerifyModalOpen = signal<boolean>(false);
  selectedOtForVerify = signal<OvertimeRequest | null>(null);
  otVerifyForm = signal<OvertimeVerificationAction>({
    verified_hours: 2,
    remarks: '',
    action: 'VERIFY'
  });

  // Overtime Approval Modal
  isOtApproveModalOpen = signal<boolean>(false);
  selectedOtForApprove = signal<OvertimeRequest | null>(null);
  otApproveForm = signal<OvertimeApprovalAction>({
    approved_hours: 2,
    hourly_rate_multiplier: 1.5,
    remarks: '',
    action: 'APPROVE'
  });

  // Leave Type Create/Edit Modal
  isTypeModalOpen = signal<boolean>(false);
  selectedTypeId = signal<number | null>(null);
  typeForm = signal<LeaveTypeCreate>({
    type_code: '',
    type_name: '',
    type_name_bn: '',
    is_paid: true,
    requires_attachment: false,
    color_code: '#10b981',
    description: '',
    is_active: true
  });

  // Leave Policy Create/Edit Modal
  isPolicyModalOpen = signal<boolean>(false);
  selectedPolicyId = signal<number | null>(null);
  policyForm = signal<LeavePolicyCreate>({
    leave_type_id: 0,
    policy_name: '',
    effective_year: new Date().getFullYear(),
    annual_entitlement_days: 14,
    accrual_frequency: 'YEARLY',
    max_carry_forward_days: 0,
    carry_forward_expiry_months: 0,
    allow_encashment: false,
    max_encashment_days: 0,
    min_service_days_required: 0,
    gender_applicability: 'ALL',
    is_active: true
  });

  // Payroll Sync Confirmation Modal
  isPayrollSyncModalOpen = signal<boolean>(false);
  isSyncingPayroll = signal<boolean>(false);

  // Expose String constructor for template
  String = String;

  // -------------------------------------------------------------
  // Computed KPI Summary Values
  // -------------------------------------------------------------
  totalApplicationsCount = computed(() => this.leaveService.totalLeaveApplications());
  pendingManagerCount = computed(() => 
    this.leaveService.leaveApplications().filter(a => a.status === 'PENDING_MANAGER').length
  );
  pendingHrCount = computed(() => 
    this.leaveService.leaveApplications().filter(a => a.status === 'PENDING_HR').length
  );
  approvedCount = computed(() => 
    this.leaveService.leaveApplications().filter(a => a.status === 'APPROVED').length
  );

  totalOtRequestsCount = computed(() => this.leaveService.totalOvertimeRequests());
  submittedOtCount = computed(() => 
    this.leaveService.overtimeRequests().filter(o => o.status === 'SUBMITTED').length
  );
  verifiedOtCount = computed(() => 
    this.leaveService.overtimeRequests().filter(o => o.status === 'VERIFIED').length
  );
  approvedOtCount = computed(() => 
    this.leaveService.overtimeRequests().filter(o => o.status === 'APPROVED' || o.status === 'SYNCED_PAYROLL').length
  );

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'types' || last === 'policies' || last === 'entitlements' || last === 'holidays') {
        this.activeTab.set('policies');
      } else if (last === 'balances' || last === 'encashment' || last === 'calendar' || last === 'history') {
        this.activeTab.set('balances');
      } else if (last === 'overtime') {
        this.activeTab.set('overtime');
      } else if (last === 'applications' || last === 'approvals') {
        this.activeTab.set('applications');
      }
      this.refreshCurrentTab();
    });
    this.loadDropdownData();
    this.refreshCurrentTab();
  }

  // --- Initial Data Loading ---
  loadDropdownData(): void {
    // 1. Employees
    this.employeeService.loadEmployees({ all: true }).subscribe({
      next: (res) => {
        const opts = (res.items || []).map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name || ''} (${e.employee_code})`,
          subLabel: e.department_name || e.designation_title
        }));
        this.employeeOptions.set(opts);
      }
    });

    // 2. Leave Types
    this.leaveService.loadLeaveTypes({ is_active: true }).subscribe({
      next: (res) => {
        const opts = (res.items || []).map(t => ({
          value: t.id,
          label: `${t.type_name} (${t.type_code})`,
          subLabel: t.is_paid ? 'Paid' : 'Unpaid'
        }));
        this.leaveTypeOptions.set(opts);
      }
    });

    // 3. Projects
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const opts = (projects || []).map(p => ({
          value: p.id,
          label: p.project_name || `Project #${p.id}`
        }));
        this.projectOptions.set(opts);
      }
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    this.refreshCurrentTab();
  }

  refreshCurrentTab(): void {
    const tab = this.activeTab();
    if (tab === 'applications') {
      this.loadApplications();
    } else if (tab === 'balances') {
      this.loadBalances();
    } else if (tab === 'overtime') {
      this.loadOvertime();
    } else if (tab === 'policies') {
      this.loadPolicies();
      this.loadTypes();
    } else if (tab === 'payroll') {
      this.loadPayroll();
    } else if (tab === 'settings') {
      this.loadLookupItems();
    }
  }

  // -------------------------------------------------------------
  // Tab 1: Leave Applications
  // -------------------------------------------------------------
  loadApplications(): void {
    this.leaveService.loadLeaveApplications({
      employee_id: this.appEmployeeFilter() || undefined,
      status: this.appStatusFilter() || undefined,
      start_date: this.appStartDateFilter() || undefined,
      end_date: this.appEndDateFilter() || undefined,
      limit: this.appLimit(),
      offset: this.appOffset()
    }).subscribe();
  }

  onAppPageChange(delta: number): void {
    const next = this.appOffset() + delta * this.appLimit();
    if (next >= 0 && next < this.leaveService.totalLeaveApplications()) {
      this.appOffset.set(next);
      this.loadApplications();
    }
  }

  openApplyModal(): void {
    this.applyForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      leave_type_id: this.leaveTypeOptions()[0]?.value || 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      reason: '',
      emergency_contact: '',
      document_url: ''
    });
    this.isApplyModalOpen.set(true);
  }

  submitLeaveApplication(): void {
    const data = this.applyForm();
    const reason = String(data.reason || '').trim();
    if (!data.employee_id || !data.leave_type_id || !data.start_date || !data.end_date) {
      this.showError('Please select employee, leave type, and valid start/end dates.');
      return;
    }
    if (!reason) {
      this.showError('Enter a brief reason for this leave request.');
      return;
    }
    if (data.end_date < data.start_date) {
      this.showError('End date must be on or after the start date.');
      return;
    }
    if (data.start_date.slice(0, 4) !== data.end_date.slice(0, 4)) {
      this.showError('Leave applications must be within a single leave year.');
      return;
    }
    this.leaveService.createLeaveApplication({ ...data, reason }).subscribe({
      next: () => {
        this.showSuccess('Leave application submitted successfully for review.');
        this.isApplyModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to submit leave application.')
    });
  }

  openActionModal(app: LeaveApplication, defaultAction: 'RECOMMEND' | 'APPROVE' | 'REJECT'): void {
    this.selectedApplicationForAction.set(app);
    this.actionPayload.set({
      action: defaultAction,
      remarks: ''
    });
    this.isActionModalOpen.set(true);
  }

  executeApplicationAction(): void {
    const app = this.selectedApplicationForAction();
    if (!app) return;
    this.leaveService.actionLeaveApplication(app.id, this.actionPayload()).subscribe({
      next: () => {
        this.showSuccess(`Leave application status updated to ${this.actionPayload().action}.`);
        this.isActionModalOpen.set(false);
        this.selectedApplicationForAction.set(null);
      },
      error: (err) => this.showError(err.error?.detail || 'Action failed.')
    });
  }

  cancelApplication(app: LeaveApplication): void {
    if (!confirm(`Are you sure you want to cancel leave application #${app.id}?`)) return;
    this.leaveService.actionLeaveApplication(app.id, { action: 'CANCEL', remarks: 'Cancelled by applicant/admin' }).subscribe({
      next: () => this.showSuccess('Application cancelled successfully.'),
      error: (err) => this.showError(err.error?.detail || 'Failed to cancel application.')
    });
  }

  // -------------------------------------------------------------
  // Tab 2: Leave Balances
  // -------------------------------------------------------------
  loadBalances(): void {
    this.leaveService.loadLeaveBalances({
      employee_id: this.balanceEmployeeFilter() || undefined,
      leave_type_id: this.balanceTypeFilter() || undefined,
      year: this.balanceYearFilter(),
      limit: this.balanceLimit(),
      offset: this.balanceOffset()
    }).subscribe();
  }

  onBalancePageChange(delta: number): void {
    const next = this.balanceOffset() + delta * this.balanceLimit();
    if (next >= 0 && next < this.leaveService.totalLeaveBalances()) {
      this.balanceOffset.set(next);
      this.loadBalances();
    }
  }

  openBalanceModal(): void {
    this.balanceForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      leave_type_id: this.leaveTypeOptions()[0]?.value || 0,
      year: this.balanceYearFilter(),
      opening_balance: 14,
      carried_forward: 0,
      accrued_days: 0,
      used_days: 0,
      pending_days: 0,
      encashed_days: 0
    });
    this.isBalanceModalOpen.set(true);
  }

  submitBalanceImport(): void {
    const data = this.balanceForm();
    if (!data.employee_id || !data.leave_type_id) {
      this.showError('Employee and Leave Type are required.');
      return;
    }
    this.leaveService.importLeaveBalance(data).subscribe({
      next: () => {
        this.showSuccess('Leave balance record saved and recalculated.');
        this.isBalanceModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save balance.')
    });
  }

  // -------------------------------------------------------------
  // Tab 3: Overtime Requests
  // -------------------------------------------------------------
  loadOvertime(): void {
    this.leaveService.loadOvertimeRequests({
      employee_id: this.otEmployeeFilter() || undefined,
      status: this.otStatusFilter() || undefined,
      ot_date: this.otDateFilter() || undefined,
      limit: this.otLimit(),
      offset: this.otOffset()
    }).subscribe();
  }

  onOtPageChange(delta: number): void {
    const next = this.otOffset() + delta * this.otLimit();
    if (next >= 0 && next < this.leaveService.totalOvertimeRequests()) {
      this.otOffset.set(next);
      this.loadOvertime();
    }
  }

  openOtModal(): void {
    this.otForm.set({
      employee_id: this.employeeOptions()[0]?.value || 0,
      project_id: this.projectOptions()[0]?.value || undefined,
      ot_date: new Date().toISOString().split('T')[0],
      requested_hours: 2,
      ot_type: 'NORMAL_OT',
      task_description: ''
    });
    this.isOtModalOpen.set(true);
  }

  submitOtRequest(): void {
    const data = this.otForm();
    if (!data.employee_id || !data.ot_date || data.requested_hours <= 0) {
      this.showError('Employee, date, and valid positive hours are required.');
      return;
    }
    this.leaveService.createOvertimeRequest(data).subscribe({
      next: () => {
        this.showSuccess('Overtime request submitted for supervisor verification.');
        this.isOtModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to submit overtime request.')
    });
  }

  openOtVerifyModal(ot: OvertimeRequest): void {
    this.selectedOtForVerify.set(ot);
    this.otVerifyForm.set({
      verified_hours: ot.requested_hours,
      remarks: '',
      action: 'VERIFY'
    });
    this.isOtVerifyModalOpen.set(true);
  }

  submitOtVerification(): void {
    const ot = this.selectedOtForVerify();
    if (!ot) return;
    this.leaveService.verifyOvertimeRequest(ot.id, this.otVerifyForm()).subscribe({
      next: () => {
        this.showSuccess(`Overtime request #${ot.id} verified.`);
        this.isOtVerifyModalOpen.set(false);
        this.selectedOtForVerify.set(null);
      },
      error: (err) => this.showError(err.error?.detail || 'Verification failed.')
    });
  }

  openOtApproveModal(ot: OvertimeRequest): void {
    this.selectedOtForApprove.set(ot);
    this.otApproveForm.set({
      approved_hours: ot.verified_hours || ot.requested_hours,
      hourly_rate_multiplier: ot.ot_type === 'WEEKEND_OT' || ot.ot_type === 'HOLIDAY_OT' ? 2.0 : 1.5,
      remarks: '',
      action: 'APPROVE'
    });
    this.isOtApproveModalOpen.set(true);
  }

  submitOtApproval(): void {
    const ot = this.selectedOtForApprove();
    if (!ot) return;
    this.leaveService.approveOvertimeRequest(ot.id, this.otApproveForm()).subscribe({
      next: () => {
        this.showSuccess(`Overtime request #${ot.id} approved and ready for payroll sync.`);
        this.isOtApproveModalOpen.set(false);
        this.selectedOtForApprove.set(null);
      },
      error: (err) => this.showError(err.error?.detail || 'Approval failed.')
    });
  }

  // -------------------------------------------------------------
  // Tab 4: Leave Types & Policies
  // -------------------------------------------------------------
  loadTypes(): void {
    this.leaveService.loadLeaveTypes().subscribe();
  }

  loadPolicies(): void {
    this.leaveService.loadLeavePolicies({ effective_year: this.policyYearFilter() }).subscribe();
  }

  openTypeModal(type?: LeaveType): void {
    if (type) {
      this.selectedTypeId.set(type.id);
      this.typeForm.set({
        type_code: type.type_code,
        type_name: type.type_name,
        type_name_bn: type.type_name_bn || '',
        is_paid: type.is_paid,
        requires_attachment: type.requires_attachment,
        color_code: type.color_code || '#10b981',
        description: type.description || '',
        is_active: type.is_active
      });
    } else {
      this.selectedTypeId.set(null);
      this.typeForm.set({
        type_code: '',
        type_name: '',
        type_name_bn: '',
        is_paid: true,
        requires_attachment: false,
        color_code: '#10b981',
        description: '',
        is_active: true
      });
    }
    this.isTypeModalOpen.set(true);
  }

  submitTypeForm(): void {
    const data = this.typeForm();
    if (!data.type_code || !data.type_name) {
      this.showError('Type Code and Name are required.');
      return;
    }
    const editId = this.selectedTypeId();
    const req = editId
      ? this.leaveService.updateLeaveType(editId, data)
      : this.leaveService.createLeaveType(data);

    req.subscribe({
      next: () => {
        this.showSuccess(editId ? 'Leave Type updated.' : 'New Leave Type created.');
        this.isTypeModalOpen.set(false);
        this.loadDropdownData();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save leave type.')
    });
  }

  deleteType(id: number): void {
    if (!confirm('Are you sure you want to deactivate this leave type?')) return;
    this.leaveService.deleteLeaveType(id).subscribe({
      next: () => {
        this.showSuccess('Leave type deactivated.');
        this.loadDropdownData();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to deactivate.')
    });
  }

  openPolicyModal(policy?: LeavePolicy): void {
    if (policy) {
      this.selectedPolicyId.set(policy.id);
      this.policyForm.set({
        leave_type_id: policy.leave_type_id,
        policy_name: policy.policy_name,
        effective_year: policy.effective_year,
        annual_entitlement_days: policy.annual_entitlement_days,
        accrual_frequency: policy.accrual_frequency,
        max_carry_forward_days: policy.max_carry_forward_days,
        carry_forward_expiry_months: policy.carry_forward_expiry_months,
        allow_encashment: policy.allow_encashment,
        max_encashment_days: policy.max_encashment_days,
        min_service_days_required: policy.min_service_days_required,
        gender_applicability: policy.gender_applicability,
        is_active: policy.is_active
      });
    } else {
      this.selectedPolicyId.set(null);
      this.policyForm.set({
        leave_type_id: this.leaveTypeOptions()[0]?.value || 0,
        policy_name: '',
        effective_year: this.policyYearFilter(),
        annual_entitlement_days: 14,
        accrual_frequency: 'YEARLY',
        max_carry_forward_days: 0,
        carry_forward_expiry_months: 0,
        allow_encashment: false,
        max_encashment_days: 0,
        min_service_days_required: 0,
        gender_applicability: 'ALL',
        is_active: true
      });
    }
    this.isPolicyModalOpen.set(true);
  }

  submitPolicyForm(): void {
    const data = this.policyForm();
    if (!data.leave_type_id || !data.policy_name || data.annual_entitlement_days < 0) {
      this.showError('Leave Type, Policy Name, and valid entitlement days are required.');
      return;
    }
    const editId = this.selectedPolicyId();
    const req = editId
      ? this.leaveService.updateLeavePolicy(editId, data)
      : this.leaveService.createLeavePolicy(data);

    req.subscribe({
      next: () => {
        this.showSuccess(editId ? 'Leave Policy updated.' : 'New Leave Policy created.');
        this.isPolicyModalOpen.set(false);
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save leave policy.')
    });
  }

  deletePolicy(id: number): void {
    if (!confirm('Are you sure you want to deactivate this policy?')) return;
    this.leaveService.deleteLeavePolicy(id).subscribe({
      next: () => this.showSuccess('Policy deactivated.'),
      error: (err) => this.showError(err.error?.detail || 'Failed to delete policy.')
    });
  }

  // -------------------------------------------------------------
  // Tab 5: Payroll Integration
  // -------------------------------------------------------------
  loadPayroll(): void {
    this.leaveService.loadPayrollInputs({
      salary_month: this.payrollMonth(),
      employee_id: this.payrollEmployeeFilter() || undefined,
      limit: this.payrollLimit(),
      offset: this.payrollOffset()
    }).subscribe();
  }

  onPayrollPageChange(delta: number): void {
    const next = this.payrollOffset() + delta * this.payrollLimit();
    if (next >= 0 && next < this.leaveService.totalPayrollInputs()) {
      this.payrollOffset.set(next);
      this.loadPayroll();
    }
  }

  openPayrollSyncModal(): void {
    this.isPayrollSyncModalOpen.set(true);
  }

  executePayrollSync(): void {
    this.isSyncingPayroll.set(true);
    this.leaveService.syncPayrollInputs({ salary_month: this.payrollMonth() }).subscribe({
      next: (res) => {
        this.isSyncingPayroll.set(false);
        this.isPayrollSyncModalOpen.set(false);
        this.showSuccess(`Sync Complete: ${res.employees_synced} employees synced. ${res.total_ot_hours} OT hrs (BDT ${res.total_ot_amount}), ${res.total_unpaid_leave_days} unpaid leave days.`);
      },
      error: (err) => {
        this.isSyncingPayroll.set(false);
        this.showError(err.error?.detail || 'Payroll sync failed.');
      }
    });
  }

  // -------------------------------------------------------------
  // Tab 6: Settings Dynamic Lookups
  // -------------------------------------------------------------
  onLookupCategoryChange(categoryCode: string): void {
    this.selectedLookupCategory.set(categoryCode);
    this.loadLookupItems();
  }

  loadLookupItems(): void {
    this.lookupService.getItems(this.selectedLookupCategory(), true).subscribe({
      next: (items) => this.lookupItems.set(items)
    });
  }

  openLookupItemModal(item?: LookupItem): void {
    if (item) {
      this.lookupForm.set({
        id: item.id,
        item_code: item.item_code,
        item_name_en: item.item_name_en,
        item_name_bn: item.item_name_bn || '',
        sort_order: item.sort_order,
        is_active: item.is_active
      });
    } else {
      this.lookupForm.set({
        item_code: '',
        item_name_en: '',
        item_name_bn: '',
        sort_order: (this.lookupItems().length + 1) * 10,
        is_active: true
      });
    }
    this.isLookupModalOpen.set(true);
  }

  submitLookupForm(): void {
    const data = this.lookupForm();
    if (!data.item_code || !data.item_name_en) {
      this.showError('Item code and English name are required.');
      return;
    }
    this.lookupService.quickCreate(this.selectedLookupCategory(), {
      item_code: data.item_code,
      item_name_en: data.item_name_en,
      item_name_bn: data.item_name_bn || undefined
    }).subscribe({
      next: () => {
        this.showSuccess('Lookup item added dynamically.');
        this.isLookupModalOpen.set(false);
        this.loadLookupItems();
      },
      error: (err) => this.showError(err.error?.detail || 'Failed to save lookup item.')
    });
  }

  // Helper form updates (avoids arrow functions in HTML templates per Angular guidelines)
  updateApplyField<K extends keyof LeaveApplicationCreate>(field: K, value: LeaveApplicationCreate[K]): void {
    this.applyForm.update(f => ({ ...f, [field]: value }));
  }

  updateActionRemarks(remarks: string): void {
    this.actionPayload.update(p => ({ ...p, remarks }));
  }

  updateActionType(action: 'RECOMMEND' | 'APPROVE' | 'REJECT' | 'CANCEL'): void {
    this.actionPayload.update(p => ({ ...p, action }));
  }

  updateBalanceField<K extends keyof LeaveBalanceImport>(field: K, value: LeaveBalanceImport[K]): void {
    this.balanceForm.update(f => ({ ...f, [field]: value }));
  }

  updateOtField<K extends keyof OvertimeRequestCreate>(field: K, value: OvertimeRequestCreate[K]): void {
    this.otForm.update(f => ({ ...f, [field]: value }));
  }

  updateOtVerifyHours(hours: string | number): void {
    this.otVerifyForm.update(f => ({ ...f, verified_hours: Number(hours) }));
  }

  updateOtVerifyRemarks(remarks: string): void {
    this.otVerifyForm.update(f => ({ ...f, remarks }));
  }

  updateOtVerifyAction(action: 'VERIFY' | 'REJECT'): void {
    this.otVerifyForm.update(f => ({ ...f, action }));
  }

  updateOtApproveHours(hours: string | number): void {
    this.otApproveForm.update(f => ({ ...f, approved_hours: Number(hours) }));
  }

  updateOtApproveMultiplier(mult: string | number): void {
    this.otApproveForm.update(f => ({ ...f, hourly_rate_multiplier: Number(mult) }));
  }

  updateOtApproveRemarks(remarks: string): void {
    this.otApproveForm.update(f => ({ ...f, remarks }));
  }

  updateOtApproveAction(action: 'APPROVE' | 'REJECT'): void {
    this.otApproveForm.update(f => ({ ...f, action }));
  }

  updateTypeField<K extends keyof LeaveTypeCreate>(field: K, value: LeaveTypeCreate[K]): void {
    this.typeForm.update(f => ({ ...f, [field]: value }));
  }

  updatePolicyField<K extends keyof LeavePolicyCreate>(field: K, value: LeavePolicyCreate[K]): void {
    this.policyForm.update(f => ({ ...f, [field]: value }));
  }

  updateLookupField<K extends keyof typeof this.lookupForm extends () => infer R ? keyof R : never>(field: any, value: any): void {
    this.lookupForm.update(f => ({ ...f, [field]: value }));
  }

  // --- Toast Feedback Helpers ---
  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    this.errorMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showError(msg: string): void {
    this.errorMessage.set(msg);
    this.successMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 7000);
  }
}
