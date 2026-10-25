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
import { HrmsStatutoryService, PolicyAcknowledgment } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-policy-form',
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
      [title]="isEditMode() ? 'Edit Corporate Statutory Policy' : 'Define New Statutory HR Policy'"
      subtitle="Establish mandatory governance policies under Bangladesh High Court guidelines & BLA 2006"
      badge="Policy Governance"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Policy Category -->
          <app-searchable-select
            label="Policy Category *"
            [options]="categoryOptions()"
            [value]="formData.category || 'CONDUCT'"
            [allowCreateNew]="true"
            placeholder="Select policy category..."
            (selectionChange)="formData.category = $event"
            (itemCreated)="onNewCategoryCreated($event)"
          ></app-searchable-select>

          <!-- Mandatory For -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Applicable Target Group *</label>
            <app-custom-input
              [(ngModel)]="formData.mandatory_for"
              name="mandatory_for"
              placeholder="e.g. ALL, SITE_ENGINEERS, MANAGEMENT"
              [required]="true"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Policy Title -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Statutory Policy Title *</label>
            <app-custom-input
              [(ngModel)]="formData.policy_title"
              name="policy_title"
              placeholder="e.g. Prevention of Sexual Harassment at Workplace (High Court Mandate)"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Version -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Version</label>
            <app-custom-input
              [(ngModel)]="formData.version"
              name="version"
              placeholder="e.g. 2.1"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Effective Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Effective Date</label>
            <input
              type="date"
              [(ngModel)]="formData.effective_date"
              name="effective_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Required Signoffs -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Required Signoffs</label>
            <input
              type="number"
              [(ngModel)]="formData.required_signoffs"
              name="required_signoffs"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Acknowledged Count -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Acknowledged Count</label>
            <input
              type="number"
              [(ngModel)]="formData.acknowledged_count"
              name="acknowledged_count"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Status -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <app-searchable-select
            label="Policy Status *"
            [options]="statusOptions"
            [value]="formData.status || 'ACTIVE'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Scope & Mandate Summary</label>
          <app-custom-textarea
            [(ngModel)]="formData.description"
            name="description"
            placeholder="Official guidelines, complaint procedures, inquiry committees and punitive provisions..."
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
            [label]="isEditMode() ? 'Update Policy' : 'Save Policy'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class PolicyFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<PolicyAcknowledgment> = {
    policy_title: '',
    category: 'CONDUCT',
    mandatory_for: 'ALL',
    version: '2.0',
    effective_date: new Date().toISOString().substring(0, 10),
    required_signoffs: 150,
    acknowledged_count: 0,
    status: 'ACTIVE',
    description: ''
  };

  categoryOptions = signal<SelectOption[]>([]);
  statusOptions: SelectOption[] = [
    { value: 'ACTIVE', label: 'Active & Enforced' },
    { value: 'UNDER_REVISION', label: 'Under Revision / Draft' },
    { value: 'RETIRED', label: 'Retired / Superseded' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.categoryOptions.set(meta.policy_categories);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getPolicy(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewCategoryCreated(cat: string): void {
    this.categoryOptions.update(opts => [...opts, { value: cat, label: cat }]);
    this.formData.category = cat;
  }

  save(): void {
    if (!this.formData.policy_title) {
      alert('Please provide Policy Title.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updatePolicy(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createPolicy(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/policies']);
  }
}
