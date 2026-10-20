import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSalesService, MobilePropertyItem } from '../../../core/services/mobile-sales.service';
import { MobileSalesNavComponent } from '../mobile-sales-nav/mobile-sales-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-property-management',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSalesNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-sales-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Project, Tower, Units & Real-Time Availability" subtitle="Explore apartment sizes, floor plans, parking bays and live unit availability status across development projects">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition"
          >
            <span>+</span> Add Property Unit
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by project, unit #, tower, type..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />

            <select
              [(ngModel)]="selectedAvailability"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Availability</option>
              <option value="AVAILABLE">Available for Sale</option>
              <option value="BOOKED">Booked / Reserved</option>
              <option value="BLOCKED">Management Blocked</option>
              <option value="SOLD">Registered / Sold</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Units: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Project & Location</th>
                <th class="p-3">Tower & Floor</th>
                <th class="p-3">Unit Number</th>
                <th class="p-3">Unit Type & Size</th>
                <th class="p-3">Parking</th>
                <th class="p-3">Price / SqFt</th>
                <th class="p-3">Total Value (BDT)</th>
                <th class="p-3">Availability</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (prop of properties; track prop.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ prop.project_name }}</div>
                    <div class="text-[10px] text-slate-400">{{ prop.location }}</div>
                  </td>
                  <td class="p-3 font-medium">
                    <div>{{ prop.tower_name }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ prop.floor_no }}</div>
                  </td>
                  <td class="p-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                    {{ prop.unit_number }}
                  </td>
                  <td class="p-3">
                    <div class="font-medium">{{ prop.unit_type }}</div>
                    <div class="text-[10px] text-slate-400 font-mono">{{ prop.size_sqft | number:'1.0-0' }} SqFt</div>
                  </td>
                  <td class="p-3 font-mono">
                    {{ prop.parking_slots }} Bay(s)
                  </td>
                  <td class="p-3 font-mono">
                    ৳{{ prop.price_per_sqft | number:'1.0-0' }}
                  </td>
                  <td class="p-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    ৳{{ prop.total_price | number:'1.0-0' }}
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': prop.availability_status === 'AVAILABLE',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': prop.availability_status === 'BOOKED',
                        'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400': prop.availability_status === 'BLOCKED',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': prop.availability_status === 'SOLD'
                      }"
                    >
                      {{ prop.availability_status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(prop)"
                        class="px-2 py-1 text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteProperty(prop)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No property units found.
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

      <!-- Modal Dialog for Add / Edit Property Unit -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingPropertyId ? 'Edit Property Unit Specifications' : 'Register New Property Unit'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
              <input
                type="text"
                [(ngModel)]="formData.location"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. Plot 18, Road 90, Gulshan-2, Dhaka"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Tower Name</label>
              <input
                type="text"
                [(ngModel)]="formData.tower_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="Tower Alpha"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Floor Number</label>
              <input
                type="text"
                [(ngModel)]="formData.floor_no"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="Floor 14"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Number *</label>
              <input
                type="text"
                [(ngModel)]="formData.unit_number"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold focus:ring-1 focus:ring-teal-500"
                placeholder="A-1402"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Unit Type</label>
              <input
                type="text"
                [(ngModel)]="formData.unit_type"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-teal-500"
                placeholder="4BHK Royal Duplex"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Size (SqFt) *</label>
              <input
                type="number"
                [(ngModel)]="formData.size_sqft"
                (ngModelChange)="recalcTotal()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="2450"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Parking Slots</label>
              <input
                type="number"
                [(ngModel)]="formData.parking_slots"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="2"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Price per SqFt (BDT) *</label>
              <input
                type="number"
                [(ngModel)]="formData.price_per_sqft"
                (ngModelChange)="recalcTotal()"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-teal-500"
                placeholder="15500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Calculated Total (BDT)</label>
              <input
                type="number"
                [(ngModel)]="formData.total_price"
                readonly
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-bold font-mono text-xs"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Availability Status</label>
              <select
                [(ngModel)]="formData.availability_status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="BLOCKED">Blocked</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
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
              (click)="saveProperty()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition shadow-xs"
            >
              {{ editingPropertyId ? 'Update Unit' : 'Save Unit' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobilePropertyManagementComponent implements OnInit {
  private service = inject(MobileSalesService);
  Math = Math;

  properties: MobilePropertyItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedAvailability = 'ALL';

  isModalOpen = false;
  editingPropertyId: number | null = null;
  formData: Partial<MobilePropertyItem> = {
    project_name: 'BlueOceans Marina Bay',
    location: 'Plot 18, Road 90, Gulshan-2, Dhaka',
    tower_name: 'Tower Alpha',
    floor_no: 'Floor 14',
    unit_number: '',
    size_sqft: 2250,
    unit_type: '4BHK Premium',
    parking_slots: 2,
    price_per_sqft: 14500,
    total_price: 32625000,
    availability_status: 'AVAILABLE'
  };

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.service.getProperties({
      search: this.searchQuery,
      availability: this.selectedAvailability,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.properties = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load property units', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadProperties();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadProperties();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadProperties();
    }
  }

  recalcTotal(): void {
    const size = Number(this.formData.size_sqft) || 0;
    const rate = Number(this.formData.price_per_sqft) || 0;
    this.formData.total_price = size * rate;
  }

  openCreateModal(): void {
    this.editingPropertyId = null;
    this.formData = {
      project_name: 'BlueOceans Marina Bay',
      location: 'Plot 18, Road 90, Gulshan-2, Dhaka',
      tower_name: 'Tower Alpha',
      floor_no: 'Floor 14',
      unit_number: '',
      size_sqft: 2250,
      unit_type: '4BHK Premium',
      parking_slots: 2,
      price_per_sqft: 14500,
      total_price: 32625000,
      availability_status: 'AVAILABLE'
    };
    this.isModalOpen = true;
  }

  openEditModal(prop: MobilePropertyItem): void {
    this.editingPropertyId = prop.id;
    this.formData = { ...prop };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveProperty(): void {
    if (!this.formData.project_name || !this.formData.unit_number) {
      alert('Please enter Project Name and Unit Number.');
      return;
    }

    this.recalcTotal();

    if (this.editingPropertyId) {
      this.service.updateProperty(this.editingPropertyId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadProperties();
        },
        error: (err) => console.error('Failed to update property unit', err)
      });
    } else {
      this.service.createProperty(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadProperties();
        },
        error: (err) => console.error('Failed to create property unit', err)
      });
    }
  }

  deleteProperty(prop: MobilePropertyItem): void {
    if (confirm(`Remove property unit ${prop.unit_number} (${prop.project_name})?`)) {
      this.service.deleteProperty(prop.id).subscribe({
        next: () => this.loadProperties(),
        error: (err) => console.error('Failed to delete property unit', err)
      });
    }
  }
}
