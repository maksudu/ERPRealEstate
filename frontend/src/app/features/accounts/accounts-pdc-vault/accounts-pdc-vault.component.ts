import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { PDCVaultCheque, ChartOfAccount } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-pdc-vault',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-pdc-vault.component.html'
})
export class AccountsPdcVaultComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  cheques = signal<PDCVaultCheque[]>([]);
  projects = signal<Project[]>([]);
  bankAccounts = signal<ChartOfAccount[]>([]);

  isLoading = signal<boolean>(false);
  isRegisterModalOpen = signal<boolean>(false);
  isActionModalOpen = signal<boolean>(false);
  selectedCheque = signal<PDCVaultCheque | null>(null);
  actionType = signal<'DEPOSIT' | 'CLEAR' | 'BOUNCE'>('DEPOSIT');

  // Filters
  filterProjectId = signal<number | null>(null);
  searchQuery = signal<string>('');

  registerForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    cheque_no: ['', Validators.required],
    bank_name: ['', Validators.required],
    branch_name: [''],
    drawer_name: ['', Validators.required],
    cheque_date: [new Date().toISOString().split('T')[0], Validators.required],
    amount: [null, [Validators.required, Validators.min(1)]]
  });

  actionForm: FormGroup = this.fb.group({
    bank_account_id: [null],
    bounce_reason: ['']
  });

  // Kanban Columns
  inVaultCheques = computed(() =>
    this.filteredCheques().filter(c => c.status === 'IN_VAULT')
  );

  depositedCheques = computed(() =>
    this.filteredCheques().filter(c => c.status === 'DEPOSITED')
  );

  clearedCheques = computed(() =>
    this.filteredCheques().filter(c => c.status === 'CLEARED')
  );

  bouncedCheques = computed(() =>
    this.filteredCheques().filter(c => c.status === 'BOUNCED')
  );

  // Totals
  totalVaultAmount = computed(() =>
    this.inVaultCheques().reduce((sum, c) => sum + Number(c.amount || 0), 0)
  );

  totalClearedAmount = computed(() =>
    this.clearedCheques().reduce((sum, c) => sum + Number(c.amount || 0), 0)
  );

  totalBouncedAmount = computed(() =>
    this.bouncedCheques().reduce((sum, c) => sum + Number(c.amount || 0), 0)
  );

  projectOptions = computed(() => [
    { value: null, label: 'All Projects (Consolidated)' },
    ...this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  ]);

  projectCreateOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }))
  );

  bankSelectOptions = computed(() =>
    this.bankAccounts().map(b => ({
      value: b.id,
      label: `${b.account_code} - ${b.account_name_en}`
    }))
  );

  filteredCheques = computed(() => {
    let list = this.cheques();
    if (this.filterProjectId()) {
      list = list.filter(c => c.project_id === this.filterProjectId());
    }
    const q = this.searchQuery().toLowerCase().trim();
    if (q) {
      list = list.filter(c =>
        c.cheque_no.toLowerCase().includes(q) ||
        c.drawer_name.toLowerCase().includes(q) ||
        c.bank_name.toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadBankAccounts();
    this.loadCheques();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadBankAccounts(): void {
    this.accountsService.getCOA('Asset').subscribe({
      next: (res) => {
        const banks = res.filter(a =>
          a.account_name_en.toLowerCase().includes('bank') ||
          a.account_name_en.toLowerCase().includes('escrow')
        );
        this.bankAccounts.set(banks.length ? banks : res);
      },
      error: (err) => console.error('Failed to load bank accounts', err)
    });
  }

  loadCheques(): void {
    this.isLoading.set(true);
    const filter: any = {};
    if (this.filterProjectId()) filter.project_id = this.filterProjectId();
    this.accountsService.getPDCVault(filter).subscribe({
      next: (res) => {
        this.cheques.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load PDC cheques', err);
        this.isLoading.set(false);
      }
    });
  }

  openRegisterModal(): void {
    this.registerForm.reset({
      project_id: this.projects().length ? this.projects()[0].id : null,
      cheque_no: '',
      bank_name: '',
      branch_name: '',
      drawer_name: '',
      cheque_date: new Date().toISOString().split('T')[0],
      amount: null
    });
    this.isRegisterModalOpen.set(true);
  }

  closeRegisterModal(): void {
    this.isRegisterModalOpen.set(false);
  }

  submitRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.accountsService.createPDC(this.registerForm.value).subscribe({
      next: () => {
        this.closeRegisterModal();
        this.loadCheques();
      },
      error: (err) => console.error('Failed to register PDC', err)
    });
  }

  openActionModal(cheque: PDCVaultCheque, action: 'DEPOSIT' | 'CLEAR' | 'BOUNCE'): void {
    this.selectedCheque.set(cheque);
    this.actionType.set(action);
    this.actionForm.reset({
      bank_account_id: this.bankAccounts().length ? this.bankAccounts()[0].id : null,
      bounce_reason: 'Insufficient Funds'
    });
    this.isActionModalOpen.set(true);
  }

  closeActionModal(): void {
    this.isActionModalOpen.set(false);
    this.selectedCheque.set(null);
  }

  submitAction(): void {
    const chq = this.selectedCheque();
    if (!chq) return;

    let targetStatus = 'DEPOSITED';
    if (this.actionType() === 'CLEAR') targetStatus = 'CLEARED';
    if (this.actionType() === 'BOUNCE') targetStatus = 'BOUNCED';

    const payload = {
      status: targetStatus,
      bounce_reason: this.actionType() === 'BOUNCE' ? this.actionForm.value.bounce_reason : undefined,
      bank_account_id: this.actionType() === 'CLEAR' ? this.actionForm.value.bank_account_id : undefined
    };

    this.accountsService.updatePDCStatus(chq.id, payload).subscribe({
      next: () => {
        this.closeActionModal();
        this.loadCheques();
      },
      error: (err) => console.error('Failed to update PDC status', err)
    });
  }
}
