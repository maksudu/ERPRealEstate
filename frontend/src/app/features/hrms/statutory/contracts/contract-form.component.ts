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
import { HrmsStatutoryService, EmploymentContract } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-contract-form',
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
      [title]="isEditMode() ? 'Edit Employment Agreement' : 'New Statutory Employment Contract'"
      subtitle="Formal contract under Bangladesh Labour Act 2006 & Labour Rules 2015 Rule 19"
      badge="Legal Contract"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Employee Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Name *</label>
            <app-custom-input
              [(ngModel)]="formData.employee_name"
              name="employee_name"
              placeholder="e.g. Engr. Tareq Hasan"
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
            (itemCreated)="onNewDeptCreated($event)"
          ></app-searchable-select>

          <!-- Designation -->
          <app-searchable-select
            label="Designation / Job Role *"
            [options]="designationOptions()"
            [value]="formData.designation || ''"
            [allowCreateNew]="true"
            placeholder="Select designation..."
            (selectionChange)="formData.designation = $event"
            (itemCreated)="onNewDesigCreated($event)"
          ></app-searchable-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Contract Type -->
          <app-searchable-select
            label="Employment Contract Type *"
            [options]="contractTypeOptions()"
            [value]="formData.contract_type || 'PERMANENT'"
            [allowCreateNew]="true"
            placeholder="Select contract type..."
            (selectionChange)="formData.contract_type = $event"
            (itemCreated)="onNewTypeCreated($event)"
          ></app-searchable-select>

          <!-- Start Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective Start Date *</label>
            <input
              type="date"
              [(ngModel)]="formData.start_date"
              name="start_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <!-- End Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date (If Fixed-Term)</label>
            <input
              type="date"
              [(ngModel)]="formData.end_date"
              name="end_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Probation Months -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Probation Period (Months)</label>
            <input
              type="number"
              [(ngModel)]="formData.probation_months"
              name="probation_months"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Notice Period Days -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notice Period (Days)</label>
            <input
              type="number"
              [(ngModel)]="formData.notice_period_days"
              name="notice_period_days"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Base Salary -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary (৳) *</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.base_salary"
              name="base_salary"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
              required
            />
          </div>
        </div>

        <!-- Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <app-searchable-select
            label="Contract Status *"
            [options]="statusOptions"
            [value]="formData.status || 'ACTIVE'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <!-- Terms Summary -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Key Employment Clauses & Terms Summary</label>
          <app-custom-textarea
            [(ngModel)]="formData.terms_summary"
            name="terms_summary"
            placeholder="Provident fund eligibility, annual gratuity entitlement, confidentiality, intellectual property & site safety obligations..."
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
            [label]="isEditMode() ? 'Update Agreement' : 'Save Agreement'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class ContractFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<EmploymentContract> = {
    employee_name: '',
    department: 'Engineering & Site Operations',
    designation: 'Senior Project Manager',
    contract_type: 'PERMANENT',
    start_date: new Date().toISOString().substring(0, 10),
    end_date: undefined,
    probation_months: 6,
    notice_period_days: 60,
    base_salary: 0,
    status: 'ACTIVE',
    terms_summary: 'Permanent executive appointment with provident fund and statutory gratuity'
  };

  departmentOptions = signal<SelectOption[]>([]);
  designationOptions = signal<SelectOption[]>([]);
  contractTypeOptions = signal<SelectOption[]>([]);

  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active & In Effect' },
    { value: 'EXPIRED', label: 'Expired Term' },
    { value: 'TERMINATED', label: 'Terminated / Released' },
    { value: 'RENEWED', label: 'Renewed Extension' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.departmentOptions.set(meta.departments);
      this.designationOptions.set(meta.designations);
      this.contractTypeOptions.set(meta.contract_types);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getContract(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewDeptCreated(dept: string): void {
    this.departmentOptions.update(opts => [...opts, { value: dept, label: dept }]);
    this.formData.department = dept;
  }

  onNewDesigCreated(desig: string): void {
    this.designationOptions.update(opts => [...opts, { value: desig, label: desig }]);
    this.formData.designation = desig;
  }

  onNewTypeCreated(type: string): void {
    this.contractTypeOptions.update(opts => [...opts, { value: type, label: type }]);
    this.formData.contract_type = type;
  }

  save(): void {
    if (!this.formData.employee_name || !this.formData.base_salary) {
      alert('Please provide Employee Name and Base Salary.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateContract(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createContract(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/contracts']);
  }
}
