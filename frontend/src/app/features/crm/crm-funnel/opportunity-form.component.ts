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
import { Customer, Lead, OpportunityCreate } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-opportunity-form',
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
  templateUrl: './opportunity-form.component.html'
})
export class OpportunityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Spec 4.11 & Rule 1)
  readonly LOOKUP = {
    funnelStage: 'CRM_FUNNEL_STAGE'
  };

  oppId = signal<number | null>(null);
  isEditMode = computed(() => this.oppId() !== null);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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

  oppForm: FormGroup = this.fb.group({
    title: ['', Validators.required],
    lead_id: [null],
    customer_id: [null],
    project_id: [null],
    unit_id: [null],
    unit_number: [''],
    stage: ['03_QUALIFIED', Validators.required],
    estimated_deal_value: [0, [Validators.required, Validators.min(1000)]],
    confidence_probability_pct: [50, [Validators.required, Validators.min(0), Validators.max(100)]],
    expected_close_date: [''],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadLeads();
    this.loadProjects();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.oppId.set(Number(idParam));
      this.loadOpportunity(Number(idParam));
    }
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

  loadOpportunity(id: number): void {
    this.crmService.getOpportunity(id).subscribe({
      next: (o) => {
        this.oppForm.patchValue({
          title: o.title,
          lead_id: o.lead_id,
          customer_id: o.customer_id,
          project_id: o.project_id,
          unit_id: o.unit_id,
          unit_number: o.unit_number || '',
          stage: o.stage,
          estimated_deal_value: o.estimated_deal_value,
          confidence_probability_pct: o.confidence_probability_pct,
          expected_close_date: o.expected_close_date,
          notes: o.notes
        });
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load opportunity');
      }
    });
  }

  onSubmit(): void {
    if (this.oppForm.invalid) {
      this.oppForm.markAllAsTouched();
      this.errorMessage.set('Please fill out the deal title, stage, and estimated deal value.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const formVal = this.oppForm.value;

    const payload: OpportunityCreate = {
      title: formVal.title,
      lead_id: formVal.lead_id ? Number(formVal.lead_id) : null,
      customer_id: formVal.customer_id ? Number(formVal.customer_id) : null,
      project_id: formVal.project_id ? Number(formVal.project_id) : null,
      unit_id: formVal.unit_id ? Number(formVal.unit_id) : null,
      stage: formVal.stage,
      estimated_deal_value: Number(formVal.estimated_deal_value),
      confidence_probability_pct: Number(formVal.confidence_probability_pct),
      expected_close_date: formVal.expected_close_date || null,
      notes: formVal.notes || null
    };

    if (this.isEditMode()) {
      this.crmService.updateOpportunity(this.oppId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/funnel']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update opportunity');
        }
      });
    } else {
      this.crmService.createOpportunity(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/funnel']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create opportunity');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/crm/funnel']);
  }
}
