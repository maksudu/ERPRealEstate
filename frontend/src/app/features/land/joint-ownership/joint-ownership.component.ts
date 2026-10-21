import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  Math = Math;
  Number = Number;

  // View Mode: 'LIST' for table registry, or dedicated page views for create/edit
  currentView = signal<'LIST' | 'CREATE_AGREEMENT' | 'EDIT_AGREEMENT' | 'CREATE_SHARE' | 'EDIT_SHARE'>('LIST');

  // Success & Error Messages
  successMessage = signal<string>('');
  errorMessage = signal<string>('');

  // Agreement Document Upload State
  isUploadingAgreement = signal<boolean>(false);
  uploadedAgreementDocuments = signal<Array<{
    document_name: string;
    file_url: string;
    file_name?: string;
    file_size?: number;
    extension?: string;
    uploaded_at?: string;
  }>>([]);

  // Active Tab in List View
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
      label: `${p.project_name || p.parcel_id || 'Parcel #' + p.id} (${p.total_area_decimal || 0} Dec - Mouza: ${p.mouza_name || 'N/A'})`,
      subLabel: `JL: ${p.jl_number || '-'}, Dag: ${p.dag_number || '-'}, District: ${p.district || 'Dhaka'}`
    }));
  });

  landownerOptions = computed(() => {
    return this.landowners().map(o => ({
      value: o.id,
      label: `${o.full_name_en || o.landowner_code || 'Owner #' + o.id} (${o.landowner_code || ''})`,
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
    const term = (this.searchTerm() || '').trim().toLowerCase();
    const pId = this.selectedParcelId();
    const consent = this.selectedConsentStatus();
    const source = this.selectedOwnershipSource();

    if (term) {
      list = list.filter(l => 
        (l.landowner?.full_name_en && l.landowner.full_name_en.toLowerCase().includes(term)) ||
        (l.landowner?.landowner_code && l.landowner.landowner_code.toLowerCase().includes(term)) ||
        (l.parcel?.project_name && l.parcel.project_name.toLowerCase().includes(term)) ||
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
    const term = (this.searchTerm() || '').trim().toLowerCase();
    const pId = this.selectedParcelId();

    if (term) {
      list = list.filter(a => 
        (a.agreement_deed_no && a.agreement_deed_no.toLowerCase().includes(term)) ||
        (a.registration_deed_no && a.registration_deed_no.toLowerCase().includes(term)) ||
        (a.registration_office && a.registration_office.toLowerCase().includes(term)) ||
        (a.parcel?.project_name && a.parcel.project_name.toLowerCase().includes(term)) ||
        (a.agreement_document_name && a.agreement_document_name.toLowerCase().includes(term))
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

    const action = this.route.snapshot.queryParams['action'];
    const currentUrl = this.router.url;
    if (action === 'new-agreement' || currentUrl.includes('/agreements/create') || currentUrl.includes('/agreement/create') || (currentUrl.endsWith('/joint-ownership/create') && !currentUrl.includes('/shares'))) {
      this.openCreateAgreementPage();
    } else if (action === 'new-share' || currentUrl.includes('/shares/create') || currentUrl.includes('/share/create')) {
      this.openCreateSharePage();
    }
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
      agreement_document_name: [''],
      agreement_file_url: [''],
      status: ['ACTIVE', Validators.required]
    });
  }

  loadData(): void {
    this.isLoading.set(true);

    // 1. Load Joint Ownership Links
    this.landService.getJointOwnershipLinks().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.items || [];
        this.links.set(list);
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
        const list = Array.isArray(parcels) ? parcels : (parcels as any)?.items || [];
        this.parcels.set(list);
        if (list.length > 0 && !this.auditParcelId()) {
          this.auditParcelId.set(list[0].id);
          this.runAuditForParcel(list[0].id);
        }
      },
      error: (err) => console.error('Failed to load parcels', err)
    });

    // 3. Load Landowners
    this.landService.getLandowners().subscribe({
      next: (owners) => {
        const list = Array.isArray(owners) ? owners : (owners as any)?.items || [];
        this.landowners.set(list);
      },
      error: (err) => console.error('Failed to load landowners', err)
    });

    // 4. Load Agreements
    this.landService.getJVAgreements().subscribe({
      next: (agreements) => {
        const list = Array.isArray(agreements) ? agreements : (agreements as any)?.items || [];
        this.agreements.set(list);
      },
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

  // Co-Owner Share Page Navigation
  openCreateSharePage(presetParcelId?: number): void {
    this.errorMessage.set('');
    this.successMessage.set('');
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
    this.currentView.set('CREATE_SHARE');
  }

  openEditSharePage(link: LandownerParcelLink): void {
    this.errorMessage.set('');
    this.successMessage.set('');
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
    this.currentView.set('EDIT_SHARE');
  }

  openCreateShareModal(presetParcelId?: number): void {
    this.openCreateSharePage(presetParcelId);
  }

  openEditShareModal(link: LandownerParcelLink): void {
    this.openEditSharePage(link);
  }

  closeShareModal(): void {
    this.backToList();
  }

  saveShare(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.shareForm.invalid) {
      this.shareForm.markAllAsTouched();
      this.errorMessage.set('Please fill all required fields correctly before saving.');
      return;
    }

    this.isSaving.set(true);
    const formVal = this.shareForm.value;

    if (this.isEditShareMode() && this.editingLinkId()) {
      this.landService.updateJointOwnershipLink(this.editingLinkId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Co-owner share updated successfully!');
          this.currentView.set('LIST');
          this.loadData();
          if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
          setTimeout(() => this.successMessage.set(''), 6000);
        },
        error: (err) => {
          console.error('Failed to update share', err);
          this.errorMessage.set(err.error?.detail || 'Failed to update co-owner share. Please check input values.');
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.linkOwnerToParcel(formVal.parcel_id, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('New co-owner share registered successfully!');
          this.currentView.set('LIST');
          this.loadData();
          if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
          setTimeout(() => this.successMessage.set(''), 6000);
        },
        error: (err) => {
          console.error('Failed to register share', err);
          this.errorMessage.set(err.error?.detail || 'Failed to register co-owner share. Please check input values.');
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
        this.successMessage.set('Co-owner share deleted successfully.');
        this.loadData();
        if (this.auditParcelId()) this.runAuditForParcel(this.auditParcelId()!);
        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (err) => {
        console.error('Failed to delete share', err);
        this.errorMessage.set(err.error?.detail || 'Failed to delete share.');
      }
    });
  }

  // Developer-Landowner Agreement Page Navigation
  openCreateAgreementPage(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isEditAgreementMode.set(false);
    this.editingAgreementId.set(null);
    this.uploadedAgreementDocuments.set([]);
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
      agreement_document_name: '',
      agreement_file_url: '',
      status: 'ACTIVE'
    });
    this.currentView.set('CREATE_AGREEMENT');
  }

  openEditAgreementPage(agr: JVAgreement): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isEditAgreementMode.set(true);
    this.editingAgreementId.set(agr.id);

    const docs: any[] = [];
    if (agr.supporting_documents && Array.isArray(agr.supporting_documents)) {
      docs.push(...agr.supporting_documents);
    } else if (agr.agreement_file_url) {
      docs.push({
        document_name: agr.agreement_document_name || 'Landowner-Developer Agreement Deed',
        file_url: agr.agreement_file_url,
        file_name: agr.agreement_document_name || 'agreement_deed.pdf',
        uploaded_at: agr.updated_at || agr.created_at
      });
    }
    this.uploadedAgreementDocuments.set(docs);

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
      agreement_document_name: agr.agreement_document_name || '',
      agreement_file_url: agr.agreement_file_url || '',
      status: agr.status || 'ACTIVE'
    });
    this.currentView.set('EDIT_AGREEMENT');
  }

  openCreateAgreementModal(): void {
    this.openCreateAgreementPage();
  }

  openEditAgreementModal(agr: JVAgreement): void {
    this.openEditAgreementPage(agr);
  }

  closeAgreementModal(): void {
    this.backToList();
  }

  backToList(): void {
    this.currentView.set('LIST');
    this.errorMessage.set('');
    this.isShareModalOpen.set(false);
    this.isAgreementModalOpen.set(false);
  }

  // Agreement Document Upload Handlers
  onAgreementFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const docName = this.agreementForm.get('agreement_document_name')?.value || file.name.replace(/\.[^/.]+$/, "");
    this.isUploadingAgreement.set(true);
    this.errorMessage.set('');

    this.landService.uploadJVAgreementDocument(file, docName).subscribe({
      next: (res) => {
        this.isUploadingAgreement.set(false);
        const newDoc = {
          document_name: docName,
          file_url: res.file_url || res.url,
          file_name: res.file_name || file.name,
          file_size: file.size,
          extension: file.name.split('.').pop()?.toLowerCase(),
          uploaded_at: new Date().toISOString()
        };

        const currentDocs = [...this.uploadedAgreementDocuments(), newDoc];
        this.uploadedAgreementDocuments.set(currentDocs);

        if (!this.agreementForm.get('agreement_file_url')?.value || currentDocs.length === 1) {
          this.agreementForm.patchValue({
            agreement_document_name: docName,
            agreement_file_url: newDoc.file_url
          });
        }
        input.value = '';
      },
      error: (err) => {
        this.isUploadingAgreement.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to upload agreement document. Please try again.');
        input.value = '';
      }
    });
  }

  removeAgreementDocument(index: number): void {
    const docs = [...this.uploadedAgreementDocuments()];
    docs.splice(index, 1);
    this.uploadedAgreementDocuments.set(docs);

    if (docs.length > 0) {
      this.agreementForm.patchValue({
        agreement_document_name: docs[0].document_name,
        agreement_file_url: docs[0].file_url
      });
    } else {
      this.agreementForm.patchValue({
        agreement_document_name: '',
        agreement_file_url: ''
      });
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    return (kb / 1024).toFixed(2) + ' MB';
  }

  saveAgreement(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.agreementForm.invalid) {
      this.agreementForm.markAllAsTouched();
      this.errorMessage.set('Please fill all mandatory fields marked with an asterisk (*).');
      return;
    }

    const formVal = { ...this.agreementForm.value };
    const sumRatio = Number(formVal.landowner_share_percent || 0) + Number(formVal.developer_share_percent || 0);
    if (Math.abs(sumRatio - 100.0) > 0.01) {
      this.errorMessage.set(`Landowner Share (${formVal.landowner_share_percent}%) + Developer Share (${formVal.developer_share_percent}%) must sum to exactly 100.00%. Current sum is ${sumRatio.toFixed(2)}%.`);
      return;
    }

    const docs = this.uploadedAgreementDocuments();
    if (docs.length > 0) {
      formVal.supporting_documents = docs;
      if (!formVal.agreement_file_url) {
        formVal.agreement_file_url = docs[0].file_url;
        formVal.agreement_document_name = docs[0].document_name;
      }
    }

    this.isSaving.set(true);

    if (this.isEditAgreementMode() && this.editingAgreementId()) {
      this.landService.updateJVAgreement(this.editingAgreementId()!, formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Agreement updated successfully!');
          this.currentView.set('LIST');
          this.loadData();
          setTimeout(() => this.successMessage.set(''), 6000);
        },
        error: (err) => {
          console.error('Failed to update agreement', err);
          this.errorMessage.set(err.error?.detail || 'Failed to update agreement deed.');
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createJVAgreement(formVal).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('New Developer-Landowner Agreement registered successfully!');
          this.currentView.set('LIST');
          this.loadData();
          setTimeout(() => this.successMessage.set(''), 6000);
        },
        error: (err) => {
          console.error('Failed to create agreement', err);
          this.errorMessage.set(err.error?.detail || 'Failed to register agreement deed.');
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

  onPageChange(page: number): void {
    this.goToPage(page);
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

  onAgreementsPageChange(page: number): void {
    this.goToAgreementsPage(page);
  }

  onAgreementsPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.agreementsPageSize.set(Number(select.value));
    this.agreementsPage.set(1);
  }
}
