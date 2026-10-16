import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { SafetyNCR, Subcontractor } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-safety-ncr',
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
  templateUrl: './safety-ncr.component.html'
})
export class SafetyNcrComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  ncrs = signal<SafetyNCR[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreateModalOpen = signal<boolean>(false);
  isRectifyModalOpen = signal<boolean>(false);
  isVerifyModalOpen = signal<boolean>(false);
  selectedNCR = signal<SafetyNCR | null>(null);

  // Filters
  filterProjectId = signal<number | null>(null);
  filterStatus = signal<string>('');
  filterCategory = signal<string>('');

  createForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    category: ['Structural Defect', Validators.required],
    severity: ['Medium', Validators.required],
    description: ['', Validators.required],
    location_details: ['', Validators.required],
    assigned_contractor_id: [null],
    rectification_deadline: [new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], Validators.required],
    photo_url: ['']
  });

  rectifyForm: FormGroup = this.fb.group({
    rectification_notes: ['', Validators.required],
    rectification_photo_url: ['']
  });

  verifyForm: FormGroup = this.fb.group({
    verdict: ['VERIFIED_CLOSED', Validators.required],
    verification_notes: ['']
  });

  categoryOptions = [
    { value: 'Structural Defect', label: 'Structural Defect (Cracks / Spalling)' },
    { value: 'Honeycombing', label: 'Honeycombing / Grouting Voids' },
    { value: 'Cover Missing', label: 'Rebar Cover Missing / Displacement' },
    { value: 'Safety Violation', label: 'Safety Violation (No Harness / PPE)' }
  ];

  severityOptions = [
    { value: 'Low', label: 'Low - Advisory Warning' },
    { value: 'Medium', label: 'Medium - Action within 72 hrs' },
    { value: 'High', label: 'High - Critical Structural / Stop Work' },
    { value: 'Critical', label: 'Critical - Immediate Evacuation & Remediation' }
  ];

  statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Open', label: 'Open / Pending Rectification' },
    { value: 'Rectified', label: 'Rectified (Awaiting QA Verification)' },
    { value: 'Verified_Closed', label: 'Verified Closed' }
  ];

  verdictOptions = [
    { value: 'VERIFIED_CLOSED', label: 'Approve & Close NCR' },
    { value: 'REOPEN', label: 'Reject Rectification & Reopen NCR' }
  ];

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  contractorOptions = computed(() =>
    this.contractors().map(c => ({
      value: c.id,
      label: `${c.company_name} (${c.trade_specialization})`
    }))
  );

  ngOnInit(): void {
    this.loadProjects();
    this.loadContractors();
    this.loadNCRs();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (res) => this.contractors.set(res),
      error: (err) => console.error('Failed to load contractors', err)
    });
  }

  loadNCRs(): void {
    this.isLoading.set(true);
    const filter: any = {};
    if (this.filterProjectId()) filter.project_id = this.filterProjectId();
    if (this.filterStatus()) filter.status_filter = this.filterStatus();
    if (this.filterCategory()) filter.category_filter = this.filterCategory();

    this.constructionService.getSafetyNCRs(filter).subscribe({
      next: (res) => {
        this.ncrs.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load safety NCRs', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadNCRs();
  }

  openCreateModal(): void {
    this.createForm.reset({
      project_id: this.projects().length ? this.projects()[0].id : null,
      category: 'Structural Defect',
      severity: 'Medium',
      description: '',
      location_details: '',
      assigned_contractor_id: this.contractors().length ? this.contractors()[0].id : null,
      rectification_deadline: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      photo_url: ''
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.constructionService.createSafetyNCR(this.createForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadNCRs();
      },
      error: (err) => {
        console.error('Failed to create NCR', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openRectifyModal(ncr: SafetyNCR): void {
    this.selectedNCR.set(ncr);
    this.rectifyForm.reset({
      rectification_notes: ncr.rectification_notes || '',
      rectification_photo_url: ncr.rectification_photo_url || ''
    });
    this.isRectifyModalOpen.set(true);
  }

  closeRectifyModal(): void {
    this.isRectifyModalOpen.set(false);
    this.selectedNCR.set(null);
  }

  submitRectify(): void {
    const ncr = this.selectedNCR();
    if (!ncr || this.rectifyForm.invalid) return;

    this.isSubmitting.set(true);
    this.constructionService.rectifySafetyNCR(ncr.id, this.rectifyForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeRectifyModal();
        this.loadNCRs();
      },
      error: (err) => {
        console.error('Failed to submit NCR rectification', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openVerifyModal(ncr: SafetyNCR): void {
    this.selectedNCR.set(ncr);
    this.verifyForm.reset({
      verdict: 'VERIFIED_CLOSED',
      verification_notes: ''
    });
    this.isVerifyModalOpen.set(true);
  }

  closeVerifyModal(): void {
    this.isVerifyModalOpen.set(false);
    this.selectedNCR.set(null);
  }

  submitVerify(): void {
    const ncr = this.selectedNCR();
    if (!ncr || this.verifyForm.invalid) return;

    this.isSubmitting.set(true);
    this.constructionService.verifySafetyNCR(ncr.id, this.verifyForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeVerifyModal();
        this.loadNCRs();
      },
      error: (err) => {
        console.error('Failed to verify NCR closure', err);
        this.isSubmitting.set(false);
      }
    });
  }

  getSeverityBadge(severity: string): { bg: string; textCol: string; border: string } {
    switch (severity) {
      case 'Critical':
        return { bg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-800' };
      case 'High':
        return { bg: 'bg-orange-50 dark:bg-orange-950/40', textCol: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-800' };
      case 'Medium':
        return { bg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800' };
      default:
        return { bg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' };
    }
  }

  getStatusBadge(status: string, isOverdue: boolean = false): { text: string; bg: string; textCol: string; border: string } {
    if (status === 'Open' && isOverdue) {
      return { text: 'OVERDUE (OPEN)', bg: 'bg-rose-100 dark:bg-rose-950/60', textCol: 'text-rose-800 dark:text-rose-200 font-bold animate-pulse', border: 'border-rose-400' };
    }
    switch (status) {
      case 'Verified_Closed':
        return { text: 'Verified Closed', bg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' };
      case 'Rectified':
        return { text: 'Rectified (Pending QA)', bg: 'bg-indigo-50 dark:bg-indigo-950/40', textCol: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' };
      default:
        return { text: 'Open', bg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' };
    }
  }
}
