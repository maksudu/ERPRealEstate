import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InstallmentService } from '../../../core/services/installment.service';
import { NI138LegalAction } from '../../../core/models/installment.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../shared/components';

@Component({
  selector: 'app-ni138-actions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  templateUrl: './ni138-actions.component.html'
})
export class NI138ActionsComponent implements OnInit {
  private installmentService = inject(InstallmentService);
  private fb = inject(FormBuilder);

  actions = signal<NI138LegalAction[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isServeModalOpen = signal<boolean>(false);
  isFileCaseModalOpen = signal<boolean>(false);
  selectedAction = signal<NI138LegalAction | null>(null);

  serveForm: FormGroup = this.fb.group({
    notice_served_to_client_date: [new Date().toISOString().split('T')[0], Validators.required],
    registered_post_ad_no: ['', Validators.required],
    legal_counsel_name: ['Barrister Tanvir Ahmed (Supreme Court)', Validators.required],
    remarks: ['']
  });

  fileCaseForm: FormGroup = this.fb.group({
    court_case_no: ['', Validators.required],
    legal_counsel_name: ['Barrister Tanvir Ahmed (Supreme Court)', Validators.required],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.installmentService.getNI138Actions().subscribe({
      next: (res) => {
        this.actions.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  // WeasyPrint Section 138 Notice Download
  downloadNotice(action: NI138LegalAction): void {
    this.installmentService.downloadNoticePdf(action.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Statutory_Notice_NI138_Cheque_${action.cheque_number}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download legal notice PDF: ' + (err?.error?.detail || 'Server error'))
    });
  }

  // Serve Notice
  openServeModal(action: NI138LegalAction): void {
    this.selectedAction.set(action);
    this.serveForm.reset({
      notice_served_to_client_date: new Date().toISOString().split('T')[0],
      registered_post_ad_no: `REG-AD-DHAKA-GPO-${Math.floor(10000 + Math.random() * 90000)}`,
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      remarks: 'Formal statutory notice dispatched under Registered Post with A/D.'
    });
    this.isServeModalOpen.set(true);
  }

  closeServeModal(): void {
    this.isServeModalOpen.set(false);
    this.selectedAction.set(null);
  }

  submitServeNotice(): void {
    const action = this.selectedAction();
    if (!action || this.serveForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.serveNotice(action.id, this.serveForm.value).subscribe({
      next: (updated) => {
        this.actions.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.isSubmitting.set(false);
        this.closeServeModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to record notice serving');
        this.isSubmitting.set(false);
      }
    });
  }

  // File Court Case
  openFileCaseModal(action: NI138LegalAction): void {
    this.selectedAction.set(action);
    const yr = new Date().getFullYear();
    const rand = Math.floor(100 + Math.random() * 900);
    this.fileCaseForm.reset({
      court_case_no: `CR Case No. ${rand}/${yr} (CMM Court, Dhaka)`,
      legal_counsel_name: 'Barrister Tanvir Ahmed (Supreme Court)',
      remarks: 'Statutory 30-day notice period expired without payment. Formal criminal complaint lodged under NI Act Section 138.'
    });
    this.isFileCaseModalOpen.set(true);
  }

  closeFileCaseModal(): void {
    this.isFileCaseModalOpen.set(false);
    this.selectedAction.set(null);
  }

  submitFileCase(): void {
    const action = this.selectedAction();
    if (!action || this.fileCaseForm.invalid) return;

    this.isSubmitting.set(true);
    this.installmentService.fileCourtCase(action.id, this.fileCaseForm.value).subscribe({
      next: (updated) => {
        this.actions.update(list => list.map(a => a.id === updated.id ? updated : a));
        this.isSubmitting.set(false);
        this.closeFileCaseModal();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to record court filing');
        this.isSubmitting.set(false);
      }
    });
  }

  // Trigger NI 138 Statutory Deadlines Audit
  triggerNi138Audit(): void {
    this.installmentService.triggerNi138Deadlines().subscribe({
      next: (res) => {
        alert(`Section 138 Statutory Litigation Audit Completed!\n${res.total_expired_notices} expired notice(s) identified. Legal alerts dispatched.`);
        this.loadData();
      },
      error: () => alert('Failed to execute NI 138 statutory litigation audit')
    });
  }
}
