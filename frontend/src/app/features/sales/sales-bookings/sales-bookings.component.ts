import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { CrmService } from '../../../core/services/crm.service';
import { Booking, BookingJointBuyer, SalesMetrics } from '../../../core/models/sales.model';
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
  
  // Create Booking Modal State
  isCreateModalOpen = signal<boolean>(false);
  tempJointBuyers = signal<BookingJointBuyer[]>([]);
  isAddingJointBuyer = signal<boolean>(false);

  // KYC & Pricing Breakdown Modal State
  isKYCModalOpen = signal<boolean>(false);
  selectedBookingForKYC = signal<Booking | null>(null);
  isAddingJointBuyerToExisting = signal<boolean>(false);

  // Transfer Modal
  isTransferModalOpen = signal<boolean>(false);
  selectedBookingForTransfer = signal<Booking | null>(null);

  bookingForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    unit_id: [null, Validators.required],
    primary_customer_id: [null, Validators.required],
    parking_slot_number: [''],
    parking_charge: [350000, [Validators.min(0)]],
    utility_charge: [250000, [Validators.min(0)]],
    documentation_charge: [50000, [Validators.min(0)]],
    discount_amount: [0, [Validators.min(0)]],
    earnest_money_received: [500000, [Validators.required, Validators.min(100000)]],
    down_payment_total: [0],
    notes: ['']
  });

  jointBuyerForm: FormGroup = this.fb.group({
    full_name_en: ['', Validators.required],
    full_name_bn: [''],
    relation_to_primary: ['SPOUSE', Validators.required],
    primary_phone: ['', Validators.required],
    email: [''],
    nid_number: [''],
    passport_number: [''],
    tin_number: [''],
    share_percentage: [50, [Validators.required, Validators.min(1), Validators.max(100)]],
    present_address: ['']
  });

  transferForm: FormGroup = this.fb.group({
    to_customer_id: [null, Validators.required],
    transfer_fee_bdt: [50000, [Validators.required, Validators.min(0)]],
    transfer_memo_no: [''],
    remarks: ['']
  });

  relationOptions = [
    { value: 'SPOUSE', label: 'Spouse (স্ত্রী / স্বামী)' },
    { value: 'SON', label: 'Son (পুত্র)' },
    { value: 'DAUGHTER', label: 'Daughter (কন্যা)' },
    { value: 'BROTHER', label: 'Brother (ভাই)' },
    { value: 'SISTER', label: 'Sister (বোন)' },
    { value: 'FATHER', label: 'Father (পিতা)' },
    { value: 'MOTHER', label: 'Mother (মাতা)' },
    { value: 'BUSINESS_PARTNER', label: 'Business Partner (ব্যবসায়িক অংশীদার)' }
  ];

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

  // Selected Unit Price Calculation
  getSelectedUnit(): Unit | undefined {
    const unitId = this.bookingForm.get('unit_id')?.value;
    if (!unitId) return undefined;
    return this.units().find(u => u.id === Number(unitId));
  }

  getBaseUnitPrice(): number {
    const unit = this.getSelectedUnit();
    return Number(unit?.total_unit_price || 0);
  }

  getGrossContractValue(): number {
    const base = this.getBaseUnitPrice();
    const parking = Number(this.bookingForm.get('parking_charge')?.value || 0);
    const utility = Number(this.bookingForm.get('utility_charge')?.value || 0);
    const docs = Number(this.bookingForm.get('documentation_charge')?.value || 0);
    return base + parking + utility + docs;
  }

  getDiscountPercentage(): number {
    const gross = this.getGrossContractValue();
    const discount = Number(this.bookingForm.get('discount_amount')?.value || 0);
    if (gross <= 0 || discount <= 0) return 0;
    return Number(((discount / gross) * 100).toFixed(2));
  }

  getNetContractValue(): number {
    const gross = this.getGrossContractValue();
    const discount = Number(this.bookingForm.get('discount_amount')?.value || 0);
    return Math.max(0, gross - discount);
  }

  getDiscountEscalationTier(): { tier: string; badgeClass: string; description: string } {
    const pct = this.getDiscountPercentage();
    if (pct <= 0) {
      return { tier: 'NO_DISCOUNT', badgeClass: 'bg-secondary text-muted-foreground', description: 'Standard Catalog Pricing' };
    }
    if (pct <= 1.0) {
      return { tier: 'SALES_MANAGER', badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20', description: 'Within 1.0% - Sales Manager Discretion (Auto-Approved)' };
    }
    if (pct <= 3.0) {
      return { tier: 'SALES_MANAGER_ESCALATED', badgeClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/20', description: '1.0% to 3.0% - Requires Sales Manager Authorization' };
    }
    if (pct <= 7.0) {
      return { tier: 'HEAD_OF_SALES', badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20', description: '3.0% to 7.0% - Requires Head of Sales Approval' };
    }
    return { tier: 'MANAGING_DIRECTOR', badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold', description: '> 7.0% - Mandatory Managing Director (MD) Direct Clearance' };
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
    this.tempJointBuyers.set([]);
    this.isAddingJointBuyer.set(false);
    this.bookingForm.reset({
      project_id: this.projects()[0]?.id || null,
      unit_id: null,
      primary_customer_id: null,
      parking_slot_number: 'B1-P' + Math.floor(10 + Math.random() * 80),
      parking_charge: 350000,
      utility_charge: 250000,
      documentation_charge: 50000,
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

  // Temporary Joint Buyers in Create Form
  toggleAddJointBuyer(): void {
    this.isAddingJointBuyer.update(v => !v);
    if (this.isAddingJointBuyer()) {
      this.jointBuyerForm.reset({
        full_name_en: '',
        full_name_bn: '',
        relation_to_primary: 'SPOUSE',
        primary_phone: '',
        email: '',
        nid_number: '',
        passport_number: '',
        tin_number: '',
        share_percentage: 50,
        present_address: ''
      });
    }
  }

  saveTempJointBuyer(): void {
    if (this.jointBuyerForm.invalid) return;
    this.tempJointBuyers.update(list => [...list, this.jointBuyerForm.value]);
    this.isAddingJointBuyer.set(false);
  }

  removeTempJointBuyer(index: number): void {
    this.tempJointBuyers.update(list => list.filter((_, i) => i !== index));
  }

  submitBooking(): void {
    if (this.bookingForm.invalid) return;
    this.isSubmitting.set(true);
    const payload = {
      ...this.bookingForm.value,
      joint_buyers: this.tempJointBuyers()
    };
    this.salesService.createBooking(payload).subscribe({
      next: (created) => {
        this.bookings.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Booking execution failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // View / Manage KYC & Breakdown Modal
  openKYCModal(b: Booking): void {
    this.selectedBookingForKYC.set(b);
    this.isAddingJointBuyerToExisting.set(false);
    this.isKYCModalOpen.set(true);
  }

  closeKYCModal(): void {
    this.isKYCModalOpen.set(false);
    this.selectedBookingForKYC.set(null);
  }

  toggleAddJointBuyerToExisting(): void {
    this.isAddingJointBuyerToExisting.update(v => !v);
    if (this.isAddingJointBuyerToExisting()) {
      this.jointBuyerForm.reset({
        full_name_en: '',
        full_name_bn: '',
        relation_to_primary: 'SPOUSE',
        primary_phone: '',
        email: '',
        nid_number: '',
        passport_number: '',
        tin_number: '',
        share_percentage: 50,
        present_address: ''
      });
    }
  }

  saveJointBuyerToExisting(): void {
    const booking = this.selectedBookingForKYC();
    if (!booking || this.jointBuyerForm.invalid) return;
    this.isSubmitting.set(true);
    this.salesService.addJointBuyer(booking.id, this.jointBuyerForm.value).subscribe({
      next: (jb) => {
        this.isSubmitting.set(false);
        this.isAddingJointBuyerToExisting.set(false);
        // Update booking in local list
        const updated = {
          ...booking,
          joint_buyers: [...(booking.joint_buyers || []), jb]
        };
        this.selectedBookingForKYC.set(updated);
        this.bookings.update(list => list.map(item => item.id === booking.id ? updated : item));
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to add joint buyer');
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
