import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CWIPAllocationService } from '../../../../core/services/cwip-allocation.service';
import { ProjectService } from '../../../../core/services/project.service';
import { CWIPAllocationCreatePayload } from '../../../../core/models/cwip-allocation.model';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-cwip-allocation-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  templateUrl: './allocation-form.component.html'
})
export class CWIPAllocationFormComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cwipService = inject(CWIPAllocationService);
  private projectService = inject(ProjectService);

  loading: boolean = false;
  submitting: boolean = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;

  projectOptions: SelectOption[] = [];
  towerOptions: SelectOption[] = [];

  accountOptions: SelectOption[] = [
    { value: 1220, label: '1220 - Construction Work in Progress (CWIP)' },
    { value: 1150, label: '1150 - Construction Raw Material Inventory' },
    { value: 5010, label: '5010 - Subcontractor Labour & Civil Works' },
    { value: 2130, label: '2130 - Accrued Site Expenses & Contractor Payables' },
    { value: 5020, label: '5020 - Engineering & Consultancy Fees' },
    { value: 5030, label: '5030 - Heavy Equipment Rental & Depreciation' }
  ];

  formData: CWIPAllocationCreatePayload = {
    allocation_ref: `CWIP-ALC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    allocation_date: new Date().toISOString().substring(0, 10),
    allocation_method: 'DIRECT',
    cost_category: 'DIRECT_MATERIAL',
    source_module: 'SITE_EXPENSE',
    source_transaction_ref: '',
    original_project_id: null,
    original_cost_center_id: null,
    original_amount: 0,
    target_project_id: 1,
    target_tower_id: null,
    work_package_id: null,
    work_package_name: 'Superstructure Civil Works',
    boq_item_id: null,
    boq_item_ref: '',
    allocated_amount: 0,
    allocation_basis_description: 'Direct site charge as per certified engineer inspection report.',
    basis_metric_value: 100,
    basis_metric_unit: '%',
    cwip_account_id: 1220,
    credit_account_id: 1150,
    notes: 'Preserves original accounting voucher. Transferred into project CWIP account.'
  };

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projectOptions = (projects || []).map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
        if (this.projectOptions.length > 0 && !this.formData.target_project_id) {
          this.formData.target_project_id = this.projectOptions[0].value;
          this.onTargetProjectChange(this.formData.target_project_id);
        } else if (this.formData.target_project_id) {
          this.onTargetProjectChange(this.formData.target_project_id);
        }
      },
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  onTargetProjectChange(projectId: any): void {
    const pId = Number(projectId);
    this.formData.target_project_id = pId;
    this.towerOptions = [];
    this.formData.target_tower_id = null;

    if (!pId) return;

    this.projectService.getTowers(pId).subscribe({
      next: (towers) => {
        this.towerOptions = (towers || []).map(t => ({
          value: t.id,
          label: `${t.tower_name} (${(t.residential_floors || 0) + (t.commercial_floors || 0)} Floors)`
        }));
      },
      error: (err) => console.error('Failed to load towers:', err)
    });
  }

  onMethodChange(method: string): void {
    this.formData.allocation_method = method;
    if (method === 'DIRECT') {
      this.formData.basis_metric_unit = '%';
      this.formData.basis_metric_value = 100;
      this.formData.allocated_amount = this.formData.original_amount;
      this.formData.allocation_basis_description = 'Direct 100% cost charged to incurring project.';
    } else if (method === 'AREA_BASED') {
      this.formData.basis_metric_unit = 'Sq.Ft';
      this.formData.allocation_basis_description = 'Allocated based on approved floor / saleable area ratio across building towers.';
    } else if (method === 'QUANTITY_BASED') {
      this.formData.basis_metric_unit = 'Units/CFT';
      this.formData.allocation_basis_description = 'Allocated based on measured physical work quantities verified by site surveyor.';
    } else if (method === 'USAGE_BASED') {
      this.formData.basis_metric_unit = 'Machine-Hours';
      this.formData.allocation_basis_description = 'Allocated based on equipment operating logbook hours.';
    } else if (method === 'PERCENTAGE') {
      this.formData.basis_metric_unit = '%';
      this.formData.allocation_basis_description = 'Approved allocation percentage based on executive project cost sharing agreement.';
    }
  }

  onCostCategoryChange(category: string): void {
    this.formData.cost_category = category;
    if (category === 'DIRECT_MATERIAL') {
      this.formData.credit_account_id = 1150; // Inventory Raw Materials
    } else if (category === 'DIRECT_LABOUR' || category === 'CONTRACTOR_CERTIFIED_WORK') {
      this.formData.credit_account_id = 5010; // Subcontractor Labour
    } else if (category === 'ENGINEERING_CONSULTANCY') {
      this.formData.credit_account_id = 5020; // Consultancy Fees
    } else if (category === 'EQUIPMENT_USAGE_DEPRECIATION') {
      this.formData.credit_account_id = 5030; // Equipment & Depreciation
    } else {
      this.formData.credit_account_id = 2130; // Accrued Payables
    }
  }

  onWorkPackageSelect(pkg: any): void {
    if (pkg && pkg.label) {
      this.formData.work_package_name = pkg.label;
    } else if (typeof pkg === 'string') {
      this.formData.work_package_name = pkg;
    }
  }

  calculateAllocated(): void {
    if (this.formData.allocation_method === 'DIRECT') {
      this.formData.allocated_amount = this.formData.original_amount;
    } else if (this.formData.allocation_method === 'PERCENTAGE') {
      const pct = Number(this.formData.basis_metric_value || 0);
      this.formData.allocated_amount = Math.round((Number(this.formData.original_amount || 0) * pct) / 100);
    }
  }

  saveAllocation(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (!this.formData.target_project_id) {
      this.errorMessage = 'Target project is required.';
      return;
    }
    if (!this.formData.allocated_amount || this.formData.allocated_amount <= 0) {
      this.errorMessage = 'Allocated amount must be greater than zero ৳.';
      return;
    }

    this.submitting = true;
    this.cwipService.createAllocation(this.formData).subscribe({
      next: (res) => {
        this.submitting = false;
        this.successMessage = `Cost allocation #${res.allocation_ref} posted successfully with GL Voucher #${res.gl_voucher_id || 'AUTO'}!`;
        setTimeout(() => {
          this.router.navigate(['/accounts/construction-cwip']);
        }, 1200);
      },
      error: (err) => {
        this.submitting = false;
        this.errorMessage = err?.error?.detail || 'Failed to post cost allocation. Please verify data.';
      }
    });
  }
}
