import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  Subcontractor,
  LaborWorker,
  LaborAttendance,
  SubcontractorPayment,
  LaborAttendanceMetrics,
  GangAttendanceBatchCreate
} from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-labor-muster',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-labor-muster.component.html'
})
export class ConstructionLaborMusterComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab: ATTENDANCE | WORKERS | PAYMENTS | PRODUCTIVITY
  activeTab = signal<'ATTENDANCE' | 'WORKERS' | 'PAYMENTS' | 'PRODUCTIVITY'>('ATTENDANCE');

  // Shared Data Signals
  projects = signal<Project[]>([]);
  contractors = signal<Subcontractor[]>([]);
  metrics = signal<LaborAttendanceMetrics | null>(null);
  isLoading = signal<boolean>(false);

  // Tab 1: Attendance Logs
  attendanceLogs = signal<LaborAttendance[]>([]);
  attendanceTotal = signal<number>(0);
  attendancePage = signal<number>(1);
  attendancePageSize = signal<number>(10);

  // Tab 2: Worker Registry
  workers = signal<LaborWorker[]>([]);
  workersTotal = signal<number>(0);
  workersPage = signal<number>(1);
  workersPageSize = signal<number>(10);

  // Tab 3: Subcontractor Payments & Payroll
  payments = signal<SubcontractorPayment[]>([]);
  paymentsTotal = signal<number>(0);
  paymentsPage = signal<number>(1);
  paymentsPageSize = signal<number>(10);

  // Filters State
  searchQuery = signal<string>('');
  selectedProjectId = signal<number | null>(null);
  selectedContractorId = signal<number | null>(null);
  selectedWorkerType = signal<string>('');
  selectedShiftType = signal<string>('');
  selectedAttendanceStatus = signal<string>('');
  selectedPaymentType = signal<string>('');
  selectedDate = signal<string>('');

  // Dropdown Options
  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  // Gang Attendance Batch Modal
  isGangModalOpen = signal<boolean>(false);
  gangProjectId = signal<number | null>(null);
  gangContractorId = signal<number | null>(null);
  gangDate = signal<string>(new Date().toISOString().split('T')[0]);
  gangShift = signal<string>('DAY');
  gangMethod = signal<string>('SUPERVISOR_GANG');
  gangGpsLat = signal<string>('');
  gangGpsLng = signal<string>('');
  gangWorkers = signal<{ worker_id: number; worker_name: string; trade: string; manday: number; ot: number; status: string }[]>([]);
  isSavingGang = signal<boolean>(false);

  // Quick Certify Modal
  isCertifyModalOpen = signal<boolean>(false);
  selectedPaymentToCertify = signal<SubcontractorPayment | null>(null);
  certifyStatus = signal<string>('CERTIFIED');
  certifyOfficer = signal<string>('Engr. Tanvir Ahmed (QS)');
  certifyMethod = signal<string>('BANK_TRANSFER');
  certifyRef = signal<string>('');
  isCertifying = signal<boolean>(false);

  // Pagination Computations
  attendanceTotalPages = computed(() => Math.ceil(this.attendanceTotal() / this.attendancePageSize()) || 1);
  workersTotalPages = computed(() => Math.ceil(this.workersTotal() / this.workersPageSize()) || 1);
  paymentsTotalPages = computed(() => Math.ceil(this.paymentsTotal() / this.paymentsPageSize()) || 1);

  ngOnInit(): void {
    // Check URL query parameters for active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        const t = String(params['tab']).toUpperCase();
        if (['ATTENDANCE', 'WORKERS', 'PAYMENTS', 'PRODUCTIVITY'].includes(t)) {
          this.activeTab.set(t as any);
        }
      }
    });

    this.loadProjects();
    this.loadContractors();
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = [
          { value: null, label: 'All Construction Projects' },
          ...projs.map(p => ({ value: p.id, label: p.project_name }))
        ];
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (conts) => {
        this.contractors.set(conts);
        this.contractorOptions = [
          { value: null, label: 'All Subcontractors' },
          ...conts.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadMetrics(): void {
    const projId = this.selectedProjectId() || 0;
    this.constructionService.getAttendanceMetrics(projId).subscribe({
      next: (m) => this.metrics.set(m)
    });
  }

  switchTab(tab: 'ATTENDANCE' | 'WORKERS' | 'PAYMENTS' | 'PRODUCTIVITY'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.refreshCurrentTabData();
  }

  refreshCurrentTabData(): void {
    if (this.activeTab() === 'ATTENDANCE') {
      this.loadAttendanceData();
    } else if (this.activeTab() === 'WORKERS') {
      this.loadWorkersData();
    } else if (this.activeTab() === 'PAYMENTS') {
      this.loadPaymentsData();
    } else if (this.activeTab() === 'PRODUCTIVITY') {
      this.loadAttendanceData();
      this.loadWorkersData();
    }
  }

  loadAttendanceData(): void {
    this.isLoading.set(true);
    const offset = (this.attendancePage() - 1) * this.attendancePageSize();
    const filters: any = {
      limit: this.attendancePageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedShiftType()) filters.shift_type = this.selectedShiftType();
    if (this.selectedAttendanceStatus()) filters.attendance_status = this.selectedAttendanceStatus();
    if (this.selectedDate()) filters.attendance_date = this.selectedDate();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getAttendancePaged(filters).subscribe({
      next: (res) => {
        this.attendanceLogs.set(res.items);
        this.attendanceTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadWorkersData(): void {
    this.isLoading.set(true);
    const offset = (this.workersPage() - 1) * this.workersPageSize();
    const filters: any = {
      limit: this.workersPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedWorkerType()) filters.worker_type = this.selectedWorkerType();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getWorkersPaged(filters).subscribe({
      next: (res) => {
        this.workers.set(res.items);
        this.workersTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadPaymentsData(): void {
    this.isLoading.set(true);
    const offset = (this.paymentsPage() - 1) * this.paymentsPageSize();
    const filters: any = {
      limit: this.paymentsPageSize(),
      offset: offset
    };
    if (this.selectedProjectId()) filters.project_id = this.selectedProjectId();
    if (this.selectedContractorId()) filters.contractor_id = this.selectedContractorId();
    if (this.selectedPaymentType()) filters.payment_type = this.selectedPaymentType();
    if (this.searchQuery().trim()) filters.search = this.searchQuery().trim();

    this.constructionService.getSubcontractorPaymentsPaged(filters).subscribe({
      next: (res) => {
        this.payments.set(res.items);
        this.paymentsTotal.set(res.total);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Quick Supervisor Approve
  quickApproveAttendance(item: LaborAttendance): void {
    this.constructionService.approveAttendance(item.id, {
      supervisor_approved: true,
      supervisor_name: 'Engr. Kamal Hossain (Site Supervisor)'
    }).subscribe({
      next: () => {
        this.loadAttendanceData();
        this.loadMetrics();
      }
    });
  }

  // Gang Attendance Modal Methods
  openGangBatchModal(): void {
    this.gangProjectId.set(this.selectedProjectId() || (this.projects().length ? this.projects()[0].id : null));
    this.gangContractorId.set(this.selectedContractorId() || null);
    this.gangDate.set(new Date().toISOString().split('T')[0]);
    this.isGangModalOpen.set(true);

    // Fetch workers for gang list
    this.constructionService.getWorkersPaged({ limit: 50, is_active: true }).subscribe({
      next: (res) => {
        this.gangWorkers.set(res.items.map(w => ({
          worker_id: w.id,
          worker_name: w.worker_name,
          trade: w.trade_category,
          manday: 1.0,
          ot: 0,
          status: 'PRESENT'
        })));
      }
    });
  }

  closeGangBatchModal(): void {
    this.isGangModalOpen.set(false);
  }

  updateGangWorkerManday(idx: number, manday: any): void {
    const current = [...this.gangWorkers()];
    current[idx].manday = Number(manday);
    this.gangWorkers.set(current);
  }

  updateGangWorkerOt(idx: number, ot: any): void {
    const current = [...this.gangWorkers()];
    current[idx].ot = Number(ot);
    this.gangWorkers.set(current);
  }

  updateGangWorkerStatus(idx: number, status: string): void {
    const current = [...this.gangWorkers()];
    current[idx].status = status;
    if (status === 'ABSENT') {
      current[idx].manday = 0;
      current[idx].ot = 0;
    } else if (status === 'HALF_DAY') {
      current[idx].manday = 0.5;
    } else if (status === 'PRESENT') {
      current[idx].manday = 1.0;
    }
    this.gangWorkers.set(current);
  }

  captureGangGps(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.gangGpsLat.set(pos.coords.latitude.toFixed(6));
          this.gangGpsLng.set(pos.coords.longitude.toFixed(6));
        },
        (err) => alert('GPS Error: ' + err.message)
      );
    }
  }

  submitGangBatchAttendance(): void {
    if (!this.gangProjectId()) {
      alert('Please select project for gang attendance.');
      return;
    }

    this.isSavingGang.set(true);
    const payload: GangAttendanceBatchCreate = {
      project_id: Number(this.gangProjectId()),
      contractor_id: this.gangContractorId() ? Number(this.gangContractorId()) : null,
      attendance_date: this.gangDate(),
      shift_type: this.gangShift(),
      attendance_method: this.gangMethod(),
      gps_latitude: this.gangGpsLat() ? Number(this.gangGpsLat()) : null,
      gps_longitude: this.gangGpsLng() ? Number(this.gangGpsLng()) : null,
      gang_members: this.gangWorkers().map(w => ({
        worker_id: w.worker_id,
        attendance_status: w.status,
        manday_fraction: w.manday,
        overtime_hours: w.ot,
        remarks: 'Gang muster log'
      }))
    };

    this.constructionService.recordGangAttendanceBatch(payload).subscribe({
      next: (res) => {
        alert(`Successfully logged attendance for ${res.count} workers!`);
        this.isSavingGang.set(false);
        this.closeGangBatchModal();
        this.loadAttendanceData();
        this.loadMetrics();
      },
      error: () => this.isSavingGang.set(false)
    });
  }

  // Payment Certification Modal
  openCertifyModal(payment: SubcontractorPayment): void {
    this.selectedPaymentToCertify.set(payment);
    this.certifyStatus.set('CERTIFIED');
    this.certifyOfficer.set(payment.certified_by_name || 'Engr. Tanvir Ahmed (QS)');
    this.certifyMethod.set(payment.payment_method || 'BANK_TRANSFER');
    this.certifyRef.set(payment.payment_reference || '');
    this.isCertifyModalOpen.set(true);
  }

  closeCertifyModal(): void {
    this.isCertifyModalOpen.set(false);
    this.selectedPaymentToCertify.set(null);
  }

  submitCertification(): void {
    const p = this.selectedPaymentToCertify();
    if (!p) return;

    this.isCertifying.set(true);
    this.constructionService.certifySubcontractorPayment(p.id, {
      certification_status: this.certifyStatus(),
      certified_by_name: this.certifyOfficer(),
      payment_method: this.certifyMethod(),
      payment_reference: this.certifyRef(),
      payment_date: new Date().toISOString().split('T')[0]
    }).subscribe({
      next: () => {
        this.isCertifying.set(false);
        this.closeCertifyModal();
        this.loadPaymentsData();
      },
      error: () => this.isCertifying.set(false)
    });
  }

  // Filter handlers
  onProjectFilter(val: any): void {
    this.selectedProjectId.set(val ? Number(val) : null);
    this.resetPagination();
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  onContractorFilter(val: any): void {
    this.selectedContractorId.set(val ? Number(val) : null);
    this.resetPagination();
    this.refreshCurrentTabData();
  }

  onSearch(): void {
    this.resetPagination();
    this.refreshCurrentTabData();
  }

  resetPagination(): void {
    this.attendancePage.set(1);
    this.workersPage.set(1);
    this.paymentsPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedProjectId.set(null);
    this.selectedContractorId.set(null);
    this.selectedWorkerType.set('');
    this.selectedShiftType.set('');
    this.selectedAttendanceStatus.set('');
    this.selectedPaymentType.set('');
    this.selectedDate.set('');
    this.resetPagination();
    this.loadMetrics();
    this.refreshCurrentTabData();
  }

  // Page changes
  prevPage(): void {
    if (this.activeTab() === 'ATTENDANCE' && this.attendancePage() > 1) {
      this.attendancePage.update(p => p - 1);
      this.loadAttendanceData();
    } else if (this.activeTab() === 'WORKERS' && this.workersPage() > 1) {
      this.workersPage.update(p => p - 1);
      this.loadWorkersData();
    } else if (this.activeTab() === 'PAYMENTS' && this.paymentsPage() > 1) {
      this.paymentsPage.update(p => p - 1);
      this.loadPaymentsData();
    }
  }

  nextPage(): void {
    if (this.activeTab() === 'ATTENDANCE' && this.attendancePage() < this.attendanceTotalPages()) {
      this.attendancePage.update(p => p + 1);
      this.loadAttendanceData();
    } else if (this.activeTab() === 'WORKERS' && this.workersPage() < this.workersTotalPages()) {
      this.workersPage.update(p => p + 1);
      this.loadWorkersData();
    } else if (this.activeTab() === 'PAYMENTS' && this.paymentsPage() < this.paymentsTotalPages()) {
      this.paymentsPage.update(p => p + 1);
      this.loadPaymentsData();
    }
  }

  // Navigation to Dedicated Standalone Full-screen Components
  navigateToLogAttendance(): void {
    this.router.navigate(['/construction/labor-muster/create']);
  }

  navigateToOnboardWorker(): void {
    this.router.navigate(['/construction/labor-muster/workers/create']);
  }

  navigateToEditWorker(id: number): void {
    this.router.navigate(['/construction/labor-muster/workers/edit', id]);
  }

  navigateToCreatePayment(): void {
    this.router.navigate(['/construction/labor-muster/payments/create']);
  }

  navigateToViewPayment(id: number): void {
    this.router.navigate(['/construction/labor-muster/payments/view', id]);
  }
}
