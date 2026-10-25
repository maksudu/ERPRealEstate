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
import { HrmsStatutoryService, StatutoryAuditDoc } from '../../../../core/services/hrms-statutory.service';

@Component({
  selector: 'app-audit-doc-form',
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
      [title]="isEditMode() ? 'Edit Compliance & Audit Record' : 'Record New Compliance Document'"
      subtitle="Vault certificate under Department of Inspection for Factories, Fire Service & NBR"
      badge="Audit Vault"
    >
      <form (ngSubmit)="save()" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Regulatory Authority -->
          <app-searchable-select
            label="Regulatory Authority *"
            [options]="authorityOptions()"
            [value]="formData.regulatory_authority || 'DIFE'"
            [allowCreateNew]="true"
            placeholder="Select authority..."
            (selectionChange)="formData.regulatory_authority = $event"
            (itemCreated)="onNewAuthorityCreated($event)"
          ></app-searchable-select>

          <!-- Document Type -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Clearance Certificate Type *</label>
            <app-custom-input
              [(ngModel)]="formData.document_type"
              name="document_type"
              placeholder="e.g. Factory Inspection Clearance, Fire Safety License"
              [required]="true"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Title -->
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Statutory Certificate Title *</label>
            <app-custom-input
              [(ngModel)]="formData.title"
              name="title"
              placeholder="e.g. DIFE Annual Labor Compliance Certificate - Dhaka Zone"
              [required]="true"
            ></app-custom-input>
          </div>

          <!-- Reference Number -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">License / Reference No *</label>
            <app-custom-input
              [(ngModel)]="formData.reference_number"
              name="reference_number"
              placeholder="e.g. DIFE/DH-3/EST-4920/2026"
              [required]="true"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Issue Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Issue Date *</label>
            <input
              type="date"
              [(ngModel)]="formData.issue_date"
              name="issue_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          <!-- Expiry Date -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Expiry / Renewal Date</label>
            <input
              type="date"
              [(ngModel)]="formData.expiry_date"
              name="expiry_date"
              class="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <!-- Responsible Officer -->
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Responsible Officer</label>
            <app-custom-input
              [(ngModel)]="formData.responsible_officer"
              name="responsible_officer"
              placeholder="e.g. Chief Compliance Officer"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Compliance Rating -->
          <app-searchable-select
            label="Audit Compliance Rating *"
            [options]="ratingOptions"
            [value]="formData.compliance_rating || 'GRADE_A'"
            placeholder="Select rating..."
            (selectionChange)="formData.compliance_rating = $event"
          ></app-searchable-select>

          <!-- Status -->
          <app-searchable-select
            label="License / Document Status *"
            [options]="statusOptions"
            [value]="formData.status || 'VALID'"
            placeholder="Select status..."
            (selectionChange)="formData.status = $event"
          ></app-searchable-select>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Inspection Findings & Compliance Notes</label>
          <app-custom-textarea
            [(ngModel)]="formData.notes"
            name="notes"
            placeholder="Official comments from inspecting officer, corrective actions recommended and next audit schedule..."
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
            [label]="isEditMode() ? 'Update Record' : 'Save Record'"
            [loading]="saving()"
          ></app-custom-button>
        </div>
      </form>
    </app-card-container>
  `
})
export class AuditDocFormComponent implements OnInit {
  private service = inject(HrmsStatutoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  editId: number | null = null;
  saving = signal<boolean>(false);

  formData: Partial<StatutoryAuditDoc> = {
    regulatory_authority: 'DIFE',
    document_type: 'Factory & Establishment Inspection Clearance',
    title: '',
    reference_number: '',
    issue_date: new Date().toISOString().substring(0, 10),
    expiry_date: undefined,
    responsible_officer: 'Chief Compliance Officer',
    compliance_rating: 'GRADE_A',
    status: 'VALID',
    notes: ''
  };

  authorityOptions = signal<SelectOption[]>([]);
  ratingOptions: SelectOption[] = [
    { value: 'GRADE_A', label: 'Grade A - Fully Compliant' },
    { value: 'GRADE_B', label: 'Grade B - Substantially Compliant' },
    { value: 'CONDITIONAL', label: 'Conditional Clearance (Rectification Due)' },
    { value: 'NON_COMPLIANT', label: 'Non-Compliant / Notice Issued' }
  ];
  statusOptions: SelectOption[] = [
    { value: 'VALID', label: 'Valid & In Effect' },
    { value: 'RENEWAL_DUE', label: 'Renewal Due' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'UNDER_INSPECTION', label: 'Under Inspection' }
  ];

  ngOnInit(): void {
    this.service.getMetadata().subscribe(meta => {
      this.authorityOptions.set(meta.regulatory_authorities);
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.editId = +id;
      this.service.getAuditDocument(this.editId).subscribe(data => {
        this.formData = { ...data };
      });
    }
  }

  onNewAuthorityCreated(auth: string): void {
    this.authorityOptions.update(opts => [...opts, { value: auth, label: auth }]);
    this.formData.regulatory_authority = auth;
  }

  save(): void {
    if (!this.formData.title || !this.formData.reference_number) {
      alert('Please provide Document Title and Reference Number.');
      return;
    }
    this.saving.set(true);
    if (this.isEditMode() && this.editId) {
      this.service.updateAuditDocument(this.editId, this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createAuditDocument(this.formData).subscribe({
        next: () => {
          this.saving.set(false);
          this.goBack();
        },
        error: () => this.saving.set(false)
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/hrms/statutory/audit-documents']);
  }
}
