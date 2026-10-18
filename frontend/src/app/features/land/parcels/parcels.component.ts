import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { LandParcel, Landowner, LandownerParcelLink } from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-land-parcels',
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
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './parcels.component.html'
})
export class ParcelsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  // Data signals
  parcels = signal<LandParcel[]>([]);
  landowners = signal<Landowner[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('');
  selectedMouza = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];

  // Modal 1: Create / Edit Parcel Modal
  isCreateModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingParcelId = signal<number | null>(null);

  // Live Unit Conversion
  areaInputUnit = signal<string>('DECIMAL');
  areaInputValue = signal<number>(20.0);
  convertedDecimal = signal<number>(20.0);
  convertedKatha = signal<number>(12.1);
  convertedSqft = signal<number>(8712.0);
  convertedBigha = signal<number>(0.605);

  // Modal 2: Cardinal Boundary Compass & GPS Viewer
  isBoundaryModalOpen = signal<boolean>(false);
  selectedParcelForBoundary = signal<LandParcel | null>(null);

  // Modal 3: Landowner Association & Fractional Share Management
  isOwnersModalOpen = signal<boolean>(false);
  selectedParcelForOwners = signal<LandParcel | null>(null);
  parcelOwnerLinks = signal<LandownerParcelLink[]>([]);
  isLoadingOwnerLinks = signal<boolean>(false);
  isLinkingOwner = signal<boolean>(false);
  newLinkOwnerId = signal<number | null>(null);
  newLinkSharePercent = signal<number>(50.0);
  newLinkDeedNo = signal<string>('');

  // Form
  parcelForm: FormGroup = this.fb.group({
    parcel_id: [''],
    project_name: ['', Validators.required],
    division: ['Dhaka Division', Validators.required],
    district: ['Dhaka', Validators.required],
    upazila_thana: ['Gulshan', Validators.required],
    mouza_name: ['', Validators.required],
    jl_number: ['', Validators.required],
    khatian_number: ['', Validators.required],
    dag_number: ['', Validators.required],
    land_classification: ['RESIDENTIAL', Validators.required],
    acquisition_status: ['PROPOSED', Validators.required],
    input_unit: ['DECIMAL'],
    input_value: [20.0, [Validators.required, Validators.min(0.01)]],
    gps_latitude: [23.7925],
    gps_longitude: [90.4078],
    boundary_north: [''],
    boundary_south: [''],
    boundary_east: [''],
    boundary_west: [''],
    road_access_width_ft: [40.0, [Validators.required, Validators.min(0)]],
    deed_number: [''],
    deed_date: [''],
    remarks: ['']
  });

  // Filtered computed
  filteredParcels = computed(() => {
    let list = this.parcels();
    const term = this.searchTerm().trim().toLowerCase();
    const st = this.selectedStatus();
    const mz = this.selectedMouza();

    if (st) {
      list = list.filter(p => p.acquisition_status === st);
    }
    if (mz) {
      list = list.filter(p => p.mouza_name === mz);
    }
    if (term) {
      list = list.filter(p =>
        p.parcel_id.toLowerCase().includes(term) ||
        p.project_name.toLowerCase().includes(term) ||
        p.mouza_name.toLowerCase().includes(term) ||
        p.khatian_number.toLowerCase().includes(term) ||
        p.dag_number.toLowerCase().includes(term) ||
        (p.deed_number && p.deed_number.toLowerCase().includes(term))
      );
    }
    return list;
  });

  // Paginated computed
  paginatedParcels = computed(() => {
    const list = this.filteredParcels();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredParcels().length / this.pageSize()) || 1;
  });

  // Summary Metrics computed
  totalParcelsCount = computed(() => this.parcels().length);
  acquiredParcelsCount = computed(() => this.parcels().filter(p => p.acquisition_status === 'ACQUIRED').length);
  proposedParcelsCount = computed(() => this.parcels().filter(p => p.acquisition_status === 'PROPOSED' || p.acquisition_status === 'UNDER_REVIEW').length);
  totalAreaDecimal = computed(() => {
    return this.parcels().reduce((sum, p) => sum + Number(p.total_area_decimal || 0), 0);
  });
  totalAreaKatha = computed(() => {
    return this.parcels().reduce((sum, p) => sum + Number(p.total_area_katha || 0), 0);
  });

  ngOnInit(): void {
    this.loadParcels();
    this.loadLandowners();
    this.recalculateArea(20.0, 'DECIMAL');
  }

  loadParcels(): void {
    this.isLoading.set(true);
    this.landService.getParcels().subscribe({
      next: (data) => {
        this.parcels.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading parcels:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadLandowners(): void {
    this.landService.getLandowners().subscribe({
      next: (data) => this.landowners.set(data),
      error: (err) => console.error('Error loading landowners:', err)
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  onStatusFilter(val: any): void {
    this.selectedStatus.set(val || '');
    this.currentPage.set(1);
  }

  onMouzaFilter(val: any): void {
    this.selectedMouza.set(val || '');
    this.currentPage.set(1);
  }

  onPageSizeChange(val: any): void {
    this.pageSize.set(Number(val));
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  recalculateArea(value: number, unit: string): void {
    if (!value || value <= 0) return;
    this.landService.convertArea({
      decimal: unit === 'DECIMAL' ? value : undefined,
      katha: unit === 'KATHA' ? value : undefined,
      sqft: unit === 'SQFT' ? value : undefined,
      bigha: unit === 'BIGHA' ? value : undefined
    }).subscribe({
      next: (res) => {
        this.convertedDecimal.set(res.decimal);
        this.convertedKatha.set(res.katha);
        this.convertedSqft.set(res.sqft);
        this.convertedBigha.set(res.bigha);
      }
    });
  }

  onAreaInputChange(): void {
    const unit = this.parcelForm.get('input_unit')?.value || 'DECIMAL';
    const val = Number(this.parcelForm.get('input_value')?.value || 0);
    this.areaInputUnit.set(unit);
    this.areaInputValue.set(val);
    this.recalculateArea(val, unit);
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingParcelId.set(null);
    this.parcelForm.reset({
      parcel_id: '',
      project_name: '',
      division: 'Dhaka Division',
      district: 'Dhaka',
      upazila_thana: 'Gulshan',
      mouza_name: '',
      jl_number: '',
      khatian_number: '',
      dag_number: '',
      land_classification: 'RESIDENTIAL',
      acquisition_status: 'PROPOSED',
      input_unit: 'DECIMAL',
      input_value: 20.0,
      gps_latitude: 23.7925,
      gps_longitude: 90.4078,
      boundary_north: '',
      boundary_south: '',
      boundary_east: '',
      boundary_west: '',
      road_access_width_ft: 40.0,
      deed_number: '',
      deed_date: '',
      remarks: ''
    });
    this.recalculateArea(20.0, 'DECIMAL');
    this.isCreateModalOpen.set(true);
  }

  openEditModal(parcel: LandParcel): void {
    this.isEditMode.set(true);
    this.editingParcelId.set(parcel.id);

    this.parcelForm.patchValue({
      parcel_id: parcel.parcel_id,
      project_name: parcel.project_name,
      division: parcel.division,
      district: parcel.district,
      upazila_thana: parcel.upazila_thana,
      mouza_name: parcel.mouza_name,
      jl_number: parcel.jl_number,
      khatian_number: parcel.khatian_number,
      dag_number: parcel.dag_number,
      land_classification: parcel.land_classification,
      acquisition_status: parcel.acquisition_status,
      input_unit: 'DECIMAL',
      input_value: parcel.total_area_decimal,
      gps_latitude: parcel.gps_latitude,
      gps_longitude: parcel.gps_longitude,
      boundary_north: parcel.boundary_north || '',
      boundary_south: parcel.boundary_south || '',
      boundary_east: parcel.boundary_east || '',
      boundary_west: parcel.boundary_west || '',
      road_access_width_ft: parcel.road_access_width_ft,
      deed_number: parcel.deed_number || '',
      deed_date: parcel.deed_date || '',
      remarks: parcel.remarks || ''
    });

    this.recalculateArea(parcel.total_area_decimal, 'DECIMAL');
    this.isCreateModalOpen.set(true);
  }

  saveParcel(): void {
    if (this.parcelForm.invalid) {
      this.parcelForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.parcelForm.value;

    const payload = {
      project_name: formVal.project_name.trim(),
      division: formVal.division,
      district: formVal.district,
      upazila_thana: formVal.upazila_thana,
      mouza_name: formVal.mouza_name.trim(),
      jl_number: formVal.jl_number.trim(),
      khatian_number: formVal.khatian_number.trim(),
      dag_number: formVal.dag_number.trim(),
      land_classification: formVal.land_classification,
      acquisition_status: formVal.acquisition_status,
      input_unit: formVal.input_unit,
      input_value: Number(formVal.input_value),
      total_area_decimal: this.convertedDecimal(),
      total_area_katha: this.convertedKatha(),
      total_area_bigha: this.convertedBigha(),
      total_area_sqft: this.convertedSqft(),
      gps_latitude: formVal.gps_latitude ? Number(formVal.gps_latitude) : null,
      gps_longitude: formVal.gps_longitude ? Number(formVal.gps_longitude) : null,
      boundary_north: formVal.boundary_north?.trim() || null,
      boundary_south: formVal.boundary_south?.trim() || null,
      boundary_east: formVal.boundary_east?.trim() || null,
      boundary_west: formVal.boundary_west?.trim() || null,
      road_access_width_ft: Number(formVal.road_access_width_ft || 40.0),
      deed_number: formVal.deed_number?.trim() || null,
      deed_date: formVal.deed_date || null,
      remarks: formVal.remarks?.trim() || null
    };

    if (this.isEditMode() && this.editingParcelId()) {
      this.landService.updateParcel(this.editingParcelId()!, payload).subscribe({
        next: (updated) => {
          this.parcels.update(list => list.map(p => p.id === updated.id ? updated : p));
          this.isSaving.set(false);
          this.isCreateModalOpen.set(false);
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to update land parcel');
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createParcel(payload).subscribe({
        next: (created) => {
          this.parcels.update(list => [created, ...list]);
          this.isSaving.set(false);
          this.isCreateModalOpen.set(false);
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to register land parcel');
          this.isSaving.set(false);
        }
      });
    }
  }

  deleteParcel(parcel: LandParcel): void {
    if (!confirm(`Are you sure you want to delete Parcel "${parcel.parcel_id}" (${parcel.project_name})?`)) {
      return;
    }
    this.landService.deleteParcel(parcel.id).subscribe({
      next: () => {
        this.parcels.update(list => list.filter(p => p.id !== parcel.id));
      },
      error: (err) => alert(err.error?.detail || 'Failed to delete parcel')
    });
  }

  // Boundary Modal
  openBoundaryModal(parcel: LandParcel): void {
    this.selectedParcelForBoundary.set(parcel);
    this.isBoundaryModalOpen.set(true);
  }

  // Owners Linkage Modal
  openOwnersModal(parcel: LandParcel): void {
    this.selectedParcelForOwners.set(parcel);
    this.newLinkOwnerId.set(null);
    this.newLinkSharePercent.set(50.0);
    this.newLinkDeedNo.set('');
    this.loadOwnerLinks(parcel.id);
    this.isOwnersModalOpen.set(true);
  }

  loadOwnerLinks(parcelId: number): void {
    this.isLoadingOwnerLinks.set(true);
    this.landService.getParcelOwners(parcelId).subscribe({
      next: (data) => {
        this.parcelOwnerLinks.set(data);
        this.isLoadingOwnerLinks.set(false);
      },
      error: (err) => {
        console.error('Error loading owner links:', err);
        this.isLoadingOwnerLinks.set(false);
      }
    });
  }

  addOwnerLink(): void {
    const parcel = this.selectedParcelForOwners();
    const ownerId = this.newLinkOwnerId();
    if (!parcel || !ownerId) {
      alert('Please select a landowner to associate.');
      return;
    }

    this.isLinkingOwner.set(true);
    this.landService.linkOwnerToParcel(parcel.id, {
      landowner_id: ownerId,
      ownership_share_percent: this.newLinkSharePercent(),
      title_deed_no: this.newLinkDeedNo().trim() || undefined
    }).subscribe({
      next: (newLink) => {
        this.parcelOwnerLinks.update(list => [...list, newLink]);
        // Update local parcel linked count
        this.parcels.update(list => list.map(p => p.id === parcel.id ? { ...p, linked_owners_count: (p.linked_owners_count || 0) + 1 } : p));
        this.newLinkOwnerId.set(null);
        this.isLinkingOwner.set(false);
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to link owner to parcel');
        this.isLinkingOwner.set(false);
      }
    });
  }

  removeOwnerLink(link: LandownerParcelLink): void {
    const parcel = this.selectedParcelForOwners();
    if (!parcel) return;

    if (!confirm('Remove this landowner association from parcel?')) return;

    this.landService.unlinkOwnerFromParcel(parcel.id, link.id).subscribe({
      next: () => {
        this.parcelOwnerLinks.update(list => list.filter(l => l.id !== link.id));
        this.parcels.update(list => list.map(p => p.id === parcel.id ? { ...p, linked_owners_count: Math.max(0, (p.linked_owners_count || 1) - 1) } : p));
      },
      error: (err) => alert(err.error?.detail || 'Failed to unlink owner')
    });
  }

  getAcquisitionBadgeClass(status: string): string {
    switch (status) {
      case 'ACQUIRED': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'PROPOSED': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
