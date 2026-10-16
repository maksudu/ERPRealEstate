import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { LandBank, SurveyRecord } from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-surveys',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './surveys.component.html'
})
export class SurveysComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  proposals = signal<LandBank[]>([]);
  surveys = signal<SurveyRecord[]>([]);
  selectedLandBankId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isModalOpen = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  surveyForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    survey_type_id: ['RS', Validators.required],
    khatian_number: ['', Validators.required],
    dag_number: ['', Validators.required],
    recorded_tenant_name: ['', Validators.required],
    recorded_area_decimal: [null, [Validators.required, Validators.min(0.001)]],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProposals();
    this.loadSurveys();
  }

  loadProposals(): void {
    this.landService.getProposals().subscribe({
      next: (data) => this.proposals.set(data)
    });
  }

  loadSurveys(): void {
    this.isLoading.set(true);
    const filterId = this.selectedLandBankId();
    this.landService.getSurveys(filterId ? { land_bank_id: filterId } : undefined).subscribe({
      next: (data) => {
        this.surveys.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  filterByParcel(event: any): void {
    const val = event.target.value ? Number(event.target.value) : null;
    this.selectedLandBankId.set(val);
    this.loadSurveys();
  }

  openCreateModal(): void {
    this.surveyForm.reset({
      survey_type_id: 'RS',
      land_bank_id: this.selectedLandBankId() || (this.proposals().length ? this.proposals()[0].id : null)
    });
    this.errorMessage.set(null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  submitSurvey(): void {
    if (this.surveyForm.invalid) {
      this.surveyForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.surveyForm.value;
    const landBankId = Number(f.land_bank_id);
    const decimal = Number(f.recorded_area_decimal);
    const calculatedKatha = Number(((decimal * 435.6) / 720).toFixed(4));

    const payload = {
      survey_type_id: f.survey_type_id,
      khatian_number: f.khatian_number,
      dag_number: f.dag_number,
      recorded_tenant_name: f.recorded_tenant_name,
      recorded_area_decimal: decimal,
      recorded_area_katha: calculatedKatha,
      remarks: f.remarks
    };

    this.landService.createSurvey(landBankId, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.loadSurveys();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to log survey record.');
      }
    });
  }

  getParcelCode(landBankId: number): string {
    const p = this.proposals().find(x => x.id === landBankId);
    return p ? p.project_code : `Parcel #${landBankId}`;
  }
}
