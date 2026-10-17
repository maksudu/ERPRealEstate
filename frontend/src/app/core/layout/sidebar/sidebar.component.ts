import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  // In-Sidebar Quick Filter Query
  filterQuery = signal<string>('');

  // Expanded menu groups state (persisted as Set of IDs, auto-expands active route)
  expandedGroupIds = signal<Set<string>>(new Set());

  // Clean, Deduplicated Module Structure (Every menu item maps to a distinct, unique page)
  menuGroups: MenuGroup[] = [
    {
      id: 'settings',
      title: 'Settings & Core',
      iconSvg: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      items: [
        { id: 'governance', label: 'Maker-Checker Approval Engine', route: '/governance/approvals', badge: 'Tier-1' },
        { id: 'lookups', label: 'Dynamic Dropdowns', route: '/settings/lookups' },
        { id: 'rbac', label: 'RBAC & Project Security', route: '/settings/rbac' },
        { id: 'legal', label: 'Legal & Court Litigation', route: '/settings/legal-cases' },
        { id: 'equipment', label: 'Machinery & Equipment Fleet', route: '/settings/equipment' },
        { id: 'migration', label: 'Legacy Data Migration', route: '/settings/data-import' }
      ]
    },
    {
      id: 'land',
      title: 'Land Bank & Acquisition',
      iconSvg: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
      items: [
        { id: 'landowners', label: 'Land Bank Proposals', route: '/land/proposals' },
        { id: 'khatian', label: 'Historic Surveys (CS/SA/RS/BS)', route: '/land/surveys' },
        { id: 'joint-venture', label: 'JV Agreements & Allocation', route: '/land/jv-agreements' }
      ]
    },
    {
      id: 'approvals',
      title: 'Spatial Projects & Permits',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'projects-master', label: 'Spatial Projects & FAR', route: '/projects/list' },
        { id: 'statutory', label: 'Statutory Permits & Clearances', route: '/projects/clearances' },
        { id: 'boq', label: 'BOQ Estimation & IFC Drawings', route: '/projects/boq' }
      ]
    },
    {
      id: 'units',
      title: 'Property Inventory',
      iconSvg: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      items: [
        { id: 'tower-stacking', label: '2D Tower Stacking Elevation', route: '/inventory/stacking-plan', badge: '2D Stacking' },
        { id: 'units-matrix', label: '15-Minute Lock Matrix', route: '/inventory/matrix', badge: 'Live' },
        { id: 'subdivision', label: 'Unit Merge & Subdivision', route: '/inventory/subdivision' },
        { id: 'parking-bays', label: 'Basement Parking Bays', route: '/inventory/parking' }
      ]
    },
    {
      id: 'crm',
      title: 'CRM & Prospects',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'leads', label: 'Omnichannel Leads & Pipeline', route: '/crm/leads' },
        { id: 'customers', label: 'Buyer Profiles & KYC', route: '/crm/customers' }
      ]
    },
    {
      id: 'sales',
      title: 'Sales & Allotments',
      iconSvg: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      items: [
        { id: 'bookings', label: 'Apartment Bookings', route: '/sales/bookings' },
        { id: 'discounts', label: 'Discount Level Approvals', route: '/sales/discounts' },
        { id: 'cancellations', label: 'REHAB Cancellations & Refunds', route: '/sales/cancellations' },
        { id: 'brokers', label: 'Broker Commissions & TDS', route: '/brokers/commissions' }
      ]
    },
    {
      id: 'collection',
      title: 'Collections & PDC Vault',
      iconSvg: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'money-receipts', label: 'Money Receipts & Waterfall', route: '/installments/money-receipts', badge: 'Smart MR' },
        { id: 'tripartite-loans', label: 'Bank Loan Tripartite Ledger', route: '/installments/tripartite-loans', badge: 'Tripartite' },
        { id: 'schedules', label: 'Installment Schedules & MR', route: '/installments/schedules' },
        { id: 'pdc', label: 'PDC Cheque Vault & Safe', route: '/installments/pdc-vault' },
        { id: 'ni138', label: 'NI Act 138 Legal Recovery', route: '/installments/ni138-actions' }
      ]
    },
    {
      id: 'hrms',
      title: 'HRMS & Site Labour',
      iconSvg: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { id: 'hrms-dashboard', label: 'HRMS & Labour Cockpit', route: '/hrms/dashboard', badge: 'New' },
        { id: 'hrms-employees', label: 'Employee Directory 360°', route: '/hrms/employees' },
        { id: 'hrms-muster', label: 'Daily Labour Muster Roll', route: '/hrms/muster-roll' },
        { id: 'hrms-payroll', label: 'Payroll & NBR TDS Engine', route: '/hrms/payroll' },
        { id: 'hrms-attendance', label: 'Attendance & Leave Log', route: '/hrms/attendance' }
      ]
    },
    {
      id: 'accounts',
      title: 'Finance & Accounts',
      iconSvg: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
      items: [
        { id: 'coa', label: '5-Tier Chart of Accounts', route: '/accounts/coa' },
        { id: 'vouchers', label: 'General Ledger & Vouchers', route: '/accounts/vouchers' },
        { id: 'cwip-cockpit', label: 'CWIP & IFRS-15 Cockpit', route: '/accounts/cwip-cockpit', badge: 'Tier-1' },
        { id: 'pdc-kanban', label: 'PDC Vault & Kanban Safe', route: '/accounts/pdc-kanban', badge: 'Safe' },
        { id: 'bank-recon-wizard', label: 'Smart Bank Statement Recon', route: '/accounts/bank-recon-wizard' },
        { id: 'reports', label: 'Financial Reports & P&L', route: '/accounts/financial-reports' },
        { id: 'mushak-63', label: 'Mushak 6.3 VAT Tax Invoices', route: '/tax/cockpit' },
        { id: 'tds-vds', label: 'TDS & VDS Withholding Tax', route: '/tax/cockpit' },
        { id: 'ait-53ff', label: 'Sub-Registry AIT Calculator', route: '/tax/cockpit' }
      ]
    },
    {
      id: 'tax',
      title: 'NBR Tax & Statutory VAT',
      iconSvg: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      items: [
        { id: 'tax-cockpit', label: 'NBR Tax & VAT Cockpit', route: '/tax/cockpit', badge: 'NBR' },
        { id: 'tax-mushak63', label: 'Mushak 6.3 VAT Invoices', route: '/tax/cockpit' },
        { id: 'tax-mushak65', label: 'Mushak 6.5 Transfer Challan', route: '/tax/cockpit' },
        { id: 'tax-tds', label: 'TDS & VDS Withholding Register', route: '/tax/cockpit' },
        { id: 'tax-53ff', label: 'Section 53FF AIT Calculator', route: '/tax/cockpit' }
      ]
    },
    {
      id: 'construction',
      title: 'Construction Operations',
      iconSvg: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      items: [
        { id: 'wbs-boq', label: 'WBS & BOQ Hard Budget Locks', route: '/construction/wbs-boq' },
        { id: 'dpr', label: 'Site Diary & Daily Progress (DPR)', route: '/construction/dpr' },
        { id: 'labor-muster', label: 'Subcontractor Labor Muster Roll', route: '/construction/labor-muster' },
        { id: 'ra-bills', label: 'Contractor RA Billing', route: '/construction/ra-bills' },
        { id: 'cube-tests', label: 'Concrete Cube Crushing Tests', route: '/construction/cube-tests' },
        { id: 'safety-ncr', label: 'Site Safety NCR Register', route: '/construction/safety-ncr' }
      ]
    },
    {
      id: 'procurement',
      title: 'Procurement & Stores',
      iconSvg: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      items: [
        { id: 'cockpit', label: 'SCM & Procurement Cockpit', route: '/procurement/cockpit', badge: 'PR→MIN' },
        { id: 'stores', label: 'Site Store Stock Inventory', route: '/procurement/stores' },
        { id: 'cs', label: 'Comparative Statements (CS)', route: '/procurement/comparative-statements' },
        { id: 'grn', label: 'GRN & 3-Way Match Audit', route: '/procurement/grn' }
      ]
    },
    {
      id: 'handover',
      title: 'Handover & Facilities',
      iconSvg: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      items: [
        { id: 'snagging', label: 'Snagging & DLP Warranty', route: '/handover/snagging' },
        { id: 'possession', label: 'Key Handover & Possession', route: '/handover/possession' },
        { id: 'association', label: 'Building Association & Leasing', route: '/handover/association' }
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

  ngOnInit(): void {
    this.autoExpandActiveRoute();
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.autoExpandActiveRoute());
  }

  private autoExpandActiveRoute(): void {
    const currentUrl = this.router.url;
    for (const group of this.menuGroups) {
      if (group.items.some(item => currentUrl.startsWith(item.route))) {
        this.expandedGroupIds.update(set => {
          const newSet = new Set(set);
          newSet.add(group.id);
          return newSet;
        });
        break;
      }
    }
  }

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
