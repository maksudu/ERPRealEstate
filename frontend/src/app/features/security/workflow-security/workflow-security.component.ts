import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SecurityService, WorkflowRule } from '../../../core/services/security.service';
import { SecurityNavComponent } from '../security-nav/security-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-workflow-security',
  standalone: true,
  imports: [CommonModule, FormsModule, CardContainerComponent, ModalComponent, SearchableSelectComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <!-- Top Separation of Duties Banner -->
      <div class="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/40 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            ⚖️
          </div>
          <div>
            <div class="text-sm font-bold text-rose-900 dark:text-rose-100">
              Segregation of Duties (SoD) Protocol
            </div>
            <div class="text-xs text-rose-700 dark:text-rose-300">
              Makers cannot verify or approve their own financial vouchers. All approvals require 2-tier or 3-tier authorizations.
            </div>
          </div>
        </div>

        <button
          type="button"
          (click)="openModal()"
          class="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 shadow-2xs transition"
        >
          <span>+</span> Configure Workflow Rule
        </button>
      </div>

      <!-- Main Workflow Table -->
      <app-card title="Maker-Checker-Approver Workflow Authorization Matrix" subtitle="Separation of duties rules for procurement, sales discounts, payroll and asset disposals">
        <!-- Search Bar -->
        <div class="mb-4 max-w-sm">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="loadRules()"
            placeholder="Search by module or role..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                <th class="p-3">ERP Transaction Module</th>
                <th class="p-3">Maker (Originator)</th>
                <th class="p-3">Checker (Reviewer)</th>
                <th class="p-3">Approver (Sanctioning Authority)</th>
                <th class="p-3 text-right">Approval Limit (BDT)</th>
                <th class="p-3 text-center">Self-Approval Block</th>
                <th class="p-3 text-center">Status</th>
                <th class="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              @if (loading) {
                <tr>
                  <td colspan="8" class="p-6 text-center text-slate-400">Loading workflow rules...</td>
                </tr>
              } @else {
                @for (item of rules; track item.id) {
                  <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                      {{ item.module_name }}
                    </td>
                    <td class="p-3 text-indigo-600 font-medium">{{ item.maker_role }}</td>
                    <td class="p-3 text-amber-600 font-medium">{{ item.checker_role }}</td>
                    <td class="p-3 text-emerald-600 font-bold">{{ item.approver_role }}</td>
                    <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                      ৳ {{ item.threshold_limit_bdt | number:'1.2-2' }}
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        ENFORCED
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          (click)="openEditModal(item)"
                          class="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          title="Edit Rule"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          (click)="deleteRule(item)"
                          class="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                          title="Delete Rule"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>Showing {{ offset + 1 }} to {{ Math.min(offset + limit, totalRecords) }} of {{ totalRecords }} rules</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              [disabled]="offset === 0"
              (click)="prevPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Previous
            </button>
            <span>Page {{ currentPage }} of {{ totalPages || 1 }}</span>
            <button
              type="button"
              [disabled]="offset + limit >= totalRecords"
              (click)="nextPage()"
              class="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Configure Rule Modal -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Approver Workflow Rule"
        size="lg"
        (close)="closeModal()"
      >
        <div class="space-y-4 p-4 text-xs">
          <div>
            <app-searchable-select
              categoryCode="ERP_TRANSACTION_TYPE"
              label="ERP Transaction Module *"
              placeholder="Select module..."
              [(ngModel)]="formData.module_name"
              [options]="moduleOptions"
              [allowCreateNew]="true"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Maker Role *</label>
              <input
                type="text"
                [(ngModel)]="formData.maker_role"
                placeholder="e.g. Purchase Officer"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Checker Role *</label>
              <input
                type="text"
                [(ngModel)]="formData.checker_role"
                placeholder="e.g. Procurement Manager"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Approver Role *</label>
              <input
                type="text"
                [(ngModel)]="formData.approver_role"
                placeholder="e.g. Managing Director"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Approval Threshold Limit (BDT) *</label>
            <input
              type="number"
              [(ngModel)]="formData.threshold_limit_bdt"
              placeholder="e.g. 1000000"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>
        </div>

        <div modal-actions class="flex items-center justify-end gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            (click)="closeModal()"
            class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            (click)="saveRule()"
            [disabled]="!formData.module_name || !formData.maker_role"
            class="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-40 text-xs shadow-2xs"
          >
            Save Rule
          </button>
        </div>
      </app-modal>
    </div>
  `
})
export class WorkflowSecurityComponent implements OnInit {
  private service = inject(SecurityService);

  rules: WorkflowRule[] = [];
  loading = false;
  isModalOpen = false;
  isEditMode = false;
  editingId: number | null = null;
  Math = Math;

  searchQuery = '';
  limit = 20;
  offset = 0;
  totalRecords = 0;

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.limit);
  }

  get currentPage(): number {
    return Math.floor(this.offset / this.limit) + 1;
  }

  moduleOptions: SelectOption[] = [
    { value: 'Land Acquisition', label: 'Land Acquisition' },
    { value: 'Project Budget', label: 'Project Budget' },
    { value: 'Purchase Order', label: 'Purchase Order' },
    { value: 'Sales Discount', label: 'Sales Discount' },
    { value: 'Customer Refund', label: 'Customer Refund' },
    { value: 'Journal Voucher', label: 'Journal Voucher' },
    { value: 'Payroll & Disbursement', label: 'Payroll & Disbursement' },
    { value: 'Asset Disposal', label: 'Asset Disposal' }
  ];

  formData = {
    module_name: 'Purchase Order',
    maker_role: 'Purchase Officer',
    checker_role: 'Procurement Manager',
    approver_role: 'Managing Director',
    threshold_limit_bdt: 2000000
  };

  ngOnInit(): void {
    this.loadRules();
  }

  loadRules(): void {
    this.loading = true;
    this.service.getWorkflowRules({
      search: this.searchQuery,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.rules = res.items || [];
        this.totalRecords = res.total || 0;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load workflow rules', err);
        this.loading = false;
      }
    });
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalRecords) {
      this.offset += this.limit;
      this.loadRules();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadRules();
    }
  }

  openModal(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formData = {
      module_name: 'Purchase Order',
      maker_role: 'Purchase Officer',
      checker_role: 'Procurement Manager',
      approver_role: 'Managing Director',
      threshold_limit_bdt: 2000000
    };
    this.isModalOpen = true;
  }

  openEditModal(rule: WorkflowRule): void {
    this.isEditMode = true;
    this.editingId = rule.id;
    this.formData = {
      module_name: rule.module_name,
      maker_role: rule.maker_role,
      checker_role: rule.checker_role,
      approver_role: rule.approver_role,
      threshold_limit_bdt: rule.threshold_limit_bdt
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveRule(): void {
    if (this.isEditMode && this.editingId) {
      this.service.updateWorkflowRule(this.editingId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRules();
        },
        error: (err) => console.error('Failed to update workflow rule', err)
      });
    } else {
      this.service.createWorkflowRule(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadRules();
        },
        error: (err) => console.error('Failed to create workflow rule', err)
      });
    }
  }

  deleteRule(rule: WorkflowRule): void {
    if (confirm(`Remove workflow rule for ${rule.module_name}?`)) {
      this.service.deleteWorkflowRule(rule.id).subscribe({
        next: () => this.loadRules(),
        error: (err) => console.error('Failed to delete workflow rule', err)
      });
    }
  }
}
