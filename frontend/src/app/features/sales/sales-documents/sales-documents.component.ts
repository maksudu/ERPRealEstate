import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { SalesLegalDocument, LegalDocumentTemplate, PaginatedSalesLegalDocuments } from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-sales-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './sales-documents.component.html'
})
export class SalesDocumentsComponent implements OnInit {
  protected readonly Math = Math;
  private salesService = inject(SalesService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Active Tab
  activeTab = signal<'documents' | 'checklist' | 'templates'>('documents');

  // Documents & Templates State
  documents = signal<SalesLegalDocument[]>([]);
  totalCount = signal<number>(0);
  loading = signal<boolean>(false);

  templates = signal<LegalDocumentTemplate[]>([]);
  loadingTemplates = signal<boolean>(false);

  // Filters & Pagination
  searchTerm = signal<string>('');
  selectedDocType = signal<string>('');
  selectedStatus = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  totalPages = computed(() => Math.ceil(this.totalCount() / this.pageSize()) || 1);

  // Filter Dropdown Options (All 13 Document Types)
  documentTypeFilterOptions = [
    { label: 'All Document Types', value: '' },
    { label: 'Property Reservation Form', value: 'PROPERTY_RESERVATION_FORM' },
    { label: 'Booking Application Form', value: 'BOOKING_APPLICATION' },
    { label: 'Booking Confirmation Letter', value: 'BOOKING_CONFIRMATION_LETTER' },
    { label: 'Allotment Letter', value: 'ALLOTMENT_LETTER' },
    { label: 'Agreement for Sale (বায়নানামা)', value: 'AGREEMENT_FOR_SALE' },
    { label: 'Payment Schedule Annexure', value: 'PAYMENT_SCHEDULE_ANNEXURE' },
    { label: 'Price & Discount Approval Sheet', value: 'PRICE_DISCOUNT_APPROVAL_SHEET' },
    { label: 'Co-buyer Declaration', value: 'COBUYER_DECLARATION' },
    { label: 'Nominee Form', value: 'NOMINEE_FORM' },
    { label: 'Agreement Amendment', value: 'AGREEMENT_AMENDMENT' },
    { label: 'Cancellation & Refund Documents', value: 'CANCELLATION_REFUND_DOCUMENT' },
    { label: 'Deed Preparation Checklist', value: 'DEED_PREPARATION_CHECKLIST' },
    { label: 'Possession & Handover Documents', value: 'POSSESSION_HANDOVER_DOCUMENT' }
  ];

  statusFilterOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Pending Legal Review', value: 'PENDING_LEGAL_REVIEW' },
    { label: 'Legal Approved', value: 'LEGAL_APPROVED' },
    { label: 'Executed & Signed', value: 'EXECUTED_SIGNED' },
    { label: 'Rejected', value: 'REJECTED' }
  ];

  // Calculated KPIs
  pendingReviewCount = signal<number>(0);
  signedCount = signal<number>(0);
  checklistPendingCount = signal<number>(0);

  // Template Modal State
  showTemplateModal = signal<boolean>(false);
  isSavingTemplate = signal<boolean>(false);
  templateForm: FormGroup = this.fb.group({
    template_code: ['', Validators.required],
    document_type: ['AGREEMENT_FOR_SALE', Validators.required],
    title_en: ['', Validators.required],
    title_bn: [''],
    header_branding_html: ['<div style="text-align:center; padding:15px; border-bottom:2px solid #000;"><h2>BLUEOCEANS REAL ESTATE LIMITED</h2><p>Dhaka, Bangladesh</p></div>'],
    content_template: ['', Validators.required],
    footer_legal_disclaimer: ['This instrument is subject to registration under the Registration Act 1908 and Stamp Act 1899.'],
    version: ['1.0'],
    is_active: [true]
  });

  ngOnInit(): void {
    this.loadDocuments();
    this.loadTemplates();
  }

  loadDocuments(): void {
    this.loading.set(true);
    const offset = (this.currentPage() - 1) * this.pageSize();

    this.salesService.getSalesDocumentsPaged({
      search: this.searchTerm() || undefined,
      document_type: this.selectedDocType() || undefined,
      legal_review_status: this.selectedStatus() || undefined,
      limit: this.pageSize(),
      offset: offset
    }).subscribe({
      next: (res: PaginatedSalesLegalDocuments) => {
        const items = res.items || [];
        this.documents.set(items);
        this.totalCount.set(res.total || items.length);
        this.loading.set(false);

        // Compute KPI summary
        let pending = 0;
        let signed = 0;
        let chkPending = 0;

        for (const doc of items) {
          if (doc.legal_review_status === 'DRAFT' || doc.legal_review_status === 'PENDING_LEGAL_REVIEW') pending++;
          if (doc.legal_review_status === 'EXECUTED_SIGNED') signed++;
          const chk = doc.checklist_status_json || {};
          const passed = Object.values(chk).filter(Boolean).length;
          if (passed < 8) chkPending++;
        }

        this.pendingReviewCount.set(pending);
        this.signedCount.set(signed);
        this.checklistPendingCount.set(chkPending);
      },
      error: () => this.loading.set(false)
    });
  }

  loadTemplates(): void {
    this.loadingTemplates.set(true);
    this.salesService.getDocumentTemplates().subscribe({
      next: (res) => {
        this.templates.set(res || []);
        this.loadingTemplates.set(false);
      },
      error: () => this.loadingTemplates.set(false)
    });
  }

  onSearchChange(term: string): void {
    this.searchTerm.set(term);
    this.currentPage.set(1);
    this.loadDocuments();
  }

  onDocTypeChange(type: string): void {
    this.selectedDocType.set(type);
    this.currentPage.set(1);
    this.loadDocuments();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1);
    this.loadDocuments();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadDocuments();
    }
  }

  navigateToGenerate(): void {
    this.router.navigate(['/sales/documents/create']);
  }

  useTemplateToGenerate(tpl: LegalDocumentTemplate): void {
    this.router.navigate(['/sales/documents/create'], {
      queryParams: { template_id: tpl.id, document_type: tpl.document_type }
    });
  }

  openNewTemplateModal(): void {
    this.templateForm.reset({
      template_code: 'TPL_AGR_' + (this.templates().length + 1),
      document_type: 'AGREEMENT_FOR_SALE',
      title_en: 'Standard Deed of Agreement for Sale',
      title_bn: 'ফ্ল্যাট বায়নাপত্র ও বিক্রয় চুক্তি',
      header_branding_html: '<div style="text-align:center; padding:15px; border-bottom:2px solid #000;"><h2>BLUEOCEANS REAL ESTATE LIMITED</h2></div>',
      content_template: `<h2>AGREEMENT FOR SALE (বায়নানামা)</h2>
<p>Between <strong>{{first_party_name}}</strong> (Developer/First Party) and <strong>{{customer_name}}</strong> (Purchaser/Second Party).</p>
<p>Project: {{project_name}} | Unit: {{unit_number}}</p>
<p>Agreed Selling Price: BDT {{contract_price}}</p>
<p>Booking Money realized: BDT {{booking_money}}</p>
<p>Agreed Down Payment: BDT {{down_payment}}</p>`,
      footer_legal_disclaimer: 'Drafted in accordance with Real Estate Development and Management Act 2010.',
      version: '1.0',
      is_active: true
    });
    this.showTemplateModal.set(true);
  }

  closeTemplateModal(): void {
    this.showTemplateModal.set(false);
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) return;
    this.isSavingTemplate.set(true);

    this.salesService.createDocumentTemplate(this.templateForm.value).subscribe({
      next: () => {
        this.isSavingTemplate.set(false);
        this.closeTemplateModal();
        this.loadTemplates();
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to save template.');
        this.isSavingTemplate.set(false);
      }
    });
  }

  downloadPdf(doc: SalesLegalDocument): void {
    if (!doc.id) return;
    this.salesService.downloadDocumentPdf(doc.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.document_number || 'legal-document'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => alert('Failed to download secure PDF.')
    });
  }

  formatDocType(type?: string | null): string {
    if (!type) return 'Document';
    const found = this.documentTypeFilterOptions.find(o => o.value === type);
    return found ? found.label.replace(/^\d+\.\s*/, '') : type.replace(/_/g, ' ') || 'Document';
  }

  formatStatus(status?: string | null): string {
    return status ? status.replace(/_/g, ' ') : 'DRAFT';
  }

  getStatusClass(status?: string | null): string {
    switch (status) {
      case 'EXECUTED_SIGNED':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'LEGAL_APPROVED':
        return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'PENDING_LEGAL_REVIEW':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'REJECTED':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }

  getChecklistPercentage(checklist?: { [key: string]: boolean }): number {
    if (!checklist) return 0;
    const total = 9;
    const count = Object.values(checklist).filter(Boolean).length;
    return Math.round((count / total) * 100);
  }

  getCompletedChecklistCount(checklist?: { [key: string]: boolean }): number {
    if (!checklist) return 0;
    return Object.values(checklist).filter(Boolean).length;
  }

  getChecklistStatus(doc: SalesLegalDocument, key: string): boolean {
    return !!(doc.checklist_status_json && doc.checklist_status_json[key]);
  }
}
