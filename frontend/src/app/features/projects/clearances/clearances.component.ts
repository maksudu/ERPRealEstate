import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project, AuthorityClearance } from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent 
} from '../../../shared/components';

@Component({
  selector: 'app-project-clearances',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './clearances.component.html'
})
export class ClearancesComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  clearances = signal<AuthorityClearance[]>([]);
  selectedProjectId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isEditModalOpen = signal<boolean>(false);
  selectedClearance = signal<AuthorityClearance | null>(null);

  editForm: FormGroup = this.fb.group({
    status: ['APPROVED', Validators.required],
    application_memo_no: [''],
    approved_memo_no: [''],
    approval_date: [''],
    expiry_date: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadClearances();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadClearances();
        }
      }
    });
  }

  loadClearances(): void {
    this.isLoading.set(true);
    const pId = this.selectedProjectId();
    this.projectService.getClearances(pId ? { project_id: pId } : undefined).subscribe({
      next: (data) => {
        this.clearances.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectFilterChange(event: any): void {
    const val = event.target.value ? Number(event.target.value) : null;
    this.selectedProjectId.set(val);
    this.loadClearances();
  }

  openEditModal(cl: AuthorityClearance): void {
    this.selectedClearance.set(cl);
    this.editForm.patchValue({
      status: cl.status,
      application_memo_no: cl.application_memo_no || '',
      approved_memo_no: cl.approved_memo_no || '',
      approval_date: cl.approval_date || '',
      expiry_date: cl.expiry_date || '',
      remarks: cl.remarks || ''
    });
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedClearance.set(null);
  }

  submitUpdate(): void {
    const cl = this.selectedClearance();
    if (!cl) return;

    this.isSubmitting.set(true);
    const f = this.editForm.value;
    const payload = {
      status: f.status,
      application_memo_no: f.application_memo_no || null,
      approved_memo_no: f.approved_memo_no || null,
      approval_date: f.approval_date || null,
      expiry_date: f.expiry_date || null,
      remarks: f.remarks || null
    };

    this.projectService.updateClearance(cl.id, payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeEditModal();
        this.loadClearances();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  getClearanceLabel(type: string): string {
    const map: Record<string, string> = {
      LUC: 'Land Use Clearance (LUC)',
      BUILDING_PLAN: 'RAJUK / CDA Building Plan Approval',
      FIRE_NOC: 'Fire Service & Civil Defence NOC',
      AVIATION_HEIGHT: 'Civil Aviation Height Clearance',
      ENVIRONMENTAL: 'Department of Environment Clearance',
      WASA: 'Water & Sewerage Authority (WASA) NOC'
    };
    return map[type] || type;
  }
}
