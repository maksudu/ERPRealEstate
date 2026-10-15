# UI/UX Design System & Custom Reusable Components Specification

## 1. Design System Philosophy & Core Design Rules

This document specifies the UI/UX architecture and exact implementation for the Bangladesh Real Estate ERP, adhering strictly to the user's mandatory layout, styling, and component rules:

1. **Zero Hardcoded Dropdowns**: All select menus fetch from the dynamic lookup API (`/api/v1/lookups/{category_code}`).
2. **Searchable Dropdowns with Inline `+ Add New`**: Every dropdown features typeahead search and an inline action button allowing users to create a new item on-the-fly without navigating away.
3. **100% Reusable Custom Components**: All form controls, tables, buttons, cards, and modals are built as modular, customizable Angular standalone components.
4. **Global Theme Tokens**: Unified CSS variables drive the entire color palette.
5. **Tailwind CSS & Lucide Icons**: Modern, responsive styling with clean vector iconography.
6. **Unified Spacing & Card Container**: Equal proportional gap (`p-6` / `gap-6`) between Topbar, Sidebar, and the central workspace. All center/right content resides inside a unified **Card Container**.
7. **Uniform Border & Radius Standard**:
   - **Border**: Uniform `border border-slate-200 dark:border-slate-800`.
   - **Container Radius**: Uniform `rounded-xl` for cards, modals, tables, and drawers.
   - **Control Radius**: Uniform `rounded-lg` for inputs, buttons, and badges.

---

## 2. Global Theme Tokens (`styles.css` & `tailwind.config.js`)

```css
/* src/styles.css - Global CSS Custom Variables */
:root {
  /* Brand Luxury Real Estate Palette */
  --color-primary: #0f766e;        /* Deep Teal 700 */
  --color-primary-hover: #115e59;  /* Deep Teal 800 */
  --color-primary-light: #ccfbf1;  /* Teal 100 */
  --color-primary-focus: rgba(15, 118, 110, 0.25);
  
  --color-secondary: #1e293b;      /* Slate 800 */
  --color-accent: #d97706;         /* Amber 600 (Real Estate Gold/Warmth) */
  
  /* Neutral Surfaces & Backgrounds */
  --color-bg-app: #f8fafc;         /* Slate 50 */
  --color-bg-card: #ffffff;        /* Pure White */
  --color-bg-sidebar: #0f172a;     /* Deep Slate 900 */
  
  /* Text */
  --color-text-main: #0f172a;      /* Slate 900 */
  --color-text-muted: #64748b;     /* Slate 500 */
  
  /* Uniform Border & Radius Standards */
  --color-border-standard: #e2e8f0;/* Slate 200 */
  --radius-container: 0.75rem;     /* 12px / rounded-xl */
  --radius-control: 0.5rem;        /* 8px / rounded-lg */
}

.dark {
  --color-bg-app: #090d16;
  --color-bg-card: #0f172a;
  --color-text-main: #f8fafc;
  --color-text-muted: #94a3b8;
  --color-border-standard: #1e293b;
}
```

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        surface: {
          app: 'var(--color-bg-app)',
          card: 'var(--color-bg-card)',
          sidebar: 'var(--color-bg-sidebar)'
        }
      },
      borderRadius: {
        'container': 'var(--radius-container)',
        'control': 'var(--radius-control)'
      }
    },
  },
  plugins: [],
}
```

---

## 3. Shell Layout Specification (Equal Gap & Unified Card Container)

```html
<!-- src/app/layouts/admin-layout.component.html -->
<div class="flex h-screen w-screen overflow-hidden bg-[var(--color-bg-app)]">
  
  <!-- Left Multi-Level Sidebar -->
  <aside class="w-72 flex-shrink-0 bg-[var(--color-bg-sidebar)] text-slate-300 flex flex-col z-20 shadow-lg">
    <app-sidebar></app-sidebar>
  </aside>

  <!-- Right Master Work Area with Equal Gap -->
  <div class="flex flex-1 flex-col overflow-hidden p-6 gap-6">
    
    <!-- Topbar Component: Project Selector, Global Search, Notifications, Profile -->
    <header class="h-16 flex-shrink-0 bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl px-6 flex items-center justify-between shadow-sm">
      <app-topbar></app-topbar>
    </header>

    <!-- Main Viewport: The Unified Center/Right Card Container -->
    <main class="flex-1 overflow-y-auto bg-[var(--color-bg-card)] border border-[var(--color-border-standard)] rounded-xl p-6 shadow-sm flex flex-col relative">
      <!-- Breadcrumb Bar -->
      <app-breadcrumb class="mb-4 flex-shrink-0"></app-breadcrumb>
      
      <!-- Routed Module Component Loaded Here -->
      <div class="flex-1">
        <router-outlet></router-outlet>
      </div>
    </main>

  </div>
</div>
```

---

## 4. Reusable Custom Component: Dynamic Searchable Dropdown with Inline `+ Add New`

This component completely fulfills Requirement 1 & 2: dynamic loading from API, instant search filtering, keyboard navigation, and an inline `+ Add New` button that triggers a creation dialog and selects the created record without leaving the form.

```typescript
// src/app/shared/components/searchable-select/searchable-select.component.ts
import { Component, Input, Output, EventEmitter, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Search, Plus, ChevronDown, Check, Loader2 } from 'lucide-angular';

export interface LookupItem {
  id: number | string;
  item_code: string;
  item_name_en: string;
  item_name_bn: string;
  color_badge?: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="relative w-full text-left">
      <!-- Field Label -->
      <label *ngIf="label" class="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
        {{ label }} <span *ngIf="required" class="text-rose-500">*</span>
      </label>

      <!-- Selection Trigger Button -->
      <button
        type="button"
        (click)="toggleDropdown()"
        [disabled]="disabled || isLoading()"
        class="w-full flex items-center justify-between h-10 px-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
        
        <span class="truncate" *ngIf="selectedItem(); else placeholderTpl">
          <span *ngIf="selectedItem()?.color_badge" class="inline-block w-2.5 h-2.5 rounded-full mr-2" [style.backgroundColor]="selectedItem()?.color_badge"></span>
          {{ selectedItem()?.item_name_en }} ({{ selectedItem()?.item_name_bn }})
        </span>
        <ng-template #placeholderTpl>
          <span class="text-slate-400">{{ placeholder }}</span>
        </ng-template>

        <span class="flex items-center ml-2 text-slate-400">
          <i-lucide *ngIf="isLoading()" name="loader-2" class="w-4 h-4 animate-spin text-teal-600"></i-lucide>
          <i-lucide *ngIf="!isLoading()" name="chevron-down" class="w-4 h-4 transition-transform duration-200" [class.rotate-180]="isOpen()"></i-lucide>
        </span>
      </button>

      <!-- Dropdown Floating Menu -->
      <div
        *ngIf="isOpen()"
        class="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Search Input Box -->
        <div class="p-2 border-b border-slate-100 dark:border-slate-800">
          <div class="relative flex items-center">
            <i-lucide name="search" class="w-4 h-4 absolute left-2.5 text-slate-400"></i-lucide>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (click)="$event.stopPropagation()"
              placeholder="Search or filter..."
              class="w-full h-8 pl-8 pr-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-teal-500" />
          </div>
        </div>

        <!-- Filtered Options List -->
        <div class="max-h-56 overflow-y-auto py-1">
          <div
            *ngFor="let item of filteredItems()"
            (click)="selectItem(item)"
            class="px-3.5 py-2 text-xs flex items-center justify-between cursor-pointer hover:bg-teal-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition">
            <div class="flex items-center space-x-2 truncate">
              <span *ngIf="item.color_badge" class="w-2 h-2 rounded-full" [style.backgroundColor]="item.color_badge"></span>
              <span class="font-medium">{{ item.item_name_en }}</span>
              <span class="text-slate-400 text-[11px]">({{ item.item_name_bn }})</span>
            </div>
            <i-lucide *ngIf="selectedId === item.id" name="check" class="w-3.5 h-3.5 text-teal-600 flex-shrink-0"></i-lucide>
          </div>

          <div *ngIf="filteredItems().length === 0" class="px-3.5 py-4 text-xs text-center text-slate-400">
            No items found matching "{{ searchQuery }}"
          </div>
        </div>

        <!-- Inline "+ Add New" Quick-Create Footer (Requirement 2) -->
        <div *ngIf="allowCreateNew" class="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            (click)="openQuickCreateModal()"
            class="w-full flex items-center justify-center space-x-1.5 h-8 px-3 bg-white dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-700 border border-dashed border-teal-500/40 rounded-lg text-xs font-medium text-teal-600 dark:text-teal-400 transition">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide>
            <span>+ Add New {{ label || 'Item' }}</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class SearchableSelectComponent implements OnInit {
  @Input() categoryCode!: string; // e.g. 'UNIT_FACING', 'MOUZA_SURVEY_TYPE'
  @Input() label: string = '';
  @Input() placeholder: string = 'Select an option...';
  @Input() required: boolean = false;
  @Input() disabled: boolean = false;
  @Input() allowCreateNew: boolean = true;
  @Input() selectedId: number | string | null = null;
  @Output() selectionChange = new EventEmitter<LookupItem>();
  @Output() triggerCreateNew = new EventEmitter<string>();

  isOpen = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  items = signal<LookupItem[]>([]);
  searchQuery: string = '';

  filteredItems = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.items();
    return this.items().filter(item => 
      item.item_name_en.toLowerCase().includes(q) || 
      item.item_name_bn.includes(q)
    );
  });

  selectedItem = computed(() => {
    return this.items().find(i => i.id === this.selectedId) || null;
  });

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.categoryCode) {
      this.fetchCategoryItems();
    }
  }

  fetchCategoryItems(): void {
    this.isLoading.set(true);
    this.http.get<{ data: LookupItem[] }>(`/api/v1/lookups/${this.categoryCode}`)
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
  }

  toggleDropdown(): void {
    this.isOpen.set(!this.isOpen());
  }

  selectItem(item: LookupItem): void {
    this.selectedId = item.id;
    this.selectionChange.emit(item);
    this.isOpen.set(false);
  }

  openQuickCreateModal(): void {
    this.isOpen.set(false);
    this.triggerCreateNew.emit(this.categoryCode);
  }
}
```

---

## 5. Reusable Component Standard: Inputs, Buttons & Data Table

### Reusable `<app-button>`
- Supports Variants: `primary`, `secondary`, `outline`, `ghost`, `danger`.
- Props: `[variant]`, `[size]`, `[isLoading]`, `[disabled]`, `[icon]`.
- Enforces `rounded-lg` and uniform transition effects.

### Reusable `<app-data-table>`
- Features:
  - Server-side sorting, pagination, and multi-column filtering.
  - Column selector drawer (show/hide columns).
  - Bulk row action bar (Export selected, Bulk status change).
  - Built-in empty state and skeleton loaders.
  - Clean `rounded-xl border border-slate-200 dark:border-slate-800` styling.
