import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { LandService } from '../../../core/services/land.service';
import { Project, FARCalculationResult } from '../../../core/models/project.model';
import { LandBank } from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-project-list',
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
  templateUrl: './projects-list.component.html'
})
export class ProjectsListComponent implements OnInit {
  private projectService = inject(ProjectService);
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  landParcels = signal<LandBank[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Live FAR Engine Computation Preview
  farResult = signal<FARCalculationResult | null>(null);
  selectedProjectDetails = signal<Project | null>(null);
  isDetailsModalOpen = signal<boolean>(false);

  projectForm: FormGroup = this.fb.group({
    land_bank_id: [null],
    project_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    project_name: ['', Validators.required],
    development_authority_id: ['RAJUK', Validators.required],
    road_width_feet: [40, [Validators.required, Validators.min(10)]],
    plot_area_sqft: [14400, [Validators.required, Validators.min(100)]],
    planned_handover_date: [''],
    status: ['PLANNING'],
    description: [''],
    towers: this.fb.array([])
  });

  get towersArray(): FormArray {
    return this.projectForm.get('towers') as FormArray;
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadLandParcels();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadLandParcels(): void {
    this.landService.getProposals().subscribe({
      next: (data) => this.landParcels.set(data)
    });
  }

  onParcelSelect(event: any): void {
    const val = event.target.value;
    if (val) {
      const p = this.landParcels().find(x => x.id === Number(val));
      if (p) {
        this.projectForm.patchValue({
          plot_area_sqft: p.total_area_sqft,
          project_code: p.project_code,
          project_name: `${p.proposal_title} Tower`
        });
        this.triggerFarCalculation();
      }
    }
  }

  triggerFarCalculation(): void {
    const sqft = Number(this.projectForm.get('plot_area_sqft')?.value || 0);
    const road = Number(this.projectForm.get('road_width_feet')?.value || 0);
    if (sqft > 0 && road > 0) {
      this.projectService.calculateFAR({ plot_area_sqft: sqft, road_width_feet: road }).subscribe({
        next: (res) => this.farResult.set(res)
      });
    }
  }

  addTower(): void {
    const nextIdx = this.towersArray.length + 1;
    this.towersArray.push(this.fb.group({
      tower_code: [`TOWER-${String.fromCharCode(64 + nextIdx)}`, Validators.required],
      tower_name: [`Tower ${String.fromCharCode(64 + nextIdx)}`, Validators.required],
      basement_floors: [1, Validators.required],
      residential_floors: [14, Validators.required],
      commercial_floors: [0],
      total_lifts: [2, Validators.required]
    }));
  }

  removeTower(index: number): void {
    this.towersArray.removeAt(index);
  }

  openCreateModal(): void {
    this.projectForm.reset({
      development_authority_id: 'RAJUK',
      road_width_feet: 40,
      plot_area_sqft: 14400,
      status: 'PLANNING'
    });
    this.towersArray.clear();
    this.addTower();
    this.errorMessage.set(null);
    this.triggerFarCalculation();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.projectForm.value;
    const payload = {
      land_bank_id: f.land_bank_id ? Number(f.land_bank_id) : null,
      project_code: f.project_code,
      project_name: f.project_name,
      development_authority_id: f.development_authority_id,
      road_width_feet: Number(f.road_width_feet),
      plot_area_sqft: Number(f.plot_area_sqft),
      planned_handover_date: f.planned_handover_date || null,
      status: f.status,
      description: f.description,
      towers: f.towers || []
    };

    this.projectService.createProject(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadProjects();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to initialize project spatial master.');
      }
    });
  }

  viewDetails(p: Project): void {
    this.selectedProjectDetails.set(p);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen.set(false);
    this.selectedProjectDetails.set(null);
  }
}
