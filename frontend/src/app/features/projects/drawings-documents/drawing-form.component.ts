import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Tower, AuthorityClearance, Drawing } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-drawing-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Top Navigation & Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border rounded-xl p-4 sm:p-5 shadow-xs">
        <div class="flex items-center gap-3">
          <a
            routerLink="/projects/drawings-documents"
            class="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Back to Drawings Vault"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                Submodule 2.9
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Sheet #' + drawingId() : 'New Drawing / Document' }}
              </span>
            </div>
            <h1 class="text-lg font-bold text-foreground font-display mt-0.5">
              {{ isEditMode() ? 'Edit Architectural Drawing & Document' : 'Register New Architectural / Engineering Drawing' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <a
            routerLink="/projects/drawings-documents"
            class="px-4 py-2 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveDrawing()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Drawing Record' : 'Save Drawing to Vault' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Critical IFC Protocol Alert -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-start gap-2.5">
        <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <strong>Issued for Construction (IFC) Protocol:</strong>
          Marking a drawing as <em>Approved for Construction (IFC)</em> automatically supersedes and marks obsolete all earlier revisions under the same drawing number. Construction and site engineering teams must only execute work from active IFC-stamped drawing sets.
        </div>
      </div>

      <!-- Main Form -->
      <form [formGroup]="form" class="space-y-6">
        <!-- Section 1: Project & Spatial Association -->
        <app-card-container
          title="1. Spatial & Project Association"
          subtitle="Link document to development project, building tower, floor level, and statutory clearance"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="Select Project"
              [options]="projectOptions()"
              [searchable]="true"
              formControlName="project_id"
              [required]="true"
              (ngModelChange)="onProjectSelected($event)"
            ></app-searchable-select>

            <app-searchable-select
              label="Building Tower / Block"
              [options]="towerOptions()"
              [searchable]="true"
              formControlName="tower_id"
              placeholder="Full Project / All Towers"
            ></app-searchable-select>

            <app-searchable-select
              label="Applicable Floor Level"
              [options]="floorOptions"
              formControlName="floor_level"
              [searchable]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Linked Regulatory Sanction"
              [options]="clearanceOptions()"
              [searchable]="true"
              formControlName="approval_clearance_id"
              placeholder="Optional Authority Clearance"
            ></app-searchable-select>
          </div>
        </app-card-container>

        <!-- Section 2: Drawing Classification & Identification -->
        <app-card-container
          title="2. Document Classification & Revision Identification"
          subtitle="Unique drawing number, document category, engineering discipline, and revision code"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="Document Category"
              [options]="categoryOptions"
              formControlName="drawing_category_id"
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Engineering Discipline"
              [options]="disciplineOptions"
              formControlName="discipline"
              [required]="true"
            ></app-searchable-select>

            <app-custom-input
              label="Drawing / Document Number"
              formControlName="drawing_number"
              placeholder="e.g. STR-COL-001"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Revision Number"
              formControlName="revision_number"
              placeholder="e.g. R0, R1, Rev A"
              [required]="true"
            ></app-custom-input>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-input
              label="Drawing Title / Description"
              formControlName="drawing_title"
              placeholder="e.g. Basement 1 & 2 Column Layout & Shear Wall Reinforcement Schedule"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Construction Package"
              formControlName="construction_package"
              placeholder="e.g. Sub-Structure & Piling RCC, Super-Structure Frame"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 3: Authorship, Dates & Approval Status -->
        <app-card-container
          title="3. Authorship, Issuance & IFC Approval Sanction"
          subtitle="Drafting consultant firm, issue date, Chief Engineer sign-off, and status workflow"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-custom-input
              label="Author / Consultant Firm"
              formControlName="author"
              placeholder="e.g. Apex Structural Consultants Ltd."
            ></app-custom-input>

            <app-custom-input
              label="Date of Issue"
              type="date"
              formControlName="issue_date"
            ></app-custom-input>

            <app-searchable-select
              label="Approval & Lifecycle Status"
              [options]="statusOptions"
              formControlName="status"
              [required]="true"
              (ngModelChange)="onStatusChange($event)"
            ></app-searchable-select>

            <app-searchable-select
              label="Issued for Construction (IFC)?"
              [options]="ifcOptions"
              formControlName="is_approved_for_construction"
            ></app-searchable-select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <app-custom-input
              label="Approved / Vetted By (Chief Engineer / Director)"
              formControlName="approved_by"
              placeholder="e.g. Engr. Kazi Mahfuzur Rahman (Chief Structural Engineer)"
            ></app-custom-input>

            <app-custom-input
              label="Approval / Sign-off Date"
              type="date"
              formControlName="approval_date"
            ></app-custom-input>
          </div>
        </app-card-container>

        <!-- Section 4: File Storage, Digital Assets & Confidentiality -->
        <app-card-container
          title="4. Digital Assets, CAD Files & Security Restrictions"
          subtitle="File URL (PDF, DWG, DXF, IFC, XLSX), file size, and role-based access control"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <app-searchable-select
              label="File Format / Extension"
              [options]="fileTypeOptions"
              formControlName="file_type"
            ></app-searchable-select>

            <app-custom-input
              label="File Name"
              formControlName="file_name"
              placeholder="e.g. STR_COL_001_R1.pdf"
            ></app-custom-input>

            <app-custom-input
              label="File Size (MB)"
              type="number"
              formControlName="file_size_mb"
              placeholder="e.g. 18.5"
            ></app-custom-input>

            <app-searchable-select
              label="Access Role Restriction"
              [options]="accessRoleOptions"
              formControlName="access_role"
            ></app-searchable-select>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div class="md:col-span-2">
              <app-custom-input
                label="Direct Document / Cloud Storage URL"
                formControlName="file_url"
                placeholder="e.g. /uploads/drawings/STR_COL_001_R1.pdf"
              ></app-custom-input>
            </div>

            <div class="flex items-center pt-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  formControlName="is_confidential"
                  class="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span class="text-xs font-semibold text-foreground">Mark as Confidential Document</span>
              </label>
            </div>
          </div>
        </app-card-container>

        <!-- Section 5: Revision Change Log & Technical Notes -->
        <app-card-container
          title="5. Revision Notes & Modification Log"
          subtitle="Record specific changes made in this revision for site teams and historical audits"
        >
          <div>
            <app-custom-textarea
              label="Revision Change Summary & Remarks"
              formControlName="revision_notes"
              [rows]="3"
              placeholder="Detailed description of changes in this revision (e.g. Added 4 additional 25mm dia rebars in Column C4; cover concrete modified to 75mm per soil report)..."
            ></app-custom-textarea>
          </div>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-4">
          <a
            routerLink="/projects/drawings-documents"
            class="px-5 py-2.5 text-xs font-medium rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            [variant]="'primary'"
            [loading]="saving()"
            (buttonClick)="saveDrawing()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditMode() ? 'Update Drawing Record' : 'Save Drawing to Vault' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class DrawingFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  drawingId = signal<number | null>(null);
  saving = signal<boolean>(false);

  projects = signal<Project[]>([]);
  towers = signal<Tower[]>([]);
  clearances = signal<AuthorityClearance[]>([]);

  categoryOptions: SelectOption[] = [
    { value: 'CONCEPT_ARCHITECTURAL', label: '1. Concept & Architectural Drawings' },
    { value: 'STRUCTURAL_CALC', label: '2. Structural Drawings & Calculations' },
    { value: 'ELECTRICAL_PLUMBING', label: '3. Electrical & Plumbing Drawings (MEP)' },
    { value: 'HVAC_FIRE_SAFETY', label: '4. HVAC & Fire-Safety Plans' },
    { value: 'SOIL_SURVEY', label: '5. Soil Investigation & Survey Reports' },
    { value: 'BOQ_SPECIFICATIONS', label: '6. Bill of Quantities (BOQ) & Specs' },
    { value: 'CONSTRUCTION_SHOP', label: '7. Construction Drawings & Shop Drawings' },
    { value: 'AUTHORITY_APPROVED', label: '8. Approved Plans & Authority Correspondence' },
    { value: 'METHOD_INSPECTION', label: '9. Method Statements & Inspection Reports' },
    { value: 'CONTRACT_VARIATION', label: '10. Contractor Agreements & Variations' },
    { value: 'AS_BUILT_HANDOVER', label: '11. As-Built Drawings & Handover Set' }
  ];

  disciplineOptions: SelectOption[] = [
    { value: 'ARCHITECTURAL', label: 'Architectural' },
    { value: 'STRUCTURAL', label: 'Structural' },
    { value: 'ELECTRICAL', label: 'Electrical & Substation' },
    { value: 'PLUMBING', label: 'Plumbing & Drainage' },
    { value: 'HVAC', label: 'HVAC & Mechanical' },
    { value: 'FIRE_SAFETY', label: 'Fire Safety & Hydrant' },
    { value: 'CIVIL_SURVEY', label: 'Civil Survey & Soil Geotech' },
    { value: 'BOQ_SPEC', label: 'BOQ & Cost Specifications' },
    { value: 'CONTRACTUAL', label: 'Legal & Contractual' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'DRAFT', label: 'Draft / Work in Progress' },
    { value: 'UNDER_REVIEW', label: 'Under Review / Technical Vetting' },
    { value: 'APPROVED_FOR_CONSTRUCTION', label: 'Approved for Construction (IFC Active)' },
    { value: 'SUPERSEDED', label: 'Superseded (Obsolete / Historical Audit)' },
    { value: 'AS_BUILT', label: 'As-Built Certified (Handover)' }
  ];

  ifcOptions: SelectOption[] = [
    { value: true, label: 'YES — Issued for Construction (IFC)' },
    { value: false, label: 'NO — Preliminary / Draft' }
  ];

  floorOptions: SelectOption[] = [
    { value: 'Site Master', label: 'Site Master & Ground Boundary' },
    { value: 'Basement 2', label: 'Basement 2 (Piling & Deep Sump)' },
    { value: 'Basement 1', label: 'Basement 1 (Parking & Substation)' },
    { value: 'Ground Floor', label: 'Ground Floor (Lobby & Entry)' },
    { value: 'Podium 1-3', label: 'Podium Floors (Parking & Commercial)' },
    { value: 'Typical 1-14', label: 'Typical Floors (Floors 1-14)' },
    { value: 'Roof Level', label: 'Roof Level & Overhead Tank' },
    { value: 'Full Tower', label: 'Full Tower / Whole Building' }
  ];

  fileTypeOptions: SelectOption[] = [
    { value: 'PDF', label: 'PDF Document' },
    { value: 'DWG', label: 'AutoCAD Drawing (.dwg)' },
    { value: 'DXF', label: 'Drawing Exchange (.dxf)' },
    { value: 'IFC', label: 'Building Model (.ifc)' },
    { value: 'XLSX', label: 'Excel Spreadsheet (.xlsx)' },
    { value: 'DOCX', label: 'Word Document (.docx)' },
    { value: 'IMG', label: 'High-Res Image (.png/.jpg)' }
  ];

  accessRoleOptions: SelectOption[] = [
    { value: 'ALL_ROLES', label: 'Public to All Project Staff' },
    { value: 'PROJECT_TEAM', label: 'Site Engineers & Project Team' },
    { value: 'CHIEF_ENGINEER', label: 'Chief Engineer & Lead Consultants' },
    { value: 'MANAGEMENT_ONLY', label: 'Directors & Senior Management Only' }
  ];

  projectOptions = computed<SelectOption[]>(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  towerOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: null, label: 'Whole Project / Common Infrastructure' }];
    this.towers().forEach(t => {
      list.push({
        value: t.id,
        label: `${t.tower_name} (${t.tower_code})`
      });
    });
    return list;
  });

  clearanceOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: null, label: 'None / Internal Engineering' }];
    this.clearances().forEach(c => {
      list.push({
        value: c.id,
        label: `${c.authority_name} - ${c.reference_no} (${c.approved_memo_no || c.clearance_type_id})`
      });
    });
    return list;
  });

  form: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    tower_id: [null],
    approval_clearance_id: [null],
    drawing_category_id: ['CONSTRUCTION_SHOP', Validators.required],
    drawing_number: ['', Validators.required],
    drawing_title: ['', Validators.required],
    discipline: ['ARCHITECTURAL', Validators.required],
    revision_number: ['R0', Validators.required],
    floor_level: ['Typical 1-14'],
    construction_package: [''],
    author: [''],
    issue_date: [''],
    status: ['DRAFT', Validators.required],
    is_approved_for_construction: [false],
    approved_by: [''],
    approval_date: [''],
    file_url: [''],
    file_name: [''],
    file_size_mb: [0.0],
    file_type: ['PDF'],
    is_confidential: [false],
    access_role: ['PROJECT_TEAM'],
    revision_notes: ['']
  });

  ngOnInit(): void {
    this.loadProjects();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.drawingId.set(Number(id));
      this.loadDrawing(Number(id));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data || []);
        if (!this.isEditMode() && data.length > 0 && !this.form.get('project_id')?.value) {
          const first = data[0];
          this.form.patchValue({
            project_id: first.id,
            drawing_number: `ARC-${first.project_code}-TYP-001`,
            issue_date: new Date().toISOString().substring(0, 10)
          });
          this.loadTowersAndClearances(first.id);
        }
      }
    });
  }

  onProjectSelected(projectId: any): void {
    if (projectId) {
      this.loadTowersAndClearances(Number(projectId));
      const proj = this.projects().find(p => p.id === Number(projectId));
      if (proj && !this.isEditMode()) {
        const disc = this.form.get('discipline')?.value?.substring(0, 3) || 'ARC';
        this.form.patchValue({
          drawing_number: `${disc}-${proj.project_code}-001`
        });
      }
    }
  }

  loadTowersAndClearances(projectId: number): void {
    // Load towers
    this.projectService.getTowers(projectId).subscribe({
      next: (data: Tower[]) => this.towers.set(data || [])
    });

    // Load clearances
    this.projectService.getClearances({ project_id: projectId }).subscribe({
      next: (resp: any) => {
        const list = resp?.items || resp || [];
        this.clearances.set(list);
      }
    });
  }

  onStatusChange(statusVal: string): void {
    if (statusVal === 'APPROVED_FOR_CONSTRUCTION') {
      this.form.patchValue({
        is_approved_for_construction: true,
        approval_date: new Date().toISOString().substring(0, 10)
      });
    } else if (statusVal === 'SUPERSEDED' || statusVal === 'DRAFT') {
      this.form.patchValue({
        is_approved_for_construction: false
      });
    }
  }

  loadDrawing(id: number): void {
    this.projectService.getDrawingById(id).subscribe({
      next: (d: Drawing) => {
        this.form.patchValue({
          project_id: d.project_id,
          tower_id: d.tower_id,
          approval_clearance_id: d.approval_clearance_id,
          drawing_category_id: d.drawing_category_id,
          drawing_number: d.drawing_number,
          drawing_title: d.drawing_title,
          discipline: d.discipline,
          revision_number: d.revision_number,
          floor_level: d.floor_level || 'Typical 1-14',
          construction_package: d.construction_package || '',
          author: d.author || '',
          issue_date: d.issue_date ? d.issue_date.substring(0, 10) : '',
          status: d.status,
          is_approved_for_construction: d.is_approved_for_construction,
          approved_by: d.approved_by || '',
          approval_date: d.approval_date ? d.approval_date.substring(0, 10) : '',
          file_url: d.file_url || '',
          file_name: d.file_name || '',
          file_size_mb: d.file_size_mb || 0.0,
          file_type: d.file_type || 'PDF',
          is_confidential: d.is_confidential,
          access_role: d.access_role || 'PROJECT_TEAM',
          revision_notes: d.revision_notes || ''
        });

        if (d.project_id) {
          this.loadTowersAndClearances(d.project_id);
        }
      }
    });
  }

  saveDrawing(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const payload = { ...this.form.value };
    payload.project_id = Number(payload.project_id);
    payload.tower_id = payload.tower_id ? Number(payload.tower_id) : null;
    payload.approval_clearance_id = payload.approval_clearance_id ? Number(payload.approval_clearance_id) : null;
    payload.file_size_mb = payload.file_size_mb ? Number(payload.file_size_mb) : 0.0;
    payload.is_approved_for_construction = Boolean(payload.is_approved_for_construction);
    payload.is_confidential = Boolean(payload.is_confidential);

    if (this.isEditMode() && this.drawingId()) {
      this.projectService.updateDrawing(this.drawingId()!, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/drawings-documents']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to update drawing record.');
        }
      });
    } else {
      this.projectService.createDrawing(payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/projects/drawings-documents']);
        },
        error: (err) => {
          this.saving.set(false);
          alert(err.error?.detail || 'Failed to record drawing.');
        }
      });
    }
  }
}
