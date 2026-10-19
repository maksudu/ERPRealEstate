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
import { Customer, Lead, LeadActivity } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-activity-form',
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
  templateUrl: './activity-form.component.html'
})
export class ActivityFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Spec 4.7 & Rule 1)
  readonly LOOKUP = {
    activityType: 'CRM_ACTIVITY_TYPE',
    activityStatus: 'CRM_ACTIVITY_STATUS'
  };

  activityId = signal<number | null>(null);
  isEditMode = computed(() => this.activityId() !== null);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  targetType = signal<'customer' | 'lead'>('lead');

  // Customer & Lead Options
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

  // Project Options
  projects = signal<Project[]>([]);
  projectOptions = computed(() =>
    this.projects().map(p => ({ label: p.project_name, value: p.id }))
  );

  activityForm: FormGroup = this.fb.group({
    target_type: ['lead'],
    lead_id: [null],
    customer_id: [null],
    activity_type: ['FOLLOW_UP_CALL', Validators.required],
    title: ['', Validators.required],
    activity_summary: ['', Validators.required],
    project_id: [null],
    unit_id: [null],
    sales_rep_id: [null],
    scheduled_start: ['', Validators.required],
    duration_minutes: [30, [Validators.required, Validators.min(5)]],
    meeting_location: [''],
    agenda: [''],
    status: ['PLANNED'],
    reminder_minutes_before: [30],
    check_conflict: [true]
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadCustomers();
    this.loadLeads();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.activityId.set(Number(idParam));
      this.loadActivity(Number(idParam));
    }

    // Pre-populate if queryParams lead_id or customer_id passed
    const qp = this.route.snapshot.queryParams;
    if (qp['lead_id']) {
      this.targetType.set('lead');
      this.activityForm.patchValue({ target_type: 'lead', lead_id: Number(qp['lead_id']) });
    } else if (qp['customer_id']) {
      this.targetType.set('customer');
      this.activityForm.patchValue({ target_type: 'customer', customer_id: Number(qp['customer_id']) });
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => this.projects.set(res?.items || res || []),
      error: err => console.error('Error loading projects', err)
    });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res: Customer[]) => this.customers.set(res || []),
      error: err => console.error('Error loading customers', err)
    });
  }

  loadLeads(): void {
    this.crmService.getLeads().subscribe({
      next: (res: Lead[]) => this.leads.set(res || []),
      error: err => console.error('Error loading leads', err)
    });
  }

  loadActivity(id: number): void {
    this.crmService.getActivity(id).subscribe({
      next: act => {
        if (act.customer_id) {
          this.targetType.set('customer');
          this.activityForm.patchValue({ target_type: 'customer', customer_id: act.customer_id });
        } else {
          this.targetType.set('lead');
          this.activityForm.patchValue({ target_type: 'lead', lead_id: act.lead_id });
        }

        // Format datetime-local string
        let startStr = '';
        if (act.scheduled_start) {
          startStr = new Date(act.scheduled_start).toISOString().slice(0, 16);
        }

        this.activityForm.patchValue({
          activity_type: act.activity_type,
          title: act.title,
          activity_summary: act.activity_summary,
          project_id: act.project_id,
          unit_id: act.unit_id,
          sales_rep_id: act.sales_rep_id,
          scheduled_start: startStr,
          duration_minutes: act.duration_minutes || 30,
          meeting_location: act.meeting_location,
          agenda: act.agenda,
          status: act.status,
          reminder_minutes_before: act.reminder_minutes_before || 30
        });
      },
      error: err => {
        console.error('Error loading activity', err);
        this.errorMessage.set('Could not load activity details.');
      }
    });
  }

  setTargetType(type: 'customer' | 'lead'): void {
    this.targetType.set(type);
    this.activityForm.patchValue({
      target_type: type,
      customer_id: type === 'customer' ? this.activityForm.get('customer_id')?.value : null,
      lead_id: type === 'lead' ? this.activityForm.get('lead_id')?.value : null
    });
  }

  onSubmit(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.activityForm.value;
    const isCustomer = this.targetType() === 'customer';

    const payload: Partial<LeadActivity> = {
      lead_id: isCustomer ? null : (val.lead_id ? Number(val.lead_id) : null),
      customer_id: isCustomer ? (val.customer_id ? Number(val.customer_id) : null) : null,
      activity_type: val.activity_type,
      title: val.title,
      activity_summary: val.activity_summary,
      project_id: val.project_id ? Number(val.project_id) : null,
      unit_id: val.unit_id ? Number(val.unit_id) : null,
      sales_rep_id: val.sales_rep_id ? Number(val.sales_rep_id) : null,
      scheduled_start: val.scheduled_start,
      duration_minutes: Number(val.duration_minutes),
      meeting_location: val.meeting_location,
      agenda: val.agenda,
      status: val.status || 'PLANNED',
      reminder_minutes_before: Number(val.reminder_minutes_before) || 30
    };

    const checkConflict = Boolean(val.check_conflict);

    if (this.isEditMode()) {
      this.crmService.updateActivity(this.activityId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/activities']);
        },
        error: err => {
          console.error('Error updating activity', err);
          this.errorMessage.set(err?.error?.detail || 'Failed to update activity.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.crmService.createActivity(payload, checkConflict).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/activities']);
        },
        error: err => {
          console.error('Error scheduling activity', err);
          this.errorMessage.set(err?.error?.detail || 'Failed to schedule interaction.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/crm/activities']);
  }
}
