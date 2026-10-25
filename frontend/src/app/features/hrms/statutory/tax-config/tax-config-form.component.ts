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
import { HrmsStatutoryService, TaxConfiguration } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-tax-config-form',
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
      [title]="isEditMode() ? 'Edit Tax Configuration Slab' : 'Create Income Tax Slab'"
      subtitle="Configure progressive bracket and thresholds under Income Tax Act 2023"
      badge="Compliance Setup"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Assessment Year -->
          <app-searchable-select
            label="Assessment Year *"
            [options]="yearOptions()"
            [value]="formData.assessment_year"
            [allowCreateNew]="true"
            placeholder="Select or enter assessment year..."
            (selectionChange)="formData.assessment_year = $event"
            (itemCreated)="onNewYearCreated($event)"
          ></app-searchable-select>

          <!-- Gender / Exemption Category -->
          <app-searchable-select
            label="Assessee Category *"
            [options]="genderOptions()"
            [value]="formData.gender_group"
            [allowCreateNew]="true"
            placeholder="Select category..."
            (selectionChange)="formData.gender_group = $event"
            (itemCreated)="onNewGenderCreated($event)"
          ></app-searchable-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Slab Name -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Slab Title *</label>
            <app-custom-input
              [(ngModel)]="formData.slab_name"
              name="slab_name"
              placeholder="e.g. Next ৳ 4,00,000 @ 10%"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Tax Rate Percent -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tax Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.tax_rate_percent"
              name="tax_rate_percent"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Min Amount -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Minimum Income (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.min_amount"
              name="min_amount"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Max Amount -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Maximum Income (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.max_amount"
              name="max_amount"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Min Tax Amount -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Min City Tax (৳)</label>
            <input
              type="number"
              step="0.01"
              [(ngModel)]="formData.min_tax_amount"
              name="min_tax_amount"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Statutory Provisions & Explanatory Notes</label>
          <app-custom-textarea
            [(ngModel)]="formData.notes"
            name="notes"
            placeholder="Reference section in Finance Act or NBR statutory circular..."
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
            [label]="isEditMode() ? 'Update Slab' : 'Create Slab'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class TaxConfigFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<TaxConfiguration> = {
    assessment_year: '2026-2027',
    slab_name: '',
    min_amount: 0,
    max_amount: 0,
    tax_rate_percent: 0,
    gender_group: 'ALL',
    special_exemption_limit: 350000,
    min_tax_amount: 5000,
    is_active: true,
    notes: ''
  };

  yearOptions = signal<SelectOption[]>([]);
  genderOptions = signal<SelectOption[]>([]);

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.yearOptions.set(meta.assessment_years);
      this.genderOptions.set(meta.gender_groups);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getTaxConfig(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewYearCreated(item: string): void {
    this.yearOptions.update(opts => [...opts, { value: item, label: item }]);
    this.formData.assessment_year = item;
  }

  onNewGenderCreated(item: string): void {
    this.genderOptions.update(opts => [...opts, { value: item, label: item }]);
    this.formData.gender_group = item;
  }

  save(): void {
    if (!this.formData.slab_name) {
      alert('Please provide a Slab Title.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateTaxConfig(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createTaxConfig(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/tax-config']);
  }
}
