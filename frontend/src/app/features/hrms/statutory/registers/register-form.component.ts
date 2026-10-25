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
import { HrmsStatutoryService, StatutoryRegister } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-register-form',
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
      [title]="isEditMode() ? 'Edit Statutory Register' : 'Register New Bangladesh Labour Act Book'"
      subtitle="Configure mandatory statutory register under Bangladesh Labour Act 2006 & Rules 2015"
      badge="BLA Register"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Register Type -->
          <app-searchable-select
            label="Statutory Form Type *"
            [options]="typeOptions()"
            [value]="formData.register_type || 'FORM_8_WORKER'"
            [allowCreateNew]="true"
            placeholder="Select statutory form..."
            (selectionChange)="onTypeChange($event)"
            (itemCreated)="onNewTypeCreated($event)"
          ></app-searchable-select>

          <!-- Department or Site -->
          <app-searchable-select
            label="Location / Site Jurisdiction *"
            [options]="deptOptions()"
            [value]="formData.department_or_site || ''"
            [allowCreateNew]="true"
            placeholder="Select location or site..."
            (selectionChange)="formData.department_or_site = $event"
            (itemCreated)="onNewDeptCreated($event)"
          ></app-searchable-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Register Name -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Official Register Name *</label>
            <app-custom-input
              [(ngModel)]="formData.register_name"
              name="register_name"
              placeholder="e.g. Form 8: Register of Adult Workers"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Calendar Year -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Calendar Year *</label>
            <app-custom-input
              [(ngModel)]="formData.calendar_year"
              name="calendar_year"
              placeholder="e.g. 2026"
              [required]="true"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Total Entries -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Entries Logged</label>
            <input
              type="number"
              [(ngModel)]="formData.total_entries"
              name="total_entries"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Verified By -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verified By (HR / Audit)</label>
            <app-custom-input
              [(ngModel)]="formData.verified_by"
              name="verified_by"
              placeholder="e.g. Head of HR & Admin"
            ></app-custom-input>
          </div>

          <!-- Verification Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification Date</label>
            <input
              type="date"
              [(ngModel)]="formData.verification_date"
              name="verification_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <app-searchable-select
            label="Register Lifecycle Status *"
            [options]="statusOptions"
            [value]="formData.status || 'CURRENT'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <!-- Remarks -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Legal Provision & Inspection Notes</label>
          <app-custom-textarea
            [(ngModel)]="formData.remarks"
            name="remarks"
            placeholder="Under Section 9 of BLA 2006; physical inspection signed by DIFE labor officer..."
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
            [label]="isEditMode() ? 'Update Register' : 'Create Register'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class RegisterFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<StatutoryRegister> = {
    register_type: 'FORM_8_WORKER',
    register_name: 'Form 8: Register of Adult Workers',
    department_or_site: 'Civil Project Site #4 - Mirpur',
    calendar_year: '2026',
    total_entries: 0,
    verified_by: 'Head of HR & Admin',
    verification_date: new Date().toISOString().substring(0, 10),
    status: 'CURRENT',
    remarks: 'Mandatory under Section 9 of Bangladesh Labour Act 2006'
  };

  typeOptions = signal<SelectOption[]>([]);
  deptOptions = signal<SelectOption[]>([]);
  statusOptions: SelectOption[] = [
    { value: 'CURRENT', label: 'Current & Active' },
    { value: 'ARCHIVED', label: 'Archived Record' },
    { value: 'AUDITED', label: 'DIFE Audited & Signed' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.typeOptions.set(meta.register_types);
      this.deptOptions.set(meta.departments);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getRegister(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onTypeChange(val: string): void {
    this.formData.register_type = val;
    const match = this.typeOptions().find(o => o.value === val);
    if (match && !this.formData.register_name) {
      this.formData.register_name = match.label;
    }
  }

  onNewTypeCreated(item: string): void {
    this.typeOptions.update(opts => [...opts, { value: item, label: item }]);
    this.formData.register_type = item;
  }

  onNewDeptCreated(dept: string): void {
    this.deptOptions.update(opts => [...opts, { value: dept, label: dept }]);
    this.formData.department_or_site = dept;
  }

  save(): void {
    if (!this.formData.register_name) {
      alert('Please provide Register Name.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateRegister(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createRegister(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/registers']);
  }
}
