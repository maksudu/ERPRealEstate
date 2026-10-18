import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { ConcreteCubeTest, CubeTestNotificationAlert } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-concrete-cube-tests',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './concrete-cube-tests.component.html'
})
export class ConcreteCubeTestsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  cubeTests = signal<ConcreteCubeTest[]>([]);
  alerts = signal<CubeTestNotificationAlert[]>([]);
  projects = signal<Project[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  filterProjectId = signal<number | null>(null);
  filterVerdict = signal<string>('');
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  projectOptions: { value: any; label: string }[] = [];

  verdictOptions = [
    { value: '', label: 'All Test Verdicts' },
    { value: 'PASSED', label: 'PASSED (>= 100% Target)' },
    { value: 'WARNING_LOW_STRENGTH', label: 'LOW STRENGTH WARNING (<55% Day 7)' },
    { value: 'FAILED', label: 'FAILED (< 85% Target)' },
    { value: 'PENDING', label: 'PENDING CRUSHING' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadAlerts();
    this.loadTests();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Projects' },
          ...projs.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
          }))
        ];
      }
    });
  }

  loadAlerts(): void {
    this.constructionService.getCubeTestAlerts().subscribe({
      next: (data) => this.alerts.set(data),
      error: () => {}
    });
  }

  loadTests(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const filters: any = {
      limit: this.pageSize(),
      offset: offset
    };
    if (this.filterProjectId()) filters.project_id = this.filterProjectId();
    if (this.filterVerdict()) filters.verdict = this.filterVerdict();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getCubeTests(filters).subscribe({
      next: (data) => {
        this.cubeTests.set(data);
        this.totalRecords.set(data.length < this.pageSize() && this.currentPage() === 1 ? data.length : 100);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFilterProject(projectId: any): void {
    this.filterProjectId.set(projectId ? Number(projectId) : null);
    this.currentPage.set(1);
    this.loadTests();
  }

  onFilterVerdict(verdict: any): void {
    this.filterVerdict.set(verdict || '');
    this.currentPage.set(1);
    this.loadTests();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadTests();
  }

  clearFilters(): void {
    this.filterProjectId.set(null);
    this.filterVerdict.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadTests();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.loadTests();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadTests();
    }
  }

  navigateToCreate(): void {
    this.router.navigate(['/construction/cube-tests/create']);
  }

  navigateToRecord(id: number): void {
    this.router.navigate(['/construction/cube-tests/record', id]);
  }
}
