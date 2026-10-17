import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { SalesService } from '../../../core/services/sales.service';
import { CWIPSummary, ChartOfAccount, CostCenter } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import { Booking } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-cwip-cockpit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-cwip-cockpit.component.html'
})
export class AccountsCwipCockpitComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private salesService = inject(SalesService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  cwipSummary = signal<CWIPSummary | null>(null);
  costCenters = signal<CostCenter[]>([]);
  bookings = signal<Booking[]>([]);
  accounts = signal<ChartOfAccount[]>([]);

  isLoading = signal<boolean>(false);
  isCapitalizeModalOpen = signal<boolean>(false);
  isRevenueModalOpen = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Capitalize Form: Debit COGS (5200), Credit CWIP (5100)
  capitalizeForm: FormGroup = this.fb.group({
    cwip_account_id: [null, Validators.required],
    cogs_account_id: [null, Validators.required],
    cost_center_id: [null],
    capitalized_amount: [null, [Validators.required, Validators.min(1)]],
    completion_percentage: [100.00, [Validators.required, Validators.min(1), Validators.max(100)]],
    remarks: ['']
  });

  // IFRS 15 Form: Debit Customer Advance (2300), Credit Revenue (4100)
  revenueForm: FormGroup = this.fb.group({
    booking_id: [null, Validators.required],
    advance_liability_account_id: [null, Validators.required],
    revenue_account_id: [null, Validators.required],
    recognized_amount: [null, [Validators.required, Validators.min(1)]],
    recognition_method: ['POINT_IN_TIME_HANDOVER', Validators.required],
    remarks: ['']
  });

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  cwipAccountOptions = computed(() =>
    this.accounts()
      .filter(a => a.account_code === '5100' || a.account_name_en.toLowerCase().includes('wip') || a.account_name_en.toLowerCase().includes('cwip'))
      .map(a => ({ value: a.id, label: `${a.account_code} - ${a.account_name_en}` }))
  );

  cogsAccountOptions = computed(() =>
    this.accounts()
      .filter(a => a.account_code === '5200' || a.account_name_en.toLowerCase().includes('cogs') || a.account_name_en.toLowerCase().includes('cost of sales') || a.account_type === 'Expense')
      .map(a => ({ value: a.id, label: `${a.account_code} - ${a.account_name_en}` }))
  );

  advanceAccountOptions = computed(() =>
    this.accounts()
      .filter(a => a.account_code === '2300' || a.account_name_en.toLowerCase().includes('advance') || a.account_type === 'Liability')
      .map(a => ({ value: a.id, label: `${a.account_code} - ${a.account_name_en}` }))
  );

  revenueAccountOptions = computed(() =>
    this.accounts()
      .filter(a => a.account_code === '4100' || a.account_type === 'Revenue')
      .map(a => ({ value: a.id, label: `${a.account_code} - ${a.account_name_en}` }))
  );

  costCenterOptions = computed(() =>
    this.costCenters().map(c => ({
      value: c.id,
      label: `${c.cost_center_code} - ${c.name} (${c.wbs_stage})`
    }))
  );

  bookingOptions = computed(() =>
    this.bookings().map(b => ({
      value: b.id,
      label: `Booking #${b.booking_reference_no || b.id} - Unit ${b.unit_number || b.unit_id} (${b.customer_name || 'Customer #' + b.primary_customer_id})`
    }))
  );

  methodOptions = [
    { value: 'POINT_IN_TIME_HANDOVER', label: 'Point-in-Time upon Handover / Possession Key' },
    { value: 'POC_OVER_TIME', label: 'Over Time via Percentage of Completion (POC)' }
  ];

  ngOnInit(): void {
    this.loadProjects();
    this.loadAccounts();
    this.loadBookings();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.projects.set(res);
        if (res.length > 0) {
          this.selectedProjectId.set(res[0].id);
          this.loadProjectCWIP(res[0].id);
          this.loadCostCenters(res[0].id);
        }
      },
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadAccounts(): void {
    this.accountsService.getCOA().subscribe({
      next: (res) => this.accounts.set(res),
      error: (err) => console.error('Failed to load accounts', err)
    });
  }

  loadBookings(): void {
    this.salesService.getBookings().subscribe({
      next: (res) => this.bookings.set(res),
      error: (err) => console.error('Failed to load bookings', err)
    });
  }

  onProjectChange(projectId: number): void {
    this.selectedProjectId.set(projectId);
    this.loadProjectCWIP(projectId);
    this.loadCostCenters(projectId);
  }

  loadProjectCWIP(projectId: number): void {
    this.isLoading.set(true);
    this.accountsService.getCWIPSummary(projectId).subscribe({
      next: (res) => {
        this.cwipSummary.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load CWIP summary', err);
        this.isLoading.set(false);
      }
    });
  }

  loadCostCenters(projectId: number): void {
    this.accountsService.getCostCenters(projectId).subscribe({
      next: (res) => this.costCenters.set(res),
      error: (err) => console.error('Failed to load cost centers', err)
    });
  }

  openCapitalizeModal(): void {
    const defaultCwip = this.cwipAccountOptions().length ? this.cwipAccountOptions()[0].value : null;
    const defaultCogs = this.cogsAccountOptions().length ? this.cogsAccountOptions()[0].value : null;

    this.capitalizeForm.reset({
      cwip_account_id: defaultCwip,
      cogs_account_id: defaultCogs,
      cost_center_id: null,
      capitalized_amount: this.cwipSummary()?.active_cwip_balance || 0.00,
      completion_percentage: 100.00,
      remarks: 'Civil handover CWIP capitalization to COGS'
    });
    this.isCapitalizeModalOpen.set(true);
  }

  closeCapitalizeModal(): void {
    this.isCapitalizeModalOpen.set(false);
  }

  submitCapitalize(): void {
    if (this.capitalizeForm.invalid) {
      this.capitalizeForm.markAllAsTouched();
      return;
    }
    const pid = this.selectedProjectId();
    if (!pid) return;

    this.isSubmitting.set(true);
    const payload = {
      project_id: pid,
      ...this.capitalizeForm.value
    };

    this.accountsService.capitalizeCWIP(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCapitalizeModal();
        this.loadProjectCWIP(pid);
      },
      error: (err) => {
        console.error('Failed to capitalize CWIP', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openRevenueModal(): void {
    const defaultAdv = this.advanceAccountOptions().length ? this.advanceAccountOptions()[0].value : null;
    const defaultRev = this.revenueAccountOptions().length ? this.revenueAccountOptions()[0].value : null;
    const defaultBooking = this.bookingOptions().length ? this.bookingOptions()[0].value : null;

    this.revenueForm.reset({
      booking_id: defaultBooking,
      advance_liability_account_id: defaultAdv,
      revenue_account_id: defaultRev,
      recognized_amount: 5000000.00,
      recognition_method: 'POINT_IN_TIME_HANDOVER',
      remarks: 'Handover Deed possession recognized under IFRS 15'
    });
    this.isRevenueModalOpen.set(true);
  }

  closeRevenueModal(): void {
    this.isRevenueModalOpen.set(false);
  }

  submitRevenue(): void {
    if (this.revenueForm.invalid) {
      this.revenueForm.markAllAsTouched();
      return;
    }
    const pid = this.selectedProjectId();
    if (!pid) return;

    this.isSubmitting.set(true);
    const payload = {
      project_id: pid,
      ...this.revenueForm.value
    };

    this.accountsService.recognizeIFRS15Revenue(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeRevenueModal();
        this.loadProjectCWIP(pid);
      },
      error: (err) => {
        console.error('Failed to recognize revenue', err);
        this.isSubmitting.set(false);
      }
    });
  }
}
