import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, BOQItem, Drawing } from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent,
  CustomTabsComponent,
  TabItem 
} from '../../../shared/components';

@Component({
  selector: 'app-project-boq',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    CustomTabsComponent
  ],
  templateUrl: './boq.component.html'
})
export class BOQComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  boqItems = signal<BOQItem[]>([]);
  drawings = signal<Drawing[]>([]);
  selectedProjectId = signal<number | null>(null);

  activeTab = signal<string>('boq');
  tabs: TabItem[] = [
    { id: 'boq', label: 'Bill of Quantities (BOQ Estimation)' },
    { id: 'drawings', label: 'IFC Drawings & Auto-Revocation Engine' }
  ];

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isBOQModalOpen = signal<boolean>(false);
  isDrawingModalOpen = signal<boolean>(false);
  ifcNoticeMessage = signal<string | null>(null);

  boqForm: FormGroup = this.fb.group({
    wbs_phase_id: ['SUPER_STRUCTURE', Validators.required],
    material_category_id: ['REBAR_500W', Validators.required],
    item_description: ['', Validators.required],
    unit_of_measure_id: ['CFT', Validators.required],
    estimated_quantity: [null, [Validators.required, Validators.min(0.01)]],
    estimated_unit_rate: [null, [Validators.required, Validators.min(0.01)]]
  });

  drawingForm: FormGroup = this.fb.group({
    drawing_category_id: ['STRUCTURAL', Validators.required],
    drawing_number: ['', Validators.required],
    drawing_title: ['', Validators.required],
    revision_number: ['R1', Validators.required],
    is_approved_for_construction: [true],
    approved_by: ['Chief Structural Engineer', Validators.required],
    revision_notes: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadData();
        }
      }
    });
  }

  loadData(): void {
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isLoading.set(true);
    this.projectService.getBOQItems({ project_id: pId }).subscribe({
      next: (items) => {
        this.boqItems.set(items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.projectService.getDrawings({ project_id: pId }).subscribe({
      next: (draws) => this.drawings.set(draws)
    });
  }

  onProjectChange(event: any): void {
    this.selectedProjectId.set(Number(event.target.value));
    this.loadData();
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  // --- BOQ Actions ---
  openCreateBOQ(): void {
    this.boqForm.reset({
      wbs_phase_id: 'SUPER_STRUCTURE',
      material_category_id: 'REBAR_500W',
      unit_of_measure_id: 'TON'
    });
    this.isBOQModalOpen.set(true);
  }

  closeBOQModal(): void {
    this.isBOQModalOpen.set(false);
  }

  submitBOQ(): void {
    if (this.boqForm.invalid) {
      this.boqForm.markAllAsTouched();
      return;
    }
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isSubmitting.set(true);
    const f = this.boqForm.value;
    const payload = {
      project_id: pId,
      wbs_phase_id: f.wbs_phase_id,
      material_category_id: f.material_category_id,
      item_description: f.item_description,
      unit_of_measure_id: f.unit_of_measure_id,
      estimated_quantity: Number(f.estimated_quantity),
      estimated_unit_rate: Number(f.estimated_unit_rate)
    };

    this.projectService.createBOQItem(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeBOQModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // --- Drawing Actions ---
  openCreateDrawing(): void {
    this.drawingForm.reset({
      drawing_category_id: 'STRUCTURAL',
      drawing_number: 'STR-COL-001',
      drawing_title: 'Basement & Ground Floor Column Layout',
      revision_number: 'R2',
      is_approved_for_construction: true,
      approved_by: 'Engr. Shamsul Haque (Chief Consultant)'
    });
    this.ifcNoticeMessage.set(null);
    this.isDrawingModalOpen.set(true);
  }

  closeDrawingModal(): void {
    this.isDrawingModalOpen.set(false);
  }

  submitDrawing(): void {
    if (this.drawingForm.invalid) {
      this.drawingForm.markAllAsTouched();
      return;
    }
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isSubmitting.set(true);
    const f = this.drawingForm.value;
    const payload = {
      project_id: pId,
      drawing_category_id: f.drawing_category_id,
      drawing_number: f.drawing_number,
      drawing_title: f.drawing_title,
      revision_number: f.revision_number,
      is_approved_for_construction: f.is_approved_for_construction,
      approved_by: f.approved_by,
      revision_notes: f.revision_notes
    };

    this.projectService.createDrawingRevision(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeDrawingModal();
        this.loadData();
        this.ifcNoticeMessage.set(
          `Revision ${f.revision_number} was marked as IFC. Previous revisions under drawing ${f.drawing_number} have been automatically revoked.`
        );
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  calculateTotalBOQCost(): number {
    return this.boqItems().reduce((acc, item) => acc + Number(item.total_estimated_cost), 0);
  }
}
