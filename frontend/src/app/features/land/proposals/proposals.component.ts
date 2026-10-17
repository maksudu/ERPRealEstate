import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LandService } from '../../../core/services/land.service';
import { LandBank, DeedChainVerification } from '../../../core/models/land.model';
import { 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent, 
  CustomButtonComponent,
  SearchableSelectComponent,
  CustomTableComponent,
  TableColumn
} from '../../../shared/components';

@Component({
  selector: 'app-land-proposals',
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
  templateUrl: './proposals.component.html'
})
export class ProposalsComponent implements OnInit {
  private landService = inject(LandService);
  private fb = inject(FormBuilder);

  proposals = signal<LandBank[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  selectedProposal = signal<LandBank | null>(null);

  // Deed Chain Verification Modal State
  isChainModalOpen = signal<boolean>(false);
  chainVerification = signal<DeedChainVerification | null>(null);
  isLoadingChain = signal<boolean>(false);

  // Create Modal State
  isCreateModalOpen = signal<boolean>(false);
  createError = signal<string | null>(null);

  // Conversion Preview Signal
  calculatedSqft = signal<number>(0);
  calculatedDecimal = signal<number>(0);
  calculatedBigha = signal<number>(0);

  unitOptions = [
    { value: 'KATHA', label: 'Katha (কাঠা - 720 Sq Ft)', subLabel: 'Urban residential standard in Dhaka' },
    { value: 'DECIMAL', label: 'Decimal / Shotok (শতাংশ - 435.60 Sq Ft)', subLabel: 'Government registry record standard' },
    { value: 'BIGHA', label: 'Bigha (বিঘা - 20 Katha / 14,400 Sq Ft)', subLabel: 'Township / large tract standard' },
    { value: 'SQFT', label: 'Square Feet (বর্গফুট)', subLabel: 'Architectural FAR standard' }
  ];

  dealTypeOptions = [
    { value: 'JOINT_VENTURE', label: 'Joint Venture (JV 50:50 / 60:40)', subLabel: 'Landowner partnership with unit allocation' },
    { value: 'OUTRIGHT_PURCHASE', label: 'Outright Saf-Kabala Purchase', subLabel: 'Full direct land title acquisition' },
    { value: 'REVENUE_SHARE', label: 'Gross Revenue Sharing', subLabel: 'Percentage of top-line sales proceeds' }
  ];

  statusOptions = [
    { value: 'DRAFT_PROPOSAL', label: 'Draft Proposal', subLabel: 'Initial acquisition assessment' },
    { value: 'LEGAL_VETTING', label: 'Legal Vetting & AC Land Search', subLabel: 'Title deed search & chain verification' },
    { value: 'SURVEY_IN_PROGRESS', label: 'Survey In Progress', subLabel: 'Physical boundary demarcation & soil test' },
    { value: 'JV_SIGNED', label: 'JV Deed Signed & Registered', subLabel: 'Partnership deed & PoA completed' },
    { value: 'ACQUIRED', label: 'Fully Acquired', subLabel: 'Transferred to developer possession' }
  ];

  thanaOptions = [
    { value: 'Gulshan', label: 'Gulshan Thana', subLabel: 'Gulshan Sub-Registry Office' },
    { value: 'Banani', label: 'Banani Thana', subLabel: 'Gulshan Sub-Registry Office' },
    { value: 'Dhanmondi', label: 'Dhanmondi Thana', subLabel: 'Mohammadpur Sub-Registry Office' },
    { value: 'Tejgaon', label: 'Tejgaon Thana', subLabel: 'Tejgaon Sub-Registry Office' },
    { value: 'Uttara', label: 'Uttara Thana', subLabel: 'Uttara Sub-Registry Office' },
    { value: 'Purbachal', label: 'Purbachal / Rupganj', subLabel: 'Rupganj Sub-Registry Office' },
    { value: 'Badda', label: 'Badda Thana', subLabel: 'Badda Sub-Registry Office' },
    { value: 'Mirpur', label: 'Mirpur Thana', subLabel: 'Mirpur Sub-Registry Office' }
  ];

  proposalForm: FormGroup = this.fb.group({
    project_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_-]+$/)]],
    proposal_title: ['', Validators.required],
    mouza_name: ['', Validators.required],
    jl_number: ['', Validators.required],
    upazila_thana: ['Gulshan', Validators.required],
    district: ['Dhaka', Validators.required],
    sub_registry_office: ['Gulshan Sub-Registry Office', Validators.required],
    input_unit: ['KATHA', Validators.required],
    input_value: [null, [Validators.required, Validators.min(0.01)]],
    deal_type: ['JOINT_VENTURE', Validators.required],
    status: ['DRAFT_PROPOSAL'],
    location_description: [''],
    owner_name_en: ['', Validators.required],
    owner_nid: [''],
    owner_phone: ['']
  });

  tableColumns: TableColumn[] = [
    { field: 'project_code', header: 'Project Code', width: '130px' },
    { field: 'proposal_title', header: 'Proposal Title & Mouza' },
    { field: 'total_area_katha', header: 'Area (Katha / SqFt)', width: '160px' },
    { field: 'deal_type', header: 'Deal Type', width: '140px' },
    { field: 'status', header: 'Status', width: '150px' },
    { field: 'actions', header: 'Actions', width: '180px', align: 'right' }
  ];

  ngOnInit(): void {
    this.loadProposals();
  }

  loadProposals(): void {
    this.isLoading.set(true);
    this.landService.getProposals().subscribe({
      next: (data) => {
        this.proposals.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onAreaInput(): void {
    const unit = this.proposalForm.get('input_unit')?.value || 'KATHA';
    const val = Number(this.proposalForm.get('input_value')?.value || 0);
    if (val <= 0) {
      this.calculatedSqft.set(0);
      this.calculatedDecimal.set(0);
      return;
    }

    if (unit === 'KATHA') {
      const sqft = val * 720;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(Number((sqft / 435.6).toFixed(4)));
      this.calculatedBigha.set(Number((val / 20).toFixed(4)));
    } else if (unit === 'DECIMAL') {
      const sqft = val * 435.6;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(val);
      this.calculatedBigha.set(Number(((sqft / 720) / 20).toFixed(4)));
    } else if (unit === 'BIGHA') {
      const sqft = val * 14400;
      this.calculatedSqft.set(sqft);
      this.calculatedDecimal.set(Number((sqft / 435.6).toFixed(4)));
      this.calculatedBigha.set(val);
    } else {
      this.calculatedSqft.set(val);
      this.calculatedDecimal.set(Number((val / 435.6).toFixed(4)));
      this.calculatedBigha.set(Number(((val / 720) / 20).toFixed(4)));
    }
  }

  openCreateModal(): void {
    this.proposalForm.reset({
      project_code: `PRJ-LND-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      upazila_thana: 'Gulshan',
      district: 'Dhaka',
      sub_registry_office: 'Gulshan Sub-Registry Office',
      input_unit: 'KATHA',
      input_value: 15,
      deal_type: 'JOINT_VENTURE',
      status: 'DRAFT_PROPOSAL'
    });
    this.createError.set(null);
    this.onAreaInput();
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitProposal(): void {
    if (this.proposalForm.invalid) {
      this.proposalForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.createError.set(null);

    const f = this.proposalForm.value;
    const payload = {
      project_code: f.project_code,
      proposal_title: f.proposal_title,
      mouza_name: f.mouza_name,
      jl_number: f.jl_number,
      upazila_thana: f.upazila_thana,
      district: f.district,
      sub_registry_office: f.sub_registry_office,
      input_unit: f.input_unit,
      input_value: Number(f.input_value),
      deal_type: f.deal_type,
      status: f.status,
      location_description: f.location_description,
      landowners: f.owner_name_en ? [
        {
          owner_type: 'INDIVIDUAL',
          full_name_en: f.owner_name_en,
          nid_number: f.owner_nid || null,
          phone_number: f.owner_phone || null,
          ownership_share_ratio: 1.0
        }
      ] : []
    };

    this.landService.createProposal(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadProposals();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.createError.set(err.error?.detail || 'Failed to create land proposal.');
      }
    });
  }

  viewDeedChain(proposal: LandBank): void {
    this.selectedProposal.set(proposal);
    this.isChainModalOpen.set(true);
    this.isLoadingChain.set(true);
    this.landService.verifyDeedChain(proposal.id).subscribe({
      next: (chain) => {
        this.chainVerification.set(chain);
        this.isLoadingChain.set(false);
      },
      error: () => this.isLoadingChain.set(false)
    });
  }

  closeChainModal(): void {
    this.isChainModalOpen.set(false);
    this.chainVerification.set(null);
    this.selectedProposal.set(null);
  }
}
