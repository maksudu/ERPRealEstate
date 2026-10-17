import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { TowerStackingResponse, StackingFloorNode, UnitTile, PriceBreakdown } from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-tower-stacking',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './tower-stacking.component.html'
})
export class TowerStackingComponent implements OnInit, OnDestroy {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);

  // Core State Signals
  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedTowerId = signal<number | null>(null);
  stackingData = signal<TowerStackingResponse | null>(null);
  isLoading = signal<boolean>(false);
  abs = Math.abs;

  // Micro-interaction States
  hoveredUnit = signal<UnitTile | null>(null);
  hoverPosition = signal<{ x: number; y: number } | null>(null);
  selectedUnit = signal<UnitTile | null>(null);
  isDrawerOpen = signal<boolean>(false);
  activeRenderTab = signal<'floorplan' | 'living' | 'master_bed' | 'balcony'>('floorplan');

  // Dynamic Price Calculator Sheet for Selected Unit
  priceBreakdown = signal<PriceBreakdown | null>(null);
  customDiscount = signal<number>(0);
  isPriceLoading = signal<boolean>(false);
  isReserving = signal<boolean>(false);

  // Filters
  filterFacing = signal<string>('');
  filterStatus = signal<string>('');
  filterUnitType = signal<string>('');

  // Toast / Live Notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  private timerSub?: Subscription;
  private wsSub?: Subscription;

  // Dynamic Dropdown Options
  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  );

  facingOptions = [
    { value: '', label: 'All Orientations / Facings' },
    { value: 'SOUTH', label: 'South Facing (Breeze Prime)' },
    { value: 'LAKE_VIEW', label: 'Gulshan Lake View' },
    { value: 'NORTH_EAST', label: 'North-East Corner' },
    { value: 'CORNER', label: 'Panoramic Corner' },
    { value: 'ROAD_FACING', label: 'Avenue Road Facing' }
  ];

  statusOptions = [
    { value: '', label: 'All Inventory Statuses' },
    { value: 'AVAILABLE', label: 'Available (Green)' },
    { value: 'RESERVED', label: '15-Min Reserved (Amber)' },
    { value: 'SOLD', label: 'Sold / Executed (Red)' },
    { value: 'LANDOWNER_SHARE', label: 'Landowner Allocated (Blue)' },
    { value: 'RETAINED', label: 'Company Retained (Purple)' },
    { value: 'BLOCKED', label: 'Blocked / Hold (Grey)' }
  ];

  unitTypeOptions = [
    { value: '', label: 'All Unit Categories' },
    { value: 'PENTHOUSE', label: 'Royal Penthouse Sky Villa' },
    { value: 'TYPE_4BHK', label: 'Grand 4BHK Luxury Flat' },
    { value: 'TYPE_3BHK', label: 'Executive 3BHK Residence' },
    { value: 'DUPLEX', label: 'Duplex Architectural Combine' },
    { value: 'COMMERCIAL', label: 'Commercial Corporate Suite' }
  ];

  // Filtered Floors Matrix
  filteredFloors = computed<StackingFloorNode[]>(() => {
    const data = this.stackingData();
    if (!data) return [];

    const fFacing = this.filterFacing();
    const fStatus = this.filterStatus();
    const fType = this.filterUnitType();

    if (!fFacing && !fStatus && !fType) {
      return data.floors;
    }

    return data.floors.map(floor => {
      const matchingUnits = floor.units.filter(u => {
        if (fFacing && !u.facing.toUpperCase().includes(fFacing.toUpperCase())) return false;
        if (fStatus && u.status !== fStatus) return false;
        if (fType && !u.unit_type.toUpperCase().includes(fType.toUpperCase())) return false;
        return true;
      });

      return {
        ...floor,
        units: matchingUnits
      };
    });
  });

  // Effective Net Price with Custom Discount
  calculatedNetPrice = computed(() => {
    const pb = this.priceBreakdown();
    if (!pb) return 0;
    const discount = Math.min(this.customDiscount(), pb.max_discount_amount);
    return Math.max(0, pb.subtotal - discount);
  });

  ngOnInit(): void {
    this.loadProjects();
    this.initCountdownTimer();
    this.initWebSocket();
  }

  ngOnDestroy(): void {
    this.timerSub?.unsubscribe();
    this.wsSub?.unsubscribe();
    this.inventoryService.disconnectLiveMatrix();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.projects.set(res);
        if (res.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(res[0].id);
          this.loadStackingPlan();
        }
      }
    });
  }

  loadStackingPlan(): void {
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isLoading.set(true);
    this.inventoryService.getStackingPlan(pId, this.selectedTowerId() || undefined).subscribe({
      next: (data) => {
        this.stackingData.set(data);
        if (data.tower_id && !this.selectedTowerId()) {
          this.selectedTowerId.set(data.tower_id);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onProjectSelect(projectId: number | string): void {
    this.selectedProjectId.set(Number(projectId));
    this.selectedTowerId.set(null);
    this.loadStackingPlan();
  }

  // --- Real-time Countdown Timer (15-Minute Countdown) ---
  initCountdownTimer(): void {
    this.timerSub = interval(1000).subscribe(() => {
      this.stackingData.update(data => {
        if (!data) return null;
        let changed = false;

        const updatedFloors = data.floors.map(floor => {
          const updatedUnits = floor.units.map(u => {
            if (u.status === 'RESERVED' && u.lock_remaining_seconds > 0) {
              changed = true;
              const nextSec = u.lock_remaining_seconds - 1;
              if (nextSec === 0) {
                return {
                  ...u,
                  status: 'AVAILABLE' as const,
                  color_code: '#10B981',
                  status_label: 'Available',
                  lock_remaining_seconds: 0,
                  locked_by_user_name: undefined
                };
              }
              return { ...u, lock_remaining_seconds: nextSec };
            }
            return u;
          });
          return { ...floor, units: updatedUnits };
        });

        return changed ? { ...data, floors: updatedFloors } : data;
      });
    });
  }

  // --- WebSocket Real-Time Receiver ---
  initWebSocket(): void {
    this.inventoryService.connectLiveMatrix();
    this.wsSub = this.inventoryService.realTimeUpdates$.subscribe({
      next: (msg) => {
        if (msg.event === 'UNIT_LOCKED') {
          this.showToast(`Unit ${msg.unit_number} locked by ${msg.locked_by_user_name || 'Agent'}.`, 'info');
          this.loadStackingPlan();
        } else if (msg.event === 'UNIT_UNLOCKED') {
          this.showToast(`Unit ${msg.unit_number} released back to Available inventory.`, 'success');
          this.loadStackingPlan();
        }
      }
    });
  }

  // --- Micro-Interactions: Hover Card ---
  onUnitMouseEnter(unit: UnitTile, event: MouseEvent): void {
    this.hoveredUnit.set(unit);
    this.hoverPosition.set({ x: event.clientX, y: event.clientY });
  }

  onUnitMouseMove(event: MouseEvent): void {
    if (this.hoveredUnit()) {
      this.hoverPosition.set({ x: event.clientX, y: event.clientY });
    }
  }

  onUnitMouseLeave(): void {
    this.hoveredUnit.set(null);
    this.hoverPosition.set(null);
  }

  // --- Micro-Interactions: Click Drawer & Price Sheet ---
  openUnitDrawer(unit: UnitTile): void {
    this.selectedUnit.set(unit);
    this.isDrawerOpen.set(true);
    this.activeRenderTab.set('floorplan');
    this.customDiscount.set(0);
    this.loadPriceBreakdown(unit.id);
  }

  closeUnitDrawer(): void {
    this.isDrawerOpen.set(false);
    this.selectedUnit.set(null);
    this.priceBreakdown.set(null);
  }

  loadPriceBreakdown(unitId: number): void {
    this.isPriceLoading.set(true);
    this.inventoryService.getPriceBreakdown(unitId).subscribe({
      next: (data) => {
        this.priceBreakdown.set(data);
        this.isPriceLoading.set(false);
      },
      error: () => this.isPriceLoading.set(false)
    });
  }

  // --- 15-Minute Instant Reserve Action ---
  executeInstantReserve(): void {
    const unit = this.selectedUnit();
    if (!unit) return;

    this.isReserving.set(true);
    this.inventoryService.reserveUnit(unit.id, 'Senior Portfolio Lead').subscribe({
      next: (res) => {
        this.isReserving.set(false);
        this.showToast(`Unit ${res.unit_number} reserved successfully for 15 minutes!`, 'success');
        this.loadStackingPlan();
        // Update current selected unit state
        this.selectedUnit.update(u => u ? { ...u, status: 'RESERVED', lock_remaining_seconds: 900 } : null);
      },
      error: (err) => {
        this.isReserving.set(false);
        this.showToast(err.error?.detail || 'Could not reserve unit. Already locked by another user.', 'error');
      }
    });
  }

  // --- Release Hold Action ---
  executeReleaseHold(): void {
    const unit = this.selectedUnit();
    if (!unit) return;

    this.inventoryService.releaseUnit(unit.id).subscribe({
      next: () => {
        this.showToast(`Unit ${unit.unit_number} hold successfully released.`, 'success');
        this.loadStackingPlan();
        this.selectedUnit.update(u => u ? { ...u, status: 'AVAILABLE', lock_remaining_seconds: 0 } : null);
      },
      error: () => this.showToast('Failed to release unit reservation.', 'error')
    });
  }

  // Format seconds to MM:SS
  formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }

  clearFilters(): void {
    this.filterFacing.set('');
    this.filterStatus.set('');
    this.filterUnitType.set('');
  }
}
