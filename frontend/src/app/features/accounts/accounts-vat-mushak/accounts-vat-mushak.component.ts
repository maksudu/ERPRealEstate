import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { MushakTaxInvoice } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../shared/components';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-accounts-vat-mushak',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './accounts-vat-mushak.component.html'
})
export class AccountsVatMushakComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  invoices = signal<MushakTaxInvoice[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);

  searchQuery = signal<string>('');

  createForm: FormGroup = this.fb.group({
    booking_id: [1, [Validators.required, Validators.min(1)]],
    taxable_amount: [8000000, [Validators.required, Validators.min(1000)]],
    customer_tin_nid: ['TIN: 123456789012'],
    apartment_type: ['RESIDENTIAL', Validators.required]
  });

  filteredInvoices = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    return this.invoices().filter(inv => {
      if (!query) return true;
      return (
        inv.mushak_challan_number.toLowerCase().includes(query) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(query)) ||
        (inv.customer_tin_nid && inv.customer_tin_nid.toLowerCase().includes(query)) ||
        (inv.project_name && inv.project_name.toLowerCase().includes(query))
      );
    });
  });

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading.set(true);
    this.accountsService.getMushakInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      booking_id: 1,
      taxable_amount: 8500000,
      customer_tin_nid: 'TIN: 1984269123456',
      apartment_type: 'RESIDENTIAL'
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitMushak(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.createForm.value;
    const payload = {
      booking_id: Number(val.booking_id),
      taxable_amount: Number(val.taxable_amount),
      customer_tin_nid: val.customer_tin_nid,
      apartment_type: val.apartment_type
    };

    this.accountsService.generateMushakInvoice(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadInvoices();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to generate Mushak 6.3 invoice');
      }
    });
  }

  downloadPdf(invoice: MushakTaxInvoice): void {
    const url = `${environment.apiUrl}/accounts/vat-mushak/${invoice.id}/pdf`;
    window.open(url, '_blank');
  }
}
