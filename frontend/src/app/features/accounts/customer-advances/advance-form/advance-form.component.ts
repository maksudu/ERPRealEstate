import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CustomerAdvanceAccountingService } from '../../../../core/services/customer-advance-accounting.service';
import { LookupService } from '../../../../core/services/lookup.service';
import { ProjectService } from '../../../../core/services/project.service';
import { CrmService } from '../../../../core/services/crm.service';
import { AccountsService } from '../../../../core/services/accounts.service';
import { InventoryService } from '../../../../core/services/inventory.service';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  CustomTextareaComponent,
  SearchableSelectComponent
} from '../../../../shared/components';
import { CustomerAdvancesNavComponent } from '../customer-advances-nav.component';

@Component({
  selector: 'app-advance-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    CustomerAdvancesNavComponent
  ],
  templateUrl: './advance-form.component.html'
})
export class AdvanceFormComponent implements OnInit {
  private service = inject(CustomerAdvanceAccountingService);
  private lookupService = inject(LookupService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private accountsService = inject(AccountsService);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isEditMode = signal<boolean>(false);
  advanceId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Form State
  form = {
    source_module: 'BOOKING',
    source_transaction_id: `BK-REC-${Date.now().toString().slice(-6)}`,
    receipt_date: new Date().toISOString().split('T')[0],
    transaction_type: 'BOOKING_MONEY',
    customer_id: null as number | null,
    customer_name: '',
    booking_id: null as number | null,
    booking_reference_no: '',
    sale_agreement_no: '',
    project_id: null as number | null,
    project_name: '',
    tower_id: null as number | null,
    unit_id: null as number | null,
    unit_number: '',
    installment_id: null as number | null,
    installment_title: '',
    payment_mode: 'BANK_TRANSFER',
    bank_account_id: null as number | null,
    bank_name: '',
    instrument_no: '',
    instrument_date: new Date().toISOString().split('T')[0],
    gross_amount: 0,
    notes: ''
  };

  // Dynamic Lookup Options
  customerOptions = signal<{ label: string; value: number }[]>([]);
  projectOptions = signal<{ label: string; value: number }[]>([]);
  towerOptions = signal<{ label: string; value: number }[]>([]);
  unitOptions = signal<{ label: string; value: number }[]>([]);
  bankAccountOptions = signal<{ label: string; value: number }[]>([]);
  txTypeOptions = signal<{ label: string; value: string }[]>([]);
  paymentModeOptions = signal<{ label: string; value: string }[]>([
    { label: 'Electronic Bank Transfer (EFT / RTGS)', value: 'BANK_TRANSFER' },
    { label: 'Cheque / Pay Order Deposit', value: 'CHEQUE' },
    { label: 'Cash Counter Collection', value: 'CASH' },
    { label: 'bKash Merchant Gateway', value: 'MFS_BKASH' },
    { label: 'Nagad Business Gateway', value: 'MFS_NAGAD' }
  ]);
  sourceModuleOptions = signal<{ label: string; value: string }[]>([
    { label: 'Sales Booking Module', value: 'BOOKING' },
    { label: 'Installment & Collection Module', value: 'INSTALLMENTS' },
    { label: 'Manual Accounting Entry', value: 'MANUAL' }
  ]);

  // Inline Quick Add Customer Modal
  showQuickCustomerModal = signal<boolean>(false);
  newCustomer = {
    full_name_en: '',
    primary_phone: '',
    nid_number: '',
    email: ''
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.advanceId.set(Number(id));
      this.loadAdvanceData(Number(id));
    }
    this.loadLookups();
  }

  loadLookups(): void {
    // Customers
    this.crmService.getCustomers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.customerOptions.set(
          list.map((c: any) => ({
            label: `${c.full_name_en || c.name} (${c.primary_phone || c.customer_code || ''})`,
            value: c.id
          }))
        );
      }
    });

    // Projects
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.projectOptions.set(
          list.map((p: any) => ({ label: p.project_name || p.name, value: p.id }))
        );
      }
    });

    // Bank Accounts
    this.accountsService.getBankAccounts().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.bankAccountOptions.set(
          list.map((b: any) => ({
            label: `${b.bank_name} - ${b.account_number_masked || b.account_name || ''}`,
            value: b.id
          }))
        );
      }
    });

    // Transaction Types
    this.lookupService.getItems('ADVANCE_TRANSACTION_TYPE').subscribe({
      next: (items: any[]) => {
        if (items && items.length) {
          this.txTypeOptions.set(
            items.map((i: any) => ({ label: i.item_name_en, value: i.item_code }))
          );
        } else {
          this.txTypeOptions.set([
            { label: 'Booking Money Receipt', value: 'BOOKING_MONEY' },
            { label: 'Down Payment Accounting', value: 'DOWN_PAYMENT' },
            { label: 'Installment Advance', value: 'INSTALLMENT_ADVANCE' },
            { label: 'Interim Collection', value: 'INTERIM_COLLECTION' }
          ]);
        }
      }
    });
  }

  onProjectChange(projectId: number): void {
    this.form.project_id = projectId;
    const prj = this.projectOptions().find(p => p.value === projectId);
    if (prj) this.form.project_name = prj.label;

    // Load Units for Project
    this.inventoryService.getUnits({ project_id: projectId }).subscribe({
      next: (units: any[]) => {
        const list = Array.isArray(units) ? units : [];
        this.unitOptions.set(
          list.map((u: any) => ({ label: `Unit ${u.unit_number} (Floor ${u.floor_number || ''})`, value: u.id }))
        );
        this.towerOptions.set([
          { label: 'Tower 1', value: 1 },
          { label: 'Tower 2', value: 2 },
          { label: 'Main Block', value: 3 }
        ]);
      },
      error: () => {
        this.unitOptions.set([]);
        this.towerOptions.set([]);
      }
    });
  }

  onCustomerChange(customerId: number): void {
    this.form.customer_id = customerId;
    const c = this.customerOptions().find(opt => opt.value === customerId);
    if (c) this.form.customer_name = c.label.split(' (')[0];
  }

  onUnitChange(unitId: number): void {
    this.form.unit_id = unitId;
    const u = this.unitOptions().find(opt => opt.value === unitId);
    if (u) this.form.unit_number = u.label.split(' (')[0].replace('Unit ', '');
  }

  loadAdvanceData(id: number): void {
    this.isLoading.set(true);
    this.service.getTransaction(id).subscribe({
      next: (adv) => {
        this.form = {
          source_module: adv.source_module,
          source_transaction_id: adv.source_transaction_id,
          receipt_date: adv.receipt_date,
          transaction_type: adv.transaction_type,
          customer_id: adv.customer_id,
          customer_name: adv.customer_name,
          booking_id: adv.booking_id || null,
          booking_reference_no: adv.booking_reference_no || '',
          sale_agreement_no: adv.sale_agreement_no || '',
          project_id: adv.project_id,
          project_name: adv.project_name,
          tower_id: adv.tower_id || null,
          unit_id: adv.unit_id || null,
          unit_number: adv.unit_number || '',
          installment_id: adv.installment_id || null,
          installment_title: adv.installment_title || '',
          payment_mode: adv.payment_mode,
          bank_account_id: adv.bank_account_id || null,
          bank_name: adv.bank_name || '',
          instrument_no: adv.instrument_no || '',
          instrument_date: adv.instrument_date || '',
          gross_amount: Number(adv.gross_amount),
          notes: adv.notes || ''
        };
        if (adv.project_id) {
          this.onProjectChange(adv.project_id);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Failed to load transaction: ' + (err.error?.detail || err.message));
        this.isLoading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (!this.form.customer_id || !this.form.project_id || this.form.gross_amount <= 0) {
      this.errorMessage.set('Please select Customer, Project and enter a valid Gross Amount.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.isEditMode() && this.advanceId()) {
      this.service.updateTransaction(this.advanceId()!, this.form).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/accounts/customer-advances']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.detail || 'Failed to update transaction.');
        }
      });
    } else {
      this.service.createTransaction(this.form).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/accounts/customer-advances']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.detail || 'Failed to record customer advance.');
        }
      });
    }
  }

  // Quick Customer Creation
  openQuickCustomerModal(): void {
    this.newCustomer = { full_name_en: '', primary_phone: '', nid_number: '', email: '' };
    this.showQuickCustomerModal.set(true);
  }

  saveQuickCustomer(): void {
    if (!this.newCustomer.full_name_en || !this.newCustomer.primary_phone) {
      alert('Customer Name and Primary Phone are required.');
      return;
    }
    this.crmService.createCustomer(this.newCustomer).subscribe({
      next: (created: any) => {
        this.showQuickCustomerModal.set(false);
        this.loadLookups();
        if (created?.id) {
          this.form.customer_id = created.id;
          this.form.customer_name = created.full_name_en;
        }
      }
    });
  }
}
