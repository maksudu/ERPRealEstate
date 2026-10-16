import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { GoodsReceipt, PurchaseOrder } from '../../../core/models/procurement.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-procurement-grn',
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
  templateUrl: './procurement-grn.component.html'
})
export class ProcurementGrnComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private fb = inject(FormBuilder);

  grnList = signal<GoodsReceipt[]>([]);
  purchaseOrders = signal<PurchaseOrder[]>([]);

  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Modals
  isCreateGrnModalOpen = signal<boolean>(false);
  isThreeWayMatchModalOpen = signal<boolean>(false);
  selectedGrnForMatch = signal<GoodsReceipt | null>(null);

  // Filters
  filterMatchStatus = signal<string>('');

  createGrnForm: FormGroup = this.fb.group({
    po_id: [null, Validators.required],
    delivery_challan_number: ['', Validators.required],
    received_quantity: [null, [Validators.required, Validators.min(0.01)]],
    rejected_quantity: [0, [Validators.min(0)]],
    supplier_invoice_number: [''],
    supplier_invoice_amount: [null],
    inspection_remarks: ['']
  });

  threeWayMatchForm: FormGroup = this.fb.group({
    supplier_invoice_number: ['', Validators.required],
    supplier_invoice_amount: [null, [Validators.required, Validators.min(0)]],
    approval_action: ['APPROVE_MATCH', Validators.required],
    accounts_notes: ['']
  });

  matchFilterOptions = [
    { value: '', label: 'All 3-Way Match Statuses' },
    { value: 'PENDING_MATCH', label: 'Pending Invoice Entry' },
    { value: 'MATCHED_OK', label: 'Matched Cleanly' },
    { value: 'VARIANCE_FLAGGED', label: 'Variance Discrepancy Flagged' },
    { value: 'ACCOUNTS_APPROVED', label: 'Accounts Approved & Posted' }
  ];

  matchActionOptions = [
    { value: 'APPROVE_MATCH', label: 'Approve 3-Way Match & Post Accounts JV' },
    { value: 'REJECT_VARIANCE', label: 'Reject / Flag Invoice Variance' }
  ];

  activePoOptions = computed(() =>
    this.purchaseOrders()
      .filter(po => po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED')
      .map(po => ({
        value: po.id,
        label: `${po.po_number} - ${po.vendor_name} (${po.material_name}: ${po.ordered_quantity - po.total_received_quantity} remaining)`
      }))
  );

  ngOnInit(): void {
    this.loadPurchaseOrders();
    this.loadGRNs();
  }

  loadPurchaseOrders(): void {
    this.procurementService.getPurchaseOrders().subscribe({
      next: (res) => this.purchaseOrders.set(res),
      error: (err) => console.error('Failed to load POs', err)
    });
  }

  loadGRNs(): void {
    this.isLoading.set(true);
    const filter: any = {};
    if (this.filterMatchStatus()) filter.match_status = this.filterMatchStatus();

    this.procurementService.getGoodsReceipts(filter).subscribe({
      next: (res) => {
        this.grnList.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load GRNs', err);
        this.isLoading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.loadGRNs();
  }

  openCreateGrnModal(): void {
    const active = this.purchaseOrders().filter(p => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED');
    const firstPo = active.length ? active[0] : null;

    this.createGrnForm.reset({
      po_id: firstPo ? firstPo.id : null,
      delivery_challan_number: '',
      received_quantity: firstPo ? (firstPo.ordered_quantity - firstPo.total_received_quantity) : null,
      rejected_quantity: 0,
      supplier_invoice_number: '',
      supplier_invoice_amount: null,
      inspection_remarks: ''
    });
    this.isCreateGrnModalOpen.set(true);
  }

  closeCreateGrnModal(): void {
    this.isCreateGrnModalOpen.set(false);
  }

  submitCreateGrn(): void {
    if (this.createGrnForm.invalid) {
      this.createGrnForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.procurementService.createGoodsReceipt(this.createGrnForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateGrnModal();
        this.loadGRNs();
        this.loadPurchaseOrders();
      },
      error: (err) => {
        console.error('Failed to create GRN', err);
        this.isSubmitting.set(false);
      }
    });
  }

  openThreeWayMatchModal(grn: GoodsReceipt): void {
    this.selectedGrnForMatch.set(grn);
    this.threeWayMatchForm.reset({
      supplier_invoice_number: grn.supplier_invoice_number || '',
      supplier_invoice_amount: grn.supplier_invoice_amount || grn.calculated_expected_amount,
      approval_action: 'APPROVE_MATCH',
      accounts_notes: ''
    });
    this.isThreeWayMatchModalOpen.set(true);
  }

  closeThreeWayMatchModal(): void {
    this.isThreeWayMatchModalOpen.set(false);
    this.selectedGrnForMatch.set(null);
  }

  submitThreeWayMatch(): void {
    const grn = this.selectedGrnForMatch();
    if (!grn || this.threeWayMatchForm.invalid) return;

    this.isSubmitting.set(true);
    this.procurementService.executeThreeWayMatch(grn.id, this.threeWayMatchForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeThreeWayMatchModal();
        this.loadGRNs();
      },
      error: (err) => {
        alert(err.error?.detail || '3-Way Match Verification Failed');
        this.isSubmitting.set(false);
      }
    });
  }

  getMatchBadge(status: string): { text: string; bg: string; textCol: string; border: string } {
    switch (status) {
      case 'ACCOUNTS_APPROVED':
        return { text: 'ACCOUNTS APPROVED (JV POSTED)', bg: 'bg-emerald-50 dark:bg-emerald-950/40', textCol: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300' };
      case 'MATCHED_OK':
        return { text: '3-WAY MATCHED (ZERO VARIANCE)', bg: 'bg-blue-50 dark:bg-blue-950/40', textCol: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300' };
      case 'VARIANCE_FLAGGED':
        return { text: 'VARIANCE FLAGGED (DISCREPANCY)', bg: 'bg-rose-50 dark:bg-rose-950/40', textCol: 'text-rose-700 dark:text-rose-300 font-bold', border: 'border-rose-300 animate-pulse' };
      default:
        return { text: 'PENDING INVOICE MATCH', bg: 'bg-amber-50 dark:bg-amber-950/40', textCol: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300' };
    }
  }
}
