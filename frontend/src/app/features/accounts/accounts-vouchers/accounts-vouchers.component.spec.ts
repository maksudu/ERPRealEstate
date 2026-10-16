import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AccountsVouchersComponent } from './accounts-vouchers.component';
import { AccountsService } from '../../../core/services/accounts.service';
import { ProjectService } from '../../../core/services/project.service';
import { Voucher, ChartOfAccount } from '../../../core/models/accounts.model';
import { Project } from '../../../core/models/project.model';

describe('AccountsVouchersComponent', () => {
  let component: AccountsVouchersComponent;
  let fixture: ComponentFixture<AccountsVouchersComponent>;

  let mockAccountsService: jasmine.SpyObj<AccountsService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  const mockCOA: ChartOfAccount[] = [
    {
      id: 1,
      account_code: '11010',
      account_name_en: 'Petty Cash & Bank Current Account',
      account_type: 'Asset',
      is_active: true
    } as any,
    {
      id: 2,
      account_code: '21010',
      account_name_en: 'Subcontractor Accounts Payable',
      account_type: 'Liability',
      is_active: true
    } as any,
    {
      id: 3,
      account_code: '51010',
      account_name_en: 'Work-in-Progress (WIP) Civil Construction Cost',
      account_type: 'Expense',
      is_active: true
    } as any
  ];

  const mockProjects: Project[] = [
    {
      id: 1,
      project_code: 'PRJ-BAY-001',
      project_name: 'Bay Heights',
      status: 'UNDER_CONSTRUCTION'
    } as any
  ];

  const mockVouchers: Voucher[] = [
    {
      id: 1,
      voucher_number: 'JV-2026-0001',
      voucher_type: 'Journal',
      voucher_date: '2026-10-01',
      project_id: 1,
      total_amount: 500000,
      status: 'Posted',
      narration: 'Balanced Journal Voucher for Site WIP',
      entries: [
        {
          id: 101,
          account_id: 3,
          account_name_en: 'Work-in-Progress (WIP)',
          debit_amount: 500000,
          credit_amount: 0
        },
        {
          id: 102,
          account_id: 2,
          account_name_en: 'Accounts Payable',
          debit_amount: 0,
          credit_amount: 500000
        }
      ]
    } as any
  ];

  beforeEach(async () => {
    mockAccountsService = jasmine.createSpyObj('AccountsService', [
      'getCOA',
      'getVouchers',
      'createVoucher'
    ]);
    mockProjectService = jasmine.createSpyObj('ProjectService', ['getProjects']);

    mockAccountsService.getCOA.and.returnValue(of(mockCOA));
    mockAccountsService.getVouchers.and.returnValue(of(mockVouchers));
    mockProjectService.getProjects.and.returnValue(of(mockProjects));

    await TestBed.configureTestingModule({
      imports: [AccountsVouchersComponent, ReactiveFormsModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({})
          }
        },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: ProjectService, useValue: mockProjectService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsVouchersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the AccountsVouchersComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load Chart of Accounts, Projects, and Vouchers on initialization', () => {
    expect(mockAccountsService.getCOA).toHaveBeenCalled();
    expect(mockProjectService.getProjects).toHaveBeenCalled();
    expect(mockAccountsService.getVouchers).toHaveBeenCalled();
    expect(component.coaList().length).toBe(3);
    expect(component.projects().length).toBe(1);
    expect(component.vouchers().length).toBe(1);
  });

  it('should enforce at least two initial entry lines when opening Create Modal', () => {
    component.openCreateModal();
    expect(component.isCreateModalOpen()).toBeTrue();
    expect(component.entriesArray.length).toBe(2);

    // Cannot remove below 2 lines
    component.removeEntryLine(0);
    expect(component.entriesArray.length).toBe(2);

    // Can add a third line
    component.addEntryLine(1000, 0);
    expect(component.entriesArray.length).toBe(3);

    // Can remove third line
    component.removeEntryLine(2);
    expect(component.entriesArray.length).toBe(2);
  });

  it('should strictly reject unbalanced vouchers where Sum(Debit) != Sum(Credit)', () => {
    spyOn(window, 'alert');
    component.openCreateModal();

    // Populate unbalanced entries: Debit = 100,000, Credit = 80,000 (diff = 20,000)
    component.createForm.patchValue({
      voucher_type: 'Journal',
      narration: 'Unbalanced Attempt',
      voucher_date: '2026-10-16'
    });

    component.entriesArray.at(0).patchValue({
      account_id: 3,
      debit_amount: 100000,
      credit_amount: 0
    });

    component.entriesArray.at(1).patchValue({
      account_id: 2,
      debit_amount: 0,
      credit_amount: 80000
    });

    component.submitCreate();

    expect(window.alert).toHaveBeenCalledWith(
      jasmine.stringMatching(/Double-entry balance violation/)
    );
    expect(mockAccountsService.createVoucher).not.toHaveBeenCalled();
  });

  it('should post balanced voucher when Sum(Debit) == Sum(Credit)', () => {
    mockAccountsService.createVoucher.and.returnValue(of({ id: 2 } as any));
    component.openCreateModal();

    // Populate balanced entries: Debit = 150,000, Credit = 150,000
    component.createForm.patchValue({
      voucher_type: 'Journal',
      narration: 'Proper Balanced JV',
      voucher_date: '2026-10-16'
    });

    component.entriesArray.at(0).patchValue({
      account_id: 3,
      debit_amount: 150000,
      credit_amount: 0
    });

    component.entriesArray.at(1).patchValue({
      account_id: 2,
      debit_amount: 0,
      credit_amount: 150000
    });

    component.submitCreate();

    expect(mockAccountsService.createVoucher).toHaveBeenCalled();
    expect(component.isCreateModalOpen()).toBeFalse();
  });
});
