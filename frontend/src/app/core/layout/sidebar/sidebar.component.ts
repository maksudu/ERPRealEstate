import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface SubMenuItem {
  id: string;
  label: string;
  route: string;
  badge?: string;
}

export interface MenuGroup {
  id: string;
  title: string;
  iconSvg: string;
  expanded?: boolean;
  items: SubMenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html'
})
export class SidebarComponent {
  // In-Sidebar Quick Filter Query
  filterQuery = signal<string>('');

  // Expanded menu groups state (persisted as Set of IDs)
  expandedGroupIds = signal<Set<string>>(new Set(['settings', 'land', 'approvals']));

  // Complete Enterprise Module Structure (Encompassing all 80 Bangladesh ERP Modules)
  menuGroups: MenuGroup[] = [
    {
      id: 'settings',
      title: 'Settings & Security',
      iconSvg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        { id: 'lookups', label: 'Dynamic Lookups (PROMPT 02)', route: '/settings/lookups', badge: 'Active' },
        { id: 'rbac', label: 'RBAC & Scope Security (PROMPT 03)', route: '/settings/rbac', badge: 'Active' },
        { id: 'components', label: 'Reusable Components (PROMPT 04)', route: '/settings/components', badge: 'Active' },
        { id: 'audit', label: 'Partitioned Audit Trails (20M+)', route: '/settings/rbac' }
      ]
    },
    {
      id: 'land',
      title: 'Land & Acquisition',
      iconSvg: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      items: [
        { id: 'landowners', label: 'Landowners & Proposals', route: '/settings/lookups' },
        { id: 'khatian', label: 'CS, SA, RS, BS & Dag Records', route: '/settings/lookups' },
        { id: 'land-math', label: 'Land Area Math (Katha/Decimal)', route: '/settings/lookups' },
        { id: 'mutation', label: 'Mutation, Namjari & Deeds', route: '/settings/lookups' },
        { id: 'joint-venture', label: 'Joint Ownership & Land Sharing', route: '/settings/lookups' }
      ]
    },
    {
      id: 'approvals',
      title: 'RAJUK & Approvals',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'statutory', label: 'RAJUK / CDA / KDA Clearances', route: '/settings/lookups' },
        { id: 'far', label: 'FAR, MGC & Setback Calculations', route: '/settings/lookups' },
        { id: 'fire-aviation', label: 'Fire Service & Civil Aviation NOC', route: '/settings/lookups' }
      ]
    },
    {
      id: 'units',
      title: 'Apartment & Inventory',
      iconSvg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      items: [
        { id: 'units-list', label: 'Units, Blocks & Floor Plans', route: '/settings/lookups' },
        { id: 'facing', label: 'Orientation & Facing Adjustments', route: '/settings/lookups' },
        { id: 'pricing', label: 'Price Calculator (SqFt / Katha)', route: '/settings/lookups' },
        { id: 'parking', label: 'Car Parking Slot Allocation', route: '/settings/lookups' }
      ]
    },
    {
      id: 'sales',
      title: 'Sales & Customer CRM',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'leads', label: 'Leads & Tele-Sales CRM', route: '/settings/lookups' },
        { id: 'site-visits', label: 'Site Visits & Feedback', route: '/settings/lookups' },
        { id: 'booking', label: 'Unit Booking & Allotment Deed', route: '/settings/lookups' },
        { id: 'schedule', label: 'Installment Schedule Generator', route: '/settings/lookups' }
      ]
    },
    {
      id: 'collection',
      title: 'Collections & PDC Vault',
      iconSvg: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'mr', label: 'Money Receipts (MR) & Clearing', route: '/settings/lookups' },
        { id: 'pdc', label: 'PDC Cheque Vault & Safe', route: '/settings/lookups' },
        { id: 'bank-noc', label: 'Bank Loan Tripartite NOC', route: '/settings/lookups' },
        { id: 'legal-notice', label: 'Overdue Reminders & NI Act 138', route: '/settings/lookups' }
      ]
    },
    {
      id: 'accounts',
      title: 'Accounts & Tax (NBR)',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'ait-53ff', label: 'Sub-Registry Section 53FF AIT', route: '/settings/rbac' },
        { id: 'mushak-63', label: 'Mushak 6.3 VAT Invoices', route: '/settings/rbac' },
        { id: 'vouchers', label: 'Vouchers & General Ledger', route: '/settings/rbac' },
        { id: 'pl', label: 'Project Costing & Balance Sheet', route: '/settings/rbac' }
      ]
    },
    {
      id: 'construction',
      title: 'Construction & Civil',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'boq', label: 'BOQ / BOM Material Specifications', route: '/settings/lookups' },
        { id: 'indents', label: 'Site Indents & Requisitions', route: '/settings/lookups' },
        { id: 'grn', label: 'Goods Received (GRN) & Stock', route: '/settings/lookups' },
        { id: 'site-progress', label: 'Work Progress & Measurements', route: '/settings/lookups' }
      ]
    },
    {
      id: 'handover',
      title: 'Handover & Warranty',
      iconSvg: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      items: [
        { id: 'snagging', label: 'Pre-Handover Snagging List', route: '/settings/lookups' },
        { id: 'sub-registry', label: 'Sub-Registry Deed Execution', route: '/settings/lookups' },
        { id: 'keys', label: 'Key Handover & Certificate', route: '/settings/lookups' }
      ]
    }
  ];

  // Real-time filtered groups based on in-sidebar search input
  filteredGroups = computed(() => {
    const q = this.filterQuery().trim().toLowerCase();
    if (!q) return this.menuGroups;

    return this.menuGroups
      .map(group => {
        const matchesGroup = group.title.toLowerCase().includes(q);
        const matchingItems = group.items.filter(item => 
          item.label.toLowerCase().includes(q)
        );

        if (matchesGroup || matchingItems.length > 0) {
          return {
            ...group,
            items: matchesGroup ? group.items : matchingItems
          };
        }
        return null;
      })
      .filter((g): g is MenuGroup => g !== null);
  });

  isGroupExpanded(groupId: string): boolean {
    // If user is actively searching, auto-expand all matching groups!
    if (this.filterQuery().trim()) {
      return true;
    }
    return this.expandedGroupIds().has(groupId);
  }

  toggleGroup(groupId: string): void {
    const current = new Set(this.expandedGroupIds());
    if (current.has(groupId)) {
      current.delete(groupId);
    } else {
      current.add(groupId);
    }
    this.expandedGroupIds.set(current);
  }
}
