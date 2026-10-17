import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TaxService } from '../../../core/services/tax.service';
import { ProjectService } from '../../../core/services/project.service';
import { SalesService } from '../../../core/services/sales.service';
import {
  TaxWithholdingRule,
  TaxZoneRate,
  TDSVDSCalculationRequest,
  TDSVDSCalculationResponse,
  AITSection53FFRequest,
  AITSection53FFResponse,
  Mushak63Invoice,
  Mushak65Challan,
  Mushak65ItemRow,
  TaxTreasuryChallan
} from '../../../core/models/tax.model';
import { TDSDeduction } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-tax-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './tax-cockpit.component.html'
})
export class TaxCockpitComponent implements OnInit {
  private taxService = inject(TaxService);
  private projectService = inject(ProjectService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  // Active Tab: 'overview' | 'mushak-63' | 'mushak-65' | 'tds-vds' | 'section-53ff' | 'settings'
  activeTab = signal<string>('overview');
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Data Signals
  invoices63 = signal<Mushak63Invoice[]>([]);
  challans65 = signal<Mushak65Challan[]>([]);
  tdsDeductions = signal<TDSDeduction[]>([]);
  treasuryChallans = signal<TaxTreasuryChallan[]>([]);
  withholdingRules = signal<TaxWithholdingRule[]>([]);
  taxZones = signal<TaxZoneRate[]>([]);
  projects = signal<Project[]>([]);
  bookings = signal<Booking[]>([]);

  // Search & Filters
  searchQuery = signal<string>('');
  selectedFilterProject = signal<number | null>(null);

  // Quick Select Options
  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: p.project_name,
      subLabel: `${p.development_authority_id || 'RAJUK'} • ${p.status || 'Active'}`
    }))
  );

  bookingOptions = computed(() =>
    this.bookings().map(b => ({
      value: b.id,
      label: `${b.booking_reference_no} • Unit #${b.unit_number || 'N/A'}`,
      subLabel: `Contract: ৳${(b.final_contract_value || 0).toLocaleString()} • ${b.customer_name || 'Client'}`
    }))
  );

  taxZoneOptions = computed(() =>
    this.taxZones().map(z => ({
      value: z.zone_code,
      label: `${z.zone_name} (${z.city_authority})`,
      subLabel: `Res: ৳${z.rate_per_sqm_residential}/sqm • Comm: ৳${z.rate_per_sqm_commercial}/sqm`
    }))
  );

  // Interactive TDS/VDS Calculator Form & Result
  tdsForm: FormGroup = this.fb.group({
    bill_type: ['CONTRACTOR_CIVIL', Validators.required],
    category: ['SAND_AND_STONE_CHIPS'],
    gross_amount: [1500000, [Validators.required, Validators.min(1000)]],
    payee_has_tin: [true],
    payee_submitted_return_proof: [true]
  });
  tdsResult = signal<TDSVDSCalculationResponse | null>(null);
  isCalculatingTds = signal<boolean>(false);

  // Interactive Section 53FF AIT Form & Result
  aitForm: FormGroup = this.fb.group({
    deed_value_bdt: [18500000, [Validators.required, Validators.min(10000)]],
    apartment_sqft: [1850, [Validators.required, Validators.min(100)]],
    zone_code: ['GULSHAN_BANANI', Validators.required],
    property_type: ['RESIDENTIAL', Validators.required]
  });
  aitResult = signal<AITSection53FFResponse | null>(null);
  isCalculatingAit = signal<boolean>(false);

  // Modal Dialog States
  isCreate63ModalOpen = signal<boolean>(false);
  isCreate65ModalOpen = signal<boolean>(false);
  isDepositModalOpen = signal<boolean>(false);
  isAddZoneModalOpen = signal<boolean>(false);
  isAddRuleModalOpen = signal<boolean>(false);
  isPrintModalOpen = signal<boolean>(false);

  // Print Document Modal Preview
  printDocType = signal<'MUSHAK_63' | 'MUSHAK_65' | 'FORM_54' | 'AIT_SHEET'>('MUSHAK_63');
  activePrintData = signal<any>(null);

  // New Mushak 6.3 Form
  create63Form: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    taxable_amount: [6500000, [Validators.required, Validators.min(1000)]],
    customer_tin_nid: ['TIN: 1985269123456'],
    apartment_type: ['RESIDENTIAL', Validators.required]
  });

  // New Mushak 6.5 Form
  create65Form: FormGroup = this.fb.group({
    origin_project_id: [null, Validators.required],
    destination_project_id: [null],
    transport_vehicle_type: ['TRUCK', Validators.required],
    vehicle_number: ['DHAKA METRO-TA-14-8899', Validators.required],
    driver_name: ['Md. Rafiqul Islam', Validators.required],
    driver_phone: ['01711-223344', Validators.required],
    purpose: ['INTERNAL_TRANSFER', Validators.required],
    remarks: ['Inter-site concrete casting material dispatch']
  });
  mushak65Items = signal<Mushak65ItemRow[]>([
    { item_name: 'BSRM Deformed Rebar 16mm', specification: 'Grade 500W', quantity: 10, unit: 'TON', unit_value: 98000, total_value: 980000 },
    { item_name: 'Shah Cement Special', specification: '50kg Bags', quantity: 300, unit: 'BAG', unit_value: 560, total_value: 168000 }
  ]);

  // Deposit Form
  depositForm: FormGroup = this.fb.group({
    tds_id: [null, Validators.required],
    challan_number: ['TR-CHALLAN-2026-9981', Validators.required],
    challan_deposit_date: [new Date().toISOString().substring(0, 10), Validators.required]
  });

  // Dynamic Zone Creation Form
  zoneForm: FormGroup = this.fb.group({
    zone_code: ['', Validators.required],
    zone_name: ['', Validators.required],
    city_authority: ['RAJUK', Validators.required],
    rate_per_sqm_residential: [2500, Validators.required],
    rate_per_sqm_commercial: [5000, Validators.required],
    rate_per_sft_residential: [232, Validators.required],
    rate_per_sft_commercial: [464, Validators.required],
    description: ['']
  });

  // Dynamic Rule Creation Form
  ruleForm: FormGroup = this.fb.group({
    rule_code: ['', Validators.required],
    rule_type: ['TDS', Validators.required],
    tax_section: ['Section 89', Validators.required],
    category_name: ['', Validators.required],
    min_bill_amount: [0],
    max_bill_amount: [null],
    rate_with_tin: [5, Validators.required],
    rate_without_tin: [7.5, Validators.required],
    description: ['']
  });

  // Computed KPIs
  totalVatCollected = computed(() =>
    this.invoices63().reduce((acc, inv) => acc + (inv.vat_amount || 0), 0)
  );

  totalTdsWithheld = computed(() =>
    this.tdsDeductions().reduce((acc, d) => acc + (d.withheld_amount || 0), 0)
  );

  totalTreasuryDeposited = computed(() =>
    this.treasuryChallans().reduce((acc, tc) => acc + (tc.total_deposit_amount || 0), 0)
  );

  pendingDepositsCount = computed(() =>
    this.tdsDeductions().filter(d => d.status === 'WITHHELD').length
  );

  ngOnInit(): void {
    this.loadAllData();
    this.runTdsCalculation();
    this.runAitCalculation();
  }

  loadAllData(): void {
    this.isLoading.set(true);

    this.taxService.getMushak63Invoices().subscribe({
      next: (data) => this.invoices63.set(data),
      error: (err) => console.error(err)
    });

    this.taxService.getMushak65Challans().subscribe({
      next: (data) => this.challans65.set(data),
      error: (err) => console.error(err)
    });

    this.taxService.getTDSDeductions().subscribe({
      next: (data) => this.tdsDeductions.set(data),
      error: (err) => console.error(err)
    });

    this.taxService.getTreasuryChallans().subscribe({
      next: (data) => this.treasuryChallans.set(data),
      error: (err) => console.error(err)
    });

    this.taxService.getWithholdingRules().subscribe({
      next: (data) => this.withholdingRules.set(data),
      error: (err) => console.error(err)
    });

    this.taxService.getTaxZones().subscribe({
      next: (data) => {
        this.taxZones.set(data);
        if (data.length > 0 && !this.aitForm.get('zone_code')?.value) {
          this.aitForm.patchValue({ zone_code: data[0].zone_code });
        }
      },
      error: (err) => console.error(err)
    });

    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0) {
          this.create65Form.patchValue({ origin_project_id: data[0].id });
        }
      },
      error: (err) => console.error(err)
    });

    this.salesService.getBookings().subscribe({
      next: (data) => {
        this.bookings.set(data);
        if (data.length > 0) {
          this.create63Form.patchValue({ booking_id: data[0].id });
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // --- Quick Calculator Runs ---
  runTdsCalculation(): void {
    if (this.tdsForm.invalid) return;
    this.isCalculatingTds.set(true);
    const req: TDSVDSCalculationRequest = this.tdsForm.value;
    this.taxService.calculateTDSVDS(req).subscribe({
      next: (res) => {
        this.tdsResult.set(res);
        this.isCalculatingTds.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isCalculatingTds.set(false);
      }
    });
  }

  runAitCalculation(): void {
    if (this.aitForm.invalid) return;
    this.isCalculatingAit.set(true);
    const req: AITSection53FFRequest = this.aitForm.value;
    this.taxService.calculateAITSection53FF(req).subscribe({
      next: (res) => {
        this.aitResult.set(res);
        this.isCalculatingAit.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isCalculatingAit.set(false);
      }
    });
  }

  // --- Mushak 6.3 Generation ---
  openCreate63Modal(): void {
    if (this.bookings().length > 0) {
      this.create63Form.patchValue({ booking_id: this.bookings()[0].id });
    }
    this.isCreate63ModalOpen.set(true);
  }

  submitMushak63(): void {
    if (this.create63Form.invalid) return;
    this.isSubmitting.set(true);

    const val = this.create63Form.value;
    this.taxService.generateMushak63({
      booking_id: Number(val.booking_id),
      taxable_amount: Number(val.taxable_amount),
      customer_tin_nid: val.customer_tin_nid,
      apartment_type: val.apartment_type
    }).subscribe({
      next: (inv) => {
        this.invoices63.update(list => [inv, ...list]);
        this.isSubmitting.set(false);
        this.isCreate63ModalOpen.set(false);
        this.previewMushak63(inv);
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to issue Mushak 6.3');
        this.isSubmitting.set(false);
      }
    });
  }

  previewMushak63(inv: Mushak63Invoice): void {
    this.printDocType.set('MUSHAK_63');
    this.activePrintData.set(inv);
    this.isPrintModalOpen.set(true);
  }

  downloadMushak63Pdf(id: number): void {
    window.open(this.taxService.getMushak63PdfUrl(id), '_blank');
  }

  // --- Mushak 6.5 Transfer Challan ---
  openCreate65Modal(): void {
    this.isCreate65ModalOpen.set(true);
  }

  addMushak65Item(): void {
    this.mushak65Items.update(items => [
      ...items,
      { item_name: 'Aggregates Stone Chips 3/4"', specification: 'Bholaganj Crushed', quantity: 500, unit: 'CFT', unit_value: 160, total_value: 80000 }
    ]);
  }

  removeMushak65Item(index: number): void {
    this.mushak65Items.update(items => items.filter((_, i) => i !== index));
  }

  calculateItemsTotal(): number {
    return this.mushak65Items().reduce((acc, itm) => acc + (Number(itm.total_value) || 0), 0);
  }

  submitMushak65(): void {
    if (this.create65Form.invalid || this.mushak65Items().length === 0) return;
    this.isSubmitting.set(true);

    const val = this.create65Form.value;
    const payload = {
      origin_project_id: Number(val.origin_project_id),
      destination_project_id: val.destination_project_id ? Number(val.destination_project_id) : null,
      transport_vehicle_type: val.transport_vehicle_type,
      vehicle_number: val.vehicle_number,
      driver_name: val.driver_name,
      driver_phone: val.driver_phone,
      purpose: val.purpose,
      items: this.mushak65Items(),
      remarks: val.remarks
    };

    this.taxService.createMushak65(payload).subscribe({
      next: (challan) => {
        this.challans65.update(list => [challan, ...list]);
        this.isSubmitting.set(false);
        this.isCreate65ModalOpen.set(false);
        this.previewMushak65(challan);
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to issue Mushak 6.5');
        this.isSubmitting.set(false);
      }
    });
  }

  previewMushak65(challan: Mushak65Challan): void {
    this.printDocType.set('MUSHAK_65');
    this.activePrintData.set(challan);
    this.isPrintModalOpen.set(true);
  }

  downloadMushak65Pdf(id: number): void {
    window.open(this.taxService.getMushak65PdfUrl(id), '_blank');
  }

  // --- Treasury Deposits & Deduction Certificates ---
  openDepositModal(record: TDSDeduction): void {
    this.depositForm.patchValue({
      tds_id: record.id,
      challan_number: `TR-CHALLAN-2026-${record.id + 100}`,
      challan_deposit_date: new Date().toISOString().substring(0, 10)
    });
    this.isDepositModalOpen.set(true);
  }

  submitTreasuryDeposit(): void {
    if (this.depositForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.depositForm.value;
    this.taxService.depositTDSToTreasury(Number(val.tds_id), {
      challan_number: val.challan_number,
      challan_deposit_date: val.challan_deposit_date
    }).subscribe({
      next: (updated) => {
        this.tdsDeductions.update(list =>
          list.map(item => item.id === updated.id ? updated : item)
        );
        this.isSubmitting.set(false);
        this.isDepositModalOpen.set(false);
        alert('Treasury Challan deposit confirmed and registered with Bangladesh Bank code.');
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to record deposit');
        this.isSubmitting.set(false);
      }
    });
  }

  downloadForm54(tdsId: number): void {
    window.open(this.taxService.getForm54PdfUrl(tdsId), '_blank');
  }

  downloadMushak66(tdsId: number): void {
    window.open(this.taxService.getMushak66PdfUrl(tdsId), '_blank');
  }

  // --- Dynamic Settings: Zone & Rule Creation ---
  submitNewZone(): void {
    if (this.zoneForm.invalid) return;
    this.isSubmitting.set(true);

    this.taxService.createTaxZone(this.zoneForm.value).subscribe({
      next: (newZone) => {
        this.taxZones.update(list => [...list, newZone]);
        this.isSubmitting.set(false);
        this.isAddZoneModalOpen.set(false);
        this.zoneForm.reset();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create zone');
        this.isSubmitting.set(false);
      }
    });
  }

  submitNewRule(): void {
    if (this.ruleForm.invalid) return;
    this.isSubmitting.set(true);

    this.taxService.createWithholdingRule(this.ruleForm.value).subscribe({
      next: (newRule) => {
        this.withholdingRules.update(list => [...list, newRule]);
        this.isSubmitting.set(false);
        this.isAddRuleModalOpen.set(false);
        this.ruleForm.reset();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create rule');
        this.isSubmitting.set(false);
      }
    });
  }

  // Close modals
  closeModals(): void {
    this.isCreate63ModalOpen.set(false);
    this.isCreate65ModalOpen.set(false);
    this.isDepositModalOpen.set(false);
    this.isAddZoneModalOpen.set(false);
    this.isAddRuleModalOpen.set(false);
    this.isPrintModalOpen.set(false);
  }

  printCurrentDocument(): void {
    window.print();
  }
}
