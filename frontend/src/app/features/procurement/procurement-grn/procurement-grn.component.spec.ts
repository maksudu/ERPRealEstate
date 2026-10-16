import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProcurementGrnComponent } from './procurement-grn.component';
import { ProcurementService } from '../../../core/services/procurement.service';
import { GoodsReceipt, PurchaseOrder } from '../../../core/models/procurement.model';

describe('ProcurementGrnComponent', () => {
  let component: ProcurementGrnComponent;
  let fixture: ComponentFixture<ProcurementGrnComponent>;
  let mockProcurementService: jasmine.SpyObj<ProcurementService>;

  const mockPOs: PurchaseOrder[] = [
    {
      id: 1,
      po_number: 'PO-2026-001',
      vendor_name: 'BSRM Steels Ltd',
      project_id: 1,
      project_name: 'Bay Heights',
      ordered_quantity: 100,
      total_received_quantity: 50,
      total_po_amount: 5000000,
      status: 'PARTIALLY_RECEIVED',
      created_at: '2026-10-01'
    } as any
  ];

  const mockGRNs: GoodsReceipt[] = [
    {
      id: 1,
      grn_number: 'GRN-2026-001',
      po_id: 1,
      po_number: 'PO-2026-001',
      vendor_name: 'BSRM Steels Ltd',
      project_name: 'Bay Heights',
      delivery_challan_number: 'CHL-BSRM-8821',
      received_quantity: 50,
      rejected_quantity: 0,
      accepted_quantity: 50,
      unit_of_measure: 'TON',
      calculated_expected_amount: 2500000,
      variance_amount: 0,
      three_way_match_status: 'PENDING_MATCH',
      status: 'DRAFT',
      created_at: '2026-10-05'
    } as any
  ];

  beforeEach(async () => {
    mockProcurementService = jasmine.createSpyObj('ProcurementService', [
      'getGoodsReceipts',
      'getPurchaseOrders',
      'createGoodsReceipt',
      'executeThreeWayMatch'
    ]);

    mockProcurementService.getGoodsReceipts.and.returnValue(of(mockGRNs));
    mockProcurementService.getPurchaseOrders.and.returnValue(of(mockPOs));

    await TestBed.configureTestingModule({
      imports: [ProcurementGrnComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ProcurementService, useValue: mockProcurementService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcurementGrnComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ProcurementGrnComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load Goods Receipts and Purchase Orders on initialization', () => {
    expect(mockProcurementService.getGoodsReceipts).toHaveBeenCalled();
    expect(mockProcurementService.getPurchaseOrders).toHaveBeenCalled();
    expect(component.grnList().length).toBe(1);
    expect(component.purchaseOrders().length).toBe(1);
  });

  it('should open and close Create GRN modal with form validation', () => {
    component.openCreateGrnModal();
    expect(component.isCreateGrnModalOpen()).toBeTrue();
    expect(component.createGrnForm.valid).toBeFalse();

    component.closeCreateGrnModal();
    expect(component.isCreateGrnModalOpen()).toBeFalse();
  });

  it('should submit Create GRN and reload goods receipts', () => {
    const newGRN: GoodsReceipt = {
      id: 2,
      grn_number: 'GRN-2026-002',
      po_id: 1,
      po_number: 'PO-2026-001',
      vendor_name: 'BSRM Steels Ltd',
      delivery_challan_number: 'CHL-BSRM-9912',
      received_quantity: 30,
      rejected_quantity: 0,
      accepted_quantity: 30,
      calculated_expected_amount: 1500000,
      variance_amount: 0,
      three_way_match_status: 'PENDING_MATCH',
      status: 'DRAFT',
      created_at: '2026-10-16'
    } as any;

    mockProcurementService.createGoodsReceipt.and.returnValue(of(newGRN));

    component.openCreateGrnModal();
    component.createGrnForm.patchValue({
      po_id: 1,
      delivery_challan_number: 'CHL-BSRM-9912',
      received_quantity: 30,
      rejected_quantity: 0,
      inspection_remarks: '500W Deformed Rebars passed UTM tensile elongation test'
    });

    component.submitCreateGrn();

    expect(mockProcurementService.createGoodsReceipt).toHaveBeenCalled();
    expect(component.isCreateGrnModalOpen()).toBeFalse();
    expect(mockProcurementService.getGoodsReceipts).toHaveBeenCalledTimes(2);
  });

  it('should open 3-Way Match modal and execute match verification', () => {
    const grn = mockGRNs[0];
    component.openThreeWayMatchModal(grn);

    expect(component.isThreeWayMatchModalOpen()).toBeTrue();
    expect(component.selectedGrnForMatch()).toEqual(grn);

    const matchedGRN: GoodsReceipt = {
      ...grn,
      three_way_match_status: 'MATCHED_OK'
    };

    mockProcurementService.executeThreeWayMatch.and.returnValue(of(matchedGRN));

    component.threeWayMatchForm.patchValue({
      approval_action: 'APPROVE_MATCH',
      accounts_notes: 'Challan quantity 50 TON matches PO line item and supplier tax invoice.'
    });

    component.submitThreeWayMatch();

    expect(mockProcurementService.executeThreeWayMatch).toHaveBeenCalledWith(
      grn.id,
      jasmine.objectContaining({ approval_action: 'APPROVE_MATCH' })
    );
    expect(component.isThreeWayMatchModalOpen()).toBeFalse();
  });
});
