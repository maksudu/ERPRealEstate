import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LegalArea, LegalRecord, LEGAL_AREA_LABELS } from '../../core/models/legal.model';
import { LegalService } from '../../core/services/legal.service';
import { CardContainerComponent, CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent } from '../../shared/components';
import { LEGAL_RECORD_FIELDS, LegalField } from './legal-record-fields';

@Component({
  selector: 'app-legal-record-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent, CustomButtonComponent, CustomInputComponent, CustomTextareaComponent, SearchableSelectComponent],
  templateUrl: './legal-record-form.component.html'
})
export class LegalRecordFormComponent implements OnInit {
  private legalService = inject(LegalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  area!: LegalArea;
  recordId: number | null = null;
  fields: LegalField[] = [];
  data: Record<string, any> = {};
  base: { title: string; reference_no: string; project_id: string | number | null; status: string; due_date: string } = {
    title: '', reference_no: '', project_id: null, status: '', due_date: ''
  };
  isLoading = false;
  isSaving = false;
  isReadOnly = false;
  error = '';
  readonly labels = LEGAL_AREA_LABELS;

  get pageTitle(): string {
    return this.isReadOnly ? 'Record details' : this.recordId ? 'Edit record' : 'New record';
  }

  ngOnInit(): void {
    const areaParam = this.route.snapshot.paramMap.get('area') as LegalArea;
    if (!areaParam || !(areaParam in LEGAL_RECORD_FIELDS)) {
      this.router.navigateByUrl('/legal/dashboard');
      return;
    }
    this.area = areaParam;
    this.fields = LEGAL_RECORD_FIELDS[this.area];
    this.recordId = Number(this.route.snapshot.paramMap.get('id')) || null;
    this.isReadOnly = !!this.recordId && !this.route.snapshot.url.some(segment => segment.path === 'edit');
    this.data = Object.fromEntries(this.fields.map(field => [field.key, field.type === 'checkbox' ? false : '']));
    if (this.recordId) this.loadRecord();
  }

  private loadRecord(): void {
    this.isLoading = true;
    this.legalService.getRecord(this.recordId!).subscribe({
      next: record => {
        if (record.area !== this.area) {
          this.router.navigate(['/legal/records', record.area, record.id]);
          return;
        }
        this.base = {
          title: record.title,
          reference_no: record.reference_no || '',
          project_id: record.project_id ?? null,
          status: record.status || '',
          due_date: record.due_date || ''
        };
        this.data = { ...this.data, ...(record.data || {}) };
        if (Array.isArray(this.data['conditions'])) {
          this.data['conditions'] = this.data['conditions']
            .map((condition: any) => `${condition.owner || ''} | ${condition.deadline || ''} | ${condition.description || ''}`)
            .join('\n');
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'This record could not be loaded. It may have been removed or access is restricted.';
        this.isLoading = false;
      }
    });
  }

  fieldLabel(field: LegalField): string {
    return field.label;
  }

  save(): void {
    if (this.isReadOnly || this.isSaving) return;
    if (!this.base.title.trim()) {
      this.error = 'A record title is required.';
      return;
    }
    const payloadData: Record<string, any> = { ...this.data };
    if (typeof payloadData['conditions'] === 'string') {
      payloadData['conditions'] = payloadData['conditions'].split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string) => {
          const [owner = '', deadline = '', ...description] = line.split('|').map((part: string) => part.trim());
          return { owner, deadline, description: description.join(' | ') };
        });
    }
    this.fields.forEach(field => {
      if (payloadData[field.key] === '') delete payloadData[field.key];
    });
    const payload: Partial<LegalRecord> = {
      area: this.area,
      title: this.base.title.trim(),
      reference_no: this.base.reference_no.trim() || null,
      project_id: this.base.project_id === '' || this.base.project_id === null ? null : Number(this.base.project_id),
      status: this.base.status || null,
      due_date: this.base.due_date || null,
      data: payloadData
    };
    this.error = '';
    this.isSaving = true;
    const request = this.recordId
      ? this.legalService.updateRecord(this.recordId, payload)
      : this.legalService.createRecord(payload);
    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/legal/records', this.area]);
      },
      error: err => {
        this.isSaving = false;
        this.error = err?.error?.detail || 'The record could not be saved.';
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/legal/records', this.area]);
  }

  edit(): void {
    if (this.recordId) this.router.navigate(['/legal/records', this.area, this.recordId, 'edit']);
  }
}
