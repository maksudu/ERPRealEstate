import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { 
  LandBank, 
  JVAgreement, 
  JVUnitAllocation, 
  LandDocumentExpiryAlert, 
  LandJVMilestonePayment,
  JVAutoAllocationRequest 
} from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  CustomTextareaComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-jv-agreements',
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
  templateUrl: './jv-agreements.component.html'
})
export class JVAgreementsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  proposals = signal<LandBank[]>([]);
  agreements = signal<JVAgreement[]>([]);
  selectedAgreement = signal<JVAgreement | null>(null);
  expiryAlerts = signal<LandDocumentExpiryAlert[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isViewAllocationsModalOpen = signal<boolean>(false);
  isAutoAllocateModalOpen = signal<boolean>(false);
  isAlertsDrawerOpen = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Auto-Allocation Generator Form
  autoAllocForm: FormGroup = this.fb.group({
    total_floors: [10, [Validators.required, Validators.min(1), Validators.max(50)]],
    units_per_floor: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
    unit_gross_sft: [1850, [Validators.required, Validators.min(100)]],
    allocation_strategy: ['ALTERNATE_FLOORS', Validators.required]
  });

  // Strategy Options
  strategyOptions = [
    { value: 'ALTERNATE_FLOORS', label: 'Alternate Floors (Balanced)', subLabel: 'Odd floors Landowner, Even floors Developer' },
    { value: 'ODD_EVEN_UNITS', label: 'Odd/Even Units Partition', subLabel: 'Alternates unit by unit across each floor' },
    { value: 'UPPER_LOWER_SPLIT', label: 'Vertical Split', subLabel: 'Landowner top premium floors, developer lower floors' }
  ];

  jvForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    agreement_deed_no: ['', Validators.required],
    landowner_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    developer_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    signing_money_total: [5000000, [Validators.required, Validators.min(0)]],
    signing_money_paid: [2000000, [Validators.required, Validators.min(0)]],
    tenure_months: [36, [Validators.required, Validators.min(6)]],
    poa_deed_number: ['POA-2026/GUL-01'],
    poa_execution_date: ['2026-01-15'],
    poa_expiry_date: ['2029-01-14'],
    poa_verified: [true],
    unit_allocations: this.fb.array([]),
    milestones: this.fb.array([])
  });

  parcelOptions = computed(() => {
    return this.proposals().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.proposal_title}`,
      subLabel: `Mouza: ${p.mouza_name} | ${p.total_area_katha} Katha | Upazila: ${p.upazila_thana || 'Gulshan'}`
    }));
  });

  get unitAllocations(): FormArray {
    return this.jvForm.get('unit_allocations') as FormArray;
  }

  get milestones(): FormArray {
    return this.jvForm.get('milestones') as FormArray;
  }

  ngOnInit(): void {
    this.loadProposals();
    this.loadAgreements();
    this.loadExpiryAlerts();
  }

  loadProposals(): void {
    this.landService.getProposals().subscribe({
      next: (data) => this.proposals.set(data)
    });
  }

  loadAgreements(): void {
    this.isLoading.set(true);
    this.landService.getJVAgreements().subscribe({
      next: (data) => {
        this.agreements.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadExpiryAlerts(): void {
    this.landService.getDocumentExpiryAlerts().subscribe({
      next: (alerts) => this.expiryAlerts.set(alerts)
    });
  }

  setPresetRatio(landowner: number, developer: number): void {
    this.jvForm.patchValue({
      landowner_share_percent: landowner,
      developer_share_percent: developer
    });
  }

  onShareChange(source: 'landowner' | 'developer'): void {
    if (source === 'landowner') {
      const lo = Number(this.jvForm.get('landowner_share_percent')?.value || 0);
      this.jvForm.patchValue({ developer_share_percent: Math.max(0, 100 - lo) }, { emitEvent: false });
    } else {
      const dev = Number(this.jvForm.get('developer_share_percent')?.value || 0);
      this.jvForm.patchValue({ landowner_share_percent: Math.max(0, 100 - dev) }, { emitEvent: false });
    }
  }

  addUnitAllocation(): void {
    const group = this.fb.group({
      tower_name: ['Tower 1'],
      floor_number: [1, Validators.required],
      unit_number: ['1A', Validators.required],
      unit_identifier: ['', Validators.required],
      unit_type: ['APARTMENT', Validators.required],
      allocation_type: ['LANDOWNER_UNIT', Validators.required],
      is_locked_for_sales: [true],
      gross_sft: [1850, [Validators.required, Validators.min(100)]],
      parking_slot_number: ['B1-01'],
      allocation_notes: ['']
    });
    this.unitAllocations.push(group);
  }

  removeUnitAllocation(index: number): void {
    this.unitAllocations.removeAt(index);
  }

  addMilestone(): void {
    const mGroup = this.fb.group({
      milestone_name: ['', Validators.required],
      due_date: ['', Validators.required],
      amount_bdt: [0, [Validators.required, Validators.min(1)]],
      payment_status: ['PENDING', Validators.required],
      notes: ['']
    });
    this.milestones.push(mGroup);
  }

  removeMilestone(index: number): void {
    this.milestones.removeAt(index);
  }

  openCreateModal(): void {
    const defaultParcel = this.proposals().length ? this.proposals()[0].id : null;
    this.jvForm.reset({
      land_bank_id: defaultParcel,
      agreement_deed_no: `JV-AGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      landowner_share_percent: 50,
      developer_share_percent: 50,
      signing_money_total: 5000000,
      signing_money_paid: 2000000,
      tenure_months: 36,
      poa_deed_number: 'POA-2026/GUL-01',
      poa_execution_date: new Date().toISOString().split('T')[0],
      poa_expiry_date: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      poa_verified: true
    });
    this.unitAllocations.clear();
    this.milestones.clear();

    // Default sample units
    this.unitAllocations.push(this.fb.group({
      tower_name: ['Tower 1'],
      floor_number: [1],
      unit_number: ['1A'],
      unit_identifier: ['Tower 1 - Fl 1 - Unit 1A'],
      unit_type: ['APARTMENT'],
      allocation_type: ['LANDOWNER_UNIT'],
      is_locked_for_sales: [true],
      gross_sft: [1850],
      parking_slot_number: ['B1-01'],
      allocation_notes: ['Landowner residential share (Strictly locked from sales)']
    }));

    this.unitAllocations.push(this.fb.group({
      tower_name: ['Tower 1'],
      floor_number: [2],
      unit_number: ['2A'],
      unit_identifier: ['Tower 1 - Fl 2 - Unit 2A'],
      unit_type: ['APARTMENT'],
      allocation_type: ['DEVELOPER_UNIT'],
      is_locked_for_sales: [false],
      gross_sft: [1850],
      parking_slot_number: ['B1-02'],
      allocation_notes: ['Developer share - Open for CRM sales']
    }));

    // Default standard milestones
    this.milestones.push(this.fb.group({
      milestone_name: ['Signing Advance'],
      due_date: [new Date().toISOString().split('T')[0]],
      amount_bdt: [2000000],
      payment_status: ['PAID'],
      notes: ['Paid upon deed registration']
    }));

    this.milestones.push(this.fb.group({
      milestone_name: ['RAJUK Building Permit Approval'],
      due_date: [new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]],
      amount_bdt: [1500000],
      payment_status: ['PENDING'],
      notes: ['Due upon sanction approval']
    }));

    this.errorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitAgreement(): void {
    if (this.jvForm.invalid) {
      this.jvForm.markAllAsTouched();
      return;
    }

    const f = this.jvForm.value;
    const total = Number(f.landowner_share_percent) + Number(f.developer_share_percent);
    if (total !== 100) {
      this.errorMessage.set(`Shares must total exactly 100%. Currently: ${total}%`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      land_bank_id: Number(f.land_bank_id),
      agreement_deed_no: f.agreement_deed_no,
      landowner_share_percent: Number(f.landowner_share_percent),
      developer_share_percent: Number(f.developer_share_percent),
      signing_money_total: Number(f.signing_money_total),
      signing_money_paid: Number(f.signing_money_paid || 0),
      tenure_months: Number(f.tenure_months),
      poa_deed_number: f.poa_deed_number || null,
      poa_execution_date: f.poa_execution_date || null,
      poa_expiry_date: f.poa_expiry_date || null,
      poa_verified: !!f.poa_verified,
      unit_allocations: (f.unit_allocations || []).map((u: any) => ({
        tower_name: u.tower_name || 'Tower 1',
        floor_number: Number(u.floor_number || 1),
        unit_number: u.unit_number || '1A',
        unit_identifier: u.unit_identifier,
        unit_type: u.unit_type || 'APARTMENT',
        allocation_type: u.allocation_type,
        gross_sft: Number(u.gross_sft || 1850),
        parking_slot_number: u.parking_slot_number || null,
        allocation_notes: u.allocation_notes || null
      })),
      milestones: (f.milestones || []).map((m: any) => ({
        milestone_name: m.milestone_name,
        due_date: m.due_date,
        amount_bdt: Number(m.amount_bdt || 0),
        payment_status: m.payment_status || 'PENDING',
        notes: m.notes || null
      }))
    };

    this.landService.createJVAgreement(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadAgreements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to generate JV agreement.');
      }
    });
  }

  viewAllocations(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    this.isViewAllocationsModalOpen.set(true);
  }

  closeAllocationsModal(): void {
    this.isViewAllocationsModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  openAutoAllocateModal(): void {
    if (!this.selectedAgreement()) return;
    this.isAutoAllocateModalOpen.set(true);
  }

  closeAutoAllocateModal(): void {
    this.isAutoAllocateModalOpen.set(false);
  }

  runAutoAllocation(): void {
    const ag = this.selectedAgreement();
    if (!ag) return;

    const f = this.autoAllocForm.value;
    const req: JVAutoAllocationRequest = {
      jv_agreement_id: ag.id,
      total_floors: Number(f.total_floors),
      units_per_floor: Number(f.units_per_floor),
      unit_gross_sft: Number(f.unit_gross_sft),
      allocation_strategy: f.allocation_strategy
    };

    this.isSubmitting.set(true);
    this.landService.autoAllocateJVUnits(req).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.closeAutoAllocateModal();
        // Update selected agreement with fresh allocations
        const updatedAg: JVAgreement = {
          ...ag,
          unit_allocations: res.allocated_units
        };
        this.selectedAgreement.set(updatedAg);
        this.loadAgreements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to auto-allocate units.');
      }
    });
  }

  toggleUnitAllocation(unit: JVUnitAllocation): void {
    // Landowner units are strictly locked from sales.
    // Toggling switches between LANDOWNER_UNIT and DEVELOPER_UNIT
    if (unit.allocation_type === 'LANDOWNER_UNIT') {
      unit.allocation_type = 'DEVELOPER_UNIT';
      unit.is_locked_for_sales = false;
      unit.allocation_notes = 'Developer share - Open for CRM sales';
    } else {
      unit.allocation_type = 'LANDOWNER_UNIT';
      unit.is_locked_for_sales = true;
      unit.allocation_notes = 'Landowner residential share (Strictly locked from sales)';
    }
  }

  getParcelTitle(landBankId?: number | null): string {
    if (!landBankId) return 'N/A';
    const p = this.proposals().find(x => x.id === landBankId);
    return p ? `${p.project_code} - ${p.proposal_title}` : `Parcel #${landBankId}`;
  }

  getLandownerCount(allocations?: JVUnitAllocation[] | null): number {
    return (allocations || []).filter(u => u.allocation_type === 'LANDOWNER_UNIT').length;
  }

  getDeveloperCount(allocations?: JVUnitAllocation[] | null): number {
    return (allocations || []).filter(u => u.allocation_type === 'DEVELOPER_UNIT').length;
  }

  getLandownerSft(allocations?: JVUnitAllocation[] | null): number {
    return (allocations || [])
      .filter(u => u.allocation_type === 'LANDOWNER_UNIT')
      .reduce((sum, u) => sum + (u.gross_sft || 0), 0);
  }

  getDeveloperSft(allocations?: JVUnitAllocation[] | null): number {
    return (allocations || [])
      .filter(u => u.allocation_type === 'DEVELOPER_UNIT')
      .reduce((sum, u) => sum + (u.gross_sft || 0), 0);
  }
}
