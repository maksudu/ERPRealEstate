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
import { Broker, BrokerCreate } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-broker-form',
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
  templateUrl: './broker-form.component.html'
})
export class BrokerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Spec 4.10 & Rule 1)
  readonly LOOKUP = {
    brokerType: 'CRM_BROKER_TYPE',
    brokerStatus: 'CRM_BROKER_STATUS',
    commissionType: 'CRM_COMMISSION_TYPE',
    commissionMilestone: 'CRM_COMMISSION_MILESTONE'
  };

  brokerId = signal<number | null>(null);
  isEditMode = computed(() => this.brokerId() !== null);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Projects list
  projects = signal<Project[]>([]);
  projectOptions = computed(() =>
    this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      value: p.id
    }))
  );

  brokerForm: FormGroup = this.fb.group({
    broker_name: ['', Validators.required],
    broker_type: ['COMPANY', Validators.required],
    contact_person: [''],
    primary_phone: ['', Validators.required],
    secondary_phone: [''],
    email: [''],
    office_address: [''],
    service_area: [''],
    preferred_projects_json: [''],

    referral_code: [''],
    referral_link: [''],

    license_number: [''],
    tin_number: [''],
    bin_vat_number: [''],
    agreement_number: [''],
    agreement_signed_date: [''],
    agreement_valid_from: [''],
    agreement_valid_to: [''],

    commission_type: ['PERCENTAGE', Validators.required],
    commission_rate: [1.5, [Validators.required, Validators.min(0)]],
    eligibility_conditions: ['Commission payable upon down payment realization. Requires signed customer agreement.'],
    required_milestone: ['DOWN_PAYMENT_CLEARED', Validators.required],

    bank_name: [''],
    bank_branch: [''],
    bank_account_name: [''],
    bank_account_number: [''],
    routing_number: [''],
    mobile_wallet_number: [''],

    trade_license_url: [''],
    tin_cert_url: [''],
    agreement_doc_url: [''],
    status: ['ACTIVE', Validators.required]
  });

  ngOnInit(): void {
    this.loadProjects();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.brokerId.set(Number(idParam));
      this.loadBroker(Number(idParam));
    } else {
      // Auto-generate a proposed referral code
      this.generateReferralCode();
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadBroker(id: number): void {
    this.crmService.getBroker(id).subscribe({
      next: (b) => {
        this.brokerForm.patchValue({
          broker_name: b.broker_name,
          broker_type: b.broker_type,
          contact_person: b.contact_person,
          primary_phone: b.primary_phone,
          secondary_phone: b.secondary_phone,
          email: b.email,
          office_address: b.office_address,
          service_area: b.service_area,
          preferred_projects_json: b.preferred_projects_json,
          referral_code: b.referral_code,
          referral_link: b.referral_link,
          license_number: b.license_number,
          tin_number: b.tin_number,
          bin_vat_number: b.bin_vat_number,
          agreement_number: b.agreement_number,
          agreement_signed_date: b.agreement_signed_date,
          agreement_valid_from: b.agreement_valid_from,
          agreement_valid_to: b.agreement_valid_to,
          commission_type: b.commission_type,
          commission_rate: b.commission_rate,
          eligibility_conditions: b.eligibility_conditions,
          required_milestone: b.required_milestone,
          bank_name: b.bank_name,
          bank_branch: b.bank_branch,
          bank_account_name: b.bank_account_name,
          bank_account_number: b.bank_account_number,
          routing_number: b.routing_number,
          mobile_wallet_number: b.mobile_wallet_number,
          trade_license_url: b.trade_license_url,
          tin_cert_url: b.tin_cert_url,
          agreement_doc_url: b.agreement_doc_url,
          status: b.status
        });
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load broker details');
      }
    });
  }

  generateReferralCode(): void {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `REF-${randomSuffix}`;
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/leads/register?ref=${code}`;
    this.brokerForm.patchValue({
      referral_code: code,
      referral_link: link
    });
  }

  onSubmit(): void {
    if (this.brokerForm.invalid) {
      this.brokerForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields marked with *');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    const formVal = this.brokerForm.value;

    const payload: BrokerCreate = {
      broker_name: formVal.broker_name,
      broker_type: formVal.broker_type,
      contact_person: formVal.contact_person || null,
      primary_phone: formVal.primary_phone,
      secondary_phone: formVal.secondary_phone || null,
      email: formVal.email || null,
      office_address: formVal.office_address || null,
      service_area: formVal.service_area || null,
      preferred_projects_json: formVal.preferred_projects_json || null,
      referral_code: formVal.referral_code || null,
      referral_link: formVal.referral_link || null,
      license_number: formVal.license_number || null,
      tin_number: formVal.tin_number || null,
      bin_vat_number: formVal.bin_vat_number || null,
      agreement_number: formVal.agreement_number || null,
      agreement_signed_date: formVal.agreement_signed_date || null,
      agreement_valid_from: formVal.agreement_valid_from || null,
      agreement_valid_to: formVal.agreement_valid_to || null,
      commission_type: formVal.commission_type,
      commission_rate: Number(formVal.commission_rate),
      eligibility_conditions: formVal.eligibility_conditions || null,
      required_milestone: formVal.required_milestone,
      bank_name: formVal.bank_name || null,
      bank_branch: formVal.bank_branch || null,
      bank_account_name: formVal.bank_account_name || null,
      bank_account_number: formVal.bank_account_number || null,
      routing_number: formVal.routing_number || null,
      mobile_wallet_number: formVal.mobile_wallet_number || null,
      trade_license_url: formVal.trade_license_url || null,
      tin_cert_url: formVal.tin_cert_url || null,
      agreement_doc_url: formVal.agreement_doc_url || null,
      status: formVal.status
    };

    if (this.isEditMode()) {
      this.crmService.updateBroker(this.brokerId()!, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/brokers']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update broker');
        }
      });
    } else {
      this.crmService.createBroker(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/brokers']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create broker');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/crm/brokers']);
  }
}
