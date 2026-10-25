import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../../shared/components';
import { HrmsStatutoryService, TaxDeduction } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-deduction-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <app-card-container
      [title]="isEditMode() ? 'Edit Monthly Tax Deduction (TDS)' : 'Record Monthly Tax Deduction'"
      subtitle="Section 50 Income Tax Act 2023 payroll tax withholding record and treasury deposit"
      badge="TDS Record"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Employee Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Name *</label>
            <app-custom-input
              [(ngModel)]="formData.employee_name"
              name="employee_name"
              placeholder="e.g. Engr. Rafiqul Islam"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Department -->
          <app-searchable-select
            label="Department *"
            [options]="departmentOptions()"
            [value]="formData.department || ''"
            [allowCreateNew]="true"
            placeholder="Select department..."
            (selectionChange)="formData.department = $event"
            (itemCreated)="onNewDepartmentCreated($event)"
          ></app-searchable-select>

          <!-- Tax Month -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Month *</label>
            <app-custom-input
              [(ngModel)]="formData.tax_month"
              name="tax_month"
              placeholder="e.g. October 2026"
              [required]="true"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Gross Salary -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Gross Salary (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.gross_salary"
              name="gross_salary"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Taxable Salary -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Taxable Salary (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.taxable_salary"
              name="taxable_salary"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- TDS Amount -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">TDS Deducted (৳) *</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.tds_amount"
              name="tds_amount"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Treasury Challan No -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Treasury Challan No</label>
            <app-custom-input
              [(ngModel)]="formData.challan_number"
              name="challan_number"
              placeholder="e.g. CHL-NBR-8849-T"
            ></app-custom-input>
          </div>

          <!-- Challan Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deposit Date</label>
            <input
              type="date"
              [(ngModel)]="formData.challan_date"
              name="challan_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Status -->
          <app-searchable-select
            label="Challan Deposit Status *"
            [options]="statusOptions"
            [value]="formData.status || 'DEPOSITED'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Bank Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Government Authorized Bank</label>
            <app-custom-input
              [(ngModel)]="formData.bank_name"
              name="bank_name"
              placeholder="e.g. Sonali Bank PLC"
            ></app-custom-input>
          </div>

          <!-- Bank Branch -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Treasury Branch</label>
            <app-custom-input
              [(ngModel)]="formData.bank_branch"
              name="bank_branch"
              placeholder="e.g. Customs & Treasury Branch, Dhaka"
            ></app-custom-input>
          </div>
        </div>

        <!-- Remarks -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Audit Notes & Reconciliation Remarks</label>
          <app-custom-textarea
            [(ngModel)]="formData.remarks"
            name="remarks"
            placeholder="Details of salary batch, payment voucher number or e-challan token..."
          ></app-custom-textarea>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <app-custom-button
            variant="outline"
            label="Cancel"
            (btnClick)="goBack()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [label]="isEditMode() ? 'Update TDS Record' : 'Save TDS Record'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class TaxDeductionFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<TaxDeduction> = {
    employee_name: '',
    department: 'Engineering & Site Operations',
    fiscal_year: '2026-2027',
    tax_month: 'October 2026',
    gross_salary: 0,
    taxable_salary: 0,
    tds_amount: 0,
    challan_number: '',
    challan_date: new Date().toISOString().substring(0, 10),
    bank_name: 'Sonali Bank PLC',
    bank_branch: 'Customs & Treasury Branch, Dhaka',
    status: 'DEPOSITED',
    remarks: ''
  };

  departmentOptions = signal<SelectOption[]>([]);
  statusOptions: SelectOption[] = [
    { value: 'DEPOSITED', label: 'Challan Deposited' },
    { value: 'PENDING', label: 'Pending Deposit' },
    { value: 'RECONCILED', label: 'Reconciled & Filed' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.departmentOptions.set(meta.departments);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getTaxDeduction(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewDepartmentCreated(dept: string): void {
    this.departmentOptions.update(opts => [...opts, { value: dept, label: dept }]);
    this.formData.department = dept;
  }

  save(): void {
    if (!this.formData.employee_name) {
      alert('Please provide Employee Name.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateTaxDeduction(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createTaxDeduction(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/tax-deductions']);
  }
}
