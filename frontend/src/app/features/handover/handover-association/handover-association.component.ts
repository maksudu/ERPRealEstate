import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  OwnersAssociation,
  LeaseAgreement,
  CAMBill,
  UtilitySubMeterReading,
  HandoverDashboardMetrics
} from '../../../core/models/handover.model';
import { Unit } from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-handover-association',
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
  templateUrl: './handover-association.component.html'
})
export class HandoverAssociationComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Tabs: 'leases' | 'cam' | 'utility' | 'associations'
  activeTab = signal<'leases' | 'cam' | 'utility' | 'associations'>('leases');

  // Signals
  leases = signal<LeaseAgreement[]>([]);
  camBills = signal<CAMBill[]>([]);
  utilityReadings = signal<UtilitySubMeterReading[]>([]);
  associations = signal<OwnersAssociation[]>([]);
  units = signal<Unit[]>([]);
  projects = signal<Project[]>([]);
  metrics = signal<HandoverDashboardMetrics | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Modals
  isLeaseModalOpen = signal<boolean>(false);
  isCAMModalOpen = signal<boolean>(false);
  isPayCAMModalOpen = signal<boolean>(false);
  selectedCAMBill = signal<CAMBill | null>(null);
  isUtilityModalOpen = signal<boolean>(false);
  isAssocModalOpen = signal<boolean>(false);

  // Forms
  leaseForm: FormGroup = this.fb.group({
    unit_id: [null, [Validators.required, Validators.min(1)]],
    tenant_name: ['', Validators.required],
    tenant_company_name: [''],
    trade_license_number: [''],
    tin_bin_number: [''],
    tenant_nid: ['', Validators.required],
    tenant_phone: ['', Validators.required],
    tenant_email: [''],
    emergency_contact_phone: [''],
    commercial_space_type: ['RETAIL_SHOP', Validators.required],
    floor_area_sqft: [850, [Validators.required, Validators.min(10)]],
    rent_per_sqft_bdt: [110, [Validators.required, Validators.min(10)]],
    monthly_rent_bdt: [93500],
    cam_rate_per_sqft_bdt: [16, [Validators.required, Validators.min(0)]],
    fitout_grace_period_days: [30, [Validators.required, Validators.min(0)]],
    lease_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    lease_expiry_date: [
      new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Validators.required
    ],
    security_deposit_bdt: [280500, [Validators.required, Validators.min(0)]],
    security_deposit_status: ['RECEIVED', Validators.required],
    rent_escalation_percent: [10.0, [Validators.required, Validators.min(0)]],
    escalation_frequency_months: [12, Validators.required],
    remarks: ['']
  });

  camForm: FormGroup = this.fb.group({
    lease_id: [null, [Validators.required, Validators.min(1)]],
    bill_month: [new Date().toISOString().slice(0, 7), Validators.required],
    sinking_fund_charge: [2000, [Validators.required, Validators.min(0)]],
    generator_backup_charge: [3500, [Validators.required, Validators.min(0)]],
    common_electricity_water: [2800, [Validators.required, Validators.min(0)]],
    due_date: [new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]],
    remarks: ['Monthly CAM bill generated per lease agreement.']
  });

  payCAMForm: FormGroup = this.fb.group({
    paid_amount: [0, [Validators.required, Validators.min(1)]],
    paid_date: [new Date().toISOString().split('T')[0], Validators.required],
    payment_mode: ['BANK_TRANSFER', Validators.required],
    instrument_no: [''],
    remarks: ['Payment cleared via corporate bank account.']
  });

  utilityForm: FormGroup = this.fb.group({
    lease_id: [null, [Validators.required, Validators.min(1)]],
    meter_number: ['DESCO-SUB-0401', Validators.required],
    meter_type: ['ELECTRICITY', Validators.required],
    reading_date: [new Date().toISOString().split('T')[0], Validators.required],
    previous_reading: [1200, [Validators.required, Validators.min(0)]],
    current_reading: [1650, [Validators.required, Validators.min(0)]],
    tariff_rate_per_unit: [14.50, [Validators.required, Validators.min(0.1)]],
    vat_rate_percent: [5.00, [Validators.required, Validators.min(0)]],
    remarks: ['Monthly utility sub-meter reading entry.']
  });

  assocForm: FormGroup = this.fb.group({
    project_id: [null, [Validators.required, Validators.min(1)]],
    association_name: ['', Validators.required],
    handover_date: [new Date().toISOString().split('T')[0], Validators.required],
    sinking_fund_transferred_bdt: [750000, [Validators.required, Validators.min(0)]],
    monthly_service_charge_per_flat: [4000, [Validators.required, Validators.min(100)]],
    president_name: [''],
    secretary_name: [''],
    contact_phone: ['']
  });

  // Dynamic Options
  unitOptions = computed(() => {
    return this.units().map((u: any) => ({
      value: u.id,
      label: `Unit ${u.unit_number} (${u.gross_saleable_area_sqft || u.gross_sft || 1500} SFT)`
    }));
  });

  leaseOptions = computed(() => {
    return this.leases().map(l => ({
      value: l.id,
      label: `${l.lease_reference_no || ('LSE-' + l.id)} - ${l.tenant_company_name || l.tenant_name} (Unit ${l.unit_number || l.unit_id})`
    }));
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: p.project_name
    }));
  });

  paymentModeOptions = [
    { value: 'BANK_TRANSFER', label: 'Online Bank Transfer (BEFTN / NPSB / RTGS)' },
    { value: 'CHEQUE', label: 'Account Payee Cheque' },
    { value: 'CASH', label: 'Cash (Accounts Vault)' },
    { value: 'BKASH', label: 'bKash Merchant Gateway' }
  ];

  depositStatusOptions = [
    { value: 'RECEIVED', label: 'Security Deposit Received in Full' },
    { value: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
    { value: 'PENDING', label: 'Pending Deposit Clearance' },
    { value: 'REFUNDED', label: 'Refunded on Lease Exit' }
  ];

  // Filtered Lists
  filteredLeases = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.leases().filter(l => {
      if (!q) return true;
      return (
        (l.lease_reference_no && l.lease_reference_no.toLowerCase().includes(q)) ||
        l.tenant_name.toLowerCase().includes(q) ||
        (l.tenant_company_name && l.tenant_company_name.toLowerCase().includes(q)) ||
        (l.unit_number && l.unit_number.toLowerCase().includes(q)) ||
        l.commercial_space_type.toLowerCase().includes(q)
      );
    });
  });

  filteredCAMBills = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.camBills().filter(b => {
      if (!q) return true;
      return (
        b.bill_number.toLowerCase().includes(q) ||
        b.bill_month.toLowerCase().includes(q) ||
        (b.tenant_name && b.tenant_name.toLowerCase().includes(q)) ||
        (b.tenant_company_name && b.tenant_company_name.toLowerCase().includes(q)) ||
        b.payment_status.toLowerCase().includes(q)
      );
    });
  });

  filteredUtilityReadings = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.utilityReadings().filter(u => {
      if (!q) return true;
      return (
        u.meter_number.toLowerCase().includes(q) ||
        u.meter_type.toLowerCase().includes(q) ||
        (u.tenant_name && u.tenant_name.toLowerCase().includes(q)) ||
        (u.tenant_company_name && u.tenant_company_name.toLowerCase().includes(q))
      );
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

    this.handoverService.getLeases().subscribe({
      next: (l) => this.leases.set(l),
      error: () => {}
    });

    this.handoverService.getCAMBills().subscribe({
      next: (b) => this.camBills.set(b),
      error: () => {}
    });

    this.handoverService.getUtilityReadings().subscribe({
      next: (u) => this.utilityReadings.set(u),
      error: () => {}
    });

    this.handoverService.getAssociations().subscribe({
      next: (a) => this.associations.set(a),
      error: () => {}
    });

    this.inventoryService.getUnits().subscribe({
      next: (u) => {
        this.units.set(u);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.projectService.getProjects().subscribe({
      next: (p) => this.projects.set(p),
      error: () => {}
    });
  }

  setTab(tab: 'leases' | 'cam' | 'utility' | 'associations'): void {
    this.activeTab.set(tab);
  }

  // 1. Lease Agreement Modal
  openLeaseModal(): void {
    const defaultUnit = this.units().length > 0 ? this.units()[0].id : null;
    this.leaseForm.reset({
      unit_id: defaultUnit,
      tenant_name: 'Dr. Zubaida Rahman',
      tenant_company_name: 'Medinova Diagnostic Center Ltd.',
      trade_license_number: 'TRAD-DNCC-2025-11029',
      tin_bin_number: 'BIN-00998877-0101',
      tenant_nid: '19862691234567890',
      tenant_phone: '+8801711998877',
      tenant_email: 'commercial@medinova.com.bd',
      emergency_contact_phone: '+8801819998877',
      commercial_space_type: 'OFFICE_SPACE',
      floor_area_sqft: 1100,
      rent_per_sqft_bdt: 115,
      monthly_rent_bdt: 126500,
      cam_rate_per_sqft_bdt: 18,
      fitout_grace_period_days: 30,
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_expiry_date: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      security_deposit_bdt: 379500,
      security_deposit_status: 'RECEIVED',
      rent_escalation_percent: 10.0,
      escalation_frequency_months: 12,
      remarks: '2-year commercial lease agreement with 3-month security deposit.'
    });
    this.isLeaseModalOpen.set(true);
  }

  closeLeaseModal(): void {
    this.isLeaseModalOpen.set(false);
  }

  submitLease(): void {
    if (this.leaseForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.createLease(this.leaseForm.value).subscribe({
      next: (newLease) => {
        this.leases.update(current => [newLease, ...current]);
        this.isSubmitting.set(false);
        this.closeLeaseModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // 2. CAM Bill Modal
  openCAMModal(): void {
    const defaultLease = this.leases().length > 0 ? this.leases()[0].id : null;
    this.camForm.reset({
      lease_id: defaultLease,
      bill_month: new Date().toISOString().slice(0, 7),
      sinking_fund_charge: 2500,
      generator_backup_charge: 4500,
      common_electricity_water: 3200,
      due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarks: 'Monthly CAM charge bill.'
    });
    this.isCAMModalOpen.set(true);
  }

  closeCAMModal(): void {
    this.isCAMModalOpen.set(false);
  }

  submitCAMBill(): void {
    if (this.camForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.generateCAMBill(this.camForm.value).subscribe({
      next: (newBill) => {
        this.camBills.update(current => [newBill, ...current]);
        this.isSubmitting.set(false);
        this.closeCAMModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openPayCAMModal(bill: CAMBill): void {
    this.selectedCAMBill.set(bill);
    const dueAmount = bill.total_bill_amount - bill.paid_amount;
    this.payCAMForm.reset({
      paid_amount: dueAmount > 0 ? dueAmount : bill.total_bill_amount,
      paid_date: new Date().toISOString().split('T')[0],
      payment_mode: 'BANK_TRANSFER',
      instrument_no: 'TXN-BANK-998822',
      remarks: `Full settlement for bill ${bill.bill_number}`
    });
    this.isPayCAMModalOpen.set(true);
  }

  closePayCAMModal(): void {
    this.isPayCAMModalOpen.set(false);
    this.selectedCAMBill.set(null);
  }

  submitPayCAM(): void {
    const bill = this.selectedCAMBill();
    if (!bill || this.payCAMForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.payCAMBill(bill.id, this.payCAMForm.value).subscribe({
      next: (updated) => {
        this.camBills.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.isSubmitting.set(false);
        this.closePayCAMModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // 3. Utility Sub-Meter Reading Modal
  openUtilityModal(): void {
    const defaultLease = this.leases().length > 0 ? this.leases()[0].id : null;
    this.utilityForm.reset({
      lease_id: defaultLease,
      meter_number: 'DESCO-COMM-0402',
      meter_type: 'ELECTRICITY',
      reading_date: new Date().toISOString().split('T')[0],
      previous_reading: 1450,
      current_reading: 1980,
      tariff_rate_per_unit: 14.50,
      vat_rate_percent: 5.00,
      remarks: 'Commercial electricity consumption for retail outlet.'
    });
    this.isUtilityModalOpen.set(true);
  }

  closeUtilityModal(): void {
    this.isUtilityModalOpen.set(false);
  }

  submitUtilityReading(): void {
    if (this.utilityForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.recordUtilityReading(this.utilityForm.value).subscribe({
      next: (newReading) => {
        this.utilityReadings.update(current => [newReading, ...current]);
        this.isSubmitting.set(false);
        this.closeUtilityModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // 4. Owners Association Modal
  openAssocModal(): void {
    const defaultProj = this.projects().length > 0 ? this.projects()[0].id : null;
    this.assocForm.reset({
      project_id: defaultProj,
      association_name: 'Lakeview Grand Flat Owners Welfare Society',
      handover_date: new Date().toISOString().split('T')[0],
      sinking_fund_transferred_bdt: 850000,
      monthly_service_charge_per_flat: 4500,
      president_name: 'Brig. Gen. (Retd.) M. A. Hye',
      secretary_name: 'Engr. Syed Noor-e-Alam',
      contact_phone: '+8801711554433'
    });
    this.isAssocModalOpen.set(true);
  }

  closeAssocModal(): void {
    this.isAssocModalOpen.set(false);
  }

  submitAssociation(): void {
    if (this.assocForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.createAssociation(this.assocForm.value).subscribe({
      next: (newAssoc) => {
        this.associations.update(current => [newAssoc, ...current]);
        this.isSubmitting.set(false);
        this.closeAssocModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }
}
