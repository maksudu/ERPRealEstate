import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { CustomerAdvanceInstallment } from '../../../../core/models/customer-advance-accounting.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-advance-adjustments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent
  ],
  templateUrl: './advance-adjustments.component.html'
})
export class AdvanceAdjustmentsComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);

  isLoading = signal<boolean>(false);
  advances = signal<CustomerAdvanceInstallment[]>([]);
  searchTerm = '';

  // Quick Adjustment Modal
  showModal = signal<boolean>(false);
  selectedAdv = signal<CustomerAdvanceInstallment | null>(null);
  adjForm = {
    adjustment_type: 'LATE_CHARGE_WAIVER',
    amount: 0,
    approved_by: 'Managing Director',
    approval_reference: 'WAIVER-2026-001',
    reason: 'Client requested concession due to early down-payment completion.'
  };

  adjTypeOptions = signal<{ label: string; value: string }[]>([
    { label: 'Approved Late Fee Waiver (Credit)', value: 'LATE_CHARGE_WAIVER' },
    { label: 'Late Surcharge Assessment (Debit)', value: 'LATE_CHARGE_ASSESSMENT' }
  ]);

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

  openAdjustModal(adv: CustomerAdvanceInstallment): void {
    this.selectedAdv.set(adv);
    this.adjForm = {
      adjustment_type: 'LATE_CHARGE_WAIVER',
      amount: Number(adv.late_charges_assessed) || 10000,
      approved_by: 'Managing Director',
      approval_reference: `WAIVER-${adv.advance_number}`,
      reason: 'Management concession on milestone delay.'
    };
    this.showModal.set(true);
  }

  submitAdjustment(): void {
    const adv = this.selectedAdv();
    if (!adv || this.adjForm.amount <= 0) return;

    this.service.adjustLateCharges({
      advance_id: adv.id,
      booking_id: adv.booking_id || 1,
      customer_id: adv.customer_id,
      adjustment_type: this.adjForm.adjustment_type,
      amount: this.adjForm.amount,
      approved_by: this.adjForm.approved_by,
      approval_reference: this.adjForm.approval_reference,
      reason: this.adjForm.reason
    }).subscribe({
      next: () => {
        this.showModal.set(false);
        this.loadData();
      }
    });
  }
}
