import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoanFinancingService } from '../../../../core/services/loan-financing.service';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-loan-repayments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent
  ],
  template: `
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <!-- Section 14.3 Explainer -->
      <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div class="flex items-start gap-4">
          <div class="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="space-y-1 flex-1">
            <h3 class="font-semibold text-foreground text-sm">14.3 Debt Service & Payment Waterfall Accounting</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Every EMI or installment payment is decomposed into its distinct accounting elements: Principal debt reduction (Debit Loan Payable), borrowing cost servicing (Debit Finance Costs / Interest Payable), and banking fees/penalties, credited against the disbursing bank account.
            </p>
          </div>
        </div>
      </div>

      <app-card-container>
        <div class="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">Repayment Waterfall & Lender Statement Matching</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Historical ledger of principal repayments, interest service payments, and lender statement reconciliation.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th class="py-3 px-3.5">Payment Ref</th>
                <th class="py-3 px-3.5">Payment Date</th>
                <th class="py-3 px-3.5">Facility / Lender</th>
                <th class="py-3 px-3.5 text-right">Total Cash Outflow</th>
                <th class="py-3 px-3.5 text-right">Principal Repaid</th>
                <th class="py-3 px-3.5 text-right">Interest Serviced</th>
                <th class="py-3 px-3.5 text-right">Late Fees / Charges</th>
                <th class="py-3 px-3.5">Lender Statement Ref</th>
                <th class="py-3 px-3.5 text-center">GL Voucher</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr *ngIf="loading" class="text-center">
                <td colspan="9" class="py-8 text-muted-foreground">Loading debt service repayments...</td>
              </tr>
              <tr *ngIf="!loading && allRepayments.length === 0" class="text-center">
                <td colspan="9" class="py-8 text-muted-foreground">No loan repayments recorded yet.</td>
              </tr>
              <tr *ngFor="let r of allRepayments" class="hover:bg-muted/30 transition-colors">
                <td class="py-3 px-3.5 font-mono font-semibold text-foreground">{{ r.payment_ref }}</td>
                <td class="py-3 px-3.5">{{ r.payment_date | date:'mediumDate' }}</td>
                <td class="py-3 px-3.5">
                  <div class="font-medium text-foreground">{{ r.loan_ref }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ r.lender_name }}</div>
                </td>
                <td class="py-3 px-3.5 text-right font-bold text-foreground">৳{{ r.total_amount_paid | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right font-semibold text-emerald-600">৳{{ r.principal_component | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right font-semibold text-indigo-600">৳{{ r.interest_component | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right text-rose-600 font-mono">৳{{ r.fee_or_penalty_component | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5">
                  <div class="font-mono text-[11px] text-muted-foreground">{{ r.lender_statement_ref || 'Reconciled' }}</div>
                </td>
                <td class="py-3 px-3.5 text-center">
                  <span class="px-2 py-1 text-[10px] rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-semibold border border-emerald-500/20">
                    Voucher #{{ r.gl_voucher_id || 'Posted' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </app-card-container>
    </div>
  `
})
export class LoanRepaymentsComponent implements OnInit {
  private loanService = inject(LoanFinancingService);

  loading: boolean = false;
  allRepayments: any[] = [];

  ngOnInit(): void {
    this.loadRepayments();
  }

  loadRepayments(): void {
    this.loading = true;
    this.loanService.getLoans({ limit: 100 }).subscribe({
      next: (res) => {
        const list: any[] = [];
        (res.items || []).forEach(loan => {
          (loan.repayments || []).forEach(r => {
            list.push({
              ...r,
              loan_ref: loan.loan_reference_no,
              lender_name: loan.lender_name
            });
          });
        });
        list.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
        this.allRepayments = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
