import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountsService } from '../../../core/services/accounts.service';
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
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './accounts-coa.component.html'
})
export class AccountsCoaComponent implements OnInit {
  private accountsService = inject(AccountsService);
  private fb = inject(FormBuilder);

  coaTree = signal<ChartOfAccountTreeNode[]>([]);
  coaFlatList = signal<ChartOfAccount[]>([]);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isCreateModalOpen = signal<boolean>(false);

  // View state
  viewMode = signal<'tree' | 'flat'>('tree');
  searchQuery = signal<string>('');
  filterType = signal<string>('');

  createForm: FormGroup = this.fb.group({
    account_code: ['', Validators.required],
    account_name_en: ['', Validators.required],
    account_name_bn: [''],
    account_type: ['Asset', Validators.required],
    parent_account_id: [null],
    is_leaf_account: [true],
    currency: ['BDT'],
    is_reconciliation_account: [false]
  });

  accountTypeOptions = [
    { value: '', label: 'All Account Types' },
    { value: 'Asset', label: '1000 - Assets' },
    { value: 'Liability', label: '2000 - Liabilities' },
    { value: 'Equity', label: '3000 - Equity' },
    { value: 'Revenue', label: '4000 - Revenue' },
    { value: 'Expense', label: '5000 - Expenses' }
  ];

  typeSelectOptions = [
    { value: 'Asset', label: 'Asset (e.g. 1000)' },
    { value: 'Liability', label: 'Liability (e.g. 2000)' },
    { value: 'Equity', label: 'Equity (e.g. 3000)' },
    { value: 'Revenue', label: 'Revenue (e.g. 4000)' },
    { value: 'Expense', label: 'Expense (e.g. 5000)' }
  ];

  parentAccountOptions = computed(() => [
    { value: null, label: 'None (Root Level 1 Account)' },
    ...this.coaFlatList().map(a => ({
      value: a.id,
      label: `${a.account_code} - ${a.account_name_en} (${a.account_type})`
    }))
  ]);

  ngOnInit(): void {
    this.loadHierarchy();
    this.loadFlatCOA();
  }

  loadHierarchy(): void {
    this.isLoading.set(true);
    this.accountsService.getCOAHierarchy().subscribe({
      next: (tree) => {
        // Expand root nodes by default
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
    this.accountsService.getCOA(this.filterType() || undefined).subscribe({
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

  openCreateModal(parent?: ChartOfAccountTreeNode): void {
    this.createForm.reset({
      account_code: '',
      account_name_en: '',
      account_name_bn: '',
      account_type: parent ? parent.account_type : 'Asset',
      parent_account_id: parent ? parent.id : null,
      is_leaf_account: true,
      currency: 'BDT',
      is_reconciliation_account: false
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.accountsService.createAccount(this.createForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.loadHierarchy();
        this.loadFlatCOA();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to create account');
        this.isSubmitting.set(false);
      }
    });
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
      node.expanded = true; // Auto-expand path to matched child
    }
    return matchSelf || matchChildren;
  }
}
