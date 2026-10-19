import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountsService } from '../../../core/services/accounts.service';
import { LookupService } from '../../../core/services/lookup.service';
import { ChartOfAccount, ChartOfAccountTreeNode } from '../../../core/models/accounts.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-accounts-coa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-coa.component.html'
})
export class AccountsCoaComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private lookupService = inject(LookupService);
  private router = inject(Router);

  coaTree = signal<ChartOfAccountTreeNode[]>([]);
  coaFlatList = signal<ChartOfAccount[]>([]);
  isLoading = signal<boolean>(false);

  // View state
  viewMode = signal<'tree' | 'flat'>('tree');
  searchQuery = signal<string>('');
  filterType = signal<string>('');

  // Pagination for flat table
  page = signal<number>(1);
  pageSize = signal<number>(20);

  accountTypeOptions: { value: any; label: string }[] = [
    { value: '', label: 'All Account Groups' }
  ];

  totalPages = computed(() => {
    const count = this.filteredFlatList().length;
    return Math.ceil(count / this.pageSize()) || 1;
  });

  filteredFlatList = computed(() => {
    let list = this.coaFlatList();
    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.account_code.toLowerCase().includes(q) ||
        a.account_name_en.toLowerCase().includes(q) ||
        (a.account_name_bn && a.account_name_bn.toLowerCase().includes(q))
      );
    }
    if (this.filterType()) {
      list = list.filter(a => a.account_type === this.filterType());
    }
    return list;
  });

  pagedFlatList = computed(() => {
    const list = this.filteredFlatList();
    const start = (this.page() - 1) * this.pageSize();
    return list.slice(start, start + this.pageSize());
  });

  // KPI summaries
  totalAccountsCount = computed(() => this.coaFlatList().length);
  postingAccountsCount = computed(() => this.coaFlatList().filter(a => a.is_leaf_account).length);
  controlAccountsCount = computed(() => this.coaFlatList().filter(a => a.is_control_account).length);

  ngOnInit(): void {
    this.loadLookups();
    this.loadHierarchy();
    this.loadFlatCOA();
  }

  loadLookups(): void {
    this.lookupService.getItems('COA_ACCOUNT_GROUP').subscribe({
      next: (items) => {
        if (items && items.length > 0) {
          this.accountTypeOptions = [
            { value: '', label: 'All Account Groups' },
            ...items.map(i => ({ value: i.item_code, label: `${i.item_code} - ${i.item_name_en}` }))
          ];
        } else {
          this.accountTypeOptions = [
            { value: '', label: 'All Account Groups' },
            { value: 'Asset', label: '1000 - Assets' },
            { value: 'Liability', label: '2000 - Liabilities' },
            { value: 'Equity', label: '3000 - Equity' },
            { value: 'Revenue', label: '4000 - Revenue' },
            { value: 'Cost_of_Sales', label: '5000 - Cost of Sales' },
            { value: 'Project_Expense', label: '6100 - Project Expenses' },
            { value: 'Operating_Expense', label: '6200 - Operating Expenses' },
            { value: 'Finance_Cost', label: '6400 - Finance Costs' },
            { value: 'Other_Income_Expense', label: '6500 - Other Income/Expenses' }
          ];
        }
      }
    });
  }

  loadHierarchy(): void {
    this.isLoading.set(true);
    this.accountsService.getCOAHierarchy().subscribe({
      next: (tree) => {
        this.expandNodes(tree, true);
        this.coaTree.set(tree);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load COA hierarchy', err);
        this.isLoading.set(false);
      }
    });
  }

  loadFlatCOA(): void {
    this.accountsService.getCOA({
      account_type: this.filterType() || undefined,
      limit: 1000
    }).subscribe({
      next: (res) => this.coaFlatList.set(res),
      error: (err) => console.error('Failed to load flat COA', err)
    });
  }

  expandNodes(nodes: ChartOfAccountTreeNode[], state: boolean): void {
    for (const n of nodes) {
      n.expanded = state;
      if (n.children && n.children.length > 0) {
        this.expandNodes(n.children, state);
      }
    }
  }

  toggleNode(node: ChartOfAccountTreeNode): void {
    node.expanded = !node.expanded;
  }

  expandAll(): void {
    const tree = [...this.coaTree()];
    this.expandNodes(tree, true);
    this.coaTree.set(tree);
  }

  collapseAll(): void {
    const tree = [...this.coaTree()];
    this.expandNodes(tree, false);
    this.coaTree.set(tree);
  }

  // Navigation to Dedicated Standalone Full-Screen Components (Rule 10)
  navigateToCreate(parent?: ChartOfAccountTreeNode): void {
    if (parent) {
      this.router.navigate(['/accounts/coa/create'], {
        queryParams: { parent_id: parent.id, type: parent.account_type }
      });
    } else {
      this.router.navigate(['/accounts/coa/create']);
    }
  }

  navigateToEdit(id: number): void {
    this.router.navigate(['/accounts/coa/edit', id]);
  }

  navigateToLedger(accountId: number): void {
    this.router.navigate(['/accounts/ledger'], {
      queryParams: { account_id: accountId }
    });
  }

  changePage(delta: number): void {
    const p = this.page() + delta;
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
    }
  }

  // Filtered Tree logic
  filterTreeNode(node: ChartOfAccountTreeNode, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    const matchSelf = node.account_code.toLowerCase().includes(q) ||
                      node.account_name_en.toLowerCase().includes(q) ||
                      (node.account_name_bn && node.account_name_bn.toLowerCase().includes(q));
    const matchChildren = node.children ? node.children.some(c => this.filterTreeNode(c, query)) : false;
    if (matchChildren) {
      node.expanded = true;
    }
    return matchSelf || matchChildren;
  }

  exportCSV(): void {
    const list = this.filteredFlatList();
    if (!list || list.length === 0) return;

    const headers = ['"Account Code"', '"Account Name (EN)"', '"Account Name (BN)"', '"Account Type"', '"Normal Balance"', '"Level"', '"Is Posting"', '"Current Balance (BDT)"'];
    const rows = list.map(a => [
      `"${a.account_code}"`,
      `"${a.account_name_en.replace(/"/g, '""')}"`,
      `"${(a.account_name_bn || '').replace(/"/g, '""')}"`,
      `"${a.account_type}"`,
      `"${a.normal_balance || 'Debit'}"`,
      `"${a.level || 5}"`,
      `"${a.is_leaf_account ? 'Yes' : 'No'}"`,
      `"${a.current_balance || 0}"`
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chart_of_accounts_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  printCOA(): void {
    window.print();
  }
}

