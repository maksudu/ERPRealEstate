import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { ProjectService } from '../../../../core/services/project.service';
import { ReceivableAgingReconciliationResponse } from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  SearchableSelectComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-aging-reconciliation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './aging-reconciliation.component.html'
})
export class AgingReconciliationComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);
  private projectService = inject(ProjectService);

  isLoading = signal<boolean>(false);
  agingData = signal<ReceivableAgingReconciliationResponse | null>(null);

  selectedProject: number | null = null;
  projectOptions = signal<{ label: string; value: number }[]>([]);

  ngOnInit(): void {
    this.loadProjects();
    this.loadAging();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.projectOptions.set([
          { label: 'All 20+ Projects', value: 0 },
          ...list.map((p: any) => ({ label: p.project_name || p.name, value: p.id }))
        ]);
      }
    });
  }

  loadAging(): void {
    this.isLoading.set(true);
    this.service.getAgingReconciliation(
      this.selectedProject && this.selectedProject > 0 ? this.selectedProject : undefined
    ).subscribe({
      next: (res) => {
        this.agingData.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFilterChange(): void {
    this.loadAging();
  }
}
