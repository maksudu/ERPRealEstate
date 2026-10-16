import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HandoverService } from '../../../core/services/handover.service';
import { HandoverInspection } from '../../../core/models/handover.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../shared/components';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-handover-possession',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './handover-possession.component.html'
})
export class HandoverPossessionComponent implements OnInit {
  private handoverService = inject(HandoverService);
  private fb = inject(FormBuilder);

  inspections = signal<HandoverInspection[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isExecuteModalOpen = signal<boolean>(false);
  selectedInspection = signal<HandoverInspection | null>(null);

  searchQuery = signal<string>('');

  createForm: FormGroup = this.fb.group({
    booking_id: [1, [Validators.required, Validators.min(1)]],
    unit_id: [1, [Validators.required, Validators.min(1)]],
    site_engineer_id: [1, [Validators.required, Validators.min(1)]],
    inspection_date: [new Date().toISOString().split('T')[0], Validators.required],
    all_financial_dues_cleared: [true, Validators.required],
    notes: ['']
  });

  executeForm: FormGroup = this.fb.group({
    possession_handover_date: [new Date().toISOString().split('T')[0], Validators.required],
    notes: ['All apartment keys, DB keys, and warranty certificates handed over to allottee.']
  });

  filteredInspections = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.inspections().filter(insp => {
      if (!q) return true;
      return (
        (insp.customer_name && insp.customer_name.toLowerCase().includes(q)) ||
        (insp.project_name && insp.project_name.toLowerCase().includes(q)) ||
        (insp.unit_number && insp.unit_number.toLowerCase().includes(q)) ||
        (insp.possession_letter_number && insp.possession_letter_number.toLowerCase().includes(q))
      );
    });
  });

  ngOnInit(): void {
    this.loadInspections();
  }

  loadInspections(): void {
    this.isLoading.set(true);
    this.handoverService.getInspections().subscribe({
      next: (data) => {
        this.inspections.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openCreateModal(): void {
    this.createForm.reset({
      booking_id: 1,
      unit_id: 1,
      site_engineer_id: 1,
      inspection_date: new Date().toISOString().split('T')[0],
      all_financial_dues_cleared: true,
      notes: 'Apartment interior, sanitary fittings, and joinery inspected with buyer.'
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitInspection(): void {
    if (this.createForm.invalid) return;
    this.isSubmitting.set(true);

    const val = this.createForm.value;
    const payload = {
      booking_id: Number(val.booking_id),
      unit_id: Number(val.unit_id),
      site_engineer_id: Number(val.site_engineer_id),
      inspection_date: val.inspection_date,
      all_financial_dues_cleared: Boolean(val.all_financial_dues_cleared),
      notes: val.notes
    };

    this.handoverService.createInspection(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadInspections();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to record inspection');
      }
    });
  }

  openExecuteModal(insp: HandoverInspection): void {
    if (!insp.all_financial_dues_cleared) {
      alert('Cannot execute possession handover! Accounts clearance is pending. All financial dues must be settled.');
      return;
    }
    this.selectedInspection.set(insp);
    this.executeForm.reset({
      possession_handover_date: new Date().toISOString().split('T')[0],
      notes: 'Key set (3 main door + 2 bedroom + 1 DB box) delivered in presence of site supervisor.'
    });
    this.isExecuteModalOpen.set(true);
  }

  closeExecuteModal(): void {
    this.isExecuteModalOpen.set(false);
    this.selectedInspection.set(null);
  }

  submitExecution(): void {
    if (this.executeForm.invalid || !this.selectedInspection()) return;
    this.isSubmitting.set(true);

    const id = this.selectedInspection()!.id;
    this.handoverService.executeHandover(id, this.executeForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeExecuteModal();
        this.loadInspections();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err.error?.detail || 'Failed to execute possession handover');
      }
    });
  }

  downloadPossessionPdf(insp: HandoverInspection): void {
    const url = `${environment.apiUrl}/handover/inspections/${insp.id}/possession-letter`;
    window.open(url, '_blank');
  }
}
