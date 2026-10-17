import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { RABill, WorkOrder, Subcontractor, JointMeasurementSheet } from '../../../core/models/construction.model';
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

  // Active view tab: 'BILLS' | 'JMS' | 'WORK_ORDERS'
  currentTab = signal<'BILLS' | 'JMS' | 'WORK_ORDERS'>('BILLS');

  raBills = signal<RABill[]>([]);
  workOrders = signal<WorkOrder[]>([]);
  contractors = signal<Subcontractor[]>([]);
  projects = signal<Project[]>([]);
  jointMeasurements = signal<JointMeasurementSheet[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreateBillModalOpen = signal<boolean>(false);
  isCreateWOModalOpen = signal<boolean>(false);
  isCreateJMSModalOpen = signal<boolean>(false);
  isSignModalOpen = signal<boolean>(false);
  selectedBill = signal<RABill | null>(null);

  billForm: FormGroup = this.fb.group({
    work_order_id: [null, Validators.required],
    ra_bill_number: ['', Validators.required],
    bill_date: [new Date().toISOString().split('T')[0], Validators.required],
    billing_period_start: [new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]],
    billing_period_end: [new Date().toISOString().split('T')[0]],
    gross_work_certified_amount: [2500000, [Validators.required, Validators.min(1000)]],
    retention_percent: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    advance_recovery_deducted: [0, [Validators.min(0)]],
    material_store_recovery_amount: [0, [Validators.min(0)]], // Cement, Steel, Diesel
    tds_rate: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    vds_rate: [5, [Validators.required, Validators.min(0), Validators.max(20)]],
    remarks: ['']
  });

  jmsForm: FormGroup = this.fb.group({
    work_order_id: [null, Validators.required],
    jms_number: ['', Validators.required],
    measurement_date: [new Date().toISOString().split('T')[0], Validators.required],
    location_floor: ['', Validators.required],
    trade_item: ['', Validators.required],
    unit_of_measure: ['SFT', Validators.required],
    measured_length: [0],
    measured_breadth: [0],
    measured_depth: [0],
    measured_quantity: [0, [Validators.required, Validators.min(0.01)]],
    unit_rate: [0, [Validators.required, Validators.min(0.01)]],
    verified_by_site_engineer: ['Engr. Tanvir Ahmed', Validators.required],
    subcontractor_representative: ['', Validators.required]
  });

  signForm: FormGroup = this.fb.group({
    role: ['QUANTITY_SURVEYOR', Validators.required],
    signatory_name: ['', Validators.required],
    action: ['APPROVE', Validators.required],
    approval_notes: ['']
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

  uomOptions = [
    { value: 'SFT', label: 'Square Feet (SFT) - Surface Area' },
    { value: 'CFT', label: 'Cubic Feet (CFT) - Volume' },
    { value: 'RFT', label: 'Running Feet (RFT) - Linear' },
    { value: 'TON', label: 'Metric Ton (MT) - Reinforcement' },
    { value: 'NOS', label: 'Numbers (Nos) - Fixtures' }
  ];

  roleOptions = [
    { value: 'QUANTITY_SURVEYOR', label: 'Quantity Surveyor (QS Verification)' },
    { value: 'PROJECT_DIRECTOR', label: 'Project Director (Technical & Commercial Signoff)' },
    { value: 'ACCOUNTS', label: 'Head of Accounts (Financial Voucher Posting)' }
  ];

  // Computed Real-time Net Payable in Bill Form
  computedDeductions = computed(() => {
    // Read from form values
    return () => {
      const gross = Number(this.billForm.get('gross_work_certified_amount')?.value) || 0;
      const retPct = Number(this.billForm.get('retention_percent')?.value) || 0;
      const adv = Number(this.billForm.get('advance_recovery_deducted')?.value) || 0;
      const store = Number(this.billForm.get('material_store_recovery_amount')?.value) || 0;
      const tdsRate = Number(this.billForm.get('tds_rate')?.value) || 0;
      const vdsRate = Number(this.billForm.get('vds_rate')?.value) || 0;

      const retAmt = Math.round(gross * (retPct / 100));
      const tdsAmt = Math.round(gross * (tdsRate / 100));
      const vdsAmt = Math.round(gross * (vdsRate / 100));
      const net = Math.round(gross - retAmt - adv - store - tdsAmt - vdsAmt);

      return {
        gross,
        retAmt,
        adv,
        store,
        tdsAmt,
        vdsAmt,
        net
      };
    };
  });

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

    this.constructionService.getJointMeasurements().subscribe({
      next: (jms) => this.jointMeasurements.set(jms)
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
      label: `${w.work_order_no} - ${w.contractor_name} (${w.project_name})`
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

  // Dimension quantity calculation helper
  calculateJMSQuantity(): void {
    const l = Number(this.jmsForm.get('measured_length')?.value) || 0;
    const b = Number(this.jmsForm.get('measured_breadth')?.value) || 0;
    const d = Number(this.jmsForm.get('measured_depth')?.value) || 0;
    const uom = this.jmsForm.get('unit_of_measure')?.value;

    if (l > 0 && b > 0) {
      if (uom === 'CFT') {
        const depth = d > 0 ? d : 1.0;
        this.jmsForm.patchValue({ measured_quantity: Math.round(l * b * depth * 100) / 100 });
      } else {
        this.jmsForm.patchValue({ measured_quantity: Math.round(l * b * 100) / 100 });
      }
    }
  }

  // --- JMS Modal ---
  openCreateJMSModal(): void {
    this.jmsForm.reset({
      work_order_id: this.workOrders()[0]?.id || null,
      jms_number: `JMS-WO${(this.jointMeasurements().length + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`,
      measurement_date: new Date().toISOString().split('T')[0],
      location_floor: 'Tower 1 - Floor 4 Beam & Slab B4-S4',
      trade_item: 'Reinforcement Binding & Shuttering',
      unit_of_measure: 'SFT',
      measured_length: 50,
      measured_breadth: 20,
      measured_depth: 0,
      measured_quantity: 1000,
      unit_rate: 35,
      verified_by_site_engineer: 'Engr. Tanvir Ahmed (Site In-Charge)',
      subcontractor_representative: 'Md. Rafiqul Islam (Project Lead)'
    });
    this.isCreateJMSModalOpen.set(true);
  }

  closeCreateJMSModal(): void {
    this.isCreateJMSModalOpen.set(false);
  }

  submitJMS(): void {
    if (this.jmsForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createJointMeasurement(this.jmsForm.value).subscribe({
      next: (jms) => {
        this.jointMeasurements.update(list => [jms, ...list]);
        this.isSubmitting.set(false);
        this.closeCreateJMSModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'JMS creation failed');
        this.isSubmitting.set(false);
      }
    });
  }

  // --- Work Order Modal ---
  openCreateWOModal(): void {
    this.woForm.reset({
      project_id: this.projects()[0]?.id || null,
      contractor_id: this.contractors()[0]?.id || null,
      contract_type: 'CIVIL_SUPERSTRUCTURE',
      total_contract_value: 50000000,
      retention_money_percent: 5,
      defect_liability_months: 12,
      scope_of_work: 'Complete RCC structure, columns, shear walls, and post-tensioned floor slabs.'
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

  // --- RA Bill Modal ---
  openCreateBillModal(): void {
    const nextBillNo = `RA-BILL-${(this.raBills().length + 1).toString().padStart(2, '0')}`;
    this.billForm.reset({
      work_order_id: this.workOrders()[0]?.id || null,
      ra_bill_number: nextBillNo,
      bill_date: new Date().toISOString().split('T')[0],
      billing_period_start: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      billing_period_end: new Date().toISOString().split('T')[0],
      gross_work_certified_amount: 2500000,
      retention_percent: 5,
      advance_recovery_deducted: 100000,
      material_store_recovery_amount: 50000,
      tds_rate: 5,
      vds_rate: 5,
      remarks: 'Verified against joint measurement sheets.'
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

  // --- Digital Signature & Approval Chain Modal ---
  openSignModal(bill: RABill): void {
    this.selectedBill.set(bill);
    // Determine next role
    let nextRole = 'QUANTITY_SURVEYOR';
    if (bill.status === 'VERIFIED_BY_ENGINEER') {
      nextRole = 'QUANTITY_SURVEYOR';
    } else if (bill.status === 'VERIFIED_BY_QS') {
      nextRole = 'PROJECT_DIRECTOR';
    } else if (bill.status === 'APPROVED_BY_PD') {
      nextRole = 'ACCOUNTS';
    }

    this.signForm.reset({
      role: nextRole,
      signatory_name: nextRole === 'ACCOUNTS' ? 'Head of Finance & Accounts' : 'Engr. Verification Officer',
      action: 'APPROVE',
      approval_notes: 'Verified and approved in accordance with site measurements.'
    });
    this.isSignModalOpen.set(true);
  }

  closeSignModal(): void {
    this.isSignModalOpen.set(false);
    this.selectedBill.set(null);
  }

  submitSignature(): void {
    const bill = this.selectedBill();
    if (!bill || this.signForm.invalid) return;

    this.isSubmitting.set(true);
    this.constructionService.signRABill(bill.id, this.signForm.value).subscribe({
      next: (updated) => {
        this.raBills.update(list => list.map(b => b.id === updated.id ? updated : b));
        this.isSubmitting.set(false);
        this.closeSignModal();
        if (updated.status === 'ACCOUNTS_VOUCHER_POSTED') {
          alert(`🎉 RA Bill #${updated.ra_bill_number} Fully Approved!\nAccounts Journal Voucher Created: ${updated.accounts_journal_voucher_ref}`);
        }
      },
      error: (err) => {
        alert(err?.error?.detail || 'Signature submission failed');
        this.isSubmitting.set(false);
      }
    });
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }
}
