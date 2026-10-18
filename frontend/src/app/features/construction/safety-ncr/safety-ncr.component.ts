import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { SafetyNCR } from '../../../core/models/construction.model';
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

  ncrs = signal<SafetyNCR[]>([]);
  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  filterProjectId = signal<number | null>(null);
  filterStatus = signal<string>('');
  filterCategory = signal<string>('');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  projectOptions: { value: any; label: string }[] = [];

  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'Open', label: 'Open / Pending Rectification' },
    { value: 'Rectified', label: 'Rectified / Pending QA Verification' },
    { value: 'Verified_Closed', label: 'Verified & Closed' }
  ];

  categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'Structural Defect', label: 'Structural Defect' },
    { value: 'PPE Violation', label: 'PPE Non-Compliance' },
    { value: 'Fall Protection', label: 'Fall Protection' },
    { value: 'Scaffolding Safety', label: 'Scaffolding Safety' },
    { value: 'Housekeeping', label: 'Housekeeping & Debris' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadNCRs();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Construction Sites' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
          }))
        ];
      }
    });
  }

  loadNCRs(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const filters: any = {
      limit: this.pageSize(),
      offset: offset
    };
    if (this.filterProjectId()) filters.project_id = this.filterProjectId();
    if (this.filterStatus()) filters.status_filter = this.filterStatus();
    if (this.filterCategory()) filters.category_filter = this.filterCategory();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getSafetyNCRs(filters).subscribe({
      next: (data) => {
        this.ncrs.set(data);
        this.totalRecords.set(data.length < this.pageSize() && this.currentPage() === 1 ? data.length : 100);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFilterProject(projectId: any): void {
    this.filterProjectId.set(projectId ? Number(projectId) : null);
    this.currentPage.set(1);
    this.loadNCRs();
  }

  onFilterStatus(status: any): void {
    this.filterStatus.set(status || '');
    this.currentPage.set(1);
    this.loadNCRs();
  }

  onFilterCategory(cat: any): void {
    this.filterCategory.set(cat || '');
    this.currentPage.set(1);
    this.loadNCRs();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadNCRs();
  }

  clearFilters(): void {
    this.filterProjectId.set(null);
    this.filterStatus.set('');
    this.filterCategory.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadNCRs();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.loadNCRs();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadNCRs();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/construction/safety-ncr/create']);
  }

  navigateToRectify(id: number): void {
    this.router.navigate(['/construction/safety-ncr/rectify', id]);
  }

  verifyAndClose(ncr: SafetyNCR): void {
    if (confirm(`Verify and formally close NCR #${ncr.ncr_number}?`)) {
      this.constructionService.verifySafetyNCR(ncr.id, {
        verdict: 'VERIFIED_CLOSED',
        verification_notes: 'Physical site re-inspection verified compliance.'
      }).subscribe({
        next: () => this.loadNCRs()
      });
    }
  }
}
