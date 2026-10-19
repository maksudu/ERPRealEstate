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
import { Customer, Lead, FollowUpTask } from '../../../core/models/crm.model';

@Component({
  selector: 'app-task-form',
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
  templateUrl: './task-form.component.html'
})
export class TaskFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Spec 4.8 & Rule 1)
  readonly LOOKUP = {
    taskCategory: 'CRM_TASK_CATEGORY',
    taskPriority: 'CRM_TASK_PRIORITY',
    taskStatus: 'CRM_TASK_STATUS'
  };

  taskId = signal<number | null>(null);
  isEditMode = computed(() => this.taskId() !== null);
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

  taskForm: FormGroup = this.fb.group({
    target_type: ['lead'],
    lead_id: [null],
    customer_id: [null],
    title: ['', Validators.required],
    description: [''],
    task_category: ['GENERAL_FOLLOW_UP', Validators.required],
    priority: ['MEDIUM', Validators.required],
    due_date: ['', Validators.required],
    reminder_channel: ['IN_APP'],
    status: ['PENDING'],
    consent_checked: [true]
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadLeads();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.taskId.set(Number(idParam));
      this.loadTask(Number(idParam));
    }

    const qp = this.route.snapshot.queryParams;
    if (qp['lead_id']) {
      this.targetType.set('lead');
      this.taskForm.patchValue({ target_type: 'lead', lead_id: Number(qp['lead_id']) });
    } else if (qp['customer_id']) {
      this.targetType.set('customer');
      this.taskForm.patchValue({ target_type: 'customer', customer_id: Number(qp['customer_id']) });
    }
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

  loadTask(id: number): void {
    this.crmService.getTask(id).subscribe({
      next: task => {
        if (task.customer_id) {
          this.targetType.set('customer');
          this.taskForm.patchValue({ target_type: 'customer', customer_id: task.customer_id });
        } else {
          this.targetType.set('lead');
          this.taskForm.patchValue({ target_type: 'lead', lead_id: task.lead_id });
        }

        let dueStr = '';
        if (task.due_date) {
          dueStr = new Date(task.due_date).toISOString().slice(0, 16);
        }

        this.taskForm.patchValue({
          title: task.title,
          description: task.description,
          task_category: task.task_category,
          priority: task.priority,
          due_date: dueStr,
          reminder_channel: task.reminder_channel || 'IN_APP',
          status: task.status,
          consent_checked: task.consent_checked
        });
      },
      error: err => {
        console.error('Error loading task', err);
        this.errorMessage.set('Could not load task details.');
      }
    });
  }

  setTargetType(type: 'customer' | 'lead'): void {
    this.targetType.set(type);
    this.taskForm.patchValue({
      target_type: type,
      customer_id: type === 'customer' ? this.taskForm.get('customer_id')?.value : null,
      lead_id: type === 'lead' ? this.taskForm.get('lead_id')?.value : null
    });
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.taskForm.value;
    const isCustomer = this.targetType() === 'customer';

    const payload: Partial<FollowUpTask> = {
      lead_id: isCustomer ? null : (val.lead_id ? Number(val.lead_id) : null),
      customer_id: isCustomer ? (val.customer_id ? Number(val.customer_id) : null) : null,
      title: val.title,
      description: val.description,
      task_category: val.task_category,
      priority: val.priority,
      due_date: val.due_date,
      reminder_channel: val.reminder_channel,
      status: val.status || 'PENDING',
      consent_checked: Boolean(val.consent_checked)
    };

    if (this.isEditMode()) {
      this.crmService.updateTask(this.taskId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/tasks']);
        },
        error: err => {
          console.error('Error updating task', err);
          this.errorMessage.set(err?.error?.detail || 'Failed to update follow-up task.');
          this.isSubmitting.set(false);
        }
      });
    } else {
      this.crmService.createTask(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/tasks']);
        },
        error: err => {
          console.error('Error creating task', err);
          this.errorMessage.set(err?.error?.detail || 'Failed to create follow-up task.');
          this.isSubmitting.set(false);
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/crm/tasks']);
  }
}
