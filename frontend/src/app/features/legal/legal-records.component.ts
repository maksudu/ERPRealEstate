import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LegalService } from '../../core/services/legal.service';
import { ProjectService } from '../../core/services/project.service';
import { Project } from '../../core/models/project.model';
import { LegalArea, LegalRecord, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { CardContainerComponent, CustomButtonComponent, CustomInputComponent, SearchableSelectComponent, CustomTableComponent, TableColumn } from '../../shared/components';

@Component({
  selector: 'app-legal-records',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, CustomButtonComponent, CustomInputComponent, SearchableSelectComponent, CustomTableComponent],
  templateUrl: './legal-records.component.html'
})
export class LegalRecordsComponent implements OnInit {
  private legalService = inject(LegalService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  area!: LegalArea;
  records: LegalRecord[] = [];
  projectOptions: { value: number; label: string }[] = [];
  projectFilter: number | string | null = null;
  total = 0;
  limit = 25;
  offset = 0;
  searchText = '';
  statusFilter = '';
  recordTypeFilter = '';
  mutationApplicationStatusFilter = '';
  mutationOutcomeFilter = '';
  taxReconciliationStatusFilter = '';
  registrationTypeFilter = '';
  registrationAuthorityFilter = '';
  dueFromFilter = '';
  dueToFilter = '';
  approvalCategoryFilter = '';
  approvalAuthorityFilter = '';
  approvalReferenceFilter = '';
  correspondenceDirectionFilter = '';
  correspondenceTypeFilter = '';
  correspondenceAuthorityFilter = '';
  correspondenceOrganizationFilter = '';
  threadReferenceFilter = '';
  appliedSearch = '';
  appliedStatus = '';
  isLoading = false;
  error = '';
  readonly labels = LEGAL_AREA_LABELS;
  readonly tableColumns: TableColumn[] = [
    { field: 'record', header: 'Record', width: '28%' },
    { field: 'reference', header: 'Reference', width: '16%' },
    { field: 'project', header: 'Project', width: '10%' },
    { field: 'status', header: 'Status', width: '14%' },
    { field: 'due_date', header: 'Due date', width: '14%' },
    { field: 'actions', header: 'Actions', align: 'right', width: '18%' }
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const value = params.get('area') as LegalArea;
      if (!(value in LEGAL_AREA_LABELS)) {
        this.router.navigateByUrl('/legal/dashboard');
        return;
      }
      this.area = value;
      this.projectService.getProjects().subscribe({ next: (projects: Project[]) => this.projectOptions = projects.map(project => ({ value: project.id, label: project.project_name + " (" + project.project_code + ")" })), error: () => this.projectOptions = [] });
      this.offset = 0;
      this.load();
    });
  }

  load(): void {
    this.isLoading = true;
    this.error = '';
    this.legalService.listRecords({
      area: this.area,
      project_id: this.projectFilter === null || this.projectFilter === "" ? undefined : Number(this.projectFilter),
      limit: this.limit,
      offset: this.offset,
      q: this.appliedSearch,
      status: this.appliedStatus,
      record_type: this.recordTypeFilter,
      mutation_application_status: this.mutationApplicationStatusFilter,
      mutation_outcome: this.mutationOutcomeFilter,
      tax_reconciliation_status: this.taxReconciliationStatusFilter,
      registration_type: this.registrationTypeFilter,
      registration_authority: this.registrationAuthorityFilter,
      due_from: this.dueFromFilter,
      due_to: this.dueToFilter,
      approval_category: this.approvalCategoryFilter,
      approval_authority: this.approvalAuthorityFilter,
      approval_reference: this.approvalReferenceFilter,
      correspondence_direction: this.correspondenceDirectionFilter,
      correspondence_type: this.correspondenceTypeFilter,
      correspondence_authority: this.correspondenceAuthorityFilter,
      correspondence_external_organization: this.correspondenceOrganizationFilter,
      thread_reference: this.threadReferenceFilter
    }).subscribe({
      next: result => {
        this.records = result.items;
        this.total = result.total;
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Records could not be loaded. Check your access and try again.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.appliedSearch = this.searchText.trim();
    this.appliedStatus = this.statusFilter;
    this.offset = 0;
    this.load();
  }

  pageBy(step: number): void {
    this.offset = Math.max(0, Math.min(this.offset + step * this.limit, Math.max(0, this.total - 1)));
    this.load();
  }

  openRecord(record: LegalRecord): void {
    this.router.navigate(['/legal/records', this.area, record.id]);
  }

  editRecord(record: LegalRecord): void {
    this.router.navigate(['/legal/records', this.area, record.id, 'edit']);
  }

  deleteRecord(record: LegalRecord): void {
    if (!window.confirm(`Delete “${record.title}”? The action will remain in the audit trail.`)) return;
    this.legalService.deleteRecord(record.id).subscribe({
      next: () => this.load(),
      error: () => this.error = 'This record could not be deleted.'
    });
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : this.offset + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.offset + this.limit, this.total);
  }
}
