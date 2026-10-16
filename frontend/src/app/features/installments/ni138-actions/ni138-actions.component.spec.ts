import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { NI138ActionsComponent } from './ni138-actions.component';
import { InstallmentService } from '../../../core/services/installment.service';
import { NI138LegalAction } from '../../../core/models/installment.model';

describe('NI138ActionsComponent', () => {
  let component: NI138ActionsComponent;
  let fixture: ComponentFixture<NI138ActionsComponent>;
  let mockInstallmentService: jasmine.SpyObj<InstallmentService>;

  const mockLegalActions: NI138LegalAction[] = [
    {
      id: 1,
      pdc_cheque_id: 101,
      customer_name: 'Al-Haj Kabir Uddin',
      cheque_number: 'CHQ-554433',
      bank_name: 'Islami Bank Bangladesh PLC',
      cheque_amount: 4500000,
      dishonour_memo_received_date: '2026-10-01',
      statutory_notice_deadline_date: '2026-10-31',
      status: 'NOTICE_PENDING',
      registered_post_ad_no: '',
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      created_at: '2026-10-02'
    },
    {
      id: 2,
      pdc_cheque_id: 102,
      customer_name: 'Shahriar Properties Ltd',
      cheque_number: 'CHQ-998877',
      bank_name: 'BRAC Bank PLC',
      cheque_amount: 8000000,
      dishonour_memo_received_date: '2026-09-15',
      statutory_notice_deadline_date: '2026-10-15',
      status: 'NOTICE_SERVED',
      registered_post_ad_no: 'REG-DHK-88992',
      notice_served_to_client_date: '2026-09-20',
      client_30day_settlement_deadline: '2026-10-20',
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      created_at: '2026-09-16'
    }
  ];

  beforeEach(async () => {
    mockInstallmentService = jasmine.createSpyObj('InstallmentService', [
      'getNI138Actions',
      'serveNotice',
      'fileCourtCase'
    ]);

    mockInstallmentService.getNI138Actions.and.returnValue(of(mockLegalActions));

    await TestBed.configureTestingModule({
      imports: [NI138ActionsComponent, ReactiveFormsModule],
      providers: [
        { provide: InstallmentService, useValue: mockInstallmentService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NI138ActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the NI138ActionsComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load NI 138 legal actions on initialization', () => {
    expect(mockInstallmentService.getNI138Actions).toHaveBeenCalled();
    expect(component.actions().length).toBe(2);
    expect(component.actions()[0].customer_name).toBe('Al-Haj Kabir Uddin');
  });

  it('should open and close Serve Notice modal with prefilled defaults', () => {
    const action = mockLegalActions[0];
    component.openServeModal(action);

    expect(component.isServeModalOpen()).toBeTrue();
    expect(component.selectedAction()).toEqual(action);
    expect(component.serveForm.get('legal_counsel_name')?.value).toContain('Barrister Tanvir Ahmed');

    component.closeServeModal();
    expect(component.isServeModalOpen()).toBeFalse();
  });

  it('should submit Serve Notice and update legal action status to NOTICE_SERVED', () => {
    const action = mockLegalActions[0];
    component.openServeModal(action);

    component.serveForm.patchValue({
      notice_served_to_client_date: '2026-10-16',
      registered_post_ad_no: 'REG-POST-77112',
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      remarks: 'Served via Registered Post with A/D'
    });

    const updatedAction: NI138LegalAction = {
      ...action,
      status: 'NOTICE_SERVED',
      registered_post_ad_no: 'REG-POST-77112',
      notice_served_to_client_date: '2026-10-16',
      client_30day_settlement_deadline: '2026-11-15'
    };

    mockInstallmentService.serveNotice.and.returnValue(of(updatedAction));

    component.submitServeNotice();

    expect(mockInstallmentService.serveNotice).toHaveBeenCalledWith(action.id, jasmine.any(Object));
    expect(component.isServeModalOpen()).toBeFalse();
    const target = component.actions().find(a => a.id === action.id);
    expect(target?.status).toBe('NOTICE_SERVED');
    expect(target?.registered_post_ad_no).toBe('REG-POST-77112');
  });

  it('should open File Case modal and submit formal Criminal Court case filing', () => {
    const action = mockLegalActions[1];
    component.openFileCaseModal(action);

    expect(component.isFileCaseModalOpen()).toBeTrue();
    expect(component.selectedAction()).toEqual(action);

    component.fileCaseForm.patchValue({
      court_case_no: 'CR-Case-2026/8912',
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      remarks: 'Filed before Chief Metropolitan Magistrate Court, Dhaka'
    });

    const filedAction: NI138LegalAction = {
      ...action,
      status: 'COURT_CASE_FILED',
      court_case_no: 'CR-Case-2026/8912'
    };

    mockInstallmentService.fileCourtCase.and.returnValue(of(filedAction));

    component.submitFileCase();

    expect(mockInstallmentService.fileCourtCase).toHaveBeenCalledWith(action.id, jasmine.any(Object));
    expect(component.isFileCaseModalOpen()).toBeFalse();
    const target = component.actions().find(a => a.id === action.id);
    expect(target?.status).toBe('COURT_CASE_FILED');
    expect(target?.court_case_no).toBe('CR-Case-2026/8912');
  });
});
