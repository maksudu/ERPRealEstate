import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { DLPTicket } from '../../../core/models/handover.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
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
    CustomButtonComponent
  ],
  templateUrl: './handover-snagging.component.html'
})
export class HandoverSnaggingComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private fb = inject(FormBuilder);

  tickets = signal<DLPTicket[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isUpdateModalOpen = signal<boolean>(false);
  selectedTicket = signal<DLPTicket | null>(null);

  // Filters
  categoryFilter = signal<string>('');
  statusFilter = signal<string>('');
  searchQuery = signal<string>('');

  categoryOptions = [
    { id: 'Plumbing', name: 'Plumbing & Sanitary Lines' },
    { id: 'Electrical', name: 'Electrical Wiring & DB Panel' },
    { id: 'Tiles', name: 'Tiles & Marble De-bonding' },
    { id: 'Paint', name: 'Paint & Surface Finish' },
    { id: 'Doors', name: 'Doors, Locks & Joinery' },
    { id: 'Waterproofing', name: 'Rooftop & Balcony Waterproofing' }
  ];

  statusOptions = [
    { id: 'OPEN', name: 'Open (Pending Rectification)' },
    { id: 'IN_PROGRESS', name: 'In Progress (Site Team Assigned)' },
    { id: 'RESOLVED', name: 'Resolved (Awaiting Verification)' },
    { id: 'CLOSED', name: 'Closed (Allottee Signed-off)' }
  ];

  createForm: FormGroup = this.fb.group({
    unit_id: [1, [Validators.required, Validators.min(1)]],
    ticket_category: ['Plumbing', Validators.required],
    issue_description: ['', Validators.required],
    rectification_deadline: [
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Validators.required
    ]
  });

  updateForm: FormGroup = this.fb.group({
    status: ['IN_PROGRESS', Validators.required],
    rectification_notes: ['', Validators.required]
  });

  filteredTickets = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const cat = this.categoryFilter();
    const stat = this.statusFilter();

    return this.tickets().filter(t => {
      const matchesQ = !q ||
        t.issue_description.toLowerCase().includes(q) ||
        (t.unit_number && t.unit_number.toLowerCase().includes(q)) ||
        (t.project_name && t.project_name.toLowerCase().includes(q)) ||
        t.ticket_category.toLowerCase().includes(q);

      const matchesCat = !cat || t.ticket_category === cat;
      const matchesStat = !stat || t.status === stat;

      return matchesQ && matchesCat && matchesStat;
    });
  });

  openCount = computed(() => this.tickets().filter(t => t.status === 'OPEN').length);
  inProgressCount = computed(() => this.tickets().filter(t => t.status === 'IN_PROGRESS').length);
  resolvedCount = computed(() => this.tickets().filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length);

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.isLoading.set(true);
    this.handoverService.getDLPTickets().subscribe({
      next: (data) => {
        this.tickets.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      unit_id: 1,
      ticket_category: 'Plumbing',
      issue_description: '',
      rectification_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitTicket(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.createForm.value;
    const payload = {
      unit_id: Number(val.unit_id),
      ticket_category: val.ticket_category,
      issue_description: val.issue_description,
      rectification_deadline: val.rectification_deadline
    };

    this.handoverService.createDLPTicket(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadTickets();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record defect ticket');
      }
    });
  }

  openUpdateModal(ticket: DLPTicket): void {
    this.selectedTicket.set(ticket);
    this.updateForm.reset({
      status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED',
      rectification_notes: ticket.rectification_notes || ''
    });
    this.isUpdateModalOpen.set(true);
  }

  closeUpdateModal(): void {
    this.isUpdateModalOpen.set(false);
    this.selectedTicket.set(null);
  }

  submitUpdate(): void {
    if (this.updateForm.invalid || !this.selectedTicket()) return;
    this.isSubmitting.set(true);

    const ticketId = this.selectedTicket()!.id;
    this.handoverService.updateDLPTicketStatus(ticketId, this.updateForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeUpdateModal();
        this.loadTickets();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to update ticket status');
      }
    });
  }
}
