import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { DPRReport, ConstructionMetrics } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-dpr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-dpr.component.html'
})
export class ConstructionDprComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  dprReports = signal<DPRReport[]>([]);
  projects = signal<Project[]>([]);
  metrics = signal<ConstructionMetrics | null>(null);

  isLoading = signal<boolean>(false);
  selectedProjectId = signal<number | null>(null);
  searchQuery = signal<string>('');
  selectedDate = signal<string>('');
  selectedDprForPhotos = signal<DPRReport | null>(null);

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  projectOptions: { value: any; label: string }[] = [];

  ngOnInit(): void {
    this.loadProjects();
    this.loadMetrics();
    this.loadDPRReports();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Construction Projects' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
          }))
        ];
      }
    });
  }

  loadMetrics(): void {
    this.constructionService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadDPRReports(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const filters: any = {
      limit: this.pageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedDate()) filters.report_date = this.selectedDate();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getDPRReports(filters).subscribe({
      next: (data) => {
        this.dprReports.set(data);
        this.totalRecords.set(data.length < this.pageSize() && this.currentPage() === 1 ? data.length : 100);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectFilterChange(projectId: any): void {
    this.selectedProjectId.set(projectId ? Number(projectId) : null);
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  onSearchChange(): void {
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  onDateFilterChange(): void {
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  clearFilters(): void {
    this.selectedProjectId.set(null);
    this.searchQuery.set('');
    this.selectedDate.set('');
    this.currentPage.set(1);
    this.loadDPRReports();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.loadDPRReports();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadDPRReports();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/construction/dpr/create']);
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/construction/dpr/edit', id]);
  }

  deleteDPR(id: number): void {
    if (confirm(`Are you sure you want to delete DPR record #${id}? This action cannot be undone.`)) {
      this.constructionService.deleteDPRReport(id).subscribe({
        next: () => {
          this.loadDPRReports();
          this.loadMetrics();
        }
      });
    }
  }

  viewPhotos(dpr: DPRReport): void {
    this.selectedDprForPhotos.set(dpr);
  }

  closePhotos(): void {
    this.selectedDprForPhotos.set(null);
  }
}
