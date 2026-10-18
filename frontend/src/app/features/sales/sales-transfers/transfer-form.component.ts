import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { CrmService } from '../../../core/services/crm.service';
import { Booking, UnitTransferCreate } from '../../../core/models/sales.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-transfer-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './transfer-form.component.html'
})
export class TransferFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private crmService = inject(CrmService);
  private router = inject(Router);

  activeBookings = signal<Booking[]>([]);
  customers = signal<Customer[]>([]);
  isLoadingBookings = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Selected Booking
  selectedBookingId = signal<number | null>(null);
  selectedBooking = computed(() => {
    const id = this.selectedBookingId();
    if (!id) return null;
    return this.activeBookings().find(b => b.id === Number(id)) || null;
  });

  // Transfer Type & Destination
  transferType = signal<string>('FULL_BUYER_SUBSTITUTION');
  toCustomerId = signal<number | null>(null);

  // Co-Buyer Details
  coBuyerName = signal<string>('');
  coBuyerNid = signal<string>('');
  coBuyerPhone = signal<string>('');
  coBuyerRelation = signal<string>('SPOUSE');
  previousSharePercent = signal<number>(100.0);
  newSharePercent = signal<number>(50.0);

  // Fee calculation
  transferFeePercentage = signal<number>(1.0);

  // Documents & Remarks
  nocDocumentUrl = signal<string>('');
  salePermissionUrl = signal<string>('');
  affidavitDocumentUrl = signal<string>('');
  remarks = signal<string>('Standard ownership transfer request with consent deeds attached.');

  // Live Computed Balances & Fees
  contractValue = computed(() => Number(this.selectedBooking()?.final_contract_value || 0));
  totalPaid = computed(() => {
    const b = this.selectedBooking();
    if (!b) return 0;
    const earnest = Number(b.earnest_money_received || 0);
    const dp = Number(b.down_payment_received || b.down_payment_total || 0);
    return Math.max(0, earnest + dp);
  });
  outstandingBalance = computed(() => Math.max(0, this.contractValue() - this.totalPaid()));
  computedTransferFee = computed(() => {
    const cv = this.contractValue();
    const pct = Number(this.transferFeePercentage() || 1.0);
    return Math.round(cv * (pct / 100.0) * 100) / 100;
  });

  bookingOptions = computed<SelectOption[]>(() => {
    return this.activeBookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} — ${b.customer_name} (Unit ${b.unit_number} · ${b.project_name})`
    }));
  });

  customerOptions = computed<SelectOption[]>(() => {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.primary_phone || c.customer_code || 'ID: ' + c.id})`
    }));
  });

  transferTypeOptions: SelectOption[] = [
    { label: 'Full Buyer Substitution (Assignment to New Purchaser)', value: 'FULL_BUYER_SUBSTITUTION' },
    { label: 'Addition of Joint / Co-Buyer', value: 'ADD_CO_BUYER' },
    { label: 'Removal / Relinquishment of Co-Buyer', value: 'REMOVE_CO_BUYER' },
    { label: 'Ownership Share Amendment', value: 'SHARE_AMENDMENT' }
  ];

  coBuyerRelationOptions: SelectOption[] = [
    { label: 'Spouse (Wife / Husband)', value: 'SPOUSE' },
    { label: 'Son', value: 'SON' },
    { label: 'Daughter', value: 'DAUGHTER' },
    { label: 'Father', value: 'FATHER' },
    { label: 'Mother', value: 'MOTHER' },
    { label: 'Brother / Sister', value: 'SIBLING' },
    { label: 'Business Partner / Associate', value: 'BUSINESS_PARTNER' }
  ];

  ngOnInit(): void {
    this.loadBookings();
    this.loadCustomers();
  }

  loadBookings(): void {
    this.isLoadingBookings.set(true);
    this.salesService.getBookings({ limit: 100 }).subscribe({
      next: (res) => {
        const active = res.filter(b => b.status !== 'CANCELLED');
        this.activeBookings.set(active);
        this.isLoadingBookings.set(false);
      },
      error: () => this.isLoadingBookings.set(false)
    });
  }

  loadCustomers(): void {
    this.crmService.loadCustomersTable({ limit: 100 }).subscribe({
      next: (res) => {
        this.customers.set(res.items || []);
      }
    });
  }

  onBookingSelect(val: any): void {
    this.selectedBookingId.set(Number(val));
  }

  onTypeSelect(val: string): void {
    this.transferType.set(val);
    if (val === 'ADD_CO_BUYER') {
      this.previousSharePercent.set(100.0);
      this.newSharePercent.set(50.0);
    } else if (val === 'FULL_BUYER_SUBSTITUTION') {
      this.previousSharePercent.set(100.0);
      this.newSharePercent.set(100.0);
    }
  }

  submit(): void {
    const bookingId = this.selectedBookingId();
    if (!bookingId) {
      this.errorMessage.set('Please select a target booking.');
      return;
    }

    const tType = this.transferType();
    if (tType === 'FULL_BUYER_SUBSTITUTION') {
      if (!this.toCustomerId()) {
        this.errorMessage.set('Please select destination transferee customer profile.');
        return;
      }
      if (this.selectedBooking()?.primary_customer_id === Number(this.toCustomerId())) {
        this.errorMessage.set('Cannot substitute unit to the identical existing customer profile.');
        return;
      }
    } else if (tType === 'ADD_CO_BUYER' || tType === 'REMOVE_CO_BUYER') {
      if (!this.coBuyerName().trim()) {
        this.errorMessage.set('Please provide the joint / co-buyer legal full name.');
        return;
      }
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload: UnitTransferCreate = {
      booking_id: bookingId,
      transfer_type: tType,
      to_customer_id: tType === 'FULL_BUYER_SUBSTITUTION' ? Number(this.toCustomerId()) : null,
      co_buyer_name: this.coBuyerName().trim() || null,
      co_buyer_nid: this.coBuyerNid().trim() || null,
      co_buyer_phone: this.coBuyerPhone().trim() || null,
      co_buyer_relation: this.coBuyerRelation() || null,
      previous_share_percent: Number(this.previousSharePercent() || 100.0),
      new_share_percent: Number(this.newSharePercent() || 100.0),
      transfer_fee_percentage: Number(this.transferFeePercentage() || 1.0),
      noc_document_url: this.nocDocumentUrl() || null,
      sale_permission_url: this.salePermissionUrl() || null,
      affidavit_document_url: this.affidavitDocumentUrl() || null,
      remarks: this.remarks() || null
    };

    this.salesService.createTransfer(payload).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/transfers', created.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to submit property transfer request.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sales/transfers']);
  }
}
