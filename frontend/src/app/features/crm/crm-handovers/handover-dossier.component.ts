import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { BookingHandover, BookingHandoverVerificationUpdate } from '../../../core/models/crm.model';

@Component({
  selector: 'app-handover-dossier',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  templateUrl: './handover-dossier.component.html'
})
export class HandoverDossierComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  handoverId = signal<number | null>(null);
  handover = signal<BookingHandover | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Active step tab (1 to 10)
  activeStep = signal<number>(1);

  // 10 Steps labels
  steps = [
    { num: 1, title: 'Customer Contact', icon: 'ri-user-follow-line' },
    { num: 2, title: 'Project & Unit', icon: 'ri-building-line' },
    { num: 3, title: 'Inventory Revalidation', icon: 'ri-checkbox-multiple-line' },
    { num: 4, title: 'Pricing & Discounts', icon: 'ri-price-tag-3-line' },
    { num: 5, title: 'KYC & Identification', icon: 'ri-shield-user-line' },
    { num: 6, title: 'Booking Request', icon: 'ri-file-text-line' },
    { num: 7, title: 'Reservation Ref', icon: 'ri-bookmark-line' },
    { num: 8, title: 'Attribution Transfer', icon: 'ri-share-forward-line' },
    { num: 9, title: 'Payment & Accounting', icon: 'ri-wallet-3-line' },
    { num: 10, title: 'Audit & CRM History', icon: 'ri-history-line' }
  ];

  // Verification & Checklist Form (Steps 1, 3, 4, 5)
  verificationForm: FormGroup = this.fb.group({
    customer_verified: [false],
    verified_phone: [''],
    verified_email: [''],
    unit_availability_verified: [false],
    nid_passport_verified: [false],
    tin_certificate_verified: [false],
    nominee_verified: [false],
    power_of_attorney_verified: [false],
    kyc_notes: [''],
    discount_status: ['APPROVED']
  });

  paymentForm: FormGroup = this.fb.group({
    token_money_payment_mode: ['PAY_ORDER'],
    token_transaction_ref: [''],
    token_bank_name: [''],
    token_received_date: [''],
    payment_plan_preference: ['CLP_MILESTONES'],
    special_conditions: [''],
    handover_notes: ['']
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.handoverId.set(Number(idParam));
      this.loadHandover(Number(idParam));
    }
  }

  loadHandover(id: number): void {
    this.isLoading.set(true);
    this.crmService.getBookingHandover(id).subscribe({
      next: (h) => {
        this.handover.set(h);
        this.isLoading.set(false);

        // Populate forms
        this.verificationForm.patchValue({
          customer_verified: h.customer_verified || false,
          verified_phone: h.verified_phone || '',
          verified_email: h.verified_email || '',
          unit_availability_verified: h.unit_availability_verified || false,
          nid_passport_verified: h.nid_passport_verified || false,
          tin_certificate_verified: h.tin_certificate_verified || false,
          nominee_verified: h.nominee_verified || false,
          power_of_attorney_verified: h.power_of_attorney_verified || false,
          kyc_notes: h.kyc_notes || '',
          discount_status: h.discount_status || 'APPROVED'
        });

        this.paymentForm.patchValue({
          token_money_payment_mode: h.token_money_payment_mode || 'PAY_ORDER',
          token_transaction_ref: h.token_transaction_ref || '',
          token_bank_name: h.token_bank_name || '',
          token_received_date: h.token_received_date || '',
          payment_plan_preference: h.payment_plan_preference || 'CLP_MILESTONES',
          special_conditions: h.special_conditions || '',
          handover_notes: h.handover_notes || ''
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load handover dossier');
      }
    });
  }

  saveVerification(): void {
    const id = this.handoverId();
    if (!id) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.verificationForm.value;
    const payload: BookingHandoverVerificationUpdate = {
      customer_verified: val.customer_verified,
      verified_phone: val.verified_phone,
      verified_email: val.verified_email,
      unit_availability_verified: val.unit_availability_verified,
      nid_passport_verified: val.nid_passport_verified,
      tin_certificate_verified: val.tin_certificate_verified,
      nominee_verified: val.nominee_verified,
      power_of_attorney_verified: val.power_of_attorney_verified,
      kyc_notes: val.kyc_notes,
      discount_status: val.discount_status
    };

    this.crmService.updateHandoverVerification(id, payload).subscribe({
      next: (res) => {
        this.handover.set(res);
        this.isSaving.set(false);
        this.successMessage.set('Verification checklist and KYC status updated successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update verification checklist');
      }
    });
  }

  savePaymentTerms(): void {
    const id = this.handoverId();
    if (!id) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.paymentForm.value;
    this.crmService.updateBookingHandover(id, val).subscribe({
      next: (res) => {
        this.handover.set(res);
        this.isSaving.set(false);
        this.successMessage.set('Payment terms and accounting details saved successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to save payment terms');
      }
    });
  }

  generateReservation(): void {
    const id = this.handoverId();
    if (!id) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.crmService.generateHandoverReservation(id).subscribe({
      next: (res) => {
        this.handover.set(res);
        this.isSaving.set(false);
        this.successMessage.set(`Official Reservation Reference ${res.reservation_code} generated and transmitted to Sales Operations!`);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to generate reservation reference');
      }
    });
  }

  backToList(): void {
    this.router.navigate(['/crm/handovers']);
  }

  formatBdt(amount?: number): string {
    return '৳' + (amount || 0).toLocaleString('en-IN');
  }

  getStatusVariant(status?: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'ACCEPTED_BY_OPS':
      case 'BOOKING_CREATED':
        return 'success';
      case 'RESERVATION_ISSUED':
        return 'info';
      case 'REJECTED':
        return 'danger';
      default:
        return 'warning';
    }
  }
}
