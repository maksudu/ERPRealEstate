import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { CustomerAdvanceInstallment } from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../../shared/components';
import { CustomerAdvancesNavComponent } from '../customer-advances-nav.component';

@Component({
  selector: 'app-advance-allocations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    CustomerAdvancesNavComponent
  ],
  templateUrl: './advance-allocations.component.html'
})
export class AdvanceAllocationsComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);

  isLoading = signal<boolean>(false);
  advances = signal<CustomerAdvanceInstallment[]>([]);
  searchTerm = '';

  // Quick Allocate Modal
  showModal = signal<boolean>(false);
  selectedAdv = signal<CustomerAdvanceInstallment | null>(null);
  allocAmount = 0;
  allocNotes = '';

  ngOnInit(): void {
    this.loadAllocations();
  }

  loadAllocations(): void {
    this.isLoading.set(true);
    this.service.getTransactions({
      search: this.searchTerm,
      limit: 50
    }).subscribe({
      next: (res) => {
        // Filter those with unapplied balance or existing allocations
        this.advances.set(res.items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openAllocate(adv: CustomerAdvanceInstallment): void {
    this.selectedAdv.set(adv);
    this.allocAmount = Number(adv.unapplied_credit_balance);
    this.allocNotes = `Allocated against installment demand for ${adv.customer_name}`;
    this.showModal.set(true);
  }

  submitAlloc(): void {
    const adv = this.selectedAdv();
    if (!adv || this.allocAmount <= 0) return;

    this.service.allocateAdvance({
      advance_id: adv.id,
      installment_id: adv.installment_id,
      unit_id: adv.unit_id,
      allocated_amount: this.allocAmount,
      notes: this.allocNotes
    }).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadAllocations();
      }
    });
  }
}
