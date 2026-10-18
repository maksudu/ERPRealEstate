import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { ProjectService } from '../../../core/services/project.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { CrmService } from '../../../core/services/crm.service';
import { Project } from '../../../core/models/project.model';
import { Unit } from '../../../core/models/inventory.model';
import { Customer } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-discount-proposal-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-16">
      <!-- Breadcrumb & Top Navigation Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/discounts"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Discounts & Negotiation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 5.4 · Price Negotiation & Commercial Workflow
              </span>
              <span class="text-xs text-muted-foreground font-mono">New Proposal</span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              Submit Commercial Price Negotiation & Concession
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/sales/discounts"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary rounded-xl border border-border transition-colors"
          >
            Cancel & Return
          </a>
          <app-custom-button
            variant="primary"
            (clicked)="submitProposal()"
            [disabled]="proposalForm.invalid || isSubmitting()"
          >
            {{ isSubmitting() ? 'Submitting Proposal...' : 'Submit Commercial Proposal' }}
          </app-custom-button>
        </div>
      </div>

      <!-- Main Proposal Form -->
      <form [formGroup]="proposalForm" (ngSubmit)="submitProposal()" class="flex flex-col gap-6">

        <!-- Card 1: Property Unit & Customer Details -->
        <app-card-container
          title="01. Property Allotment & Customer Identification"
          subtitle="Select property unit and customer seeking commercial negotiation"
        >
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Project Selection -->
            <app-searchable-select
              label="Select Project *"
              [options]="projectOptions()"
              placeholder="Search project..."
              formControlName="project_id"
              (selectionChange)="onProjectChange($event)"
            />

            <!-- Unit Selection -->
            <app-searchable-select
              label="Select Apartment Unit *"
              [options]="unitOptions()"
              placeholder="Search available unit..."
              formControlName="unit_id"
              (selectionChange)="onUnitChange($event)"
            />

            <!-- Customer Selection -->
            <app-searchable-select
              label="Select Buyer / Customer *"
              [options]="customerOptions()"
              placeholder="Search buyer..."
              formControlName="customer_id"
            />
          </div>

          <div class="mt-4">
            <app-custom-input
              label="Submitting Sales Representative Name *"
              placeholder="e.g. Tanvir Ahmed (Senior Sales Officer)"
              formControlName="submitted_by_rep_name"
            />
          </div>

          <!-- Selected Unit Strip -->
          @if (selectedUnit()) {
            <div class="mt-4 p-3 bg-secondary/30 rounded-xl border border-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span class="text-muted-foreground block font-medium">Selected Unit</span>
                <span class="font-bold text-foreground">
                  Unit {{ selectedUnit()?.unit_number }} · Floor {{ selectedUnit()?.floor_number }} · {{ selectedUnit()?.gross_saleable_area_sqft || selectedUnit()?.net_carpet_area_sqft }} Sq. Ft.
                </span>
              </div>
              <div>
                <span class="text-muted-foreground block font-medium">Catalog List Price</span>
                <span class="font-bold font-mono text-primary text-sm">
                  BDT {{ (selectedUnit()?.total_unit_price || 0) | number:'1.0-0' }}
                </span>
              </div>
            </div>
          }
        </app-card-container>

        <!-- Card 2: Pricing Components Breakdown (Spec 5.4) -->
        <app-card-container
          title="02. Comprehensive Pricing Components Breakdown"
          subtitle="Itemized commercial pricing elements under Spec 5.4 (Base price, area, premiums, parking, fees)"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Base Unit Price -->
            <app-custom-input
              label="Base Unit Price (BDT) *"
              type="number"
              placeholder="12000000"
              formControlName="base_unit_price"
              (ngModelChange)="onPriceComponentChange()"
            />

            <!-- Chargeable Area -->
            <app-custom-input
              label="Chargeable Area (Sq. Ft.) *"
              type="number"
              placeholder="1850"
              formControlName="chargeable_area_sqft"
              (ngModelChange)="onPriceComponentChange()"
            />

            <!-- Calculated Price Per Sq Ft -->
            <app-custom-input
              label="Price Per Sq. Ft. (BDT / sft)"
              type="number"
              placeholder="6500"
              formControlName="price_per_sqft"
              hint="Auto-computed from Base Price / Area"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <!-- Floor / Facing Premium -->
            <app-custom-input
              label="Floor / Facing Premium (BDT)"
              type="number"
              placeholder="0"
              formControlName="floor_facing_premium"
              hint="Corner, South-facing, or Top Floor premium"
              (ngModelChange)="onPriceComponentChange()"
            />

            <!-- Parking & Facility Charge -->
            <app-custom-input
              label="Parking & Facility Charge (BDT)"
              type="number"
              placeholder="350000"
              formControlName="parking_facility_charge"
              (ngModelChange)="onPriceComponentChange()"
            />

            <!-- Utility & Other Approved Fees -->
            <app-custom-input
              label="Utility & Other Approved Fees (BDT)"
              type="number"
              placeholder="300000"
              formControlName="utility_other_fees"
              (ngModelChange)="onPriceComponentChange()"
            />
          </div>

          <!-- Dynamic Pricing Summary Ribbon -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 mt-4 bg-secondary/40 rounded-xl border border-border text-center">
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Gross Catalog List Price</span>
              <span class="text-lg font-bold font-mono text-foreground">BDT {{ getGrossListPrice() | number:'1.0-0' }}</span>
              <span class="text-[11px] text-muted-foreground block">Base + Premiums + Parking + Fees</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Requested Concession</span>
              <span class="text-lg font-bold font-mono text-amber-500">
                -BDT {{ (proposalForm.get('requested_discount_amount')?.value || 0) | number:'1.0-0' }} ({{ getDiscountPercentage() }}%)
              </span>
              <span class="text-[11px] text-muted-foreground block">On Base Price</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block uppercase font-medium">Proposed Contractual Price</span>
              <span class="text-xl font-bold font-mono text-primary">BDT {{ getProposedFinalPrice() | number:'1.0-0' }}</span>
              <span class="text-[11px] text-muted-foreground block">Net proposed commercial value</span>
            </div>
          </div>

          <!-- Requested Discount Concession & Delegation Tier Indicator -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-center">
            <app-custom-input
              label="Requested Discount Concession Amount (BDT) *"
              type="number"
              placeholder="0"
              formControlName="requested_discount_amount"
            />

            <div class="p-3.5 rounded-xl border border-border bg-card flex flex-col justify-center">
              <span class="text-xs text-muted-foreground block font-medium">Required Commercial Approval Tier</span>
              <div class="flex items-center gap-2 mt-1.5">
                <span class="text-xs px-2.5 py-0.5 rounded-full font-bold" [ngClass]="getEscalationTier().badgeClass">
                  {{ getEscalationTier().tier.replace('_', ' ') }}
                </span>
                <span class="text-xs text-muted-foreground">{{ getEscalationTier().description }}</span>
              </div>
            </div>
          </div>
        </app-card-container>

        <!-- Card 3: Commercial Justification & Supporting Documents (Spec 5.4 Controls) -->
        <app-card-container
          title="03. Commercial Justification & Audit Trail"
          subtitle="Mandatory business reasons and supporting documentation for commercial exception (Spec 5.4)"
        >
          <app-custom-textarea
            label="Commercial Justification & Business Reason *"
            placeholder="Detail buyer payment terms (e.g. 100% upfront lump sum, corporate volume deal, investor portfolio, VIP reference)..."
            formControlName="justification_reason"
            [rows]="4"
            hint="Required under Board Resolution commercial controls"
          />

          <div class="mt-4">
            <app-custom-input
              label="Supporting Document / Approval Request Reference URL"
              placeholder="e.g. https://storage.bengalre.com/approvals/memo_vip_2026.pdf"
              formControlName="supporting_document_url"
            />
          </div>
        </app-card-container>

        <!-- Bottom Actions -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <a
            routerLink="/sales/discounts"
            class="px-5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="proposalForm.invalid || isSubmitting()"
          >
            {{ isSubmitting() ? 'Submitting Proposal...' : 'Submit Commercial Proposal' }}
          </app-custom-button>
        </div>
      </form>
    </div>
  `
})
export class DiscountProposalFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private salesService = inject(SalesService);
  private projectService = inject(ProjectService);
  private inventoryService = inject(InventoryService);
  private crmService = inject(CrmService);

  isSubmitting = signal<boolean>(false);
  projects = signal<Project[]>([]);
  units = signal<Unit[]>([]);
  customers = signal<Customer[]>([]);

  proposalForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    unit_id: [null, Validators.required],
    customer_id: [null, Validators.required],
    submitted_by_rep_name: ['Tanvir Ahmed (Senior Sales Officer)', Validators.required],
    base_unit_price: [12000000, [Validators.required, Validators.min(100000)]],
    chargeable_area_sqft: [1850, [Validators.required, Validators.min(10)]],
    price_per_sqft: [6486],
    floor_facing_premium: [0, [Validators.min(0)]],
    parking_facility_charge: [350000, [Validators.min(0)]],
    utility_other_fees: [300000, [Validators.min(0)]],
    requested_discount_amount: [300000, [Validators.required, Validators.min(0)]],
    justification_reason: ['', [Validators.required, Validators.minLength(10)]],
    supporting_document_url: ['']
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  });

  unitOptions = computed(() => {
    return this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (Floor ${u.floor_number}) - BDT ${Number(u.total_unit_price || 0).toLocaleString()}`
    }));
  });

  customerOptions = computed(() => {
    return this.customers().map(c => ({
      value: c.id,
      label: `${c.full_name_en} (${c.customer_code})`
    }));
  });

  ngOnInit(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.crmService.getCustomers().subscribe(c => this.customers.set(c));
    this.inventoryService.getUnits().subscribe(u => this.units.set(u));
  }

  onProjectChange(selected: any): void {
    if (selected?.value) {
      this.proposalForm.patchValue({ project_id: selected.value });
    }
  }

  onUnitChange(selected: any): void {
    if (selected?.value) {
      const u = this.units().find(item => item.id === selected.value);
      if (u) {
        const base = Number(u.total_unit_price || 12000000);
        const area = Number(u.gross_saleable_area_sqft || 1850);
        const rate = area > 0 ? Math.round(base / area) : 0;
        this.proposalForm.patchValue({
          unit_id: selected.value,
          base_unit_price: base,
          chargeable_area_sqft: area,
          price_per_sqft: rate
        });
      }
    }
  }

  selectedUnit(): Unit | undefined {
    const unitId = this.proposalForm.get('unit_id')?.value;
    if (!unitId) return undefined;
    return this.units().find(u => u.id === Number(unitId));
  }

  onPriceComponentChange(): void {
    const base = Number(this.proposalForm.get('base_unit_price')?.value || 0);
    const area = Number(this.proposalForm.get('chargeable_area_sqft')?.value || 0);
    if (base > 0 && area > 0) {
      this.proposalForm.patchValue({ price_per_sqft: Math.round(base / area) }, { emitEvent: false });
    }
  }

  getGrossListPrice(): number {
    const base = Number(this.proposalForm.get('base_unit_price')?.value || 0);
    const floor = Number(this.proposalForm.get('floor_facing_premium')?.value || 0);
    const parking = Number(this.proposalForm.get('parking_facility_charge')?.value || 0);
    const utility = Number(this.proposalForm.get('utility_other_fees')?.value || 0);
    return base + floor + parking + utility;
  }

  getDiscountPercentage(): number {
    const base = Number(this.proposalForm.get('base_unit_price')?.value || 0);
    const discount = Number(this.proposalForm.get('requested_discount_amount')?.value || 0);
    if (base <= 0 || discount <= 0) return 0;
    return Number(((discount / base) * 100).toFixed(2));
  }

  getProposedFinalPrice(): number {
    const gross = this.getGrossListPrice();
    const discount = Number(this.proposalForm.get('requested_discount_amount')?.value || 0);
    return Math.max(0, gross - discount);
  }

  getEscalationTier(): { tier: string; badgeClass: string; description: string } {
    const pct = this.getDiscountPercentage();
    if (pct <= 0) {
      return { tier: 'NO_DISCOUNT', badgeClass: 'bg-secondary text-muted-foreground', description: 'Standard Catalog Pricing' };
    }
    if (pct <= 1.0) {
      return { tier: 'SALES_MANAGER', badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20', description: 'Within 1.0% - Sales Manager Authority' };
    }
    if (pct <= 3.0) {
      return { tier: 'SALES_MANAGER', badgeClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/20', description: '1.0% to 3.0% - Sales Manager Authorization Required' };
    }
    if (pct <= 7.0) {
      return { tier: 'HEAD_OF_SALES', badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20', description: '3.0% to 7.0% - Requires Head of Sales Approval' };
    }
    return { tier: 'MANAGING_DIRECTOR', badgeClass: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold', description: '> 7.0% - Mandatory Managing Director (MD) Clearance' };
  }

  submitProposal(): void {
    if (this.proposalForm.invalid) return;
    this.isSubmitting.set(true);

    this.salesService.createDiscountProposal(this.proposalForm.value).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/sales/discounts', res.id]);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Proposal submission failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
