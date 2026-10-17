import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { SnagItem, DLPTicket, HandoverDashboardMetrics } from '../../../core/models/handover.model';
import { Unit } from '../../../core/models/inventory.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-handover-snagging',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './handover-snagging.component.html'
})
export class HandoverSnaggingComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private inventoryService = inject(InventoryService);
  private fb = inject(FormBuilder);

  // Active Tab: 'snags' (Pre-Handover Snagging) or 'dlp' (12-Month DLP Warranty Desk)
  activeTab = signal<'snags' | 'dlp'>('snags');

  // Data signals
  metrics = signal<HandoverDashboardMetrics | null>(null);
  snags = signal<SnagItem[]>([]);
  dlpTickets = signal<DLPTicket[]>([]);
  units = signal<Unit[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  categoryFilter = signal<string>('ALL');
  severityFilter = signal<string>('ALL');
  statusFilter = signal<string>('ALL');

  // Snag Modal States
  isCreateSnagModalOpen = signal<boolean>(false);
  isUpdateSnagModalOpen = signal<boolean>(false);
  selectedSnag = signal<SnagItem | null>(null);

  // DLP Ticket Modal States
  isCreateDLPModalOpen = signal<boolean>(false);
  isResolveDLPModalOpen = signal<boolean>(false);
  selectedDLPTicket = signal<DLPTicket | null>(null);

  // Forms
  snagForm: FormGroup = this.fb.group({
    unit_id: [null, [Validators.required, Validators.min(1)]],
    category: ['Paint', Validators.required],
    location: ['Master Bed Suite', Validators.required],
    defect_description: ['', Validators.required],
    severity: ['MEDIUM', Validators.required],
    contractor_name: [''],
    photo_attachment_url: ['assets/images/common/snag_sample.jpg'],
    target_fix_date: [new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
  });

  updateSnagForm: FormGroup = this.fb.group({
    status: ['FIXED', Validators.required],
    contractor_name: [''],
    verification_notes: [''],
    customer_accepted: [true]
  });

  dlpForm: FormGroup = this.fb.group({
    unit_id: [null, [Validators.required, Validators.min(1)]],
    ticket_category: ['Plumbing', Validators.required],
    defect_severity: ['HIGH', Validators.required],
    issue_description: ['', Validators.required],
    sla_hours: [48, [Validators.required, Validators.min(12)]],
    assigned_technician: [''],
    borne_by: ['DEVELOPER_WARRANTY', Validators.required]
  });

  resolveDLPForm: FormGroup = this.fb.group({
    status: ['RESOLVED', Validators.required],
    rectification_notes: ['', Validators.required],
    resolution_cost_bdt: [0, [Validators.min(0)]]
  });

  // Dynamic Options for Selects
  unitOptions = computed(() => {
    return this.units().map((u: any) => ({
      value: u.id,
      label: `Unit ${u.unit_number} (${u.gross_saleable_area_sqft || u.gross_sft || 1500} SFT)`
    }));
  });

  categoryFilterOptions = [
    { value: 'ALL', label: 'All Snag Categories' },
    { value: 'Civil', label: 'Civil & Plaster' },
    { value: 'Paint', label: 'Paint & Surface' },
    { value: 'Plumbing', label: 'Plumbing & Sanitary' },
    { value: 'Electrical', label: 'Electrical & DB Panel' },
    { value: 'Joinery', label: 'Wooden Doors & Joinery' },
    { value: 'Waterproofing', label: 'Waterproofing & Seepage' },
    { value: 'Tiles', label: 'Tiles & Marble' }
  ];

  severityOptions = [
    { value: 'ALL', label: 'All Severities' },
    { value: 'CRITICAL', label: 'Critical (24h SLA - Blocking Handover)' },
    { value: 'HIGH', label: 'High Priority (48h SLA)' },
    { value: 'MEDIUM', label: 'Medium Priority (72h SLA)' },
    { value: 'LOW', label: 'Minor Cosmetic (120h SLA)' }
  ];

  statusFilterOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'OPEN', label: 'Open (Pending Rectification)' },
    { value: 'ASSIGNED', label: 'Assigned to Trade Subcontractor' },
    { value: 'IN_PROGRESS', label: 'In Progress (Active Work)' },
    { value: 'FIXED', label: 'Fixed by Contractor (Awaiting QC)' },
    { value: 'VERIFIED_CLOSED', label: 'Verified & Customer Signed-Off' }
  ];

  borneByOptions = [
    { value: 'DEVELOPER_WARRANTY', label: 'Developer Statutory 12-Month DLP Warranty' },
    { value: 'CONTRACTOR_RETENTION', label: 'Contractor Retention Fund Deduction' },
    { value: 'CLIENT_CHARGEABLE', label: 'Client Modification / Chargeable' }
  ];

  // Computed filter lists
  filteredSnags = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.categoryFilter();
    const sev = this.severityFilter();
    const stat = this.statusFilter();

    return this.snags().filter(s => {
      const matchQ = !q ||
        s.snag_code.toLowerCase().includes(q) ||
        s.defect_description.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        (s.unit_number && s.unit_number.toLowerCase().includes(q)) ||
        (s.project_name && s.project_name.toLowerCase().includes(q)) ||
        (s.contractor_name && s.contractor_name.toLowerCase().includes(q));

      const matchCat = cat === 'ALL' || s.category === cat;
      const matchSev = sev === 'ALL' || s.severity === sev;
      const matchStat = stat === 'ALL' || s.status === stat;

      return matchQ && matchCat && matchSev && matchStat;
    });
  });

  filteredDLPTickets = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const sev = this.severityFilter();
    const stat = this.statusFilter();

    return this.dlpTickets().filter(t => {
      const matchQ = !q ||
        (t.ticket_code && t.ticket_code.toLowerCase().includes(q)) ||
        t.issue_description.toLowerCase().includes(q) ||
        t.ticket_category.toLowerCase().includes(q) ||
        (t.unit_number && t.unit_number.toLowerCase().includes(q)) ||
        (t.assigned_technician && t.assigned_technician.toLowerCase().includes(q));

      const matchSev = sev === 'ALL' || t.defect_severity === sev;
      const matchStat = stat === 'ALL' || t.status === stat;

      return matchQ && matchSev && matchStat;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.handoverService.getMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });

    this.handoverService.getSnags().subscribe({
      next: (s) => this.snags.set(s),
      error: () => {}
    });

    this.handoverService.getDLPTickets().subscribe({
      next: (t) => this.dlpTickets.set(t),
      error: () => {}
    });

    this.inventoryService.getUnits().subscribe({
      next: (u) => {
        this.units.set(u);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  setTab(tab: 'snags' | 'dlp'): void {
    this.activeTab.set(tab);
  }

  // Snag Modal Controls
  openCreateSnagModal(): void {
    const defaultUnit = this.units().length > 0 ? this.units()[0].id : null;
    this.snagForm.reset({
      unit_id: defaultUnit,
      category: 'Paint',
      location: 'Master Bed Suite',
      defect_description: 'Hairline paint blemish near ceiling cove light reveal.',
      severity: 'MEDIUM',
      contractor_name: 'Asian Paints Finishers Ltd.',
      photo_attachment_url: 'assets/images/common/snag_paint_01.jpg',
      target_fix_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    this.isCreateSnagModalOpen.set(true);
  }

  closeCreateSnagModal(): void {
    this.isCreateSnagModalOpen.set(false);
  }

  submitSnag(): void {
    if (this.snagForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.createSnag(this.snagForm.value).subscribe({
      next: (newSnag) => {
        this.snags.update(current => [newSnag, ...current]);
        this.isSubmitting.set(false);
        this.closeCreateSnagModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openUpdateSnagModal(snag: SnagItem): void {
    this.selectedSnag.set(snag);
    this.updateSnagForm.reset({
      status: snag.status === 'OPEN' ? 'IN_PROGRESS' : 'VERIFIED_CLOSED',
      contractor_name: snag.contractor_name || '',
      verification_notes: snag.verification_notes || 'Defect rectified per engineering specifications and accepted by allottee.',
      customer_accepted: true
    });
    this.isUpdateSnagModalOpen.set(true);
  }

  closeUpdateSnagModal(): void {
    this.isUpdateSnagModalOpen.set(false);
    this.selectedSnag.set(null);
  }

  submitUpdateSnag(): void {
    const snag = this.selectedSnag();
    if (!snag) return;
    this.isSubmitting.set(true);

    this.handoverService.updateSnag(snag.id, this.updateSnagForm.value).subscribe({
      next: (updated) => {
        this.snags.update(list => list.map(s => s.id === updated.id ? updated : s));
        this.isSubmitting.set(false);
        this.closeUpdateSnagModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // DLP Modal Controls
  openCreateDLPModal(): void {
    const defaultUnit = this.units().length > 0 ? this.units()[0].id : null;
    this.dlpForm.reset({
      unit_id: defaultUnit,
      ticket_category: 'Plumbing',
      defect_severity: 'HIGH',
      issue_description: 'Concealed CPVC hot water line weeping behind master bath tiles.',
      sla_hours: 48,
      assigned_technician: 'Engr. Moinul Hasan (Maintenance Lead)',
      borne_by: 'DEVELOPER_WARRANTY'
    });
    this.isCreateDLPModalOpen.set(true);
  }

  closeCreateDLPModal(): void {
    this.isCreateDLPModalOpen.set(false);
  }

  submitDLPTicket(): void {
    if (this.dlpForm.invalid) return;
    this.isSubmitting.set(true);

    this.handoverService.createDLPTicket(this.dlpForm.value).subscribe({
      next: (newTicket) => {
        this.dlpTickets.update(current => [newTicket, ...current]);
        this.isSubmitting.set(false);
        this.closeCreateDLPModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  openResolveDLPModal(ticket: DLPTicket): void {
    this.selectedDLPTicket.set(ticket);
    this.resolveDLPForm.reset({
      status: 'RESOLVED',
      rectification_notes: 'Angle valve replaced with high-pressure forged fitting. Waterproofing tested for 24 hours without drop.',
      resolution_cost_bdt: 2400
    });
    this.isResolveDLPModalOpen.set(true);
  }

  closeResolveDLPModal(): void {
    this.isResolveDLPModalOpen.set(false);
    this.selectedDLPTicket.set(null);
  }

  submitResolveDLP(): void {
    const ticket = this.selectedDLPTicket();
    if (!ticket) return;
    this.isSubmitting.set(true);

    this.handoverService.updateDLPTicketStatus(ticket.id, this.resolveDLPForm.value).subscribe({
      next: (updated) => {
        this.dlpTickets.update(list => list.map(t => t.id === updated.id ? updated : t));
        this.isSubmitting.set(false);
        this.closeResolveDLPModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // Quick lookup create handler
  openQuickCreate(categoryCode: string): void {
    // Handled natively by SearchableSelectComponent inline modal
  }
}
