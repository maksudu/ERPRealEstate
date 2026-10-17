import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  LandBank, 
  LandKhatian, 
  LandDag, 
  LandDeedDocument, 
  LandDocumentExpiryAlert,
  AreaConversionResult
} from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  CustomTextareaComponent
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
    SearchableSelectComponent,
    CustomTextareaComponent
  ],
  templateUrl: './surveys.component.html'
})
export class SurveysComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  // Active Tab
  activeTab = signal<'khatians' | 'dags' | 'documents' | 'converter'>('khatians');

  proposals = signal<LandBank[]>([]);
  khatians = signal<LandKhatian[]>([]);
  dags = signal<LandDag[]>([]);
  documents = signal<LandDeedDocument[]>([]);
  expiryAlerts = signal<LandDocumentExpiryAlert[]>([]);

  selectedLandBankId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Modals
  isKhatianModalOpen = signal<boolean>(false);
  isDagModalOpen = signal<boolean>(false);
  isDocModalOpen = signal<boolean>(false);

  // Area Converter Signal
  converterResult = signal<AreaConversionResult | null>(null);

  // 1. Khatian Form
  khatianForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    khatian_type: ['RS', Validators.required],
    khatian_number: ['', Validators.required],
    recorded_tenant_name: ['', Validators.required],
    case_or_jote_no: [''],
    remarks: ['']
  });

  // 2. Dag Form
  dagForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    khatian_id: [null],
    dag_number: ['', Validators.required],
    land_class: ['NAL', Validators.required],
    input_unit: ['KATHA', Validators.required],
    input_value: [null, [Validators.required, Validators.min(0.01)]],
    possession_status: ['FULL_POSSESSION', Validators.required],
    remarks: ['']
  });

  // 3. Legal Document Form
  docForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    doc_type: ['KHAJNA_TAX', Validators.required],
    doc_number: ['', Validators.required],
    issuing_office: ['Sub-Registry Office', Validators.required],
    execution_date: [new Date().toISOString().split('T')[0], Validators.required],
    expiry_date: [''],
    verification_status: ['VERIFIED', Validators.required],
    notes: ['']
  });

  // 4. Standalone Math Converter Form
  converterForm: FormGroup = this.fb.group({
    unit: ['KATHA', Validators.required],
    value: [10, [Validators.required, Validators.min(0.001)]]
  });

  // Dynamic Options
  parcelOptions = computed(() => {
    return [
      { value: null, label: 'All Land Parcels (Entire Land Bank)', subLabel: 'Display all records across projects' },
      ...this.proposals().map(p => ({
        value: p.id,
        label: `${p.project_code} - ${p.proposal_title}`,
        subLabel: `Mouza: ${p.mouza_name} | JL: ${p.jl_number} | ${p.total_area_katha} Katha`
      }))
    ];
  });

  khatianOptions = computed(() => {
    return this.khatians().map(k => ({
      value: k.id,
      label: `[${k.khatian_type}] Khatian #${k.khatian_number}`,
      subLabel: `Tenant: ${k.recorded_tenant_name} | Case: ${k.case_or_jote_no || 'N/A'}`
    }));
  });

  khatianTypeOptions = [
    { value: 'CS', label: 'CS (Cadastral Survey 1888-1940)', subLabel: 'Historic parent zamindari survey record' },
    { value: 'SA', label: 'SA (State Acquisition Survey 1956-1963)', subLabel: 'Post-zamindari state acquisition record' },
    { value: 'RS', label: 'RS (Revisional Survey)', subLabel: 'Major statutory revision of land rights' },
    { value: 'BS', label: 'City / BS (Bangladesh Survey)', subLabel: 'Modern computerised Bangladesh survey' },
    { value: 'MUTATION', label: 'Mutation (Namjari Parcha)', subLabel: 'Current title mutation with AC Land order' }
  ];

  landClassOptions = [
    { value: 'NAL', label: 'Nal (Cultivable / Plain Land)', subLabel: 'Standard residential development grade' },
    { value: 'BHITI', label: 'Bhiti (High Raised Land)', subLabel: 'Ideal for immediate heavy tower construction' },
    { value: 'COMMERCIAL', label: 'Commercial Land', subLabel: 'Avenue facing high-value plot' },
    { value: 'RESIDENTIAL', label: 'Residential Homestead (Bari)', subLabel: 'Approved residential zoning' },
    { value: 'CHALA', label: 'Chala (Sloped / Hillock)', subLabel: 'Requires grading & shoring works' },
    { value: 'DOBA', label: 'Doba (Depression / Low Pond)', subLabel: 'Requires earth filling & compaction' }
  ];

  unitOptions = [
    { value: 'KATHA', label: 'Katha (1 Katha = 720 Sq Ft)', subLabel: 'Standard urban real estate unit in Dhaka' },
    { value: 'DECIMAL', label: 'Decimal / Shotok (1 Dec = 435.60 Sq Ft)', subLabel: 'Statutory government registry unit' },
    { value: 'BIGHA', label: 'Bigha (1 Bigha = 20 Katha = 14,400 Sq Ft)', subLabel: 'Large township & parcel measurement' },
    { value: 'SQFT', label: 'Square Feet (Sq Ft)', subLabel: 'Architectural engineering unit' }
  ];

  possessionOptions = [
    { value: 'FULL_POSSESSION', label: 'Full Physical Possession', subLabel: 'Demarcated boundary wall with security post' },
    { value: 'PARTIAL_DISPUTE', label: 'Partial Boundary Dispute', subLabel: 'Minor survey dispute under arbitration' },
    { value: 'UNDER_ENCROACHMENT', label: 'Under Encroachment', subLabel: 'Legal action initiated for eviction' }
  ];

  docTypeOptions = [
    { value: 'KHAJNA_TAX', label: 'Khajna (Land Development Tax Dakhila)', subLabel: 'Annual statutory tax receipt (Mandatory annual renewal)' },
    { value: 'POA_DEED', label: 'Power of Attorney (PoA Deed)', subLabel: 'Registered irrevocable general PoA' },
    { value: 'DEED_BAYA', label: 'Saf-Kabala / Baya Deed', subLabel: 'Registered ownership title deed' },
    { value: 'MUTATION_PARCHA', label: 'Mutation (Namjari) Parcha', subLabel: 'AC Land approved mutation record' },
    { value: 'DCR_RECEIPT', label: 'DCR (Duplicate Carbon Receipt)', subLabel: 'Mutation fee clearance receipt' }
  ];

  verificationStatusOptions = [
    { value: 'VERIFIED', label: 'Legally Vetted & Verified', subLabel: 'Cleared by Senior Legal Counsel' },
    { value: 'PENDING_SEARCH', label: 'Pending AC Land Search', subLabel: 'Official 12-year Sub-Registry search ongoing' },
    { value: 'OBJECTION', label: 'Objection / Discrepancy Found', subLabel: 'AC Land case notice pending' }
  ];

  ngOnInit(): void {
    this.loadProposals();
    this.loadAllData();
    this.calculateConverter();
  }

  loadProposals(): void {
    this.landService.getProposals().subscribe({
      next: (data) => this.proposals.set(data)
    });
  }

  loadAllData(): void {
    this.isLoading.set(true);
    const filterId = this.selectedLandBankId() || undefined;

    // Load Khatians
    this.landService.getKhatians(filterId ? { land_bank_id: filterId } : undefined).subscribe({
      next: (data) => {
        this.khatians.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    // Load Dags
    this.landService.getDags(filterId ? { land_bank_id: filterId } : undefined).subscribe({
      next: (data) => this.dags.set(data)
    });

    // Load Documents
    this.landService.getDocuments(filterId ? { land_bank_id: filterId } : undefined).subscribe({
      next: (data) => this.documents.set(data)
    });

    // Load Expiry Alerts
    this.landService.getDocumentExpiryAlerts().subscribe({
      next: (alerts) => this.expiryAlerts.set(alerts)
    });
  }

  onParcelFilterChange(parcelId: any): void {
    const pId = parcelId ? Number(parcelId) : null;
    this.selectedLandBankId.set(pId);
    this.loadAllData();
  }

  // ---------------------------------------------------------------------
  // Khatian Modal & Submit
  // ---------------------------------------------------------------------
  openKhatianModal(): void {
    const defaultParcel = this.selectedLandBankId() || (this.proposals().length ? this.proposals()[0].id : null);
    this.khatianForm.reset({
      land_bank_id: defaultParcel,
      khatian_type: 'RS',
      khatian_number: '',
      recorded_tenant_name: '',
      case_or_jote_no: '',
      remarks: ''
    });
    this.errorMessage.set(null);
    this.isKhatianModalOpen.set(true);
  }

  closeKhatianModal(): void {
    this.isKhatianModalOpen.set(false);
  }

  submitKhatian(): void {
    if (this.khatianForm.invalid) {
      this.khatianForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.khatianForm.value;
    const payload = {
      land_bank_id: Number(f.land_bank_id),
      khatian_type: f.khatian_type,
      khatian_number: f.khatian_number,
      recorded_tenant_name: f.recorded_tenant_name,
      case_or_jote_no: f.case_or_jote_no || null,
      remarks: f.remarks || null
    };

    this.landService.createKhatian(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeKhatianModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to record khatian survey.');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Dag Modal & Submit
  // ---------------------------------------------------------------------
  openDagModal(): void {
    const defaultParcel = this.selectedLandBankId() || (this.proposals().length ? this.proposals()[0].id : null);
    this.dagForm.reset({
      land_bank_id: defaultParcel,
      khatian_id: this.khatians().length ? this.khatians()[0].id : null,
      dag_number: '',
      land_class: 'NAL',
      input_unit: 'KATHA',
      input_value: 10,
      possession_status: 'FULL_POSSESSION',
      remarks: ''
    });
    this.errorMessage.set(null);
    this.isDagModalOpen.set(true);
  }

  closeDagModal(): void {
    this.isDagModalOpen.set(false);
  }

  submitDag(): void {
    if (this.dagForm.invalid) {
      this.dagForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.dagForm.value;
    const payload = {
      land_bank_id: Number(f.land_bank_id),
      khatian_id: f.khatian_id ? Number(f.khatian_id) : null,
      dag_number: f.dag_number,
      land_class: f.land_class,
      input_unit: f.input_unit,
      input_value: Number(f.input_value),
      possession_status: f.possession_status,
      remarks: f.remarks || null
    };

    this.landService.createDag(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDagModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to register dag/plot.');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Legal Document Modal & Submit
  // ---------------------------------------------------------------------
  openDocModal(): void {
    const defaultParcel = this.selectedLandBankId() || (this.proposals().length ? this.proposals()[0].id : null);
    this.docForm.reset({
      land_bank_id: defaultParcel,
      doc_type: 'KHAJNA_TAX',
      doc_number: `TAX-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      issuing_office: 'Assistant Commissioner (Land), Gulshan Circle',
      execution_date: new Date().toISOString().split('T')[0],
      expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      verification_status: 'VERIFIED',
      notes: 'Annual Land Development Tax (Khajna) paid for current financial year'
    });
    this.errorMessage.set(null);
    this.isDocModalOpen.set(true);
  }

  closeDocModal(): void {
    this.isDocModalOpen.set(false);
  }

  submitDoc(): void {
    if (this.docForm.invalid) {
      this.docForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.docForm.value;
    const payload = {
      land_bank_id: Number(f.land_bank_id),
      doc_type: f.doc_type,
      doc_number: f.doc_number,
      issuing_office: f.issuing_office,
      execution_date: f.execution_date,
      expiry_date: f.expiry_date || null,
      verification_status: f.verification_status,
      notes: f.notes || null
    };

    this.landService.createDocument(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDocModal();
        this.loadAllData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to upload legal document.');
      }
    });
  }

  // ---------------------------------------------------------------------
  // Standalone Mathematical Converter
  // ---------------------------------------------------------------------
  calculateConverter(): void {
    const f = this.converterForm.value;
    const unit = f.unit;
    const val = Number(f.value || 0);

    const params: any = {};
    if (unit === 'KATHA') params.katha = val;
    else if (unit === 'DECIMAL') params.decimal = val;
    else if (unit === 'SQFT') params.sqft = val;

    this.landService.convertArea(params).subscribe({
      next: (res) => this.converterResult.set(res)
    });
  }

  getParcelTitle(landBankId: number): string {
    const p = this.proposals().find(x => x.id === landBankId);
    return p ? `${p.project_code} - ${p.proposal_title}` : `Parcel #${landBankId}`;
  }
}
