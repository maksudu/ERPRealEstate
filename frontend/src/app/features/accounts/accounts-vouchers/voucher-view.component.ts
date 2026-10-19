import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { Voucher } from '../../../core/models/accounts.model';
import { CardContainerComponent, CustomButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-voucher-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent
  ],
  templateUrl: './voucher-view.component.html'
})
export class VoucherViewComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  voucherId = signal<number | null>(null);
  voucher = signal<Voucher | null>(null);
  isLoading = signal<boolean>(false);
  isReversing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = parseInt(idParam, 10);
        this.voucherId.set(id);
        this.loadVoucher(id);
      }
    });
  }

  loadVoucher(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountsService.getVoucherById(id).subscribe({
      next: (v) => {
        this.voucher.set(v);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load voucher', err);
        this.errorMessage.set('Voucher not found or network error.');
        this.isLoading.set(false);
      }
    });
  }

  handleReverse(): void {
    const v = this.voucher();
    if (!v) return;

    if (v.status === 'Reversed') {
      alert('This voucher has already been reversed.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to reverse Voucher ${v.voucher_number}? This will generate a mirror reversing journal entry and permanently lock both transactions.`
    );

    if (!confirmed) return;

    this.isReversing.set(true);
    this.errorMessage.set(null);

    this.accountsService.reverseVoucher(v.id).subscribe({
      next: (reversal) => {
        this.isReversing.set(false);
        this.successMessage.set(
          `Voucher reversed successfully. Reversal Voucher ${reversal.voucher_number} has been generated.`
        );
        this.loadVoucher(v.id);
      },
      error: (err) => {
        console.error('Failed to reverse voucher', err);
        this.isReversing.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to reverse voucher.');
      }
    });
  }

  printSlip(): void {
    window.print();
  }

  backToList(): void {
    this.router.navigate(['/accounts/vouchers']);
  }
}
