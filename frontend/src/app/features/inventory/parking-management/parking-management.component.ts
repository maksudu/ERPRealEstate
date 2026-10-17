import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { ParkingSlot, Unit } from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-parking-management',
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
  templateUrl: './parking-management.component.html'
})
export class ParkingManagementComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedLevel = signal<string>('ALL');

  parkingSlots = signal<ParkingSlot[]>([]);
  units = signal<Unit[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modal States
  isAssignModalOpen = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  selectedSlotForAssign = signal<ParkingSlot | null>(null);

  assignForm!: FormGroup;
  createForm!: FormGroup;

  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  );

  levelOptions = [
    { value: 'ALL', label: 'All Parking Levels' },
    { value: 'BASEMENT_1', label: 'Basement 1 (VIP & Executive)' },
    { value: 'BASEMENT_2', label: 'Basement 2 (Standard Resident)' },
    { value: 'OPEN', label: 'Surface Visitor & Open Bays' }
  ];

  slotTypeOptions = [
    { value: 'BASEMENT_1', label: 'Basement 1 Covered Bay' },
    { value: 'BASEMENT_2', label: 'Basement 2 Covered Bay' },
    { value: 'VIP_COVERED', label: 'VIP Executive Covered Slot' },
    { value: 'TANDEM_DOUBLE', label: 'Tandem Double Stack Bay' },
    { value: 'OPEN', label: 'Surface Open Bay' }
  ];

  unitOptions = computed(() =>
    this.units().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (FL ${u.floor_number} - ${u.unit_type_id} - ${u.status_id})`
    }))
  );

  filteredSlots = computed(() => {
    const lvl = this.selectedLevel();
    if (lvl === 'ALL') return this.parkingSlots();
    return this.parkingSlots().filter(s => s.basement_level === lvl);
  });

  // KPI Counts
  totalSlots = computed(() => this.parkingSlots().length);
  availableSlots = computed(() => this.parkingSlots().filter(s => s.status === 'AVAILABLE').length);
  allocatedSlots = computed(() => this.parkingSlots().filter(s => s.status === 'ALLOCATED').length);
  blockedSlots = computed(() => this.parkingSlots().filter(s => s.status === 'BLOCKED').length);

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
  }

  initForms(): void {
    this.assignForm = this.fb.group({
      unit_id: [null, [Validators.required]]
    });

    this.createForm = this.fb.group({
      slot_number: ['', [Validators.required]],
      basement_level: ['BASEMENT_1', [Validators.required]],
      slot_type: ['BASEMENT_1', [Validators.required]],
      price: [600000, [Validators.required, Validators.min(100000)]]
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.projects.set(res);
        if (res.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(res[0].id);
          this.loadSlots();
          this.loadUnits();
        }
      }
    });
  }

  loadSlots(): void {
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.isLoading.set(true);
    this.inventoryService.getParkingSlots({ project_id: pId }).subscribe({
      next: (data) => {
        this.parkingSlots.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadUnits(): void {
    const pId = this.selectedProjectId();
    if (!pId) return;

    this.inventoryService.getUnits({ project_id: pId }).subscribe({
      next: (data) => this.units.set(data)
    });
  }

  openAssignModal(slot: ParkingSlot): void {
    this.selectedSlotForAssign.set(slot);
    this.assignForm.reset();
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal(): void {
    this.isAssignModalOpen.set(false);
    this.selectedSlotForAssign.set(null);
  }

  submitAssign(): void {
    const slot = this.selectedSlotForAssign();
    if (!slot) return;

    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const unitId = Number(this.assignForm.value.unit_id);

    this.inventoryService.assignParkingSlot(slot.id, unitId).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showToast(`Slot ${slot.slot_number} assigned successfully!`, 'success');
        this.closeAssignModal();
        this.loadSlots();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to assign parking slot.', 'error');
      }
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      slot_number: `P-B1-${String(this.parkingSlots().length + 1).padStart(2, '0')}`,
      basement_level: 'BASEMENT_1',
      slot_type: 'BASEMENT_1',
      price: 600000
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.createForm.value;

    this.inventoryService.createParkingSlot({
      project_id: this.selectedProjectId() || 1,
      tower_id: 1,
      slot_number: formVal.slot_number,
      basement_level: formVal.basement_level,
      slot_type: formVal.slot_type,
      price: Number(formVal.price)
    }).subscribe({
      next: (slot) => {
        this.isSubmitting.set(false);
        this.showToast(`Parking Slot ${slot.slot_number} created successfully!`, 'success');
        this.closeCreateModal();
        this.loadSlots();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.showToast('Failed to create parking slot.', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }
}
