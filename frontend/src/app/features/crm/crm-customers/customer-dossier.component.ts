import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { Customer, Nominee, CustomerServiceRequest } from '../../../core/models/crm.model';

@Component({
  selector: 'app-customer-dossier',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './customer-dossier.component.html'
})
export class CustomerDossierComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  customerId: number | null = null;
  customer = signal<Customer | null>(null);
  serviceRequests = signal<CustomerServiceRequest[]>([]);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  nomineeModalOpen = signal(false);
  editingNominee = signal<Nominee | null>(null);

  serviceModalOpen = signal(false);
  editingService = signal<CustomerServiceRequest | null>(null);

  readonly LOOKUP = {
    nomineeRelation: 'CRM_NOMINEE_RELATION',
    nomineeVerification: 'CRM_NOMINEE_VERIFICATION',
    serviceStatus: 'CRM_SERVICE_STATUS',
    servicePriority: 'CRM_SERVICE_PRIORITY'
  };

  nomineeForm: FormGroup = this.fb.group({
    nominee_name: ['', Validators.required],
    relationship: ['SPOUSE', Validators.required],
    nid_number: [''],
    share_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
    verification_status: ['PENDING'],
    notes: ['']
  });

  serviceForm: FormGroup = this.fb.group({
    request_type: ['SERVICE', Validators.required],
    title: ['', Validators.required],
    description: [''],
    status: ['OPEN', Validators.required],
    priority: ['MEDIUM'],
    resolution_notes: ['']
  });

  nomineeShareTotal = computed(() => {
    const c = this.customer();
    return (c?.nominees || []).reduce((s, n) => s + (Number(n.share_percentage) || 0), 0);
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.customerId = id;
      this.load();
    }
  }

  load(): void {
    if (!this.customerId) return;
    this.isLoading.set(true);
    this.crmService.getCustomer(this.customerId).subscribe({
      next: (c) => {
        this.customer.set(c);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load customer dossier.');
        this.isLoading.set(false);
      }
    });
    this.crmService.getServiceRequests(this.customerId!, { limit: 50 }).subscribe({
      next: (res) => this.serviceRequests.set(res.items || [])
    });
  }

  edit(): void {
    if (this.customerId) this.router.navigate(['/crm/customers', this.customerId, 'edit']);
  }

  goToRequirements(): void {
    if (this.customerId) this.router.navigate(['/crm/requirements'], { queryParams: { customer_id: this.customerId } });
  }

  back(): void {
    this.router.navigate(['/crm/customers']);
  }

  // --- Nominees ---
  openNomineeModal(n?: Nominee): void {
    this.editingNominee.set(n || null);
    this.nomineeForm.patchValue({
      nominee_name: n?.nominee_name || '',
      relationship: n?.relationship || 'SPOUSE',
      nid_number: n?.nid_number || '',
      share_percentage: n?.share_percentage ?? 100,
      phone: n?.phone || '',
      email: n?.email || '',
      address: n?.address || '',
      verification_status: n?.verification_status || 'PENDING',
      notes: n?.notes || ''
    });
    this.nomineeModalOpen.set(true);
  }

  saveNominee(): void {
    if (this.nomineeForm.invalid || !this.customerId) {
      this.nomineeForm.markAllAsTouched();
      return;
    }
    const v = this.nomineeForm.value;
    const existing = this.editingNominee();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload: any = {
      nominee_name: v.nominee_name,
      relationship: v.relationship,
      nid_number: v.nid_number || null,
      share_percentage: Number(v.share_percentage),
      phone: v.phone || null,
      email: v.email || null,
      address: v.address || null,
      verification_status: v.verification_status || 'PENDING',
      notes: v.notes || null
    };

    const req$ = existing?.id
      ? this.crmService.updateNominee(this.customerId!, existing.id, payload)
      : this.crmService.addNominee(this.customerId!, payload);

    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.nomineeModalOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Nominee save failed.');
      }
    });
  }

  deleteNominee(n: Nominee): void {
    if (!n.id || !this.customerId) return;
    if (!confirm(`Delete nominee ${n.nominee_name}?`)) return;
    this.crmService.deleteNominee(this.customerId, n.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Delete failed.')
    });
  }

  // --- Service Requests ---
  openServiceModal(sr?: CustomerServiceRequest): void {
    this.editingService.set(sr || null);
    this.serviceForm.patchValue({
      request_type: sr?.request_type || 'SERVICE',
      title: sr?.title || '',
      description: sr?.description || '',
      status: sr?.status || 'OPEN',
      priority: sr?.priority || 'MEDIUM',
      resolution_notes: sr?.resolution_notes || ''
    });
    this.serviceModalOpen.set(true);
  }

  saveServiceRequest(): void {
    if (this.serviceForm.invalid || !this.customerId) {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const v = this.serviceForm.value;
    const existing = this.editingService();
    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload: any = {
      request_type: v.request_type,
      title: v.title,
      description: v.description || null,
      status: v.status,
      priority: v.priority || 'MEDIUM',
      resolution_notes: v.resolution_notes || null
    };

    const req$ = existing?.id
      ? this.crmService.updateServiceRequest(existing.id, payload)
      : this.crmService.createServiceRequest(this.customerId!, payload);

    req$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.serviceModalOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.detail || 'Service request save failed.');
      }
    });
  }

  deleteServiceRequest(sr: CustomerServiceRequest): void {
    if (!confirm(`Delete service request "${sr.title}"?`)) return;
    this.crmService.deleteServiceRequest(sr.id).subscribe({
      next: () => this.load(),
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Delete failed.')
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'OPEN': return 'bg-blue-500/10 text-blue-600 border border-blue-500/30';
      case 'IN_PROGRESS': return 'bg-amber-500/10 text-amber-600 border border-amber-500/30';
      case 'WAITING_CUSTOMER': return 'bg-purple-500/10 text-purple-600 border border-purple-500/30';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30';
      case 'CLOSED': return 'bg-slate-500/10 text-slate-600 border border-slate-500/30';
      default: return 'bg-slate-500/10 text-slate-600 border border-slate-500/30';
    }
  }
}
