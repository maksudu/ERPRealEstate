import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import { 
  Landowner, 
  LandownerDuplicateCheckRequest, 
  LandownerDuplicateCheckResponse,
  LandParcel 
} from '../../../core/models/land.model';
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
  selector: 'app-landowners',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './landowners.component.html'
})
export class LandownersComponent implements OnInit {
  private landService = inject(LandService);
  private router = inject(Router);

  Math = Math;

  // Data signals
  landowners = signal<Landowner[]>([]);
  parcels = signal<LandParcel[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  searchTerm = signal<string>('');
  selectedOwnerType = signal<string>('');
  selectedStatus = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 25, 50, 100];


  // Negotiation Modal
  isNegotiationModalOpen = signal<boolean>(false);
  selectedOwnerForNotes = signal<Landowner | null>(null);
  newNoteText = signal<string>('');
  newNoteType = signal<'MEETING' | 'PHONE_CALL' | 'SITE_VISIT' | 'LEGAL_DISCUSSION'>('MEETING');
  newNoteDate = signal<string>(new Date().toISOString().split('T')[0]);
  newNoteConductedBy = signal<string>('Acquisitions Manager');
  isSavingNote = signal<boolean>(false);

  // Duplicate Check Modal
  isDuplicateModalOpen = signal<boolean>(false);
  duplicateCheckNid = signal<string>('');
  duplicateCheckPhone = signal<string>('');
  duplicateCheckTin = signal<string>('');
  isCheckingDuplicate = signal<boolean>(false);
  duplicateResult = signal<LandownerDuplicateCheckResponse | null>(null);


  // Filtered computed
  filteredLandowners = computed(() => {
    let list = this.landowners();
    const term = this.searchTerm().trim().toLowerCase();
    const type = this.selectedOwnerType();
    const st = this.selectedStatus();

    if (type) {
      list = list.filter(o => o.owner_type === type);
    }
    if (st) {
      list = list.filter(o => o.status === st);
    }
    if (term) {
      list = list.filter(o => 
        (o.landowner_code && o.landowner_code.toLowerCase().includes(term)) ||
        (o.full_name_en && o.full_name_en.toLowerCase().includes(term)) ||
        (o.full_name_bn && o.full_name_bn.toLowerCase().includes(term)) ||
        (o.nid_number && o.nid_number.toLowerCase().includes(term)) ||
        (o.phone_number && o.phone_number.toLowerCase().includes(term)) ||
        (o.tin_number && o.tin_number.toLowerCase().includes(term)) ||
        (o.email && o.email.toLowerCase().includes(term))
      );
    }
    return list;
  });

  // Paginated computed
  paginatedLandowners = computed(() => {
    const list = this.filteredLandowners();
    const start = (this.currentPage() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredLandowners().length / this.pageSize()) || 1;
  });

  // KPI Metrics computed
  totalOwnersCount = computed(() => this.landowners().length);
  activeOwnersCount = computed(() => this.landowners().filter(o => o.status === 'ACTIVE').length);
  prospectsCount = computed(() => this.landowners().filter(o => o.status === 'PROSPECT' || o.status === 'UNDER_VERIFICATION').length);
  totalParcelsCount = computed(() => {
    return this.landowners().reduce((sum, o) => sum + (o.linked_parcels_count || 0), 0);
  });

  ngOnInit(): void {
    this.loadLandowners();
    this.loadParcels();
  }

  loadLandowners(): void {
    this.isLoading.set(true);
    this.landService.getLandowners().subscribe({
      next: (data) => {
        this.landowners.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading landowners:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadParcels(): void {
    this.landService.getParcels().subscribe({
      next: (data) => this.parcels.set(data),
      error: (err) => console.error('Error loading parcels:', err)
    });
  }

  onSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  onOwnerTypeFilter(val: any): void {
    this.selectedOwnerType.set(val || '');
    this.currentPage.set(1);
  }

  onStatusFilter(val: any): void {
    this.selectedStatus.set(val || '');
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
    this.router.navigate(['/land/landowners/create']);
  }

  navigateToEdit(owner: Landowner): void {
    this.router.navigate(['/land/landowners', owner.id, 'edit']);
  }

  archiveOwner(owner: Landowner): void {
    if (!confirm(`Are you sure you want to archive landowner "${owner.full_name_en}" (${owner.landowner_code})?`)) {
      return;
    }
    this.landService.deleteLandowner(owner.id).subscribe({
      next: () => {
        this.landowners.update(list => list.map(o => o.id === owner.id ? { ...o, status: 'ARCHIVED' } : o));
      },
      error: (err) => alert(err.error?.detail || 'Failed to archive landowner')
    });
  }

  // Negotiation Modal
  openNegotiationModal(owner: Landowner): void {
    this.selectedOwnerForNotes.set(owner);
    this.newNoteText.set('');
    this.newNoteType.set('MEETING');
    this.newNoteDate.set(new Date().toISOString().split('T')[0]);
    this.newNoteConductedBy.set('Acquisitions Manager');
    this.isNegotiationModalOpen.set(true);
  }

  saveNegotiationNote(): void {
    const owner = this.selectedOwnerForNotes();
    if (!owner || !this.newNoteText().trim()) return;

    this.isSavingNote.set(true);
    this.landService.addLandownerNegotiationNote(owner.id, {
      note: this.newNoteText().trim(),
      interaction_type: this.newNoteType(),
      interaction_date: this.newNoteDate(),
      conducted_by: this.newNoteConductedBy()
    }).subscribe({
      next: (updated) => {
        this.selectedOwnerForNotes.set(updated);
        this.landowners.update(list => list.map(o => o.id === updated.id ? updated : o));
        this.newNoteText.set('');
        this.isSavingNote.set(false);
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to add negotiation note');
        this.isSavingNote.set(false);
      }
    });
  }

  // Duplicate Check Modal
  openDuplicateModal(): void {
    this.duplicateCheckNid.set('');
    this.duplicateCheckPhone.set('');
    this.duplicateCheckTin.set('');
    this.duplicateResult.set(null);
    this.isDuplicateModalOpen.set(true);
  }

  runDuplicateCheck(): void {
    if (!this.duplicateCheckNid().trim() && !this.duplicateCheckPhone().trim() && !this.duplicateCheckTin().trim()) {
      alert('Please enter at least NID, Phone, or TIN to check duplicates.');
      return;
    }

    this.isCheckingDuplicate.set(true);
    const req: LandownerDuplicateCheckRequest = {
      nid_number: this.duplicateCheckNid().trim() || undefined,
      phone_number: this.duplicateCheckPhone().trim() || undefined,
      tin_number: this.duplicateCheckTin().trim() || undefined
    };

    this.landService.checkLandownerDuplicate(req).subscribe({
      next: (res) => {
        this.duplicateResult.set(res);
        this.isCheckingDuplicate.set(false);
      },
      error: (err) => {
        console.error('Duplicate check error:', err);
        this.isCheckingDuplicate.set(false);
      }
    });
  }

  getOwnerTypeBadgeColor(type: string): string {
    switch (type) {
      case 'INDIVIDUAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'JOINT_OWNER': return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'COMPANY': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'POA_HOLDER': return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'UNDER_VERIFICATION': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'PROSPECT': return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'BLOCKED': return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'ARCHIVED': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
