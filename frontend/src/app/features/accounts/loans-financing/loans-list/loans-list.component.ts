import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LoanFinancingService } from '../../../../core/services/loan-financing.service';
import { ProjectService } from '../../../../core/services/project.service';
import {
  Loan,
  LoanPortfolioKPIs,
  LoanDisbursementCreatePayload,
  LoanRepaymentCreatePayload,
  LoanInterestAccrualCreatePayload,
  LoanIAS23CapitalizePayload
} from '../../../../core/models/loan-financing.model';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-loans-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    StatusBadgeComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './loans-list.component.html'
})
export class LoansListComponent implements OnInit {
  private loanService = inject(LoanFinancingService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  loans: Loan[] = [];
  kpis: LoanPortfolioKPIs | null = null;
  loading: boolean = false;
  kpiLoading: boolean = false;

  // Filters
  searchQuery: string = '';
  selectedStatus: string = 'ALL';
  selectedFacilityType: string = 'ALL';
  selectedProjectId: number | null = null;

  // Pagination
  page: number = 1;
  limit: number = 10;
  total: number = 0;
  totalPages: number = 1;

  // Dynamic Options
  projectOptions: SelectOption[] = [];
  statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active Facility' },
    { value: 'MATURED', label: 'Matured' },
    { value: 'CLOSED', label: 'Fully Paid / Closed' },
    { value: 'RESTRUCTURED', label: 'Restructured' }
  ];

  // Action Modals State
  selectedLoan: Loan | null = null;
  showDetailModal: boolean = false;
  showDisburseModal: boolean = false;
  showRepayModal: boolean = false;
  showAccrueModal: boolean = false;
  showIAS23Modal: boolean = false;

  // Action Form Payloads
  disburseForm: LoanDisbursementCreatePayload = {
    disbursement_date: new Date().toISOString().substring(0, 10),
    gross_amount: 0,
    processing_fee_deducted: 0,
    company_bank_account_id: 1,
    company_bank_name: 'Sonali Bank PLC (Corporate)',
    notes: ''
  };

  repayForm: LoanRepaymentCreatePayload = {
    payment_date: new Date().toISOString().substring(0, 10),
    total_amount_paid: 0,
    principal_component: 0,
    interest_component: 0,
    fee_or_penalty_component: 0,
    bank_account_id: 1,
    lender_statement_ref: '',
    notes: ''
  };

  accrueForm: LoanInterestAccrualCreatePayload = {
    period_start: new Date().toISOString().substring(0, 10),
    period_end: new Date().toISOString().substring(0, 10),
    calculation_basis_balance: 0,
    applied_rate_pct: 11.5,
    interest_accrued_amount: 0,
    supporting_lender_statement: '',
    notes: ''
  };

  ias23Form: LoanIAS23CapitalizePayload = {
    accrual_id: 0,
    capitalization_date: new Date().toISOString().substring(0, 10),
    cwip_account_id: 1,
    eligible_amount: 0,
    accounting_policy_justification: 'Qualifying commercial construction project under IAS 23 Borrowing Costs.',
    approved_by: 'CFO / Audit Committee',
    notes: ''
  };

  submittingAction: boolean = false;
  feedbackMessage: string | null = null;
  feedbackType: 'success' | 'error' = 'success';

  ngOnInit(): void {
    this.loadKPIs();
    this.loadProjects();
    this.loadLoans();
  }

  loadKPIs(): void {
    this.kpiLoading = true;
    this.loanService.getPortfolioKPIs().subscribe({
      next: (data) => {
        this.kpis = data;
        this.kpiLoading = false;
      },
      error: () => {
        this.kpiLoading = false;
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.projectOptions = [
          { value: 'ALL', label: 'All Projects' },
          ...list.map((p: any) => ({
            value: p.id,
            label: p.project_name || p.name || `Project #${p.id}`
          }))
        ];
      }
    });
  }

  loadLoans(): void {
    this.loading = true;
    const offset = (this.page - 1) * this.limit;
    this.loanService.getLoans({
      search: this.searchQuery,
      status: this.selectedStatus,
      facility_type: this.selectedFacilityType,
      project_id: this.selectedProjectId || undefined,
      limit: this.limit,
      offset: offset
    }).subscribe({
      next: (res) => {
        this.loans = res.items || [];
        this.total = res.total;
        this.totalPages = res.total_pages;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch(): void {
    this.page = 1;
    this.loadLoans();
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadLoans();
  }

  onProjectChange(val: any): void {
    this.selectedProjectId = val === 'ALL' || !val ? null : Number(val);
    this.page = 1;
    this.loadLoans();
  }

  onFacilityTypeChange(val: any): void {
    this.selectedFacilityType = val || 'ALL';
    this.page = 1;
    this.loadLoans();
  }

  onStatusChange(val: any): void {
    this.selectedStatus = val || 'ALL';
    this.page = 1;
    this.loadLoans();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) {
      this.page = p;
      this.loadLoans();
    }
  }

  onLimitChange(newLimit: number): void {
    this.limit = Number(newLimit);
    this.page = 1;
    this.loadLoans();
  }

  editLoan(loan: Loan): void {
    this.router.navigate(['/accounts/loans-financing', loan.id, 'edit']);
  }

  viewDetails(loan: Loan): void {
    this.selectedLoan = loan;
    this.showDetailModal = true;
  }

  openDisburseModal(loan: Loan): void {
    this.selectedLoan = loan;
    const remainingLimit = Math.max(0, loan.approved_facility_amount - loan.total_disbursed_amount);
    this.disburseForm = {
      disbursement_date: new Date().toISOString().substring(0, 10),
      gross_amount: remainingLimit,
      processing_fee_deducted: Math.round(remainingLimit * 0.01),
      company_bank_account_id: 1,
      company_bank_name: 'Sonali Bank PLC (Corporate)',
      notes: `Tranche disbursement under facility ${loan.loan_reference_no}`
    };
    this.showDisburseModal = true;
  }

  submitDisbursement(): void {
    if (!this.selectedLoan) return;
    this.submittingAction = true;
    this.loanService.recordDisbursement(this.selectedLoan.id, this.disburseForm).subscribe({
      next: (res) => {
        this.submittingAction = false;
        this.showDisburseModal = false;
        this.showNotification(`Disbursement tranche ৳${res.gross_amount.toLocaleString()} posted with GL voucher!`, 'success');
        this.loadLoans();
        this.loadKPIs();
      },
      error: (err) => {
        this.submittingAction = false;
        this.showNotification(err?.error?.detail || 'Failed to record disbursement', 'error');
      }
    });
  }

  openRepayModal(loan: Loan): void {
    this.selectedLoan = loan;
    const monthlyPrincipal = loan.tenure_months > 0 ? loan.principal_outstanding / loan.tenure_months : 0;
    const monthlyInterest = (loan.principal_outstanding * (loan.interest_rate_pct / 100)) / 12;
    const totalEmi = Math.round(monthlyPrincipal + monthlyInterest);

    this.repayForm = {
      payment_date: new Date().toISOString().substring(0, 10),
      total_amount_paid: totalEmi,
      principal_component: Math.round(monthlyPrincipal),
      interest_component: Math.round(monthlyInterest),
      fee_or_penalty_component: 0,
      bank_account_id: 1,
      lender_statement_ref: `BANK-STMT-${loan.loan_reference_no}-${new Date().getMonth() + 1}`,
      notes: `Monthly EMI repayment on ${loan.loan_reference_no}`
    };
    this.showRepayModal = true;
  }

  updateRepayTotal(): void {
    this.repayForm.total_amount_paid = 
      Number(this.repayForm.principal_component || 0) + 
      Number(this.repayForm.interest_component || 0) + 
      Number(this.repayForm.fee_or_penalty_component || 0);
  }

  submitRepayment(): void {
    if (!this.selectedLoan) return;
    this.submittingAction = true;
    this.loanService.recordRepayment(this.selectedLoan.id, this.repayForm).subscribe({
      next: (res) => {
        this.submittingAction = false;
        this.showRepayModal = false;
        this.showNotification(`Repayment ৳${res.total_amount_paid.toLocaleString()} recorded with GL voucher!`, 'success');
        this.loadLoans();
        this.loadKPIs();
      },
      error: (err) => {
        this.submittingAction = false;
        this.showNotification(err?.error?.detail || 'Failed to record repayment', 'error');
      }
    });
  }

  openAccrueModal(loan: Loan): void {
    this.selectedLoan = loan;
    const monthlyInterest = Math.round((loan.principal_outstanding * (loan.interest_rate_pct / 100)) / 12);
    this.accrueForm = {
      period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10),
      period_end: new Date().toISOString().substring(0, 10),
      calculation_basis_balance: loan.principal_outstanding,
      applied_rate_pct: loan.interest_rate_pct,
      interest_accrued_amount: monthlyInterest,
      supporting_lender_statement: `INT-STMT-${loan.loan_reference_no}-${new Date().getMonth() + 1}`,
      notes: `Monthly interest accrued per reducing balance method`
    };
    this.showAccrueModal = true;
  }

  submitAccrual(): void {
    if (!this.selectedLoan) return;
    this.submittingAction = true;
    this.loanService.recordInterestAccrual(this.selectedLoan.id, this.accrueForm).subscribe({
      next: (res) => {
        this.submittingAction = false;
        this.showAccrueModal = false;
        this.showNotification(`Interest accrual ৳${res.interest_accrued_amount.toLocaleString()} posted with GL voucher!`, 'success');
        this.loadLoans();
        this.loadKPIs();
      },
      error: (err) => {
        this.submittingAction = false;
        this.showNotification(err?.error?.detail || 'Failed to record accrual', 'error');
      }
    });
  }

  openIAS23Modal(loan: Loan): void {
    this.selectedLoan = loan;
    const pendingAccrual = loan.interest_accruals?.find(a => !a.is_capitalized_to_cwip);
    const amount = pendingAccrual ? pendingAccrual.interest_accrued_amount : 0;

    this.ias23Form = {
      accrual_id: pendingAccrual ? pendingAccrual.id : 0,
      capitalization_date: new Date().toISOString().substring(0, 10),
      cwip_account_id: 1,
      eligible_amount: amount,
      accounting_policy_justification: `Qualifying commercial development asset under IAS 23 Borrowing Costs for project: ${loan.project_name || loan.loan_reference_no}`,
      approved_by: 'CFO / Audit Committee',
      notes: 'Eligible borrowing cost directly attributable to the acquisition and construction of a qualifying asset.'
    };
    this.showIAS23Modal = true;
  }

  submitIAS23(): void {
    if (!this.selectedLoan || !this.ias23Form.accrual_id) {
      this.showNotification('Please select a valid uncapitalized interest accrual', 'error');
      return;
    }
    this.submittingAction = true;
    this.loanService.capitalizeIAS23(this.selectedLoan.id, this.ias23Form).subscribe({
      next: (res) => {
        this.submittingAction = false;
        this.showIAS23Modal = false;
        this.showNotification(res.message || 'Successfully capitalized borrowing cost to CWIP (1220)!', 'success');
        this.loadLoans();
        this.loadKPIs();
      },
      error: (err) => {
        this.submittingAction = false;
        this.showNotification(err?.error?.detail || 'Failed to capitalize borrowing costs', 'error');
      }
    });
  }

  showNotification(msg: string, type: 'success' | 'error'): void {
    this.feedbackMessage = msg;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = null;
    }, 4500);
  }

  getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'success';
      case 'MATURED': return 'warning';
      case 'CLOSED': return 'info';
      case 'RESTRUCTURED': return 'neutral';
      default: return 'neutral';
    }
  }

  formatFacilityType(type: string): string {
    switch (type) {
      case 'PROJECT_TERM_LOAN': return 'Project Term Loan';
      case 'CONSTRUCTION_SYNDICATION': return 'Syndicated Facility';
      case 'OVERDRAFT_SOD': return 'Secured Overdraft (SOD)';
      case 'LEASE_FINANCING': return 'Equipment Lease';
      case 'COMMERCIAL_PAPER_SUKUK': return 'Sukuk / Bond';
      case 'BRIDGE_FINANCING': return 'Bridge Financing';
      default: return type || 'Term Loan';
    }
  }
}
