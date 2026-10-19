import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoanFinancingService } from '../../../../core/services/loan-financing.service';
import { Loan, LoanDisbursement } from '../../../../core/models/loan-financing.model';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-loan-disbursements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent
  ],
  template: `
    <div class="w-full max-w-7xl mx-auto space-y-6">
      <!-- Section 14.2 Accounting Explainer Banner -->
      <div class="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div class="flex items-start gap-4">
          <div class="p-2.5 rounded-xl bg-primary/10 text-primary">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="space-y-1.5 flex-1">
            <h3 class="font-semibold text-foreground text-sm">14.2 Loan Disbursement Accounting Treatment</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">
              When a bank disburses funds into the company's designated account, the system posts an automated General Ledger journal voucher:
            </p>
            <div class="overflow-x-auto mt-2">
              <table class="w-full max-w-md text-xs border border-border rounded-lg bg-muted/20">
                <thead>
                  <tr class="border-b border-border text-muted-foreground font-semibold">
                    <th class="py-1.5 px-3">Account Title & Code</th>
                    <th class="py-1.5 px-3 text-right">Debit (৳)</th>
                    <th class="py-1.5 px-3 text-right">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr>
                    <td class="py-1.5 px-3 font-medium">Bank Account (1120)</td>
                    <td class="py-1.5 px-3 text-right font-mono text-emerald-600">Net Disbursed</td>
                    <td class="py-1.5 px-3 text-right text-muted-foreground">—</td>
                  </tr>
                  <tr>
                    <td class="py-1.5 px-3 font-medium">Finance Cost / Processing Fee (6400)</td>
                    <td class="py-1.5 px-3 text-right font-mono text-emerald-600">Fee Deducted</td>
                    <td class="py-1.5 px-3 text-right text-muted-foreground">—</td>
                  </tr>
                  <tr>
                    <td class="py-1.5 px-3 font-medium">Bank Loan Payable (2140 Current / 2210 Long-Term)</td>
                    <td class="py-1.5 px-3 text-right text-muted-foreground">—</td>
                    <td class="py-1.5 px-3 text-right font-mono text-primary">Gross Loan Amount</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Table Card -->
      <app-card-container>
        <div class="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 class="text-base font-semibold text-foreground">Disbursement Records & Linked GL Vouchers</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Live ledger of all drawdown tranches deposited across commercial bank accounts.
            </p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                <th class="py-3 px-3.5">Disbursement Ref</th>
                <th class="py-3 px-3.5">Date</th>
                <th class="py-3 px-3.5">Facility / Lender</th>
                <th class="py-3 px-3.5">Company Bank Account</th>
                <th class="py-3 px-3.5 text-right">Gross Tranche</th>
                <th class="py-3 px-3.5 text-right">Fee Deducted</th>
                <th class="py-3 px-3.5 text-right">Net in Bank</th>
                <th class="py-3 px-3.5 text-center">GL Voucher</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr *ngIf="loading" class="text-center">
                <td colspan="8" class="py-8 text-muted-foreground">Loading disbursement records...</td>
              </tr>
              <tr *ngIf="!loading && allDisbursements.length === 0" class="text-center">
                <td colspan="8" class="py-8 text-muted-foreground">No loan disbursements recorded yet.</td>
              </tr>
              <tr *ngFor="let d of allDisbursements" class="hover:bg-muted/30 transition-colors">
                <td class="py-3 px-3.5 font-mono font-semibold text-foreground">{{ d.disbursement_ref }}</td>
                <td class="py-3 px-3.5">{{ d.disbursement_date | date:'mediumDate' }}</td>
                <td class="py-3 px-3.5">
                  <div class="font-medium text-foreground">{{ d.loan_ref }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ d.lender_name }}</div>
                </td>
                <td class="py-3 px-3.5">
                  <div class="font-medium text-foreground">{{ d.company_bank_name || 'Corporate Account' }}</div>
                </td>
                <td class="py-3 px-3.5 text-right font-bold text-foreground">৳{{ d.gross_amount | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right text-rose-600 font-mono">৳{{ d.processing_fee_deducted | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-right font-bold text-emerald-600">৳{{ d.net_received_in_bank | number:'1.2-2' }}</td>
                <td class="py-3 px-3.5 text-center">
                  <span class="px-2 py-1 text-[10px] rounded-md bg-primary/10 text-primary font-mono font-semibold border border-primary/20">
                    Voucher #{{ d.gl_voucher_id || 'Posted' }}
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
export class LoanDisbursementsComponent implements OnInit {
  private loanService = inject(LoanFinancingService);

  loading: boolean = false;
  allDisbursements: any[] = [];

  ngOnInit(): void {
    this.loadDisbursements();
  }

  loadDisbursements(): void {
    this.loading = true;
    this.loanService.getLoans({ limit: 100 }).subscribe({
      next: (res) => {
        const list: any[] = [];
        (res.items || []).forEach(loan => {
          (loan.disbursements || []).forEach(d => {
            list.push({
              ...d,
              loan_ref: loan.loan_reference_no,
              lender_name: loan.lender_name
            });
          });
        });
        list.sort((a, b) => new Date(b.disbursement_date).getTime() - new Date(a.disbursement_date).getTime());
        this.allDisbursements = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
