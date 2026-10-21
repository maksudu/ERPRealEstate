import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { 
  Project, 
  ProjectMetaOptions, 
  ProjectSiteOffice, 
  ProjectDocumentItem, 
  ProjectStatusHistoryEntry 
} from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-project-master',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './project-master.component.html'
})
export class ProjectMasterComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Data Signals
  projects = signal<Project[]>([]);
  metaOptions = signal<ProjectMetaOptions>({
    land_banks: [],
    parcels: [],
    landowners: [],
    companies: [],
    project_types: [],
    project_categories: [],
    project_ownerships: [],
    project_phases: [],
    lifecycle_statuses: [],
    divisions: [],
    funding_sources: [],
    departments: [],
    project_managers: [],
    project_directors: []
  });

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filter & Search Signals
  searchQuery = signal<string>('');
  selectedStatusFilter = signal<string>('');
  selectedAuthorityFilter = signal<string>('');
  selectedTypeFilter = signal<string>('');
  selectedOwnershipFilter = signal<string>('');

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalCount = signal<number>(0);

  // Modal State Signals
  isFormModalOpen = signal<boolean>(false);
  isDetailsModalOpen = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  currentProjectId = signal<number | null>(null);
  selectedProject = signal<Project | null>(null);
  activeFormTab = signal<'identity' | 'location' | 'spatial' | 'management' | 'financial' | 'sites_docs'>('identity');
  activeDetailTab = signal<'overview' | 'spatial' | 'management' | 'financial' | 'sites' | 'docs' | 'history'>('overview');

  // Sub-items Signals
  siteOffices = signal<ProjectSiteOffice[]>([]);
  projectDocuments = signal<ProjectDocumentItem[]>([]);

  // Form Group
  projectForm: FormGroup = this.fb.group({
    project_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    project_name: ['', Validators.required],
    project_name_bn: [''],
    company_name: ['Apex Properties Ltd.', Validators.required],
    project_type: ['RESIDENTIAL', Validators.required],
    project_category: ['APARTMENT', Validators.required],
    project_ownership: ['OWNED', Validators.required],
    
    division: ['Dhaka', Validators.required],
    district: ['Dhaka', Validators.required],
    thana_upazila: ['Gulshan', Validators.required],
    locality: [''],
    site_address: [''],
    latitude: [null],
    longitude: [null],
    google_maps_url: [''],
    
    land_bank_id: [null],
    parcel_id: [null],
    
    total_land_area_katha: [0],
    total_land_area_decimal: [0],
    total_land_area_sqft: [14400, [Validators.required, Validators.min(100)]],
    road_width_feet: [40, [Validators.required, Validators.min(10)]],
    far_allocated: [3.50],
    mgc_percent: [50.0],
    total_builtup_area_sqft: [0],
    total_saleable_area_sqft: [0],
    planned_construction_area_sqft: [0],
    development_authority_id: ['RAJUK', Validators.required],

    project_manager: [''],
    project_director: [''],
    department: ['Engineering & Civil Projects'],
    project_start_date: [''],
    target_completion_date: [''],
    actual_start_date: [''],
    revised_completion_date: [''],
    project_duration_months: [24],
    planned_handover_date: [''],

    project_funding_source: ['EQUITY_AND_PRE_SALES', Validators.required],
    cost_center_code: [''],
    financial_year: ['FY 2026-2027', Validators.required],
    estimated_budget_bdt: [0],
    approved_budget_bdt: [0],
    target_customer_segment: ['UPPER_MIDDLE_CLASS'],
    
    status: ['PLANNING', Validators.required],
    approval_status: ['DRAFT'],
    project_phase: ['PLANNING'],
    project_scope: [''],
    description: ['']
  });

  // KPI Computations
  totalProjectsCount = computed(() => this.projects().length);
  activeProjectsCount = computed(() => this.projects().filter(p => p.status === 'UNDER_CONSTRUCTION' || p.status === 'ACTIVE' || p.status === 'PLANNING').length);
  totalLandKatha = computed(() => this.projects().reduce((sum, p) => sum + (Number(p.total_land_area_katha) || 0), 0));
  totalApprovedBudgetBDT = computed(() => this.projects().reduce((sum, p) => sum + (Number(p.approved_budget_bdt) || Number(p.estimated_budget_bdt) || 0), 0));

  // Filtered List
  filteredProjects = computed(() => {
    let list = this.projects();
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.selectedStatusFilter();
    const authority = this.selectedAuthorityFilter();
    const type = this.selectedTypeFilter();
    const ownership = this.selectedOwnershipFilter();

    if (query) {
      list = list.filter(p => 
        p.project_name.toLowerCase().includes(query) ||
        (p.project_name_bn && p.project_name_bn.toLowerCase().includes(query)) ||
        p.project_code.toLowerCase().includes(query) ||
        (p.district && p.district.toLowerCase().includes(query)) ||
        (p.thana_upazila && p.thana_upazila.toLowerCase().includes(query)) ||
        (p.locality && p.locality.toLowerCase().includes(query)) ||
        (p.project_manager && p.project_manager.toLowerCase().includes(query)) ||
        (p.cost_center_code && p.cost_center_code.toLowerCase().includes(query))
      );
    }
    if (status) {
      list = list.filter(p => p.status === status);
    }
    if (authority) {
      list = list.filter(p => p.development_authority_id === authority);
    }
    if (type) {
      list = list.filter(p => p.project_type === type);
    }
    if (ownership) {
      list = list.filter(p => p.project_ownership === ownership);
    }

    return list;
  });

  // Paginated List
  paginatedProjects = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredProjects().slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredProjects().length / this.pageSize()) || 1);

  ngOnInit(): void {
    this.loadMetaOptions();
    this.loadProjects();
  }

  loadMetaOptions(): void {
    this.projectService.getMetaOptions().subscribe({
      next: (opts) => {
        this.metaOptions.set(opts);
      },
      error: (err) => console.error('Failed to load project meta options:', err)
    });
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data || []);
        this.totalCount.set((data || []).length);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to fetch projects master from database.');
        this.isLoading.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.isEditing.set(false);
    this.currentProjectId.set(null);
    this.activeFormTab.set('identity');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.siteOffices.set([]);
    this.projectDocuments.set([]);
    
    // Auto-generate a clean project code
    const yr = new Date().getFullYear();
    const nextNum = String(this.projects().length + 1).padStart(3, '0');
    const autoCode = `PRJ-${yr}-${nextNum}`;

    this.projectForm.reset({
      project_code: autoCode,
      project_name: '',
      project_name_bn: '',
      company_name: 'Apex Properties Ltd.',
      project_type: 'RESIDENTIAL',
      project_category: 'APARTMENT',
      project_ownership: 'OWNED',
      division: 'Dhaka',
      district: 'Dhaka',
      thana_upazila: 'Gulshan',
      locality: '',
      site_address: '',
      latitude: null,
      longitude: null,
      google_maps_url: '',
      land_bank_id: null,
      parcel_id: null,
      total_land_area_katha: 0,
      total_land_area_decimal: 0,
      total_land_area_sqft: 14400,
      road_width_feet: 40,
      far_allocated: 3.50,
      mgc_percent: 50.0,
      total_builtup_area_sqft: 50400,
      total_saleable_area_sqft: 39312,
      planned_construction_area_sqft: 50400,
      development_authority_id: 'RAJUK',
      project_manager: 'Engr. Tariqul Islam, PMP',
      project_director: 'Tanvir Ahmed, Managing Director',
      department: 'Engineering & Civil Projects',
      project_start_date: new Date().toISOString().split('T')[0],
      target_completion_date: '',
      actual_start_date: '',
      revised_completion_date: '',
      project_duration_months: 24,
      planned_handover_date: '',
      project_funding_source: 'EQUITY_AND_PRE_SALES',
      cost_center_code: `CC-${autoCode}`,
      financial_year: 'FY 2026-2027',
      estimated_budget_bdt: 0,
      approved_budget_bdt: 0,
      target_customer_segment: 'UPPER_MIDDLE_CLASS',
      status: 'PLANNING',
      approval_status: 'DRAFT',
      project_phase: 'PLANNING',
      project_scope: '',
      description: ''
    });

    this.isFormModalOpen.set(true);
  }

  openEditModal(p: Project): void {
    this.isEditing.set(true);
    this.currentProjectId.set(p.id);
    this.activeFormTab.set('identity');
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.siteOffices.set(p.site_offices ? [...p.site_offices] : []);
    this.projectDocuments.set(p.project_documents ? [...p.project_documents] : []);

    this.projectForm.patchValue({
      project_code: p.project_code,
      project_name: p.project_name,
      project_name_bn: p.project_name_bn || '',
      company_name: p.company_name || 'Apex Properties Ltd.',
      project_type: p.project_type || 'RESIDENTIAL',
      project_category: p.project_category || 'APARTMENT',
      project_ownership: p.project_ownership || 'OWNED',
      division: p.division || 'Dhaka',
      district: p.district || 'Dhaka',
      thana_upazila: p.thana_upazila || 'Gulshan',
      locality: p.locality || '',
      site_address: p.site_address || '',
      latitude: p.latitude || null,
      longitude: p.longitude || null,
      google_maps_url: p.google_maps_url || '',
      land_bank_id: p.land_bank_id || null,
      parcel_id: p.parcel_id || null,
      total_land_area_katha: p.total_land_area_katha || 0,
      total_land_area_decimal: p.total_land_area_decimal || 0,
      total_land_area_sqft: p.total_land_area_sqft || p.plot_area_sqft || 0,
      road_width_feet: p.road_width_feet || 40,
      far_allocated: p.far_allocated || 3.50,
      mgc_percent: p.mgc_percent || 50.0,
      total_builtup_area_sqft: p.total_builtup_area_sqft || 0,
      total_saleable_area_sqft: p.total_saleable_area_sqft || 0,
      planned_construction_area_sqft: p.planned_construction_area_sqft || p.total_builtup_area_sqft || 0,
      development_authority_id: p.development_authority_id || 'RAJUK',
      project_manager: p.project_manager || '',
      project_director: p.project_director || '',
      department: p.department || 'Engineering & Civil Projects',
      project_start_date: p.project_start_date || '',
      target_completion_date: p.target_completion_date || '',
      actual_start_date: p.actual_start_date || '',
      revised_completion_date: p.revised_completion_date || '',
      project_duration_months: p.project_duration_months || 24,
      planned_handover_date: p.planned_handover_date || '',
      project_funding_source: p.project_funding_source || 'EQUITY_AND_PRE_SALES',
      cost_center_code: p.cost_center_code || `CC-${p.project_code}`,
      financial_year: p.financial_year || 'FY 2026-2027',
      estimated_budget_bdt: p.estimated_budget_bdt || 0,
      approved_budget_bdt: p.approved_budget_bdt || 0,
      target_customer_segment: p.target_customer_segment || 'UPPER_MIDDLE_CLASS',
      status: p.status || 'PLANNING',
      approval_status: p.approval_status || 'DRAFT',
      project_phase: p.project_phase || 'PLANNING',
      project_scope: p.project_scope || '',
      description: p.description || ''
    });

    this.isFormModalOpen.set(true);
  }

  viewProjectDetails(p: Project): void {
    this.selectedProject.set(p);
    this.activeDetailTab.set('overview');
    this.isDetailsModalOpen.set(true);
  }

  // Site Offices Actions
  addSiteOffice(): void {
    this.siteOffices.update(list => [
      ...list,
      { office_name: '', site_address: '', engineer_in_charge: '', contact_phone: '' }
    ]);
  }

  removeSiteOffice(index: number): void {
    this.siteOffices.update(list => list.filter((_, i) => i !== index));
  }

  updateSiteOffice(index: number, field: keyof ProjectSiteOffice, val: string): void {
    this.siteOffices.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }

  // Document Repository Actions
  addProjectDocument(): void {
    this.projectDocuments.update(list => [
      ...list,
      {
        title: '',
        doc_type: 'SITE_LAYOUT_PLAN',
        file_url: '',
        upload_date: new Date().toISOString().split('T')[0],
        uploaded_by: 'PMO Admin'
      }
    ]);
  }

  removeProjectDocument(index: number): void {
    this.projectDocuments.update(list => list.filter((_, i) => i !== index));
  }

  updateProjectDocument(index: number, field: keyof ProjectDocumentItem, val: any): void {
    this.projectDocuments.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  }

  onDocumentUpload(event: any, index: number): void {
    const file = event.target.files?.[0];
    if (file) {
      const mockUrl = `/uploads/project_docs/${Date.now()}_${file.name}`;
      this.updateProjectDocument(index, 'file_url', mockUrl);
      if (!this.projectDocuments()[index].title) {
        this.updateProjectDocument(index, 'title', file.name.replace(/\.[^/.]+$/, ""));
      }
      this.updateProjectDocument(index, 'file_size_kb', Math.round(file.size / 1024));
    }
  }

  onLandBankSelected(landBankId: any): void {
    if (!landBankId) return;
    const option = this.metaOptions().land_banks.find(lb => lb.value === Number(landBankId));
    if (option) {
      this.projectForm.patchValue({
        total_land_area_katha: option.katha,
        total_land_area_decimal: option.decimal,
        total_land_area_sqft: option.sqft,
        thana_upazila: option.thana || this.projectForm.get('thana_upazila')?.value,
        district: option.district || this.projectForm.get('district')?.value
      });
      this.recalculateFAR();
    }
  }

  onParcelSelected(parcelId: any): void {
    if (!parcelId) return;
    const option = this.metaOptions().parcels?.find(p => p.value === Number(parcelId));
    if (option) {
      this.projectForm.patchValue({
        total_land_area_decimal: option.decimal,
        total_land_area_sqft: option.sqft,
        locality: option.mouza || this.projectForm.get('locality')?.value
      });
      this.recalculateFAR();
    }
  }

  onAreaOrRoadChanged(): void {
    this.recalculateFAR();
  }

  recalculateFAR(): void {
    const plotSqft = Number(this.projectForm.get('total_land_area_sqft')?.value) || 0;
    const roadWidth = Number(this.projectForm.get('road_width_feet')?.value) || 40;
    if (plotSqft > 0 && roadWidth > 0) {
      this.projectService.calculateFAR({ plot_area_sqft: plotSqft, road_width_feet: roadWidth }).subscribe({
        next: (res) => {
          this.projectForm.patchValue({
            total_land_area_katha: res.plot_katha,
            far_allocated: res.permissible_far,
            mgc_percent: res.mgc_percent,
            total_builtup_area_sqft: res.max_permissible_builtup_sqft,
            total_saleable_area_sqft: res.estimated_saleable_sqft,
            planned_construction_area_sqft: res.max_permissible_builtup_sqft
          });
        }
      });
    }
  }

  onDateChanged(): void {
    const startStr = this.projectForm.get('project_start_date')?.value;
    const targetStr = this.projectForm.get('target_completion_date')?.value;
    if (startStr && targetStr) {
      const s = new Date(startStr);
      const t = new Date(targetStr);
      const months = Math.max(1, Math.round((t.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
      this.projectForm.patchValue({
        project_duration_months: months,
        planned_handover_date: targetStr
      });
    }
  }

  submitProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.errorMessage.set('Please fill in all mandatory fields.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    
    // Attach nested site offices and documents
    const payload = {
      ...this.projectForm.value,
      site_offices: this.siteOffices(),
      project_documents: this.projectDocuments()
    };

    if (this.isEditing() && this.currentProjectId()) {
      this.projectService.updateProject(this.currentProjectId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isFormModalOpen.set(false);
          this.successMessage.set('Project details updated successfully!');
          this.loadProjects();
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update project.');
        }
      });
    } else {
      this.projectService.createProject(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isFormModalOpen.set(false);
          this.successMessage.set('New project master record registered successfully!');
          this.loadProjects();
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to register project.');
        }
      });
    }
  }

  deleteProject(p: Project): void {
    if (confirm(`Are you sure you want to delete project '${p.project_name}' (${p.project_code})?`)) {
      this.projectService.deleteProject(p.id).subscribe({
        next: () => {
          this.successMessage.set(`Project ${p.project_code} deleted successfully.`);
          this.loadProjects();
          setTimeout(() => this.successMessage.set(null), 4000);
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to delete project.');
        }
      });
    }
  }

  goToPage(pg: number): void {
    if (pg >= 1 && pg <= this.totalPages()) {
      this.currentPage.set(pg);
    }
  }
}
