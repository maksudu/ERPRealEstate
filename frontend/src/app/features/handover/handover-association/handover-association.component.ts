import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { OwnersAssociation, LeaseAgreement } from '../../../core/models/handover.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-handover-association',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './handover-association.component.html'
})
export class HandoverAssociationComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private fb = inject(FormBuilder);

  associations = signal<OwnersAssociation[]>([]);
  leases = signal<LeaseAgreement[]>([]);
  activeTab = signal<'associations' | 'leases'>('associations');

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isAssocModalOpen = signal<boolean>(false);
  isLeaseModalOpen = signal<boolean>(false);

  assocForm: FormGroup = this.fb.group({
    project_id: [1, [Validators.required, Validators.min(1)]],
    association_name: ['', Validators.required],
    handover_date: [new Date().toISOString().split('T')[0], Validators.required],
    sinking_fund_transferred_bdt: [500000, [Validators.required, Validators.min(0)]],
    monthly_service_charge_per_flat: [3500, [Validators.required, Validators.min(100)]],
    president_name: [''],
    secretary_name: [''],
    contact_phone: ['']
  });

  leaseForm: FormGroup = this.fb.group({
    unit_id: [1, [Validators.required, Validators.min(1)]],
    tenant_name: ['', Validators.required],
    tenant_nid: ['', Validators.required],
    tenant_phone: [''],
    lease_start_date: [new Date().toISOString().split('T')[0], Validators.required],
    lease_expiry_date: [
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Validators.required
    ],
    monthly_rent_bdt: [45000, [Validators.required, Validators.min(1000)]],
    security_deposit_bdt: [150000, [Validators.required, Validators.min(0)]],
    rent_escalation_percent: [10.0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.handoverService.getAssociations().subscribe({
      next: (data) => {
        this.associations.set(data);
        this.handoverService.getLeases().subscribe({
          next: (leaseData) => {
            this.leases.set(leaseData);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false)
        });
      },
      error: () => this.isLoading.set(false)
    });
  }

  openAssocModal(): void {
    this.assocForm.reset({
      project_id: 1,
      association_name: 'Green View Flat Owners Welfare Society',
      handover_date: new Date().toISOString().split('T')[0],
      sinking_fund_transferred_bdt: 750000,
      monthly_service_charge_per_flat: 4000,
      president_name: 'Dr. Rafiqul Islam',
      secretary_name: 'Engr. Kamal Hossain',
      contact_phone: '+8801711223344'
    });
    this.isAssocModalOpen.set(true);
  }

  closeAssocModal(): void {
    this.isAssocModalOpen.set(false);
  }

  submitAssociation(): void {
    if (this.assocForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.assocForm.value;
    const payload = {
      project_id: Number(val.project_id),
      association_name: val.association_name,
      handover_date: val.handover_date,
      sinking_fund_transferred_bdt: Number(val.sinking_fund_transferred_bdt),
      monthly_service_charge_per_flat: Number(val.monthly_service_charge_per_flat),
      president_name: val.president_name,
      secretary_name: val.secretary_name,
      contact_phone: val.contact_phone
    };

    this.handoverService.createAssociation(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeAssocModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record association');
      }
    });
  }

  openLeaseModal(): void {
    this.leaseForm.reset({
      unit_id: 1,
      tenant_name: 'TechLogix Bangladesh Ltd',
      tenant_nid: '1989269123456789',
      tenant_phone: '+8801819556677',
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_rent_bdt: 60000,
      security_deposit_bdt: 180000,
      rent_escalation_percent: 10.0
    });
    this.isLeaseModalOpen.set(true);
  }

  closeLeaseModal(): void {
    this.isLeaseModalOpen.set(false);
  }

  submitLease(): void {
    if (this.leaseForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.leaseForm.value;
    const payload = {
      unit_id: Number(val.unit_id),
      tenant_name: val.tenant_name,
      tenant_nid: val.tenant_nid,
      tenant_phone: val.tenant_phone,
      lease_start_date: val.lease_start_date,
      lease_expiry_date: val.lease_expiry_date,
      monthly_rent_bdt: Number(val.monthly_rent_bdt),
      security_deposit_bdt: Number(val.security_deposit_bdt),
      rent_escalation_percent: Number(val.rent_escalation_percent)
    };

    this.handoverService.createLease(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeLeaseModal();
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record lease agreement');
      }
    });
  }
}
