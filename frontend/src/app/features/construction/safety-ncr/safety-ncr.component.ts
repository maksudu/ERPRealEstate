import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  SafetyNCR,
  QualityInspection,
  QualityDefectMetrics,
  Subcontractor,
  SafetyIncident,
  HSESafetyMetrics,
  SafetyTraining,
  PermitToWork
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-safety-ncr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './safety-ncr.component.html'
})
export class SafetyNcrComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab: INCIDENTS | PERMITS | TRAININGS | INSPECTIONS | DEFECTS
  activeTab = signal<'INCIDENTS' | 'PERMITS' | 'TRAININGS' | 'INSPECTIONS' | 'DEFECTS'>('INCIDENTS');

  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);
  metrics = signal<QualityDefectMetrics | null>(null);
  hseMetrics = signal<HSESafetyMetrics | null>(null);
  isLoading = signal<boolean>(false);

  // Tab 1: Safety Incidents & Near-Misses
  incidents = signal<SafetyIncident[]>([]);
  incidentsTotal = signal<number>(0);
  incidentsPage = signal<number>(1);
  incidentsPageSize = signal<number>(10);
  includeConfidential = signal<boolean>(true);

  // Tab 2: Permits to Work (PTW)
  permits = signal<PermitToWork[]>([]);
  permitsTotal = signal<number>(0);
  permitsPage = signal<number>(1);
  permitsPageSize = signal<number>(10);

  // Tab 3: Safety Trainings & Inductions
  trainings = signal<SafetyTraining[]>([]);
  trainingsTotal = signal<number>(0);
  trainingsPage = signal<number>(1);
  trainingsPageSize = signal<number>(10);

  // Tab 4: Quality Stage Inspections (WIR / ITP)
  inspections = signal<QualityInspection[]>([]);
  inspectionsTotal = signal<number>(0);
  inspectionsPage = signal<number>(1);
  inspectionsPageSize = signal<number>(10);

  // Tab 5: Defect & Safety NCR Register
  ncrs = signal<SafetyNCR[]>([]);
  ncrsTotal = signal<number>(0);
  ncrsPage = signal<number>(1);
  ncrsPageSize = signal<number>(10);

  // Filters State
  searchQuery = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedContractorId = signal<number | null>(null);
  selectedIncidentType = signal<string>('');
  selectedSeverity = signal<string>('');
  selectedInvestigationStatus = signal<string>('');
  selectedStageCategory = signal<string>('');
  selectedVerdict = signal<string>('');
  selectedDefectStatus = signal<string>('');

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  // Quick Investigation Modal State
  isInvestigateModalOpen = signal<boolean>(false);
  selectedIncidentForInvestigate = signal<SafetyIncident | null>(null);
  modalRca = signal<string>('');
  modalCapa = signal<string>('');
  modalResponsiblePerson = signal<string>('');
  modalCapaDueDate = signal<string>('');
  modalInvestigatorName = signal<string>('Engr. Tariqul Islam (HSE Lead)');
  modalInvestigationStatus = signal<string>('RESOLVED');
  modalDaysLost = signal<number>(0);
  isSubmittingInvestigation = signal<boolean>(false);

  // Quick Verdict Modal State (Inspections)
  isVerdictModalOpen = signal<boolean>(false);
  selectedInspectionForVerdict = signal<QualityInspection | null>(null);
  modalVerdict = signal<string>('PASSED');
  modalInspectorName = signal<string>('Engr. Tanvir Ahmed (QA/QC)');
  modalRemarks = signal<string>('');
  modalStrengthPsi = signal<number | null>(null);
  modalLabRef = signal<string>('');
  isSubmittingVerdict = signal<boolean>(false);

  // Pagination Computations
  incidentsTotalPages = computed(() => Math.ceil(this.incidentsTotal() / this.incidentsPageSize()) || 1);
  permitsTotalPages = computed(() => Math.ceil(this.permitsTotal() / this.permitsPageSize()) || 1);
  trainingsTotalPages = computed(() => Math.ceil(this.trainingsTotal() / this.trainingsPageSize()) || 1);
  inspectionsTotalPages = computed(() => Math.ceil(this.inspectionsTotal() / this.inspectionsPageSize()) || 1);
  ncrsTotalPages = computed(() => Math.ceil(this.ncrsTotal() / this.ncrsPageSize()) || 1);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const t = String(params['tab']).toUpperCase();
        if (['INCIDENTS', 'PERMITS', 'TRAININGS', 'INSPECTIONS', 'DEFECTS'].includes(t)) {
          this.activeTab.set(t as any);
        }
      }
    });

    this.loadProjects();
    this.loadContractors();
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Construction Sites' },
          ...projs.map(p => ({ value: p.id, label: p.project_name }))
        ];
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractors.set(conts);
        this.contractorOptions = [
          { value: null, label: 'All Trade Subcontractors' },
          ...conts.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadMetrics(): void {
    const projId = this.selectedProjectId() || 0;
    this.constructionService.getHSESafetyMetrics(projId).subscribe({
      next: (m) => this.hseMetrics.set(m)
    });
    this.constructionService.getQualityDefectMetrics(projId).subscribe({
      next: (m) => this.metrics.set(m)
    });
  }

  switchTab(tab: 'INCIDENTS' | 'PERMITS' | 'TRAININGS' | 'INSPECTIONS' | 'DEFECTS'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.refreshCurrentTabData();
  }

  refreshCurrentTabData(): void {
    if (this.activeTab() === 'INCIDENTS') {
      this.loadIncidents();
    } else if (this.activeTab() === 'PERMITS') {
      this.loadPermits();
    } else if (this.activeTab() === 'TRAININGS') {
      this.loadTrainings();
    } else if (this.activeTab() === 'INSPECTIONS') {
      this.loadInspections();
    } else if (this.activeTab() === 'DEFECTS') {
      this.loadNCRs();
    }
  }

  loadIncidents(): void {
    this.isLoading.set(true);
    const offset = (this.incidentsPage() - 1) * this.incidentsPageSize();
    const filters: any = {
      limit: this.incidentsPageSize(),
      offset: offset,
      include_confidential: this.includeConfidential()
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedIncidentType()) filters.incident_type = this.selectedIncidentType();
    if (this.selectedSeverity()) filters.severity_level = this.selectedSeverity();
    if (this.selectedInvestigationStatus()) filters.investigation_status = this.selectedInvestigationStatus();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getSafetyIncidentsPaged(filters).subscribe({
      next: (res) => {
        this.incidents.set(res.items);
        this.incidentsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadPermits(): void {
    this.isLoading.set(true);
    const offset = (this.permitsPage() - 1) * this.permitsPageSize();
    const filters: any = {
      limit: this.permitsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getPermitsToWorkPaged(filters).subscribe({
      next: (res) => {
        this.permits.set(res.items);
        this.permitsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadTrainings(): void {
    this.isLoading.set(true);
    const offset = (this.trainingsPage() - 1) * this.trainingsPageSize();
    const filters: any = {
      limit: this.trainingsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getSafetyTrainingsPaged(filters).subscribe({
      next: (res) => {
        this.trainings.set(res.items);
        this.trainingsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadInspections(): void {
    this.isLoading.set(true);
    const offset = (this.inspectionsPage() - 1) * this.inspectionsPageSize();
    const filters: any = {
      limit: this.inspectionsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedStageCategory()) filters.stage_category = this.selectedStageCategory();
    if (this.selectedVerdict()) filters.verdict = this.selectedVerdict();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getQualityInspectionsPaged(filters).subscribe({
      next: (res) => {
        this.inspections.set(res.items);
        this.inspectionsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadNCRs(): void {
    this.isLoading.set(true);
    const offset = (this.ncrsPage() - 1) * this.ncrsPageSize();
    const filters: any = {
      limit: this.ncrsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedDefectStatus()) filters.status_filter = this.selectedDefectStatus();
    if (this.selectedSeverity()) filters.category_filter = this.selectedSeverity();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getSafetyNCRs(filters).subscribe({
      next: (data) => {
        this.ncrs.set(data);
        this.ncrsTotal.set(data.length < this.ncrsPageSize() && this.ncrsPage() === 1 ? data.length : 100);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Quick Investigation Modal
  openInvestigateModal(inc: SafetyIncident): void {
    this.selectedIncidentForInvestigate.set(inc);
    this.modalRca.set(inc.root_cause_analysis || '');
    this.modalCapa.set(inc.corrective_preventive_action || '');
    this.modalResponsiblePerson.set(inc.responsible_person_name || 'Engr. Site Lead');
    this.modalCapaDueDate.set(inc.capa_due_date || new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10));
    this.modalInvestigatorName.set(inc.investigator_name || 'Engr. Tariqul Islam (HSE Lead)');
    this.modalInvestigationStatus.set(inc.investigation_status === 'REPORTED' ? 'RESOLVED' : inc.investigation_status);
    this.modalDaysLost.set(inc.days_lost_count || 0);
    this.isInvestigateModalOpen.set(true);
  }

  closeInvestigateModal(): void {
    this.isInvestigateModalOpen.set(false);
    this.selectedIncidentForInvestigate.set(null);
  }

  submitInvestigation(): void {
    const inc = this.selectedIncidentForInvestigate();
    if (!inc || !inc.id) return;

    this.isSubmittingInvestigation.set(true);
    this.constructionService.investigateSafetyIncident(inc.id, {
      root_cause_analysis: this.modalRca(),
      corrective_preventive_action: this.modalCapa(),
      responsible_person_name: this.modalResponsiblePerson(),
      capa_due_date: this.modalCapaDueDate(),
      investigated_by_name: this.modalInvestigatorName(),
      investigation_status: this.modalInvestigationStatus(),
      days_lost_count: this.modalDaysLost()
    }).subscribe({
      next: () => {
        this.isSubmittingInvestigation.set(false);
        this.closeInvestigateModal();
        this.loadIncidents();
        this.loadMetrics();
      },
      error: () => this.isSubmittingInvestigation.set(false)
    });
  }

  // Quick Verdict Modal
  openVerdictModal(insp: QualityInspection): void {
    this.selectedInspectionForVerdict.set(insp);
    this.modalVerdict.set(insp.verdict === 'PENDING' ? 'PASSED' : insp.verdict);
    this.modalInspectorName.set(insp.inspector_name || 'Engr. Tanvir Ahmed (QA/QC)');
    this.modalRemarks.set(insp.remarks || '');
    this.modalStrengthPsi.set(insp.cube_test_strength_psi || null);
    this.modalLabRef.set(insp.laboratory_report_ref || '');
    this.isVerdictModalOpen.set(true);
  }

  closeVerdictModal(): void {
    this.isVerdictModalOpen.set(false);
    this.selectedInspectionForVerdict.set(null);
  }

  submitVerdict(): void {
    const insp = this.selectedInspectionForVerdict();
    if (!insp) return;

    this.isSubmittingVerdict.set(true);
    this.constructionService.submitInspectionVerdict(insp.id, {
      verdict: this.modalVerdict(),
      inspector_name: this.modalInspectorName(),
      mandatory_checks_passed: this.modalVerdict() === 'PASSED',
      checklist_items: insp.checklist_items || [],
      cube_test_strength_psi: this.modalStrengthPsi() || undefined,
      laboratory_report_ref: this.modalLabRef() || undefined,
      remarks: this.modalRemarks()
    }).subscribe({
      next: () => {
        this.isSubmittingVerdict.set(false);
        this.closeVerdictModal();
        this.loadInspections();
        this.loadMetrics();
      },
      error: () => this.isSubmittingVerdict.set(false)
    });
  }

  // Emergency Escalation Direct Trigger
  escalateIncident(inc: SafetyIncident): void {
    if (!inc.id) return;
    this.constructionService.escalateSafetyIncident(inc.id, {
      notification_recipients: ['director@blueoceans.com', 'hse-lead@blueoceans.com'],
      escalation_severity: inc.severity_level || 'CRITICAL',
      remarks: 'Emergency incident escalation broadcasted.'
    }).subscribe({
      next: () => {
        this.loadIncidents();
        this.loadMetrics();
      }
    });
  }

  deleteIncident(inc: SafetyIncident): void {
    if (!inc.id || !confirm(`Delete safety incident record #${inc.incident_code}?`)) return;
    this.constructionService.deleteSafetyIncident(inc.id).subscribe({
      next: () => {
        this.loadIncidents();
        this.loadMetrics();
      }
    });
  }

  deletePermit(ptw: PermitToWork): void {
    if (!ptw.id || !confirm(`Delete permit #${ptw.permit_number}?`)) return;
    this.constructionService.deletePermitToWork(ptw.id).subscribe({
      next: () => {
        this.loadPermits();
        this.loadMetrics();
      }
    });
  }

  deleteTraining(trn: SafetyTraining): void {
    if (!trn.id || !confirm(`Delete training record #${trn.training_code}?`)) return;
    this.constructionService.deleteSafetyTraining(trn.id).subscribe({
      next: () => {
        this.loadTrainings();
        this.loadMetrics();
      }
    });
  }

  onFilterChange(): void {
    this.incidentsPage.set(1);
    this.permitsPage.set(1);
    this.trainingsPage.set(1);
    this.inspectionsPage.set(1);
    this.ncrsPage.set(1);
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  changePage(delta: number): void {
    if (this.activeTab() === 'INCIDENTS') {
      const p = this.incidentsPage() + delta;
      if (p >= 1 && p <= this.incidentsTotalPages()) {
        this.incidentsPage.set(p);
        this.loadIncidents();
      }
    } else if (this.activeTab() === 'PERMITS') {
      const p = this.permitsPage() + delta;
      if (p >= 1 && p <= this.permitsTotalPages()) {
        this.permitsPage.set(p);
        this.loadPermits();
      }
    } else if (this.activeTab() === 'TRAININGS') {
      const p = this.trainingsPage() + delta;
      if (p >= 1 && p <= this.trainingsTotalPages()) {
        this.trainingsPage.set(p);
        this.loadTrainings();
      }
    } else if (this.activeTab() === 'INSPECTIONS') {
      const p = this.inspectionsPage() + delta;
      if (p >= 1 && p <= this.inspectionsTotalPages()) {
        this.inspectionsPage.set(p);
        this.loadInspections();
      }
    } else if (this.activeTab() === 'DEFECTS') {
      const p = this.ncrsPage() + delta;
      if (p >= 1 && p <= this.ncrsTotalPages()) {
        this.ncrsPage.set(p);
        this.loadNCRs();
      }
    }
  }
}
