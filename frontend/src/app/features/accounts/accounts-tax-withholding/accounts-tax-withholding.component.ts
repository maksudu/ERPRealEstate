import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { TDSDeduction } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-tax-withholding',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './accounts-tax-withholding.component.html'
})
export class AccountsTaxWithholdingComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  deductions = signal<TDSDeduction[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isChallanModalOpen = signal<boolean>(false);
  selectedDeduction = signal<TDSDeduction | null>(null);

  // Filters
  sectionFilter = signal<string>('');
  statusFilter = signal<string>('');
  searchQuery = signal<string>('');

  sectionOptions = [
    { id: 'Sec 52', name: 'Section 52 - Contractor Supply & Civil Works (5.0%)' },
    { id: 'Sec 52C', name: 'Section 52C - Real Estate Commission (10.0%)' },
    { id: 'Sec 53', name: 'Section 53 - House Rent Deduction (5.0%)' },
    { id: 'Sec 53FF', name: 'Section 53FF - Sub-Registry Advance Tax' },
    { id: 'VDS', name: 'VDS - Value Added Tax Deducted at Source (7.5%)' }
  ];

  statusOptions = [
    { id: 'WITHHELD', name: 'Withheld (Pending Deposit)' },
    { id: 'DEPOSITED_TO_TREASURY', name: 'Deposited to Treasury' }
  ];

  createForm: FormGroup = this.fb.group({
    deduction_section: ['Sec 52', Validators.required],
    gross_amount: [250000, [Validators.required, Validators.min(100)]],
    tax_rate_percent: [5.0, [Validators.required, Validators.min(0.1)]],
    challan_number: [''],
    contractor_id: [1],
    vendor_id: [null],
    voucher_id: [null]
  });

  challanForm: FormGroup = this.fb.group({
    challan_number: ['', Validators.required],
    challan_deposit_date: [new Date().toISOString().split('T')[0], Validators.required]
  });

  computedWithheld = computed(() => {
    const gross = Number(this.createForm.get('gross_amount')?.value || 0);
    const rate = Number(this.createForm.get('tax_rate_percent')?.value || 0);
    return Math.round((gross * rate) / 100);
  });

  filteredDeductions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const sec = this.sectionFilter();
    const status = this.statusFilter();

    return this.deductions().filter(d => {
      const matchesQuery = !query ||
        (d.vendor_name && d.vendor_name.toLowerCase().includes(query)) ||
        (d.contractor_name && d.contractor_name.toLowerCase().includes(query)) ||
        (d.challan_number && d.challan_number.toLowerCase().includes(query)) ||
        d.deduction_section.toLowerCase().includes(query);

      const matchesSec = !sec || d.deduction_section === sec;
      const matchesStatus = !status || d.status === status;

      return matchesQuery && matchesSec && matchesStatus;
    });
  });

  totalGross = computed(() => this.filteredDeductions().reduce((acc, cur) => acc + Number(cur.gross_amount), 0));
  totalWithheld = computed(() => this.filteredDeductions().reduce((acc, cur) => acc + Number(cur.withheld_amount), 0));
  totalDeposited = computed(() =>
    this.filteredDeductions()
      .filter(d => d.status === 'DEPOSITED_TO_TREASURY')
      .reduce((acc, cur) => acc + Number(cur.withheld_amount), 0)
  );

  ngOnInit(): void {
    this.loadDeductions();

    this.createForm.get('deduction_section')?.valueChanges.subscribe(sec => {
      if (sec === 'Sec 52') this.createForm.patchValue({ tax_rate_percent: 5.0 });
      else if (sec === 'Sec 52C') this.createForm.patchValue({ tax_rate_percent: 10.0 });
      else if (sec === 'Sec 53') this.createForm.patchValue({ tax_rate_percent: 5.0 });
      else if (sec === 'Sec 53FF') this.createForm.patchValue({ tax_rate_percent: 4.0 });
      else if (sec === 'VDS') this.createForm.patchValue({ tax_rate_percent: 7.5 });
    });
  }

  loadDeductions(): void {
    this.isLoading.set(true);
    this.accountsService.getTDSDeductions().subscribe({
      next: (data) => {
        this.deductions.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      deduction_section: 'Sec 52',
      gross_amount: 350000,
      tax_rate_percent: 5.0,
      challan_number: '',
      contractor_id: 1,
      vendor_id: null,
      voucher_id: null
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitDeduction(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.createForm.value;
    const payload = {
      deduction_section: val.deduction_section,
      gross_amount: Number(val.gross_amount),
      tax_rate_percent: Number(val.tax_rate_percent),
      challan_number: val.challan_number || null,
      contractor_id: val.contractor_id ? Number(val.contractor_id) : null,
      vendor_id: val.vendor_id ? Number(val.vendor_id) : null,
      voucher_id: val.voucher_id ? Number(val.voucher_id) : null
    };

    this.accountsService.createTDSDeduction(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadDeductions();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record TDS deduction');
      }
    });
  }

  openChallanModal(deduction: TDSDeduction): void {
    this.selectedDeduction.set(deduction);
    this.challanForm.reset({
      challan_number: `TR-${Math.floor(100000 + Math.random() * 900000)}`,
      challan_deposit_date: new Date().toISOString().split('T')[0]
    });
    this.isChallanModalOpen.set(true);
  }

  closeChallanModal(): void {
    this.isChallanModalOpen.set(false);
    this.selectedDeduction.set(null);
  }

  submitChallanDeposit(): void {
    if (this.challanForm.invalid || !this.selectedDeduction()) return;
    this.isSubmitting.set(true);

    const id = this.selectedDeduction()!.id;
    this.accountsService.depositTDSToTreasury(id, this.challanForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeChallanModal();
        this.loadDeductions();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record Treasury deposit');
      }
    });
  }
}
