import { Component, HostListener, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  route: string;
  shortcut?: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div 
        class="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
        (click)="close()"
      >
        <div 
          class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-scaleUp"
          (click)="$event.stopPropagation()"
        >
          <!-- Search Input Box -->
          <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-850">
            <svg class="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Search ERP modules, settings, projects... (Type to filter)"
              class="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              autofocus
            />
            <kbd class="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">ESC</kbd>
          </div>

          <!-- Filtered Results List -->
          <div class="max-h-80 overflow-y-auto p-2 space-y-1">
            @if (filteredCommands().length > 0) {
              @for (cmd of filteredCommands(); track cmd.id) {
                <button
                  type="button"
                  (click)="executeCommand(cmd)"
                  class="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div class="flex items-center gap-2.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span class="font-medium text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {{ cmd.title }}
                    </span>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {{ cmd.category }}
                  </span>
                </button>
              }
            } @else {
              <div class="py-8 text-center text-slate-400 text-xs">
                No commands matching "{{ searchQuery() }}"
              </div>
            }
          </div>

          <!-- Quick Footer -->
          <div class="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 flex items-center justify-between text-[11px] text-slate-400">
            <span>Navigation: Click or Enter</span>
            <span>Shortcut: <kbd class="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">Ctrl + K</kbd></span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    .animate-fadeIn { animation: fadeIn 0.12s ease-out forwards; }
    .animate-scaleUp { animation: scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `]
})
export class CommandPaletteComponent {
  private router = inject(Router);

  isOpen = signal<boolean>(false);
  searchQuery = signal<string>('');

  commands: CommandItem[] = [
    { id: 'bi-cockpit', title: 'Executive Management BI Cockpit (Board & C-Suite)', category: 'Executive BI', route: '/bi/cockpit' },
    { id: 'bi-runway', title: 'Cash Runway Sensitivity Simulator (90 / 180 / 365 Days)', category: 'Executive BI', route: '/bi/runway' },
    { id: 'bi-evm', title: 'Project Profitability & EVM Performance (SPI & CPI)', category: 'Executive BI', route: '/bi/evm' },
    { id: 'bi-heatmap', title: 'Real-time Overdue Collections Aging Matrix Heatmap', category: 'Executive BI', route: '/bi/heatmap' },
    { id: 'land-proposals', title: 'Land Proposals', category: 'Land', route: '/land/proposals' },
    { id: 'land-surveys', title: 'Land Surveys & Khatian (CS, SA, RS)', category: 'Land', route: '/land/surveys' },
    { id: 'jv', title: 'Joint Venture Agreements', category: 'Land', route: '/land/jv-agreements' },
    { id: 'projects', title: 'Projects', category: 'Projects', route: '/projects/list' },
    { id: 'clearances', title: 'Authority Approvals (RAJUK, CDA, KDA)', category: 'Projects', route: '/projects/clearances' },
    { id: 'boq', title: 'Bill of Quantities (BOQ)', category: 'Projects', route: '/projects/boq' },
    { id: 'inventory', title: 'Flat & Unit Inventory', category: 'Sales', route: '/inventory/matrix' },
    { id: 'crm-dashboard', title: 'CRM Dashboard & Sales KPIs (Spec 4.1)', category: 'CRM', route: '/crm' },
    { id: 'leads', title: 'Leads & Pipeline', category: 'CRM', route: '/crm/leads' },
    { id: 'lead-capture', title: 'Lead Capture & Sources (Spec 4.2)', category: 'CRM', route: '/crm/lead-capture' },
    { id: 'lead-assignments', title: 'Lead Assignment & Distribution (Spec 4.3)', category: 'CRM', route: '/crm/lead-assignments' },
    { id: 'lead-qualification', title: 'Lead Qualification & Scoring (Spec 4.4)', category: 'CRM', route: '/crm/lead-qualification' },
    { id: 'lead-import', title: 'Lead Bulk Import & History', category: 'CRM', route: '/crm/lead-capture/import' },
    { id: 'customers', title: 'Customers & Buyer KYC (Spec 4.5)', category: 'CRM', route: '/crm/customers' },
    { id: 'customer-requirements', title: 'Customer Requirements & Budget Tracking (Spec 4.6)', category: 'CRM', route: '/crm/requirements' },
    { id: 'crm-activities', title: 'Sales Interactions & Activity Calendar (Spec 4.7)', category: 'CRM', route: '/crm/activities' },
    { id: 'crm-tasks', title: 'Follow-up Tasks & Reminders (Spec 4.8)', category: 'CRM', route: '/crm/tasks' },
    { id: 'crm-communications', title: 'Customer Communication History & Timeline (Spec 4.9)', category: 'CRM', route: '/crm/communications' },
    { id: 'crm-brokers', title: 'Broker & Referral Management (Spec 4.10)', category: 'CRM', route: '/crm/brokers' },
    { id: 'crm-funnel', title: 'Sales Funnel & Lead Conversion Tracking (Spec 4.11)', category: 'CRM', route: '/crm/funnel' },
    { id: 'crm-handovers', title: 'Lead-to-Booking Handover Workflow (Spec 4.12)', category: 'CRM', route: '/crm/handovers' },
    { id: 'crm-campaigns', title: 'Campaign & Marketing Management (Spec 4.13)', category: 'CRM', route: '/crm/campaigns' },
    { id: 'customer-portal', title: 'Customer Self-Service Portal & Flat Owner Transparency', category: 'Customer Portal', route: '/portal/customer' },
    { id: 'portal-installments', title: 'Online Installment Payment & Receipts (bKash/Nagad/SSL)', category: 'Customer Portal', route: '/portal/customer' },
    { id: 'portal-snag', title: 'Report Apartment Snag & Maintenance Defect Ticket', category: 'Customer Portal', route: '/portal/customer' },
    { id: 'bookings', title: 'Bookings', category: 'Sales', route: '/sales/bookings' },
    { id: 'discounts', title: 'Discount Approvals', category: 'Sales', route: '/sales/discounts' },
    { id: 'collections', title: 'Booking & Down Payments Collection', category: 'Sales', route: '/sales/collections' },
    { id: 'documents', title: 'Sales Agreements & Deed Preparation', category: 'Sales', route: '/sales/documents' },
    { id: 'sales-schedules', title: 'Installment Schedules & Amortization (Spec 5.7)', category: 'Sales', route: '/sales/schedules' },
    { id: 'sales-ledger', title: 'Customer Sales Ledger & Statements (Spec 5.8)', category: 'Sales', route: '/sales/ledger' },
    { id: 'cancellations', title: 'Cancellation & Refund Management (Spec 5.9)', category: 'Sales', route: '/sales/cancellations' },
    { id: 'transfers', title: 'Property Transfers & Buyer Changes (Spec 5.10)', category: 'Sales', route: '/sales/transfers' },
    { id: 'registrations', title: 'Registration & Deed Tracking (Spec 5.11)', category: 'Sales', route: '/sales/registrations' },
    { id: 'handovers', title: 'Property Handover & Possession (Spec 5.12)', category: 'Sales', route: '/sales/handovers' },
    { id: 'property-report', title: 'Property & Sales Portfolio Intelligence Report (Excel / PDF)', category: 'Sales', route: '/sales/reports/property-report' },
    { id: 'brokers', title: 'Broker Commissions', category: 'Sales', route: '/brokers/commissions' },
    { id: 'schedules', title: 'Installment Schedules', category: 'Collection', route: '/installments/schedules' },
    { id: 'pdc', title: 'PDC Cheque Vault', category: 'Collection', route: '/installments/pdc-vault' },
    { id: 'ni138', title: 'NI Act 138 Notices', category: 'Collection', route: '/installments/ni138-actions' },
    { id: 'wbs-boq', title: 'WBS & BOQ Hard Budget Locks', category: 'Construction', route: '/construction/wbs-boq' },
    { id: 'work-orders', title: 'Work Orders & Contract Management (BOQ, Rates, Milestones, Variations)', category: 'Construction', route: '/construction/work-orders' },
    { id: 'work-orders-create', title: 'Create Approved Work Order from BOQ & Tender', category: 'Construction', route: '/construction/work-orders/create' },
    { id: 'dpr', title: 'Daily Progress Report', category: 'Construction', route: '/construction/dpr' },
    { id: 'labor', title: 'Labor Muster Roll', category: 'Construction', route: '/construction/labor-muster' },
    { id: 'contractors', title: 'Contractor & Subcontractor Registry (Profiles, Rates, Disputes)', category: 'Construction', route: '/construction/contractors' },
    { id: 'ra-bills', title: 'Contractor RA Bills', category: 'Construction', route: '/construction/ra-bills' },
    { id: 'cube', title: 'Concrete Cube Tests', category: 'Construction', route: '/construction/cube-tests' },
    { id: 'safety', title: 'Health, Safety (HSE) & Defect NCR Register', category: 'Construction', route: '/construction/safety-ncr' },
    { id: 'mat-req', title: 'Site Material Requisition & Consumption', category: 'Construction', route: '/construction/material-requisitions' },
    { id: 'project-completion', title: 'Project Completion, Handover & Snag Register', category: 'Construction', route: '/construction/project-completion' },
    { id: 'construction-reports', title: '14 Standard Construction Management Reports & Executive Analytics', category: 'Construction', route: '/construction/reports' },
    { id: 'scm-cockpit', title: 'SCM & Procurement Cockpit (PR, RFQ, CS, PO, GRN, QC, MIN)', category: 'Procurement', route: '/procurement/cockpit' },
    { id: 'stores', title: 'Site Stores & Stock Valuation', category: 'Procurement', route: '/procurement/stores' },
    { id: 'cs', title: 'Requisitions & Comparative Statements', category: 'Procurement', route: '/procurement/comparative-statements' },
    { id: 'grn', title: 'Goods Receipt (GRN) & Gate Entry', category: 'Procurement', route: '/procurement/grn' },
    { id: 'coa', title: 'Chart of Accounts', category: 'Accounts', route: '/accounts/coa' },
    { id: 'vouchers', title: 'Vouchers', category: 'Accounts', route: '/accounts/vouchers' },
    { id: 'reports', title: 'Financial Reports', category: 'Accounts', route: '/accounts/financial-reports' },
    { id: 'vat', title: 'VAT & Mushak', category: 'Accounts', route: '/accounts/vat-mushak' },
    { id: 'tds', title: 'Tax Withholding (TDS/VDS)', category: 'Accounts', route: '/accounts/tax-withholding' },
    { id: 'sub-registry', title: 'Sub-Registry Cost Calculator', category: 'Accounts', route: '/accounts/sub-registry-calc' },
    { id: 'snagging', title: 'Snagging', category: 'Handover', route: '/handover/snagging' },
    { id: 'possession', title: 'Possession Handover', category: 'Handover', route: '/handover/possession' },
    { id: 'legal', title: 'Legal & Statutory Compliance Vault (RAJUK/CDA, Stay Orders & Land Disputes)', category: 'Legal', route: '/legal/compliance-vault' },
    { id: 'equipment', title: 'Plant & Machinery', category: 'Settings', route: '/settings/equipment' },
    { id: 'import', title: 'Data Import (Excel)', category: 'Settings', route: '/settings/data-import' },
    { id: 'lookups', title: 'Dropdown Master Settings', category: 'Settings', route: '/settings/lookups' },
    { id: 'rbac', title: 'Users, Roles & Project Access', category: 'Settings', route: '/settings/rbac' },
    { id: 'governance', title: 'Maker-Checker Approval Engine & Dynamic Governance (Discount, PO, Cancellation)', category: 'Governance', route: '/governance/approvals' }
  ];

  filteredCommands = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.commands;
    return this.commands.filter(c => 
      c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  });

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.toggle();
    } else if (event.key === 'Escape' && this.isOpen()) {
      this.close();
    }
  }

  open(): void {
    this.searchQuery.set('');
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  executeCommand(cmd: CommandItem): void {
    this.close();
    this.router.navigateByUrl(cmd.route);
  }
}
