import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  ConstructionReportMeta,
  ConstructionReportSummaryKPIs,
  ConstructionReportResponse,
  Subcontractor
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-reports.component.html'
})
export class ConstructionReportsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private lookupService = inject(LookupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Active Report Code
  selectedReportCode = signal<string>('PROJECT_PROGRESS');
  selectedCategory = signal<string>('ALL');

  // Metadata & KPIs
  reportTypes = signal<ConstructionReportMeta[]>([]);
  kpis = signal<ConstructionReportSummaryKPIs | null>(null);
  reportData = signal<ConstructionReportResponse | null>(null);
  isLoading = signal<boolean>(true);
  isExporting = signal<boolean>(false);

  // Filters State
  searchQuery = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedContractorId = signal<number | null>(null);
  selectedStatus = signal<string>('');
  page = signal<number>(1);
  pageSize = signal<number>(25);

  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];
  reportDropdownOptions: { value: any; label: string }[] = [];
  dynamicCategories = signal<{ id: string; label: string }[]>([
    { id: 'ALL', label: 'All 14 Reports' }
  ]);

  // Active report metadata
  activeReportMeta = computed(() => {
    return this.reportTypes().find(r => r.code === this.selectedReportCode()) || null;
  });

  // Filtered reports list by category
  filteredReportTypes = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'ALL') return this.reportTypes();
    return this.reportTypes().filter(r => r.category === cat);
  });

  totalPages = computed(() => {
    const total = this.reportData()?.total_items || 0;
    return Math.ceil(total / this.pageSize()) || 1;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['type']) {
        this.selectedReportCode.set(String(params['type']).toUpperCase());
      }
    });

    this.loadDropdowns();
    this.loadMetaAndKPIs();
    this.loadReportData();
  }

  loadDropdowns(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res.data || [];
        this.projects.set(list);
        this.projectOptions = [
          { value: null, label: 'All Construction Projects' },
          ...list.map((p: Project) => ({ value: p.id, label: p.project_name }))
        ];
      }
    });

    this.constructionService.getContractorsPaged({ limit: 100 }).subscribe({
      next: (res: any) => {
        const list = res.items || [];
        this.contractors.set(list);
        this.contractorOptions = [
          { value: null, label: 'All Trade Contractors' },
          ...list.map((c: Subcontractor) => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadMetaAndKPIs(): void {
    // Load dynamic categories from LookupService (Spec requirement 1)
    this.lookupService.getItems('CONSTRUCTION_REPORT_CATEGORY').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.dynamicCategories.set(items.map(i => ({
            id: i.item_code,
            label: i.item_name_en
          })));
        } else {
          this.fallbackCategoriesFromTypes();
        }
      },
      error: () => this.fallbackCategoriesFromTypes()
    });

    this.constructionService.getConstructionReportTypes().subscribe({
      next: (types) => {
        this.reportTypes.set(types);
        this.reportDropdownOptions = types.map(t => ({
          value: t.code,
          label: t.name
        }));
        if (this.dynamicCategories().length <= 1) {
          this.fallbackCategoriesFromTypes();
        }
      }
    });

    this.constructionService.getConstructionReportSummaryKPIs().subscribe({
      next: (k) => this.kpis.set(k)
    });
  }

  private fallbackCategoriesFromTypes(): void {
    const cats = Array.from(new Set(this.reportTypes().map(r => r.category))).filter(Boolean);
    if (cats.length > 0) {
      this.dynamicCategories.set([
        { id: 'ALL', label: 'All 14 Reports' },
        ...cats.map(c => ({ id: c, label: c }))
      ]);
    }
  }

  selectReport(code: string): void {
    this.selectedReportCode.set(code);
    this.page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { type: code },
      queryParamsHandling: 'merge'
    });
    this.loadReportData();
  }

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    const filtered = this.filteredReportTypes();
    if (filtered.length > 0 && !filtered.some(r => r.code === this.selectedReportCode())) {
      this.selectReport(filtered[0].code);
    }
  }

  loadReportData(): void {
    this.isLoading.set(true);
    const offset = (this.page() - 1) * this.pageSize();
    const filters: any = {
      limit: this.pageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedStatus()) filters.status = this.selectedStatus();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getConstructionReportData(this.selectedReportCode(), filters).subscribe({
      next: (data) => {
        this.reportData.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadReportData();
  }

  changePage(delta: number): void {
    const p = this.page() + delta;
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.loadReportData();
    }
  }

  exportCSV(): void {
    const data = this.reportData();
    if (!data || !data.items || data.items.length === 0) return;

    this.isExporting.set(true);
    try {
      const headers = data.columns.map(c => `"${c.label}"`).join(',');
      const rows = data.items.map(row => {
        return data.columns.map(col => {
          const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\r\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `${data.report_type.toLowerCase()}_report_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      this.isExporting.set(false);
    }
  }

  printReport(): void {
    window.print();
  }
}
