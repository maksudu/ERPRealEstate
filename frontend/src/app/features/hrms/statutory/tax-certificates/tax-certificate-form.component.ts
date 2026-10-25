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
import { HrmsStatutoryService, TaxCertificate } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-certificate-form',
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
      [title]="isEditMode() ? 'Edit Employee Tax Certificate (Form 108)' : 'Issue Employee Tax Certificate (Form 108)'"
      subtitle="Annual salary TDS certificate under Section 102/108 Income Tax Act 2023"
      badge="Form 108"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Employee Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Assessee *</label>
            <app-custom-input
              [(ngModel)]="formData.employee_name"
              name="employee_name"
              placeholder="e.g. Engr. Rafiqul Islam"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- 12-Digit e-TIN -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">12-Digit e-TIN Number *</label>
            <app-custom-input
              [(ngModel)]="formData.etin"
              name="etin"
              placeholder="e.g. 482910482918"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Assessment Year -->
          <app-searchable-select
            label="Assessment Year *"
            [options]="yearOptions()"
            [value]="formData.assessment_year || ''"
            [allowCreateNew]="true"
            placeholder="Select assessment year..."
            (selectionChange)="formData.assessment_year = $event"
            (itemCreated)="onNewYearCreated($event)"
          ></app-searchable-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Tax Circle -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Circle</label>
            <app-custom-input
              [(ngModel)]="formData.tax_circle"
              name="tax_circle"
              placeholder="e.g. Circle 12, Salary"
            ></app-custom-input>
          </div>

          <!-- Tax Zone -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Zone</label>
            <app-custom-input
              [(ngModel)]="formData.tax_zone"
              name="tax_zone"
              placeholder="e.g. Tax Zone 06, Dhaka"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Gross Earnings -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Gross Earnings (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.gross_earnings"
              name="gross_earnings"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Total Tax Deducted -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total TDS Deposited (৳) *</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.total_tax_deducted"
              name="total_tax_deducted"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              required
            />
          </div>

          <!-- Issue Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Date</label>
            <input
              type="date"
              [(ngModel)]="formData.issue_date"
              name="issue_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Authorized Signatory -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Authorized Signatory</label>
            <app-custom-input
              [(ngModel)]="formData.authorized_signatory"
              name="authorized_signatory"
              placeholder="e.g. Chief Financial Officer"
            ></app-custom-input>
          </div>

          <!-- Status -->
          <app-searchable-select
            label="Certificate Status *"
            [options]="statusOptions"
            [value]="formData.status || 'ISSUED'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <!-- Remarks -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Remarks & Footnote</label>
          <app-custom-textarea
            [(ngModel)]="formData.remarks"
            name="remarks"
            placeholder="Challan numbers and verification details..."
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
            [label]="isEditMode() ? 'Update Certificate' : 'Issue Certificate'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class TaxCertificateFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<TaxCertificate> = {
    employee_name: '',
    etin: '',
    tax_circle: 'Circle 12, Salary',
    tax_zone: 'Tax Zone 06, Dhaka',
    assessment_year: '2026-2027',
    gross_earnings: 0,
    total_tax_deducted: 0,
    issue_date: new Date().toISOString().substring(0, 10),
    authorized_signatory: 'Chief Financial Officer',
    status: 'ISSUED',
    remarks: 'Form 108 certified for annual tax return filing with NBR'
  };

  yearOptions = signal<SelectOption[]>([]);
  statusOptions: SelectOption[] = [
    { value: 'ISSUED', label: 'Official Certificate Issued' },
    { value: 'DRAFT', label: 'Draft Pending Verification' },
    { value: 'SUBMITTED', label: 'Submitted with NBR' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.yearOptions.set(meta.assessment_years);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getTaxCertificate(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewYearCreated(item: string): void {
    this.yearOptions.update(opts => [...opts, { value: item, label: item }]);
    this.formData.assessment_year = item;
  }

  save(): void {
    if (!this.formData.employee_name || !this.formData.etin) {
      alert('Please provide Employee Name and e-TIN Number.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateTaxCertificate(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createTaxCertificate(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/tax-certificates']);
  }
}
