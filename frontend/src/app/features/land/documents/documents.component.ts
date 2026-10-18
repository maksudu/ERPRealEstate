import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  LandDeedDocument, 
  LandParcel, 
  Landowner, 
  DocumentChecklistResponse, 
  DocumentVerifyRequest,
  LandDocumentExpiryAlert
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
  selector: 'app-land-documents',
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
  templateUrl: './documents.component.html'
})
export class DocumentsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  // State Signals
  documents = signal<LandDeedDocument[]>([]);
  parcels = signal<LandParcel[]>([]);
  landowners = signal<Landowner[]>([]);
  expiryAlerts = signal<LandDocumentExpiryAlert[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Filters & Search
  searchTerm = signal<string>('');
  selectedCategory = signal<string>('');
  selectedVerificationStatus = signal<string>('');
  selectedParcelId = signal<number | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];

  // Modal 1: Register / Edit Legal Document
  isDocModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingDocId = signal<number | null>(null);
  documentForm!: FormGroup;

  // Modal 2: Independent Title Verification (Legal Officer)
  isVerifyModalOpen = signal<boolean>(false);
  verifyingDoc = signal<LandDeedDocument | null>(null);
  verifyForm!: FormGroup;

  // Modal 3: AI OCR Document Extraction Simulation & Preview
  isOcrModalOpen = signal<boolean>(false);
  ocrDoc = signal<LandDeedDocument | null>(null);
  ocrResult = signal<any>(null);
  isOcrRunning = signal<boolean>(false);

  // Modal 4: Parcel Acquisition Document Checklist
  isChecklistModalOpen = signal<boolean>(false);
  selectedChecklistParcelId = signal<number | null>(null);
  checklistData = signal<DocumentChecklistResponse | null>(null);
  isLoadingChecklist = signal<boolean>(false);

  // Dynamic Select Options for Parcels and Owners
  parcelOptions = computed(() => {
    return this.parcels().map(p => ({
      value: p.id,
      label: `${p.project_name} (JL: ${p.jl_number}, Dag: ${p.dag_number})`,
      subLabel: `${p.mouza_name}, ${p.upazila_thana || ''} - ${p.total_area_decimal} Dec`
    }));
  });

  landownerOptions = computed(() => {
    return this.landowners().map(o => ({
      value: o.id,
      label: `${o.full_name_en} (${o.landowner_code})`,
      subLabel: `NID: ${o.nid_number || 'N/A'}, Phone: ${o.phone_number || 'N/A'}`
    }));
  });

  // Top KPI Metrics
  totalDocsCount = computed(() => this.documents().length);
  verifiedDocsCount = computed(() => this.documents().filter(d => d.is_independently_verified || d.verification_status === 'VERIFIED').length);
  pendingVerificationCount = computed(() => this.documents().filter(d => d.verification_status === 'PENDING' || d.verification_status === 'PENDING_SEARCH').length);
  expiringDocsCount = computed(() => this.documents().filter(d => d.is_expired || (d.days_until_expiry !== undefined && d.days_until_expiry !== null && d.days_until_expiry <= 30)).length);

  // Filtered & Paginated Documents
  filteredDocuments = computed(() => {
    let list = this.documents();
    const term = this.searchTerm().trim().toLowerCase();
    const cat = this.selectedCategory();
    const status = this.selectedVerificationStatus();
    const parcelId = this.selectedParcelId();

    if (term) {
      list = list.filter(d => 
        (d.doc_title && d.doc_title.toLowerCase().includes(term)) ||
        d.doc_number.toLowerCase().includes(term) ||
        (d.reference_number && d.reference_number.toLowerCase().includes(term)) ||
        (d.issuing_office && d.issuing_office.toLowerCase().includes(term)) ||
        (d.parcel && d.parcel.project_name.toLowerCase().includes(term))
      );
    }

    if (cat) {
      list = list.filter(d => d.document_category === cat || d.doc_type === cat);
    }

    if (status) {
      list = list.filter(d => d.verification_status === status);
    }

    if (parcelId) {
      list = list.filter(d => d.parcel_id === parcelId);
    }

    return list;
  });

  paginatedDocuments = computed(() => {
    const list = this.filteredDocuments();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredDocuments().length / this.pageSize()) || 1);

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.documentForm = this.fb.group({
      doc_title: ['', Validators.required],
      document_category: ['DEED_SALE', Validators.required],
      doc_type: ['SALE_DEED', Validators.required],
      doc_number: ['', Validators.required],
      reference_number: [''],
      issuing_office: ['', Validators.required],
      execution_date: [new Date().toISOString().substring(0, 10), Validators.required],
      expiry_date: [null],
      document_version: ['v1.0', Validators.required],
      parcel_id: [null],
      landowner_id: [null],
      access_security_level: ['CONFIDENTIAL'],
      renewal_reminder_days: [30],
      file_url: ['https://storage.googleapis.com/realestate-deeds/demo-deed.pdf'],
      notes: ['']
    });

    this.verifyForm = this.fb.group({
      verification_status: ['VERIFIED', Validators.required],
      verification_officer: ['Advocate Shamsul Haque (Senior Legal Counsel)', Validators.required],
      verification_remarks: ['', Validators.required],
      physical_records_vetted: [true, Validators.requiredTrue]
    });
  }

  loadData(): void {
    this.isLoading.set(true);

    // Load Documents
    this.landService.getDocuments().subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load documents', err);
        this.isLoading.set(false);
      }
    });

    // Load Parcels for linking and checklist
    this.landService.getParcels().subscribe({
      next: (parcels) => {
        this.parcels.set(parcels);
        if (parcels.length > 0 && !this.selectedChecklistParcelId()) {
          this.selectedChecklistParcelId.set(parcels[0].id);
        }
      },
      error: (err) => console.error('Failed to load parcels', err)
    });

    // Load Landowners for linking
    this.landService.getLandowners().subscribe({
      next: (owners) => this.landowners.set(owners),
      error: (err) => console.error('Failed to load landowners', err)
    });

    // Load Expiry Alerts
    this.landService.getDocumentExpiryAlerts().subscribe({
      next: (alerts) => this.expiryAlerts.set(alerts),
      error: (err) => console.error('Failed to load expiry alerts', err)
    });
  }

  // Filter handlers
  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.currentPage.set(1);
  }

  onCategoryFilter(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  onStatusFilter(status: string): void {
    this.selectedVerificationStatus.set(status);
    this.currentPage.set(1);
  }

  onParcelFilter(parcelId: any): void {
    this.selectedParcelId.set(parcelId ? Number(parcelId) : null);
    this.currentPage.set(1);
  }

  // Modal 1: Register / Edit Document
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingDocId.set(null);
    this.documentForm.reset({
      doc_title: '',
      document_category: 'DEED_SALE',
      doc_type: 'SALE_DEED',
      doc_number: '',
      reference_number: '',
      issuing_office: 'Sub-Registry Office, Gulshan',
      execution_date: new Date().toISOString().substring(0, 10),
      expiry_date: null,
      document_version: 'v1.0',
      parcel_id: this.parcels().length > 0 ? this.parcels()[0].id : null,
      landowner_id: this.landowners().length > 0 ? this.landowners()[0].id : null,
      access_security_level: 'CONFIDENTIAL',
      renewal_reminder_days: 30,
      file_url: 'https://storage.googleapis.com/realestate-deeds/sample-legal-deed.pdf',
      notes: ''
    });
    this.isDocModalOpen.set(true);
  }

  openEditModal(doc: LandDeedDocument): void {
    this.isEditMode.set(true);
    this.editingDocId.set(doc.id);
    this.documentForm.patchValue({
      doc_title: doc.doc_title || `${doc.doc_type} - ${doc.doc_number}`,
      document_category: doc.document_category || 'DEED_SALE',
      doc_type: doc.doc_type,
      doc_number: doc.doc_number,
      reference_number: doc.reference_number || '',
      issuing_office: doc.issuing_office,
      execution_date: doc.execution_date,
      expiry_date: doc.expiry_date || null,
      document_version: doc.document_version || 'v1.0',
      parcel_id: doc.parcel_id || null,
      landowner_id: doc.landowner_id || null,
      access_security_level: doc.access_security_level || 'CONFIDENTIAL',
      renewal_reminder_days: doc.renewal_reminder_days || 30,
      file_url: doc.file_url || '',
      notes: doc.notes || ''
    });
    this.isDocModalOpen.set(true);
  }

  closeDocModal(): void {
    this.isDocModalOpen.set(false);
  }

  saveDocument(): void {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.documentForm.value;

    if (this.isEditMode() && this.editingDocId()) {
      this.landService.updateDocument(this.editingDocId()!, formVal).subscribe({
        next: (updated) => {
          this.isSaving.set(false);
          this.closeDocModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to update document', err);
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createDocument(formVal).subscribe({
        next: (created) => {
          this.isSaving.set(false);
          this.closeDocModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Failed to create document', err);
          this.isSaving.set(false);
        }
      });
    }
  }

  // Modal 2: Independent Title Verification
  openVerifyModal(doc: LandDeedDocument): void {
    this.verifyingDoc.set(doc);
    this.verifyForm.reset({
      verification_status: doc.verification_status === 'VERIFIED' ? 'VERIFIED' : 'VERIFIED',
      verification_officer: doc.verification_officer || 'Advocate Shamsul Haque (Head of Legal Title Vetting)',
      verification_remarks: doc.verification_remarks || 'Title vetted against volume books at Sub-Registry. Dag & Khatian matches AC Land record.',
      physical_records_vetted: true
    });
    this.isVerifyModalOpen.set(true);
  }

  closeVerifyModal(): void {
    this.isVerifyModalOpen.set(false);
    this.verifyingDoc.set(null);
  }

  submitVerification(): void {
    if (this.verifyForm.invalid || !this.verifyingDoc()) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const req: DocumentVerifyRequest = {
      verification_status: this.verifyForm.value.verification_status,
      verification_officer: this.verifyForm.value.verification_officer,
      verification_remarks: this.verifyForm.value.verification_remarks,
      is_independently_verified: this.verifyForm.value.verification_status === 'VERIFIED'
    };

    this.landService.verifyDocument(this.verifyingDoc()!.id, req).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.closeVerifyModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Verification failed', err);
        this.isSaving.set(false);
      }
    });
  }

  // Modal 3: AI OCR Document Extraction
  openOcrModal(doc: LandDeedDocument): void {
    this.ocrDoc.set(doc);
    this.ocrResult.set(doc.ocr_extracted_data || null);
    this.isOcrModalOpen.set(true);
  }

  closeOcrModal(): void {
    this.isOcrModalOpen.set(false);
    this.ocrDoc.set(null);
    this.ocrResult.set(null);
  }

  runOcrSimulation(): void {
    if (!this.ocrDoc()) return;
    this.isOcrRunning.set(true);
    this.landService.simulateDocumentOcr(this.ocrDoc()!.id).subscribe({
      next: (res) => {
        this.isOcrRunning.set(false);
        this.ocrResult.set(res.ocr_extracted_data);
        this.loadData();
      },
      error: (err) => {
        console.error('OCR simulation failed', err);
        this.isOcrRunning.set(false);
      }
    });
  }

  // Modal 4: Parcel Acquisition Document Checklist
  openChecklistModal(parcelId?: number): void {
    if (parcelId) {
      this.selectedChecklistParcelId.set(parcelId);
    } else if (!this.selectedChecklistParcelId() && this.parcels().length > 0) {
      this.selectedChecklistParcelId.set(this.parcels()[0].id);
    }
    this.isChecklistModalOpen.set(true);
    this.loadChecklist();
  }

  closeChecklistModal(): void {
    this.isChecklistModalOpen.set(false);
  }

  onChecklistParcelSelect(parcelId: any): void {
    this.selectedChecklistParcelId.set(Number(parcelId));
    this.loadChecklist();
  }

  loadChecklist(): void {
    const id = this.selectedChecklistParcelId();
    if (!id) return;
    this.isLoadingChecklist.set(true);
    this.landService.getDocumentChecklist(id).subscribe({
      next: (data) => {
        this.checklistData.set(data);
        this.isLoadingChecklist.set(false);
      },
      error: (err) => {
        console.error('Failed to load document checklist', err);
        this.isLoadingChecklist.set(false);
      }
    });
  }

  deleteDocument(doc: LandDeedDocument): void {
    if (!confirm(`Are you sure you want to delete document "${doc.doc_title || doc.doc_number}"? This action cannot be undone.`)) {
      return;
    }
    this.landService.deleteDocument(doc.id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Failed to delete document', err)
    });
  }

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
}
