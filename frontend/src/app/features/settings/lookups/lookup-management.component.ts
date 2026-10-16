import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LookupService } from '../../../core/services/lookup.service';
import { LookupCategory, LookupItem } from '../../../core/models/lookup.model';
import { 
  SearchableSelectComponent, 
  CardContainerComponent, 
  CustomInputComponent, 
  CustomTextareaComponent,
  CustomButtonComponent,
  CustomTabsComponent,
  CustomTableComponent,
  TableColumn,
  TabItem
} from '../../../shared/components';

@Component({
  selector: 'app-lookup-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SearchableSelectComponent,
    CardContainerComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    CustomTabsComponent,
    CustomTableComponent
  ],
  templateUrl: './lookup-management.component.html'
})
export class LookupManagementComponent implements OnInit {
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);

  // Active Tab: 'showcase' (Live Dynamic Dropdown Sandbox) | 'management' (Settings Matrix)
  activeTab = signal<string>('management');
  tabs: TabItem[] = [
    { id: 'management', label: 'Manage Dropdown Options' },
    { id: 'showcase', label: 'Preview in a Form' }
  ];

  // Demo Reactive Form utilizing <app-searchable-select>
  demoForm: FormGroup = this.fb.group({
    project_authority: ['RAJUK', Validators.required],
    land_survey_type: ['RS', Validators.required],
    land_class: ['BHITI', Validators.required],
    unit_facing: ['SOUTH_FACING', Validators.required],
    unit_status: ['AVAILABLE', Validators.required],
    payment_mode: ['PAY_ORDER', Validators.required],
    notes: ['']
  });

  // Settings State
  categories = signal<LookupCategory[]>([]);
  selectedCategory = signal<LookupCategory | null>(null);
  selectedCategoryItems = signal<LookupItem[]>([]);
  isLoadingCategories = signal<boolean>(false);
  isLoadingItems = signal<boolean>(false);

  // New Category Creation Modal
  isNewCatModalOpen = signal<boolean>(false);
  newCatCode = signal<string>('');
  newCatName = signal<string>('');
  newCatDesc = signal<string>('');
  catCreateError = signal<string | null>(null);
  isSavingCat = signal<boolean>(false);

  // Table Columns
  tableColumns: TableColumn[] = [
    { field: 'code', header: 'Item Code', width: '25%' },
    { field: 'name_en', header: 'English Name', width: '30%' },
    { field: 'name_bn', header: 'Bangla Name (বাংলা)', width: '25%' },
    { field: 'badge', header: 'Badge', width: '10%', align: 'center' },
    { field: 'status', header: 'Status', width: '10%', align: 'center' }
  ];

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoadingCategories.set(true);
    this.lookupService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        if (data.length > 0 && !this.selectedCategory()) {
          this.selectCategory(data[0]);
        }
        this.isLoadingCategories.set(false);
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.isLoadingCategories.set(false);
      }
    });
  }

  selectCategory(category: LookupCategory): void {
    this.selectedCategory.set(category);
    this.isLoadingItems.set(true);
    this.lookupService.getItems(category.category_code, true).subscribe({
      next: (items) => {
        this.selectedCategoryItems.set(items);
        this.isLoadingItems.set(false);
      },
      error: () => this.isLoadingItems.set(false)
    });
  }

  openNewCategoryModal(): void {
    this.newCatCode.set('');
    this.newCatName.set('');
    this.newCatDesc.set('');
    this.catCreateError.set(null);
    this.isNewCatModalOpen.set(true);
  }

  closeNewCategoryModal(): void {
    this.isNewCatModalOpen.set(false);
  }

  saveNewCategory(): void {
    const code = this.newCatCode().trim().toUpperCase();
    const name = this.newCatName().trim();
    if (!code || !name) {
      this.catCreateError.set('Category code and name are required.');
      return;
    }

    this.isSavingCat.set(true);
    this.catCreateError.set(null);

    this.lookupService.createCategory({
      category_code: code,
      category_name: name,
      description: this.newCatDesc().trim() || undefined
    }).subscribe({
      next: (created) => {
        this.categories.update(list => [...list, created]);
        this.selectCategory(created);
        this.isSavingCat.set(false);
        this.closeNewCategoryModal();
      },
      error: (err) => {
        this.catCreateError.set(err?.error?.detail || 'Failed to create category.');
        this.isSavingCat.set(false);
      }
    });
  }

  onFormSubmit(): void {
    console.log('Submitted Demo Form Values:', this.demoForm.value);
  }
}
