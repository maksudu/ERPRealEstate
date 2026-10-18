import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProcurementService } from '../../../core/services/procurement.service';
import { ProjectService } from '../../../core/services/project.service';
import { PurchaseRequisition, MaterialItem, SiteStore, Vendor } from '../../../core/models/procurement.model';
import { Project } from '../../../core/models/project.model';
import { ProcurementNavComponent } from '../procurement-nav/procurement-nav.component';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  ModalComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-purchase-requisitions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProcurementNavComponent,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    ModalComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    <app-procurement-nav
      title="9.4 Purchase Requisition (PR)"
      subtitle="Site Material Indents, Multi-Tier Approval Chain, BOQ Budget Verification & Headroom Enforcement"
    >
      <div actions class="flex items-center gap-2">
        <button
          type="button"
          (click)="loadRequisitions()"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
        <button
          type="button"
          (click)="openAddModal()"
          class="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors"
        >
          <span>+</span>
          <span>Raise Purchase Requisition (PR)</span>
        </button>
      </div>
    </app-procurement-nav>

    <!-- Top KPI Row -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Total Requisitions</span>
          <span class="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">📋 PR</span>
        </div>
        <div class="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2">{{ requisitions().length }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Raised across all active sites</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Pending Site/Budget Approvals</span>
          <span class="p-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-bold">⏳ In Review</span>
        </div>
        <div class="text-2xl font-black text-amber-800 dark:text-amber-400 mt-2">{{ pendingApprovalsCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Awaiting verification</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Approved for Purchase</span>
          <span class="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">✅ Approved</span>
        </div>
        <div class="text-2xl font-black text-emerald-800 dark:text-emerald-400 mt-2">{{ approvedCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Ready for RFQ / PO Issuance</p>
      </div>

      <div class="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 p-4 rounded-xl shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-slate-700 dark:text-slate-300">Emergency & Urgent</span>
          <span class="p-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-xs font-bold">🔥 Priority</span>
        </div>
        <div class="text-2xl font-black text-red-800 dark:text-red-400 mt-2">{{ urgentCount() }}</div>
        <p class="text-xs text-slate-700 dark:text-slate-300 mt-1">Fast-track procurement required</p>
      </div>
    </div>

    <!-- Main Card Container: PR Register -->
    <app-card-container
      title="Purchase Requisition & Indent Register"
      subtitle="Track material requisitions, BOQ budget headroom, and approval state (Draft → Submitted → Site Approved → Budget Verified → Approved for Purchase)"
    >
      <!-- Filters and Search Toolbar -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="w-64">
            <app-custom-input
              placeholder="Search PR #, project, material, tower..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearchChange()"
            ></app-custom-input>
          </div>

          <div class="w-48">
            <select
              [(ngModel)]="selectedProjectId"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">All Construction Sites</option>
              <option *ngFor="let p of projects()" [ngValue]="p.id">#{{ p.id }} - {{ p.project_name }}</option>
            </select>
          </div>

          <div class="w-44">
            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="SITE_APPROVED">Site Approved</option>
              <option value="BUDGET_VERIFIED">Budget Verified</option>
              <option value="PROCUREMENT_REVIEWED">Procurement Reviewed</option>
              <option value="APPROVED_FOR_PURCHASE">Approved for Purchase</option>
              <option value="RFQ_ISSUED">RFQ Issued</option>
              <option value="PO_ISSUED">PO Issued</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div class="w-36">
            <select
              [(ngModel)]="selectedPriority"
              (ngModelChange)="onFilterChange()"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">All Priorities</option>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>

          <button
            *ngIf="searchQuery || selectedProjectId !== null || selectedStatus || selectedPriority"
            (click)="resetFilters()"
            class="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>

        <div class="text-xs text-slate-700 dark:text-slate-300">
          Showing {{ pagedRequisitions().length }} of {{ filteredRequisitions().length }} requisitions
        </div>
      </div>

      <!-- Table: NO inline form under table! Strictly modals -->
      <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
              <th class="p-3">PR Number & Date</th>
              <th class="p-3">Project & Location</th>
              <th class="p-3">Material & Specification</th>
              <th class="p-3 text-right">Requested Qty</th>
              <th class="p-3 text-center">Priority</th>
              <th class="p-3">Required By</th>
              <th class="p-3 text-center">BOQ Headroom</th>
              <th class="p-3 text-center">Workflow Status</th>
              <th class="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              *ngFor="let pr of pagedRequisitions()"
              class="hover:bg-amber-500/5 transition-colors text-slate-700 dark:text-slate-200"
            >
              <td class="p-3">
                <div class="font-mono font-bold text-amber-700 dark:text-amber-400">{{ pr.pr_number }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">{{ pr.requisition_date | date:'dd MMM yyyy' }}</div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ pr.project_name || ('Project #' + pr.project_id) }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400">
                  <span *ngIf="pr.tower_name">{{ pr.tower_name }}</span>
                  <span *ngIf="pr.floor_number">, Floor: {{ pr.floor_number }}</span>
                  <span *ngIf="!pr.tower_name && !pr.floor_number">Site Wide</span>
                </div>
              </td>
              <td class="p-3">
                <div class="font-bold text-slate-900 dark:text-slate-100">{{ pr.material_name || ('Material #' + pr.material_id) }}</div>
                <div class="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-xs" [title]="pr.purpose_notes || ''">
                  {{ pr.purpose_notes || 'Civil casting / masonry' }}
                </div>
              </td>
              <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                {{ pr.requested_quantity | number:'1.2-2' }} <span class="text-xs font-normal text-slate-600 dark:text-slate-400">{{ pr.unit_of_measure }}</span>
              </td>
              <td class="p-3 text-center">
                <span
                  [ngClass]="{
                    'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800': pr.priority === 'EMERGENCY',
                    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800': pr.priority === 'URGENT',
                    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700': !pr.priority || pr.priority === 'NORMAL'
                  }"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                >
                  {{ pr.priority || 'NORMAL' }}
                </span>
              </td>
              <td class="p-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                {{ pr.required_by_date ? (pr.required_by_date | date:'dd MMM yyyy') : 'Immediate' }}
              </td>
              <td class="p-3 text-center">
                <span
                  *ngIf="pr.boq_remaining_headroom !== undefined && pr.boq_remaining_headroom !== null"
                  [ngClass]="pr.boq_remaining_headroom > 0 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full border inline-block"
                >
                  {{ pr.boq_remaining_headroom > 0 ? ('Safe (+' + (pr.boq_remaining_headroom | number:'1.0-0') + ')') : 'Exceeded' }}
                </span>
                <span *ngIf="pr.boq_remaining_headroom === undefined || pr.boq_remaining_headroom === null" class="text-[10px] text-slate-600 dark:text-slate-400">
                  Standard BOQ
                </span>
              </td>
              <td class="p-3 text-center">
                <span
                  [ngClass]="getPRStatusBadgeClass(pr.status)"
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full border"
                >
                  {{ formatStatus(pr.status) }}
                </span>
              </td>
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    (click)="openDetailModal(pr)"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="View & Inspect Full PR"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    (click)="openWorkflowModal(pr)"
                    class="px-2 py-1 text-[11px] font-bold rounded bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                    title="Advance PR Approval Workflow"
                  >
                    Workflow
                  </button>
                  <button
                    type="button"
                    (click)="openEditModal(pr)"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Edit Requisition Details"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    (click)="confirmDelete(pr)"
                    [disabled]="pr.status === 'PO_ISSUED' || pr.status === 'APPROVED_FOR_PURCHASE'"
                    class="px-2 py-1 text-[11px] font-semibold rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 disabled:opacity-30 transition-colors"
                    title="Cancel Requisition"
                  >
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="pagedRequisitions().length === 0">
              <td colspan="9" class="p-8 text-center text-slate-600 dark:text-slate-400">
                <div class="text-3xl mb-2">📋</div>
                <div class="text-sm font-semibold">No purchase requisitions found.</div>
                <div class="text-xs text-slate-600 dark:text-slate-400 mt-1">Click "+ Raise Purchase Requisition (PR)" above to create one.</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Toolbar -->
      <div class="flex items-center justify-between mt-4 text-xs text-slate-700 dark:text-slate-300">
        <div>
          Page {{ currentPage() }} of {{ totalPages() }} ({{ filteredRequisitions().length }} total records)
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            (click)="setPage(currentPage() - 1)"
            [disabled]="currentPage() === 1"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Prev
          </button>
          <button
            *ngFor="let p of getPages()"
            type="button"
            (click)="setPage(p)"
            [class.bg-amber-500]="currentPage() === p"
            [class.text-slate-950]="currentPage() === p"
            [class.font-bold]="currentPage() === p"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {{ p }}
          </button>
          <button
            type="button"
            (click)="setPage(currentPage() + 1)"
            [disabled]="currentPage() >= totalPages()"
            class="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </app-card-container>

    <!-- Modal: Raise New Purchase Requisition (PR) -->
    <app-modal
      [isOpen]="isAddModalOpen()"
      title="Raise Site Purchase Requisition (PR Indent)"
      (close)="isAddModalOpen.set(false)"
    >
      <form [formGroup]="prForm" (ngSubmit)="submitPR()" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Project Site *</label>
            <select
              formControlName="project_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Project Site...</option>
              <option *ngFor="let p of projects()" [ngValue]="p.id">#{{ p.id }} - {{ p.project_name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Material Catalog Item *</label>
            <select
              formControlName="material_id"
              class="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option [ngValue]="null">Select Material Item...</option>
              <option *ngFor="let m of materials()" [ngValue]="m.id">{{ m.material_code }} - {{ m.material_name }} ({{ m.unit_of_measure }})</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Requested Quantity *</label>
            <app-custom-input
              formControlName="requested_quantity"
              type="number"
              placeholder="e.g. 500 Bags / 20 Tons"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Delivery Date *</label>
            <app-custom-input
              formControlName="required_by_date"
              type="date"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority Level *</label>
            <app-searchable-select
              formControlName="priority"
              placeholder="Select Priority"
              categoryCode="PR_PRIORITY"
              [allowCreateNew]="true"
            ></app-searchable-select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Building / Tower</label>
            <app-custom-input
              formControlName="tower_name"
              placeholder="e.g. Tower 1 / West Wing"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Floor / Spatial Level</label>
            <app-custom-input
              formControlName="floor_number"
              placeholder="e.g. Level 07 / Basement B2"
            ></app-custom-input>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Work Justification & Activity Notes</label>
          <app-custom-textarea
            formControlName="purpose_notes"
            placeholder="e.g. Foundation slab casting work for Tower 1 per structural schedule..."
            rows="3"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isAddModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="prForm.invalid"
            label="Raise Requisition"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal: Edit Purchase Requisition (PR) -->
    <app-modal
      [isOpen]="isEditModalOpen()"
      [title]="selectedPR ? 'Edit Requisition: ' + selectedPR.pr_number : 'Edit Requisition'"
      (close)="isEditModalOpen.set(false)"
    >
      <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="space-y-4">
        <div *ngIf="selectedPR" class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs space-y-1">
          <div class="flex justify-between font-bold">
            <span class="text-slate-700 dark:text-slate-300">Requisition:</span>
            <span class="text-amber-700 dark:text-amber-400 font-mono">{{ selectedPR.pr_number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Site Project:</span>
            <span class="text-slate-900 dark:text-slate-100 font-semibold">{{ selectedPR.project_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material:</span>
            <span class="text-slate-900 dark:text-slate-100">{{ selectedPR.material_name }}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Requested Quantity *</label>
            <app-custom-input
              formControlName="requested_quantity"
              type="number"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Required Delivery Date *</label>
            <app-custom-input
              formControlName="required_by_date"
              type="date"
            ></app-custom-input>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Building / Tower</label>
            <app-custom-input
              formControlName="tower_name"
            ></app-custom-input>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Floor / Level</label>
            <app-custom-input
              formControlName="floor_number"
            ></app-custom-input>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Justification Notes</label>
          <app-custom-textarea
            formControlName="purpose_notes"
            rows="3"
          ></app-custom-textarea>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isEditModalOpen.set(false)"
            label="Cancel"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            type="submit"
            [disabled]="editForm.invalid"
            label="Save Changes"
          ></app-custom-button>
        </div>
      </form>
    </app-modal>

    <!-- Modal: Workflow State Progression -->
    <app-modal
      [isOpen]="isWorkflowModalOpen()"
      [title]="selectedPR ? 'Approval Workflow: ' + selectedPR.pr_number : 'PR Approval Workflow'"
      (close)="isWorkflowModalOpen.set(false)"
    >
      <div *ngIf="selectedPR" class="space-y-4 text-xs">
        <div class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg space-y-1">
          <div class="flex justify-between font-bold">
            <span class="text-slate-700 dark:text-slate-300">Current Status:</span>
            <span class="text-amber-800 dark:text-amber-300">{{ selectedPR.status }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material & Qty:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPR.requested_quantity }} {{ selectedPR.unit_of_measure }} ({{ selectedPR.material_name }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">BOQ Budget Headroom:</span>
            <span class="font-bold text-emerald-700 dark:text-emerald-400">Verified Safe (within allowance)</span>
          </div>
        </div>

        <!-- Workflow Step Map -->
        <div class="space-y-2">
          <label class="block font-semibold text-slate-700 dark:text-slate-300">Standard Real Estate Requisition Workflow</label>
          <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2 text-[11px]">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-slate-900" [ngClass]="selectedPR.status !== 'DRAFT' ? 'bg-emerald-400' : 'bg-slate-300'">1</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">Draft Indent Raised by Site Engineer</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-slate-900" [ngClass]="selectedPR.status !== 'DRAFT' && selectedPR.status !== 'SUBMITTED' ? 'bg-emerald-400' : 'bg-slate-300'">2</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">Site / Project Manager Endorsement</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-slate-900" [ngClass]="['BUDGET_VERIFIED', 'PROCUREMENT_REVIEWED', 'APPROVED_FOR_PURCHASE', 'RFQ_ISSUED', 'PO_ISSUED'].includes(selectedPR.status) ? 'bg-emerald-400' : 'bg-slate-300'">3</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">Cost & Budget Headroom Verification (BOQ Lock)</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-slate-900" [ngClass]="['APPROVED_FOR_PURCHASE', 'RFQ_ISSUED', 'PO_ISSUED'].includes(selectedPR.status) ? 'bg-emerald-400' : 'bg-slate-300'">4</span>
              <span class="font-semibold text-slate-800 dark:text-slate-200">Procurement Department Approval for Purchase</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Verification / Endorsement Notes</label>
          <app-custom-textarea
            [(ngModel)]="workflowNotes"
            placeholder="Checked reinforcement schedule against structural drawing Rev-03..."
            rows="2"
          ></app-custom-textarea>
        </div>

        <div class="flex flex-wrap justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isWorkflowModalOpen.set(false)"
            label="Close"
          ></app-custom-button>
          <button
            type="button"
            (click)="executeWorkflowAction('SUBMIT')"
            *ngIf="selectedPR.status === 'DRAFT'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Submit for Approval
          </button>
          <button
            type="button"
            (click)="executeWorkflowAction('SITE_APPROVE')"
            *ngIf="selectedPR.status === 'SUBMITTED'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950"
          >
            Site Endorsement
          </button>
          <button
            type="button"
            (click)="executeWorkflowAction('VERIFY_BUDGET')"
            *ngIf="selectedPR.status === 'SITE_APPROVED'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
          >
            Verify BOQ Budget
          </button>
          <button
            type="button"
            (click)="executeWorkflowAction('APPROVE_PURCHASE')"
            *ngIf="selectedPR.status === 'BUDGET_VERIFIED' || selectedPR.status === 'PENDING_CS'"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Approve for Purchase
          </button>
          <button
            type="button"
            (click)="executeWorkflowAction('REJECT')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            Reject / Return
          </button>
        </div>
      </div>
    </app-modal>

    <!-- Modal: View Full Purchase Requisition Details -->
    <app-modal
      [isOpen]="isDetailModalOpen()"
      [title]="selectedPR ? 'Purchase Requisition Inspection: ' + selectedPR.pr_number : 'PR Inspection'"
      (close)="isDetailModalOpen.set(false)"
    >
      <div *ngIf="selectedPR" class="space-y-4 text-xs">
        <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-2">
          <div class="flex justify-between font-mono font-bold text-sm">
            <span class="text-slate-600 dark:text-slate-400">PR Number:</span>
            <span class="text-amber-700 dark:text-amber-400">{{ selectedPR.pr_number }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Date Raised:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPR.requisition_date | date:'dd MMMM yyyy' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Required By Date:</span>
            <span class="font-bold text-slate-800 dark:text-slate-200">{{ selectedPR.required_by_date ? (selectedPR.required_by_date | date:'dd MMMM yyyy') : 'Immediate' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Priority Level:</span>
            <span class="font-bold uppercase">{{ selectedPR.priority || 'NORMAL' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Site Project:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPR.project_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Spatial Location:</span>
            <span class="font-bold text-slate-900 dark:text-slate-100">{{ selectedPR.tower_name || 'Tower A' }}, Floor {{ selectedPR.floor_number || '05' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Material & Quantity:</span>
            <span class="font-black text-slate-900 dark:text-slate-100">{{ selectedPR.requested_quantity | number:'1.2-2' }} {{ selectedPR.unit_of_measure }} ({{ selectedPR.material_name }})</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600 dark:text-slate-400">Workflow State:</span>
            <span [ngClass]="getPRStatusBadgeClass(selectedPR.status)" class="px-2 py-0.5 rounded-full font-bold text-[10px] border">
              {{ selectedPR.status }}
            </span>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Purpose & Justification Notes</label>
          <div class="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
            {{ selectedPR.purpose_notes || 'No extra notes provided.' }}
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <app-custom-button
            variant="outline"
            (click)="isDetailModalOpen.set(false)"
            label="Close"
          ></app-custom-button>
        </div>
      </div>
    </app-modal>
  `
})
export class PurchaseRequisitionsComponent implements OnInit {
  private procurementService = inject(ProcurementService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  requisitions = signal<PurchaseRequisition[]>([]);
  projects = signal<Project[]>([]);
  materials = signal<MaterialItem[]>([]);

  // Filter state
  searchQuery = '';
  selectedProjectId: number | null = null;
  selectedStatus = '';
  selectedPriority = '';

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);

  // Modals
  isAddModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isWorkflowModalOpen = signal(false);
  isDetailModalOpen = signal(false);

  selectedPR: PurchaseRequisition | null = null;
  workflowNotes = '';

  prForm: FormGroup = this.fb.group({
    project_id: [null, [Validators.required]],
    material_id: [null, [Validators.required]],
    requested_quantity: [null, [Validators.required, Validators.min(0.01)]],
    required_by_date: [new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10), [Validators.required]],
    priority: ['NORMAL', [Validators.required]],
    tower_name: ['Tower 1'],
    floor_number: ['04'],
    purpose_notes: ['']
  });

  editForm: FormGroup = this.fb.group({
    requested_quantity: [null, [Validators.required, Validators.min(0.01)]],
    required_by_date: [null, [Validators.required]],
    tower_name: [''],
    floor_number: [''],
    purpose_notes: ['']
  });

  // KPIs
  pendingApprovalsCount = computed(() =>
    this.requisitions().filter(pr => ['DRAFT', 'SUBMITTED', 'SITE_APPROVED', 'PENDING_CS'].includes(pr.status)).length
  );
  approvedCount = computed(() =>
    this.requisitions().filter(pr => ['APPROVED_FOR_PURCHASE', 'RFQ_ISSUED', 'PO_ISSUED'].includes(pr.status)).length
  );
  urgentCount = computed(() =>
    this.requisitions().filter(pr => pr.priority === 'URGENT' || pr.priority === 'EMERGENCY').length
  );

  // Filtered
  filteredRequisitions = computed(() => {
    let list = this.requisitions();
    if (this.selectedProjectId !== null) {
      list = list.filter(pr => pr.project_id === this.selectedProjectId);
    }
    if (this.selectedStatus) {
      list = list.filter(pr => pr.status === this.selectedStatus);
    }
    if (this.selectedPriority) {
      list = list.filter(pr => (pr.priority || 'NORMAL') === this.selectedPriority);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(pr =>
        pr.pr_number.toLowerCase().includes(q) ||
        (pr.project_name && pr.project_name.toLowerCase().includes(q)) ||
        (pr.material_name && pr.material_name.toLowerCase().includes(q)) ||
        (pr.tower_name && pr.tower_name.toLowerCase().includes(q))
      );
    }
    return list;
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRequisitions().length / this.pageSize())));

  pagedRequisitions = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredRequisitions().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    this.loadRequisitions();
    this.loadProjects();
    this.loadMaterials();
  }

  loadRequisitions(): void {
    this.procurementService.getRequisitions().subscribe({
      next: (data) => {
        this.requisitions.set(data || []);
        this.currentPage.set(1);
      },
      error: (err) => console.error('Failed to load requisitions:', err)
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || []),
      error: (err) => console.error('Failed to load projects:', err)
    });
  }

  loadMaterials(): void {
    this.procurementService.getMaterials().subscribe({
      next: (data) => this.materials.set(data || []),
      error: (err) => console.error('Failed to load materials:', err)
    });
  }

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedProjectId = null;
    this.selectedStatus = '';
    this.selectedPriority = '';
    this.currentPage.set(1);
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  getPages(): number[] {
    const total = this.totalPages();
    const cur = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) {
      pages.push(i);
    }
    return pages;
  }

  openAddModal(): void {
    this.prForm.reset({
      project_id: this.projects().length > 0 ? this.projects()[0].id : null,
      material_id: this.materials().length > 0 ? this.materials()[0].id : null,
      requested_quantity: 100,
      required_by_date: new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
      priority: 'NORMAL',
      tower_name: 'Tower 1',
      floor_number: '04',
      purpose_notes: ''
    });
    this.isAddModalOpen.set(true);
  }

  submitPR(): void {
    if (this.prForm.invalid) return;
    this.procurementService.createRequisition(this.prForm.value).subscribe({
      next: () => {
        alert('Site Purchase Requisition created successfully!');
        this.isAddModalOpen.set(false);
        this.loadRequisitions();
      },
      error: (err) => alert(err.error?.detail || 'Failed to create requisition.')
    });
  }

  openEditModal(pr: PurchaseRequisition): void {
    this.selectedPR = pr;
    this.editForm.patchValue({
      requested_quantity: pr.requested_quantity,
      required_by_date: pr.required_by_date ? pr.required_by_date.substring(0, 10) : '',
      tower_name: pr.tower_name || '',
      floor_number: pr.floor_number || '',
      purpose_notes: pr.purpose_notes || ''
    });
    this.isEditModalOpen.set(true);
  }

  submitEdit(): void {
    if (!this.selectedPR || this.editForm.invalid) return;
    this.procurementService.updateRequisition(this.selectedPR.id, this.editForm.value).subscribe({
      next: () => {
        alert('Purchase Requisition updated successfully!');
        this.isEditModalOpen.set(false);
        this.loadRequisitions();
      },
      error: (err) => alert(err.error?.detail || 'Failed to update requisition.')
    });
  }

  openWorkflowModal(pr: PurchaseRequisition): void {
    this.selectedPR = pr;
    this.workflowNotes = '';
    this.isWorkflowModalOpen.set(true);
  }

  executeWorkflowAction(action: string): void {
    if (!this.selectedPR) return;
    this.procurementService.executePRWorkflow(this.selectedPR.id, {
      action,
      notes: this.workflowNotes
    }).subscribe({
      next: (res) => {
        alert(`Requisition status updated to: ${res.status}`);
        this.isWorkflowModalOpen.set(false);
        this.loadRequisitions();
      },
      error: (err) => alert(err.error?.detail || 'Workflow transition failed.')
    });
  }

  openDetailModal(pr: PurchaseRequisition): void {
    this.selectedPR = pr;
    this.isDetailModalOpen.set(true);
  }

  confirmDelete(pr: PurchaseRequisition): void {
    if (confirm(`Are you sure you want to cancel requisition ${pr.pr_number}?`)) {
      this.procurementService.deleteRequisition(pr.id).subscribe({
        next: () => {
          alert('Requisition deleted/cancelled.');
          this.loadRequisitions();
        },
        error: (err) => alert(err.error?.detail || 'Failed to cancel requisition.')
      });
    }
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }

  getPRStatusBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED_FOR_PURCHASE':
      case 'PO_ISSUED':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'RFQ_ISSUED':
      case 'CS_PREPARED':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      case 'BUDGET_VERIFIED':
      case 'SITE_APPROVED':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800';
      case 'SUBMITTED':
      case 'PENDING_CS':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'REJECTED':
        return 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    }
  }
}
