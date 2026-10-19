import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Customer, Lead, Opportunity, BookingHandoverCreate } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-booking-handover-form',
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
  templateUrl: './booking-handover-form.component.html'
})
export class BookingHandoverFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Opportunities
  opportunities = signal<Opportunity[]>([]);
  opportunityOptions = computed(() =>
    this.opportunities().map(o => ({
      label: `${o.opportunity_code} - ${o.title} (Val: ৳${(o.estimated_deal_value || 0).toLocaleString()})`,
      value: o.id
    }))
  );

  // Customers
  customers = signal<Customer[]>([]);
  customerOptions = computed(() =>
    this.customers().map(c => ({
      label: `${c.full_name_en} (${c.customer_code} - ${c.primary_phone})`,
      value: c.id
    }))
  );

  // Leads
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

  paymentPlanOptions = [
    { label: 'Equal Monthly Installments (EMI - 48 Months)', value: 'EMI_48M' },
    { label: 'Construction Linked Plan (CLP Milestone-Based)', value: 'CLP_MILESTONES' },
    { label: 'Down Payment (30%) + Bank Home Loan (70%)', value: 'DOWN_PAYMENT_BANK_LOAN' },
    { label: 'Custom Corporate / Lump Sum Schedule', value: 'CUSTOM_SCHEDULE' }
  ];

  handoverForm: FormGroup = this.fb.group({
    opportunity_id: [null],
    lead_id: [null],
    customer_id: [null],
    project_id: [null],
    agreed_price: [0, [Validators.required, Validators.min(1000)]],
    booking_money_amount: [0, [Validators.required, Validators.min(100)]],
    payment_plan_preference: ['CLP_MILESTONES', Validators.required],
    special_conditions: [''],
    handover_notes: ['']
  });

  ngOnInit(): void {
    this.loadOpportunities();
    this.loadCustomers();
    this.loadLeads();
    this.loadProjects();

    // Listen for opportunity selection to auto-populate related fields
    this.handoverForm.get('opportunity_id')?.valueChanges.subscribe(oppId => {
      if (oppId) {
        const found = this.opportunities().find(o => o.id === Number(oppId));
        if (found) {
          if (found.customer_id && !this.handoverForm.get('customer_id')?.value) {
            this.handoverForm.patchValue({ customer_id: found.customer_id });
          }
          if (found.lead_id && !this.handoverForm.get('lead_id')?.value) {
            this.handoverForm.patchValue({ lead_id: found.lead_id });
          }
          if (found.project_id && !this.handoverForm.get('project_id')?.value) {
            this.handoverForm.patchValue({ project_id: found.project_id });
          }
          if (found.estimated_deal_value && Number(this.handoverForm.get('agreed_price')?.value) === 0) {
            this.handoverForm.patchValue({ agreed_price: found.estimated_deal_value });
          }
        }
      }
    });
  }

  loadOpportunities(): void {
    this.crmService.getOpportunities({ limit: 100 }).subscribe({
      next: (res) => {
        this.opportunities.set(res.items || []);
      },
      error: () => {}
    });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res) => {
        this.customers.set(res || []);
      },
      error: () => {}
    });
  }

  loadLeads(): void {
    this.crmService.getLeads().subscribe({
      next: (res) => {
        this.leads.set(res || []);
      },
      error: () => {}
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.projects.set(res || []);
      },
      error: () => {}
    });
  }

  onSubmit(): void {
    if (this.handoverForm.invalid) {
      this.handoverForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const formVal = this.handoverForm.value;
    const payload: BookingHandoverCreate = {
      opportunity_id: formVal.opportunity_id ? Number(formVal.opportunity_id) : undefined,
      lead_id: formVal.lead_id ? Number(formVal.lead_id) : undefined,
      customer_id: formVal.customer_id ? Number(formVal.customer_id) : undefined,
      project_id: formVal.project_id ? Number(formVal.project_id) : undefined,
      agreed_price: Number(formVal.agreed_price),
      booking_money_amount: Number(formVal.booking_money_amount),
      payment_plan_preference: formVal.payment_plan_preference,
      special_conditions: formVal.special_conditions || '',
      handover_notes: formVal.handover_notes || ''
    };

    this.crmService.createBookingHandover(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/crm/funnel'], { queryParams: { tab: 'handovers' } });
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to submit booking handover record.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/crm/funnel'], { queryParams: { tab: 'handovers' } });
  }
}
