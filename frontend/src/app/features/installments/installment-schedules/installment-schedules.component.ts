import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { CustomerInstallment, InstallmentMetrics, InstallmentAlertLog, CustomMilestoneItem } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-installment-schedules',
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
  templateUrl: './installment-schedules.component.html'
})
export class InstallmentSchedulesComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  installments = signal<CustomerInstallment[]>([]);
  bookings = signal<Booking[]>([]);
  metrics = signal<InstallmentMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedBookingId = signal<number | null>(null);
  selectedStatusFilter = signal<string>('ALL');

  // Generator Modal State
  isGenerateModalOpen = signal<boolean>(false);
  customMilestones = signal<CustomMilestoneItem[]>([
    { title: 'Booking Confirmation', percentage: 10, milestone_trigger: 'BOOKING_SIGNING' },
    { title: 'Down Payment Allotment', percentage: 15, milestone_trigger: 'DOWN_PAYMENT' },
    { title: 'Piling & Substructure Casting', percentage: 15, milestone_trigger: 'PILING_COMPLETION' },
    { title: 'Roof Casting 5th Floor', percentage: 15, milestone_trigger: '5TH_FLOOR_ROOF' },
    { title: 'Superstructure Top Floor Slab', percentage: 15, milestone_trigger: 'TOP_ROOF_CASTING' },
    { title: 'Brickwork & Internal Plaster', percentage: 15, milestone_trigger: 'FINISHING_WORKS' },
    { title: 'Final Handover & Deed Registration', percentage: 15, milestone_trigger: 'FINAL_HANDOVER' }
  ]);

  // Overdue Surcharge State
  isCalculatingSurcharges = signal<boolean>(false);
  surchargeResultBanner = signal<string | null>(null);

  // Alert Dispatch Modal State
  isAlertModalOpen = signal<boolean>(false);
  isDispatchingAlerts = signal<boolean>(false);
  selectedInstallmentForAlert = signal<CustomerInstallment | null>(null);
  selectedAlertChannels = signal<string[]>(['SMS', 'WHATSAPP']);
  customAlertMessage = signal<string>('');

  // Alert Audit History Modal State
  isAlertHistoryModalOpen = signal<boolean>(false);
  alertLogs = signal<InstallmentAlertLog[]>([]);
  isLoadingAlertLogs = signal<boolean>(false);

  generateForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    plan_type: ['CONSTRUCTION_MILESTONE', Validators.required],
    total_installments: [24, [Validators.required, Validators.min(1), Validators.max(120)]],
    down_payment_percentage: [20, [Validators.required, Validators.min(0), Validators.max(80)]],
    grace_period_days: [15, [Validators.required, Validators.min(0), Validators.max(90)]],
    start_date: [new Date().toISOString().split('T')[0]]
  });

  planTypeOptions = [
    { value: 'CONSTRUCTION_MILESTONE', label: 'Milestone-Linked Schedules (Civil Milestones & Handover)' },
    { value: 'MONTHLY', label: 'Equal Monthly Installments (EMI)' },
    { value: 'QUARTERLY', label: 'Quarterly Amortization (Every 3 Months)' }
  ];

  statusFilterOptions = [
    { value: 'ALL', label: 'All Installment Stages' },
    { value: 'OVERDUE', label: 'Overdue Arrears Only' },
    { value: 'DUE', label: 'Due for Collection' },
    { value: 'UPCOMING', label: 'Upcoming Milestones' },
    { value: 'PAID', label: 'Paid & Cleared' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadBookings();
  }

  loadData(): void {
    this.isLoading.set(true);
    const bId = this.selectedBookingId() || undefined;
    const status = this.selectedStatusFilter() !== 'ALL' ? this.selectedStatusFilter() : undefined;
    this.installmentService.getInstallments({ booking_id: bId, status }).subscribe({
      next: (res) => {
        this.installments.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.installmentService.getMetrics().subscribe(m => this.metrics.set(m));
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe(b => this.bookings.set(b));
  }

  get bookingOptions() {
    return this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} - ${b.customer_name} (Unit ${b.unit_number} - BDT ${Number(b.final_contract_value).toLocaleString()})`
    }));
  }

  onFilterBookingChange(bookingId: any): void {
    this.selectedBookingId.set(bookingId ? Number(bookingId) : null);
    this.loadData();
  }

  onFilterStatusChange(status: any): void {
    this.selectedStatusFilter.set(status || 'ALL');
    this.loadData();
  }

  // --- Schedule Generation ---
  openGenerateModal(): void {
    this.generateForm.reset({
      booking_id: this.bookings()[0]?.id || null,
      plan_type: 'CONSTRUCTION_MILESTONE',
      total_installments: 24,
      down_payment_percentage: 20,
      grace_period_days: 15,
      start_date: new Date().toISOString().split('T')[0]
    });
    this.isGenerateModalOpen.set(true);
  }

  closeGenerateModal(): void {
    this.isGenerateModalOpen.set(false);
  }

  addCustomMilestone(): void {
    this.customMilestones.update(list => [
      ...list,
      { title: `Milestone Phase ${list.length + 1}`, percentage: 10, milestone_trigger: `PHASE_${list.length + 1}` }
    ]);
  }

  removeCustomMilestone(index: number): void {
    this.customMilestones.update(list => list.filter((_, i) => i !== index));
  }

  getTotalMilestonePercentage(): number {
    return this.customMilestones().reduce((sum, item) => sum + Number(item.percentage || 0), 0);
  }

  submitGenerateSchedule(): void {
    if (this.generateForm.invalid) return;
    this.isSubmitting.set(true);
    const formVal = this.generateForm.value;
    const payload = {
      ...formVal,
      custom_milestones: formVal.plan_type === 'CONSTRUCTION_MILESTONE' ? this.customMilestones() : undefined
    };

    this.installmentService.generateSchedule(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeGenerateModal();
        this.selectedBookingId.set(formVal.booking_id);
        this.loadData();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Schedule generation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Automated Late Payment Surcharge Calculation ---
  calculateSurcharges(): void {
    this.isCalculatingSurcharges.set(true);
    this.surchargeResultBanner.set(null);
    this.installmentService.calculateOverdueSurcharges(
      { surcharge_percentage_monthly: 2.0 },
      this.selectedBookingId() || undefined
    ).subscribe({
      next: (res) => {
        this.isCalculatingSurcharges.set(false);
        const msg = `Late Surcharge Engine applied: ${res.updated_installments_count} overdue installment(s) assessed. Total Surcharge Accrued: BDT ${Number(res.total_surcharge_assessed || 0).toLocaleString()} (2%/month prorated).`;
        this.surchargeResultBanner.set(msg);
        this.loadData();
      },
      error: (err) => {
        this.isCalculatingSurcharges.set(false);
        alert(err?.error?.detail || 'Failed to calculate overdue surcharges');
      }
    });
  }

  // --- Alert Dispatch Engine (SMS / WhatsApp) ---
  openAlertModal(item?: CustomerInstallment): void {
    this.selectedInstallmentForAlert.set(item || null);
    this.selectedAlertChannels.set(['SMS', 'WHATSAPP']);
    if (item) {
      this.customAlertMessage.set(`Dear ${item.customer_name}, installment #${item.installment_no} of BDT ${Number(item.payable_amount).toLocaleString()} for ${item.booking_reference_no} is due on ${item.due_date}. Please clear to avoid late surcharge.`);
    } else {
      this.customAlertMessage.set(`Notice: Your real estate installment schedule milestone is pending payment. Please contact our accounts desk to avoid overdue interest.`);
    }
    this.isAlertModalOpen.set(true);
  }

  closeAlertModal(): void {
    this.isAlertModalOpen.set(false);
    this.selectedInstallmentForAlert.set(null);
  }

  toggleAlertChannel(ch: string): void {
    this.selectedAlertChannels.update(channels => {
      if (channels.includes(ch)) {
        return channels.filter(c => c !== ch);
      } else {
        return [...channels, ch];
      }
    });
  }

  dispatchAlerts(): void {
    if (this.selectedAlertChannels().length === 0) {
      alert('Please select at least one notification channel (SMS or WhatsApp).');
      return;
    }

    const single = this.selectedInstallmentForAlert();
    let targetIds: number[] = [];
    if (single) {
      targetIds = [single.id];
    } else {
      // Dispatch to all overdue / due installments currently shown
      targetIds = this.installments()
        .filter(item => item.status === 'OVERDUE' || item.status === 'DUE')
        .map(item => item.id);
    }

    if (targetIds.length === 0) {
      alert('No overdue or due installments eligible for reminder alerts.');
      return;
    }

    this.isDispatchingAlerts.set(true);
    const payload = {
      installment_ids: targetIds,
      channels: this.selectedAlertChannels(),
      custom_message: this.customAlertMessage()
    };

    this.installmentService.dispatchAlerts(payload).subscribe({
      next: (logs) => {
        this.isDispatchingAlerts.set(false);
        this.closeAlertModal();
        alert(`Successfully dispatched ${logs.length} alert message(s) via ${this.selectedAlertChannels().join(' & ')}.`);
        this.loadData();
      },
      error: (err) => {
        this.isDispatchingAlerts.set(false);
        alert(err?.error?.detail || 'Alert dispatch failed');
      }
    });
  }

  // --- Alert History Audit Modal ---
  openAlertHistoryModal(): void {
    this.isAlertHistoryModalOpen.set(true);
    this.isLoadingAlertLogs.set(true);
    this.installmentService.getAlertLogs({ booking_id: this.selectedBookingId() || undefined }).subscribe({
      next: (logs) => {
        this.alertLogs.set(logs);
        this.isLoadingAlertLogs.set(false);
      },
      error: () => this.isLoadingAlertLogs.set(false)
    });
  }

  closeAlertHistoryModal(): void {
    this.isAlertHistoryModalOpen.set(false);
  }
}
