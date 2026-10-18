import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

export interface ProcurementTabItem {
  id: string;
  label: string;
  route: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

@Component({
  selector: 'app-procurement-nav',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <div class="space-y-4 select-none mb-6">
      <!-- Top Title & Executive Action Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-xs shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {{ title }}
              </h1>
              <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                SCM Enterprise
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {{ subtitle }}
            </p>
          </div>
        </div>

        <!-- Quick Module Stats / Scope Indicator -->
        <div class="flex items-center gap-2 flex-wrap">
          <ng-content select="[actions]"></ng-content>
        </div>
      </div>

      <!-- 15 Unified SCM Sub-module Navigation Pills -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        @for (tab of tabs; track tab.id) {
          <a
            [routerLink]="tab.route"
            routerLinkActive="bg-amber-500 text-slate-950 font-bold shadow-xs border-amber-500"
            [routerLinkActiveOptions]="{ exact: tab.route === '/procurement/dashboard' }"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all shrink-0 select-none cursor-pointer"
          >
            <span class="text-xs">{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
            @if (tab.badge) {
              <span [class]="'px-1.5 py-0.2 rounded text-[9px] font-bold ' + (tab.badgeColor || 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300')">
                {{ tab.badge }}
              </span>
            }
          </a>
        }
      </div>
    </div>
  `
})
export class ProcurementNavComponent {
  @Input() title: string = 'Procurement & Inventory Management';
  @Input() subtitle: string = 'Bangladesh Real Estate Developer ERP — Full SCM Lifecycle';

  tabs: ProcurementTabItem[] = [
    { id: 'dash', label: '9.1 Dashboard', route: '/procurement/dashboard', icon: '📊', badge: 'Live' },
    { id: 'vendors', label: '9.2 Vendors', route: '/procurement/vendors', icon: '🏢' },
    { id: 'materials', label: '9.3 Materials', route: '/procurement/materials', icon: '🧱' },
    { id: 'pr', label: '9.4 PR Requisitions', route: '/procurement/requisitions', icon: '📝', badge: 'BOQ' },
    { id: 'rfq', label: '9.5 RFQ & CS', route: '/procurement/rfq-comparison', icon: '⚖️' },
    { id: 'po', label: '9.6 Purchase Orders', route: '/procurement/purchase-orders', icon: '📑', badge: 'Tier-1' },
    { id: 'grn', label: '9.7 GRN Receipts', route: '/procurement/grn', icon: '🚚', badge: 'Gate' },
    { id: 'qc', label: '9.8 Quality Inspection', route: '/procurement/inspections', icon: '🔬', badge: 'QC' },
    { id: 'stock', label: '9.9 Warehouse & Stock', route: '/procurement/warehouse-stock', icon: '🏬' },
    { id: 'min', label: '9.10 Material Issue', route: '/procurement/material-issues', icon: '📦', badge: 'WBS' },
    { id: 'transfer', label: '9.11 Stock Transfers', route: '/procurement/stock-transfers', icon: '🔄' },
    { id: 'planning', label: '9.12 Reorder Planning', route: '/procurement/material-planning', icon: '⚠️', badge: 'Low Stock' },
    { id: 'ledger', label: '9.13 Stock Ledger', route: '/procurement/inventory-ledger', icon: '📖', badge: 'Weighted' },
    { id: 'bills', label: '9.14 3-Way Match Bills', route: '/procurement/supplier-bills', icon: '🧾', badge: '3-Way' },
    { id: 'audit', label: '9.15 Audit Trail', route: '/procurement/reports-audit', icon: '🛡️', badge: 'Audit' }
  ];
}
