import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { SalesService } from '../../../core/services/sales.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { HandoverInspection, HandoverDashboardMetrics } from '../../../core/models/handover.model';
import { Booking } from '../../../core/models/sales.model';
import { Unit } from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-handover-possession',
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
  templateUrl: './handover-possession.component.html'
})
export class HandoverPossessionComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private salesService = inject(SalesService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);

  inspections = signal<HandoverInspection[]>([]);
  bookings = signal<Booking[]>([]);
  units = signal<Unit[]>([]);
  metrics = signal<HandoverDashboardMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');

  // Modal states
  isCreateModalOpen = signal<boolean>(false);
  isExecuteModalOpen = signal<boolean>(false);
  selectedInspection = signal<HandoverInspection | null>(null);

  // Forms
  createForm: FormGroup = this.fb.group({
    booking_id: [null, [Validators.required, Validators.min(1)]],
    unit_id: [null, [Validators.required, Validators.min(1)]],
    site_engineer_id: [1, [Validators.required, Validators.min(1)]],
    inspection_date: [new Date().toISOString().split('T')[0], Validators.required],
    all_financial_dues_cleared: [true, Validators.required],
    key_sets_count: [3, [Validators.required, Validators.min(1)]],
    notes: ['Apartment joinery, plumbing lines, and electrical sub-station power checked with allottee.']
  });

  executeForm: FormGroup = this.fb.group({
    possession_handover_date: [new Date().toISOString().split('T')[0], Validators.required],
    key_sets_count: [3, [Validators.required, Validators.min(1)]],
    joint_customer_signoff: [true, Validators.requiredTrue],
    notes: ['Official possession letter executed. 3 brass keys, electrical DB key, and 12-month DLP warranty certificate handed over.']
  });

  bookingOptions = computed(() => {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name || 'Customer'} (Unit ${b.unit_number || b.unit_id})`
    }));
  });

  unitOptions = computed(() => {
    return this.units().map((u: any) => ({
      value: u.id,
      label: `Unit ${u.unit_number} (${u.gross_saleable_area_sqft || u.gross_sft || 1500} SFT)`
    }));
  });

  statusFilterOptions = [
    { value: 'ALL', label: 'All Handover Statuses' },
    { value: 'INSPECTION_PENDING', label: 'Inspection Scheduled' },
    { value: 'SNAGS_REPORTED', label: 'Snags Reported (Under Fix)' },
    { value: 'SNAGS_RECTIFIED', label: 'Snags Rectified (Ready for Keys)' },
    { value: 'POSSESSION_HANDED_OVER', label: 'Possession Handed Over (Keys Delivered)' }
  ];

  filteredInspections = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const stat = this.statusFilter();

    return this.inspections().filter(insp => {
      const matchQ = !q ||
        (insp.customer_name && insp.customer_name.toLowerCase().includes(q)) ||
        (insp.project_name && insp.project_name.toLowerCase().includes(q)) ||
        (insp.unit_number && insp.unit_number.toLowerCase().includes(q)) ||
        (insp.possession_letter_number && insp.possession_letter_number.toLowerCase().includes(q)) ||
        (insp.key_handover_certificate_number && insp.key_handover_certificate_number.toLowerCase().includes(q));

      const matchStat = stat === 'ALL' || insp.status === stat;
      return matchQ && matchStat;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.handoverService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });

    this.handoverService.getInspections().subscribe({
      next: (data) => {
        this.inspections.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.salesService.getBookings().subscribe({
      next: (b) => this.bookings.set(b),
      error: () => {}
    });

    this.inventoryService.getUnits().subscribe({
      next: (u) => this.units.set(u),
      error: () => {}
    });
  }

  onBookingChange(bookingId: number): void {
    const b = this.bookings().find(item => item.id === bookingId);
    if (b && b.unit_id) {
      this.createForm.patchValue({ unit_id: b.unit_id });
    }
  }

  openCreateModal(): void {
    const defaultBooking = this.bookings().length > 0 ? this.bookings()[0].id : null;
    const defaultUnit = this.bookings().length > 0 ? this.bookings()[0].unit_id : (this.units().length > 0 ? this.units()[0].id : null);

    this.createForm.reset({
      booking_id: defaultBooking,
      unit_id: defaultUnit,
      site_engineer_id: 1,
      inspection_date: new Date().toISOString().split('T')[0],
      all_financial_dues_cleared: true,
      key_sets_count: 3,
      notes: 'Apartment interior, sanitary fittings, and joinery inspected with flat allottee.'
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitInspection(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.createInspection(this.createForm.value).subscribe({
      next: (newInsp) => {
        this.inspections.update(list => [newInsp, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openExecuteModal(insp: HandoverInspection): void {
    this.selectedInspection.set(insp);
    this.executeForm.reset({
      possession_handover_date: new Date().toISOString().split('T')[0],
      key_sets_count: insp.key_sets_count || 3,
      joint_customer_signoff: true,
      notes: '3 sets of brass keys, sub-meter keys, and statutory 12-month DLP warranty certificate handed over.'
    });
    this.isExecuteModalOpen.set(true);
  }

  closeExecuteModal(): void {
    this.isExecuteModalOpen.set(false);
    this.selectedInspection.set(null);
  }

  submitExecuteHandover(): void {
    const insp = this.selectedInspection();
    if (!insp || this.executeForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.executeHandover(insp.id, this.executeForm.value).subscribe({
      next: (updated) => {
        this.inspections.update(list => list.map(i => i.id === updated.id ? updated : i));
        this.isSubmitting.set(false);
        this.closeExecuteModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  getLetterUrl(inspectionId: number): string {
    return this.handoverService.getPossessionLetterUrl(inspectionId);
  }
}
