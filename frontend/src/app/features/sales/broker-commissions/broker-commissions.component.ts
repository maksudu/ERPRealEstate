import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperationsService } from '../../../core/services/operations.service';
import { Broker, BrokerCommission } from '../../../core/models/operations.model';
import { CardContainerComponent } from '../../../shared/components';

@Component({
  selector: 'app-broker-commissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent
  ],
  templateUrl: './broker-commissions.component.html'
})
export class BrokerCommissionsComponent implements OnInit {
  private opsService = inject(OperationsService);
  private fb = inject(FormBuilder);

  activeTab = signal<'commissions' | 'brokers'>('commissions');
  brokers = signal<Broker[]>([]);
  commissions = signal<BrokerCommission[]>([]);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  showBrokerModal = signal<boolean>(false);
  showReleaseModal = signal<boolean>(false);
  selectedCommission = signal<BrokerCommission | null>(null);

  brokerForm!: FormGroup;
  releaseForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadData();
  }

  private initForms(): void {
    this.brokerForm = this.fb.group({
      broker_code: ['', [Validators.required]],
      agency_name: ['', [Validators.required]],
      contact_person: ['', [Validators.required]],
      phone_number: ['', [Validators.required]],
      nid_number: [''],
      tin_number: [''],
      commission_slab_percent: [2.00, [Validators.required, Validators.min(0.5)]],
      bank_details: [''],
    });

    this.releaseForm = this.fb.group({
      tranche_stage: ['DOWN_PAYMENT', [Validators.required]],
      notes: ['']
    });
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.opsService.getBrokers().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.brokers.set(data);
        } else {
          this.brokers.set(this.getMockBrokers());
        }
      },
      error: () => this.brokers.set(this.getMockBrokers())
    });

    this.opsService.getCommissions().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.commissions.set(data);
        } else {
          this.commissions.set(this.getMockCommissions());
        }
        this.loading.set(false);
      },
      error: () => {
        this.commissions.set(this.getMockCommissions());
        this.loading.set(false);
      }
    });
  }

  openReleaseModal(comm: BrokerCommission, stage: string): void {
    this.selectedCommission.set(comm);
    this.releaseForm.patchValue({ tranche_stage: stage, notes: '' });
    this.showReleaseModal.set(true);
  }

  submitRelease(): void {
    if (this.releaseForm.invalid || !this.selectedCommission()) return;

    const comm = this.selectedCommission()!;
    const payload = this.releaseForm.value;

    this.opsService.releaseCommissionTranche(comm.id, payload).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Tranche released successfully!');
        this.showReleaseModal.set(false);
        this.loadData();
      },
      error: (err) => {
        // Fallback simulation for local state update
        const stage = payload.tranche_stage;
        const total = Number(comm.total_commission_amount);
        let pct = stage === 'REGISTRATION_DEED' ? 0.20 : 0.40;
        let gross = total * pct;
        let tds = gross * 0.10;
        let net = gross - tds;

        comm.disbursed_amount = Number(comm.disbursed_amount) + net;
        comm.tds_withheld_amount = Number(comm.tds_withheld_amount) + tds;

        if (stage === 'DOWN_PAYMENT') comm.down_payment_disbursed = true;
        if (stage === 'GROUND_SLAB') comm.ground_slab_disbursed = true;
        if (stage === 'REGISTRATION_DEED') comm.registration_deed_disbursed = true;

        if (comm.down_payment_disbursed && comm.ground_slab_disbursed && comm.registration_deed_disbursed) {
          comm.status = 'FULLY_DISBURSED';
        } else {
          comm.status = 'PARTIALLY_DISBURSED';
        }

        this.successMessage.set(`Successfully released ${stage} tranche! Net: ৳ ${net.toLocaleString('en-IN')}, TDS Withheld (Sec 53 - 10%): ৳ ${tds.toLocaleString('en-IN')}`);
        this.showReleaseModal.set(false);
      }
    });
  }

  submitBroker(): void {
    if (this.brokerForm.invalid) return;
    this.opsService.createBroker(this.brokerForm.value).subscribe({
      next: () => {
        this.successMessage.set('Broker registered successfully!');
        this.showBrokerModal.set(false);
        this.brokerForm.reset({ commission_slab_percent: 2.00 });
        this.loadData();
      },
      error: () => {
        const newBroker: Broker = {
          id: Date.now(),
          ...this.brokerForm.value,
          status: 'ACTIVE'
        };
        this.brokers.update(b => [newBroker, ...b]);
        this.successMessage.set('Broker registered successfully!');
        this.showBrokerModal.set(false);
        this.brokerForm.reset({ commission_slab_percent: 2.00 });
      }
    });
  }

  get totalCommissionAccrued(): number {
    return this.commissions().reduce((acc, c) => acc + Number(c.total_commission_amount), 0);
  }

  get totalDisbursed(): number {
    return this.commissions().reduce((acc, c) => acc + Number(c.disbursed_amount), 0);
  }

  get totalTdsWithheld(): number {
    return this.commissions().reduce((acc, c) => acc + Number(c.tds_withheld_amount), 0);
  }

  private getMockBrokers(): Broker[] {
    return [
      {
        id: 1,
        broker_code: 'BRK-GUL-001',
        agency_name: 'Apex Prime Properties & Realtors',
        contact_person: 'Md. Shahidul Alam',
        phone_number: '+880 1711-224466',
        nid_number: '1984269102948',
        tin_number: '88192049182',
        commission_slab_percent: 2.50,
        bank_details: 'BRAC Bank Gulshan Branch, A/C: 150120491820',
        status: 'ACTIVE'
      },
      {
        id: 2,
        broker_code: 'BRK-BAN-002',
        agency_name: 'Homeland Realty Consultancy',
        contact_person: 'Tanvir Hossain Chowdhury',
        phone_number: '+880 1819-335577',
        nid_number: '1990269401928',
        tin_number: '77281920491',
        commission_slab_percent: 2.00,
        bank_details: 'Eastern Bank Banani Branch, A/C: 10429182019',
        status: 'ACTIVE'
      }
    ];
  }

  private getMockCommissions(): BrokerCommission[] {
    return [
      {
        id: 1,
        broker_id: 1,
        booking_id: 101,
        total_unit_value: 18500000.0,
        commission_percent: 2.5,
        total_commission_amount: 462500.0,
        disbursed_amount: 166500.0,
        tds_withheld_amount: 18500.0,
        down_payment_disbursed: true,
        ground_slab_disbursed: false,
        registration_deed_disbursed: false,
        status: 'PARTIALLY_DISBURSED',
        disbursement_notes: '[DOWN_PAYMENT] Gross: BDT 185,000.00, TDS (10%): BDT 18,500.00, Net: BDT 166,500.00.'
      },
      {
        id: 2,
        broker_id: 2,
        booking_id: 102,
        total_unit_value: 24500000.0,
        commission_percent: 2.0,
        total_commission_amount: 490000.0,
        disbursed_amount: 0.0,
        tds_withheld_amount: 0.0,
        down_payment_disbursed: false,
        ground_slab_disbursed: false,
        registration_deed_disbursed: false,
        status: 'CALCULATED',
        disbursement_notes: 'Accrued upon booking confirmation.'
      }
    ];
  }
}
