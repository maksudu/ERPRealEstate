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

export interface JVAmendmentRecord {
  id?: number;
  amendment_no: string;
  supplementary_deed_no: string;
  amendment_date: string;
  variation_category: string;
  variation_details: string;
  approved_by: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface JVDisputeRecord {
  id?: number;
  dispute_status: 'NONE' | 'NOTICE_SERVED' | 'UNDER_ARBITRATION' | 'RESOLVED' | 'TERMINATED';
  breach_party: 'LANDOWNER' | 'DEVELOPER' | 'BOTH';
  notice_date?: string;
  cure_deadline?: string;
  dispute_category: string;
  breach_details: string;
  arbitration_status?: string;
  resolution_notes?: string;
}

export interface JVDocumentItem {
  id: number;
  doc_title: string;
  doc_type: 'SIGNED_JV_DEED' | 'IRREVOCABLE_POA' | 'SUPPLEMENTARY_DEED' | 'RAJUK_APPROVAL' | 'MUTATION_RECORD';
  file_name: string;
  uploaded_at: string;
  uploaded_by: string;
  verification_status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  file_size?: string;
}

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
    SearchableSelectComponent,
    CustomTextareaComponent
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

  // Modals & Drawers
  isCreateModalOpen = signal<boolean>(false);
  isViewAllocationsModalOpen = signal<boolean>(false);
  isAutoAllocateModalOpen = signal<boolean>(false);
  isAlertsDrawerOpen = signal<boolean>(false);
  isEntitlementModalOpen = signal<boolean>(false);
  isAmendmentsModalOpen = signal<boolean>(false);
  isDisputesModalOpen = signal<boolean>(false);
  isDocumentsModalOpen = signal<boolean>(false);

  // Tab State inside Create / Edit Modal
  currentCreateTab = signal<number>(1);
  errorMessage = signal<string | null>(null);

  // Filters
  filterSearch = signal<string>('');
  filterStatus = signal<string>('ALL');
  matrixFilterType = signal<string>('ALL');
  matrixFilterTower = signal<string>('ALL');

  // Dynamic supplementary amendments storage per agreement (In-memory + server state)
  agreementAmendments = signal<Record<number, JVAmendmentRecord[]>>({});
  agreementDisputes = signal<Record<number, JVDisputeRecord>>({});
  agreementDocuments = signal<Record<number, JVDocumentItem[]>>({});

  // Form for New Supplementary Amendment
  amendmentForm: FormGroup = this.fb.group({
    supplementary_deed_no: ['', Validators.required],
    amendment_date: [new Date().toISOString().split('T')[0], Validators.required],
    variation_category: ['AREA_ADJUSTMENT', Validators.required],
    variation_details: ['', Validators.required],
    approved_by: ['Board of Directors / Legal Head', Validators.required]
  });

  // Form for Dispute & Breach tracking
  disputeForm: FormGroup = this.fb.group({
    dispute_status: ['NOTICE_SERVED', Validators.required],
    breach_party: ['LANDOWNER', Validators.required],
    notice_date: [new Date().toISOString().split('T')[0], Validators.required],
    cure_deadline: [new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0], Validators.required],
    dispute_category: ['CONSTRUCTION_TIMELINE_DELAY', Validators.required],
    breach_details: ['', Validators.required],
    arbitration_status: ['Dispute notice issued under Section 14; 60 days cure period active.'],
    resolution_notes: ['']
  });

  // Form for New Document upload
  documentForm: FormGroup = this.fb.group({
    doc_title: ['', Validators.required],
    doc_type: ['SIGNED_JV_DEED', Validators.required],
    file_name: ['JV_Agreement_Signed_Copy.pdf']
  });

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

  agreementTypeOptions = [
    { value: 'JOINT_VENTURE_DEVELOPMENT', label: 'Joint Venture Development Agreement (Principal)', subLabel: 'Primary contract for land contribution against units/revenue' },
    { value: 'SUPPLEMENTARY_AMENDMENT', label: 'Supplementary & Amendment Agreement', subLabel: 'Variation in unit allocation, tenure or area' },
    { value: 'POWER_OF_ATTORNEY_AGREEMENT', label: 'Registered Irrevocable PoA Agreement', subLabel: 'Statutory development & sales power of attorney' },
    { value: 'PARTITION_SETTLEMENT', label: 'Amicable Partition & Unit Settlement Deed', subLabel: 'Final unit demarcations upon handover' }
  ];

  unitTypeOptions = [
    { value: 'APARTMENT', label: 'Residential Apartment', subLabel: 'Standard living flat/unit' },
    { value: 'COMMERCIAL', label: 'Commercial Office Space', subLabel: 'Office or business floors' },
    { value: 'SHOP', label: 'Retail Shop / Showroom', subLabel: 'Ground/basement commercial unit' },
    { value: 'PARKING_BAY', label: 'Dedicated Parking Space', subLabel: 'Basement/podium car bay' }
  ];

  // Comprehensive 5-Tab JV Agreement Form
  jvForm: FormGroup = this.fb.group({
    // Tab 1: Project & Parties Registration
    land_bank_id: [null, Validators.required],
    parcel_id: [null],
    agreement_deed_no: ['', Validators.required],
    agreement_type: ['JOINT_VENTURE_DEVELOPMENT', Validators.required],
    agreement_date: [new Date().toISOString().split('T')[0], Validators.required],
    tenure_months: [36, [Validators.required, Validators.min(6)]],
    registration_deed_no: [''],
    registration_office: ['Gulshan Sub-Registry Office'],
    registration_date: [''],
    witness_count: [2, [Validators.min(1)]],
    developer_entity_name: ['BlueOceans Real Estate Ltd.'],
    developer_signatory: ['Managing Director & CEO'],
    landowner_name: [''],
    landowner_nid: [''],
    landowner_phone: [''],

    // Tab 2: Land Contribution & Entitlements
    contributed_area_katha: [10],
    mouza_khatian_dag: ['Mouza: Gulshan, Khatian: 142/A, Dag: 5012'],
    agreed_land_valuation: [120000000],
    total_project_saleable_sft: [40000, [Validators.required, Validators.min(500)]],
    landowner_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    developer_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    signing_money_total: [5000000, [Validators.required, Validators.min(0)]],
    signing_money_paid: [2000000, [Validators.required, Validators.min(0)]],
    allocated_cash_bdt: [0],

    // PoA Details
    poa_deed_number: ['POA-2026/GUL-01'],
    poa_execution_date: ['2026-01-15'],
    poa_expiry_date: ['2029-01-14'],
    poa_verified: [true],

    // Tab 4: Obligations & Milestones
    handover_commitment_date: [new Date(Date.now() + 36 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0]],
    obligations_developer: ['Procure all statutory approvals from RAJUK/CDA, Department of Environment, Fire Service and DESCO. Complete construction using Grade-60 deformed bars and standard 4000 PSI concrete within 36 months.'],
    obligations_landowner: ['Deliver unencumbered peaceful vacant possession upon signing. Assist developer in all mutation, sub-registry and municipal sanction approvals without delay.'],
    special_conditions: ['Defect liability period of 12 continuous months following formal handover. Grace period of 6 months for non-attributable force majeure.'],
    defect_liability_months: [12],
    grace_period_months: [6],

    // Tab 5: Variations & Disputes
    amendment_number: [0],
    termination_conditions: ['60 days written cure notice for material breach. If unresolved, dispute referred to sole arbitrator under Bangladesh Arbitration Act 2001 in Dhaka.'],
    dispute_arbitration_clause: ['Mutual negotiation within 30 days; failing which, reference to sole arbitrator appointed under Bangladesh Arbitration Act 2001 in Dhaka.'],
    default_notice_period_days: [60],
    missing_consents_flag: [false],

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

  // Filtered master agreements list
  filteredAgreements = computed(() => {
    let list = this.agreements();
    const q = this.filterSearch().trim().toLowerCase();
    const st = this.filterStatus();

    if (st !== 'ALL') {
      list = list.filter(a => a.status === st);
    }
    if (q) {
      list = list.filter(a => 
        a.agreement_deed_no.toLowerCase().includes(q) ||
        (a.poa_deed_number && a.poa_deed_number.toLowerCase().includes(q)) ||
        this.getParcelTitle(a.land_bank_id).toLowerCase().includes(q)
      );
    }
    return list;
  });

  // Filtered unit allocations in Interactive Matrix
  filteredMatrixUnits = computed(() => {
    const ag = this.selectedAgreement();
    if (!ag || !ag.unit_allocations) return [];
    let units = ag.unit_allocations;
    const type = this.matrixFilterType();
    const tower = this.matrixFilterTower();

    if (type !== 'ALL') {
      units = units.filter(u => u.unit_type === type);
    }
    if (tower !== 'ALL') {
      units = units.filter(u => u.tower_name === tower);
    }
    return units;
  });

  availableTowers = computed(() => {
    const ag = this.selectedAgreement();
    if (!ag || !ag.unit_allocations) return ['Tower 1'];
    const set = new Set(ag.unit_allocations.map(u => u.tower_name || 'Tower 1'));
    return Array.from(set);
  });

  // Summary Metrics computed across all agreements
  totalRegisteredJVs = computed(() => this.agreements().length);
  
  totalSigningAdvanceTotal = computed(() => {
    return this.agreements().reduce((acc, a) => acc + Number(a.signing_money_total || 0), 0);
  });

  totalSigningAdvancePaid = computed(() => {
    return this.agreements().reduce((acc, a) => acc + Number(a.signing_money_paid || 0), 0);
  });

  totalAllocatedFlats = computed(() => {
    return this.agreements().reduce((acc, a) => acc + this.getLandownerCount(a.unit_allocations) + this.getDeveloperCount(a.unit_allocations), 0);
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
    this.initMockAmendmentsAndDisputes();
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

  onParcelSelect(parcelId: any): void {
    if (!parcelId) return;
    const p = this.proposals().find(x => x.id === Number(parcelId));
    if (!p) return;
    const lo = p.landowners && p.landowners.length ? p.landowners[0] : null;
    const totalAreaKatha = Number(p.total_area_katha || 10);
    const estBuiltup = Math.round(totalAreaKatha * 720 * 4.5);

    this.jvForm.patchValue({
      land_bank_id: p.id,
      contributed_area_katha: totalAreaKatha,
      mouza_khatian_dag: `Mouza: ${p.mouza_name || 'Gulshan'}, JL: ${p.jl_number || '42'}, Thana: ${p.upazila_thana || 'Gulshan'}`,
      agreed_land_valuation: (p as any).estimated_cost_bdt || (p as any).negotiated_price_total_bdt || 120000000,
      total_project_saleable_sft: estBuiltup,
      landowner_name: lo ? lo.full_name_en : 'Begum Sufia Rahman & Co-sharers',
      landowner_nid: lo ? ((lo as any).nid_number || '19752693847291029') : '19752693847291029',
      landowner_phone: lo ? ((lo as any).mobile_number || (lo as any).phone_primary || '+880 1711-234567') : '+880 1711-234567'
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

  setCreateTab(tab: number): void {
    this.currentCreateTab.set(tab);
  }

  addUnitAllocation(): void {
    const floor = this.unitAllocations.length + 1;
    const group = this.fb.group({
      tower_name: ['Tower 1'],
      floor_number: [floor, Validators.required],
      unit_number: [`${floor}A`, Validators.required],
      unit_identifier: [`Tower 1 - Fl ${floor} - Unit ${floor}A`, Validators.required],
      unit_type: ['APARTMENT', Validators.required],
      allocation_type: [floor % 2 === 1 ? 'LANDOWNER_UNIT' : 'DEVELOPER_UNIT', Validators.required],
      is_locked_for_sales: [floor % 2 === 1],
      gross_sft: [1850, [Validators.required, Validators.min(100)]],
      parking_slot_number: [`B1-${floor < 10 ? '0' + floor : floor}`],
      allocation_notes: [floor % 2 === 1 ? 'Landowner entitlement share' : 'Developer commercial sales inventory']
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
    this.currentCreateTab.set(1);
    this.jvForm.reset({
      land_bank_id: defaultParcel,
      parcel_id: null,
      agreement_deed_no: `JV-AGR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      agreement_type: 'JOINT_VENTURE_DEVELOPMENT',
      agreement_date: new Date().toISOString().split('T')[0],
      tenure_months: 36,
      registration_deed_no: `REG-DEED-${new Date().getFullYear()}-0842`,
      registration_office: 'Gulshan Sub-Registry Office',
      registration_date: new Date().toISOString().split('T')[0],
      witness_count: 2,
      developer_entity_name: 'BlueOceans Real Estate Ltd.',
      developer_signatory: 'Managing Director & CEO',
      landowner_name: 'Begum Sufia Rahman & Co-sharers',
      landowner_nid: '19752693847291029',
      landowner_phone: '+880 1711-234567',
      contributed_area_katha: 10,
      mouza_khatian_dag: 'Mouza: Gulshan, Khatian: 142/A, Dag: 5012',
      agreed_land_valuation: 120000000,
      total_project_saleable_sft: 40000,
      landowner_share_percent: 40,
      developer_share_percent: 60,
      signing_money_total: 5000000,
      signing_money_paid: 2000000,
      allocated_cash_bdt: 0,
      poa_deed_number: `POA-${new Date().getFullYear()}/GUL-01`,
      poa_execution_date: new Date().toISOString().split('T')[0],
      poa_expiry_date: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
      poa_verified: true,
      handover_commitment_date: new Date(Date.now() + 36 * 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      obligations_developer: 'Procure all statutory approvals from RAJUK/CDA, Fire Service and DESCO. Complete construction using Grade-60 deformed bars and standard 4000 PSI concrete within 36 months.',
      obligations_landowner: 'Deliver unencumbered peaceful vacant possession upon signing. Assist developer in all mutation, sub-registry and municipal sanction approvals without delay.',
      special_conditions: 'Defect liability period of 12 continuous months following formal handover. Grace period of 6 months for non-attributable force majeure.',
      defect_liability_months: 12,
      grace_period_months: 6,
      amendment_number: 0,
      termination_conditions: '60 days written cure notice for material breach. If unresolved, dispute referred to sole arbitrator under Bangladesh Arbitration Act 2001 in Dhaka.',
      dispute_arbitration_clause: 'Mutual negotiation within 30 days; failing which, reference to sole arbitrator appointed under Bangladesh Arbitration Act 2001 in Dhaka.',
      default_notice_period_days: 60,
      missing_consents_flag: false
    });

    this.unitAllocations.clear();
    this.milestones.clear();

    // Default sample units
    const sampleUnits = [
      { tower: 'Tower 1', floor: 1, unit: '1A', type: 'COMMERCIAL', alloc: 'LANDOWNER_UNIT', sft: 2000, bay: 'B1-01', note: 'Ground Floor Commercial Showroom - Landowner Share' },
      { tower: 'Tower 1', floor: 1, unit: '1B', type: 'SHOP', alloc: 'DEVELOPER_UNIT', sft: 1500, bay: 'B1-02', note: 'Commercial Retail Shop - Developer Inventory' },
      { tower: 'Tower 1', floor: 2, unit: '2A', type: 'APARTMENT', alloc: 'LANDOWNER_UNIT', sft: 1850, bay: 'B1-03', note: 'Residential Apartment - Landowner Share' },
      { tower: 'Tower 1', floor: 2, unit: '2B', type: 'APARTMENT', alloc: 'DEVELOPER_UNIT', sft: 1850, bay: 'B1-04', note: 'Residential Apartment - Developer Share' },
      { tower: 'Tower 1', floor: 3, unit: '3A', type: 'APARTMENT', alloc: 'LANDOWNER_UNIT', sft: 1850, bay: 'B1-05', note: 'Residential Apartment - Landowner Share' },
      { tower: 'Tower 1', floor: 3, unit: '3B', type: 'APARTMENT', alloc: 'DEVELOPER_UNIT', sft: 1850, bay: 'B1-06', note: 'Residential Apartment - Developer Share' },
      { tower: 'Tower 1', floor: 4, unit: '4A', type: 'APARTMENT', alloc: 'LANDOWNER_UNIT', sft: 1850, bay: 'B1-07', note: 'Residential Apartment - Landowner Share' },
      { tower: 'Tower 1', floor: 4, unit: '4B', type: 'APARTMENT', alloc: 'DEVELOPER_UNIT', sft: 1850, bay: 'B1-08', note: 'Residential Apartment - Developer Share' }
    ];

    sampleUnits.forEach(u => {
      this.unitAllocations.push(this.fb.group({
        tower_name: [u.tower],
        floor_number: [u.floor],
        unit_number: [u.unit],
        unit_identifier: `${u.tower} - Fl ${u.floor} - Unit ${u.unit}`,
        unit_type: [u.type],
        allocation_type: [u.alloc],
        is_locked_for_sales: [u.alloc === 'LANDOWNER_UNIT'],
        gross_sft: [u.sft],
        parking_slot_number: [u.bay],
        allocation_notes: [u.note]
      }));
    });

    // Default standard milestones
    this.milestones.push(this.fb.group({
      milestone_name: ['Signing Advance Consideration'],
      due_date: [new Date().toISOString().split('T')[0]],
      amount_bdt: [2000000],
      payment_status: ['PAID'],
      notes: ['Paid upon deed registration via Cheque #CQ-98421']
    }));

    this.milestones.push(this.fb.group({
      milestone_name: ['RAJUK Building Permit Sanction Approval'],
      due_date: [new Date(Date.now() + 120 * 24 * 3600 * 1000).toISOString().split('T')[0]],
      amount_bdt: [1500000],
      payment_status: ['PENDING'],
      notes: ['Payable upon sanction letter release']
    }));

    this.milestones.push(this.fb.group({
      milestone_name: ['Sub-structure Piling & Raft Completion'],
      due_date: [new Date(Date.now() + 240 * 24 * 3600 * 1000).toISOString().split('T')[0]],
      amount_bdt: [1000000],
      payment_status: ['PENDING'],
      notes: ['Certified by structural engineer']
    }));

    this.milestones.push(this.fb.group({
      milestone_name: ['Final Roof Casting Completion'],
      due_date: [new Date(Date.now() + 480 * 24 * 3600 * 1000).toISOString().split('T')[0]],
      amount_bdt: [500000],
      payment_status: ['PENDING'],
      notes: ['Final installment prior to unit handover']
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

    const units = (f.unit_allocations || []).map((u: any) => ({
      tower_name: u.tower_name || 'Tower 1',
      floor_number: Number(u.floor_number || 1),
      unit_number: u.unit_number || '1A',
      unit_identifier: u.unit_identifier || `${u.tower_name || 'Tower 1'} - ${u.unit_number || '1A'}`,
      unit_type: u.unit_type || 'APARTMENT',
      allocation_type: u.allocation_type,
      gross_sft: Number(u.gross_sft || 1850),
      parking_slot_number: u.parking_slot_number || null,
      allocation_notes: u.allocation_notes || null,
      is_locked_for_sales: u.allocation_type === 'LANDOWNER_UNIT'
    }));

    const flatsCount = units.filter((u: any) => u.unit_type === 'APARTMENT' && u.allocation_type === 'LANDOWNER_UNIT').length;
    const shopsCount = units.filter((u: any) => (u.unit_type === 'SHOP' || u.unit_type === 'COMMERCIAL') && u.allocation_type === 'LANDOWNER_UNIT').length;
    const carParksCount = units.filter((u: any) => u.parking_slot_number && u.allocation_type === 'LANDOWNER_UNIT').length;

    const payload = {
      land_bank_id: Number(f.land_bank_id),
      parcel_id: f.parcel_id ? Number(f.parcel_id) : null,
      agreement_deed_no: f.agreement_deed_no,
      agreement_type: f.agreement_type || 'JOINT_VENTURE_DEVELOPMENT',
      registration_deed_no: f.registration_deed_no || null,
      registration_office: f.registration_office || null,
      registration_date: f.registration_date || null,
      witness_count: Number(f.witness_count || 2),
      landowner_share_percent: Number(f.landowner_share_percent),
      developer_share_percent: Number(f.developer_share_percent),
      signing_money_total: Number(f.signing_money_total),
      signing_money_paid: Number(f.signing_money_paid || 0),
      tenure_months: Number(f.tenure_months),
      allocated_flats_count: flatsCount,
      allocated_shops_count: shopsCount,
      allocated_car_parks_count: carParksCount,
      allocated_cash_bdt: Number(f.allocated_cash_bdt || 0),
      obligations_developer: f.obligations_developer || null,
      obligations_landowner: f.obligations_landowner || null,
      special_conditions: f.special_conditions || null,
      amendment_number: Number(f.amendment_number || 0),
      termination_conditions: f.termination_conditions || null,
      missing_consents_flag: !!f.missing_consents_flag,
      poa_deed_number: f.poa_deed_number || null,
      poa_execution_date: f.poa_execution_date || null,
      poa_expiry_date: f.poa_expiry_date || null,
      poa_verified: !!f.poa_verified,
      unit_allocations: units,
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
    this.matrixFilterType.set('ALL');
    this.matrixFilterTower.set('ALL');
    this.isViewAllocationsModalOpen.set(true);
  }

  closeAllocationsModal(): void {
    this.isViewAllocationsModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  // 12. Landowner Entitlement Statement & Reconciliation Modal
  openEntitlementStatement(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    this.isEntitlementModalOpen.set(true);
  }

  closeEntitlementModal(): void {
    this.isEntitlementModalOpen.set(false);
  }

  // 11. Variation & Supplementary Agreements Modal
  openAmendmentsModal(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    this.isAmendmentsModalOpen.set(true);
    this.amendmentForm.reset({
      supplementary_deed_no: `SUPP-${ag.agreement_deed_no}-${(this.getAmendmentsForAgreement(ag.id).length + 1)}`,
      amendment_date: new Date().toISOString().split('T')[0],
      variation_category: 'AREA_ADJUSTMENT',
      variation_details: '',
      approved_by: 'Board Resolution & Legal Counsel'
    });
  }

  closeAmendmentsModal(): void {
    this.isAmendmentsModalOpen.set(false);
  }

  addSupplementaryAmendment(): void {
    const ag = this.selectedAgreement();
    if (!ag || this.amendmentForm.invalid) return;

    const f = this.amendmentForm.value;
    const newRecord: JVAmendmentRecord = {
      id: Date.now(),
      amendment_no: `AMD-0${this.getAmendmentsForAgreement(ag.id).length + 1}`,
      supplementary_deed_no: f.supplementary_deed_no,
      amendment_date: f.amendment_date,
      variation_category: f.variation_category,
      variation_details: f.variation_details,
      approved_by: f.approved_by,
      status: 'APPROVED'
    };

    const currentMap = { ...this.agreementAmendments() };
    const list = currentMap[ag.id] || [];
    currentMap[ag.id] = [...list, newRecord];
    this.agreementAmendments.set(currentMap);

    // Update agreement amendment number count
    ag.amendment_number = (ag.amendment_number || 0) + 1;
    this.amendmentForm.reset();
  }

  // 14. Dispute, Breach and Termination Modal
  openDisputesModal(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    const existing = this.agreementDisputes()[ag.id];
    if (existing) {
      this.disputeForm.patchValue(existing);
    } else {
      this.disputeForm.reset({
        dispute_status: 'NONE',
        breach_party: 'LANDOWNER',
        notice_date: new Date().toISOString().split('T')[0],
        cure_deadline: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0],
        dispute_category: 'CONSTRUCTION_TIMELINE_DELAY',
        breach_details: 'No formal breach reported. Mutual contractual compliance intact.',
        arbitration_status: 'Normal Operations',
        resolution_notes: ''
      });
    }
    this.isDisputesModalOpen.set(true);
  }

  closeDisputesModal(): void {
    this.isDisputesModalOpen.set(false);
  }

  saveDisputeRecord(): void {
    const ag = this.selectedAgreement();
    if (!ag || this.disputeForm.invalid) return;

    const record: JVDisputeRecord = this.disputeForm.value;
    const currentMap = { ...this.agreementDisputes() };
    currentMap[ag.id] = record;
    this.agreementDisputes.set(currentMap);
    alert('Dispute and breach tracking record saved successfully.');
    this.closeDisputesModal();
  }

  // 15. Agreement Document Storage and Approval History Modal
  openDocumentsModal(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    this.isDocumentsModalOpen.set(true);
    this.documentForm.reset({
      doc_title: '',
      doc_type: 'SIGNED_JV_DEED',
      file_name: 'JV_Executed_Deed.pdf'
    });
  }

  closeDocumentsModal(): void {
    this.isDocumentsModalOpen.set(false);
  }

  uploadAgreementDocument(): void {
    const ag = this.selectedAgreement();
    if (!ag || this.documentForm.invalid) return;

    const f = this.documentForm.value;
    const newDoc: JVDocumentItem = {
      id: Date.now(),
      doc_title: f.doc_title,
      doc_type: f.doc_type,
      file_name: f.file_name || `${f.doc_title.replace(/\s+/g, '_')}.pdf`,
      uploaded_at: new Date().toISOString().split('T')[0],
      uploaded_by: 'Legal Acquisitions Manager',
      verification_status: 'VERIFIED',
      file_size: '2.4 MB'
    };

    const currentMap = { ...this.agreementDocuments() };
    const list = currentMap[ag.id] || [];
    currentMap[ag.id] = [...list, newDoc];
    this.agreementDocuments.set(currentMap);
    this.documentForm.reset();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.documentForm.patchValue({
        file_name: file.name
      });
    }
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

  getFlatsCount(allocations?: JVUnitAllocation[] | null, type: 'LANDOWNER' | 'DEVELOPER' = 'LANDOWNER'): number {
    const targetType = type === 'LANDOWNER' ? 'LANDOWNER_UNIT' : 'DEVELOPER_UNIT';
    return (allocations || []).filter(u => u.allocation_type === targetType && u.unit_type === 'APARTMENT').length;
  }

  getShopsCount(allocations?: JVUnitAllocation[] | null, type: 'LANDOWNER' | 'DEVELOPER' = 'LANDOWNER'): number {
    const targetType = type === 'LANDOWNER' ? 'LANDOWNER_UNIT' : 'DEVELOPER_UNIT';
    return (allocations || []).filter(u => u.allocation_type === targetType && (u.unit_type === 'SHOP' || u.unit_type === 'COMMERCIAL')).length;
  }

  getParkingCount(allocations?: JVUnitAllocation[] | null, type: 'LANDOWNER' | 'DEVELOPER' = 'LANDOWNER'): number {
    const targetType = type === 'LANDOWNER' ? 'LANDOWNER_UNIT' : 'DEVELOPER_UNIT';
    return (allocations || []).filter(u => u.allocation_type === targetType && u.parking_slot_number).length;
  }

  // Entitlement Statement Calculations
  getEstimatedTotalProjectSft(ag: JVAgreement | null): number {
    if (!ag) return 40000;
    const totalAllocSft = (ag.unit_allocations || []).reduce((acc, u) => acc + (u.gross_sft || 0), 0);
    return Math.max(40000, totalAllocSft);
  }

  getTheoreticalEntitledSft(ag: JVAgreement | null): number {
    if (!ag) return 0;
    const totalSft = this.getEstimatedTotalProjectSft(ag);
    return Math.round((ag.landowner_share_percent / 100) * totalSft);
  }

  getActualAllocatedSft(ag: JVAgreement | null): number {
    if (!ag) return 0;
    return this.getLandownerSft(ag.unit_allocations);
  }

  getReconciliationVarianceSft(ag: JVAgreement | null): number {
    if (!ag) return 0;
    return this.getActualAllocatedSft(ag) - this.getTheoreticalEntitledSft(ag);
  }

  getAmendmentsForAgreement(agId?: number): JVAmendmentRecord[] {
    if (!agId) return [];
    return this.agreementAmendments()[agId] || [];
  }

  getDocumentsForAgreement(agId?: number): JVDocumentItem[] {
    if (!agId) return [];
    return this.agreementDocuments()[agId] || [];
  }

  getDisputeForAgreement(agId?: number): JVDisputeRecord | null {
    if (!agId) return null;
    return this.agreementDisputes()[agId] || null;
  }

  printEntitlementStatement(): void {
    window.print();
  }

  private initMockAmendmentsAndDisputes(): void {
    // Initial mock documents and supplementary entries for instant rich display
    const mockAmendments: Record<number, JVAmendmentRecord[]> = {
      1: [
        {
          id: 1,
          amendment_no: 'AMD-01',
          supplementary_deed_no: 'SUPP-JV-2026-081',
          amendment_date: '2026-03-10',
          variation_category: 'AREA_ADJUSTMENT',
          variation_details: 'Landowner allocated additional ground floor commercial space (300 sft) against adjusted signing advance.',
          approved_by: 'Board Resolution #BR-2026-14',
          status: 'APPROVED'
        }
      ]
    };

    const mockDisputes: Record<number, JVDisputeRecord> = {
      1: {
        dispute_status: 'NONE',
        breach_party: 'LANDOWNER',
        notice_date: '2026-01-15',
        cure_deadline: '2026-03-16',
        dispute_category: 'MUTUAL_COMPLIANCE',
        breach_details: 'All contractual milestones are progressing on schedule. No breach or default notice active.',
        arbitration_status: 'Compliant',
        resolution_notes: 'Quarterly review completed with all parties present.'
      }
    };

    const mockDocs: Record<number, JVDocumentItem[]> = {
      1: [
        {
          id: 101,
          doc_title: 'Registered Joint Venture Agreement Deed #8942',
          doc_type: 'SIGNED_JV_DEED',
          file_name: 'JV_Deed_Signed_Registered_8942.pdf',
          uploaded_at: '2026-01-16',
          uploaded_by: 'Legal Acquisitions Lead',
          verification_status: 'VERIFIED',
          file_size: '4.8 MB'
        },
        {
          id: 102,
          doc_title: 'Irrevocable General Power of Attorney (PoA)',
          doc_type: 'IRREVOCABLE_POA',
          file_name: 'Irrevocable_PoA_Gulshan_SubRegistry.pdf',
          uploaded_at: '2026-01-16',
          uploaded_by: 'Legal Acquisitions Lead',
          verification_status: 'VERIFIED',
          file_size: '3.2 MB'
        }
      ]
    };

    this.agreementAmendments.set(mockAmendments);
    this.agreementDisputes.set(mockDisputes);
    this.agreementDocuments.set(mockDocs);
  }
}
