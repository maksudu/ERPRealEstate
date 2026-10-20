import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Project } from '../../../core/models/project.model';
import { ProjectService } from '../../../core/services/project.service';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-project-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  templateUrl: './project-search.component.html'
})
export class ProjectSearchComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  projects = signal<Project[]>([]);
  selectedProject = signal<Project | null>(null);
  projectName = signal('');
  location = signal('');
  nameOptions = signal<SelectOption[]>([]);
  locationOptions = signal<SelectOption[]>([]);
  loading = signal(false);
  detailLoading = signal(false);
  error = signal('');
  optionsError = signal('');
  loaded = signal(false);
  total = signal(0);
  page = signal(1);
  pageSize = 20;

  ngOnInit(): void { this.loadProjects(); }

  loadProjects(): void {
    this.optionsError.set('');
    this.projectService.getProjectSearchOptions().subscribe({
      next: options => {
        this.nameOptions.set(options.project_names.map(name => ({ value: name, label: name })));
        this.locationOptions.set(options.locations.map(value => ({ value, label: value })));
      },
      error: () => this.optionsError.set('Search dropdown options could not be loaded. Project results are still available; retry to refresh options.')
    });
    this.search();
  }

  search(): void {
    this.loading.set(true);
    this.error.set('');
    this.selectedProject.set(null);
    this.page.set(1);
    this.fetchPage();
  }

  private fetchPage(): void {
    this.loading.set(true);
    this.projectService.searchProjects({ project_name: this.projectName(), location: this.location(), skip: (this.page() - 1) * this.pageSize, limit: this.pageSize }).subscribe({
      next: response => { this.projects.set(response.items); this.total.set(response.total); this.loaded.set(true); this.loading.set(false); },
      error: () => { this.error.set('Project records could not be loaded. Please try again.'); this.loaded.set(true); this.loading.set(false); }
    });
  }

  changePage(page: number): void {
    if (page < 1 || page > Math.ceil(this.total() / this.pageSize)) return;
    this.selectedProject.set(null);
    this.page.set(page);
    this.fetchPage();
  }

  clearSelection(): void { this.selectedProject.set(null); }
  pageCount(): number { return Math.max(1, Math.ceil(this.total() / this.pageSize)); }

  selectProject(project: Project): void {
    this.selectedProject.set(project);
    this.detailLoading.set(true);
    this.projectService.getProject(project.id).subscribe({
      next: detail => { this.selectedProject.set(detail); this.detailLoading.set(false); },
      error: () => { this.selectedProject.set(project); this.detailLoading.set(false); }
    });
  }

  reset(): void { this.projectName.set(''); this.location.set(''); this.selectedProject.set(null); this.search(); }
  trackProject(_: number, project: Project): number { return project.id; }
}
