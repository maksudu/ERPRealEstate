import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { ConcreteCubeTest, CubeTestNotificationAlert } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-concrete-cube-tests',
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
  templateUrl: './concrete-cube-tests.component.html'
})
export class ConcreteCubeTestsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  cubeTests = signal<ConcreteCubeTest[]>([]);
  alerts = signal<CubeTestNotificationAlert[]>([]);
  projects = signal<Project[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isRecordModalOpen = signal<boolean>(false);
  selectedTestForRecord = signal<ConcreteCubeTest | null>(null);

  // Filters
  filterProjectId = signal<number | null>(null);
  filterVerdict = signal<string>('');

  createForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    structural_element: ['', Validators.required],
    casting_date: [new Date().toISOString().split('T')[0], Validators.required],
    design_compressive_strength_psi: [4000, [Validators.required, Validators.min(1000)]],
    concrete_grade: ['M25', Validators.required],
    batching_plant_name: ['Ready-Mix Batching Plant', Validators.required],
    slump_test_mm: [100, [Validators.required, Validators.min(0)]],
    remarks: ['']
  });

  recordForm: FormGroup = this.fb.group({
    day7_strength_psi: [null],
    day14_strength_psi: [null],
    day28_strength_psi: [null],
    lab_test_report_url: [''],
    remarks: ['']
  });

  concreteGradeOptions = [
    { value: 'M20', label: 'M20 (2900 psi / 20 MPa)' },
    { value: 'M25', label: 'M25 (3625 psi / 25 MPa)' },
    { value: 'M30', label: 'M30 (4350 psi / 30 MPa)' },
    { value: 'M35', label: 'M35 (5075 psi / 35 MPa)' },
    { value: 'M40', label: 'M40 (5800 psi / 40 MPa)' }
  ];

  verdictFilterOptions = [
    { value: '', label: 'All Verdicts' },
    { value: 'PENDING', label: 'Pending Tests' },
    { value: 'PASSED', label: 'Passed ASTM C39' },
    { value: 'FAILED', label: 'Failed Strength' }
  ];

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  ngOnInit(): void {
    this.loadProjects();
    this.loadCubeTests();
    this.loadAlerts();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadCubeTests(): void {
    this.isLoading.set(true);
    const filter: any = {};
    if (this.filterProjectId()) filter.project_id = this.filterProjectId();
    if (this.filterVerdict()) filter.verdict = this.filterVerdict();

    this.constructionService.getCubeTests(filter).subscribe({
      next: (res) => {
        this.cubeTests.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load cube tests', err);
        this.isLoading.set(false);
      }
    });
  }

  loadAlerts(): void {
    this.constructionService.getCubeTestAlerts().subscribe({
      next: (res) => this.alerts.set(res),
      error: (err) => console.error('Failed to load crushing alerts', err)
    });
  }

  onFilterChange(): void {
    this.loadCubeTests();
  }

  openCreateModal(): void {
    this.createForm.reset({
      project_id: this.projects().length ? this.projects()[0].id : null,
      structural_element: '',
      casting_date: new Date().toISOString().split('T')[0],
      design_compressive_strength_psi: 4000,
      concrete_grade: 'M25',
      batching_plant_name: 'Ready-Mix Batching Plant',
      slump_test_mm: 100,
      remarks: ''
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
    this.constructionService.createCubeTest(this.createForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadCubeTests();
        this.loadAlerts();
      },
      error: (err) => {
        console.error('Failed to register cube test', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openRecordModal(test: ConcreteCubeTest): void {
    this.selectedTestForRecord.set(test);
    this.recordForm.reset({
      day7_strength_psi: test.day7_strength_psi,
      day14_strength_psi: test.day14_strength_psi,
      day28_strength_psi: test.day28_strength_psi,
      lab_test_report_url: test.lab_test_report_url || '',
      remarks: test.remarks || ''
    });
    this.isRecordModalOpen.set(true);
  }

  closeRecordModal(): void {
    this.isRecordModalOpen.set(false);
    this.selectedTestForRecord.set(null);
  }

  submitRecord(): void {
    const test = this.selectedTestForRecord();
    if (!test) return;

    this.isSubmitting.set(true);
    this.constructionService.recordCubeTestStrength(test.id, this.recordForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeRecordModal();
        this.loadCubeTests();
        this.loadAlerts();
      },
      error: (err) => {
        console.error('Failed to record test crushing strength', err);
        this.isSubmitting.set(false);
      }
    });
  }

  getVerdictBadge(verdict: string): { text: string; bg: string; textCol: string; border: string } {
    switch (verdict) {
      case 'PASSED':
        return { text: 'PASSED (≥Design PSI)', bg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' };
      case 'FAILED':
        return { text: 'FAILED CRUSHING', bg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' };
      case 'WARNING_LOW_STRENGTH':
        return { text: 'DAY-7 LOW WARNING', bg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' };
      default:
        return { text: 'TESTING IN PROGRESS', bg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' };
    }
  }

  getStatusBadge(status?: string): { text: string; css: string } {
    switch (status) {
      case 'COMPLETED':
        return { text: 'Completed', css: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
      case 'DUE':
        return { text: 'DUE NOW', css: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 font-bold animate-pulse' };
      default:
        return { text: 'Upcoming', css: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  }
}
