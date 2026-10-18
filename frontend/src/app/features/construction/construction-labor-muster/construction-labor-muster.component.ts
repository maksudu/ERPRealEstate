import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { Subcontractor, LaborMuster } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-labor-muster',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-labor-muster.component.html'
})
export class ConstructionLaborMusterComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private router = inject(Router);

  contractors = signal<Subcontractor[]>([]);
  laborEntries = signal<LaborMuster[]>([]);
  isLoading = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  selectedContractorId = signal<number | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  contractorOptions: { value: any; label: string }[] = [];

  ngOnInit(): void {
    this.loadContractors();
    this.loadLaborMuster();
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (data) => {
        this.contractors.set(data);
        this.contractorOptions = [
          { value: null, label: 'All Subcontractors' },
          ...data.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadLaborMuster(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();
    const filters: any = {
      limit: this.pageSize(),
      offset: offset
    };
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getLaborMusterList(filters).subscribe({
      next: (entries) => {
        this.laborEntries.set(entries);
        this.totalRecords.set(entries.length < this.pageSize() && this.currentPage() === 1 ? entries.length : 100);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onContractorFilter(contractorId: any): void {
    this.selectedContractorId.set(contractorId ? Number(contractorId) : null);
    this.currentPage.set(1);
    this.loadLaborMuster();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadLaborMuster();
  }

  clearFilters(): void {
    this.selectedContractorId.set(null);
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadLaborMuster();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.loadLaborMuster();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadLaborMuster();
    }
  }

  navigateToEnlistContractor(): void {
    this.router.navigate(['/construction/contractors/create']);
  }

  navigateToEditContractor(id: number): void {
    this.router.navigate(['/construction/contractors/edit', id]);
  }

  navigateToCreateMuster(): void {
    this.router.navigate(['/construction/labor-muster/create']);
  }

  navigateToEditMuster(id: number): void {
    this.router.navigate(['/construction/labor-muster/edit', id]);
  }

  deleteMuster(id: number): void {
    if (confirm(`Delete labor muster record #${id}?`)) {
      this.constructionService.deleteLaborMuster(id).subscribe({
        next: () => this.loadLaborMuster()
      });
    }
  }

  getTotalWorkers(): number {
    return this.laborEntries().reduce((acc, curr) => acc + (curr.worker_count || 0), 0);
  }

  getTotalWage(): number {
    return this.laborEntries().reduce((acc, curr) => acc + (curr.total_wage || 0), 0);
  }
}
