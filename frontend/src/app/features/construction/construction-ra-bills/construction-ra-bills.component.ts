import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { RABill, WorkOrder, Subcontractor } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-ra-bills',
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
  templateUrl: './construction-ra-bills.component.html'
})
export class ConstructionRaBillsComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  raBills = signal<RABill[]>([]);
  workOrders = signal<WorkOrder[]>([]);
  contractors = signal<Subcontractor[]>([]);
  projects = signal<Project[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreateBillModalOpen = signal<boolean>(false);
  isCreateWOModalOpen = signal<boolean>(false);
  isApprovalModalOpen = signal<boolean>(false);
  selectedBill = signal<RABill | null>(null);

  billForm: FormGroup = this.fb.group({
    work_order_id: [null, Validators.required],
    ra_bill_number: ['', Validators.required],
    bill_date: [new Date().toISOString().split('T')[0], Validators.required],
    gross_work_certified_amount: [5000000, [Validators.required, Validators.min(10000)]],
    advance_recovery_deducted: [0, [Validators.min(0)]],
    tds_percentage: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    vds_percentage: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    remarks: ['']
  });

  woForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    contractor_id: [null, Validators.required],
    contract_type: ['CIVIL_SUPERSTRUCTURE', Validators.required],
    total_contract_value: [50000000, [Validators.required, Validators.min(100000)]],
    retention_money_percent: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    defect_liability_months: [12, [Validators.required, Validators.min(1)]],
    scope_of_work: ['']
  });

  contractTypeOptions = [
    { value: 'CIVIL_SUPERSTRUCTURE', label: 'Civil Super-structure & Concreting' },
    { value: 'SHUTTERING_CARPENTRY', label: 'Shuttering, Staging & Scaffolding' },
    { value: 'PLUMBING_SANITARY', label: 'Plumbing, Drainage & Sanitary' },
    { value: 'TILES_MARBLE', label: 'Tiles, Stone & Marble Cladding' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadDropdownData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.constructionService.getRABills().subscribe({
      next: (res) => {
        this.raBills.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadDropdownData(): void {
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
    this.constructionService.getContractors().subscribe(c => this.contractors.set(c));
    this.constructionService.getWorkOrders().subscribe(wos => this.workOrders.set(wos));
  }

  get workOrderOptions() {
    return this.workOrders().map(w => ({
      value: w.id,
      label: `${w.work_order_no} - ${w.contractor_name} (${w.project_name} - BDT ${Number(w.total_contract_value).toLocaleString()})`
    }));
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  get contractorOptions() {
    return this.contractors().map(c => ({
      value: c.id,
      label: `${c.company_name} (${c.trade_specialization})`
    }));
  }

  // Create Work Order Modal
  openCreateWOModal(): void {
    this.woForm.reset({
      project_id: this.projects()[0]?.id || null,
      contractor_id: this.contractors()[0]?.id || null,
      contract_type: 'CIVIL_SUPERSTRUCTURE',
      total_contract_value: 50000000,
      retention_money_percent: 5,
      defect_liability_months: 12,
      scope_of_work: ''
    });
    this.isCreateWOModalOpen.set(true);
  }

  closeCreateWOModal(): void {
    this.isCreateWOModalOpen.set(false);
  }

  submitWorkOrder(): void {
    if (this.woForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createWorkOrder(this.woForm.value).subscribe({
      next: (wo) => {
        this.workOrders.update(list => [wo, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateWOModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Work order creation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // Create RA Bill Modal
  openCreateBillModal(): void {
    const nextBillNo = `RA-BILL-${(this.raBills().length + 1).toString().padStart(2, '0')}`;
    this.billForm.reset({
      work_order_id: this.workOrders()[0]?.id || null,
      ra_bill_number: nextBillNo,
      bill_date: new Date().toISOString().split('T')[0],
      gross_work_certified_amount: 5000000,
      advance_recovery_deducted: 0,
      tds_percentage: 5,
      vds_percentage: 5,
      remarks: ''
    });
    this.isCreateBillModalOpen.set(true);
  }

  closeCreateBillModal(): void {
    this.isCreateBillModalOpen.set(false);
  }

  submitRABill(): void {
    if (this.billForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createRABill(this.billForm.value).subscribe({
      next: (created) => {
        this.raBills.update(list => [created, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateBillModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'RA Bill submission failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // Approve RA Bill and emit Accounts Voucher event
  openApprovalModal(bill: RABill): void {
    this.selectedBill.set(bill);
    this.isApprovalModalOpen.set(true);
  }

  closeApprovalModal(): void {
    this.isApprovalModalOpen.set(false);
    this.selectedBill.set(null);
  }

  confirmApproval(): void {
    const bill = this.selectedBill();
    if (!bill) return;

    this.isSubmitting.set(true);
    this.constructionService.approveRABill(bill.id, {
      action: 'APPROVE',
      approval_notes: 'RA Bill approved by Project Director. Emitted Accounts Liability Voucher Event.'
    }).subscribe({
      next: (updated) => {
        this.raBills.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.isSubmitting.set(false);
        this.closeApprovalModal();
        alert(`RA Bill #${updated.ra_bill_number} Approved!\nAccounts Journal Voucher Ref Generated: ${updated.accounts_journal_voucher_ref}`);
      },
      error: (err) => {
        alert(err?.error?.detail || 'Approval failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
