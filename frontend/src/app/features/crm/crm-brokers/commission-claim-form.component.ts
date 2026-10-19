import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Broker, Customer, Lead, CommissionClaimCreate } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-commission-claim-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './commission-claim-form.component.html'
})
export class CommissionClaimFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Spec 4.10 & Rule 1)
  readonly LOOKUP = {
    commissionMilestone: 'CRM_COMMISSION_MILESTONE',
    claimStatus: 'CRM_COMMISSION_CLAIM_STATUS'
  };

  claimId = signal<number | null>(null);
  isEditMode = computed(() => this.claimId() !== null);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Active Brokers Options
  brokers = signal<Broker[]>([]);
  brokerOptions = computed(() =>
    this.brokers().map(b => ({
      label: `${b.broker_name} (${b.broker_code}) - ${b.commission_rate}%`,
      value: b.id
    }))
  );

  // Customers & Leads
  customers = signal<Customer[]>([]);
  customerOptions = computed(() =>
    this.customers().map(c => ({
      label: `${c.full_name_en} (${c.customer_code} - ${c.primary_phone})`,
      value: c.id
    }))
  );

  leads = signal<Lead[]>([]);
  leadOptions = computed(() =>
    this.leads().map(l => ({
      label: `${l.lead_name} (${l.primary_phone})`,
      value: l.id
    }))
  );

  // Projects
  projects = signal<Project[]>([]);
  projectOptions = computed(() =>
    this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      value: p.id
    }))
  );

  // Computed Financials
  grossCommission = signal<number>(0);
  taxTds = signal<number>(0);
  netPayable = signal<number>(0);

  claimForm: FormGroup = this.fb.group({
    broker_id: [null, Validators.required],
    attribution_type: ['customer'],
    customer_id: [null],
    lead_id: [null],
    project_id: [null],
    unit_id: [null],
    unit_number: [''],

    referral_date: [new Date().toISOString().substring(0, 10), Validators.required],
    source_evidence: [''],

    unit_sale_value: [0, [Validators.required, Validators.min(1000)]],
    commission_rate_percentage: [1.5, [Validators.required, Validators.min(0)]],
    calculated_commission_amount: [0],
    tds_tax_deduction_amount: [0],
    net_payable_amount: [0],

    milestone_achieved: ['BOOKING_CONFIRMED', Validators.required],
    claim_status: ['DRAFT'],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadBrokers();
    this.loadCustomers();
    this.loadLeads();
    this.loadProjects();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.claimId.set(Number(idParam));
      this.loadClaim(Number(idParam));
    }

    // Auto-update commission rate when broker changes
    this.claimForm.get('broker_id')?.valueChanges.subscribe(brokerId => {
      if (brokerId) {
        const found = this.brokers().find(b => b.id === Number(brokerId));
        if (found) {
          this.claimForm.patchValue({
            commission_rate_percentage: found.commission_rate || 1.5,
            milestone_achieved: found.required_milestone || 'BOOKING_CONFIRMED'
          }, { emitEvent: false });
          this.recalculateFinancials();
        }
      }
    });

    // Listen for financial field changes
    this.claimForm.get('unit_sale_value')?.valueChanges.subscribe(() => this.recalculateFinancials());
    this.claimForm.get('commission_rate_percentage')?.valueChanges.subscribe(() => this.recalculateFinancials());
  }

  loadBrokers(): void {
    this.crmService.getBrokers({ limit: 100, status: 'ACTIVE' }).subscribe({
      next: (res) => this.brokers.set(res.items),
      error: (err) => console.error('Failed to load brokers', err)
    });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res) => this.customers.set(res || []),
      error: (err) => console.error('Failed to load customers', err)
    });
  }

  loadLeads(): void {
    this.crmService.getLeads().subscribe({
      next: (res) => this.leads.set(res || []),
      error: (err) => console.error('Failed to load leads', err)
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadClaim(id: number): void {
    this.crmService.getCommissionClaim(id).subscribe({
      next: (c) => {
        this.claimForm.patchValue({
          broker_id: c.broker_id,
          customer_id: c.customer_id,
          lead_id: c.lead_id,
          project_id: c.project_id,
          unit_id: c.unit_id,
          referral_date: c.referral_date,
          source_evidence: c.source_evidence,
          unit_sale_value: c.unit_sale_value,
          commission_rate_percentage: c.commission_rate_percentage,
          calculated_commission_amount: c.calculated_commission_amount,
          tds_tax_deduction_amount: c.tds_tax_deduction_amount,
          net_payable_amount: c.net_payable_amount,
          milestone_achieved: c.milestone_achieved,
          claim_status: c.claim_status,
          notes: c.notes
        });
        this.recalculateFinancials();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load claim');
      }
    });
  }

  recalculateFinancials(): void {
    const saleValue = Number(this.claimForm.get('unit_sale_value')?.value) || 0;
    const rate = Number(this.claimForm.get('commission_rate_percentage')?.value) || 0;

    const gross = (saleValue * rate) / 100.0;
    const tds = gross * 0.10; // 10% AIT Tax deduction at source (BD Tax Law)
    const net = gross - tds;

    this.grossCommission.set(gross);
    this.taxTds.set(tds);
    this.netPayable.set(net);

    this.claimForm.patchValue({
      calculated_commission_amount: gross,
      tds_tax_deduction_amount: tds,
      net_payable_amount: net
    }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.claimForm.invalid) {
      this.claimForm.markAllAsTouched();
      this.errorMessage.set('Please select the broker and enter the deal sale value');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const formVal = this.claimForm.value;

    const payload: CommissionClaimCreate = {
      broker_id: Number(formVal.broker_id),
      lead_id: formVal.lead_id ? Number(formVal.lead_id) : null,
      customer_id: formVal.customer_id ? Number(formVal.customer_id) : null,
      project_id: formVal.project_id ? Number(formVal.project_id) : null,
      unit_id: formVal.unit_id ? Number(formVal.unit_id) : null,
      referral_date: formVal.referral_date,
      source_evidence: formVal.source_evidence || null,
      unit_sale_value: Number(formVal.unit_sale_value),
      commission_rate_percentage: Number(formVal.commission_rate_percentage),
      calculated_commission_amount: this.grossCommission(),
      tds_tax_deduction_amount: this.taxTds(),
      net_payable_amount: this.netPayable(),
      milestone_achieved: formVal.milestone_achieved,
      claim_status: 'DRAFT',
      notes: formVal.notes || null
    };

    if (this.isEditMode()) {
      this.crmService.updateCommissionClaim(this.claimId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/brokers']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update commission claim');
        }
      });
    } else {
      this.crmService.createCommissionClaim(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/brokers']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to record commission claim');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/crm/brokers']);
  }

  formatBdt(amount: number): string {
    if (!amount) return '৳ 0';
    return '৳ ' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }
}
