import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower } from '../../../core/models/project.model';
import {
  Unit,
  PropertyDocumentItem,
  PropertyDocumentSummary,
  PropertyDocumentType,
  PropertyDocumentVisibility
} from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  ModalComponent
} from '../../../shared/components';

@Component({
  selector: 'app-property-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './property-documents.component.html'
})
export class PropertyDocumentsComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Workspace Tab: 'repository' | 'gallery' | 'superseded'
  activeTab = signal<'repository' | 'gallery' | 'superseded'>('repository');

  // Master Data Signals
  projects = signal<Project[]>([]);
  towers = signal<Tower[]>([]);
  units = signal<Unit[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedTowerId = signal<number | null>(null);

  // Summary Metrics Signal
  summary = signal<PropertyDocumentSummary | null>(null);

  // Paged Documents Signals
  documents = signal<PropertyDocumentItem[]>([]);
  documentsTotal = signal<number>(0);
  documentsLimit = signal<number>(10);
  documentsOffset = signal<number>(0);

  // Filters
  documentTypeFilter = signal<string>('ALL');
  visibilityFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');
  searchQuery = signal<string>('');

  // Gallery Filter
  galleryCategory = signal<string>('ALL');

  // Modal Visibility Signals
  isUploadModalOpen = signal<boolean>(false);
  isPreviewModalOpen = signal<boolean>(false);
  isSupersedeModalOpen = signal<boolean>(false);
  isApproveModalOpen = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);

  selectedDocument = signal<PropertyDocumentItem | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Forms
  uploadForm!: FormGroup;
  supersedeForm!: FormGroup;
  approveForm!: FormGroup;
  editForm!: FormGroup;
  selectedFile: File | null = null;

  // Toast Feedback
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'warning' | 'info'>('info');

  // Dropdown Options
  projectOptions = computed(() => [
    { value: null, label: 'All Projects (Consolidated)' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  ]);

  projectOptionsForUpload = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  );

  towerOptions = computed(() => [
    { value: null, label: 'Entire Project / Master Level' },
    ...this.towers().map(t => ({
      value: t.id,
      label: `${t.tower_code} - ${t.tower_name}`
    }))
  ]);

  unitOptions = computed(() => [
    { value: null, label: 'None (Building / Floor Wide Document)' },
    ...this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (Floor ${u.floor_number} - ${u.unit_type_id})`
    }))
  ]);

  documentTypeOptions = [
    { value: 'PROJECT_BROCHURE', label: 'Project Brochure & Marketing Kit' },
    { value: 'APPROVED_FLOOR_PLAN', label: 'Approved Floor Plan (RAJUK / Authority)' },
    { value: 'TOWER_LAYOUT', label: 'Tower & Building Stacking Layout' },
    { value: 'FLOOR_LAYOUT', label: 'Floor-wise Typical Layout' },
    { value: 'INDIVIDUAL_UNIT_PLAN', label: 'Individual Unit / Flat Floor Plan' },
    { value: 'UNIT_PHOTOGRAPH', label: 'Unit Real-Site Photograph' },
    { value: 'SAMPLE_INTERIOR_IMAGE', label: 'Sample Interior 3D Render Image' },
    { value: 'ARCHITECTURAL_SPEC', label: 'Architectural & Engineering Specifications' },
    { value: 'AREA_MEASUREMENT_SHEET', label: 'Area Measurement & FAR Sheet' },
    { value: 'FINISHING_FIXTURE_SCHEDULE', label: 'Finishing & Fixture Material Schedule' },
    { value: 'PARKING_LAYOUT', label: 'Basement / Ground Parking Layout' },
    { value: 'APPROVAL_CERTIFICATE', label: 'Regulatory Approval & Occupancy Certificate' }
  ];

  filterDocumentTypeOptions = [
    { value: 'ALL', label: 'All Document Types' },
    ...this.documentTypeOptions
  ];

  visibilityOptions = [
    { value: 'PUBLIC_SALES_PORTAL', label: 'Public Sales Portal (Customer Viewable)' },
    { value: 'INTERNAL_SALES_AGENT', label: 'Internal Sales Agents Only' },
    { value: 'RESTRICTED_CONFIDENTIAL', label: 'Restricted / Confidential Technical' }
  ];

  filterVisibilityOptions = [
    { value: 'ALL', label: 'All Visibility Levels' },
    ...this.visibilityOptions
  ];

  statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PENDING', label: 'Pending Review' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  // Gallery items computed
  galleryItems = computed(() =>
    this.documents().filter(d =>
      d.document_type === 'UNIT_PHOTOGRAPH' ||
      d.document_type === 'SAMPLE_INTERIOR_IMAGE' ||
      d.document_type === 'APPROVED_FLOOR_PLAN' ||
      d.document_type === 'INDIVIDUAL_UNIT_PLAN' ||
      d.document_type === 'PARKING_LAYOUT'
    )
  );

  formatLabel(val?: string): string {
    return val ? val.replace(/_/g, ' ') : '';
  }

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadDocuments();
    this.loadSummary();
  }

  private initForms(): void {
    // 1. Upload Form
    this.uploadForm = this.fb.group({
      project_id: [null, [Validators.required]],
      tower_id: [null],
      floor_number: [null],
      unit_id: [null],
      document_type: ['APPROVED_FLOOR_PLAN', [Validators.required]],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      version_tag: ['v1.0', [Validators.required]],
      visibility: ['RESTRICTED_CONFIDENTIAL', [Validators.required]],
      uploader_name: ['Senior Architect', [Validators.required]],
      tags: [''],
      notes: ['']
    });

    // 2. Supersede Form
    this.supersedeForm = this.fb.group({
      new_version_tag: ['v2.0', [Validators.required]],
      new_file_url: ['', [Validators.required]],
      new_file_size_kb: [1200],
      new_file_extension: ['.pdf'],
      new_mime_type: ['application/pdf'],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });

    // 3. Approval Form
    this.approveForm = this.fb.group({
      approval_status: ['APPROVED', [Validators.required]],
      approved_by: ['Chief Architect / Sales Director', [Validators.required]],
      visibility: ['PUBLIC_SALES_PORTAL'],
      notes: ['']
    });

    // 4. Edit Metadata Form
    this.editForm = this.fb.group({
      title: ['', [Validators.required]],
      document_type: ['', [Validators.required]],
      tower_id: [null],
      floor_number: [null],
      unit_id: [null],
      visibility: ['', [Validators.required]],
      tags: [''],
      notes: ['']
    });
  }

  // ==========================================
  // Data Fetching
  // ==========================================
  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadProjectDetails(data[0].id);
        }
      },
      error: () => this.showToast('Failed to load project registry.', 'error')
    });
  }

  loadProjectDetails(projectId: number): void {
    this.inventoryService.getUnits({ project_id: projectId }).subscribe({
      next: (units) => this.units.set(units),
      error: () => {}
    });
  }

  onProjectFilterChange(projectId: number | null): void {
    this.selectedProjectId.set(projectId);
    this.documentsOffset.set(0);
    this.loadDocuments();
    this.loadSummary();
    if (projectId) {
      this.loadProjectDetails(projectId);
    }
  }

  loadSummary(): void {
    this.inventoryService.getPropertyDocumentSummary(this.selectedProjectId() || undefined).subscribe({
      next: (data) => this.summary.set(data),
      error: () => {}
    });
  }

  loadDocuments(): void {
    this.isLoading.set(true);
    const isSupersededFilter = this.activeTab() === 'superseded' ? true : (this.activeTab() === 'repository' ? false : undefined);

    this.inventoryService.getPropertyDocumentsPaged({
      project_id: this.selectedProjectId() || undefined,
      tower_id: this.selectedTowerId() || undefined,
      document_type: this.documentTypeFilter(),
      visibility: this.visibilityFilter(),
      approval_status: this.statusFilter(),
      is_superseded: isSupersededFilter,
      search: this.searchQuery() || undefined,
      limit: this.documentsLimit(),
      offset: this.documentsOffset()
    }).subscribe({
      next: (res) => {
        this.documents.set(res.items);
        this.documentsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.showToast('Failed to load property documents.', 'error');
      }
    });
  }

  switchTab(tab: 'repository' | 'gallery' | 'superseded'): void {
    this.activeTab.set(tab);
    this.documentsOffset.set(0);
    this.loadDocuments();
  }

  // ==========================================
  // Document Operations & Modals
  // ==========================================
  openUploadModal(): void {
    this.selectedFile = null;
    this.uploadForm.reset({
      project_id: this.selectedProjectId() || (this.projects().length ? this.projects()[0].id : null),
      tower_id: null,
      floor_number: null,
      unit_id: null,
      document_type: 'APPROVED_FLOOR_PLAN',
      title: '',
      version_tag: 'v1.0',
      visibility: 'RESTRICTED_CONFIDENTIAL',
      uploader_name: 'Senior Architect',
      tags: '',
      notes: ''
    });
    this.isUploadModalOpen.set(true);
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      if (!this.uploadForm.get('title')?.value) {
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        this.uploadForm.patchValue({ title: cleanName.replace(/[-_]/g, ' ') });
      }
    }
  }

  submitUpload(): void {
    if (this.uploadForm.invalid) {
      this.uploadForm.markAllAsTouched();
      return;
    }
    if (!this.selectedFile) {
      this.showToast('Please select a document or image file to upload.', 'warning');
      return;
    }

    this.isSubmitting.set(true);
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    const values = this.uploadForm.value;
    Object.keys(values).forEach(key => {
      if (values[key] !== null && values[key] !== undefined) {
        formData.append(key, values[key]);
      }
    });

    this.inventoryService.uploadPropertyDocument(formData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isUploadModalOpen.set(false);
        this.showToast(`Document "${res.title}" uploaded and registered successfully.`, 'success');
        this.loadDocuments();
        this.loadSummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'File upload failed.', 'error');
      }
    });
  }

  openPreviewModal(doc: PropertyDocumentItem): void {
    this.selectedDocument.set(doc);
    this.isPreviewModalOpen.set(true);
  }

  openEditModal(doc: PropertyDocumentItem): void {
    this.selectedDocument.set(doc);
    this.editForm.reset({
      title: doc.title,
      document_type: doc.document_type,
      tower_id: doc.tower_id || null,
      floor_number: doc.floor_number || null,
      unit_id: doc.unit_id || null,
      visibility: doc.visibility,
      tags: doc.tags || '',
      notes: doc.notes || ''
    });
    this.isEditModalOpen.set(true);
  }

  submitEdit(): void {
    const doc = this.selectedDocument();
    if (!doc || this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.inventoryService.updatePropertyDocument(doc.id, this.editForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isEditModalOpen.set(false);
        this.showToast('Document metadata updated successfully.', 'success');
        this.loadDocuments();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Update failed.', 'error');
      }
    });
  }

  openApproveModal(doc: PropertyDocumentItem): void {
    this.selectedDocument.set(doc);
    this.approveForm.reset({
      approval_status: 'APPROVED',
      approved_by: 'Chief Architect / Sales Director',
      visibility: 'PUBLIC_SALES_PORTAL',
      notes: ''
    });
    this.isApproveModalOpen.set(true);
  }

  submitApproval(): void {
    const doc = this.selectedDocument();
    if (!doc || this.approveForm.invalid) {
      this.approveForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.inventoryService.approvePropertyDocument(doc.id, this.approveForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isApproveModalOpen.set(false);
        this.showToast(`Document marked as ${res.approval_status}. Portal visibility updated.`, 'success');
        this.loadDocuments();
        this.loadSummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Approval submission failed.', 'error');
      }
    });
  }

  openSupersedeModal(doc: PropertyDocumentItem): void {
    this.selectedDocument.set(doc);
    // suggest next version e.g. v1.1 or v2.0
    const nextVer = doc.version_tag.startsWith('v1') ? 'v2.0' : 'v3.0';
    this.supersedeForm.reset({
      new_version_tag: nextVer,
      new_file_url: '',
      new_file_size_kb: doc.file_size_kb,
      new_file_extension: doc.file_extension,
      new_mime_type: doc.mime_type,
      reason: 'Updated architectural or regulatory revision superseded prior version'
    });
    this.isSupersedeModalOpen.set(true);
  }

  submitSupersede(): void {
    const doc = this.selectedDocument();
    if (!doc || this.supersedeForm.invalid) {
      this.supersedeForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.inventoryService.supersedePropertyDocument(doc.id, this.supersedeForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.isSupersedeModalOpen.set(false);
        this.showToast(`New revision ${res.version_tag} issued. Historical document #${doc.id} archived as superseded.`, 'success');
        this.loadDocuments();
        this.loadSummary();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to supersede document.', 'error');
      }
    });
  }

  deleteDocument(doc: PropertyDocumentItem): void {
    if (!confirm(`Are you sure you want to delete document "${doc.title}"?`)) return;
    this.inventoryService.deletePropertyDocument(doc.id).subscribe({
      next: () => {
        this.showToast('Document deleted.', 'success');
        this.loadDocuments();
        this.loadSummary();
      },
      error: (err) => this.showToast(err.error?.detail || 'Failed to delete document.', 'error')
    });
  }

  // ==========================================
  // Pagination Handlers
  // ==========================================
  nextPage(): void {
    if (this.documentsOffset() + this.documentsLimit() < this.documentsTotal()) {
      this.documentsOffset.update(v => v + this.documentsLimit());
      this.loadDocuments();
    }
  }

  prevPage(): void {
    if (this.documentsOffset() > 0) {
      this.documentsOffset.update(v => Math.max(0, v - this.documentsLimit()));
      this.loadDocuments();
    }
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }
}
