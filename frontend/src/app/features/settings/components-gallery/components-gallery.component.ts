import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  StatusBadgeComponent,
  ModalComponent,
  DrawerComponent,
  DataTableComponent,
  DataTableColumn,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-components-gallery',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    StatusBadgeComponent,
    ModalComponent,
    DrawerComponent,
    DataTableComponent,
    SearchableSelectComponent
  ],
  templateUrl: './components-gallery.component.html'
})
export class ComponentsGalleryComponent {
  // Demo Input States
  demoText = signal<string>('Gulshan Luxury Condominium');
  demoNumber = signal<string>('720');
  demoNotes = signal<string>('Standard deed execution scheduled after full installment settlement.');
  isBtnLoading = signal<boolean>(false);

  // Modal & Drawer States
  isModalOpen = signal<boolean>(false);
  isDrawerOpen = signal<boolean>(false);

  // Sample Table Columns for <app-data-table>
  sampleColumns: DataTableColumn[] = [
    { field: 'id', header: 'ID', width: '8%', sortable: true },
    { field: 'title', header: 'Property / Unit', width: '25%', sortable: true },
    { field: 'type', header: 'Survey / Class', width: '15%', sortable: true },
    { field: 'area', header: 'Area (Katha/SqFt)', width: '18%', align: 'right', sortable: true },
    { field: 'price', header: 'Price (BDT)', width: '18%', align: 'right', sortable: true },
    { field: 'status', header: 'Status', width: '16%', align: 'center', sortable: true }
  ];

  // Sample Data for Table
  sampleData = [
    { id: 101, title: 'Suite 12-A, Grand Emerald', type: 'Residential Flat', area: '2,450 SqFt', price: '৳ 3,67,50,000', status: 'Available' },
    { id: 102, title: 'Suite 12-B, Grand Emerald', type: 'Residential Flat', area: '2,180 SqFt', price: '৳ 3,27,00,000', status: 'Booked' },
    { id: 103, title: 'Penthouse 18, Emerald Crest', type: 'Duplex Penthouse', area: '4,600 SqFt', price: '৳ 7,82,00,000', status: 'Sold' },
    { id: 104, title: 'Plot #42, Block-G, Bashundhara', type: 'Bhiti Land', area: '5.00 Katha', price: '৳ 4,50,00,000', status: 'Available' },
    { id: 105, title: 'Commercial Space, Fl-3, Bay Marina', type: 'Commercial Floor', area: '3,800 SqFt', price: '৳ 6,08,00,000', status: 'On-Hold' },
    { id: 106, title: 'Suite 8-C, Horizon Bay', type: 'South-Facing Flat', area: '1,950 SqFt', price: '৳ 2,92,50,000', status: 'Available' },
    { id: 107, title: 'Plot #11, Block-D, Purbachal', type: 'Nal Land (High)', area: '10.00 Katha', price: '৳ 8,00,00,000', status: 'Booked' },
    { id: 108, title: 'Suite 14-D, Grand Emerald', type: 'Lake-View Flat', area: '2,650 SqFt', price: '৳ 4,24,00,000', status: 'Sold' }
  ];

  triggerLoadingDemo(): void {
    this.isBtnLoading.set(true);
    setTimeout(() => this.isBtnLoading.set(false), 2000);
  }
}
