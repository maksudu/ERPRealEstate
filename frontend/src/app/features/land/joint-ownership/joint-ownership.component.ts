import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  LandParcel, 
  Landowner, 
  LandownerParcelLink, 
  JointOwnershipShareSummary,
  JVAgreement
} from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-joint-ownership',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './joint-ownership.component.html'
})
export class JointOwnershipComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  // Active Tab
  activeTab = signal<'SHARES' | 'AGREEMENTS'>('SHARES');

  // State Signals
  links = signal<LandownerParcelLink[]>([]);
  agreements = signal<JVAgreement[]>([]);
  parcels = signal<LandParcel[]>([]);
  landowners = signal<Landowner[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Filters & Search
  searchTerm = signal<string>('');
  selectedParcelId = signal<number | null>(null);
  selectedConsentStatus = signal<string>('');
  selectedOwnershipSource = signal<string>('');

  // Pagination for Shares Table
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];

  // Pagination for Agreements Table
  agreementsPage = signal<number>(1);
  agreementsPageSize = signal<number>(10);

  // Selected Parcel for Live Reconciliation Audit
  auditParcelId = signal<number | null>(null);
  auditSummary = signal<JointOwnershipShareSummary | null>(null);
  isLoadingAudit = signal<boolean>(false);

  // Modal 1: Register / Edit Co-Owner Share
  isShareModalOpen = signal<boolean>(false);
  isEditShareMode = signal<boolean>(false);
  editingLinkId = signal<number | null>(null);
  shareForm!: FormGroup;

  // Modal 2: 100% Parcel Ownership Reconciliation Audit
  isAuditModalOpen = signal<boolean>(false);

  // Modal 3: Register / Edit Landowner Agreement (JV / Purchase / PoA)
  isAgreementModalOpen = signal<boolean>(false);
  isEditAgreementMode = signal<boolean>(false);
  editingAgreementId = signal<number | null>(null);
  agreementForm!: FormGroup;

  // Options for Dropdowns
  parcelOptions = computed(() => {
    return this.parcels().map(p => ({
      value: p.id,
      label: `${p.project_name} (JL: ${p.jl_number}, Dag: ${p.dag_number})`,
      subLabel: `${p.mouza_name} - Total Area: ${p.total_area_decimal} Decimal`
    }));
  });

  landownerOptions = computed(() => {
    return this.landowners().map(o => ({
      value: o.id,
      label: `${o.full_name_en} (${o.landowner_code})`,
      subLabel: `NID: ${o.nid_number || 'N/A'}, Phone: ${o.phone_number || 'N/A'}`
    }));
  });

  // Top Metric Cards
  totalSharesCount = computed(() => this.links().length);
  verifiedConsentsCount = computed(() => this.links().filter(l => l.consent_status === 'CONSENT_GRANTED' && l.is_share_verified).length);
  disputedSharesCount = computed(() => this.links().filter(l => l.consent_status === 'DISPUTED' || l.consent_status === 'REFUSED' || l.consent_status === 'LEGAL_NOTICE').length);
  totalAgreementsCount = computed(() => this.agreements().length);

  // Filtered Co-Ownership Links
  filteredLinks = computed(() => {
    let list = this.links();
    const term = this.searchTerm().trim().toLowerCase();
    const pId = this.selectedParcelId();
    const consent = this.selectedConsentStatus();
    const source = this.selectedOwnershipSource();

    if (term) {
      list = list.filter(l => 
        (l.landowner && l.landowner.full_name_en.toLowerCase().includes(term)) ||
        (l.landowner && l.landowner.landowner_code.toLowerCase().includes(term)) ||
        (l.parcel && l.parcel.project_name.toLowerCase().includes(term)) ||
        (l.title_deed_no && l.title_deed_no.toLowerCase().includes(term)) ||
        (l.poa_holder_name && l.poa_holder_name.toLowerCase().includes(term))
      );
    }

    if (pId) {
      list = list.filter(l => l.parcel_id === pId);
    }

    if (consent) {
      list = list.filter(l => l.consent_status === consent);
    }

    if (source) {
      list = list.filter(l => l.ownership_source === source);
    }

    return list;
  });

  paginatedLinks = computed(() => {
    const list = this.filteredLinks();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredLinks().length / this.pageSize()) || 1);

  // Filtered Agreements
  filteredAgreements = computed(() => {
    let list = this.agreements();
    const term = this.searchTerm().trim().toLowerCase();
    const pId = this.selectedParcelId();

    if (term) {
      list = list.filter(a => 
        a.agreement_deed_no.toLowerCase().includes(term) ||
        (a.registration_deed_no && a.registration_deed_no.toLowerCase().includes(term)) ||
        (a.registration_office && a.registration_office.toLowerCase().includes(term)) ||
        (a.parcel && a.parcel.project_name.toLowerCase().includes(term))
      );
    }

    if (pId) {
      list = list.filter(a => a.parcel_id === pId);
    }

    return list;
  });

  paginatedAgreements = computed(() => {
    const list = this.filteredAgreements();
    const start = (this.agreementsPage() - 1) * this.agreementsPageSize();
    return list.slice(start, start + this.agreementsPageSize());
  });

  totalAgreementsPages = computed(() => Math.ceil(this.filteredAgreements().length / this.agreementsPageSize()) || 1);

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.shareForm = this.fb.group({
      parcel_id: [null, Validators.required],
      landowner_id: [null, Validators.required],
      ownership_share_percent: [50.0, [Validators.required, Validators.min(0.01), Validators.max(100.0)]],
      ownership_source: ['PURCHASE', Validators.required],
      proposed_sale_price_bdt: [0.0],
      development_share_percent: [0.0],
      consent_status: ['CONSENT_GRANTED', Validators.required],
      has_poa: [false],
      poa_holder_name: [''],
      dispute_remarks: [''],
      title_deed_no: [''],
      status: ['ACTIVE']
    });

    this.agreementForm = this.fb.group({
      parcel_id: [null],
      agreement_deed_no: ['', Validators.required],
      agreement_type: ['JOINT_VENTURE_DEVELOPMENT', Validators.required],
      registration_deed_no: [''],
      registration_office: ['Sub-Registry Office, Gulshan'],
      registration_date: [new Date().toISOString().substring(0, 10)],
      witness_count: [2, [Validators.required, Validators.min(1)]],
      landowner_share_percent: [50.00, [Validators.required, Validators.min(0), Validators.max(100)]],
      developer_share_percent: [50.00, [Validators.required, Validators.min(0), Validators.max(100)]],
      signing_money_total: [0.0],
      signing_money_paid: [0.0],
      tenure_months: [36, [Validators.required, Validators.min(1)]],
      allocated_flats_count: [0],
      allocated_shops_count: [0],
      allocated_car_parks_count: [0],
      allocated_cash_bdt: [0.0],
      obligations_developer: ['Full construction, sanction, and completion within 36 months.'],
      obligations_landowner: ['Clear and vacant physical handover with clean title chain.'],
      special_conditions: [''],
      amendment_number: [0],
      termination_conditions: ['Failure to obtain RAJUK permit within 12 months allows termination.'],
      missing_consents_flag: [false],
      poa_deed_number: [''],
      poa_execution_date: [null],
      poa_expiry_date: [null],
      poa_verified: [true],
      status: ['ACTIVE', Validators.required]
    });
  }

  loadData(): void {
    this.isLoading.set(true);

    // 1. Load Joint Ownership Links
    this.landService.getJointOwnershipLinks().subscribe({
      next: (data) => {
        this.links.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load joint ownership links', err);
        this.isLoading.set(false);
      }
    });

    // 2. Load Parcels
    this.landService.getParcels().subscribe({
      next: (parcels) => {
        this.parcels.set(parcels);
        if (parcels.length > 0 && !this.auditParcelId()) {
          this.auditParcelId.set(parcels[0].id);
          this.runAuditForParcel(parcels[0].id);
        }
      },
      error: (err) => console.error('Failed to load parcels', err)
    });

    // 3. Load Landowners
    this.landService.getLandowners().subscribe({
      next: (owners) => this.landowners.set(owners),
      error: (err) => console.error('Failed to load landowners', err)
    });

    // 4. Load Agreements
    this.landService.getJVAgreements().subscribe({
      next: (agreements) => this.agreements.set(agreements),
      error: (err) => console.error('Failed to load agreements', err)
    });
  }

  runAuditForParcel(parcelId: number): void {
    this.isLoadingAudit.set(true);
    this.auditParcelId.set(parcelId);
    this.landService.auditParcelJointOwnership(parcelId).subscribe({
      next: (audit) => {
        this.auditSummary.set(audit);
        this.isLoadingAudit.set(false);
      },
      error: (err) => {
        console.error('Audit failed', err);
        this.isLoadingAudit.set(false);
      }
    });
  }

  onAuditParcelChange(parcelId: any): void {
    if (parcelId) {
      this.runAuditForParcel(Number(parcelId));
    }
  }

  openAuditModal(parcelId?: number): void {
    const id = parcelId || this.auditParcelId() || (this.parcels().length > 0 ? this.parcels()[0].id : null);
    if (id) {
      this.runAuditForParcel(id);
    }
    this.isAuditModalOpen.set(true);
  }

  closeAuditModal(): void {
    this.isAuditModalOpen.set(false);
  }

  // Modal 1: Register / Edit Co-Owner Share
  openCreateShareModal(presetParcelId?: number): void {
    this.isEditShareMode.set(false);
    this.editingLinkId.set(null);
    const defParcel = presetParcelId || this.auditParcelId() || (this.parcels().length > 0 ? this.parcels()[0].id : null);
    this.shareForm.reset({
      parcel_id: defParcel,
      landowner_id: this.landowners().length > 0 ? this.landowners()[0].id : null,
      ownership_share_percent: 50.0,
      ownership_source: 'PURCHASE',
      proposed_sale_price_bdt: 0.0,
      development_share_percent: 0.0,
      consent_status: 'CONSENT_GRANTED',
      has_poa: false,
      poa_holder_name: '',
      dispute_remarks: '',
      title_deed_no: '',
      status: 'ACTIVE'
    });
    this.isShareModalOpen.set(true);
  }

  openEditShareModal(link: LandownerParcelLink): void {
    this.isEditShareMode.set(true);
    this.editingLinkId.set(link.id);
    this.shareForm.patchValue({
      parcel_id: link.parcel_id,
      landowner_id: link.landowner_id,
      ownership_share_percent: link.ownership_share_percent,
      ownership_source: link.ownership_source || 'PURCHASE',
      proposed_sale_price_bdt: link.proposed_sale_price_bdt || 0.0,
      development_share_percent: link.development_share_percent || 0.0,
      consent_status: link.consent_status || 'CONSENT_GRANTED',
      has_poa: link.has_poa || false,
      poa_holder_name: link.poa_holder_name || '',
      dispute_remarks: link.dispute_remarks || '',
      title_deed_no: link.title_deed_no || '',
      status: link.status || 'ACTIVE'
    });
    this.isShareModalOpen.set(true);
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
  }

  saveShare(): void {
    if (this.shareForm.invalid) {
      this.shareForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.shareForm.value;

    if (this.isEditShareMode() && this.editingLinkId()) {
      this.landService.updateJointOwnershipLink(this.editingLinkId()!, formVal).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.closeShareModal();
          this.loadData();
          if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
        },
        error: (err) => {
          console.error('Failed to update share', err);
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.linkOwnerToParcel(formVal.parcel_id, formVal).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.closeShareModal();
          this.loadData();
          if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
        },
        error: (err) => {
          console.error('Failed to register share', err);
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteShare(link: LandownerParcelLink): void {
    if (!confirm(`Are you sure you want to remove ${link.landowner?.full_name_en || 'Owner'} (${link.ownership_share_percent}%) from parcel "${link.parcel?.project_name}"?`)) {
      return;
    }

    this.landService.deleteJointOwnershipLink(link.id).subscribe({
      next: () => {
        this.loadData();
        if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
      },
      error: (err) => console.error('Failed to delete share', err)
    });
  }

  // Modal 3: Register / Edit Agreement
  openCreateAgreementModal(): void {
    this.isEditAgreementMode.set(false);
    this.editingAgreementId.set(null);
    this.agreementForm.reset({
      parcel_id: this.parcels().length > 0 ? this.parcels()[0].id : null,
      agreement_deed_no: `JV-AGR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      agreement_type: 'JOINT_VENTURE_DEVELOPMENT',
      registration_deed_no: '',
      registration_office: 'Sub-Registry Office, Gulshan',
      registration_date: new Date().toISOString().substring(0, 10),
      witness_count: 2,
      landowner_share_percent: 50.00,
      developer_share_percent: 50.00,
      signing_money_total: 5000000.0,
      signing_money_paid: 1000000.0,
      tenure_months: 36,
      allocated_flats_count: 14,
      allocated_shops_count: 2,
      allocated_car_parks_count: 14,
      allocated_cash_bdt: 0.0,
      obligations_developer: 'Full architectural modeling, statutory sanctions, construction, and physical handover within 36 months.',
      obligations_landowner: 'Unencumbered peaceful physical possession and registered irrevocable General Power of Attorney.',
      special_conditions: 'All construction costs and regulatory sanction fees to be borne exclusively by developer.',
      amendment_number: 0,
      termination_conditions: 'Failure to obtain approved RAJUK layout permit within 12 months gives landowner right of rescission.',
      missing_consents_flag: false,
      poa_deed_number: '',
      poa_execution_date: null,
      poa_expiry_date: null,
      poa_verified: true,
      status: 'ACTIVE'
    });
    this.isAgreementModalOpen.set(true);
  }

  openEditAgreementModal(agr: JVAgreement): void {
    this.isEditAgreementMode.set(true);
    this.editingAgreementId.set(agr.id);
    this.agreementForm.patchValue({
      parcel_id: agr.parcel_id || null,
      agreement_deed_no: agr.agreement_deed_no,
      agreement_type: agr.agreement_type || 'JOINT_VENTURE_DEVELOPMENT',
      registration_deed_no: agr.registration_deed_no || '',
      registration_office: agr.registration_office || '',
      registration_date: agr.registration_date || null,
      witness_count: agr.witness_count || 2,
      landowner_share_percent: agr.landowner_share_percent,
      developer_share_percent: agr.developer_share_percent,
      signing_money_total: agr.signing_money_total || 0,
      signing_money_paid: agr.signing_money_paid || 0,
      tenure_months: agr.tenure_months || 36,
      allocated_flats_count: agr.allocated_flats_count || 0,
      allocated_shops_count: agr.allocated_shops_count || 0,
      allocated_car_parks_count: agr.allocated_car_parks_count || 0,
      allocated_cash_bdt: agr.allocated_cash_bdt || 0,
      obligations_developer: agr.obligations_developer || '',
      obligations_landowner: agr.obligations_landowner || '',
      special_conditions: agr.special_conditions || '',
      amendment_number: agr.amendment_number || 0,
      termination_conditions: agr.termination_conditions || '',
      missing_consents_flag: agr.missing_consents_flag || false,
      poa_deed_number: agr.poa_deed_number || '',
      poa_execution_date: agr.poa_execution_date || null,
      poa_expiry_date: agr.poa_expiry_date || null,
      poa_verified: agr.poa_verified ?? true,
      status: agr.status || 'ACTIVE'
    });
    this.isAgreementModalOpen.set(true);
  }

  closeAgreementModal(): void {
    this.isAgreementModalOpen.set(false);
  }

  saveAgreement(): void {
    if (this.agreementForm.invalid) {
      this.agreementForm.markAllAsTouched();
      return;
    }

    const formVal = this.agreementForm.value;
    const sumRatio = Number(formVal.landowner_share_percent) + Number(formVal.developer_share_percent);
    if (Math.abs(sumRatio - 100.0) > 0.01) {
      alert(`Landowner Share (${formVal.landowner_share_percent}%) + Developer Share (${formVal.developer_share_percent}%) must sum to exactly 100.00%. Current sum: ${sumRatio}%.`);
      return;
    }

    this.isSaving.set(true);

    if (this.isEditAgreementMode() && this.editingAgreementId()) {
      this.landService.updateJVAgreement(this.editingAgreementId()!, formVal).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.closeAgreementModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to update agreement', err);
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createJVAgreement(formVal).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.closeAgreementModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to create agreement', err);
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteAgreement(agr: JVAgreement): void {
    if (!confirm(`Are you sure you want to delete agreement "${agr.agreement_deed_no}"?`)) {
      return;
    }
    this.landService.deleteJVAgreement(agr.id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to delete agreement', err)
    });
  }

  // Filter & Search Handlers
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
    this.agreementsPage.set(1);
  }

  onParcelFilter(parcelId: any): void {
    this.selectedParcelId.set(parcelId ? Number(parcelId) : null);
    this.currentPage.set(1);
    this.agreementsPage.set(1);
  }

  onConsentFilter(status: string): void {
    this.selectedConsentStatus.set(status);
    this.currentPage.set(1);
  }

  onSourceFilter(source: string): void {
    this.selectedOwnershipSource.set(source);
    this.currentPage.set(1);
  }

  // Pagination Handlers
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize.set(Number(select.value));
    this.currentPage.set(1);
  }

  goToAgreementsPage(page: number): void {
    if (page >= 1 && page <= this.totalAgreementsPages()) {
      this.agreementsPage.set(page);
    }
  }

  onAgreementsPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.agreementsPageSize.set(Number(select.value));
    this.agreementsPage.set(1);
  }
}
