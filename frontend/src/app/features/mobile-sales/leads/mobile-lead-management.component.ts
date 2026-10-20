import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobileLeadItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-lead-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Lead Pipeline & Executive Assignment" subtitle="Track omni-channel prospects, assign sales representatives, and update real-time progress">
        <!-- Actions & Filter Bar -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Add New Lead
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by name, phone, lead code..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-64 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Stages</option>
              <option value="NEW">New Lead</option>
              <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won / Booked</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              [(ngModel)]="selectedSource"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Sources</option>
              <option value="FACEBOOK_ADS">Facebook Ads</option>
              <option value="WEBSITE_INQUIRY">Website Inquiry</option>
              <option value="DIRECT_WALK_IN">Direct Walk-In</option>
              <option value="BROKER_REFERRAL">Broker Referral</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Leads: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Lead Code</th>
                <th class="p-3">Customer Name</th>
                <th class="p-3">Contact</th>
                <th class="p-3">Interested Project</th>
                <th class="p-3">Source</th>
                <th class="p-3">Assigned Sales Rep</th>
                <th class="p-3">Stage</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (lead of leads; track lead.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ lead.lead_code }}
                  </td>
                  <td class="p-3 font-medium text-slate-900 dark:text-slate-100">
                    {{ lead.lead_name }}
                  </td>
                  <td class="p-3 font-mono">
                    <div>{{ lead.phone }}</div>
                    @if (lead.email) {
                      <div class="text-[10px] text-slate-400 font-sans">{{ lead.email }}</div>
                    }
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      {{ lead.interested_project || 'General Inquiry' }}
                    </span>
                  </td>
                  <td class="p-3 text-[11px]">
                    {{ lead.lead_source }}
                  </td>
                  <td class="p-3 font-medium">
                    {{ lead.assigned_sales_rep_name || 'Unassigned' }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': lead.status === 'WON',
                        'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-400': lead.status === 'NEW',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': lead.status === 'SITE_VISIT_SCHEDULED',
                        'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400': lead.status === 'NEGOTIATION',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': lead.status === 'LOST'
                      }"
                    >
                      {{ lead.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(lead)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteLead(lead)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">
                    No leads found matching your search. Click "+ Add New Lead" to create one.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex items-center justify-between mt-4 text-xs text-slate-500">
          <div>
            Showing {{ Math.min(offset + 1, totalCount) }} to {{ Math.min(offset + limit, totalCount) }} of {{ totalCount }} records
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset === 0"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Previous
            </button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset + limit >= totalCount"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Modal Dialog for Add / Edit Lead (No static forms under table) -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingLeadId ? 'Edit Sales Lead Record' : 'Create New Omni-Channel Lead'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Customer / Prospect Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.lead_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Engr. Tanvir Ahmed"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Phone Number *</label>
              <input
                type="text"
                [(ngModel)]="formData.phone"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="+88017XXXXXXXX"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                [(ngModel)]="formData.email"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="client@gmail.com"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Lead Source</label>
              <select
                [(ngModel)]="formData.lead_source"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="FACEBOOK_ADS">Facebook & Social Ads</option>
                <option value="WEBSITE_INQUIRY">Website Inquiry</option>
                <option value="DIRECT_WALK_IN">Direct Walk-In / Site Visit</option>
                <option value="BROKER_REFERRAL">Broker Referral</option>
                <option value="PHONE_INQUIRY">Direct Phone Call</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Interested Project</label>
              <input
                type="text"
                [(ngModel)]="formData.interested_project"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned Sales Executive</label>
              <input
                type="text"
                [(ngModel)]="formData.assigned_sales_rep_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Ashraful Alam"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Pipeline Stage Status</label>
              <select
                [(ngModel)]="formData.status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="NEW">New Lead</option>
                <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
                <option value="NEGOTIATION">In Negotiation</option>
                <option value="WON">Won / Booked</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Budget (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.budget_bdt"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="25000000"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Requirements & Discussion Notes</label>
            <textarea
              [(ngModel)]="formData.notes"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
              placeholder="Apartment specifications, preferred floor, car parking requirements..."
            ></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="saveLead()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingLeadId ? 'Update Lead' : 'Save Lead' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileLeadManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  leads: MobileLeadItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';
  selectedSource = 'ALL';

  isModalOpen = false;
  editingLeadId: number | null = null;
  formData: Partial<MobileLeadItem> = {
    lead_name: '',
    phone: '',
    email: '',
    lead_source: 'FACEBOOK_ADS',
    status: 'NEW',
    assigned_sales_rep_name: 'Ashraful Alam',
    interested_project: 'BlueOceans Marina Bay',
    budget_bdt: 25000000,
    notes: ''
  };

  ngOnInit(): void {
    this.loadLeads();
  }

  loadLeads(): void {
    this.service.getLeads({
      search: this.searchQuery,
      status: this.selectedStatus,
      lead_source: this.selectedSource,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.leads = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load leads', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadLeads();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadLeads();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadLeads();
    }
  }

  openCreateModal(): void {
    this.editingLeadId = null;
    this.formData = {
      lead_name: '',
      phone: '',
      email: '',
      lead_source: 'FACEBOOK_ADS',
      status: 'NEW',
      assigned_sales_rep_name: 'Ashraful Alam',
      interested_project: 'BlueOceans Marina Bay',
      budget_bdt: 25000000,
      notes: ''
    };
    this.isModalOpen = true;
  }

  openEditModal(lead: MobileLeadItem): void {
    this.editingLeadId = lead.id;
    this.formData = { ...lead };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveLead(): void {
    if (!this.formData.lead_name || !this.formData.phone) {
      alert('Please enter Lead Name and Phone number.');
      return;
    }

    if (this.editingLeadId) {
      this.service.updateLead(this.editingLeadId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadLeads();
        },
        error: (err) => console.error('Failed to update lead', err)
      });
    } else {
      this.service.createLead(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadLeads();
        },
        error: (err) => console.error('Failed to create lead', err)
      });
    }
  }

  deleteLead(lead: MobileLeadItem): void {
    if (confirm(`Are you sure you want to delete lead ${lead.lead_code} (${lead.lead_name})?`)) {
      this.service.deleteLead(lead.id).subscribe({
        next: () => this.loadLeads(),
        error: (err) => console.error('Failed to delete lead', err)
      });
    }
  }
}
