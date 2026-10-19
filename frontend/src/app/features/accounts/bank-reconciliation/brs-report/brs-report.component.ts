import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BankReconciliationService } from '../../../../core/services/bank-reconciliation.service';
import { BankReconciliationStatementReport } from '../../../../core/models/bank-reconciliation.model';
import { BankReconNavComponent } from '../bank-recon-nav.component';
import { CardContainerComponent } from '../../../../shared/components/card-container/card-container.component';

@Component({
  selector: 'app-brs-report',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BankReconNavComponent,
    CardContainerComponent
  ],
  templateUrl: './brs-report.component.html'
})
export class BRSReportComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private reconService = inject(BankReconciliationService);

  sessionId: number = 0;
  report: BankReconciliationStatementReport | null = null;
  loading: boolean = false;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.sessionId = Number(idParam);
      this.loadReport();
    } else {
      // Load first available report
      this.reconService.getSessions({ limit: 1 }).subscribe({
        next: (res) => {
          if (res.items && res.items.length > 0) {
            this.sessionId = res.items[0].id;
            this.loadReport();
          }
        }
      });
    }
  }

  loadReport(): void {
    this.loading = true;
    this.reconService.getBRSReport(this.sessionId).subscribe({
      next: (res) => {
        this.report = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load BRS report', err);
        this.loading = false;
      }
    });
  }

  printReport(): void {
    window.print();
  }
}
