import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoanFinancingService } from '../../../../core/services/loan-financing.service';
import { LoansFinancingNavComponent } from '../loans-financing-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-loan-interest-cwip',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoansFinancingNavComponent,
    CardContainerComponent,
    ModalComponent
  ],
  template: `
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <app-loans-financing-nav></app-loans-financing-nav>

      <!-- IAS 23 Strict Accounting Compliance Banner -->
      <div class="bg-card border border-amber-500/30 rounded-xl p-5 shadow-xs">
        <div class="flex items-start gap-4">
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="space-y-1.5 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-foreground text-sm">14.3 Interest Accounting & IAS 23 Borrowing Cost Capitalization</h3>
              <span class="px-2 py-0.5 text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-md font-semibold">
                Mandatory Policy Audit
              </span>
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">
              <strong class="text-foreground">Policy Rule:</strong> Do not automatically capitalize every loan-interest charge into construction WIP. Eligibility depends on the applicable accounting framework, the qualifying asset, and the company's documented accounting policy.
            </p>
            <div class="p-2.5 bg-muted/30 border border-border rounded-lg text-xs font-mono space-y-0.5 text-foreground">
              <div>• Standard Accrual: <span class="text-indigo-600">Dr. Finance Costs (6400)</span> | <span class="text-muted-foreground">Cr. Accrued Interest Payable (2130)</span></div>
              <div>• Approved Capitalization: <span class="text-emerald-600">Dr. Construction WIP (1220)</span> | <span class="text-indigo-600">Cr. Finance Costs (6400)</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Ledger Card -->
      <app-card-container>
        <div class="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">Interest Accrual & CWIP Capitalization Audit Trail</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Review all calculated interest periods, supporting lender statements, and authorized IAS 23 capitalizations.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th class="py-3 px-3.5">Accrual Ref</th>
                <th class="py-3 px-3.5">Calculation Period</th>
                <th class="py-3 px-3.5">Facility / Qualifying Project</th>
                <th class="py-3 px-3.5 text-right">Calculation Basis Balance</th>
                <th class="py-3 px-3.5 text-right">Applied Rate</th>
                <th class="py-3 px-3.5 text-right">Accrued Interest (৳)</th>
                <th class="py-3 px-3.5 text-center">IAS 23 CWIP Status</th>
                <th class="py-3 px-3.5 text-center">GL Vouchers</th>
                <th class="py-3 px-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr *ngIf="loading" class="text-center">
                <td colspan="9" class="py-8 text-muted-foreground">Loading interest accrual audit records...</td>
              </tr>
              <tr *ngIf="!loading && allAccruals.length === 0" class="text-center">
                <td colspan="9" class="py-8 text-muted-foreground">No interest accruals recorded yet.</td>
              </tr>
              <tr *ngFor="let a of allAccruals" class="hover:bg-muted/30 transition-colors">
                <td class="py-3 px-3.5 font-mono font-semibold text-foreground">{{ a.accrual_ref }}</td>
                <td class="py-3 px-3.5">{{ a.period_start | date:'mediumDate' }} - {{ a.period_end | date:'mediumDate' }}</td>
                <td class="py-3 px-3.5">
                  <div class="font-medium text-foreground">{{ a.project_name || a.loan_ref }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ a.lender_name }}</div>
                </td>
                <td class="py-3 px-3.5 text-right font-medium text-foreground">৳{{ a.calculation_basis_balance | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right font-semibold">{{ a.applied_rate_pct }}%</td>
                <td class="py-3 px-3.5 text-right font-bold text-indigo-600">৳{{ a.interest_accrued_amount | number:'1.2-2' }}</td>
                
                <!-- Capitalization Status -->
                <td class="py-3 px-3.5 text-center">
                  <span *ngIf="a.is_capitalized_to_cwip" class="px-2 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                    Capitalized to CWIP (1220)
                  </span>
                  <span *ngIf="!a.is_capitalized_to_cwip" class="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground font-medium">
                    Expensed in P&L
                  </span>
                </td>

                <!-- GL Vouchers -->
                <td class="py-3 px-3.5 text-center">
                  <div class="space-y-0.5">
                    <div class="font-mono text-[10px] text-primary">Accrual #{{ a.gl_accrual_voucher_id || 'Posted' }}</div>
                    <div *ngIf="a.cwip_capitalization_voucher_id" class="font-mono text-[10px] text-emerald-600">CWIP #{{ a.cwip_capitalization_voucher_id }}</div>
                  </div>
                </td>

                <!-- Capitalize Action -->
                <td class="py-3 px-3.5 text-center">
                  <button
                    *ngIf="!a.is_capitalized_to_cwip && a.is_eligible_for_ias23"
                    (click)="openCapitalizeModal(a)"
                    class="px-2.5 py-1 text-[11px] rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700 transition-colors shadow-xs">
                    Capitalize (IAS 23)
                  </button>
                  <span *ngIf="a.is_capitalized_to_cwip" class="text-[11px] text-emerald-600 font-semibold">
                    ✓ Authorized
                  </span>
                  <span *ngIf="!a.is_capitalized_to_cwip && !a.is_eligible_for_ias23" class="text-[10px] text-muted-foreground">
                    Non-qualifying
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Capitalize Modal -->
      <app-modal
        [isOpen]="showModal"
        [title]="'Capitalize Borrowing Cost to CWIP — ' + selectedAccrual?.accrual_ref"
        (close)="showModal = false">
        <div class="space-y-4 text-xs" *ngIf="selectedAccrual">
          <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
            <div class="font-semibold text-amber-800 dark:text-amber-400">Qualifying Asset Accounting Verification</div>
            <div class="text-muted-foreground">
              Qualifying project: <strong class="text-foreground">{{ selectedAccrual.project_name || selectedAccrual.loan_ref }}</strong>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-foreground mb-1">Capitalization Date</label>
              <input type="date" [(ngModel)]="capForm.capitalization_date" class="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" />
            </div>
            <div>
              <label class="block font-medium text-foreground mb-1">Eligible Amount (৳)</label>
              <input type="number" [(ngModel)]="capForm.eligible_amount" class="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-medium text-foreground mb-1">Documented Accounting Policy Justification *</label>
            <textarea rows="3" [(ngModel)]="capForm.accounting_policy_justification" class="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground"></textarea>
          </div>

          <div>
            <label class="block font-medium text-foreground mb-1">Authorized By</label>
            <input type="text" [(ngModel)]="capForm.approved_by" class="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground" />
          </div>

          <div class="pt-3 border-t border-border flex justify-end gap-2">
            <button (click)="showModal = false" class="px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted">Cancel</button>
            <button [disabled]="submitting" (click)="submitCapitalization()" class="px-4 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50">
              Confirm CWIP Capitalization
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class LoanInterestCWIPComponent implements OnInit {
  private loanService = inject(LoanFinancingService);

  loading: boolean = false;
  allAccruals: any[] = [];
  selectedAccrual: any = null;
  showModal: boolean = false;
  submitting: boolean = false;

  capForm = {
    capitalization_date: new Date().toISOString().substring(0, 10),
    eligible_amount: 0,
    accounting_policy_justification: 'Eligible borrowing costs directly attributable to construction of qualifying real estate asset per IAS 23.',
    approved_by: 'CFO / Audit Committee'
  };

  ngOnInit(): void {
    this.loadAccruals();
  }

  loadAccruals(): void {
    this.loading = true;
    this.loanService.getLoans({ limit: 100 }).subscribe({
      next: (res) => {
        const list: any[] = [];
        (res.items || []).forEach(loan => {
          (loan.interest_accruals || []).forEach(a => {
            list.push({
              ...a,
              loan_ref: loan.loan_reference_no,
              lender_name: loan.lender_name,
              project_name: loan.project_name,
              is_eligible_for_ias23: loan.is_eligible_for_ias23
            });
          });
        });
        list.sort((a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime());
        this.allAccruals = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  openCapitalizeModal(item: any): void {
    this.selectedAccrual = item;
    this.capForm.eligible_amount = item.interest_accrued_amount;
    this.showModal = true;
  }

  submitCapitalization(): void {
    if (!this.selectedAccrual) return;
    this.submitting = true;
    this.loanService.capitalizeIAS23(this.selectedAccrual.loan_id, {
      accrual_id: this.selectedAccrual.id,
      capitalization_date: this.capForm.capitalization_date,
      eligible_amount: this.capForm.eligible_amount,
      accounting_policy_justification: this.capForm.accounting_policy_justification,
      approved_by: this.capForm.approved_by
    }).subscribe({
      next: () => {
        this.submitting = false;
        this.showModal = false;
        this.loadAccruals();
      },
      error: () => {
        this.submitting = false;
      }
    });
  }
}
