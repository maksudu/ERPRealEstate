import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { CrmService } from '../../../core/services/crm.service';
import { PDCVaultItem } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-pdc-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './pdc-vault.component.html'
})
export class PDCVaultComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private crmService = inject(CrmService);
  private fb = inject(FormBuilder);

  cheques = signal<PDCVaultItem[]>([]);
  bookings = signal<Booking[]>([]);
  customers = signal<Customer[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Modals
  isDepositModalOpen = signal<boolean>(false);
  isStatusModalOpen = signal<boolean>(false);
  selectedCheque = signal<PDCVaultItem | null>(null);

  depositForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    customer_id: [null, Validators.required],
    cheque_number: ['', Validators.required],
    bank_name: ['Eastern Bank PLC', Validators.required],
    branch_name: ['Gulshan Branch', Validators.required],
    routing_number: ['095261120'],
    maturity_date: ['', Validators.required],
    cheque_amount: [5000000, [Validators.required, Validators.min(1000)]]
  });

  statusForm: FormGroup = this.fb.group({
    status: ['SENT_TO_BANK', Validators.required],
    dishonour_memo_date: [''],
    dishonour_reason: ['Insufficient Funds']
  });

  statusOptions = [
    { value: 'IN_VAULT', label: 'In Vault (Safe Deposit Pouch)' },
    { value: 'SENT_TO_BANK', label: 'Sent to Clearing House (NPSB/BEFTN)' },
    { value: 'HONOURED', label: 'Honoured & Credited' },
    { value: 'DISHONOURED_BOUNCED', label: 'Dishonoured / Bounced (Trigger Section 138)' }
  ];

  dishonourReasonOptions = [
    { value: 'Insufficient Funds', label: 'Insufficient Funds (তহবিল অপ্রতুল)' },
    { value: 'Payment Stopped by Drawer', label: 'Payment Stopped by Drawer' },
    { value: 'Account Closed', label: 'Account Closed / Dormant' },
    { value: 'Signature Differs', label: 'Signature Differs / Irregular' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadDropdownData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.installmentService.getPDCVault().subscribe({
      next: (res) => {
        this.cheques.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadDropdownData(): void {
    this.salesService.getBookings().subscribe(b => this.bookings.set(b));
    this.crmService.getCustomers().subscribe(c => this.customers.set(c));
  }

  get bookingOptions() {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number})`
    }));
  }

  get customerOptions() {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code})`
    }));
  }

  filteredCheques(): PDCVaultItem[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.cheques();
    return this.cheques().filter(c =>
      c.cheque_number.toLowerCase().includes(q) ||
      c.pouch_barcode.toLowerCase().includes(q) ||
      c.bank_name.toLowerCase().includes(q) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(q))
    );
  }

  openDepositModal(): void {
    this.depositForm.reset({
      booking_id: this.bookings()[0]?.id || null,
      customer_id: this.customers()[0]?.id || null,
      cheque_number: '',
      bank_name: 'Eastern Bank PLC',
      branch_name: 'Gulshan Branch',
      routing_number: '095261120',
      maturity_date: '',
      cheque_amount: 5000000
    });
    this.isDepositModalOpen.set(true);
  }

  closeDepositModal(): void {
    this.isDepositModalOpen.set(false);
  }

  submitDeposit(): void {
    if (this.depositForm.invalid) return;
    this.isSubmitting.set(true);
    this.installmentService.depositCheque(this.depositForm.value).subscribe({
      next: (created) => {
        this.cheques.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeDepositModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Deposit failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // Status Lifecycle Update
  openStatusModal(cheque: PDCVaultItem): void {
    this.selectedCheque.set(cheque);
    this.statusForm.reset({
      status: cheque.status === 'IN_VAULT' ? 'SENT_TO_BANK' : cheque.status,
      dishonour_memo_date: new Date().toISOString().split('T')[0],
      dishonour_reason: 'Insufficient Funds'
    });
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.selectedCheque.set(null);
  }

  submitStatusUpdate(): void {
    const cheque = this.selectedCheque();
    if (!cheque || this.statusForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.updatePDCStatus(cheque.id, this.statusForm.value).subscribe({
      next: (updated) => {
        this.cheques.update(list => list.map(c => c.id === updated.id ? updated : c));
        this.isSubmitting.set(false);
        this.closeStatusModal();
        if (updated.status === 'DISHONOURED_BOUNCED') {
          alert('Cheque marked as DISHONOURED. Automated Section 138 Legal Action proceeding has been initialized.');
        }
      },
      error: (err) => {
        alert(err?.error?.detail || 'Status update failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // Trigger 3-Day SMS Reminder Cron
  triggerSmsCron(): void {
    this.installmentService.triggerPdcSmsReminders().subscribe({
      next: (res) => {
        alert(`PDC 3-Day Maturity SMS Cron Executed!\n${res.reminders_dispatched} reminder SMS sent.`);
        this.loadData();
      },
      error: () => alert('Failed to execute SMS cron')
    });
  }
}
