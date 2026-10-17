import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { PortalService } from '../../../core/services/portal.service';
import {
  CustomerPortalOverview,
  ConstructionUpdate,
  CustomerPaymentLedgerItem,
  CustomerInstallmentTimelineItem,
  CustomerServiceTicket,
  PhotoItem,
  OnlinePaymentCheckoutResponse
} from '../../../core/models/portal.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-customer-portal',
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
  templateUrl: './customer-portal.component.html'
})
export class CustomerPortalComponent implements OnInit {
  private portalService = inject(PortalService);
  private fb = inject(FormBuilder);

  // Active View Tab
  activeTab = signal<'MY_APARTMENT' | 'CONSTRUCTION_GALLERY' | 'FINANCIAL_LEDGER' | 'SERVICE_TICKETS'>('MY_APARTMENT');

  // Loading States
  isLoading = signal<boolean>(false);
  isSubmittingTicket = signal<boolean>(false);
  isProcessingPayment = signal<boolean>(false);
  downloadingReceiptId = signal<number | null>(null);

  // Core Data Signals
  overview = signal<CustomerPortalOverview | null>(null);
  selectedPhotoForLightbox = signal<PhotoItem | null>(null);

  // Modals State
  isTicketModalOpen = signal<boolean>(false);
  isPaymentModalOpen = signal<boolean>(false);
  paymentSuccessDetails = signal<{ mrNumber: string; amount: number } | null>(null);

  // Forms
  ticketForm!: FormGroup;

  // Selected Installment for Payment
  selectedInstallment = signal<CustomerInstallmentTimelineItem | null>(null);
  selectedGateway = signal<string>('BKASH');
  payerMobile = signal<string>('+8801712345678');
  gatewayCheckoutSession = signal<OnlinePaymentCheckoutResponse | null>(null);

  // Dynamic Options
  gatewayOptions = [
    { value: 'BKASH', label: 'bKash Digital Merchant Wallet (Direct OTP/PIN)' },
    { value: 'NAGAD', label: 'Nagad Postal Digital Bank Checkout' },
    { value: 'SSLCOMMERZ', label: 'SSLCommerz (Visa / Mastercard / Amex)' },
    { value: 'CITY_TOUCH', label: 'City Bank CityTouch NetBanking' }
  ];

  ticketCategoryOptions = [
    { value: 'CIVIL_STRUCTURE', label: 'Civil Structure & Plaster' },
    { value: 'PAINT_FINISH', label: 'Wall Paint & Surface Finishing' },
    { value: 'PLUMBING_SANITARY', label: 'Plumbing, Piping & Sanitary Fixtures' },
    { value: 'ELECTRICAL_FIXTURES', label: 'Electrical Outlets, Switches & Wiring' },
    { value: 'TILES_FLOORING', label: 'Floor & Wall Tile Grouts' },
    { value: 'DOORS_WINDOWS', label: 'Doors, Locks & Sliding Windows' },
    { value: 'WATERPROOFING', label: 'Roof & Bathroom Waterproofing' },
    { value: 'GENERAL_MAINTENANCE', label: 'General Facilities Maintenance' }
  ];

  ticketUrgencyOptions = [
    { value: 'NORMAL', label: 'Normal Priority (5-day SLA)' },
    { value: 'URGENT', label: 'Urgent Priority (48-hour SLA)' },
    { value: 'EMERGENCY', label: 'Emergency (Immediate Dispatch)' }
  ];

  // Computed Values
  unit = computed(() => this.overview()?.unit_summary || null);
  updates = computed(() => this.overview()?.construction_updates || []);
  ledger = computed(() => this.overview()?.payment_ledger || []);
  installments = computed(() => this.overview()?.upcoming_installments || []);
  tickets = computed(() => this.overview()?.active_tickets || []);

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  private initForm(): void {
    this.ticketForm = this.fb.group({
      category: ['PLUMBING_SANITARY', Validators.required],
      urgency: ['NORMAL', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5)]],
      location_in_unit: ['Master Bathroom'],
      description: ['', [Validators.required, Validators.minLength(10)]],
      attachment_photo_url: ['']
    });
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.portalService.getOverview().subscribe({
      next: (data) => {
        this.overview.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load customer portal overview', err);
        this.isLoading.set(false);
      }
    });
  }

  // Lightbox
  openLightbox(photo: PhotoItem): void {
    this.selectedPhotoForLightbox.set(photo);
  }

  closeLightbox(): void {
    this.selectedPhotoForLightbox.set(null);
  }

  // Tickets
  openCreateTicketModal(): void {
    this.ticketForm.reset({
      category: 'PLUMBING_SANITARY',
      urgency: 'NORMAL',
      title: '',
      location_in_unit: 'Living Room',
      description: '',
      attachment_photo_url: ''
    });
    this.isTicketModalOpen.set(true);
  }

  closeTicketModal(): void {
    this.isTicketModalOpen.set(false);
  }

  submitTicket(): void {
    if (this.ticketForm.invalid) {
      this.ticketForm.markAllAsTouched();
      return;
    }

    const currentUnit = this.unit();
    const currentCustomer = this.overview();
    if (!currentUnit || !currentCustomer) return;

    this.isSubmittingTicket.set(true);
    const payload = {
      booking_id: currentUnit.booking_id,
      ...this.ticketForm.value
    };

    this.portalService.createTicket(payload, currentCustomer.customer_id).subscribe({
      next: (tkt) => {
        const updatedTickets = [tkt, ...(this.overview()?.active_tickets || [])];
        if (this.overview()) {
          this.overview.update(curr => curr ? { ...curr, active_tickets: updatedTickets } : null);
        }
        this.isSubmittingTicket.set(false);
        this.closeTicketModal();
      },
      error: (err) => {
        console.error('Failed to submit service ticket', err);
        this.isSubmittingTicket.set(false);
      }
    });
  }

  // Payment Flow
  openPaymentModal(inst: CustomerInstallmentTimelineItem): void {
    this.selectedInstallment.set(inst);
    this.paymentSuccessDetails.set(null);
    this.gatewayCheckoutSession.set(null);
    this.isPaymentModalOpen.set(true);
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen.set(false);
    this.selectedInstallment.set(null);
    this.gatewayCheckoutSession.set(null);
  }

  initiatePaymentSession(): void {
    const inst = this.selectedInstallment();
    const currentUnit = this.unit();
    const currentCustomer = this.overview();
    if (!inst || !currentUnit || !currentCustomer) return;

    this.isProcessingPayment.set(true);
    const payload = {
      booking_id: currentUnit.booking_id,
      installment_id: inst.installment_id,
      payment_gateway: this.selectedGateway(),
      payer_mobile: this.payerMobile()
    };

    this.portalService.initiateCheckout(payload, currentCustomer.customer_id).subscribe({
      next: (session) => {
        this.gatewayCheckoutSession.set(session);
        this.isProcessingPayment.set(false);
      },
      error: (err) => {
        console.error('Failed to initiate checkout', err);
        this.isProcessingPayment.set(false);
      }
    });
  }

  verifyPaymentSimulation(): void {
    const session = this.gatewayCheckoutSession();
    if (!session) return;

    this.isProcessingPayment.set(true);
    const payload = {
      transaction_reference: session.transaction_reference,
      gateway_transaction_id: `TRX-${Date.now()}`,
      simulated_success: true
    };

    this.portalService.verifyPayment(payload).subscribe({
      next: (res) => {
        this.isProcessingPayment.set(false);
        if (res.gateway_status === 'SUCCESS' && res.generated_mr_number) {
          this.paymentSuccessDetails.set({
            mrNumber: res.generated_mr_number,
            amount: res.amount_paid_bdt
          });
          // Refresh overview to update ledger and timeline
          this.loadInitialData();
        }
      },
      error: (err) => {
        console.error('Failed to verify payment', err);
        this.isProcessingPayment.set(false);
      }
    });
  }

  // Download PDF Money Receipt
  downloadReceiptPdf(receiptId: number, mrNumber: string): void {
    this.downloadingReceiptId.set(receiptId);
    this.portalService.downloadReceiptPdf(receiptId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Money_Receipt_${mrNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        this.downloadingReceiptId.set(null);
      },
      error: (err) => {
        console.error('Failed to download Money Receipt PDF', err);
        this.downloadingReceiptId.set(null);
      }
    });
  }

  // Helpers
  formatBDT(amount: number): string {
    if (amount >= 10000000) {
      return '৳ ' + (amount / 10000000).toFixed(2) + ' Cr';
    }
    if (amount >= 100000) {
      return '৳ ' + (amount / 100000).toFixed(2) + ' Lac';
    }
    return '৳ ' + Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }

  getTicketStatusBadgeClass(status: string): string {
    switch (status) {
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
      case 'WORK_IN_PROGRESS':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30';
      case 'ACKNOWLEDGED':
      case 'ASSIGNED_TO_ENGINEER':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'SUBMITTED':
      default:
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30';
    }
  }

  getUrgencyBadgeClass(urgency: string): string {
    switch (urgency) {
      case 'EMERGENCY':
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';
      case 'URGENT':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'NORMAL':
      default:
        return 'bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/30';
    }
  }

  getInstallmentStatusBadgeClass(status: string): string {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
      case 'OVERDUE':
        return 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30';
      case 'DUE':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'UPCOMING':
      default:
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30';
    }
  }
}
