import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { Unit } from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

export interface FloorRow {
  floorNumber: number;
  units: Unit[];
}

@Component({
  selector: 'app-inventory-matrix',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomButtonComponent
  ],
  templateUrl: './inventory-matrix.component.html'
})
export class InventoryMatrixComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  units = signal<Unit[]>([]);
  isLoading = signal<boolean>(false);
  
  // Real-time Action Notifications
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  // Selected Unit for Rate Card Breakdown Modal
  selectedUnit = signal<Unit | null>(null);
  isUnitDetailsModalOpen = signal<boolean>(false);
  isLocking = signal<boolean>(false);

  // Filter state
  filterFacing = signal<string>('');
  filterStatus = signal<string>('');

  private wsSub?: Subscription;
  private timerSub?: Subscription;

  // Grouped Floor Matrix for Visual Multi-Storey Grid
  floorRows = computed<FloorRow[]>(() => {
    const list = this.units();
    const facing = this.filterFacing();
    const status = this.filterStatus();

    let filtered = list;
    if (facing) filtered = filtered.filter(u => u.facing_id === facing);
    if (status) filtered = filtered.filter(u => u.status_id === status);

    const floorMap = new Map<number, Unit[]>();
    for (const u of filtered) {
      if (!floorMap.has(u.floor_number)) {
        floorMap.set(u.floor_number, []);
      }
      floorMap.get(u.floor_number)!.push(u);
    }

    const rows: FloorRow[] = [];
    const sortedFloors = Array.from(floorMap.keys()).sort((a, b) => b - a); // Top floor on top
    for (const f of sortedFloors) {
      rows.push({
        floorNumber: f,
        units: floorMap.get(f)!.sort((a, b) => a.unit_number.localeCompare(b.unit_number))
      });
    }
    return rows;
  });

  // Summary Counters
  availableCount = computed(() => this.units().filter(u => u.status_id === 'AVAILABLE').length);
  lockedCount = computed(() => this.units().filter(u => u.status_id === 'ON_HOLD').length);
  bookedCount = computed(() => this.units().filter(u => u.status_id === 'BOOKED' || u.status_id === 'SOLD').length);
  landownerCount = computed(() => this.units().filter(u => u.is_landowner_share).length);

  filteredUnitCount = computed(() => {
    let count = 0;
    for (const row of this.floorRows()) {
      count += row.units.length;
    }
    return count;
  });

  onFacingChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterFacing.set(val);
  }

  onStatusChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterStatus.set(val);
  }

  clearFilters(): void {
    this.filterFacing.set('');
    this.filterStatus.set('');
  }

  ngOnInit(): void {
    this.loadProjects();
    this.initWebSocket();
    this.initCountdownTimer();
  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.timerSub?.unsubscribe();
    this.inventoryService.disconnectLiveMatrix();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data);
        if (data.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(data[0].id);
          this.loadUnits();
        }
      }
    });
  }

  loadUnits(): void {
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isLoading.set(true);
    this.inventoryService.getUnits({ project_id: pId }).subscribe({
      next: (data) => {
        this.units.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectChange(event: any): void {
    this.selectedProjectId.set(Number(event.target.value));
    this.loadUnits();
  }

  // --- Real-time Countdown Timer (15-Minute Countdown) ---
  initCountdownTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      this.units.update(currentUnits => {
        let changed = false;
        const updated = currentUnits.map(u => {
          if (u.status_id === 'ON_HOLD' && u.lock_remaining_seconds && u.lock_remaining_seconds > 0) {
            changed = true;
            const nextSec = u.lock_remaining_seconds - 1;
            if (nextSec === 0) {
              return {
                ...u,
                status_id: 'AVAILABLE' as const,
                current_locked_by_user_name: undefined,
                lock_remaining_seconds: 0
              };
            }
            return { ...u, lock_remaining_seconds: nextSec };
          }
          return u;
        });
        return changed ? updated : currentUnits;
      });
    });
  }

  // --- Real-Time WebSocket Handler ---
  initWebSocket(): void {
    this.inventoryService.connectLiveMatrix();
    this.wsSub = this.inventoryService.realTimeUpdates$.subscribe({
      next: (msg) => {
        if (msg.event === 'UNIT_LOCKED') {
          this.units.update(list => list.map(u => {
            if (u.id === msg.unit_id) {
              return {
                ...u,
                status_id: 'ON_HOLD',
                current_locked_by_user_name: msg.locked_by_user_name,
                lock_remaining_seconds: msg.remaining_seconds || 900
              };
            }
            return u;
          }));
          this.showToast(`Unit ${msg.unit_number} was just locked by ${msg.locked_by_user_name}`, 'info');
        } else if (msg.event === 'UNIT_UNLOCKED') {
          this.units.update(list => list.map(u => {
            if (u.id === msg.unit_id) {
              return {
                ...u,
                status_id: 'AVAILABLE',
                current_locked_by_user_name: undefined,
                lock_remaining_seconds: 0
              };
            }
            return u;
          }));
          this.showToast(`Unit ${msg.unit_number} is now released & available`, 'info');
        }
      }
    });
  }

  // --- Unit Modal & Actions ---
  selectUnit(unit: Unit): void {
    this.selectedUnit.set(unit);
    this.isUnitDetailsModalOpen.set(true);
  }

  closeDetailsModal(): void {
    this.isUnitDetailsModalOpen.set(false);
    this.selectedUnit.set(null);
  }

  lockCurrentUnit(): void {
    const u = this.selectedUnit();
    if (!u) return;

    if (u.is_landowner_share) {
      this.showToast('Unit is Landowner-Share. Strictly locked from CRM sales.', 'error');
      return;
    }

    this.isLocking.set(true);
    this.inventoryService.lockUnit(u.id, 'Principal Sales Officer').subscribe({
      next: (res) => {
        this.isLocking.set(false);
        this.showToast(res.message, 'success');
        this.closeDetailsModal();
        this.loadUnits();
      },
      error: (err) => {
        this.isLocking.set(false);
        this.showToast(err.error?.detail || 'Unit is already locked or conflicting.', 'error');
      }
    });
  }

  unlockCurrentUnit(): void {
    const u = this.selectedUnit();
    if (!u) return;

    this.isLocking.set(true);
    this.inventoryService.unlockUnit(u.id).subscribe({
      next: (res) => {
        this.isLocking.set(false);
        this.showToast(res.message, 'success');
        this.closeDetailsModal();
        this.loadUnits();
      },
      error: (err) => {
        this.isLocking.set(false);
        this.showToast(err.error?.detail || 'Failed to release lock.', 'error');
      }
    });
  }

  formatTime(seconds?: number): string {
    if (!seconds || seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  showToast(msg: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 4500);
  }
}
