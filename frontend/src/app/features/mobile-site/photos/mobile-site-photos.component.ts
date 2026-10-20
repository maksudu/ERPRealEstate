import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSitePhotoDocItem } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-photos',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Geotagged Site Photo Documentation" subtitle="Inspect tamper-proof physical progress photographs with embedded GPS coordinates and verified timestamps">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
          >
            <span>+</span> Upload Geotagged Photo
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by photo code, location, project, engineer..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Captured Photos: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Photo Ref</th>
                <th class="p-3">Preview</th>
                <th class="p-3">Project & Floor Location</th>
                <th class="p-3">GPS Geotag Coordinates</th>
                <th class="p-3">Captured By</th>
                <th class="p-3">Timestamp</th>
                <th class="p-3">Field Notes</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (p of photos; track p.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ p.photo_code }}
                  </td>
                  <td class="p-3">
                    <div class="h-10 w-14 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-lg overflow-hidden">
                      📷
                    </div>
                  </td>
                  <td class="p-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ p.project_name }}</div>
                    <div class="text-[10px] text-slate-500">{{ p.floor_or_location }}</div>
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    <span class="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-bold">
                      📍 {{ p.gps_latitude | number:'1.4-4' }}, {{ p.gps_longitude | number:'1.4-4' }}
                    </span>
                  </td>
                  <td class="p-3 font-medium">
                    {{ p.captured_by }}
                  </td>
                  <td class="p-3 font-mono text-[11px]">
                    {{ p.created_at | date:'medium' }}
                  </td>
                  <td class="p-3 max-w-xs truncate" [title]="p.notes || ''">
                    {{ p.notes || 'Routine construction milestone evidence' }}
                  </td>
                  <td class="p-3 text-right">
                    <button
                      type="button"
                      (click)="deletePhoto(p)"
                      class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">
                    No geotagged site photos recorded. Click "+ Upload Geotagged Photo" to submit evidence.
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

      <!-- Modal Dialog for Upload Photo -->
      <app-modal
        [isOpen]="isModalOpen"
        title="Upload Geotagged Construction Progress Photo"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Floor / Structural Element *</label>
              <input
                type="text"
                [(ngModel)]="formData.floor_or_location"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="14th Floor Slab Decking - Tower Alpha"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">GPS Latitude (Auto-Acquired)</label>
              <input
                type="number"
                [(ngModel)]="formData.gps_latitude"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
                placeholder="23.792500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">GPS Longitude (Auto-Acquired)</label>
              <input
                type="number"
                [(ngModel)]="formData.gps_longitude"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
                placeholder="90.407800"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Captured By (Engineer)</label>
              <input
                type="text"
                [(ngModel)]="formData.captured_by"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                placeholder="Engr. Sajjad Hossain"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Image Storage URL / Filepath</label>
              <input
                type="text"
                [(ngModel)]="formData.photo_url"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono"
                placeholder="/static/uploads/site_photos/slab_14.jpg"
              />
            </div>
          </div>

          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Milestone Inspection Observations</label>
            <textarea
              [(ngModel)]="formData.notes"
              rows="2"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="Rebar spacing, clear cover blocks, beam stirrups condition..."
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
              (click)="savePhoto()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
            >
              Upload Geotagged Photo
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSitePhotosComponent implements OnInit {
  private service = inject(MobileSiteService);
  Math = Math;

  photos: MobileSitePhotoDocItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  isModalOpen = false;
  formData: Partial<MobileSitePhotoDocItem> = {
    project_name: 'BlueOceans Marina Bay',
    floor_or_location: '14th Floor Slab Decking - Tower Alpha',
    photo_url: '/static/uploads/site_photos/slab_14.jpg',
    gps_latitude: 23.792500,
    gps_longitude: 90.407800,
    captured_by: 'Engr. Sajjad Hossain',
    notes: 'Rebar spacing verified against structural drawings.'
  };

  ngOnInit(): void {
    this.loadPhotos();
  }

  loadPhotos(): void {
    this.service.getPhotos({
      search: this.searchQuery,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.photos = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load photos', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadPhotos();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadPhotos();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadPhotos();
    }
  }

  openCreateModal(): void {
    this.formData = {
      project_name: 'BlueOceans Marina Bay',
      floor_or_location: '14th Floor Slab Decking - Tower Alpha',
      photo_url: `/static/uploads/site_photos/photo_${Date.now()}.jpg`,
      gps_latitude: 23.792500,
      gps_longitude: 90.407800,
      captured_by: 'Engr. Sajjad Hossain',
      notes: ''
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  savePhoto(): void {
    if (!this.formData.project_name || !this.formData.floor_or_location) {
      alert('Please enter Project Name and Location.');
      return;
    }

    this.service.createPhoto(this.formData).subscribe({
      next: () => {
        this.closeModal();
        this.loadPhotos();
      },
      error: (err) => console.error('Failed to upload photo', err)
    });
  }

  deletePhoto(p: MobileSitePhotoDocItem): void {
    if (confirm(`Remove photo evidence ${p.photo_code}?`)) {
      this.service.deletePhoto(p.id).subscribe({
        next: () => this.loadPhotos(),
        error: (err) => console.error('Failed to delete photo', err)
      });
    }
  }
}
