import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectExpenditureTransaction } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SelectOption
} from '../../../../shared/components';

@Component({
  selector: 'app-project-expenditure-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ProjectIncomeExpenditureNavComponent,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  template: `
    <div class="space-y-6">
      <app-project-income-expenditure-nav></app-project-income-expenditure-nav>

      <app-card-container
        [title]="isEditMode() ? 'Edit Project Cost & Expenditure' : 'Record New Project Expenditure'"
        [subtitle]="'Section 11.3: Track cost transactions across 12 eligible categories with 11.1 financial dimension tagging and PO overlap reconciliation'"
        [badge]="isEditMode() ? 'Editing ' + (model.expenditure_number || '') : 'New Cost Transaction'"
      >
        <div card-actions>
          <a
            routerLink="/accounts/project-income-expenditure/expenditure"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Back to Expenditure Register</span>
          </a>
        </div>

        <form (ngSubmit)="saveExpenditure()" class="space-y-6">
          <!-- Section 1: 11.1 Financial Dimensions Tagging -->
          <div class="border-b border-border pb-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-foreground">1. Financial Dimensions Tagging (Section 11.1)</h3>
              <span class="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                11.1 Dimension Tagged
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Company & Branch -->
              <div>
                <app-searchable-select
                  label="Company & Operating Branch *"
                  categoryCode="COMPANY_BRANCH"
                  placeholder="Select branch..."
                  [(ngModel)]="model.branch_name"
                  name="branch_name"
                  [allowCreateNew]="true"
                  [required]="true"
                ></app-searchable-select>
              </div>

              <!-- Project (Dynamic Searchable Select) -->
              <div>
                <app-searchable-select
                  label="Project Master *"
                  [options]="projectOptions()"
                  placeholder="Select project..."
                  [value]="model.project_id"
                  (selectionChange)="onProjectSelected($event)"
                  [allowCreateNew]="false"
                  [required]="true"
                ></app-searchable-select>
              </div>

              <!-- Department / Cost Centre -->
              <div>
                <app-custom-input
                  label="Department / Cost Centre"
                  placeholder="e.g. Civil Engineering, CC-BAN-T2"
                  [(ngModel)]="model.department_name"
                  name="department_name"
                ></app-custom-input>
              </div>

              <!-- Building / Tower -->
              <div>
                <app-custom-input
                  label="Building or Tower (Optional)"
                  placeholder="e.g. Tower B, South Block"
                  [(ngModel)]="model.tower_name"
                  name="tower_name"
                ></app-custom-input>
              </div>

              <!-- Unit / Space Reference -->
              <div>
                <app-custom-input
                  label="Unit Reference (Optional)"
                  placeholder="e.g. Commercial Unit C-01"
                  [(ngModel)]="model.unit_number"
                  name="unit_number"
                ></app-custom-input>
              </div>

              <!-- Construction Phase / Work Package -->
              <div>
                <app-searchable-select
                  label="Construction Phase / Work Package *"
                  categoryCode="CONSTRUCTION_PHASE"
                  placeholder="Select work package..."
                  [(ngModel)]="model.construction_phase"
                  name="construction_phase"
                  [allowCreateNew]="true"
                  [required]="true"
                ></app-searchable-select>
              </div>
            </div>
          </div>

          <!-- Section 2: 12 Expenditure Categories (11.3) & Party Tagging -->
          <div class="border-b border-border pb-5">
            <h3 class="text-sm font-bold text-foreground mb-3">2. Expenditure Classification & Vendor/Contractor</h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Cost Category (12 Eligible Categories) -->
              <div>
                <app-searchable-select
                  label="Cost Category (Section 11.3) *"
                  categoryCode="EXPENDITURE_CATEGORY"
                  placeholder="Select 1 of 12 cost categories..."
                  [(ngModel)]="model.cost_category"
                  name="cost_category"
                  [allowCreateNew]="true"
                  [required]="true"
                  hint="Land, Civil, MEP, Finishing, Contractor, Equipment, Overheads, etc."
                ></app-searchable-select>
              </div>

              <!-- Party Type -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">Supplier / Party Type</label>
                <select
                  [(ngModel)]="model.party_type"
                  name="party_type"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Supplier">Material Supplier / Vendor</option>
                  <option value="Contractor">Construction Subcontractor</option>
                  <option value="Consultant">Architect / Engineering Consultant</option>
                  <option value="Government_Authority">Statutory Authority (RAJUK/NBR/City Corp)</option>
                  <option value="Bank">Commercial Bank / Financial Institution</option>
                </select>
              </div>

              <!-- Party Name -->
              <div>
                <app-custom-input
                  label="Supplier / Contractor Name *"
                  placeholder="e.g. BSRM Steels Ltd., Shah Cement, Vetting Architect"
                  [(ngModel)]="model.party_name"
                  name="party_name"
                  [required]="true"
                ></app-custom-input>
              </div>

              <!-- Budget Line Master -->
              <div>
                <app-searchable-select
                  label="Budget Line Master Code"
                  categoryCode="BUDGET_LINE"
                  placeholder="Select budget line..."
                  [(ngModel)]="model.budget_line_code"
                  name="budget_line_code"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>

              <!-- Transaction Date -->
              <div>
                <app-custom-input
                  label="Transaction Date *"
                  type="date"
                  [(ngModel)]="model.transaction_date"
                  name="transaction_date"
                  [required]="true"
                ></app-custom-input>
              </div>

              <!-- Expenditure Type -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">Expenditure Type</label>
                <select
                  [(ngModel)]="model.expenditure_type"
                  name="expenditure_type"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="POSTED_ACTUAL">POSTED_ACTUAL (Certified Invoiced Work)</option>
                  <option value="COMMITTED_PO">COMMITTED_PO (Approved PO/WO Not Yet Invoiced)</option>
                  <option value="ACCRUED_UNPAID">ACCRUED_UNPAID (Provisioned Work Done)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 3: Financial Cost Accounting & Overlap Reconciliation (11.4) -->
          <div class="border-b border-border pb-5">
            <div class="flex items-center justify-between mb-1">
              <h3 class="text-sm font-bold text-foreground">3. Financial Values & Overlap Reconciliation (Section 11.4)</h3>
              <span class="text-[11px] font-semibold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Prevents PO Double-Counting
              </span>
            </div>
            <p class="text-xs text-muted-foreground mb-4">
              Tagging the original Purchase Order / Work Order reference automatically reconciles committed cost to avoid double-counting in Section 11.4 reports.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <!-- Gross Amount -->
              <div>
                <app-custom-input
                  label="Gross Bill Amount (BDT) *"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.gross_amount"
                  (ngModelChange)="recalculateNetPayable()"
                  name="gross_amount"
                  [required]="true"
                ></app-custom-input>
              </div>

              <!-- TDS/VDS Withholding -->
              <div>
                <app-custom-input
                  label="TDS & VDS Deducted (BDT)"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.tax_vat_deducted"
                  (ngModelChange)="recalculateNetPayable()"
                  name="tax_vat_deducted"
                  hint="Section 52 TDS withholding"
                ></app-custom-input>
              </div>

              <!-- Retention Money -->
              <div>
                <app-custom-input
                  label="Retention Deducted (BDT)"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.retention_deducted"
                  (ngModelChange)="recalculateNetPayable()"
                  name="retention_deducted"
                  hint="5% Defect liability retention"
                ></app-custom-input>
              </div>

              <!-- Net Payable (Calculated) -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">Net Payable (BDT)</label>
                <div class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-red-500/10 text-red-600 dark:text-red-400 font-mono font-bold">
                  ৳{{ model.net_payable_amount | number:'1.2-2' }}
                </div>
                <p class="text-[11px] text-muted-foreground mt-1">Gross minus TDS and Retention</p>
              </div>

              <!-- Paid Amount -->
              <div>
                <app-custom-input
                  label="Cash Paid (BDT) *"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.paid_amount"
                  name="paid_amount"
                  hint="Actual disbursed payment"
                  [required]="true"
                ></app-custom-input>
              </div>
            </div>

            <!-- Overlap PO Reference -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-3 border-t border-dashed border-border">
              <div>
                <app-custom-input
                  label="Committed Purchase Order (PO) / Work Order (WO) Ref"
                  placeholder="e.g. PO-2026-0045, WO-CIVIL-09"
                  [(ngModel)]="model.committed_po_reference"
                  name="committed_po_reference"
                  hint="Critical: Reconciles overlap so this invoiced PO is NOT double-counted in committed cost"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Supplier Invoice / Contractor RA Bill Ref"
                  placeholder="e.g. INV-BSRM-8890, RA-BILL-04"
                  [(ngModel)]="model.reference_no"
                  name="reference_no"
                ></app-custom-input>
              </div>
            </div>
          </div>

          <!-- Section 4: Audit & Status -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-foreground mb-1.5">Payment Method</label>
              <select
                [(ngModel)]="model.payment_method"
                name="payment_method"
                class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Bank_Transfer">Corporate Bank Transfer (BEFTN/RTGS)</option>
                <option value="Bank_Cheque">Account Payee Cheque</option>
                <option value="Cash">Site Imprest Cash Voucher</option>
                <option value="MFS">Corporate MFS Disbursal</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-foreground mb-1.5">Posting Status</label>
              <select
                [(ngModel)]="model.status"
                name="status"
                class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="POSTED">POSTED (General Ledger & Project Report)</option>
                <option value="APPROVED">APPROVED (Awaiting Payment Disbursal)</option>
                <option value="DRAFT">DRAFT (Site Engineer Preparation)</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <app-custom-textarea
                label="Expenditure Purpose & Technical Remarks"
                placeholder="Details of materials received, quality inspection clearance, site store issue challan..."
                [(ngModel)]="model.notes"
                name="notes"
                rows="3"
              ></app-custom-textarea>
            </div>
          </div>

          <!-- Submit Bar -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <a
              routerLink="/accounts/project-income-expenditure/expenditure"
              class="px-5 py-2.5 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-secondary text-foreground transition-colors"
            >
              Cancel
            </a>

            <button
              type="submit"
              [disabled]="saving()"
              class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
            >
              @if (saving()) {
                <div class="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
              }
              <span>{{ saving() ? 'Saving Expenditure...' : (isEditMode() ? 'Update Project Expenditure' : 'Post Project Expenditure') }}</span>
            </button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class ProjectExpenditureFormComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  expenditureId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  saving = signal<boolean>(false);
  projectOptions = signal<SelectOption[]>([]);

  model: ProjectExpenditureTransaction = {
    transaction_date: new Date().toISOString().split('T')[0],
    company_name: 'Bengal Real Estate Ltd.',
    branch_name: 'Head Office - Gulshan',
    project_id: 1,
    department_name: 'Civil Engineering',
    construction_phase: 'SUPERSTRUCTURE',
    cost_category: 'CIVIL_CONSTRUCTION',
    party_type: 'Supplier',
    party_name: '',
    gross_amount: 0,
    tax_vat_deducted: 0,
    retention_deducted: 0,
    net_payable_amount: 0,
    paid_amount: 0,
    expenditure_type: 'POSTED_ACTUAL',
    payment_status: 'PAID',
    payment_method: 'Bank_Transfer',
    status: 'POSTED',
    notes: ''
  };

  ngOnInit(): void {
    this.loadProjects();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.expenditureId.set(id);
      this.isEditMode.set(true);
      this.service.getExpenditure(id).subscribe({
        next: (data) => {
          this.model = { ...data };
        }
      });
    }
  }

  loadProjects(): void {
    this.http.get<any>(`${environment.apiUrl}/projects`).subscribe({
      next: (res) => {
        const projs = res.items || res.data || res;
        if (Array.isArray(projs)) {
          this.projectOptions.set(projs.map((p: any) => ({
            value: p.id,
            label: p.project_name,
            subLabel: p.project_code
          })));
          if (!this.model.project_id && projs.length > 0) {
            this.model.project_id = projs[0].id;
          }
        }
      }
    });
  }

  onProjectSelected(opt: any): void {
    if (opt && opt.value) {
      this.model.project_id = opt.value;
    }
  }

  recalculateNetPayable(): void {
    const gross = Number(this.model.gross_amount) || 0;
    const tax = Number(this.model.tax_vat_deducted) || 0;
    const ret = Number(this.model.retention_deducted) || 0;
    this.model.net_payable_amount = Math.max(0, gross - tax - ret);
  }

  saveExpenditure(): void {
    this.recalculateNetPayable();
    this.saving.set(true);

    if (this.isEditMode() && this.expenditureId()) {
      this.service.updateExpenditure(this.expenditureId()!, this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/expenditure']);
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createExpenditure(this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/expenditure']);
        },
        error: () => this.saving.set(false)
      });
    }
  }
}
