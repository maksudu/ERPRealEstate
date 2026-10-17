import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { InventoryService } from '../../../core/services/inventory.service';
import { ProjectService } from '../../../core/services/project.service';
import { Unit, CombinationLog } from '../../../core/models/inventory.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-unit-subdivision',
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
  templateUrl: './unit-subdivision.component.html'
})
export class UnitSubdivisionComponent implements OnInit {
  private inventoryService = inject(InventoryService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  // Active Tool Tab: 'merge' | 'split' | 'history'
  activeTab = signal<'merge' | 'split' | 'history'>('merge');

  projects = signal<Project[]>([]);
  selectedProjectId = signal<number | null>(null);
  selectedTowerId = signal<number | null>(1);
  selectedFloor = signal<number>(14);

  units = signal<Unit[]>([]);
  combinationLogs = signal<CombinationLog[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Merge State
  selectedUnitIdsForMerge = signal<number[]>([]);
  mergeForm!: FormGroup;

  // Split State
  selectedParentUnitId = signal<number | null>(null);
  splitForm!: FormGroup;

  // Toast
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error' | 'info'>('info');

  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_code} - ${p.project_name}`
    }))
  );

  floorOptions = computed(() => {
    const fls = new Set<number>();
    for (const u of this.units()) {
      fls.add(u.floor_number);
    }
    const arr = Array.from(fls).sort((a, b) => b - a);
    return arr.map(f => ({
      value: f,
      label: f < 0 ? `Basement ${Math.abs(f)}` : (f === 0 ? 'Ground Floor' : `Floor ${f}`)
    }));
  });

  // Units on the selected floor available for merge
  floorUnitsForMerge = computed(() => {
    const f = this.selectedFloor();
    return this.units().filter(u => u.floor_number === f && u.status_id === 'AVAILABLE' && !u.is_merged);
  });

  // Selected Units for Merge Details
  selectedUnitsSummary = computed(() => {
    const ids = this.selectedUnitIdsForMerge();
    const selected = this.units().filter(u => ids.includes(u.id));
    const totalGross = selected.reduce((sum, u) => sum + Number(u.gross_saleable_area_sqft), 0);
    const totalNet = selected.reduce((sum, u) => sum + Number(u.net_carpet_area_sqft), 0);
    const totalPrice = selected.reduce((sum, u) => sum + Number(u.total_unit_price), 0);
    return {
      units: selected,
      totalGross,
      totalNet,
      totalPrice
    };
  });

  // Large/Commercial Units eligible for splitting
  splittableUnits = computed(() =>
    this.units().filter(u => u.status_id === 'AVAILABLE' && !u.is_merged && (u.gross_saleable_area_sqft >= 2000 || u.unit_type_id === 'COMMERCIAL'))
  );

  splittableUnitOptions = computed(() =>
    this.splittableUnits().map(u => ({
      value: u.id,
      label: `Unit ${u.unit_number} (FL ${u.floor_number} - ${u.gross_saleable_area_sqft} sqft - ${u.unit_type_id})`
    }))
  );

  categoryOptions = [
    { value: 'DUPLEX', label: 'Duplex Luxury Suite' },
    { value: 'COMBINED_APARTMENT', label: 'Combined 5BHK / 6BHK Residence' },
    { value: 'COMMERCIAL_SUITE', label: 'Consolidated Commercial Floor' }
  ];

  facingOptions = [
    { value: 'SOUTH', label: 'South Facing' },
    { value: 'LAKE_VIEW', label: 'Lake View' },
    { value: 'CORNER', label: 'Corner Facing' },
    { value: 'ROAD_FACING', label: 'Road Facing' }
  ];

  ngOnInit(): void {
    this.initForms();
    this.loadProjects();
    this.loadCombinationLogs();
  }

  initForms(): void {
    this.mergeForm = this.fb.group({
      new_unit_number: ['DUPLEX-14AB', [Validators.required]],
      unit_type: ['DUPLEX', [Validators.required]],
      facing: ['SOUTH', [Validators.required]],
      bed_count: [6, [Validators.required]],
      bath_count: [6, [Validators.required]],
      balcony_count: [4, [Validators.required]],
      remarks: ['Architectural combination for executive penthouse/duplex']
    });

    this.splitForm = this.fb.group({
      remarks: ['Commercial floor allotment subdivision into retail shops'],
      subdivisions: this.fb.array([
        this.fb.group({
          unit_number: ['G-01A', Validators.required],
          gross_sft: [1400, [Validators.required, Validators.min(100)]],
          net_carpet_sft: [1200, Validators.required],
          unit_type: ['SHOP', Validators.required],
          facing: ['ROAD_FACING', Validators.required],
          bed_count: [0],
          bath_count: [1],
          balcony_count: [0]
        }),
        this.fb.group({
          unit_number: ['G-01B', Validators.required],
          gross_sft: [1500, [Validators.required, Validators.min(100)]],
          net_carpet_sft: [1300, Validators.required],
          unit_type: ['SHOP', Validators.required],
          facing: ['SOUTH', Validators.required],
          bed_count: [0],
          bath_count: [1],
          balcony_count: [0]
        })
      ])
    });
  }

  get subdivisions(): FormArray {
    return this.splitForm.get('subdivisions') as FormArray;
  }

  addSubdivisionRow(): void {
    const parent = this.units().find(u => u.id === this.selectedParentUnitId());
    const count = this.subdivisions.length + 1;
    const baseCode = parent ? parent.unit_number : 'SUB';

    this.subdivisions.push(this.fb.group({
      unit_number: [`${baseCode}-${String.fromCharCode(64 + count)}`, Validators.required],
      gross_sft: [500, [Validators.required, Validators.min(50)]],
      net_carpet_sft: [420, Validators.required],
      unit_type: ['SHOP', Validators.required],
      facing: ['ROAD_FACING', Validators.required],
      bed_count: [0],
      bath_count: [1],
      balcony_count: [0]
    }));
  }

  removeSubdivisionRow(index: number): void {
    if (this.subdivisions.length > 2) {
      this.subdivisions.removeAt(index);
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => {
        this.projects.set(res);
        if (res.length > 0 && !this.selectedProjectId()) {
          this.selectedProjectId.set(res[0].id);
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

  loadCombinationLogs(): void {
    this.inventoryService.getCombinationLogs().subscribe({
      next: (data) => this.combinationLogs.set(data)
    });
  }

  toggleUnitForMerge(unitId: number): void {
    const current = this.selectedUnitIdsForMerge();
    if (current.includes(unitId)) {
      this.selectedUnitIdsForMerge.set(current.filter(id => id !== unitId));
    } else {
      if (current.length >= 3) {
        this.showToast('You can select a maximum of 3 adjacent units for a single merge operation.', 'info');
        return;
      }
      this.selectedUnitIdsForMerge.set([...current, unitId]);
    }

    // Auto update suggested unit number
    const selected = this.units().filter(u => this.selectedUnitIdsForMerge().includes(u.id));
    if (selected.length > 0) {
      const nums = selected.map(u => u.unit_number).join('');
      this.mergeForm.patchValue({
        new_unit_number: `DUPLEX-${nums}`
      });
    }
  }

  submitMerge(): void {
    const ids = this.selectedUnitIdsForMerge();
    if (ids.length < 2) {
      this.showToast('Please select at least 2 adjacent units on the floor to execute a merge.', 'error');
      return;
    }

    if (this.mergeForm.invalid) {
      this.mergeForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.mergeForm.value;

    this.inventoryService.mergeUnits({
      project_id: this.selectedProjectId() || 1,
      tower_id: this.selectedTowerId() || 1,
      floor_number: this.selectedFloor(),
      source_unit_ids: ids,
      new_unit_number: formVal.new_unit_number,
      unit_type: formVal.unit_type,
      facing: formVal.facing,
      bed_count: Number(formVal.bed_count),
      bath_count: Number(formVal.bath_count),
      balcony_count: Number(formVal.balcony_count),
      remarks: formVal.remarks
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(`Successfully combined units into new Unit ${res.unit_number}!`, 'success');
        this.selectedUnitIdsForMerge.set([]);
        this.loadUnits();
        this.loadCombinationLogs();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to execute unit merge.', 'error');
      }
    });
  }

  submitSplit(): void {
    const parentId = this.selectedParentUnitId();
    if (!parentId) {
      this.showToast('Please select a commercial or large flat to subdivide.', 'error');
      return;
    }

    if (this.splitForm.invalid) {
      this.splitForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.splitForm.value;

    this.inventoryService.splitUnit(parentId, {
      unit_id: parentId,
      subdivisions: formVal.subdivisions,
      remarks: formVal.remarks
    }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.showToast(`Successfully subdivided unit into ${res.length} new allotments!`, 'success');
        this.selectedParentUnitId.set(null);
        this.loadUnits();
        this.loadCombinationLogs();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.showToast(err.error?.detail || 'Failed to execute unit subdivision.', 'error');
      }
    });
  }

  showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage.set(msg);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 5000);
  }
}
