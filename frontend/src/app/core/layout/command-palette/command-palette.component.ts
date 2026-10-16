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
    { id: 'land-proposals', title: 'Land Proposals', category: 'Land', route: '/land/proposals' },
    { id: 'land-surveys', title: 'Land Surveys & Khatian (CS, SA, RS)', category: 'Land', route: '/land/surveys' },
    { id: 'jv', title: 'Joint Venture Agreements', category: 'Land', route: '/land/jv-agreements' },
    { id: 'projects', title: 'Projects', category: 'Projects', route: '/projects/list' },
    { id: 'clearances', title: 'Authority Approvals (RAJUK, CDA, KDA)', category: 'Projects', route: '/projects/clearances' },
    { id: 'boq', title: 'Bill of Quantities (BOQ)', category: 'Projects', route: '/projects/boq' },
    { id: 'inventory', title: 'Flat & Unit Inventory', category: 'Sales', route: '/inventory/matrix' },
    { id: 'leads', title: 'Leads', category: 'CRM', route: '/crm/leads' },
    { id: 'customers', title: 'Customers', category: 'CRM', route: '/crm/customers' },
    { id: 'bookings', title: 'Bookings', category: 'Sales', route: '/sales/bookings' },
    { id: 'discounts', title: 'Discount Approvals', category: 'Sales', route: '/sales/discounts' },
    { id: 'cancellations', title: 'Cancellations & Refunds', category: 'Sales', route: '/sales/cancellations' },
    { id: 'brokers', title: 'Broker Commissions', category: 'Sales', route: '/brokers/commissions' },
    { id: 'schedules', title: 'Installment Schedules', category: 'Collection', route: '/installments/schedules' },
    { id: 'pdc', title: 'PDC Cheque Vault', category: 'Collection', route: '/installments/pdc-vault' },
    { id: 'ni138', title: 'NI Act 138 Notices', category: 'Collection', route: '/installments/ni138-actions' },
    { id: 'dpr', title: 'Daily Progress Report', category: 'Construction', route: '/construction/dpr' },
    { id: 'labor', title: 'Labor Muster Roll', category: 'Construction', route: '/construction/labor-muster' },
    { id: 'ra-bills', title: 'Contractor RA Bills', category: 'Construction', route: '/construction/ra-bills' },
    { id: 'cube', title: 'Concrete Cube Tests', category: 'Construction', route: '/construction/cube-tests' },
    { id: 'safety', title: 'Safety & NCR', category: 'Construction', route: '/construction/safety-ncr' },
    { id: 'stores', title: 'Site Stores', category: 'Procurement', route: '/procurement/stores' },
    { id: 'cs', title: 'Requisitions & Comparative Statements', category: 'Procurement', route: '/procurement/comparative-statements' },
    { id: 'grn', title: 'Goods Receipt (GRN)', category: 'Procurement', route: '/procurement/grn' },
    { id: 'coa', title: 'Chart of Accounts', category: 'Accounts', route: '/accounts/coa' },
    { id: 'vouchers', title: 'Vouchers', category: 'Accounts', route: '/accounts/vouchers' },
    { id: 'reports', title: 'Financial Reports', category: 'Accounts', route: '/accounts/financial-reports' },
    { id: 'vat', title: 'VAT & Mushak', category: 'Accounts', route: '/accounts/vat-mushak' },
    { id: 'tds', title: 'Tax Withholding (TDS/VDS)', category: 'Accounts', route: '/accounts/tax-withholding' },
    { id: 'sub-registry', title: 'Sub-Registry Cost Calculator', category: 'Accounts', route: '/accounts/sub-registry-calc' },
    { id: 'snagging', title: 'Snagging', category: 'Handover', route: '/handover/snagging' },
    { id: 'possession', title: 'Possession Handover', category: 'Handover', route: '/handover/possession' },
    { id: 'association', title: 'Flat Owners Association', category: 'Handover', route: '/handover/association' },
    { id: 'legal', title: 'Legal Cases', category: 'Settings', route: '/settings/legal-cases' },
    { id: 'equipment', title: 'Plant & Machinery', category: 'Settings', route: '/settings/equipment' },
    { id: 'import', title: 'Data Import (Excel)', category: 'Settings', route: '/settings/data-import' },
    { id: 'lookups', title: 'Dropdown Master Settings', category: 'Settings', route: '/settings/lookups' },
    { id: 'rbac', title: 'Users, Roles & Project Access', category: 'Settings', route: '/settings/rbac' },
    { id: 'components', title: 'UI Components', category: 'Settings', route: '/settings/components' }
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
