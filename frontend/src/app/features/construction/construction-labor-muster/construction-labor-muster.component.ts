import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConstructionService } from '../../../core/services/construction.service';
import { Subcontractor, DPRReport } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-construction-labor-muster',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './construction-labor-muster.component.html'
})
export class ConstructionLaborMusterComponent implements OnInit {
  private constructionService = inject(ConstructionService);
  private fb = inject(FormBuilder);

  contractors = signal<Subcontractor[]>([]);
  dprReports = signal<DPRReport[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isContractorModalOpen = signal<boolean>(false);

  contractorForm: FormGroup = this.fb.group({
    company_name: ['', Validators.required],
    trade_specialization: ['CIVIL_STRUCTURE', Validators.required],
    contact_person: ['', Validators.required],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    tin_number: [''],
    bin_number: ['']
  });

  tradeOptions = [
    { value: 'CIVIL_STRUCTURE', label: 'Civil Super-Structure (কংক্রিট ও কাঠামোগত নির্মাণ)' },
    { value: 'ROD_BINDING', label: 'Steel Reinforcement / Rod Binding (রড বাইন্ডিং)' },
    { value: 'SANITARY_PLUMBING', label: 'Sanitary & Plumbing (প্লাম্বিং ও পাইপলাইন)' },
    { value: 'ELECTRICAL', label: 'Electrical Wiring & Substation (ইলেকট্রিক্যাল)' },
    { value: 'TILES_MASONRY', label: 'Tiles, Marble & Masonry (টাইলস ও রাজমিস্ত্রি)' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.constructionService.getContractors().subscribe({
      next: (c) => this.contractors.set(c),
      error: () => {}
    });

    this.constructionService.getDPRReports().subscribe({
      next: (dprs) => {
        this.dprReports.set(dprs);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // Flattened labor entries across all DPRs
  getAllLaborEntries() {
    const list: any[] = [];
    for (const d of this.dprReports()) {
      for (const l of d.labor_entries) {
        list.push({
          ...l,
          report_date: d.report_date,
          project_name: d.project_name
        });
      }
    }
    return list;
  }

  openContractorModal(): void {
    this.contractorForm.reset({
      company_name: '',
      trade_specialization: 'CIVIL_STRUCTURE',
      contact_person: '',
      primary_phone: '',
      tin_number: '',
      bin_number: ''
    });
    this.isContractorModalOpen.set(true);
  }

  closeContractorModal(): void {
    this.isContractorModalOpen.set(false);
  }

  submitContractor(): void {
    if (this.contractorForm.invalid) return;
    this.isSubmitting.set(true);
    this.constructionService.createContractor(this.contractorForm.value).subscribe({
      next: (created) => {
        this.contractors.update(list => [...list, created]);
        this.isSubmitting.set(false);
        this.closeContractorModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Contractor registration failed');
        this.isSubmitting.set(false);
      }
    });
  }
}
