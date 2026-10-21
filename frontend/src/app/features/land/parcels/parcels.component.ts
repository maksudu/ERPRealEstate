import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  StatusBadgeComponent,
  SelectOption
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
  private router = inject(Router);
  private fb = inject(FormBuilder);

  Math = Math;
  Number = Number;

  // Data signals
  parcels = signal<LandParcel[]>([]);
  landowners = signal<Landowner[]>([]);
  isLoading = signal<boolean>(false);
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('');
  selectedMouza = signal<string>('');

  statusFilterOptions: SelectOption[] = [
    { value: 'PROPOSED', label: 'Proposed Parcel (প্রস্তাবিত পার্সেল)' },
    { value: 'UNDER_REVIEW', label: 'Under Review & Legal Vetting (যাচাই-বাছাই চলছে)' },
    { value: 'APPROVED', label: 'Management Approved (অনুমোদিত)' },
    { value: 'ACQUIRED', label: 'Acquired & Fully Registered (অধিগ্রহণকৃত)' }
  ];

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];



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
  newLinkOwnershipSource = signal<string>('INHERITANCE');
  newLinkDocName = signal<string>('');
  newLinkDocFileUrl = signal<string>('');
  newLinkDocFileName = signal<string>('');
  isUploadingLinkDoc = signal<boolean>(false);

  readonly apiBase = 'http://localhost:8000';

  calculatedLinkDecimal = computed(() => {
    const p = this.selectedParcelForOwners();
    if (!p) return '0.00';
    return ((Number(p.total_area_decimal || 0) * this.newLinkSharePercent()) / 100).toFixed(2);
  });

  calculatedLinkKatha = computed(() => {
    const p = this.selectedParcelForOwners();
    if (!p) return '0.00';
    return ((Number(p.total_area_katha || 0) * this.newLinkSharePercent()) / 100).toFixed(2);
  });

  calculatedLinkSqft = computed(() => {
    const p = this.selectedParcelForOwners();
    if (!p) return '0';
    return Math.round((Number(p.total_area_sqft || 0) * this.newLinkSharePercent()) / 100).toLocaleString();
  });



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
        ((p.parcel_id || '').toLowerCase().includes(term)) ||
        ((p.project_name || '').toLowerCase().includes(term)) ||
        ((p.mouza_name || '').toLowerCase().includes(term)) ||
        ((p.khatian_number || '').toLowerCase().includes(term)) ||
        ((p.dag_number || '').toLowerCase().includes(term)) ||
        ((p.deed_number || '').toLowerCase().includes(term))
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
    const code = typeof val === 'object' && val !== null ? (val.item_code || val.value || '') : (val || '');
    this.selectedStatus.set(code);
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
  navigateToCreate(): void {
    this.router.navigate(['/land/parcels/create']);
  }

  navigateToEdit(parcel: LandParcel): void {
    this.router.navigate(['/land/parcels', parcel.id, 'edit']);
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

  onLinkDocSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!this.newLinkDocName().trim()) {
      this.newLinkDocName.set(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '));
    }
    this.newLinkDocFileName.set(file.name);
    this.isUploadingLinkDoc.set(true);

    this.landService.uploadLandownerDocument(file, this.newLinkDocName()).subscribe({
      next: (res) => {
        this.newLinkDocFileUrl.set(res.file_url);
        this.newLinkDocFileName.set(res.file_name);
        this.isUploadingLinkDoc.set(false);
      },
      error: (err) => {
        alert(err.error?.detail || err.message || 'Upload failed');
        this.isUploadingLinkDoc.set(false);
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
      ownership_source: this.newLinkOwnershipSource(),
      title_deed_no: this.newLinkDeedNo().trim() || undefined,
      dispute_remarks: this.newLinkDocFileUrl() ? JSON.stringify({
        doc_name: this.newLinkDocName() || this.newLinkDocFileName(),
        doc_url: this.newLinkDocFileUrl()
      }) : undefined
    }).subscribe({
      next: (newLink) => {
        this.parcelOwnerLinks.update(list => [...list, newLink]);
        // Update local parcel linked count
        this.parcels.update(list => list.map(p => p.id === parcel.id ? { ...p, linked_owners_count: (p.linked_owners_count || 0) + 1 } : p));
        this.newLinkOwnerId.set(null);
        this.newLinkDocName.set('');
        this.newLinkDocFileUrl.set('');
        this.newLinkDocFileName.set('');
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
