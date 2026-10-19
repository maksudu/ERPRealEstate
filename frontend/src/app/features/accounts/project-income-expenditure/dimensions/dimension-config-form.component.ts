import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectIncomeExpenditureService } from '../../../../core/services/project-income-expenditure.service';
import { ProjectFinancialDimensionConfig } from '../../../../core/models/project-income-expenditure.model';
import { ProjectIncomeExpenditureNavComponent } from '../project-income-expenditure-nav.component';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-dimension-config-form',
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
        [title]="isEditMode() ? 'Edit Dimension Configuration Rule' : 'New Project Financial Dimension Rule'"
        [subtitle]="'Configure which financial dimensions are mandatory for this account or transaction type'"
        [badge]="isEditMode() ? 'Rule #' + ruleId() : 'New Rule'"
      >
        <div card-actions>
          <a
            routerLink="/accounts/project-income-expenditure/dimensions"
            class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            <span>Back to Rules List</span>
          </a>
        </div>

        <form (ngSubmit)="saveConfig()" class="space-y-6">
          <!-- Section 1: Scope & Target -->
          <div class="border-b border-border pb-5">
            <h3 class="text-sm font-bold text-foreground mb-1">1. Rule Target & Applicability</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Select whether this rule applies to a specific General Ledger account, an entire Account Type, or a specific Transaction Type.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <app-searchable-select
                  label="Transaction Type"
                  categoryCode="TRANSACTION_TYPE"
                  placeholder="Select transaction type..."
                  [(ngModel)]="model.transaction_type"
                  name="transaction_type"
                  [allowCreateNew]="true"
                  hint="Rule will enforce dimensions on this transaction type"
                ></app-searchable-select>
              </div>

              <div>
                <app-custom-input
                  label="Target Account Type (Optional)"
                  placeholder="e.g. Revenue, Direct_Cost, Expense"
                  [(ngModel)]="model.account_type"
                  name="account_type"
                  hint="Applies to all accounts of this classification"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  label="Target Account Code (Optional)"
                  placeholder="e.g. 4010-01, 5020-02"
                  [(ngModel)]="model.account_code"
                  name="account_code"
                  hint="Leave blank for all accounts in category"
                ></app-custom-input>
              </div>
            </div>
          </div>

          <!-- Section 2: 9 Financial Dimension Mandatory Toggles -->
          <div class="border-b border-border pb-5">
            <h3 class="text-sm font-bold text-foreground mb-1">2. Mandatory Dimension Flags (Section 11.1)</h3>
            <p class="text-xs text-muted-foreground mb-4">
              Toggle which of the 9 core project financial dimensions must be present before transactions are posted.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <!-- Dimension 1: Company & Branch -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_company"
                  [(ngModel)]="model.is_company_branch_mandatory"
                  name="is_company_branch_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_company" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">1. Company & Branch</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Operating subsidiary & corporate branch</div>
                </label>
              </div>

              <!-- Dimension 2: Project -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_project"
                  [(ngModel)]="model.is_project_mandatory"
                  name="is_project_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_project" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">2. Project</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Development project master reference</div>
                </label>
              </div>

              <!-- Dimension 3: Tower -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_tower"
                  [(ngModel)]="model.is_tower_mandatory"
                  name="is_tower_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_tower" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">3. Building or Tower</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Specific tower/block within multi-tower scheme</div>
                </label>
              </div>

              <!-- Dimension 4: Unit -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_unit"
                  [(ngModel)]="model.is_unit_mandatory"
                  name="is_unit_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_unit" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">4. Unit / Apartment</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Individual flat, shop or commercial space</div>
                </label>
              </div>

              <!-- Dimension 5: Cost Centre -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_cc"
                  [(ngModel)]="model.is_department_cost_center_mandatory"
                  name="is_department_cost_center_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_cc" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">5. Department / Cost Centre</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Internal department or site WBS cost centre</div>
                </label>
              </div>

              <!-- Dimension 6: Phase -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_phase"
                  [(ngModel)]="model.is_construction_phase_mandatory"
                  name="is_construction_phase_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_phase" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">6. Construction Phase / Work Package</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Substructure, Superstructure, MEP, Finishing</div>
                </label>
              </div>

              <!-- Dimension 7: Cost Category -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_cat"
                  [(ngModel)]="model.is_cost_category_mandatory"
                  name="is_cost_category_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_cat" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">7. Cost / Revenue Category</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Income/expense classification (Sec 11.2/11.3)</div>
                </label>
              </div>

              <!-- Dimension 8: Party -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_party"
                  [(ngModel)]="model.is_party_mandatory"
                  name="is_party_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_party" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">8. Supplier or Customer Party</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Customer for income, Vendor/Subcontractor for cost</div>
                </label>
              </div>

              <!-- Dimension 9: Budget Line -->
              <div class="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="dim_budget"
                  [(ngModel)]="model.is_budget_line_mandatory"
                  name="is_budget_line_mandatory"
                  class="mt-1 h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                />
                <label for="dim_budget" class="cursor-pointer">
                  <div class="text-xs font-bold text-foreground">9. Budget Line Master</div>
                  <div class="text-[11px] text-muted-foreground mt-0.5">Enforces hard link to approved project budget line</div>
                </label>
              </div>
            </div>
          </div>

          <!-- Section 3: Notes & Activation -->
          <div>
            <app-custom-textarea
              label="Policy & Auditor Remarks"
              placeholder="e.g. Mandated under Corporate Accounting Policy Manual Section 11.1..."
              [(ngModel)]="model.notes"
              name="notes"
              rows="3"
            ></app-custom-textarea>
          </div>

          <!-- Submit Bar -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <a
              routerLink="/accounts/project-income-expenditure/dimensions"
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
              <span>{{ saving() ? 'Saving Configuration...' : (isEditMode() ? 'Update Dimension Rule' : 'Save Dimension Rule') }}</span>
            </button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class DimensionConfigFormComponent implements OnInit {
  private service = inject(ProjectIncomeExpenditureService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ruleId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  saving = signal<boolean>(false);

  model: ProjectFinancialDimensionConfig = {
    transaction_type: 'ALL',
    account_type: '',
    account_code: '',
    is_company_branch_mandatory: true,
    is_project_mandatory: true,
    is_tower_mandatory: false,
    is_unit_mandatory: false,
    is_department_cost_center_mandatory: true,
    is_construction_phase_mandatory: false,
    is_cost_category_mandatory: true,
    is_party_mandatory: false,
    is_budget_line_mandatory: false,
    notes: '',
    is_active: true
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      this.ruleId.set(id);
      this.isEditMode.set(true);
      this.service.getDimensionConfig(id).subscribe({
        next: (data) => {
          this.model = { ...data };
        }
      });
    }
  }

  saveConfig(): void {
    this.saving.set(true);
    if (this.isEditMode() && this.ruleId()) {
      this.service.updateDimensionConfig(this.ruleId()!, this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/dimensions']);
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.service.createDimensionConfig(this.model).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/accounts/project-income-expenditure/dimensions']);
        },
        error: () => this.saving.set(false)
      });
    }
  }
}
