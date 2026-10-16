import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { PDCVaultComponent } from './pdc-vault.component';
import { InstallmentService } from '../../../core/services/installment.service';
import { SalesService } from '../../../core/services/sales.service';
import { CrmService } from '../../../core/services/crm.service';
import { PDCVaultItem } from '../../../core/models/installment.model';
import { Booking } from '../../../core/models/sales.model';
import { Customer } from '../../../core/models/crm.model';

describe('PDCVaultComponent', () => {
  let component: PDCVaultComponent;
  let fixture: ComponentFixture<PDCVaultComponent>;

  let mockInstallmentService: jasmine.SpyObj<InstallmentService>;
  let mockSalesService: jasmine.SpyObj<SalesService>;
  let mockCrmService: jasmine.SpyObj<CrmService>;

  const mockCheques: PDCVaultItem[] = [
    {
      id: 1,
      booking_id: 101,
      customer_id: 201,
      customer_name: 'Haji Mohammad Selim',
      cheque_number: 'CHQ-882910',
      bank_name: 'Eastern Bank PLC',
      branch_name: 'Gulshan Branch',
      routing_number: '095261120',
      maturity_date: '2026-10-25',
      cheque_amount: 5000000,
      pouch_barcode: 'PDC-VAULT-000101',
      status: 'IN_VAULT',
      sms_reminder_sent: false,
      created_at: '2026-10-01'
    },
    {
      id: 2,
      booking_id: 102,
      customer_id: 202,
      customer_name: 'Engr. Rafiqul Islam',
      cheque_number: 'CHQ-993812',
      bank_name: 'City Bank PLC',
      branch_name: 'Dhanmondi Branch',
      routing_number: '085261111',
      maturity_date: '2026-10-18',
      cheque_amount: 3500000,
      pouch_barcode: 'PDC-VAULT-000102',
      status: 'SENT_TO_BANK',
      sms_reminder_sent: true,
      created_at: '2026-10-02'
    }
  ];

  const mockBookings: Booking[] = [
    {
      id: 101,
      booking_reference_no: 'BKG-2026-001',
      customer_id: 201,
      customer_name: 'Haji Mohammad Selim',
      unit_id: 10,
      unit_number: '12A',
      project_id: 1,
      project_name: 'Bay Heights',
      booking_date: '2026-10-01',
      total_booking_price: 25000000,
      status: 'APPROVED',
      created_at: '2026-10-01'
    } as any
  ];

  const mockCustomers: Customer[] = [
    {
      id: 201,
      customer_code: 'CUST-001',
      full_name_en: 'Haji Mohammad Selim',
      full_name_bn: 'হাজী মোহাম্মদ সেলিম',
      phone_number: '+8801711223344',
      email: 'selim@example.com',
      nid_number: '19802692512345678',
      is_active: true
    } as any
  ];

  beforeEach(async () => {
    mockInstallmentService = jasmine.createSpyObj('InstallmentService', [
      'getPDCVault',
      'depositCheque',
      'updatePDCStatus'
    ]);
    mockSalesService = jasmine.createSpyObj('SalesService', ['getBookings']);
    mockCrmService = jasmine.createSpyObj('CrmService', ['getCustomers']);

    mockInstallmentService.getPDCVault.and.returnValue(of(mockCheques));
    mockSalesService.getBookings.and.returnValue(of(mockBookings));
    mockCrmService.getCustomers.and.returnValue(of(mockCustomers));

    await TestBed.configureTestingModule({
      imports: [PDCVaultComponent, ReactiveFormsModule],
      providers: [
        { provide: InstallmentService, useValue: mockInstallmentService },
        { provide: SalesService, useValue: mockSalesService },
        { provide: CrmService, useValue: mockCrmService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PDCVaultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the PDCVaultComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load cheques and dropdown lists on initialization', () => {
    expect(mockInstallmentService.getPDCVault).toHaveBeenCalled();
    expect(mockSalesService.getBookings).toHaveBeenCalled();
    expect(mockCrmService.getCustomers).toHaveBeenCalled();
    expect(component.cheques().length).toBe(2);
    expect(component.bookings().length).toBe(1);
    expect(component.customers().length).toBe(1);
  });

  it('should filter cheques correctly by search term', () => {
    component.searchQuery.set('Eastern');
    const filtered = component.filteredCheques();
    expect(filtered.length).toBe(1);
    expect(filtered[0].bank_name).toBe('Eastern Bank PLC');

    component.searchQuery.set('CHQ-993812');
    const filteredByChq = component.filteredCheques();
    expect(filteredByChq.length).toBe(1);
    expect(filteredByChq[0].cheque_number).toBe('CHQ-993812');
  });

  it('should open and close deposit cheque modal with reset form', () => {
    component.openDepositModal();
    expect(component.isDepositModalOpen()).toBeTrue();
    expect(component.depositForm.get('bank_name')?.value).toBe('Eastern Bank PLC');

    component.closeDepositModal();
    expect(component.isDepositModalOpen()).toBeFalse();
  });

  it('should successfully submit new PDC deposit and prepend to cheques list', () => {
    const newCheque: PDCVaultItem = {
      id: 3,
      booking_id: 101,
      customer_id: 201,
      customer_name: 'Haji Mohammad Selim',
      cheque_number: 'CHQ-771122',
      bank_name: 'Standard Chartered Bank',
      branch_name: 'Gulshan',
      routing_number: '050261120',
      maturity_date: '2026-11-01',
      cheque_amount: 2000000,
      pouch_barcode: 'PDC-VAULT-000103',
      status: 'IN_VAULT',
      sms_reminder_sent: false,
      created_at: '2026-10-16'
    };

    mockInstallmentService.depositCheque.and.returnValue(of(newCheque));

    component.openDepositModal();
    component.depositForm.patchValue({
      booking_id: 101,
      customer_id: 201,
      cheque_number: 'CHQ-771122',
      bank_name: 'Standard Chartered Bank',
      branch_name: 'Gulshan',
      routing_number: '050261120',
      maturity_date: '2026-11-01',
      cheque_amount: 2000000
    });

    component.submitDeposit();

    expect(mockInstallmentService.depositCheque).toHaveBeenCalled();
    expect(component.cheques().length).toBe(3);
    expect(component.cheques()[0].cheque_number).toBe('CHQ-771122');
    expect(component.isDepositModalOpen()).toBeFalse();
  });

  it('should open status lifecycle modal and update cheque status to DISHONOURED_BOUNCED', () => {
    const targetCheque = mockCheques[0];
    component.openStatusModal(targetCheque);

    expect(component.isStatusModalOpen()).toBeTrue();
    expect(component.selectedCheque()).toEqual(targetCheque);

    const updatedCheque: PDCVaultItem = {
      ...targetCheque,
      status: 'DISHONOURED_BOUNCED'
    };
    mockInstallmentService.updatePDCStatus.and.returnValue(of(updatedCheque));

    component.statusForm.patchValue({
      status: 'DISHONOURED_BOUNCED',
      dishonour_memo_date: '2026-10-16',
      dishonour_reason: 'Insufficient Funds'
    });

    component.submitStatusUpdate();

    expect(mockInstallmentService.updatePDCStatus).toHaveBeenCalledWith(targetCheque.id, jasmine.any(Object));
    expect(component.isStatusModalOpen()).toBeFalse();
    const found = component.cheques().find(c => c.id === targetCheque.id);
    expect(found?.status).toBe('DISHONOURED_BOUNCED');
  });
});
