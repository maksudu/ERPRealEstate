import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  Unit,
  UnitReservation,
  ReservationPagedResponse,
  UnitStatusHistory,
  StatusHistoryPagedResponse,
  AvailabilitySummary
} from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption,
  ModalComponent
} from '../../../shared/components';

export type AvailabilityTab = 'units' | 'reservations' | 'history' | 'rules';

@Component({
  selector: 'app-unit-availability',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent
  ],
  templateUrl: './unit-availability.component.html'
})
export class UnitAvailabilityComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  // Active Workspace Tab
  activeTab = signal<AvailabilityTab>('units');

  // Loading States
  loadingSummary = signal<boolean>(false);
  loadingUnits = signal<boolean>(false);
  loadingReservations = signal<boolean>(false);
  loadingHistory = signal<boolean>(false);
  actionInProgress = signal<boolean>(false);

  // Master Lookup
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);

  // Summary State
  summary = signal<AvailabilitySummary>({
    total_units: 480,
    available: 165,
    reserved: 35,
    booked: 180,
    sold: 100,
    blocked: 15,
    landowner_allocated: 120,
    under_construction: 140,
    handed_over: 45,
    cancelled: 8
  });

  // 1. Units Table State
  units = signal<Unit[]>([]);
  totalUnits = signal<number>(0);
  unitPage = signal<number>(1);
  unitSearch = signal<string>('');
  unitStatusFilter = signal<string>('all');

  // 2. Reservations Table State
  reservations = signal<UnitReservation[]>([]);
  totalReservations = signal<number>(0);
  reservationPage = signal<number>(1);
  reservationStatusFilter = signal<string>('all');
  reservationSearch = signal<string>('');

  // 3. Status History State
  historyList = signal<UnitStatusHistory[]>([]);
  totalHistory = signal<number>(0);
  historyPage = signal<number>(1);
  historySearch = signal<string>('');

  // Modals
  isReserveModalOpen = signal<boolean>(false);
  isTransitionModalOpen = signal<boolean>(false);
  isReleaseModalOpen = signal<boolean>(false);

  // Target Objects for Modal
  targetUnit = signal<Unit | null>(null);
  targetReservation = signal<UnitReservation | null>(null);

  // Forms
  reserveForm!: FormGroup;
  transitionForm!: FormGroup;
  releaseForm!: FormGroup;

  // Real-time Subscriptions
  private wsSubscription?: Subscription;
  private timerSubscription?: Subscription;

  // Dynamic Options
  projectFilterOptions = computed<SelectOption[]>(() => {
    return [
      { value: 'all', label: 'All Projects (Consolidated)' },
      ...this.projects().map(p => ({
        value: p.id.toString(),
        label: p.project_name
      }))
    ];
  });

  projectSelectOptions = computed<SelectOption[]>(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code || 'PRJ'})`
    }));
  });

  statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All States (Mutual Exclusive)' },
    { value: 'AVAILABLE', label: 'AVAILABLE (Open for Sale)' },
    { value: 'RESERVED', label: 'RESERVED (Active Hold)' },
    { value: 'BOOKED', label: 'BOOKED (Booking Recorded)' },
    { value: 'SOLD', label: 'SOLD (Deed Contracted)' },
    { value: 'BLOCKED', label: 'BLOCKED (Restricted)' },
    { value: 'LANDOWNER_ALLOCATED', label: 'LANDOWNER_ALLOCATED (JV Share)' },
    { value: 'UNDER_CONSTRUCTION', label: 'UNDER_CONSTRUCTION' },
    { value: 'HANDED_OVER', label: 'HANDED_OVER' },
    { value: 'CANCELLED', label: 'CANCELLED' }
  ];

  durationOptions: SelectOption[] = [
    { value: '15', label: '15 Minutes (Instant Mutex Lock)' },
    { value: '60', label: '1 Hour (Manager Verification)' },
    { value: '1440', label: '24 Hours (Pay Order Clearance)' },
    { value: '4320', label: '72 Hours (Formal Board Hold)' }
  ];

  // State Machine Allowed Transitions Map
  allowedTransitionsMap: Record<string, SelectOption[]> = {
    AVAILABLE: [
      { value: 'RESERVED', label: 'RESERVED (Temporary Hold)' },
      { value: 'BOOKED', label: 'BOOKED (Accept Booking)' },
      { value: 'BLOCKED', label: 'BLOCKED (Technical/Legal Hold)' },
      { value: 'LANDOWNER_ALLOCATED', label: 'LANDOWNER_ALLOCATED (JV Share)' },
      { value: 'UNDER_CONSTRUCTION', label: 'UNDER_CONSTRUCTION' }
    ],
    RESERVED: [
      { value: 'BOOKED', label: 'BOOKED (Accept Booking & Deposit)' },
      { value: 'AVAILABLE', label: 'AVAILABLE (Release Hold)' },
      { value: 'BLOCKED', label: 'BLOCKED (Dispute Restriction)' },
      { value: 'CANCELLED', label: 'CANCELLED (Withdraw Hold)' }
    ],
    BOOKED: [
      { value: 'SOLD', label: 'SOLD (Deed Execution / Agreement)' },
      { value: 'CANCELLED', label: 'CANCELLED (Authorized Cancellation)' },
      { value: 'AVAILABLE', label: 'AVAILABLE (Direct Return)' }
    ],
    SOLD: [
      { value: 'HANDED_OVER', label: 'HANDED_OVER (Possession Handover)' },
      { value: 'CANCELLED', label: 'CANCELLED (Legal Reversal)' }
    ],
    CANCELLED: [
      { value: 'AVAILABLE', label: 'AVAILABLE (Return to Inventory Pool)' },
      { value: 'BLOCKED', label: 'BLOCKED (Hold for Legal Settlement)' }
    ],
    BLOCKED: [
      { value: 'AVAILABLE', label: 'AVAILABLE (Authorized Unblock)' }
    ],
    LANDOWNER_ALLOCATED: [
      { value: 'HANDED_OVER', label: 'HANDED_OVER (Landowner Handover)' }
    ],
    UNDER_CONSTRUCTION: [
      { value: 'AVAILABLE', label: 'AVAILABLE (Ready for Launch)' },
      { value: 'HANDED_OVER', label: 'HANDED_OVER (Completion Handover)' },
      { value: 'BLOCKED', label: 'BLOCKED (Structural Hold)' }
    ],
    HANDED_OVER: []
  };

  nextStateOptions = computed<SelectOption[]>(() => {
    const u = this.targetUnit();
    if (!u) return [];
    return this.allowedTransitionsMap[u.status_id] || [];
  });

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadSummary();
    this.loadUnits();
    this.loadReservations();
    this.loadHistory();

    // WebSocket real-time subscription
    this.inventoryService.connectLiveMatrix();
    this.wsSubscription = this.inventoryService.realTimeUpdates$.subscribe({
      next: (event) => {
        if (event.event === 'UNIT_STATUS_CHANGED' || event.event === 'UNIT_LOCKED' || event.event === 'UNIT_UNLOCKED') {
          this.loadSummary();
          this.loadUnits();
          this.loadReservations();
        }
      }
    });

    // 1-second interval to update remaining reservation timers
    this.timerSubscription = interval(1000).subscribe(() => {
      this.reservations.update(list =>
        list.map(r => ({
          ...r,
          remaining_seconds: r.remaining_seconds > 0 ? r.remaining_seconds - 1 : 0
        }))
      );
    });
  }

  ngOnDestroy(): void {
    this.wsSubscription?.unsubscribe();
    this.timerSubscription?.unsubscribe();
  }

  private initForms(): void {
    this.reserveForm = this.fb.group({
      unit_id: [null, Validators.required],
      customer_name: ['', Validators.required],
      customer_phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]{10,16}$/)]],
      customer_nid_passport: [''],
      sales_agent_name: ['Senior Sales Officer', Validators.required],
      duration_minutes: [15, Validators.required],
      hold_deposit_amount: [0.0, Validators.min(0)],
      conditions: ['Subject to payment token confirmation within hold timeline.']
    });

    this.transitionForm = this.fb.group({
      unit_id: [null, Validators.required],
      to_status: ['', Validators.required],
      transition_type: ['MANUAL_STATE_TRANSITION', Validators.required],
      initiated_by: ['Sales Officer', Validators.required],
      authorized_by: ['Sales Operations Manager', Validators.required],
      reason: ['', Validators.required]
    });

    this.releaseForm = this.fb.group({
      reservation_id: [null, Validators.required],
      reason: ['Client did not furnish earnest booking money within duration', Validators.required],
      released_by: ['Sales Operations Manager', Validators.required]
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (list) => {
        this.projects.set(list || []);
        if (list && list.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(list[0].id);
        }
      },
      error: (err) => console.error('Failed to load projects', err)
    });
  }

  loadSummary(): void {
    this.loadingSummary.set(true);
    const pId = this.selectedProjectId() || undefined;
    this.inventoryService.getAvailabilitySummary(pId).subscribe({
      next: (data) => {
        this.summary.set(data);
        this.loadingSummary.set(false);
      },
      error: (err) => {
        console.error('Failed to load availability summary', err);
        this.loadingSummary.set(false);
      }
    });
  }

  // -------------------------------------------------------------
  // Units Management
  // -------------------------------------------------------------
  loadUnits(): void {
    this.loadingUnits.set(true);
    const offset = (this.unitPage() - 1) * 15;
    this.inventoryService.getUnitsPaged({
      status_id: this.unitStatusFilter(),
      search: this.unitSearch(),
      limit: 15,
      page: this.unitPage()
    }).subscribe({
      next: (res) => {
        this.units.set(res.items || []);
        this.totalUnits.set(res.total || 0);
        this.loadingUnits.set(false);
      },
      error: (err) => {
        console.error('Failed to load units', err);
        this.loadingUnits.set(false);
      }
    });
  }

  openReserveModal(unit: Unit): void {
    this.targetUnit.set(unit);
    this.reserveForm.reset({
      unit_id: unit.id,
      customer_name: '',
      customer_phone: '',
      customer_nid_passport: '',
      sales_agent_name: 'Senior Sales Executive',
      duration_minutes: 15,
      hold_deposit_amount: 0.0,
      conditions: `Temporary hold for Unit ${unit.unit_number} (Floor ${unit.floor_number})`
    });
    this.isReserveModalOpen.set(true);
  }

  submitReservation(): void {
    if (this.reserveForm.invalid) {
      this.reserveForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.reserveForm.value;
    this.inventoryService.createAvailabilityReservation({
      ...val,
      duration_minutes: +val.duration_minutes
    }).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        this.isReserveModalOpen.set(false);
        alert(`Unit ${res.unit_number} reserved successfully! Hold Token: ${res.reservation_token}`);
        this.loadSummary();
        this.loadUnits();
        this.loadReservations();
        this.loadHistory();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Reservation failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  openTransitionModal(unit: Unit): void {
    this.targetUnit.set(unit);
    const allowed = this.allowedTransitionsMap[unit.status_id] || [];
    this.transitionForm.reset({
      unit_id: unit.id,
      to_status: allowed[0]?.value || '',
      transition_type: 'CONTROLLED_STATE_TRANSITION',
      initiated_by: 'Sales Operations Officer',
      authorized_by: 'Head of Sales & Marketing',
      reason: ''
    });
    this.isTransitionModalOpen.set(true);
  }

  submitTransition(): void {
    if (this.transitionForm.invalid) {
      this.transitionForm.markAllAsTouched();
      return;
    }
    this.actionInProgress.set(true);
    const val = this.transitionForm.value;
    this.inventoryService.transitionUnitStatus(val).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        this.isTransitionModalOpen.set(false);
        alert(res.message);
        this.loadSummary();
        this.loadUnits();
        this.loadReservations();
        this.loadHistory();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Transition failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  // -------------------------------------------------------------
  // Reservations Management
  // -------------------------------------------------------------
  loadReservations(): void {
    this.loadingReservations.set(true);
    const offset = (this.reservationPage() - 1) * 15;
    this.inventoryService.getReservations({
      status: this.reservationStatusFilter(),
      search: this.reservationSearch(),
      limit: 15,
      offset
    }).subscribe({
      next: (res) => {
        this.reservations.set(res.items || []);
        this.totalReservations.set(res.total || 0);
        this.loadingReservations.set(false);
      },
      error: (err) => {
        console.error('Failed to load reservations', err);
        this.loadingReservations.set(false);
      }
    });
  }

  openReleaseModal(res: UnitReservation): void {
    this.targetReservation.set(res);
    this.releaseForm.reset({
      reservation_id: res.id,
      reason: 'Hold timeline expired without down payment completion',
      released_by: 'Sales Operations Manager'
    });
    this.isReleaseModalOpen.set(true);
  }

  submitRelease(): void {
    if (this.releaseForm.invalid) {
      this.releaseForm.markAllAsTouched();
      return;
    }
    const r = this.targetReservation();
    if (!r) return;

    this.actionInProgress.set(true);
    const val = this.releaseForm.value;
    this.inventoryService.releaseAvailabilityReservation(r.id, val).subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        this.isReleaseModalOpen.set(false);
        alert(res.message);
        this.loadSummary();
        this.loadUnits();
        this.loadReservations();
        this.loadHistory();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Release failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  runBatchAutoRelease(): void {
    this.actionInProgress.set(true);
    this.inventoryService.releaseExpiredReservations().subscribe({
      next: (res) => {
        this.actionInProgress.set(false);
        alert(res.message);
        this.loadSummary();
        this.loadUnits();
        this.loadReservations();
        this.loadHistory();
      },
      error: (err) => {
        this.actionInProgress.set(false);
        alert('Auto-release failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  // -------------------------------------------------------------
  // History Audit Trail
  // -------------------------------------------------------------
  loadHistory(): void {
    this.loadingHistory.set(true);
    const offset = (this.historyPage() - 1) * 20;
    this.inventoryService.getStatusHistory({
      search: this.historySearch(),
      limit: 20,
      offset
    }).subscribe({
      next: (res) => {
        this.historyList.set(res.items || []);
        this.totalHistory.set(res.total || 0);
        this.loadingHistory.set(false);
      },
      error: (err) => {
        console.error('Failed to load history', err);
        this.loadingHistory.set(false);
      }
    });
  }

  // Utilities
  formatCountdown(seconds: number): string {
    if (!seconds || seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RESERVED':
      case 'ACTIVE_HOLD':
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BOOKED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'SOLD':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'BLOCKED':
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'LANDOWNER_SHARE':
      case 'LANDOWNER_ALLOCATED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'HANDED_OVER':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'UNDER_CONSTRUCTION':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  formatBDT(val: number | null | undefined): string {
    if (!val || isNaN(val)) return '৳0';
    if (Math.abs(val) >= 10000000) {
      return `৳${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `৳${(val / 100000).toFixed(2)} Lac`;
    }
    return `৳${val.toLocaleString('en-IN')}`;
  }
}
