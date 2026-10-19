import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoanFinancingService } from '../../../../core/services/loan-financing.service';
import { ProjectService } from '../../../../core/services/project.service';
import { LoanCreatePayload } from '../../../../core/models/loan-financing.model';
import { LoansFinancingNavComponent } from '../loans-financing-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoansFinancingNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './loan-form.component.html'
})
export class LoanFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loanService = inject(LoanFinancingService);
  private projectService = inject(ProjectService);

  isEditMode: boolean = false;
  loanId: number | null = null;
  loading: boolean = false;
  submitting: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  projectOptions: SelectOption[] = [];

  interestRateTypes: SelectOption[] = [
    { value: 'FLOATING_SMART_SPREAD', label: 'Floating Rate (Bangladesh Bank SMART Spread)' },
    { value: 'FIXED_RATE', label: 'Fixed Interest Rate' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active Facility' },
    { value: 'MATURED', label: 'Matured' },
    { value: 'CLOSED', label: 'Closed / Liquidated' },
    { value: 'RESTRUCTURED', label: 'Restructured' }
  ];

  formData: LoanCreatePayload = {
    loan_reference_no: '',
    facility_type: 'PROJECT_TERM_LOAN',
    lender_name: '',
    lender_branch: '',
    lender_account_no: '',
    sanction_letter_ref: '',
    sanction_date: new Date().toISOString().substring(0, 10),
    project_id: null,
    project_name: '',
    approved_facility_amount: 10000000,
    tenure_months: 36,
    start_date: new Date().toISOString().substring(0, 10),
    maturity_date: new Date(new Date().setFullYear(new Date().getFullYear() + 3)).toISOString().substring(0, 10),
    repayment_frequency: 'MONTHLY',
    interest_rate_type: 'FLOATING_SMART_SPREAD',
    interest_rate_pct: 11.50,
    smart_spread_pct: 3.50,
    calculation_method: 'REDUCING_BALANCE',
    security_collateral_description: 'First registered mortgage over project land and personal guarantee of directors.',
    mortgage_deed_no: '',
    covenants_conditions: 'Maintain minimum DSCR of 1.35x. Debt to equity ratio not exceeding 65:35.',
    next_repayment_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().substring(0, 10),
    status: 'ACTIVE',
    is_eligible_for_ias23: true,
    notes: ''
  };

  ngOnInit(): void {
    this.loadProjects();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEditMode = true;
      this.loanId = Number(idParam);
      this.loadLoan(this.loanId);
    } else {
      this.generateReference();
    }
  }

  generateReference(): void {
    const year = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    this.formData.loan_reference_no = `FAC-${year}-${rand}`;
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = res?.data || res || [];
        this.projectOptions = [
          { value: '', label: 'General Corporate / No Specific Project' },
          ...list.map((p: any) => ({
            value: p.id,
            label: p.project_name || p.name || `Project #${p.id}`
          }))
        ];
      }
    });
  }

  loadLoan(id: number): void {
    this.loading = true;
    this.loanService.getLoan(id).subscribe({
      next: (loan) => {
        this.formData = {
          loan_reference_no: loan.loan_reference_no,
          facility_type: loan.facility_type,
          lender_name: loan.lender_name,
          lender_branch: loan.lender_branch || '',
          lender_account_no: loan.lender_account_no || '',
          sanction_letter_ref: loan.sanction_letter_ref || '',
          sanction_date: loan.sanction_date,
          project_id: loan.project_id || null,
          project_name: loan.project_name || '',
          approved_facility_amount: loan.approved_facility_amount,
          tenure_months: loan.tenure_months,
          start_date: loan.start_date,
          maturity_date: loan.maturity_date,
          repayment_frequency: loan.repayment_frequency,
          interest_rate_type: loan.interest_rate_type,
          interest_rate_pct: loan.interest_rate_pct,
          smart_spread_pct: loan.smart_spread_pct,
          calculation_method: loan.calculation_method,
          security_collateral_description: loan.security_collateral_description || '',
          mortgage_deed_no: loan.mortgage_deed_no || '',
          covenants_conditions: loan.covenants_conditions || '',
          next_repayment_date: loan.next_repayment_date || '',
          status: loan.status,
          is_eligible_for_ias23: loan.is_eligible_for_ias23,
          notes: loan.notes || ''
        };
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Failed to load loan record';
      }
    });
  }

  onProjectSelect(val: any): void {
    if (val && val !== '') {
      this.formData.project_id = Number(val);
      const match = this.projectOptions.find(p => p.value === this.formData.project_id);
      if (match) {
        this.formData.project_name = match.label;
      }
    } else {
      this.formData.project_id = null;
      this.formData.project_name = '';
    }
  }

  onFacilityTypeSelect(val: any): void {
    if (val) this.formData.facility_type = val;
  }

  onRepaymentFreqSelect(val: any): void {
    if (val) this.formData.repayment_frequency = val;
  }

  onInterestCalcSelect(val: any): void {
    if (val) this.formData.calculation_method = val;
  }

  onInterestRateTypeSelect(val: any): void {
    if (val) this.formData.interest_rate_type = val;
  }

  onStatusSelect(val: any): void {
    if (val) this.formData.status = val;
  }

  onTenureChange(): void {
    if (this.formData.start_date && this.formData.tenure_months > 0) {
      const dt = new Date(this.formData.start_date);
      dt.setMonth(dt.getMonth() + Number(this.formData.tenure_months));
      this.formData.maturity_date = dt.toISOString().substring(0, 10);
    }
  }

  saveLoan(): void {
    if (!this.formData.loan_reference_no || !this.formData.lender_name) {
      this.errorMessage = 'Please provide loan reference number and financial institution name.';
      return;
    }

    this.submitting = true;
    this.errorMessage = null;

    if (this.isEditMode && this.loanId) {
      this.loanService.updateLoan(this.loanId, this.formData).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/accounts/loans-financing']);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = err?.error?.detail || 'Failed to update loan facility';
        }
      });
    } else {
      this.loanService.createLoan(this.formData).subscribe({
        next: () => {
          this.submitting = false;
          this.router.navigate(['/accounts/loans-financing']);
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = err?.error?.detail || 'Failed to create loan facility';
        }
      });
    }
  }
}
