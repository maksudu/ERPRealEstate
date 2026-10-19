import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { ChartOfAccount, CostCenter } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Vendor } from '../../../core/models/procurement.model';
import { Subcontractor } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-payable-form',
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
  templateUrl: './payable-form.component.html'
})
export class PayableFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private procurementService = inject(ProcurementService);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);
  costCenters = signal<CostCenter[]>([]);
  vendors = signal<Vendor[]>([]);
  contractors = signal<Subcontractor[]>([]);

  // Default dates
  todayStr = new Date().toISOString().split('T')[0];
  defaultDueStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  payableForm: FormGroup = this.fb.group({
    invoice_number: ['', [Validators.required, Validators.minLength(2)]],
    invoice_type: ['Supplier_Material', Validators.required],
    invoice_date: [this.todayStr, Validators.required],
    due_date: [this.defaultDueStr, Validators.required],
    vendor_id: [null],
    contractor_id: [null],
    payee_name: ['', Validators.required],
    project_id: [null],
    cost_center_id: [null],
    expense_account_id: [null],
    liability_account_id: [null],
    po_reference: [''],
    grn_reference: [''],
    ra_bill_reference: [''],
    gross_amount: [0, [Validators.required, Validators.min(0.01)]],
    tax_withholding_tds: [0, [Validators.min(0)]],
    vat_withholding_vds: [0, [Validators.min(0)]],
    retention_amount: [0, [Validators.min(0)]],
    other_deductions: [0, [Validators.min(0)]],
    description: [''],
    auto_approve: [true]
  });

  invoiceTypeOptions = [
    { value: 'Supplier_Material', label: 'Supplier Material Invoice (3-Way Match)' },
    { value: 'Contractor_RA', label: 'Construction Contractor RA Bill' },
    { value: 'Professional_Fee', label: 'Professional & Consultancy Fee' },
    { value: 'Utility_Admin', label: 'Utility, Rent & Office Admin' },
    { value: 'Other', label: 'Other Payables' }
  ];

  vendorOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  costCenterOptions: { value: any; label: string }[] = [];
  expenseAccountOptions: { value: any; label: string }[] = [];
  liabilityAccountOptions: { value: any; label: string }[] = [];

  // Live calculated net payable
  netPayable = computed(() => {
    const gross = parseFloat(this.payableForm.get('gross_amount')?.value) || 0;
    const tds = parseFloat(this.payableForm.get('tax_withholding_tds')?.value) || 0;
    const vds = parseFloat(this.payableForm.get('vat_withholding_vds')?.value) || 0;
    const ret = parseFloat(this.payableForm.get('retention_amount')?.value) || 0;
    const oth = parseFloat(this.payableForm.get('other_deductions')?.value) || 0;
    return Math.max(0, Math.round((gross - (tds + vds + ret + oth)) * 100) / 100);
  });

  ngOnInit(): void {
    this.loadInitialData();

    // Watch payee selection changes
    this.payableForm.get('vendor_id')?.valueChanges.subscribe(vId => {
      if (vId) {
        const v = this.vendors().find(x => x.id === vId);
        if (v) this.payableForm.patchValue({ payee_name: v.vendor_name });
      }
    });

    this.payableForm.get('contractor_id')?.valueChanges.subscribe(cId => {
      if (cId) {
        const c = this.contractors().find(x => x.id === cId);
        if (c) this.payableForm.patchValue({ payee_name: c.company_name });
      }
    });

    // Update net payable on input changes
    this.payableForm.valueChanges.subscribe(() => {
      // triggers computed signal update
    });
  }

  loadInitialData(): void {
    this.isLoading.set(true);

    // 1. Load Chart of Accounts
    this.accountsService.getCOA().subscribe({
      next: (accounts) => {
        this.coaList.set(accounts);
        const leafAccounts = accounts.filter(a => a.is_leaf_account);

        this.expenseAccountOptions = leafAccounts
          .filter(a => ['Expense', 'Cost_of_Sales', 'Asset', 'Project_Expense', 'Operating_Expense'].includes(a.account_type) || a.account_code.startsWith('5') || a.account_code.startsWith('6') || a.account_code.startsWith('1220'))
          .map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }));

        this.liabilityAccountOptions = leafAccounts
          .filter(a => ['Liability'].includes(a.account_type) || a.account_code.startsWith('2'))
          .map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }));

        // Set sensible defaults if available
        const defExp = leafAccounts.find(a => a.account_code === '6100' || a.account_code === '5100');
        const defLiab = leafAccounts.find(a => a.account_code === '2110');
        if (defExp) this.payableForm.patchValue({ expense_account_id: defExp.id });
        if (defLiab) this.payableForm.patchValue({ liability_account_id: defLiab.id });

        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load COA', err);
        this.isLoading.set(false);
      }
    });

    // 2. Load Projects
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'General Corporate / Head Office' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ'})`
          }))
        ];
      },
      error: (err) => console.error('Failed to load projects', err)
    });

    // 3. Load Cost Centers
    this.accountsService.getCostCenters().subscribe({
      next: (ccs) => {
        this.costCenters.set(ccs);
        this.costCenterOptions = [
          { value: null, label: 'No Specific Cost Center' },
          ...ccs.map(c => ({
            value: c.id,
            label: `${c.cost_center_code} - ${c.name}`
          }))
        ];
      },
      error: (err) => console.error('Failed to load cost centers', err)
    });

    // 4. Load Vendors
    this.procurementService.getVendors().subscribe({
      next: (vList) => {
        this.vendors.set(vList);
        this.vendorOptions = vList.map(v => ({
          value: v.id,
          label: `${v.vendor_name} (${v.vendor_code || v.trade_category})`
        }));
      },
      error: (err) => console.error('Failed to load vendors', err)
    });

    // 5. Load Contractors
    this.constructionService.getContractors().subscribe({
      next: (cList) => {
        this.contractors.set(cList);
        this.contractorOptions = cList.map(c => ({
          value: c.id,
          label: `${c.company_name} (${c.contractor_code || c.trade_category})`
        }));
      },
      error: (err) => console.error('Failed to load contractors', err)
    });
  }

  // Quick Calculator Helper: Apply Standard Bangladesh TDS (Sec 52) 5%
  applyStandardTDS(): void {
    const gross = parseFloat(this.payableForm.get('gross_amount')?.value) || 0;
    const tds = Math.round(gross * 0.05 * 100) / 100;
    this.payableForm.patchValue({ tax_withholding_tds: tds });
  }

  // Quick Calculator Helper: Apply Standard Bangladesh VDS 7.5%
  applyStandardVDS(): void {
    const gross = parseFloat(this.payableForm.get('gross_amount')?.value) || 0;
    const vds = Math.round(gross * 0.075 * 100) / 100;
    this.payableForm.patchValue({ vat_withholding_vds: vds });
  }

  // Quick Calculator Helper: Apply Standard Contractor Retention 5.0%
  applyStandardRetention(): void {
    const gross = parseFloat(this.payableForm.get('gross_amount')?.value) || 0;
    const ret = Math.round(gross * 0.05 * 100) / 100;
    this.payableForm.patchValue({ retention_amount: ret });
  }

  onSubmit(): void {
    if (!this.payableForm.valid) {
      this.payableForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all mandatory invoice fields correctly.');
      return;
    }

    const fv = this.payableForm.value;
    const gross = parseFloat(fv.gross_amount) || 0;
    const tds = parseFloat(fv.tax_withholding_tds) || 0;
    const vds = parseFloat(fv.vat_withholding_vds) || 0;
    const ret = parseFloat(fv.retention_amount) || 0;
    const oth = parseFloat(fv.other_deductions) || 0;

    if (gross <= 0) {
      this.errorMessage.set('Gross invoice amount must be greater than zero.');
      return;
    }

    if (tds + vds + ret + oth > gross) {
      this.errorMessage.set('Total withholdings and deductions cannot exceed gross invoice amount.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      invoice_number: fv.invoice_number.trim(),
      invoice_type: fv.invoice_type,
      invoice_date: fv.invoice_date,
      due_date: fv.due_date,
      vendor_id: fv.vendor_id || null,
      contractor_id: fv.contractor_id || null,
      payee_name: fv.payee_name.trim(),
      project_id: fv.project_id || null,
      cost_center_id: fv.cost_center_id || null,
      expense_account_id: fv.expense_account_id || null,
      liability_account_id: fv.liability_account_id || null,
      gross_amount: gross,
      tax_withholding_tds: tds,
      vat_withholding_vds: vds,
      retention_amount: ret,
      other_deductions: oth,
      description: fv.description ? fv.description.trim() : null,
      auto_approve: !!fv.auto_approve
    };

    this.accountsService.createAPInvoice(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/accounts/payables/view', created.id]);
      },
      error: (err) => {
        console.error('Failed to create AP invoice', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to register invoice. Please verify duplicate invoice number.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/accounts/payables']);
  }
}
