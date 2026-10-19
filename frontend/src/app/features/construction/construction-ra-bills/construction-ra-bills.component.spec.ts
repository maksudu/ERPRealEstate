import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ConstructionRaBillsComponent } from './construction-ra-bills.component';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { RABill, WorkOrder, Subcontractor } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';

describe('ConstructionRaBillsComponent', () => {
  let component: ConstructionRaBillsComponent;
  let fixture: ComponentFixture<ConstructionRaBillsComponent>;

  let mockConstructionService: jasmine.SpyObj<ConstructionService>;
  let mockProjectService: jasmine.SpyObj<ProjectService>;

  const mockProjects: Project[] = [
    {
      id: 1,
      project_code: 'PRJ-BAY-001',
      project_name: 'Bay Heights Luxury Towers',
      status: 'UNDER_CONSTRUCTION'
    } as any
  ];

  const mockContractors: Subcontractor[] = [
    {
      id: 1,
      contractor_name_en: 'Bengal Piling & Foundation Ltd',
      contractor_name_bn: 'বেঙ্গল পাইলিং লি.',
      trade_category: 'PILING_FOUNDATION',
      phone_number: '+8801700112233',
      tax_identification_number: '123456789012',
      is_active: true
    } as any
  ];

  const mockWorkOrders: WorkOrder[] = [
    {
      id: 1,
      project_id: 1,
      subcontractor_id: 1,
      work_order_number: 'WO-2026-001',
      scope_of_work: 'Substructure Piling and Cast-in-situ RCC Basement',
      contract_value_bdt: 25000000,
      retention_percentage: 5,
      status: 'ISSUED',
      created_at: '2026-01-15'
    } as any
  ];

  const mockRABills: RABill[] = [
    {
      id: 1,
      work_order_id: 1,
      ra_bill_number: 'RA-01',
      bill_date: '2026-10-01',
      gross_work_certified_amount: 5000000,
      retention_money_deducted: 250000,
      advance_recovery_deducted: 0,
      tds_deducted: 250000,
      vds_deducted: 250000,
      net_payable_amount: 4250000,
      status: 'SUBMITTED',
      created_at: '2026-10-01'
    } as any
  ];

  beforeEach(async () => {
    mockConstructionService = jasmine.createSpyObj('ConstructionService', [
      'getRABills',
      'getWorkOrders',
      'getContractors',
      'createRABill',
      'createWorkOrder',
      'approveRABill'
    ]);
    mockProjectService = jasmine.createSpyObj('ProjectService', ['getProjects']);

    mockConstructionService.getRABills.and.returnValue(of(mockRABills));
    mockConstructionService.getWorkOrders.and.returnValue(of(mockWorkOrders));
    mockConstructionService.getContractors.and.returnValue(of(mockContractors));
    mockProjectService.getProjects.and.returnValue(of(mockProjects));

    await TestBed.configureTestingModule({
      imports: [ConstructionRaBillsComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ConstructionService, useValue: mockConstructionService },
        { provide: ProjectService, useValue: mockProjectService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConstructionRaBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ConstructionRaBillsComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should load RA bills, work orders, contractors, and projects on initialization', () => {
    expect(mockConstructionService.getRABills).toHaveBeenCalled();
    expect(mockConstructionService.getWorkOrders).toHaveBeenCalled();
    expect(mockConstructionService.getContractors).toHaveBeenCalled();
    expect(mockProjectService.getProjects).toHaveBeenCalled();
    expect(component.raBills().length).toBe(1);
    expect(component.workOrders().length).toBe(1);
  });

  it('should switch tabs between BILLS, WORK_ORDERS, and JMS', () => {
    component.setTab('WORK_ORDERS');
    expect(component.currentTab()).toBe('WORK_ORDERS');
    component.setTab('JMS');
    expect(component.currentTab()).toBe('JMS');
    component.setTab('BILLS');
    expect(component.currentTab()).toBe('BILLS');
  });

  it('should reload data on page or filter changes', () => {
    component.searchQuery.set('RA-01');
    component.onSearch();
    expect(component.searchQuery()).toBe('RA-01');
    component.nextPage();
    expect(component.currentPage()).toBe(2);
  });
});
