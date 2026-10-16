import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { LandBank, JVAgreement, JVUnitAllocation } from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomButtonComponent 
} from '../../../shared/components';

@Component({
  selector: 'app-land-jv-agreements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './jv-agreements.component.html'
})
export class JVAgreementsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  proposals = signal<LandBank[]>([]);
  agreements = signal<JVAgreement[]>([]);
  selectedAgreement = signal<JVAgreement | null>(null);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);
  isViewAllocationsModalOpen = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  jvForm: FormGroup = this.fb.group({
    land_bank_id: [null, Validators.required],
    agreement_deed_no: ['', Validators.required],
    landowner_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    developer_share_percent: [50, [Validators.required, Validators.min(1), Validators.max(99)]],
    signing_money_total: [0, [Validators.required, Validators.min(0)]],
    tenure_months: [36, [Validators.required, Validators.min(6)]],
    unit_allocations: this.fb.array([])
  });

  get unitAllocations(): FormArray {
    return this.jvForm.get('unit_allocations') as FormArray;
  }

  ngOnInit(): void {
    this.loadProposals();
    this.loadAgreements();
  }

  loadProposals(): void {
    this.landService.getProposals().subscribe({
      next: (data) => this.proposals.set(data)
    });
  }

  loadAgreements(): void {
    this.isLoading.set(true);
    this.landService.getJVAgreements().subscribe({
      next: (data) => {
        this.agreements.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onShareChange(source: 'landowner' | 'developer'): void {
    if (source === 'landowner') {
      const lo = Number(this.jvForm.get('landowner_share_percent')?.value || 0);
      this.jvForm.patchValue({ developer_share_percent: Math.max(0, 100 - lo) }, { emitEvent: false });
    } else {
      const dev = Number(this.jvForm.get('developer_share_percent')?.value || 0);
      this.jvForm.patchValue({ landowner_share_percent: Math.max(0, 100 - dev) }, { emitEvent: false });
    }
  }

  addUnitAllocation(): void {
    const group = this.fb.group({
      unit_identifier: ['', Validators.required],
      allocation_type: ['LANDOWNER_UNIT', Validators.required],
      allocation_notes: ['']
    });
    this.unitAllocations.push(group);
  }

  removeUnitAllocation(index: number): void {
    this.unitAllocations.removeAt(index);
  }

  openCreateModal(): void {
    this.jvForm.reset({
      landowner_share_percent: 50,
      developer_share_percent: 50,
      signing_money_total: 0,
      tenure_months: 36
    });
    this.unitAllocations.clear();
    // Default 2 sample units for demonstration
    this.unitAllocations.push(this.fb.group({
      unit_identifier: 'Tower A - Unit 3A',
      allocation_type: 'LANDOWNER_UNIT',
      allocation_notes: 'Landowner residential share (Permanently locked from sales)'
    }));
    this.unitAllocations.push(this.fb.group({
      unit_identifier: 'Tower A - Unit 4A',
      allocation_type: 'DEVELOPER_UNIT',
      allocation_notes: 'Developer share - Open for CRM sales'
    }));

    this.errorMessage.set(null);
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitAgreement(): void {
    if (this.jvForm.invalid) {
      this.jvForm.markAllAsTouched();
      return;
    }

    const f = this.jvForm.value;
    const total = Number(f.landowner_share_percent) + Number(f.developer_share_percent);
    if (total !== 100) {
      this.errorMessage.set(`Shares must total exactly 100%. Currently: ${total}%`);
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = {
      land_bank_id: Number(f.land_bank_id),
      agreement_deed_no: f.agreement_deed_no,
      landowner_share_percent: Number(f.landowner_share_percent),
      developer_share_percent: Number(f.developer_share_percent),
      signing_money_total: Number(f.signing_money_total),
      tenure_months: Number(f.tenure_months),
      unit_allocations: f.unit_allocations || []
    };

    this.landService.createJVAgreement(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadAgreements();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail || 'Failed to generate JV agreement.');
      }
    });
  }

  viewAllocations(ag: JVAgreement): void {
    this.selectedAgreement.set(ag);
    this.isViewAllocationsModalOpen.set(true);
  }

  closeAllocationsModal(): void {
    this.isViewAllocationsModalOpen.set(false);
    this.selectedAgreement.set(null);
  }

  getParcelTitle(landBankId: number): string {
    const p = this.proposals().find(x => x.id === landBankId);
    return p ? `${p.project_code} - ${p.proposal_title}` : `Parcel #${landBankId}`;
  }
}
