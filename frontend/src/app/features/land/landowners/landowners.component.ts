import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
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
    ReactiveFormsModule,
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
  private fb = inject(FormBuilder);

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

  // Modals state
  isCreateModalOpen = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  editingOwnerId = signal<number | null>(null);
  activeTab = signal<'personal' | 'contact' | 'ownership' | 'nominee'>('personal');

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

  // Form
  ownerForm: FormGroup = this.fb.group({
    landowner_code: [''],
    owner_type: ['INDIVIDUAL', Validators.required],
    full_name_en: ['', Validators.required],
    full_name_bn: [''],
    father_mother_spouse_name: [''],
    present_address: [''],
    permanent_address: [''],
    nid_number: [''],
    passport_number: [''],
    company_reg_number: [''],
    tin_number: [''],
    phone_number: [''],
    email: ['', [Validators.email]],
    emergency_contact_name: [''],
    emergency_contact_phone: [''],
    ownership_share_ratio: [1.0000, [Validators.required, Validators.min(0.0001), Validators.max(1.0)]],
    ownership_nature: ['INHERITED', Validators.required],
    bank_name: [''],
    bank_branch: [''],
    bank_account_no: [''],
    bank_routing_no: [''],
    bank_account_holder: [''],
    status: ['ACTIVE', Validators.required],
    nominee_name: [''],
    nominee_relation: [''],
    nominee_nid: [''],
    poa_holder_name: [''],
    poa_deed_no: [''],
    poa_date: ['']
  });

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

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingOwnerId.set(null);
    this.activeTab.set('personal');
    this.ownerForm.reset({
      landowner_code: '',
      owner_type: 'INDIVIDUAL',
      full_name_en: '',
      full_name_bn: '',
      father_mother_spouse_name: '',
      present_address: '',
      permanent_address: '',
      nid_number: '',
      passport_number: '',
      company_reg_number: '',
      tin_number: '',
      phone_number: '',
      email: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      ownership_share_ratio: 1.0000,
      ownership_nature: 'INHERITED',
      bank_name: '',
      bank_branch: '',
      bank_account_no: '',
      bank_routing_no: '',
      bank_account_holder: '',
      status: 'ACTIVE',
      nominee_name: '',
      nominee_relation: '',
      nominee_nid: '',
      poa_holder_name: '',
      poa_deed_no: '',
      poa_date: ''
    });
    this.isCreateModalOpen.set(true);
  }

  openEditModal(owner: Landowner): void {
    this.isEditMode.set(true);
    this.editingOwnerId.set(owner.id);
    this.activeTab.set('personal');

    const nominee = owner.nominee_details && owner.nominee_details[0] ? owner.nominee_details[0] : {};
    const poa = owner.poa_details || {};

    this.ownerForm.patchValue({
      landowner_code: owner.landowner_code,
      owner_type: owner.owner_type,
      full_name_en: owner.full_name_en,
      full_name_bn: owner.full_name_bn || '',
      father_mother_spouse_name: owner.father_mother_spouse_name || '',
      present_address: owner.present_address || '',
      permanent_address: owner.permanent_address || '',
      nid_number: owner.nid_number || '',
      passport_number: owner.passport_number || '',
      company_reg_number: owner.company_reg_number || '',
      tin_number: owner.tin_number || '',
      phone_number: owner.phone_number || '',
      email: owner.email || '',
      emergency_contact_name: owner.emergency_contact_name || '',
      emergency_contact_phone: owner.emergency_contact_phone || '',
      ownership_share_ratio: owner.ownership_share_ratio,
      ownership_nature: owner.ownership_nature,
      bank_name: owner.bank_name || '',
      bank_branch: owner.bank_branch || '',
      bank_account_no: owner.bank_account_no || '',
      bank_routing_no: owner.bank_routing_no || '',
      bank_account_holder: owner.bank_account_holder || '',
      status: owner.status,
      nominee_name: nominee['name'] || '',
      nominee_relation: nominee['relation'] || '',
      nominee_nid: nominee['nid'] || '',
      poa_holder_name: poa['holder_name'] || '',
      poa_deed_no: poa['deed_no'] || '',
      poa_date: poa['date'] || ''
    });

    this.isCreateModalOpen.set(true);
  }

  saveLandowner(): void {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.ownerForm.value;

    const nominee_details = formVal.nominee_name ? [{
      name: formVal.nominee_name,
      relation: formVal.nominee_relation,
      nid: formVal.nominee_nid
    }] : [];

    const poa_details = formVal.poa_holder_name ? {
      holder_name: formVal.poa_holder_name,
      deed_no: formVal.poa_deed_no,
      date: formVal.poa_date
    } : null;

    const payload: Partial<Landowner> = {
      owner_type: formVal.owner_type,
      full_name_en: formVal.full_name_en.trim(),
      full_name_bn: formVal.full_name_bn?.trim() || null,
      father_mother_spouse_name: formVal.father_mother_spouse_name?.trim() || null,
      present_address: formVal.present_address?.trim() || null,
      permanent_address: formVal.permanent_address?.trim() || null,
      nid_number: formVal.nid_number?.trim() || null,
      passport_number: formVal.passport_number?.trim() || null,
      company_reg_number: formVal.company_reg_number?.trim() || null,
      tin_number: formVal.tin_number?.trim() || null,
      phone_number: formVal.phone_number?.trim() || null,
      email: formVal.email?.trim() || null,
      emergency_contact_name: formVal.emergency_contact_name?.trim() || null,
      emergency_contact_phone: formVal.emergency_contact_phone?.trim() || null,
      ownership_share_ratio: Number(formVal.ownership_share_ratio),
      ownership_nature: formVal.ownership_nature,
      bank_name: formVal.bank_name?.trim() || null,
      bank_branch: formVal.bank_branch?.trim() || null,
      bank_account_no: formVal.bank_account_no?.trim() || null,
      bank_routing_no: formVal.bank_routing_no?.trim() || null,
      bank_account_holder: formVal.bank_account_holder?.trim() || null,
      status: formVal.status,
      nominee_details,
      poa_details
    };

    if (this.isEditMode() && this.editingOwnerId()) {
      this.landService.updateLandowner(this.editingOwnerId()!, payload).subscribe({
        next: (updated) => {
          this.landowners.update(list => list.map(o => o.id === updated.id ? updated : o));
          this.isSaving.set(false);
          this.isCreateModalOpen.set(false);
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to update landowner profile');
          this.isSaving.set(false);
        }
      });
    } else {
      this.landService.createLandowner(payload).subscribe({
        next: (created) => {
          this.landowners.update(list => [created, ...list]);
          this.isSaving.set(false);
          this.isCreateModalOpen.set(false);
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to create landowner');
          this.isSaving.set(false);
        }
      });
    }
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
