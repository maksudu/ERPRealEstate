import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideAngularModule, Save, ArrowLeft, Plus, Trash2, AlertTriangle } from 'lucide-angular';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { Customer, Nominee } from '../../../core/models/crm.model';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    LucideAngularModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './customer-form.component.html'
})
export class CustomerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly Save = Save;
  readonly ArrowLeft = ArrowLeft;
  readonly Plus = Plus;
  readonly Trash2 = Trash2;
  readonly AlertTriangle = AlertTriangle;

  customerId: number | null = null;
  isEditMode = signal(false);
  isLoading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Duplicate check
  dupCheckResult = signal<{ is_duplicate: boolean; matching_customers: Customer[] } | null>(null);
  isCheckingDup = signal(false);

  readonly LOOKUP = {
    customerType: 'CRM_CUSTOMER_TYPE',
    language: 'CRM_LANGUAGE',
    contactMethod: 'CRM_CONTACT_METHOD',
    nomineeRelation: 'CRM_NOMINEE_RELATION'
  };

  form: FormGroup = this.fb.group({
    full_name_en: ['', Validators.required],
    full_name_bn: [''],
    father_husband_name: [''],
    mother_name: [''],
    nid_number: ['', [Validators.pattern(/^[0-9]{10,17}$/)]],
    tin_number: [''],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    secondary_phone: [''],
    email: ['', [Validators.email]],
    present_address: [''],
    permanent_address: [''],
    is_nrb: [false],
    passport_number: [''],
    customer_type: ['INDIVIDUAL'],
    preferred_language: ['BANGLA'],
    preferred_contact_method: ['PHONE'],
    is_consent_given: [true],
    profile_photo_url: [''],
    nid_scan_front_url: [''],
    nid_scan_back_url: [''],
    nominees: this.fb.array([])
  });

  nomineeForm: FormGroup = this.fb.group({
    nominee_name: ['', Validators.required],
    relationship: ['SPOUSE', Validators.required],
    nid_number: [''],
    share_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]],
    phone: [''],
    email: ['', [Validators.email]],
    address: [''],
    notes: ['']
  });

  get nomineesArray(): FormArray {
    return this.form.get('nominees') as FormArray;
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'new') {
      this.customerId = Number(idParam);
      this.isEditMode.set(true);
      this.loadCustomer();
    }

    // Debounced duplicate check on phone/email/nid
    this.form.valueChanges.subscribe(() => {
      // lightweight — full debounce on blur handlers below
    });

    this.form.get('primary_phone')!.valueChanges.subscribe(() => this.scheduleDupCheck());
    this.form.get('email')!.valueChanges.subscribe(() => this.scheduleDupCheck());
    this.form.get('nid_number')!.valueChanges.subscribe(() => this.scheduleDupCheck());
  }

  private dupTimer: any;
  private scheduleDupCheck(): void {
    if (this.isEditMode()) return;
    clearTimeout(this.dupTimer);
    this.dupTimer = setTimeout(() => this.checkDuplicates(), 600);
  }

  checkDuplicates(): void {
    const v = this.form.value;
    if (!v.primary_phone && !v.email && !v.nid_number) return;
    this.isCheckingDup.set(true);
    this.crmService.checkCustomerDuplicates({
      primary_phone: v.primary_phone || undefined,
      email: v.email || undefined,
      nid_number: v.nid_number || undefined,
      exclude_customer_id: this.customerId ?? undefined
    }).subscribe({
      next: (res) => {
        this.dupCheckResult.set(res);
        this.isCheckingDup.set(false);
      },
      error: () => this.isCheckingDup.set(false)
    });
  }

  loadCustomer(): void {
    if (!this.customerId) return;
    this.isLoading.set(true);
    this.crmService.getCustomer(this.customerId).subscribe({
      next: (c) => {
        this.form.patchValue({
          full_name_en: c.full_name_en,
          full_name_bn: c.full_name_bn,
          father_husband_name: c.father_husband_name,
          mother_name: c.mother_name,
          nid_number: c.nid_number,
          tin_number: c.tin_number,
          primary_phone: c.primary_phone,
          secondary_phone: c.secondary_phone,
          email: c.email,
          present_address: c.present_address,
          permanent_address: c.permanent_address,
          is_nrb: c.is_nrb,
          passport_number: c.passport_number,
          customer_type: c.customer_type || 'INDIVIDUAL',
          preferred_language: c.preferred_language || 'BANGLA',
          preferred_contact_method: c.preferred_contact_method || 'PHONE',
          is_consent_given: c.is_consent_given,
          profile_photo_url: c.profile_photo_url,
          nid_scan_front_url: c.nid_scan_front_url,
          nid_scan_back_url: c.nid_scan_back_url
        });
        this.nomineesArray.clear();
        for (const n of c.nominees || []) {
          this.nomineesArray.push(this.buildNomineeGroup(n));
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load customer.');
        this.isLoading.set(false);
      }
    });
  }

  buildNomineeGroup(n?: Partial<Nominee>): FormGroup {
    return this.fb.group({
      nominee_name: [n?.nominee_name || '', Validators.required],
      relationship: [n?.relationship || 'SPOUSE', Validators.required],
      nid_number: [n?.nid_number || ''],
      share_percentage: [n?.share_percentage ?? 100, [Validators.required, Validators.min(1), Validators.max(100)]],
      phone: [n?.phone || ''],
      email: [n?.email || ''],
      address: [n?.address || ''],
      notes: [n?.notes || '']
    });
  }

  addNomineeRow(): void {
    this.nomineesArray.push(this.buildNomineeGroup());
  }

  removeNomineeRow(i: number): void {
    this.nomineesArray.removeAt(i);
  }

  nomineeShareTotal(): number {
    return this.nomineesArray.controls.reduce((sum, g) => sum + (Number(g.get('share_percentage')?.value) || 0), 0);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please fix validation errors.');
      return;
    }
    const totalShare = this.nomineeShareTotal();
    if (totalShare > 100) {
      this.errorMessage.set(`Total nominee share ${totalShare}% exceeds 100%.`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const v = this.form.value;
    const payload: any = {
      full_name_en: v.full_name_en,
      full_name_bn: v.full_name_bn || null,
      father_husband_name: v.father_husband_name || null,
      mother_name: v.mother_name || null,
      nid_number: v.nid_number || null,
      tin_number: v.tin_number || null,
      primary_phone: v.primary_phone,
      secondary_phone: v.secondary_phone || null,
      email: v.email || null,
      present_address: v.present_address || null,
      permanent_address: v.permanent_address || null,
      is_nrb: !!v.is_nrb,
      passport_number: v.passport_number || null,
      customer_type: v.customer_type || 'INDIVIDUAL',
      preferred_language: v.preferred_language || 'BANGLA',
      preferred_contact_method: v.preferred_contact_method || 'PHONE',
      is_consent_given: !!v.is_consent_given,
      profile_photo_url: v.profile_photo_url || null,
      nid_scan_front_url: v.nid_scan_front_url || null,
      nid_scan_back_url: v.nid_scan_back_url || null,
      nominees: (this.nomineesArray.controls as FormGroup[]).map(g => ({
        nominee_name: g.value.nominee_name,
        relationship: g.value.relationship,
        nid_number: g.value.nid_number || null,
        share_percentage: Number(g.value.share_percentage),
        phone: g.value.phone || null,
        email: g.value.email || null,
        address: g.value.address || null,
        notes: g.value.notes || null
      }))
    };

    if (this.isEditMode() && this.customerId) {
      delete payload.nominees; // nominees managed via dossier / separate endpoints on edit
      this.crmService.updateCustomer(this.customerId, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Customer updated.');
          this.router.navigate(['/crm/customers', this.customerId]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Update failed.');
        }
      });
    } else {
      this.crmService.createCustomer(payload).subscribe({
        next: (c) => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/customers', c.id]);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Create failed.');
        }
      });
    }
  }

  cancel(): void {
    if (this.customerId) this.router.navigate(['/crm/customers', this.customerId]);
    else this.router.navigate(['/crm/customers']);
  }
}
