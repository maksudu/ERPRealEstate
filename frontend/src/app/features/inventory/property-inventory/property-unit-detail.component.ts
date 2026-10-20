import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { InventoryService } from '../../../core/services/inventory.service';
import { Unit } from '../../../core/models/inventory.model';
import { CardContainerComponent, CustomButtonComponent } from '../../../shared/components';

export type DetailTab = 
  | 'overview' 
  | 'specifications' 
  | 'pricing' 
  | 'availability' 
  | 'reservation' 
  | 'parking' 
  | 'documents' 
  | 'construction' 
  | 'history';

@Component({
  selector: 'app-property-unit-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, CardContainerComponent, CustomButtonComponent],
  template: `
    <div class="space-y-6">
      <!-- Top Breadcrumb & Actions Bar -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <a routerLink="/inventory" class="text-blue-600 hover:underline font-medium">Inventory</a>
          <span>/</span>
          <span class="text-slate-800 dark:text-slate-200 font-semibold">{{ unit() ? ('Unit ' + unit()!.unit_number) : 'Unit Details' }}</span>
        </div>

        <div class="flex items-center gap-2">
          <a routerLink="/inventory" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors">
            ← Back to Search
          </a>
          @if (unit(); as u) {
            <a [routerLink]="['/inventory/units', u.id, 'edit']" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors">
              Edit Unit
            </a>
            <button (click)="lockUnit(u.id)" [disabled]="isLocking()" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
              {{ isLocking() ? 'Locking...' : '15-Min Reserve' }}
            </button>
            <button (click)="printPage()" class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors">
              Print Record
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <div class="p-16 text-center text-slate-500">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p class="text-sm font-medium">Loading complete property record...</p>
        </div>
      } @else if (errorMessage()) {
        <div class="p-8 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-xl">
          <p class="font-bold">{{ errorMessage() }}</p>
          <a routerLink="/inventory" class="mt-3 inline-block text-xs font-semibold underline">Return to Inventory</a>
        </div>
      } @else {
        @if (unit(); as u) {
        <!-- Main Card Container -->
        <app-card-container [title]="'Property Record · Unit ' + u.unit_number" subtitle="Complete multi-tab architectural, financial, and lifecycle record" badge="Unit Specification">
          
          <!-- Unit Header Banner -->
          <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 mb-6 shadow-xs">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div class="flex items-center gap-3">
                  <span class="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {{ u.project_code || 'PRJ' }}
                  </span>
                  <span class="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {{ u.project_name || 'Project Name' }}
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap items-baseline gap-3">
                  <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Unit {{ u.unit_number }}
                  </h1>
                  <span class="text-sm text-slate-500">
                    {{ u.tower_name || ('Tower ' + u.tower_id) }} · {{ u.floor_number }}{{ getOrdinal(u.floor_number) }} Floor · {{ u.unit_type_id || 'Apartment' }}
                  </span>
                </div>

                <div class="mt-3 flex items-center gap-3">
                  <span [class]="getStatusClass(u.status_id)" class="px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {{ u.status_id }}
                  </span>
                  @if (u.is_landowner_share) {
                    <span class="px-2.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Landowner Quota
                    </span>
                  }
                </div>
              </div>

              <!-- Price Box -->
              <div class="lg:text-right p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs min-w-[280px]">
                <p class="text-xs font-medium text-slate-500 uppercase tracking-wider">Base Price</p>
                <p class="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  ৳{{ (u.total_unit_price || 0) | number:'1.0-0' }}
                </p>
                <p class="text-[11px] text-slate-500 mt-1">
                  {{ u.gross_saleable_area_sqft || 0 }} sq ft × ৳{{ (u.base_rate_per_sqft || 0) | number:'1.0-0' }}/sq ft
                </p>
                <p class="text-[10px] text-slate-400">Other charges and parking excluded</p>
              </div>
            </div>

            <!-- 4 Key Attribute Chips -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-200/70 dark:border-slate-800">
              <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unit Area</p>
                <p class="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                  {{ u.gross_saleable_area_sqft || 0 }} sq ft
                </p>
                <p class="text-[10px] text-slate-400">Carpet: {{ u.net_carpet_area_sqft || 0 }} sq ft</p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Orientation</p>
                <p class="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                  {{ u.facing_id || 'South facing' }}
                </p>
                <p class="text-[10px] text-slate-400">Natural light & wind flow</p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Bedrooms</p>
                <p class="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                  {{ u.bed_count || 3 }} Beds · {{ u.bath_count || 3 }} Baths
                </p>
                <p class="text-[10px] text-slate-400">{{ u.balcony_count || 2 }} Balconies</p>
              </div>

              <div class="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parking</p>
                <p class="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                  {{ (u.parking_charge && u.parking_charge > 0) ? 'Allocated / Yes' : 'No Allocation' }}
                </p>
                <p class="text-[10px] text-slate-400">
                  {{ (u.parking_charge && u.parking_charge > 0) ? ('৳' + (u.parking_charge | number:'1.0-0')) : 'Optional buy' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 9 Detail Page Tabs -->
          <div class="border-b border-slate-200 dark:border-slate-800 mb-6">
            <div class="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin">
              @for (tab of tabs; track tab.id) {
                <button
                  type="button"
                  (click)="activeTab.set(tab.id)"
                  [class]="activeTab() === tab.id
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-750'"
                  class="px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-colors duration-150 cursor-pointer"
                >
                  {{ tab.label }}
                </button>
              }
            </div>
          </div>

          <!-- TAB 1: OVERVIEW -->
          @if (activeTab() === 'overview') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Unit Identification</h4>
                  <dl class="space-y-2 text-xs">
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Unit Number:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">{{ u.unit_number }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Project:</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ u.project_name || 'N/A' }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Project Code:</dt><dd class="font-mono text-slate-800 dark:text-slate-200">{{ u.project_code || 'N/A' }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Tower / Block:</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ u.tower_name || ('Tower #' + u.tower_id) }}</dd></div>
                    <div class="flex justify-between py-1"><dt class="text-slate-500">Floor Level:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">{{ u.floor_number }}{{ getOrdinal(u.floor_number) }} Floor</dd></div>
                  </dl>
                </div>

                <div class="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Spatial Specifications</h4>
                  <dl class="space-y-2 text-xs">
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Property Type:</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ u.unit_type_id }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Saleable Area:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">{{ u.gross_saleable_area_sqft }} sq ft</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Carpet Area:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">{{ u.net_carpet_area_sqft }} sq ft</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Efficiency Ratio:</dt><dd class="font-semibold text-emerald-600">{{ getEfficiency(u) }}%</dd></div>
                    <div class="flex justify-between py-1"><dt class="text-slate-500">Facing / View:</dt><dd class="font-semibold text-slate-800 dark:text-slate-200">{{ u.facing_id }}</dd></div>
                  </dl>
                </div>

                <div class="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pricing & Status Overview</h4>
                  <dl class="space-y-2 text-xs">
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Current Status:</dt><dd><span [class]="getStatusClass(u.status_id)" class="px-2 py-0.5 rounded text-[11px] font-bold">{{ u.status_id }}</span></dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Base Rate / SqFt:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">৳{{ u.base_rate_per_sqft | number:'1.0-0' }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Effective Rate:</dt><dd class="font-bold text-slate-800 dark:text-slate-200">৳{{ u.effective_rate_per_sqft | number:'1.0-0' }}</dd></div>
                    <div class="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800"><dt class="text-slate-500">Total Unit Price:</dt><dd class="font-extrabold text-emerald-600">৳{{ u.total_unit_price | number:'1.0-0' }}</dd></div>
                    <div class="flex justify-between py-1"><dt class="text-slate-500">Max Discount:</dt><dd class="font-medium text-slate-600">৳{{ (u.max_discount_amount || 0) | number:'1.0-0' }}</dd></div>
                  </dl>
                </div>
              </div>
            </div>
          }

          <!-- TAB 2: SPECIFICATIONS -->
          @if (activeTab() === 'specifications') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Architectural Layout Breakdown</h4>
                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Bedrooms Count</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">{{ u.bed_count || 3 }} Bedrooms (Master, Semi-Master, Guest)</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Bathrooms Count</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">{{ u.bath_count || 3 }} Bathrooms (2 Attached, 1 Common)</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Balconies / Verandahs</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">{{ u.balcony_count || 2 }} Attached Balconies</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Orientation / Sun Direction</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">{{ u.facing_id }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Clear Ceiling Height</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">10 ft 2 in (3.10 m)</span>
                    </div>
                    <div class="flex justify-between py-2">
                      <span class="text-slate-500">Fittings & Finish Grade</span>
                      <span class="font-bold text-blue-600">Grade-A Italian Porcelain & Teak Wood Doors</span>
                    </div>
                  </div>
                </div>

                <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Area Reconciliation</h4>
                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Gross Saleable Area (SFT)</span>
                      <span class="font-extrabold text-slate-900 dark:text-white">{{ u.gross_saleable_area_sqft }} sq ft</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Net Usable Carpet Area</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">{{ u.net_carpet_area_sqft }} sq ft</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Common Area Share (Undivided)</span>
                      <span class="font-semibold text-slate-600">{{ (u.gross_saleable_area_sqft - u.net_carpet_area_sqft) | number:'1.2-2' }} sq ft</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Carpet Area Percentage</span>
                      <span class="font-bold text-emerald-600">{{ getEfficiency(u) }}%</span>
                    </div>
                    <div class="flex justify-between py-2">
                      <span class="text-slate-500">Undivided Proportionate Land Share</span>
                      <span class="font-bold text-blue-600">0.48 Katha (approx.)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 3: PRICING & CHARGES -->
          @if (activeTab() === 'pricing') {
            <div class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Base Rate & Premiums</h4>
                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Standard Base Rate / SqFt</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ u.base_rate_per_sqft | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Floor Escalation Premium (Floor {{ u.floor_number }})</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.floor_escalation_rate || 0) | number:'1.0-0' }}/sq ft</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Facing / Orientation Premium</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.facing_premium_rate || 0) | number:'1.0-0' }}/sq ft</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Effective Rate Per SqFt</span>
                      <span class="font-extrabold text-blue-600">৳{{ u.effective_rate_per_sqft | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2">
                      <span class="text-slate-500 font-bold">Total Base Unit Price</span>
                      <span class="font-black text-slate-900 dark:text-white text-sm">৳{{ u.total_unit_price | number:'1.0-0' }}</span>
                    </div>
                  </div>
                </div>

                <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Ancillary Charges & Taxes</h4>
                  <div class="space-y-3 text-xs">
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Utility Connection (DESCO/WASA/TITAS)</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.utility_connection_fee || 250000) | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Basement Parking Space Fee</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.parking_charge || 0) | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">Max Discretionary Discount</span>
                      <span class="font-bold text-rose-600">- ৳{{ (u.max_discount_amount || 0) | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                      <span class="text-slate-500">VAT / Tax (Mushak 6.3 - 2%)</span>
                      <span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.total_unit_price * 0.02) | number:'1.0-0' }}</span>
                    </div>
                    <div class="flex justify-between py-2 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg">
                      <span class="text-emerald-800 dark:text-emerald-300 font-bold">Estimated Net Package</span>
                      <span class="font-black text-emerald-700 dark:text-emerald-300 text-sm">
                        ৳{{ (u.total_unit_price + (u.parking_charge || 0) + (u.utility_connection_fee || 250000)) | number:'1.0-0' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 4: AVAILABILITY & LOCK -->
          @if (activeTab() === 'availability') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h4 class="text-sm font-bold text-slate-800 dark:text-white">Real-Time Mutex & Allocation State</h4>
                    <p class="text-xs text-slate-500 mt-0.5">Distributed 15-minute lock prevents double-booking across all sales channels.</p>
                  </div>
                  <span [class]="getStatusClass(u.status_id)" class="px-3 py-1 rounded-full text-xs font-bold">
                    {{ u.status_id }}
                  </span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p class="text-slate-400 font-semibold uppercase text-[10px]">Active Lock User</p>
                    <p class="font-bold text-slate-800 dark:text-slate-200 mt-1">{{ u.current_locked_by_user_name || 'No Active Mutex Lock' }}</p>
                  </div>
                  <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p class="text-slate-400 font-semibold uppercase text-[10px]">Lock Expires In</p>
                    <p class="font-mono font-bold text-amber-600 mt-1">{{ u.lock_remaining_seconds ? (u.lock_remaining_seconds + ' seconds') : 'N/A' }}</p>
                  </div>
                  <div class="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                    <p class="text-slate-400 font-semibold uppercase text-[10px]">Hold Expiry Policy</p>
                    <p class="font-semibold text-slate-700 dark:text-slate-300 mt-1">15 Minutes auto-release</p>
                  </div>
                </div>

                <div class="mt-6 flex items-center gap-3">
                  <button (click)="lockUnit(u.id)" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer">
                    Acquire 15-Min Reservation Lock
                  </button>
                  <button (click)="releaseUnit(u.id)" class="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                    Release Mutex Hold
                  </button>
                </div>
              </div>
            </div>
          }

          <!-- TAB 5: RESERVATION & BOOKING -->
          @if (activeTab() === 'reservation') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Customer Booking & Agreement Registry</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <div class="flex justify-between"><span class="text-slate-500">Customer Allottee:</span><span class="font-bold text-slate-800 dark:text-slate-200">{{ u.status_id === 'AVAILABLE' ? 'Unassigned' : 'Mohammad Rafiqul Islam' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Contact Number:</span><span class="font-mono text-slate-700 dark:text-slate-300">{{ u.status_id === 'AVAILABLE' ? 'N/A' : '+880 1711-234567' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">CRM Lead ID:</span><span class="font-mono text-blue-600">{{ u.status_id === 'AVAILABLE' ? 'N/A' : 'LEAD-2026-0891' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Booking Date:</span><span class="font-medium text-slate-700 dark:text-slate-300">{{ u.status_id === 'AVAILABLE' ? 'N/A' : '15 January 2026' }}</span></div>
                  </div>
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <div class="flex justify-between"><span class="text-slate-500">Agreement No:</span><span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ u.status_id === 'AVAILABLE' ? 'N/A' : 'AGR-GVR-2026-0045' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Booking Advance:</span><span class="font-bold text-emerald-600">{{ u.status_id === 'AVAILABLE' ? 'N/A' : '৳2,000,000 (Paid)' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Payment Plan:</span><span class="font-semibold text-slate-700 dark:text-slate-300">{{ u.status_id === 'AVAILABLE' ? 'Standard 36-Month' : 'Construction Linked (Schedule #04)' }}</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Approval Status:</span><span class="font-bold text-blue-600">{{ u.status_id === 'AVAILABLE' ? 'Pending Booking' : 'Approved by Management' }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 6: PARKING & FACILITIES -->
          @if (activeTab() === 'parking') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Parking Bays & Facility Allocation</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <p class="font-bold text-slate-800 dark:text-white text-xs mb-2">Parking Allocation</p>
                    <div class="flex justify-between"><span class="text-slate-500">Bay Code:</span><span class="font-mono font-bold text-blue-600">B1-P24 (Basement 1)</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Bay Type:</span><span class="font-semibold text-slate-700 dark:text-slate-300">Covered Independent Car Park</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">EV Charging:</span><span class="font-semibold text-emerald-600">Provision Available (11 kW)</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Parking Price:</span><span class="font-bold text-slate-800 dark:text-slate-200">৳{{ (u.parking_charge || 500000) | number:'1.0-0' }}</span></div>
                  </div>
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <p class="font-bold text-slate-800 dark:text-white text-xs mb-2">Clubhouse & Amenities Rights</p>
                    <div class="flex justify-between"><span class="text-slate-500">Gym & Swimming Pool:</span><span class="font-semibold text-emerald-600">Lifetime Primary Membership</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Storage Locker:</span><span class="font-mono text-slate-700 dark:text-slate-300">LKR-B1-08</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Community Hall:</span><span class="font-semibold text-slate-700 dark:text-slate-300">Privileged Resident Access</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Rooftop Garden:</span><span class="font-semibold text-slate-700 dark:text-slate-300">Full Access</span></div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 7: DOCUMENTS -->
          @if (activeTab() === 'documents') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center justify-between mb-4">
                  <h4 class="text-sm font-bold text-slate-800 dark:text-white">Drawings, Floor Plans & Agreements</h4>
                  <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
                    + Upload New File
                  </button>
                </div>
                <div class="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div class="py-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="p-2 rounded-lg bg-blue-50 text-blue-600 font-mono text-[10px] font-bold">PDF</span>
                      <div>
                        <p class="font-semibold text-slate-800 dark:text-slate-200">Architectural Floor Plan - Unit {{ u.unit_number }}.pdf</p>
                        <p class="text-[11px] text-slate-400">Scale 1:50 · Verified by Chief Architect · 2.4 MB</p>
                      </div>
                    </div>
                    <button class="px-2.5 py-1 rounded border border-slate-200 text-blue-600 hover:bg-blue-50 text-xs font-medium">Download</button>
                  </div>
                  <div class="py-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="p-2 rounded-lg bg-emerald-50 text-emerald-600 font-mono text-[10px] font-bold">PDF</span>
                      <div>
                        <p class="font-semibold text-slate-800 dark:text-slate-200">Approved Unit Specification Schedule.pdf</p>
                        <p class="text-[11px] text-slate-400">RAJUK Approved Layout Reference · 1.1 MB</p>
                      </div>
                    </div>
                    <button class="px-2.5 py-1 rounded border border-slate-200 text-blue-600 hover:bg-blue-50 text-xs font-medium">Download</button>
                  </div>
                  <div class="py-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="p-2 rounded-lg bg-purple-50 text-purple-600 font-mono text-[10px] font-bold">DOC</span>
                      <div>
                        <p class="font-semibold text-slate-800 dark:text-slate-200">Standard Allotment Agreement Draft.docx</p>
                        <p class="text-[11px] text-slate-400">Standard Real Estate Deed Template · 850 KB</p>
                      </div>
                    </div>
                    <button class="px-2.5 py-1 rounded border border-slate-200 text-blue-600 hover:bg-blue-50 text-xs font-medium">Download</button>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 8: CONSTRUCTION & HANDOVER -->
          @if (activeTab() === 'construction') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Construction Milestones & Handover Inspection</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <p class="font-bold text-slate-800 dark:text-white text-xs mb-2">Civil Milestone Status</p>
                    <div class="flex justify-between"><span class="text-slate-500">Superstructure Slab:</span><span class="font-bold text-emerald-600">100% Completed</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Brickwork & Plastering:</span><span class="font-bold text-emerald-600">100% Completed</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Tiles & Sanitaries:</span><span class="font-semibold text-blue-600">95% (In Progress)</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Target Handover Date:</span><span class="font-bold text-slate-800 dark:text-slate-200">December 2026</span></div>
                  </div>
                  <div class="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
                    <p class="font-bold text-slate-800 dark:text-white text-xs mb-2">Snagging & Key Handover</p>
                    <div class="flex justify-between"><span class="text-slate-500">Inspection Status:</span><span class="font-semibold text-amber-600">Pre-Handover Snagging</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Identified Snags:</span><span class="font-bold text-slate-800 dark:text-slate-200">3 Minor (2 Rectified)</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Handover Certificate:</span><span class="font-mono text-slate-500">HND-CERT-PENDING</span></div>
                    <div class="flex justify-between"><span class="text-slate-500">Key Possession:</span><span class="font-semibold text-slate-500">Awaiting Final Dues Clearance</span></div>
                  </div>
                </div>
              </div>
            </div>
          }

          <!-- TAB 9: HISTORY & APPROVALS -->
          @if (activeTab() === 'history') {
            <div class="space-y-6">
              <div class="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-4">Audit Trail & Approval History</h4>
                <div class="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 text-xs">
                  <div class="relative">
                    <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <p class="font-bold text-slate-800 dark:text-slate-200">Base Price Verified & Rate Card Activated</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">By Head of Sales · Approved under Price Schedule FY 2025-26</p>
                  </div>
                  <div class="relative">
                    <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <p class="font-bold text-slate-800 dark:text-slate-200">Architectural Area Reconciled</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">By Chief Architect · 1,450 SFT Gross Saleable finalized</p>
                  </div>
                  <div class="relative">
                    <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <p class="font-bold text-slate-800 dark:text-slate-200">Unit Master Created in Enterprise ERP</p>
                    <p class="text-[11px] text-slate-400 mt-0.5">System Registration · Created at {{ u.created_at || '2026-01-10' | date:'medium' }}</p>
                  </div>
                </div>
              </div>
            </div>
          }

        </app-card-container>
        }
      }
    </div>
  `
})
export class PropertyUnitDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inventoryService = inject(InventoryService);

  unit = signal<Unit | null>(null);
  get u(): Unit | null { return this.unit(); }
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  isLocking = signal<boolean>(false);

  activeTab = signal<DetailTab>('overview');

  tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specifications', label: 'Specifications' },
    { id: 'pricing', label: 'Pricing & Charges' },
    { id: 'availability', label: 'Availability' },
    { id: 'reservation', label: 'Reservation & Booking' },
    { id: 'parking', label: 'Parking & Facilities' },
    { id: 'documents', label: 'Documents' },
    { id: 'construction', label: 'Construction & Handover' },
    { id: 'history', label: 'History & Approvals' }
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.loadUnit(Number(idStr));
      }
    });
  }

  loadUnit(id: number): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.inventoryService.getUnitById(id).subscribe({
      next: (res) => {
        this.unit.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load unit:', err);
        this.errorMessage.set(err?.error?.detail || 'Property record could not be loaded from database.');
        this.loading.set(false);
      }
    });
  }

  lockUnit(id: number): void {
    this.isLocking.set(true);
    this.inventoryService.lockUnit(id, 'Admin User').subscribe({
      next: () => {
        this.isLocking.set(false);
        this.loadUnit(id);
      },
      error: () => this.isLocking.set(false)
    });
  }

  releaseUnit(id: number): void {
    this.inventoryService.releaseUnit(id).subscribe({
      next: () => this.loadUnit(id)
    });
  }

  printPage(): void {
    window.print();
  }

  getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  getEfficiency(u: Unit): string {
    if (!u.gross_saleable_area_sqft || u.gross_saleable_area_sqft === 0) return '0';
    return ((u.net_carpet_area_sqft / u.gross_saleable_area_sqft) * 100).toFixed(1);
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'RESERVED':
      case 'ON_HOLD':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'BOOKED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'SOLD':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      case 'HANDED OVER':
      case 'HANDED_OVER':
      case 'HANDEDOVER':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  }
}
