import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { DPRReport, Subcontractor, ConstructionMetrics, WBSNode } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-dpr',
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
  templateUrl: './construction-dpr.component.html'
})
export class ConstructionDprComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  dprReports = signal<DPRReport[]>([]);
  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);
  wbsNodes = signal<WBSNode[]>([]);
  metrics = signal<ConstructionMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  selectedDprForPhotos = signal<DPRReport | null>(null);

  dprForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    wbs_node_id: [null],
    report_date: [new Date().toISOString().split('T')[0], Validators.required],
    weather_condition_id: ['SUNNY', Validators.required],
    floor_unit_location: ['', Validators.required],
    machinery_deployed: [''],
    structural_activity_summary: ['', Validators.required],
    concrete_casting_cft: [0, [Validators.min(0)]],
    steel_rod_consumed_mt: [0, [Validators.min(0)]],
    cement_consumed_bags: [0, [Validators.min(0)]],
    safety_incident_logged: [false],
    safety_incident_notes: [''],
    site_photo_url: [''],
    site_photo_caption: [''],
    labor_entries: this.fb.array([])
  });

  weatherOptions = [
    { value: 'SUNNY', label: '☀️ Sunny / Clear Weather' },
    { value: 'OVERCAST', label: '⛅ Overcast / Heavy Cloud' },
    { value: 'RAIN_LIGHT', label: '🌦️ Light Rain (Work Continued)' },
    { value: 'RAIN_HEAVY', label: '⛈️ Heavy Downpour (Work Halted)' },
    { value: 'STORMY', label: '🌪️ Storm / High Wind Alert' }
  ];

  tradeCategoryOptions = [
    { value: 'Rod-binder', label: 'Rod-binder (রড মিস্ত্রি)' },
    { value: 'Mason', label: 'Mason (রাজমিস্ত্রি)' },
    { value: 'Carpenter', label: 'Shuttering Carpenter (কাঠ মিস্ত্রি)' },
    { value: 'Plumber', label: 'Plumber (প্লাম্বার)' },
    { value: 'Electrician', label: 'Electrician (ইলেকট্রিশিয়ান)' },
    { value: 'Helper', label: 'Helper (লেবার / জোগালী)' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadDropdowns();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.constructionService.getDPRReports().subscribe({
      next: (res) => {
        this.dprReports.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.constructionService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadDropdowns(): void {
    this.projectService.getProjects().subscribe(p => {
      this.projects.set(p);
      if (p.length > 0) {
        this.loadWBSNodes(p[0].id);
      }
    });
    this.constructionService.getContractors().subscribe(c => this.contractors.set(c));
  }

  loadWBSNodes(projectId: number): void {
    this.constructionService.getWBSNodes({ project_id: projectId }).subscribe(nodes => {
      this.wbsNodes.set(nodes);
    });
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  get wbsOptions() {
    return this.wbsNodes().map(n => ({
      value: n.id,
      label: `[${n.node_code}] ${n.node_name}`
    }));
  }

  get contractorOptions() {
    return this.contractors().map(c => ({
      value: c.id,
      label: `${c.company_name} (${c.trade_specialization})`
    }));
  }

  get laborArray(): FormArray {
    return this.dprForm.get('labor_entries') as FormArray;
  }

  addLaborRow(): void {
    const row = this.fb.group({
      contractor_id: [this.contractors()[0]?.id || null],
      trade_category: ['Rod-binder', Validators.required],
      worker_count: [10, [Validators.required, Validators.min(1)]],
      daily_wage_rate: [900, [Validators.required, Validators.min(100)]]
    });
    this.laborArray.push(row);
  }

  removeLaborRow(index: number): void {
    this.laborArray.removeAt(index);
  }

  openCreateModal(): void {
    this.dprForm.reset({
      project_id: this.projects()[0]?.id || null,
      wbs_node_id: this.wbsNodes()[0]?.id || null,
      report_date: new Date().toISOString().split('T')[0],
      weather_condition_id: 'SUNNY',
      floor_unit_location: 'Tower 1 - Floor 4 Beam & Slab B4-S4',
      machinery_deployed: '1x Putzmeister 42m Pump, 2x Transit Mixers, 4x Vibrators',
      structural_activity_summary: '',
      concrete_casting_cft: 0,
      steel_rod_consumed_mt: 0,
      cement_consumed_bags: 0,
      safety_incident_logged: false,
      safety_incident_notes: '',
      site_photo_url: 'assets/images/construction/dpr_pour_1.jpg',
      site_photo_caption: 'Concrete pouring and slump test verification'
    });
    this.laborArray.clear();
    this.addLaborRow();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  viewPhotos(dpr: DPRReport): void {
    this.selectedDprForPhotos.set(dpr);
  }

  closePhotosModal(): void {
    this.selectedDprForPhotos.set(null);
  }

  submitDPR(): void {
    if (this.dprForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.dprForm.value;
    const photos: { url: string; caption: string }[] = [];
    if (val.site_photo_url) {
      photos.push({
        url: val.site_photo_url,
        caption: val.site_photo_caption || 'Site execution photo'
      });
    }

    const payload = {
      project_id: val.project_id,
      wbs_node_id: val.wbs_node_id,
      report_date: val.report_date,
      weather_condition_id: val.weather_condition_id,
      floor_unit_location: val.floor_unit_location,
      machinery_deployed: val.machinery_deployed,
      structural_activity_summary: val.structural_activity_summary,
      concrete_casting_cft: val.concrete_casting_cft,
      steel_rod_consumed_mt: val.steel_rod_consumed_mt,
      cement_consumed_bags: val.cement_consumed_bags,
      safety_incident_logged: Boolean(val.safety_incident_logged),
      safety_incident_notes: val.safety_incident_notes,
      site_photos: photos,
      labor_entries: val.labor_entries
    };

    this.constructionService.createDPRReport(payload).subscribe({
      next: (created) => {
        this.dprReports.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'DPR logging failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
