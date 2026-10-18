import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { RABill, WorkOrder, JointMeasurementSheet } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-ra-bills',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-ra-bills.component.html'
})
export class ConstructionRaBillsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private router = inject(Router);

  currentTab = signal<'BILLS' | 'WORK_ORDERS' | 'JMS'>('BILLS');
  raBills = signal<RABill[]>([]);
  workOrders = signal<WorkOrder[]>([]);
  jointMeasurements = signal<JointMeasurementSheet[]>([]);
  isLoading = signal<boolean>(false);

  // Search & Filters
  searchQuery = signal<string>('');
  selectedWorkOrderId = signal<number | null>(null);

  // Pagination State
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalRecords = signal<number>(0);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    if (this.currentTab() === 'BILLS') {
      const filters: any = {
        limit: this.pageSize(),
        offset: offset
      };
      if (this.selectedWorkOrderId()) filters.workOrderId = this.selectedWorkOrderId();
      if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

      this.constructionService.getRABills(filters).subscribe({
        next: (bills) => {
          this.raBills.set(bills);
          this.totalRecords.set(bills.length < this.pageSize() && this.currentPage() === 1 ? bills.length : 100);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else if (this.currentTab() === 'WORK_ORDERS') {
      this.constructionService.getWorkOrders().subscribe({
        next: (wos) => {
          this.workOrders.set(wos);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    } else {
      this.constructionService.getJointMeasurements().subscribe({
        next: (jms) => {
          this.jointMeasurements.set(jms);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  setTab(tab: 'BILLS' | 'WORK_ORDERS' | 'JMS'): void {
    this.currentTab.set(tab);
    this.currentPage.set(1);
    this.loadData();
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadData();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.selectedWorkOrderId.set(null);
    this.currentPage.set(1);
    this.loadData();
  }

  nextPage(): void {
    this.currentPage.update(p => p + 1);
    this.loadData();
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadData();
    }
  }

  navigateToCreateBill(): void {
    this.router.navigate(['/construction/ra-bills/create']);
  }

  navigateToViewBill(id: number): void {
    this.router.navigate(['/construction/ra-bills/view', id]);
  }

  navigateToCreateWorkOrder(): void {
    this.router.navigate(['/construction/work-orders/create']);
  }

  getTotalCertified(): number {
    return this.raBills().reduce((acc, curr) => acc + (curr.gross_work_certified_amount || 0), 0);
  }

  getTotalRetention(): number {
    return this.raBills().reduce((acc, curr) => acc + (curr.retention_money_deducted || 0), 0);
  }

  getTotalNetPayable(): number {
    return this.raBills().reduce((acc, curr) => acc + (curr.net_payable_amount || 0), 0);
  }
}
