import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperationsService } from '../../../core/services/operations.service';
import { MachineryAsset } from '../../../core/models/operations.model';
import { CardContainerComponent } from '../../../shared/components';

@Component({
  selector: 'app-equipment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent
  ],
  templateUrl: './equipment.component.html'
})
export class EquipmentComponent implements OnInit {
  private opsService = inject(OperationsService);
  private fb = inject(FormBuilder);

  assets = signal<MachineryAsset[]>([]);
  loading = signal<boolean>(false);
  selectedCategory = signal<string>('ALL');

  showAddModal = signal<boolean>(false);
  showAssignModal = signal<boolean>(false);
  selectedAsset = signal<MachineryAsset | null>(null);

  assetForm!: FormGroup;
  assignForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadAssets();
  }

  private initForms(): void {
    this.assetForm = this.fb.group({
      asset_code: ['', [Validators.required]],
      asset_name: ['', [Validators.required]],
      category: ['Tower Crane', [Validators.required]],
      hourly_rate: [2500.0, [Validators.required, Validators.min(100)]],
      meter_reading_hours: [0.0],
      status: ['OPERATIONAL']
    });

    this.assignForm = this.fb.group({
      project_name: ['Green Horizon Tower', [Validators.required]],
      meter_reading: [0.0, [Validators.required]],
      new_status: ['OPERATIONAL', [Validators.required]]
    });
  }

  loadAssets(): void {
    this.loading.set(true);
    this.opsService.getMachineryAssets().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.assets.set(data);
        } else {
          this.assets.set(this.getMockAssets());
        }
        this.loading.set(false);
      },
      error: () => {
        this.assets.set(this.getMockAssets());
        this.loading.set(false);
      }
    });
  }

  get filteredAssets(): MachineryAsset[] {
    const cat = this.selectedCategory();
    if (cat === 'ALL') return this.assets();
    return this.assets().filter(a => a.category === cat);
  }

  openAssignModal(asset: MachineryAsset): void {
    this.selectedAsset.set(asset);
    this.assignForm.patchValue({
      project_name: 'Green Horizon Tower',
      meter_reading: asset.meter_reading_hours,
      new_status: asset.status
    });
    this.showAssignModal.set(true);
  }

  submitAsset(): void {
    if (this.assetForm.invalid) return;

    this.opsService.createMachineryAsset(this.assetForm.value).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.assetForm.reset({ category: 'Tower Crane', hourly_rate: 2500.0, status: 'OPERATIONAL' });
        this.loadAssets();
      },
      error: () => {
        const newAsset: MachineryAsset = {
          id: Date.now(),
          ...this.assetForm.value
        };
        this.assets.update(a => [newAsset, ...a]);
        this.showAddModal.set(false);
        this.assetForm.reset({ category: 'Tower Crane', hourly_rate: 2500.0, status: 'OPERATIONAL' });
      }
    });
  }

  submitAssign(): void {
    if (this.assignForm.invalid || !this.selectedAsset()) return;
    const asset = this.selectedAsset()!;
    const val = this.assignForm.value;

    this.opsService.assignMachineryProject(asset.id, {
      meter_reading: val.meter_reading,
      new_status: val.new_status
    }).subscribe({
      next: () => {
        this.showAssignModal.set(false);
        this.loadAssets();
      },
      error: () => {
        asset.meter_reading_hours = val.meter_reading;
        asset.status = val.new_status;
        this.showAssignModal.set(false);
      }
    });
  }

  private getMockAssets(): MachineryAsset[] {
    return [
      {
        id: 1,
        asset_code: 'EQP-CRN-001',
        asset_name: 'Potain 50m Jib Top-Slewing Tower Crane',
        category: 'Tower Crane',
        current_assigned_project_id: 1,
        hourly_rate: 4500.0,
        meter_reading_hours: 1840.5,
        status: 'OPERATIONAL'
      },
      {
        id: 2,
        asset_code: 'EQP-MIX-002',
        asset_name: 'Schwing Stetter 1 Bag Heavy Concrete Mixer',
        category: 'Concrete Mixer',
        current_assigned_project_id: 1,
        hourly_rate: 1200.0,
        meter_reading_hours: 890.0,
        status: 'OPERATIONAL'
      },
      {
        id: 3,
        asset_code: 'EQP-HST-003',
        asset_name: 'Spartan Twin-Cage Construction Passenger Hoist',
        category: 'Material Hoist',
        current_assigned_project_id: 2,
        hourly_rate: 2200.0,
        meter_reading_hours: 1420.0,
        status: 'MAINTENANCE_REQUIRED'
      },
      {
        id: 4,
        asset_code: 'EQP-GEN-004',
        asset_name: 'Cummins 250 KVA Heavy Diesel Site Generator',
        category: 'Diesel Generator',
        current_assigned_project_id: 1,
        hourly_rate: 3500.0,
        meter_reading_hours: 2150.0,
        status: 'OPERATIONAL'
      }
    ];
  }
}
