import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CrmService } from '../../../core/services/crm.service';
import { Customer, Nominee } from '../../../core/models/crm.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-crm-customers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './crm-customers.component.html'
})
export class CrmCustomersComponent implements OnInit {
  private crmService = inject(CrmService);
  private fb = inject(FormBuilder);

  customers = signal<Customer[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  searchQuery = signal<string>('');

  // Modals
  isCreateModalOpen = signal<boolean>(false);
  isNomineeModalOpen = signal<boolean>(false);
  selectedCustomerForNominee = signal<Customer | null>(null);

  // Form for New Customer with Nominees
  customerForm: FormGroup = this.fb.group({
    full_name_en: ['', Validators.required],
    full_name_bn: [''],
    father_husband_name: [''],
    mother_name: [''],
    nid_number: ['', [Validators.required, Validators.pattern(/^[0-9]{10,17}$/)]],
    tin_number: [''],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    email: ['', [Validators.email]],
    present_address: ['', Validators.required],
    permanent_address: ['', Validators.required],
    is_nrb: [false],
    passport_number: [''],
    nominees: this.fb.array([])
  });

  // Nominee Form for quick append
  nomineeForm: FormGroup = this.fb.group({
    nominee_name: ['', Validators.required],
    relationship: ['SPOUSE', Validators.required],
    nid_number: [''],
    share_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]]
  });

  relationshipOptions = [
    { value: 'SPOUSE', label: 'Spouse (স্বামী / স্ত্রী)' },
    { value: 'SON', label: 'Son (ছেলে)' },
    { value: 'DAUGHTER', label: 'Daughter (মেয়ে)' },
    { value: 'FATHER', label: 'Father (পিতা)' },
    { value: 'MOTHER', label: 'Mother (মাতা)' },
    { value: 'BROTHER', label: 'Brother (ভাই)' }
  ];

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.isLoading.set(true);
    this.crmService.getCustomers().subscribe({
      next: (res) => {
        this.customers.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  get nomineesArray(): FormArray {
    return this.customerForm.get('nominees') as FormArray;
  }

  addNomineeField(): void {
    const nomineeGroup = this.fb.group({
      nominee_name: ['', Validators.required],
      relationship: ['SPOUSE', Validators.required],
      nid_number: [''],
      share_percentage: [50, [Validators.required, Validators.min(1), Validators.max(100)]]
    });
    this.nomineesArray.push(nomineeGroup);
  }

  removeNomineeField(index: number): void {
    this.nomineesArray.removeAt(index);
  }

  openCreateModal(): void {
    this.customerForm.reset({
      full_name_en: '',
      full_name_bn: '',
      father_husband_name: '',
      mother_name: '',
      nid_number: '',
      tin_number: '',
      primary_phone: '',
      email: '',
      present_address: '',
      permanent_address: '',
      is_nrb: false,
      passport_number: ''
    });
    this.nomineesArray.clear();
    // Default 1 nominee with 100% share
    this.nomineesArray.push(this.fb.group({
      nominee_name: ['', Validators.required],
      relationship: ['SPOUSE', Validators.required],
      nid_number: [''],
      share_percentage: [100, [Validators.required, Validators.min(1), Validators.max(100)]]
    }));
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCustomer(): void {
    if (this.customerForm.invalid) return;

    // Validate nominee shares sum to <= 100%
    const nominees = this.nomineesArray.value;
    const totalShare = nominees.reduce((acc: number, cur: any) => acc + Number(cur.share_percentage || 0), 0);
    if (totalShare > 100) {
      alert(`Nominee share percentages sum to ${totalShare}%, which exceeds 100%. Please adjust.`);
      return;
    }

    this.isSubmitting.set(true);
    this.crmService.createCustomer(this.customerForm.value).subscribe({
      next: (created) => {
        this.customers.update(cur => [created, ...cur]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // Quick Nominee Appending
  openNomineeModal(customer: Customer): void {
    this.selectedCustomerForNominee.set(customer);
    const existingTotal = customer.nominees.reduce((a, b) => a + Number(b.share_percentage || 0), 0);
    const remaining = Math.max(0, 100 - existingTotal);
    this.nomineeForm.reset({
      nominee_name: '',
      relationship: 'SPOUSE',
      nid_number: '',
      share_percentage: remaining
    });
    this.isNomineeModalOpen.set(true);
  }

  closeNomineeModal(): void {
    this.isNomineeModalOpen.set(false);
    this.selectedCustomerForNominee.set(null);
  }

  submitNominee(): void {
    const cust = this.selectedCustomerForNominee();
    if (!cust || this.nomineeForm.invalid) return;

    this.isSubmitting.set(true);
    this.crmService.addNominee(cust.id, this.nomineeForm.value).subscribe({
      next: (nom) => {
        this.customers.update(list => list.map(c => {
          if (c.id === cust.id) {
            return { ...c, nominees: [...c.nominees, nom] };
          }
          return c;
        }));
        this.isSubmitting.set(false);
        this.closeNomineeModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to add nominee');
        this.isSubmitting.set(false);
      }
    });
  }

  filteredCustomers(): Customer[] {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.customers();
    return this.customers().filter(c =>
      c.customer_code.toLowerCase().includes(q) ||
      c.full_name_en.toLowerCase().includes(q) ||
      (c.nid_number && c.nid_number.includes(q)) ||
      c.primary_phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }
}
