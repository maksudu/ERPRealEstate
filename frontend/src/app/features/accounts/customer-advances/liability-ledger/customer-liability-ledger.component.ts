import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { ProjectService } from '../../../../core/services/project.service';
import {
  CustomerLiabilityLedgerItem,
  CustomerLiabilityLedgerSummaryResponse
} from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  SearchableSelectComponent
} from '../../../../shared/components';
import { CustomerAdvancesNavComponent } from '../customer-advances-nav.component';

@Component({
  selector: 'app-customer-liability-ledger',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    SearchableSelectComponent,
    CustomerAdvancesNavComponent
  ],
  templateUrl: './customer-liability-ledger.component.html'
})
export class CustomerLiabilityLedgerComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);
  private projectService = inject(ProjectService);

  isLoading = signal<boolean>(false);
  ledgerData = signal<CustomerLiabilityLedgerSummaryResponse | null>(null);
  customers = signal<CustomerLiabilityLedgerItem[]>([]);

  searchTerm = '';
  selectedProject: number | null = null;
  projectOptions = signal<{ label: string; value: number }[]>([]);

  ngOnInit(): void {
    this.loadProjects();
    this.loadLedger();
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

  loadLedger(): void {
    this.isLoading.set(true);
    this.service.getLiabilityLedger({
      search: this.searchTerm,
      project_id: this.selectedProject && this.selectedProject > 0 ? this.selectedProject : undefined
    }).subscribe({
      next: (res) => {
        this.ledgerData.set(res);
        this.customers.set(res.customers);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadLedger();
  }
}
