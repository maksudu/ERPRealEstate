import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { CrmService } from '../../../core/services/crm.service';
import { Booking, SalesMetrics } from '../../../core/models/sales.model';
import { Project } from '../../../core/models/project.model';
import { Unit } from '../../../core/models/inventory.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-bookings.component.html'
})
export class SalesBookingsComponent implements OnInit {
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private inventoryService = inject(InventoryService);
  private crmService = inject(CrmService);
  private fb = inject(FormBuilder);

  bookings = signal<Booking[]>([]);
  projects = signal<Project[]>([]);
  units = signal<Unit[]>([]);
  customers = signal<Customer[]>([]);
  metrics = signal<SalesMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  isCreateModalOpen = signal<boolean>(false);

  // Transfer Modal
  isTransferModalOpen = signal<boolean>(false);
  selectedBookingForTransfer = signal<Booking | null>(null);

  bookingForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    unit_id: [null, Validators.required],
    primary_customer_id: [null, Validators.required],
    discount_amount: [0, [Validators.min(0)]],
    earnest_money_received: [500000, [Validators.required, Validators.min(100000)]],
    down_payment_total: [0],
    notes: ['']
  });

  transferForm: FormGroup = this.fb.group({
    to_customer_id: [null, Validators.required],
    transfer_fee_bdt: [50000, [Validators.required, Validators.min(0)]],
    transfer_memo_no: [''],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadData();
    this.loadDropdownData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.salesService.getBookings().subscribe({
      next: (res) => {
        this.bookings.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.salesService.getSalesMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadDropdownData(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.crmService.getCustomers().subscribe(c => this.customers.set(c));
    this.inventoryService.getUnits().subscribe(u => {
      // Show available units or landowner share units
      this.units.set(u.filter(item => item.status_id === 'AVAILABLE' || item.status_id === 'ON_HOLD'));
    });
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  get unitOptions() {
    return this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (Floor ${u.floor_number}) - BDT ${Number(u.total_unit_price || 0).toLocaleString()}`
    }));
  }

  get customerOptions() {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code} - NID: ${c.nid_number || 'N/A'})`
    }));
  }

  filteredBookings(): Booking[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.bookings();
    return this.bookings().filter(b =>
      b.booking_reference_no.toLowerCase().includes(q) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
      (b.unit_number && b.unit_number.toLowerCase().includes(q)) ||
      (b.project_name && b.project_name.toLowerCase().includes(q))
    );
  }

  openCreateModal(): void {
    this.bookingForm.reset({
      project_id: this.projects()[0]?.id || null,
      unit_id: null,
      primary_customer_id: null,
      discount_amount: 0,
      earnest_money_received: 500000,
      down_payment_total: 0,
      notes: ''
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitBooking(): void {
    if (this.bookingForm.invalid) return;
    this.isSubmitting.set(true);
    this.salesService.createBooking(this.bookingForm.value).subscribe({
      next: (created) => {
        this.bookings.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Booking failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // WeasyPrint Deed Download
  downloadDeed(b: Booking): void {
    this.salesService.downloadDeedPdf(b.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Deed_of_Agreement_${b.booking_reference_no}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download deed PDF: ' + (err?.error?.detail || 'Server error'))
    });
  }

  // Unit Mutation Transfer
  openTransferModal(b: Booking): void {
    this.selectedBookingForTransfer.set(b);
    this.transferForm.reset({
      to_customer_id: null,
      transfer_fee_bdt: 50000,
      transfer_memo_no: `TRF-${b.booking_reference_no}`,
      remarks: ''
    });
    this.isTransferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferModalOpen.set(false);
    this.selectedBookingForTransfer.set(null);
  }

  submitTransfer(): void {
    const booking = this.selectedBookingForTransfer();
    if (!booking || this.transferForm.invalid) return;

    this.isSubmitting.set(true);
    const payload = {
      booking_id: booking.id,
      ...this.transferForm.value
    };
    this.salesService.processTransfer(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeTransferModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Transfer failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
