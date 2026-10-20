import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { LandParcel } from '../../../core/models/land.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

type RecordType = 'costing' | 'valuation';

@Component({
  selector: 'app-valuation-costing-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './valuation-costing-form.component.html'
})
export class ValuationCostingFormComponent implements OnInit {
  recordType: RecordType = 'costing';
  recordId: number | null = null;
  isEditMode = false;
  isLoading = false;
  recordLoaded = true;
  isSaving = false;
  errorMessage = '';
  parcels: LandParcel[] = [];
  parcelOptions: { value: number; label: string }[] = [];
  valuationOptions: { value: number; label: string }[] = [];

  costingData = {
    parcel_id: null as number | null,
    valuation_id: null as number | null,
    costing_date: new Date().toISOString().slice(0, 10),
    costing_status: 'ESTIMATED',
    agreed_purchase_price_bdt: 0,
    budget_allocated_bdt: 0,
    remarks: ''
  };

  valuationData = {
    parcel_id: null as number | null,
    valuation_date: new Date().toISOString().slice(0, 10),
    valuation_source: 'INTERNAL_ESTIMATE',
    assessor_name: '',
    assessor_company: '',
    assessor_license_no: '',
    asking_price_total_bdt: 0,
    market_valuation_total_bdt: 0,
    govt_mouza_rate_per_decimal_bdt: 0,
    govt_mouza_valuation_total_bdt: 0,
    recommended_offer_price_bdt: 0,
    notes_and_methodology: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private landService: LandService
  ) {}

  ngOnInit(): void {
    this.recordType = this.route.snapshot.data['recordType'] === 'valuation' ? 'valuation' : 'costing';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.recordId = Number.isInteger(id) && id > 0 ? id : null;
    this.isEditMode = this.recordId !== null;
    this.isLoading = this.isEditMode;
    this.recordLoaded = !this.isEditMode;

    this.loadParcels();
    if (this.recordType === 'costing') {
      this.loadValuationOptions();
    }
    if (this.recordId) {
      this.loadRecord(this.recordId);
    }
  }

  get pageTitle(): string {
    const label = this.recordType === 'costing' ? 'Acquisition Costing' : 'Land Valuation';
    return `${this.isEditMode ? 'Edit' : 'Create'} ${label}`;
  }

  get pageSubtitle(): string {
    return this.recordType === 'costing'
      ? 'Record the agreed consideration and acquisition budget for a land parcel.'
      : 'Record assessor benchmarks, government mouza rates, and recommended offer price.';
  }

  goBack(): void {
    this.router.navigateByUrl('/land/valuation-costing', {
      state: { activeTab: this.recordType === 'costing' ? 'costings' : 'valuations' }
    });
  }

  loadParcels(): void {
    this.landService.getParcels({ limit: 100 }).subscribe({
      next: (res) => {
        const result: unknown = res;
        if (Array.isArray(result)) {
          this.parcels = result as LandParcel[];
        } else if (typeof result === 'object' && result !== null && 'items' in result && Array.isArray(result.items)) {
          this.parcels = result.items as LandParcel[];
        } else {
          console.error('Unexpected parcel list response', result);
          this.errorMessage = 'The parcel list returned an unexpected response.';
          return;
        }
        this.parcelOptions = this.parcels.map((parcel) => ({
          value: parcel.id,
          label: `${parcel.parcel_id || `Parcel #${parcel.id}`} - ${parcel.project_name || parcel.mouza_name || 'Land'}`
        }));
        if (!this.isEditMode && this.parcels.length > 0) {
          if (this.recordType === 'costing') {
            this.costingData.parcel_id = this.parcels[0].id;
          } else {
            this.valuationData.parcel_id = this.parcels[0].id;
            this.updateGovernmentValuation();
          }
        }
      },
      error: (err) => {
        console.error('Failed to load parcels for valuation/costing form', err);
        this.errorMessage = this.getErrorMessage(err, 'Unable to load land parcels.');
      }
    });
  }

  private loadValuationOptions(): void {
    this.landService.getLandValuations({ offset: 0, limit: 100 }).subscribe({
      next: (page) => {
        this.valuationOptions = page.items.map((valuation) => ({
          value: valuation.id,
          label: `${valuation.valuation_code} - ${valuation.valuation_source.replace(/_/g, ' ')}`
        }));
      },
      error: (err) => {
        console.error('Failed to load valuation options for costing form', err);
        this.errorMessage = this.getErrorMessage(err, 'Unable to load existing valuation records.');
      }
    });
  }

  private loadRecord(id: number): void {
    if (this.recordType === 'costing') {
      this.landService.getAcquisitionCostingById(id).subscribe({
        next: (record) => {
          this.costingData = {
            parcel_id: record.parcel_id,
            valuation_id: record.valuation_id ?? null,
            costing_date: record.costing_date,
            costing_status: record.costing_status,
            agreed_purchase_price_bdt: record.agreed_purchase_price_bdt,
            budget_allocated_bdt: record.budget_allocated_bdt,
            remarks: record.remarks || ''
          };
          this.recordLoaded = true;
          this.isLoading = false;
        },
        error: (err) => this.handleRecordLoadError(err, 'Unable to load acquisition costing.')
      });
      return;
    }

    this.landService.getLandValuationById(id).subscribe({
      next: (record) => {
        this.valuationData = {
          parcel_id: record.parcel_id,
          valuation_date: record.valuation_date,
          valuation_source: record.valuation_source,
          assessor_name: record.assessor_name,
          assessor_company: record.assessor_company || '',
          assessor_license_no: record.assessor_license_no || '',
          asking_price_total_bdt: record.asking_price_total_bdt,
          market_valuation_total_bdt: record.market_valuation_total_bdt,
          govt_mouza_rate_per_decimal_bdt: record.govt_mouza_rate_per_decimal_bdt,
          govt_mouza_valuation_total_bdt: record.govt_mouza_valuation_total_bdt,
          recommended_offer_price_bdt: record.recommended_offer_price_bdt,
          notes_and_methodology: record.notes_and_methodology || ''
        };
        this.recordLoaded = true;
        this.isLoading = false;
      },
      error: (err) => this.handleRecordLoadError(err, 'Unable to load land valuation.')
    });
  }

  private handleRecordLoadError(err: unknown, fallback: string): void {
    console.error('Failed to load valuation/costing record', err);
    this.errorMessage = this.getErrorMessage(err, fallback);
    this.recordLoaded = false;
    this.isLoading = false;
  }

  updateGovernmentValuation(): void {
    const parcel = this.parcels.find((item) => item.id === Number(this.valuationData.parcel_id));
    if (parcel && this.valuationData.govt_mouza_rate_per_decimal_bdt) {
      this.valuationData.govt_mouza_valuation_total_bdt =
        Number(this.valuationData.govt_mouza_rate_per_decimal_bdt) * Number(parcel.total_area_decimal || 0);
    }
  }

  save(): void {
    this.errorMessage = '';
    if (this.recordType === 'costing') {
      this.saveCosting();
    } else {
      this.saveValuation();
    }
  }

  private saveCosting(): void {
    if (!this.costingData.parcel_id || !this.costingData.costing_date) {
      this.errorMessage = 'Select a land parcel and costing date before saving.';
      return;
    }

    this.isSaving = true;
    const request = this.recordId
      ? this.landService.updateAcquisitionCosting(this.recordId, this.costingData)
      : this.landService.createAcquisitionCosting(this.costingData);
    request.subscribe({
      next: () => this.finishSave('Acquisition costing saved successfully.', 'costings'),
      error: (err) => this.handleSaveError(err, 'Unable to save acquisition costing.')
    });
  }

  private saveValuation(): void {
    if (!this.valuationData.parcel_id || !this.valuationData.valuation_date || !this.valuationData.assessor_name.trim()) {
      this.errorMessage = 'Select a land parcel, valuation date, and assessor name before saving.';
      return;
    }

    this.isSaving = true;
    const request = this.recordId
      ? this.landService.updateLandValuation(this.recordId, this.valuationData)
      : this.landService.createLandValuation(this.valuationData);
    request.subscribe({
      next: () => this.finishSave('Land valuation saved successfully.', 'valuations'),
      error: (err) => this.handleSaveError(err, 'Unable to save land valuation.')
    });
  }

  private finishSave(successMessage: string, activeTab: 'costings' | 'valuations'): void {
    this.router.navigateByUrl('/land/valuation-costing', {
      state: { successMessage, activeTab }
    });
  }

  private handleSaveError(err: unknown, fallback: string): void {
    console.error('Failed to save valuation/costing record', err);
    this.errorMessage = this.getErrorMessage(err, fallback);
    this.isSaving = false;
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const body = (error as { error?: unknown }).error;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (typeof body === 'object' && body !== null) {
        if ('detail' in body) {
          if (typeof body.detail === 'string') {
            return body.detail;
          }
          if (Array.isArray(body.detail)) {
            const messages = body.detail
              .map((item) => typeof item === 'object' && item !== null && 'msg' in item && typeof item.msg === 'string' ? item.msg : '')
              .filter(Boolean);
            if (messages.length) {
              return messages.join('; ');
            }
          }
        }
        if ('message' in body && typeof body.message === 'string') {
          return body.message;
        }
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }
}
