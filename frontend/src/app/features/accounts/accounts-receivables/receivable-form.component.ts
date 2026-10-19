import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { CrmService } from '../../../core/services/crm.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { ChartOfAccount } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Customer } from '../../../core/models/crm.model';
import { Unit } from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-receivable-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './receivable-form.component.html'
})
export class ReceivableFormComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private crmService = inject(CrmService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  coaList = signal<ChartOfAccount[]>([]);
  projects = signal<Project[]>([]);
  customers = signal<Customer[]>([]);
  units = signal<Unit[]>([]);

  todayStr = new Date().toISOString().split('T')[0];
  defaultDueStr = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  receivableForm: FormGroup = this.fb.group({
    invoice_number: ['', [Validators.required, Validators.minLength(2)]],
    invoice_type: ['Installment_Demand', Validators.required],
    invoice_date: [this.todayStr, Validators.required],
    due_date: [this.defaultDueStr, Validators.required],
    customer_id: [null, Validators.required],
    customer_name: ['', Validators.required],
    project_id: [null],
    unit_id: [null],
    receivable_account_id: [null],
    revenue_account_id: [null],
    gross_amount: [0, [Validators.required, Validators.min(0.01)]],
    late_fee_amount: [0, Validators.min(0)],
    discount_amount: [0, Validators.min(0)],
    description: ['']
  });

  customerOptions: { value: any; label: string; subLabel?: string }[] = [];
  projectOptions: { value: any; label: string }[] = [];
  unitOptions: { value: any; label: string }[] = [];
  receivableAccountOptions: { value: any; label: string }[] = [];
  revenueAccountOptions: { value: any; label: string }[] = [];

  computedNetReceivable = computed(() => {
    const gross = parseFloat(this.receivableForm.get('gross_amount')?.value) || 0;
    const late = parseFloat(this.receivableForm.get('late_fee_amount')?.value) || 0;
    const disc = parseFloat(this.receivableForm.get('discount_amount')?.value) || 0;
    return Math.max(0, Math.round((gross + late - disc) * 100) / 100);
  });

  ngOnInit(): void {
    this.generateDefaultInvoiceNumber();
    this.loadDropdownData();
  }

  generateDefaultInvoiceNumber(): void {
    const yyyy = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.receivableForm.patchValue({
      invoice_number: `DN-${yyyy}-${rand}`
    });
  }

  loadDropdownData(): void {
    this.isLoading.set(true);

    // 1. Chart of Accounts
    this.accountsService.getCOAHierarchy().subscribe({
      next: (tree) => {
        const flatLeafAccounts: ChartOfAccount[] = [];
        const traverse = (nodes: any[]) => {
          for (const node of nodes) {
            if (node.is_leaf_account) {
              flatLeafAccounts.push(node);
            }
            if (node.children && node.children.length > 0) {
              traverse(node.children);
            }
          }
        };
        traverse(tree);
        this.coaList.set(flatLeafAccounts);

        // Filter AR Receivable accounts (Assets, e.g. 1130)
        this.receivableAccountOptions = flatLeafAccounts
          .filter(a => ['Asset'].includes(a.account_type) || a.account_code.startsWith('1'))
          .map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }));

        // Filter Revenue accounts (Revenue / Advances 4100 / 2140)
        this.revenueAccountOptions = flatLeafAccounts
          .filter(a => ['Revenue', 'Liability'].includes(a.account_type) || a.account_code.startsWith('4') || a.account_code.startsWith('2'))
          .map(a => ({
            value: a.id,
            label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
          }));

        // Set sensible defaults
        const defAR = flatLeafAccounts.find(a => a.account_code === '1130');
        const defRev = flatLeafAccounts.find(a => a.account_code === '4100' || a.account_code === '2140');
        if (defAR) this.receivableForm.patchValue({ receivable_account_id: defAR.id });
        if (defRev) this.receivableForm.patchValue({ revenue_account_id: defRev.id });

        this.isLoading.set(false);
      },
      error: err => {
        console.warn('Failed to load COA:', err);
        this.isLoading.set(false);
      }
    });

    // 2. Customers
    this.crmService.getCustomers().subscribe({
      next: (custs: any) => {
        const list: Customer[] = Array.isArray(custs) ? custs : (custs?.data || []);
        this.customers.set(list);
        this.customerOptions = list.map(c => ({
          value: c.id,
          label: `${c.full_name_en} (${c.customer_code})`,
          subLabel: `Phone: ${c.primary_phone || 'N/A'}`
        }));
      },
      error: err => console.warn('Failed to load customers:', err)
    });

    // 3. Projects
    this.projectService.getProjects().subscribe({
      next: (projs: any) => {
        const list: Project[] = Array.isArray(projs) ? projs : (projs?.data || []);
        this.projects.set(list);
        this.projectOptions = [
          { value: null, label: 'General Corporate / Head Office' },
          ...list.map(p => ({
            value: p.id,
            label: `${p.project_name} (${p.project_code || 'PRJ'})`
          }))
        ];
      },
      error: err => console.warn('Failed to load projects:', err)
    });
  }

  onCustomerSelect(custId: any): void {
    const id = custId ? Number(custId) : null;
    this.receivableForm.patchValue({ customer_id: id });
    if (id) {
      const found = this.customers().find(c => c.id === id);
      if (found) {
        this.receivableForm.patchValue({ customer_name: found.full_name_en });
      }
    }
  }

  onProjectSelect(projId: any): void {
    const id = projId ? Number(projId) : null;
    this.receivableForm.patchValue({ project_id: id, unit_id: null });
    if (id) {
      this.inventoryService.getUnits({ project_id: id }).subscribe({
        next: (units: any) => {
          const list: Unit[] = Array.isArray(units) ? units : (units?.data || []);
          this.units.set(list);
          this.unitOptions = [
            { value: null, label: 'No Specific Unit (General Project Charge)' },
            ...list.map(u => ({
              value: u.id,
              label: `Unit ${u.unit_number || u.id} (${(u as any).unit_type || (u as any).type || 'Apartment'})`
            }))
          ];
        },
        error: err => console.warn('Failed to load project units:', err)
      });
    } else {
      this.unitOptions = [];
    }
  }

  applyStandardLateFee(percentage: number): void {
    const gross = parseFloat(this.receivableForm.get('gross_amount')?.value) || 0;
    const late = Math.round(gross * (percentage / 100) * 100) / 100;
    this.receivableForm.patchValue({ late_fee_amount: late });
  }

  onSubmit(): void {
    if (this.receivableForm.invalid) {
      this.receivableForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields with valid values.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.receivableForm.value;
    const payload = {
      invoice_number: val.invoice_number.trim(),
      invoice_type: val.invoice_type,
      invoice_date: val.invoice_date,
      due_date: val.due_date,
      customer_id: val.customer_id ? Number(val.customer_id) : null,
      customer_name: val.customer_name.trim(),
      project_id: val.project_id ? Number(val.project_id) : null,
      unit_id: val.unit_id ? Number(val.unit_id) : null,
      receivable_account_id: val.receivable_account_id ? Number(val.receivable_account_id) : null,
      revenue_account_id: val.revenue_account_id ? Number(val.revenue_account_id) : null,
      gross_amount: parseFloat(val.gross_amount) || 0,
      late_fee_amount: parseFloat(val.late_fee_amount) || 0,
      discount_amount: parseFloat(val.discount_amount) || 0,
      description: val.description?.trim() || null
    };

    this.accountsService.createARInvoice(payload).subscribe({
      next: (createdInv) => {
        this.isSubmitting.set(false);
        this.router.navigate(['/accounts/receivables/view', createdInv.id]);
      },
      error: (err) => {
        console.error('Failed to create demand notice:', err);
        this.errorMessage.set(err.error?.detail || 'Failed to register demand notice.');
        this.isSubmitting.set(false);
      }
    });
  }
}
