import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../../core/services/land.service';
import { MeasurementConvention, MeasurementConventionPayload } from '../../../../core/models/land.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-convention-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './convention-form.component.html'
})
export class ConventionFormComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  conventionForm!: FormGroup;
  isEditMode = false;
  editingConventionId: number | null = null;
  isLoading = signal(false);
  isSaving = signal(false);
  loadError = signal<string | null>(null);
  saveError = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
    this.conventionForm.valueChanges.subscribe(() => this.persistDraft());
    const id = this.route.snapshot.paramMap.get('id');
    if (id === null) {
      this.restoreDraft();
      return;
    }

    this.editingConventionId = Number(id);
    if (!Number.isInteger(this.editingConventionId) || this.editingConventionId < 1) {
      this.loadError.set('The requested measurement convention could not be found.');
      return;
    }

    this.isEditMode = true;
    this.isLoading.set(true);
    this.landService.getMeasurementConventions().subscribe({
      next: (data) => {
        const response: unknown = data;
        if (!Array.isArray(response) || !response.every(item => this.isMeasurementConvention(item))) {
          this.loadError.set('The conventions endpoint returned invalid data. Refresh the page or contact support.');
          this.isLoading.set(false);
          return;
        }
        const convention = response.find(item => item.id === this.editingConventionId);
        if (!convention) {
          this.loadError.set('The requested measurement convention could not be found.');
        } else {
          this.patchConvention(convention);
          this.restoreDraft();
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load measurement convention', err);
        this.loadError.set(this.getErrorMessage(err, 'Could not load the measurement convention. Check your connection and retry.'));
        this.isLoading.set(false);
      }
    });
  }

  private initForm(): void {
    this.conventionForm = this.fb.group({
      convention_code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]+$/)]],
      convention_name: ['', Validators.required],
      region_district: ['', Validators.required],
      katha_to_sqft: [720, [Validators.required, Validators.min(1)]],
      decimal_to_sqft: [435.60, [Validators.required, Validators.min(1)]],
      bigha_to_katha: [20, [Validators.required, Validators.min(1)]],
      acre_to_decimal: [100, [Validators.required, Validators.min(1)]],
      kani_to_sqft: [null],
      gonda_to_sqft: [null],
      is_default: [false],
      notes: ['']
    });
  }

  private patchConvention(convention: MeasurementConvention): void {
    this.conventionForm.patchValue({
      convention_code: convention.convention_code,
      convention_name: convention.convention_name,
      region_district: convention.region_district,
      katha_to_sqft: convention.katha_to_sqft,
      decimal_to_sqft: convention.decimal_to_sqft,
      bigha_to_katha: convention.bigha_to_katha,
      acre_to_decimal: convention.acre_to_decimal,
      kani_to_sqft: convention.kani_to_sqft,
      gonda_to_sqft: convention.gonda_to_sqft,
      is_default: convention.is_default,
      notes: convention.notes || ''
    });
    this.conventionForm.get('convention_code')?.disable();
  }

  saveConvention(): void {
    this.saveError.set(null);
    if (this.isLoading() || this.loadError()) return;
    if (this.conventionForm.invalid) {
      this.conventionForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const payload = this.conventionForm.getRawValue() as MeasurementConventionPayload;
    const request = this.isEditMode && this.editingConventionId !== null
      ? this.landService.updateMeasurementConvention(this.editingConventionId, this.getUpdatePayload(payload))
      : this.landService.createMeasurementConvention(payload);

    request.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.clearDraft();
        this.router.navigate(['/land/conversions'], {
          queryParams: { saved: this.isEditMode ? 'updated' : 'created' }
        });
      },
      error: (err) => {
        console.error(`Failed to ${this.isEditMode ? 'update' : 'create'} measurement convention`, err);
        this.saveError.set(this.getErrorMessage(
          err,
          `Could not ${this.isEditMode ? 'update' : 'create'} the convention. Review the values and try again.`
        ));
        this.isSaving.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/land/conversions']);
  }

  private getUpdatePayload(payload: MeasurementConventionPayload): Partial<MeasurementConventionPayload> {
    const updatePayload: Partial<MeasurementConventionPayload> = { ...payload };
    delete updatePayload.convention_code;
    return updatePayload;
  }

  private get draftKey(): string {
    return `land-measurement-convention:${this.editingConventionId ?? 'create'}`;
  }

  private persistDraft(): void {
    try {
      sessionStorage.setItem(this.draftKey, JSON.stringify(this.conventionForm.getRawValue()));
    } catch {
      // Draft persistence is best-effort; form editing must remain usable when storage is unavailable.
    }
  }

  private restoreDraft(): void {
    try {
      const draft = sessionStorage.getItem(this.draftKey);
      if (!draft) return;
      const values: unknown = JSON.parse(draft);
      if (!values || typeof values !== 'object' || Array.isArray(values)) return;
      this.conventionForm.patchValue(values);
      if (this.isEditMode) this.conventionForm.get('convention_code')?.disable();
    } catch {
      try {
        sessionStorage.removeItem(this.draftKey);
      } catch {
        // Ignore unavailable browser storage.
      }
    }
  }

  private clearDraft(): void {
    try {
      sessionStorage.removeItem(this.draftKey);
    } catch {
      // The saved record remains authoritative if browser storage is unavailable.
    }
  }

  private isMeasurementConvention(value: unknown): value is MeasurementConvention {
    if (!value || typeof value !== 'object') return false;
    const item = value as Record<string, unknown>;
    const requiredStrings = ['convention_code', 'convention_name', 'region_district'];
    const requiredNumbers = ['id', 'katha_to_sqft', 'decimal_to_sqft', 'bigha_to_katha', 'acre_to_decimal'];
    return requiredStrings.every(key => typeof item[key] === 'string' && Boolean(item[key])) &&
      requiredNumbers.every(key => typeof item[key] === 'number' && Number.isFinite(item[key])) &&
      typeof item['is_default'] === 'boolean';
  }

  private getErrorMessage(error: any, fallback: string): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map(item => item?.msg).filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    return error?.error?.message || fallback;
  }
}
