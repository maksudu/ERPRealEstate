import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectIncomeTransaction } from '../../../../core/models/project-income-expenditure.model';
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
  selector: 'app-project-income-form',
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
        [title]="isEditMode() ? 'Edit Project Income & Revenue Recognition' : 'Record New Project Income'"
        [subtitle]="'Section 11.2: Tag income with 9 financial dimensions and recognize revenue under approved accounting policy'"
        [badge]="isEditMode() ? 'Editing ' + (model.income_number || '') : 'New Income Entry'"
      >
        <div card-actions>
          <a
            routerLink="/accounts/project-income-expenditure/income"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Back to Income Register</span>
          </a>
        </div>

        <form (ngSubmit)="saveIncome()" class="space-y-6">
          <!-- Section 1: Financial Dimensions (11.1) -->
          <div class="border-b border-border pb-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-foreground">1. Financial Dimensions Tagging</h3>
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

              <!-- Project (Dynamic Searchable Options) -->
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
                  placeholder="e.g. Sales & Revenue, CC-GUL-T1"
                  [(ngModel)]="model.department_name"
                  name="department_name"
                ></app-custom-input>
              </div>

              <!-- Building / Tower -->
              <div>
                <app-custom-input
                  label="Building / Tower (Optional)"
                  placeholder="e.g. Tower 1, Commercial Wing"
                  [(ngModel)]="model.tower_name"
                  name="tower_name"
                ></app-custom-input>
              </div>

              <!-- Unit / Flat -->
              <div>
                <app-custom-input
                  label="Unit / Space Reference (Optional)"
                  placeholder="e.g. Flat 12A, Shop G-04"
                  [(ngModel)]="model.unit_number"
                  name="unit_number"
                ></app-custom-input>
              </div>

              <!-- Construction Phase -->
              <div>
                <app-searchable-select
                  label="Construction Phase / Work Package"
                  categoryCode="CONSTRUCTION_PHASE"
                  placeholder="Select construction phase..."
                  [(ngModel)]="model.construction_phase"
                  name="construction_phase"
                  [allowCreateNew]="true"
                ></app-searchable-select>
              </div>
            </div>
          </div>

          <!-- Section 2: Income Classification & Revenue Recognition Policy (11.2) -->
          <div class="border-b border-border pb-5">
            <h3 class="text-sm font-bold text-foreground mb-3">2. Income Category & Accounting Recognition Policy</h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Cost/Income Category -->
              <div>
                <app-searchable-select
                  label="Income Category (Section 11.2) *"
                  categoryCode="INCOME_TYPE"
                  placeholder="Select income category..."
                  [(ngModel)]="model.cost_category"
                  name="cost_category"
                  [allowCreateNew]="true"
                  [required]="true"
                ></app-searchable-select>
              </div>

              <!-- Revenue Recognition Policy -->
              <div>
                <app-searchable-select
                  label="Recognition Policy *"
                  categoryCode="RECOGNITION_POLICY"
                  placeholder="Select policy..."
                  [(ngModel)]="model.recognition_policy"
                  name="recognition_policy"
                  [allowCreateNew]="true"
                  [required]="true"
                ></app-searchable-select>
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

              <!-- Customer / Party Name -->
              <div>
                <app-custom-input
                  label="Customer / Buyer Party Name"
                  placeholder="e.g. Engr. Tanvir Ahmed, Square Pharmaceuticals Ltd."
                  [(ngModel)]="model.party_name"
                  name="party_name"
                ></app-custom-input>
              </div>

              <!-- Payment Method -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">Payment Method</label>
                <select
                  [(ngModel)]="model.payment_method"
                  name="payment_method"
                  class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Bank_Transfer">Bank Transfer (EFT/RTGS)</option>
                  <option value="Bank_Cheque">Cheque / Pay Order</option>
                  <option value="Cash">Cash Receipt</option>
                  <option value="MFS">bKash / Nagad Corporate MFS</option>
                </select>
              </div>

              <!-- Reference No & Date -->
              <div>
                <app-custom-input
                  label="Transaction Date *"
                  type="date"
                  [(ngModel)]="model.transaction_date"
                  name="transaction_date"
                  [required]="true"
                ></app-custom-input>
              </div>
            </div>
          </div>

          <!-- Section 3: Financial Recognition Amounts (IFRS 15 vs Cash Collections) -->
          <div class="border-b border-border pb-5">
            <h3 class="text-sm font-bold text-foreground mb-1">3. Financial Values & Revenue Recognition</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Under IFRS 15, customer cash collections are not automatically recognized as revenue. Calculate unearned revenue automatically.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <!-- Contract Value -->
              <div>
                <app-custom-input
                  label="Contract Value (BDT)"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.contract_value"
                  name="contract_value"
                  hint="Total contractual agreement amount"
                ></app-custom-input>
              </div>

              <!-- Recognized Revenue (Approved Policy) -->
              <div>
                <app-custom-input
                  label="Recognized Revenue (BDT) *"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.recognized_amount"
                  (ngModelChange)="recalculateUnearned()"
                  name="recognized_amount"
                  hint="Recognized under approved POC/Milestone policy"
                  [required]="true"
                ></app-custom-input>
              </div>

              <!-- Actual Cash Inflow Collected -->
              <div>
                <app-custom-input
                  label="Cash Inflow Collected (BDT) *"
                  type="number"
                  placeholder="0.00"
                  [(ngModel)]="model.cash_collected_amount"
                  (ngModelChange)="recalculateUnearned()"
                  name="cash_collected_amount"
                  hint="Actual cash realized into bank/escrow"
                  [required]="true"
                ></app-custom-input>
              </div>

              <!-- Unearned / Advances Liability -->
              <div>
                <label class="block text-xs font-semibold text-foreground mb-1.5">
                  Unearned / Advances (BDT)
                </label>
                <div class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                  ৳{{ model.unearned_revenue | number:'1.2-2' }}
                </div>
                <p class="text-[11px] text-muted-foreground mt-1">Advances exceeding recognized revenue</p>
              </div>
            </div>
          </div>

          <!-- Section 4: Audit & Reference Notes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <app-custom-input
                label="Deed / Booking Reference Number"
                placeholder="e.g. BOK-2026-089, AGR-DEED-11"
                [(ngModel)]="model.reference_no"
                name="reference_no"
              ></app-custom-input>
            </div>

            <div>
              <label class="block text-xs font-semibold text-foreground mb-1.5">Posting Status</label>
              <select
                [(ngModel)]="model.status"
                name="status"
                class="w-full px-3 py-2 text-xs rounded-xl border border-border bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="POSTED">POSTED (General Ledger & Project Report)</option>
                <option value="DRAFT">DRAFT (Pending Manager Sign-off)</option>
                <option value="AUDITED">AUDITED (Verified by Internal Audit)</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <app-custom-textarea
                label="Transaction Notes & Auditor Comments"
                placeholder="Details of revenue recognition policy, installment milestones, and bank deposit references..."
                [(ngModel)]="model.notes"
                name="notes"
                rows="3"
              ></app-custom-textarea>
            </div>
          </div>

          <!-- Submit Bar -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <a
              routerLink="/accounts/project-income-expenditure/income"
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
              <span>{{ saving() ? 'Saving Income...' : (isEditMode() ? 'Update Project Income' : 'Post Project Income') }}</span>
            </button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class ProjectIncomeFormComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  incomeId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  saving = signal<boolean>(false);
  projectOptions = signal<SelectOption[]>([]);

  model: ProjectIncomeTransaction = {
    transaction_date: new Date().toISOString().split('T')[0],
    company_name: 'Bengal Real Estate Ltd.',
    branch_name: 'Head Office - Gulshan',
    project_id: 1,
    department_name: 'Sales & Revenue',
    cost_category: 'PROPERTY_SALE',
    recognition_policy: 'POC_IFRS15',
    payment_method: 'Bank_Transfer',
    contract_value: 0,
    recognized_amount: 0,
    cash_collected_amount: 0,
    unearned_revenue: 0,
    status: 'POSTED',
    notes: ''
  };

  ngOnInit(): void {
    this.loadProjects();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.incomeId.set(id);
      this.isEditMode.set(true);
      this.service.getIncome(id).subscribe({
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

  recalculateUnearned(): void {
    const coll = Number(this.model.cash_collected_amount) || 0;
    const rec = Number(this.model.recognized_amount) || 0;
    this.model.unearned_revenue = Math.max(0, coll - rec);
  }

  saveIncome(): void {
    this.recalculateUnearned();
    this.saving.set(true);

    if (this.isEditMode() && this.incomeId()) {
      this.service.updateIncome(this.incomeId()!, this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/income']);
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createIncome(this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/income']);
        },
        error: () => this.saving.set(false)
      });
    }
  }
}
