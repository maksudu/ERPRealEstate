import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService, PayrollRun, Payslip } from '../hrms.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-payroll-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payroll-management.component.html'
})
export class PayrollManagementComponent implements OnInit {
  hrmsService = inject(HrmsService);
  private http = inject(HttpClient);

  selectedMonth = signal<number>(new Date().getMonth() + 1);
  selectedYear = signal<number>(new Date().getFullYear());
  selectedProjectId = signal<number | null>(null);

  projects = signal<Array<{ id: number; project_name: string }>>([]);
  isGenerating = signal<boolean>(false);
  isDisbursing = signal<boolean>(false);

  // Active Selected Payroll Run
  activeRun = signal<PayrollRun | null>(null);
  activePayslips = signal<Payslip[]>([]);

  // Bilingual Printable Payslip Modal
  selectedPayslip = signal<Payslip | null>(null);
  isPayslipModalOpen = signal<boolean>(false);

  months = [
    { num: 1, name: 'January' }, { num: 2, name: 'February' }, { num: 3, name: 'March' },
    { num: 4, name: 'April' }, { num: 5, name: 'May' }, { num: 6, name: 'June' },
    { num: 7, name: 'July' }, { num: 8, name: 'August' }, { num: 9, name: 'September' },
    { num: 10, name: 'October' }, { num: 11, name: 'November' }, { num: 12, name: 'December' }
  ];

  ngOnInit() {
    this.loadProjects();
    this.loadPayrollRuns();
  }

  loadProjects() {
    this.http.get<any[]>(`${environment.apiUrl}/projects/`).subscribe({
      next: (res) => {
        if (res) {
          this.projects.set(res.map(p => ({ id: p.id, project_name: p.project_name })));
        }
      },
      error: () => {
        this.projects.set([
          { id: 1, project_name: 'Bay Twin Towers' },
          { id: 2, project_name: 'Gulshan Lake Heights' }
        ]);
      }
    });
  }

  loadPayrollRuns() {
    this.hrmsService.loadPayrollRuns().subscribe({
      next: (runs) => {
        if (runs.length > 0 && !this.activeRun()) {
          this.selectRun(runs[0]);
        }
      }
    });
  }

  selectRun(run: PayrollRun) {
    this.activeRun.set(run);
    this.hrmsService.getPayslips(run.id).subscribe({
      next: (slips) => this.activePayslips.set(slips)
    });
  }

  generatePayroll() {
    this.isGenerating.set(true);
    this.hrmsService.generatePayroll(
      this.selectedMonth(),
      this.selectedYear(),
      this.selectedProjectId() || undefined
    ).subscribe({
      next: (run) => {
        this.isGenerating.set(false);
        alert(`Payroll batch generated successfully for ${run.month}/${run.year}!`);
        this.loadPayrollRuns();
        this.selectRun(run);
      },
      error: (err) => {
        this.isGenerating.set(false);
        alert(err?.error?.detail || 'Failed to generate payroll batch.');
      }
    });
  }

  disbursePayroll() {
    const run = this.activeRun();
    if (!run) return;

    if (!confirm(`Are you sure you want to disburse BDT ${run.total_net.toLocaleString()} for ${run.month}/${run.year}? This will automatically post an Accounts Journal Voucher in the General Ledger.`)) {
      return;
    }

    this.isDisbursing.set(true);
    this.hrmsService.disbursePayroll(run.id).subscribe({
      next: (updatedRun) => {
        this.isDisbursing.set(false);
        alert(`Payroll disbursed successfully! Accounts voucher posted (Voucher ID: #${updatedRun.voucher_id || 'Posted'}).`);
        this.loadPayrollRuns();
        this.selectRun(updatedRun);
      },
      error: (err) => {
        this.isDisbursing.set(false);
        alert(err?.error?.detail || 'Failed to disburse payroll.');
      }
    });
  }

  viewPayslip(slip: Payslip) {
    this.selectedPayslip.set(slip);
    this.isPayslipModalOpen.set(true);
  }

  closePayslipModal() {
    this.isPayslipModalOpen.set(false);
  }

  printPayslip() {
    window.print();
  }
}
