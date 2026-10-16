import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperationsService } from '../../../core/services/operations.service';
import { CourtCase } from '../../../core/models/operations.model';
import { CardContainerComponent } from '../../../shared/components';

@Component({
  selector: 'app-legal-cases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent
  ],
  templateUrl: './legal-cases.component.html'
})
export class LegalCasesComponent implements OnInit {
  private opsService = inject(OperationsService);
  private fb = inject(FormBuilder);

  cases = signal<CourtCase[]>([]);
  loading = signal<boolean>(false);
  selectedTypeFilter = signal<string>('ALL');

  showAddModal = signal<boolean>(false);
  showStatusModal = signal<boolean>(false);
  selectedCase = signal<CourtCase | null>(null);

  caseForm!: FormGroup;
  statusForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadCases();
  }

  private initForms(): void {
    this.caseForm = this.fb.group({
      case_type: ['Title Suit', [Validators.required]],
      case_number: ['', [Validators.required]],
      concerned_court: ['', [Validators.required]],
      plaintiff: ['', [Validators.required]],
      defendant: ['', [Validators.required]],
      appointed_advocate: ['', [Validators.required]],
      next_hearing_date: [''],
      status: ['HEARING_ONGOING'],
      case_summary: ['']
    });

    this.statusForm = this.fb.group({
      new_status: ['HEARING_ONGOING', [Validators.required]],
      summary_update: ['']
    });
  }

  loadCases(): void {
    this.loading.set(true);
    this.opsService.getCourtCases().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.cases.set(data);
        } else {
          this.cases.set(this.getMockCases());
        }
        this.loading.set(false);
      },
      error: () => {
        this.cases.set(this.getMockCases());
        this.loading.set(false);
      }
    });
  }

  get filteredCases(): CourtCase[] {
    const filter = this.selectedTypeFilter();
    if (filter === 'ALL') return this.cases();
    return this.cases().filter(c => c.case_type === filter);
  }

  openStatusModal(c: CourtCase): void {
    this.selectedCase.set(c);
    this.statusForm.patchValue({
      new_status: c.status,
      summary_update: ''
    });
    this.showStatusModal.set(true);
  }

  submitCase(): void {
    if (this.caseForm.invalid) return;

    this.opsService.createCourtCase(this.caseForm.value).subscribe({
      next: () => {
        this.showAddModal.set(false);
        this.caseForm.reset({ case_type: 'Title Suit', status: 'HEARING_ONGOING' });
        this.loadCases();
      },
      error: () => {
        const newCase: CourtCase = {
          id: Date.now(),
          ...this.caseForm.value
        };
        this.cases.update(c => [newCase, ...c]);
        this.showAddModal.set(false);
        this.caseForm.reset({ case_type: 'Title Suit', status: 'HEARING_ONGOING' });
      }
    });
  }

  submitStatusUpdate(): void {
    if (this.statusForm.invalid || !this.selectedCase()) return;
    const c = this.selectedCase()!;
    const { new_status, summary_update } = this.statusForm.value;

    this.opsService.updateCourtCaseStatus(c.id, new_status, summary_update).subscribe({
      next: () => {
        this.showStatusModal.set(false);
        this.loadCases();
      },
      error: () => {
        c.status = new_status;
        if (summary_update) {
          c.case_summary = (c.case_summary || '') + '\n' + summary_update;
        }
        this.showStatusModal.set(false);
      }
    });
  }

  private getMockCases(): CourtCase[] {
    return [
      {
        id: 1,
        case_type: 'Title Suit',
        case_number: 'TS 104/2025',
        concerned_court: 'Joint District Judge 1st Court, Dhaka',
        plaintiff: 'Abdul Karim & Others',
        defendant: 'ERP Real Estate Bangladesh Ltd',
        appointed_advocate: 'Advocate Rafiqul Haque (Supreme Court)',
        next_hearing_date: '2026-11-12',
        status: 'HEARING_ONGOING',
        case_summary: 'Dispute regarding CS/SA boundary overlap on 4.5 decimals of land at Gulshan project. Injunction petition contested successfully.'
      },
      {
        id: 2,
        case_type: 'NI Act 138',
        case_number: 'CR 891/2026',
        concerned_court: 'Chief Metropolitan Magistrate Court-4, Dhaka',
        plaintiff: 'ERP Real Estate Bangladesh Ltd',
        defendant: 'Engr. Mahbubur Rahman',
        appointed_advocate: 'Advocate Shamsul Huda',
        next_hearing_date: '2026-10-28',
        status: 'FILED',
        case_summary: 'Cheque dishonor under Section 138 of Negotiable Instruments Act 1881 for bounced installment cheque ৳ ৭,৫০,০০০. Statutory 30-day notice served.'
      },
      {
        id: 3,
        case_type: 'Injunction',
        case_number: 'Misc 44/2025',
        concerned_court: 'Senior Assistant Judge Court, Savar',
        plaintiff: 'Neighboring Landowner (Haji Rustam Ali)',
        defendant: 'ERP Real Estate Bangladesh Ltd',
        appointed_advocate: 'Advocate Kamrul Hasan',
        next_hearing_date: '2026-11-05',
        status: 'STAY_ORDER_GRANTED',
        case_summary: 'Temporary stay order on access road piling works. Vacating petition filed under Order 39 Rule 4 of CPC.'
      }
    ];
  }
}
