import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking, PropertyHandover, PropertyHandoverCreate } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-handover-form',
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
  templateUrl: './handover-form.component.html'
})
export class HandoverFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Data signals
  activeBookings = signal<Booking[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string>('');

  // Selected Booking
  selectedBookingId = signal<number | null>(null);
  selectedBooking = computed(() => {
    const id = this.selectedBookingId();
    if (!id) return null;
    return this.activeBookings().find(b => b.id === Number(id)) || null;
  });

  // Form Fields
  responsibleStaffName = signal<string>('Head of Customer Experience');
  responsibleEngineerName = signal<string>('Lead QA/QC Site Engineer');
  appointmentDate = signal<string>('');
  appointmentTime = signal<string>('11:00 AM');
  remarks = signal<string>('Operational transition initiated. Unit inspection checklist and utility meters ready for verification.');

  bookingOptions = computed<SelectOption[]>(() => {
    return this.activeBookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} — ${b.customer_name} (Unit ${b.unit_number} · ${b.project_name})`
    }));
  });

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading.set(true);
    this.salesService.getBookings({ limit: 100 }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res as any).items || [];
        this.activeBookings.set(list);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onBookingSelect(val: any): void {
    this.selectedBookingId.set(Number(val) || null);
  }

  onSubmit(): void {
    if (!this.selectedBookingId()) {
      this.errorMessage.set('Please select a target property booking allotment.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload: PropertyHandoverCreate = {
      booking_id: this.selectedBookingId()!,
      responsible_staff_name: this.responsibleStaffName() || null,
      responsible_engineer_name: this.responsibleEngineerName() || null,
      appointment_date: this.appointmentDate() || null,
      appointment_time: this.appointmentTime() || null,
      remarks: this.remarks() || null
    };

    this.salesService.createHandover(payload).subscribe({
      next: (res: PropertyHandover) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/handovers', res.id]);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to initiate property handover dossier.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sales/handovers']);
  }
}
