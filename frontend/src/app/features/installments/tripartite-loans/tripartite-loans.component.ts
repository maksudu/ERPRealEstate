import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { TripartiteLoan, LoanTranche, InstallmentMetrics } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-tripartite-loans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './tripartite-loans.component.html'
})
export class TripartiteLoansComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  loans = signal<TripartiteLoan[]>([]);
  bookings = signal<Booking[]>([]);
  metrics = signal<InstallmentMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedBankFilter = signal<string>('ALL');

  // Create Loan Modal
  isCreateModalOpen = signal<boolean>(false);

  // Developer NOC Modal
  selectedLoanForNOC = signal<TripartiteLoan | null>(null);
  isNOCModalOpen = signal<boolean>(false);

  // Bank Civil Inspection Modal
  selectedLoanForInspection = signal<TripartiteLoan | null>(null);
  selectedTrancheForInspection = signal<LoanTranche | null>(null);
  isInspectionModalOpen = signal<boolean>(false);

  // Tranche Disbursement Modal
  selectedLoanForDisburse = signal<TripartiteLoan | null>(null);
  selectedTrancheForDisburse = signal<LoanTranche | null>(null);
  isDisburseModalOpen = signal<boolean>(false);

  // Loan Tranche Ledger View Modal
  selectedLoanDetails = signal<TripartiteLoan | null>(null);
  isDetailsModalOpen = signal<boolean>(false);

  loanForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    financial_institution_code: ['DBH_FINANCE', Validators.required],
    bank_name: ['DBH Finance PLC', Validators.required],
    branch_name: ['Principal Branch, Dhaka', Validators.required],
    sanction_letter_no: ['', Validators.required],
    sanction_date: [new Date().toISOString().split('T')[0], Validators.required],
    sanctioned_amount: [null, [Validators.required, Validators.min(100000)]],
    tripartite_agreement_date: [new Date().toISOString().split('T')[0]],
    bank_officer_name: [''],
    bank_officer_phone: [''],
    bank_officer_email: [''],
    remarks: ['']
  });

  nocForm: FormGroup = this.fb.group({
    developer_noc_ref: ['', Validators.required],
    developer_noc_date: [new Date().toISOString().split('T')[0], Validators.required],
    remarks: ['']
  });

  inspectionForm: FormGroup = this.fb.group({
    bank_inspection_date: [new Date().toISOString().split('T')[0], Validators.required],
    inspection_status: ['INSPECTION_PASSED', Validators.required],
    inspection_engineer_name: ['', Validators.required],
    inspection_notes: ['']
  });

  disburseForm: FormGroup = this.fb.group({
    disbursed_date: [new Date().toISOString().split('T')[0], Validators.required],
    disbursed_amount: [null, [Validators.required, Validators.min(1000)]],
    payment_mode: ['BANK_TRANSFER', Validators.required],
    payment_instrument_no: ['', Validators.required],
    bank_name: [''],
    branch_name: [''],
    remarks: ['']
  });

  bankOptions = [
    { value: 'ALL', label: 'All Financial Institutions' },
    { value: 'DBH_FINANCE', label: 'DBH Finance PLC (Delta Brac Housing)' },
    { value: 'IDLC_FINANCE', label: 'IDLC Finance Limited' },
    { value: 'SCB', label: 'Standard Chartered Bank Bangladesh' },
    { value: 'CITY_BANK', label: 'The City Bank Limited' },
    { value: 'BRAC_BANK', label: 'BRAC Bank PLC' },
    { value: 'MTB', label: 'Mutual Trust Bank Limited' },
    { value: 'IPDC', label: 'IPDC Finance Limited' },
    { value: 'EBL', label: 'Eastern Bank Limited' }
  ];

  bankFormOptions = [
    { value: 'DBH_FINANCE', label: 'DBH Finance PLC (Delta Brac Housing)' },
    { value: 'IDLC_FINANCE', label: 'IDLC Finance Limited' },
    { value: 'SCB', label: 'Standard Chartered Bank Bangladesh' },
    { value: 'CITY_BANK', label: 'The City Bank Limited' },
    { value: 'BRAC_BANK', label: 'BRAC Bank PLC' },
    { value: 'MTB', label: 'Mutual Trust Bank Limited' },
    { value: 'IPDC', label: 'IPDC Finance Limited' },
    { value: 'EBL', label: 'Eastern Bank Limited' }
  ];

  inspectionStatusOptions = [
    { value: 'INSPECTION_PASSED', label: 'Civil Milestone Verified & Passed (অনুমোদিত)' },
    { value: 'INSPECTION_REJECTED', label: 'Rectification Required (সংশোধন প্রয়োজন)' }
  ];

  paymentModeOptions = [
    { value: 'BANK_TRANSFER', label: 'Online Bank Transfer / Pay Order' },
    { value: 'BEFTN', label: 'BEFTN Electronic Transfer' },
    { value: 'RTGS', label: 'Real-Time Gross Settlement (RTGS)' },
    { value: 'CHEQUE', label: 'Bank Cheque' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadBookings();
  }

  loadData(): void {
    this.isLoading.set(true);
    const bank = this.selectedBankFilter() !== 'ALL' ? this.selectedBankFilter() : undefined;
    this.installmentService.getTripartiteLoans({ financial_institution_code: bank }).subscribe({
      next: (res) => {
        this.loans.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.installmentService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe(b => this.bookings.set(b));
  }

  get bookingOptions() {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number} - BDT ${Number(b.final_contract_value).toLocaleString()})`
    }));
  }

  filteredLoans(): TripartiteLoan[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.loans();
    return this.loans().filter(l =>
      l.loan_reference_no.toLowerCase().includes(q) ||
      (l.customer_name && l.customer_name.toLowerCase().includes(q)) ||
      (l.booking_reference_no && l.booking_reference_no.toLowerCase().includes(q)) ||
      (l.bank_name && l.bank_name.toLowerCase().includes(q)) ||
      (l.sanction_letter_no && l.sanction_letter_no.toLowerCase().includes(q))
    );
  }

  // Create Loan
  openCreateModal(): void {
    this.loanForm.reset({
      booking_id: this.bookings()[0]?.id || null,
      financial_institution_code: 'DBH_FINANCE',
      bank_name: 'DBH Finance PLC',
      branch_name: 'Principal Branch, Dhaka',
      sanction_letter_no: `DBH/HL/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      sanction_date: new Date().toISOString().split('T')[0],
      sanctioned_amount: 5000000,
      tripartite_agreement_date: new Date().toISOString().split('T')[0],
      bank_officer_name: '',
      bank_officer_phone: '',
      bank_officer_email: '',
      remarks: ''
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitLoan(): void {
    if (this.loanForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.loanForm.value;
    const totalSanction = Number(val.sanctioned_amount);
    // Standard 3-phase milestone tranche schedule
    const tranches = [
      { tranche_number: 1, milestone_title: 'Plinth & Basement Casting (35%)', sanctioned_tranche_amount: totalSanction * 0.35 },
      { tranche_number: 2, milestone_title: 'Roof Casting 5th Floor (35%)', sanctioned_tranche_amount: totalSanction * 0.35 },
      { tranche_number: 3, milestone_title: 'Finishing & Handover (30%)', sanctioned_tranche_amount: totalSanction * 0.30 }
    ];

    const payload = {
      ...val,
      tranches
    };

    this.installmentService.createTripartiteLoan(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loans.update(list => [created, ...list]);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to create Tripartite Loan');
      }
    });
  }

  // Developer NOC Issuance
  openNOCModal(l: TripartiteLoan): void {
    this.selectedLoanForNOC.set(l);
    this.nocForm.reset({
      developer_noc_ref: `NOC-DEV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      developer_noc_date: new Date().toISOString().split('T')[0],
      remarks: 'Developer endorsement of tripartite charge'
    });
    this.isNOCModalOpen.set(true);
  }

  closeNOCModal(): void {
    this.isNOCModalOpen.set(false);
    this.selectedLoanForNOC.set(null);
  }

  submitNOC(): void {
    const loan = this.selectedLoanForNOC();
    if (!loan || this.nocForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.issueDeveloperNOC(loan.id, this.nocForm.value).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeNOCModal();
        this.loans.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to issue Developer NOC');
      }
    });
  }

  // Bank Civil Inspection
  openInspectionModal(l: TripartiteLoan, t: LoanTranche): void {
    this.selectedLoanForInspection.set(l);
    this.selectedTrancheForInspection.set(t);
    this.inspectionForm.reset({
      bank_inspection_date: new Date().toISOString().split('T')[0],
      inspection_status: 'INSPECTION_PASSED',
      inspection_engineer_name: 'Engr. M. A. Rouf (Bank Emp #482)',
      inspection_notes: 'Civil construction milestone verified on-site. Column casting depth and curing satisfactory.'
    });
    this.isInspectionModalOpen.set(true);
  }

  closeInspectionModal(): void {
    this.isInspectionModalOpen.set(false);
    this.selectedLoanForInspection.set(null);
    this.selectedTrancheForInspection.set(null);
  }

  submitInspection(): void {
    const loan = this.selectedLoanForInspection();
    const tranche = this.selectedTrancheForInspection();
    if (!loan || !tranche || this.inspectionForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.recordTrancheInspection(loan.id, tranche.id, this.inspectionForm.value).subscribe({
      next: (updatedTranche) => {
        this.isSubmitting.set(false);
        this.closeInspectionModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Failed to record inspection');
      }
    });
  }

  // Tranche Disbursement
  openDisburseModal(l: TripartiteLoan, t: LoanTranche): void {
    this.selectedLoanForDisburse.set(l);
    this.selectedTrancheForDisburse.set(t);
    this.disburseForm.reset({
      disbursed_date: new Date().toISOString().split('T')[0],
      disbursed_amount: t.sanctioned_tranche_amount,
      payment_mode: 'BANK_TRANSFER',
      payment_instrument_no: `PO-${l.bank_name.substring(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      bank_name: l.bank_name,
      branch_name: l.branch_name,
      remarks: `Disbursement for Tranche #${t.tranche_number} (${t.milestone_title})`
    });
    this.isDisburseModalOpen.set(true);
  }

  closeDisburseModal(): void {
    this.isDisburseModalOpen.set(false);
    this.selectedLoanForDisburse.set(null);
    this.selectedTrancheForDisburse.set(null);
  }

  submitDisburse(): void {
    const loan = this.selectedLoanForDisburse();
    const tranche = this.selectedTrancheForDisburse();
    if (!loan || !tranche || this.disburseForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.disburseTranche(loan.id, tranche.id, this.disburseForm.value).subscribe({
      next: (updatedTranche) => {
        this.isSubmitting.set(false);
        this.closeDisburseModal();
        alert(`Tranche #${updatedTranche.tranche_number} successfully disbursed! Money Receipt ${updatedTranche.mr_number} auto-generated and reconciled.`);
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || 'Tranche disbursement failed');
      }
    });
  }

  // Loan Details View
  openDetailsModal(l: TripartiteLoan): void {
    this.selectedLoanDetails.set(l);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedLoanDetails.set(null);
  }
}
