import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking, RegistrationChecklistTemplate, DeedRegistration, DeedRegistrationCreate } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-registration-form',
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
  templateUrl: './registration-form.component.html'
})
export class RegistrationFormComponent implements OnInit {
  private salesService = inject(SalesService);
  private router = inject(Router);

  // Data signals
  activeBookings = signal<Booking[]>([]);
  templates = signal<RegistrationChecklistTemplate[]>([]);
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

  // Selected Template
  selectedTemplateId = signal<number | null>(null);
  selectedTemplate = computed(() => {
    const id = this.selectedTemplateId();
    if (!id) return null;
    return this.templates().find(t => t.id === Number(id)) || null;
  });

  // Form Fields
  deedType = signal<string>('SALE_DEED_SAF_KABALA');
  subRegistryOffice = signal<string>('Gulshan Sub-Registry Office');
  conductingAdvocate = signal<string>('');
  remarks = signal<string>('Initiated statutory deed preparation and registration workflow.');

  // Statutory Fees (auto-calculated default based on contract value)
  stampDuty = signal<number>(0);
  registrationFee = signal<number>(0);
  aitTax = signal<number>(0);
  localGovTax = signal<number>(0);

  totalRegistrationCosts = computed(() => {
    return (
      Number(this.stampDuty() || 0) +
      Number(this.registrationFee() || 0) +
      Number(this.aitTax() || 0) +
      Number(this.localGovTax() || 0)
    );
  });

  bookingOptions = computed<SelectOption[]>(() => {
    return this.activeBookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} — ${b.customer_name} (Unit ${b.unit_number} · ${b.project_name})`
    }));
  });

  templateOptions = computed<SelectOption[]>(() => {
    return this.templates().map(t => ({
      value: t.id,
      label: `${t.template_name} (${t.property_type}) — ${t.checklist_schema?.length || 0} checklist items`
    }));
  });

  deedTypeOptions: SelectOption[] = [
    { label: 'Sale Deed (Saf Kabala)', value: 'SALE_DEED_SAF_KABALA' },
    { label: 'Agreement for Sale (Baynanama)', value: 'DEED_OF_AGREEMENT_BAYNANAMA' },
    { label: 'General Power of Attorney', value: 'POWER_OF_ATTORNEY' },
    { label: 'Heba / Gift Deed', value: 'HEBA_GIFT_DEED' },
    { label: 'Deed of Declaration', value: 'DEED_OF_DECLARATION' }
  ];

  subRegistryOptions: SelectOption[] = [
    { label: 'Gulshan Sub-Registry Office', value: 'Gulshan Sub-Registry Office' },
    { label: 'Tejgaon Sub-Registry Office', value: 'Tejgaon Sub-Registry Office' },
    { label: 'Dhanmondi Sub-Registry Office', value: 'Dhanmondi Sub-Registry Office' },
    { label: 'Savar Sub-Registry Office', value: 'Savar Sub-Registry Office' },
    { label: 'Keraniganj Sub-Registry Office', value: 'Keraniganj Sub-Registry Office' },
    { label: 'Mirpur Sub-Registry Office', value: 'Mirpur Sub-Registry Office' },
    { label: 'Uttara Sub-Registry Office', value: 'Uttara Sub-Registry Office' },
    { label: 'Narayanganj Sub-Registry Office', value: 'Narayanganj Sub-Registry Office' },
    { label: 'Chittagong Sadar Sub-Registry Office', value: 'Chittagong Sadar Sub-Registry Office' }
  ];

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    // Load Bookings & Templates concurrently
    this.salesService.getBookings({ limit: 100 }).subscribe({
      next: (bookingsRes: any) => {
        const bookingsList = Array.isArray(bookingsRes) ? bookingsRes : (bookingsRes as any).items || [];
        // Allow bookings that are confirmed or in progress
        this.activeBookings.set(bookingsList);

        this.salesService.getRegistrationTemplates().subscribe({
          next: (tmplRes: RegistrationChecklistTemplate[]) => {
            this.templates.set(tmplRes || []);
            if (tmplRes && tmplRes.length > 0) {
              this.selectedTemplateId.set(tmplRes[0].id);
            }
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
      },
      error: () => this.isLoading.set(false)
    });
  }

  onBookingSelect(val: any): void {
    const id = Number(val);
    this.selectedBookingId.set(id || null);

    const b = this.selectedBooking();
    if (b && b.final_contract_value) {
      const price = Number(b.final_contract_value);
      // Statutory estimates in Bangladesh:
      // Stamp Duty: 1.5%
      this.stampDuty.set(Math.round(price * 0.015));
      // Registration Fee: 1.0%
      this.registrationFee.set(Math.round(price * 0.010));
      // Advance Income Tax (AIT u/s 53FF): 3.0%
      this.aitTax.set(Math.round(price * 0.030));
      // Local Govt Tax: 1.5%
      this.localGovTax.set(Math.round(price * 0.015));
    }
  }

  onTemplateSelect(val: any): void {
    this.selectedTemplateId.set(Number(val) || null);
  }

  onSubmit(): void {
    if (!this.selectedBookingId()) {
      this.errorMessage.set('Please select an active property booking.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const payload: DeedRegistrationCreate = {
      booking_id: this.selectedBookingId()!,
      template_id: this.selectedTemplateId(),
      deed_type: this.deedType(),
      sub_registry_office: this.subRegistryOffice(),
      conducting_advocate: this.conductingAdvocate() || null,
      total_registration_costs: this.totalRegistrationCosts(),
      stamp_duty_amount: Number(this.stampDuty() || 0),
      registration_fee_amount: Number(this.registrationFee() || 0),
      ait_tax_amount: Number(this.aitTax() || 0),
      local_gov_tax_amount: Number(this.localGovTax() || 0),
      remarks: this.remarks() || null
    };

    this.salesService.createRegistration(payload).subscribe({
      next: (res: DeedRegistration) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/registrations', res.id]);
      },
      error: (err: any) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to initialize deed registration dossier.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/sales/registrations']);
  }
}
