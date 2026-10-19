import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { CustomerAdvanceInstallment } from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../../shared/components';
import { CustomerAdvancesNavComponent } from '../customer-advances-nav.component';

@Component({
  selector: 'app-cancellations-refunds',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    CustomerAdvancesNavComponent
  ],
  templateUrl: './cancellations-refunds.component.html'
})
export class CancellationsRefundsComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);

  isLoading = signal<boolean>(false);
  advances = signal<CustomerAdvanceInstallment[]>([]);
  searchTerm = '';

  showModal = signal<boolean>(false);
  selectedAdv = signal<CustomerAdvanceInstallment | null>(null);
  refundForm = {
    refund_amount: 0,
    forfeiture_amount: 0,
    reason: 'Mutual agreement cancellation / loan denial',
    notes: 'Approved refund voucher posted'
  };

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.service.getTransactions({
      search: this.searchTerm,
      limit: 50
    }).subscribe({
      next: (res) => {
        this.advances.set(res.items);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openRefundModal(adv: CustomerAdvanceInstallment): void {
    this.selectedAdv.set(adv);
    const unapplied = Number(adv.unapplied_credit_balance);
    const forfeit = Math.min(unapplied * 0.1, 100000); // 10% forfeiture policy
    this.refundForm = {
      refund_amount: Math.max(0, unapplied - forfeit),
      forfeiture_amount: forfeit,
      reason: 'Mutual allotment release and refund',
      notes: `Forfeiture retained under REHAB policy for ${adv.customer_name}`
    };
    this.showModal.set(true);
  }

  submitRefund(): void {
    const adv = this.selectedAdv();
    if (!adv) return;

    this.service.processRefund({
      advance_id: adv.id,
      refund_amount: this.refundForm.refund_amount,
      forfeiture_amount: this.refundForm.forfeiture_amount,
      reason: this.refundForm.reason,
      notes: this.refundForm.notes
    }).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadData();
      }
    });
  }
}
