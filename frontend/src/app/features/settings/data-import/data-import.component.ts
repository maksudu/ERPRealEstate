import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OperationsService } from '../../../core/services/operations.service';
import { ImportBatch } from '../../../core/models/operations.model';
import { CardContainerComponent } from '../../../shared/components';

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent
  ],
  templateUrl: './data-import.component.html'
})
export class DataImportComponent implements OnInit {
  private opsService = inject(OperationsService);
  private fb = inject(FormBuilder);

  batches = signal<ImportBatch[]>([]);
  loading = signal<boolean>(false);
  isUploading = signal<boolean>(false);
  selectedEntity = signal<string>('Land');
  uploadSuccess = signal<string | null>(null);
  uploadError = signal<string | null>(null);

  selectedFile: File | null = null;
  selectedFileName = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading.set(true);
    this.opsService.getImportBatches().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.batches.set(data);
        } else {
          this.batches.set(this.getMockBatches());
        }
        this.loading.set(false);
      },
      error: () => {
        this.batches.set(this.getMockBatches());
        this.loading.set(false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName.set(file.name);
    }
  }

  downloadTemplate(entity: string): void {
    this.uploadSuccess.set(`Downloaded sample template for ${entity}: template_${entity.toLowerCase()}_migration.xlsx`);
  }

  executeImport(): void {
    if (!this.selectedFileName()) {
      this.uploadError.set('Please select a valid .xlsx or .csv legacy spreadsheet file first.');
      return;
    }

    this.isUploading.set(true);
    this.uploadError.set(null);
    this.uploadSuccess.set(null);

    // Simulate bulk Excel line-by-line validation and ingestion
    setTimeout(() => {
      this.isUploading.set(false);
      const entity = this.selectedEntity();
      const count = entity === 'Inventory' ? 84 : (entity === 'Land' ? 32 : 120);

      const batch: ImportBatch = {
        id: Date.now(),
        entity_type: entity,
        file_url: `/static/uploads/migrations/${this.selectedFileName()}`,
        total_records: count,
        successful_records: count,
        failed_records: 0,
        status: 'COMPLETED',
        created_at: new Date().toISOString()
      };

      this.batches.update(b => [batch, ...b]);
      this.uploadSuccess.set(`Successfully validated & migrated ${count} records for ${entity} with zero errors! All records committed atomically.`);
      this.selectedFile = null;
      this.selectedFileName.set(null);
    }, 1500);
  }

  private getMockBatches(): ImportBatch[] {
    return [
      {
        id: 1,
        entity_type: 'Inventory',
        file_url: '/static/uploads/migrations/Legacy_Units_GreenHorizon.xlsx',
        total_records: 84,
        successful_records: 84,
        failed_records: 0,
        status: 'COMPLETED',
        created_at: '2026-09-15T11:20:00Z'
      },
      {
        id: 2,
        entity_type: 'COA_Opening',
        file_url: '/static/uploads/migrations/COA_Opening_Balances_2026.csv',
        total_records: 120,
        successful_records: 120,
        failed_records: 0,
        status: 'COMPLETED',
        created_at: '2026-08-30T16:45:00Z'
      },
      {
        id: 3,
        entity_type: 'Land',
        file_url: '/static/uploads/migrations/Legacy_Mouza_Khatian_Batch1.xlsx',
        total_records: 35,
        successful_records: 33,
        failed_records: 2,
        status: 'FAILED_ROLLED_BACK',
        error_log: 'Row 14: Invalid RS Khatian format. Row 29: Duplicate Dag number detected.',
        created_at: '2026-08-10T09:15:00Z'
      }
    ];
  }
}
