import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { Campaign, OfflineExhibitionLeadItem, OfflineExhibitionImportPayload } from '../../../core/models/crm.model';

@Component({
  selector: 'app-campaign-import',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './campaign-import.component.html'
})
export class CampaignImportComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  campaigns = signal<Campaign[]>([]);
  campaignOptions = computed(() =>
    this.campaigns().map(c => ({
      label: `${c.campaign_code} - ${c.name} (${c.channel})`,
      value: c.id
    }))
  );

  parsedLeads = signal<OfflineExhibitionLeadItem[]>([
    { lead_name: '', primary_phone: '', email: '', budget_range_max: 20000000, notes: '' }
  ]);

  importForm: FormGroup = this.fb.group({
    campaign_id: [null, Validators.required],
    channel: ['EXHIBITION', Validators.required],
    pasted_csv: ['']
  });

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.crmService.getCampaigns({ limit: 100 }).subscribe({
      next: (res) => {
        this.campaigns.set(res.items || []);
        if (res.items && res.items.length > 0) {
          this.importForm.patchValue({ campaign_id: res.items[0].id });
        }
      },
      error: () => {}
    });
  }

  addRow(): void {
    this.parsedLeads.update(list => [
      ...list,
      { lead_name: '', primary_phone: '', email: '', budget_range_max: 20000000, notes: '' }
    ]);
  }

  removeRow(index: number): void {
    this.parsedLeads.update(list => list.filter((_, i) => i !== index));
  }

  updateLead(index: number, field: keyof OfflineExhibitionLeadItem, value: any): void {
    this.parsedLeads.update(list => {
      const copy = [...list];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  parsePastedCsv(): void {
    const raw = this.importForm.get('pasted_csv')?.value;
    if (!raw || !raw.trim()) return;

    const lines = raw.trim().split(/\r?\n/);
    const newItems: OfflineExhibitionLeadItem[] = [];

    for (const line of lines) {
      // Split by tab or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        const name = parts[0]?.trim();
        const phone = parts[1]?.trim();
        const email = parts[2]?.trim() || '';
        const budget = parts[3] ? Number(parts[3].replace(/[^0-9.]/g, '')) : undefined;
        const notes = parts[4]?.trim() || 'Imported from exhibition inquiry sheet';

        if (name && phone) {
          newItems.push({
            lead_name: name,
            primary_phone: phone,
            email: email || undefined,
            budget_range_max: budget,
            notes: notes
          });
        }
      }
    }

    if (newItems.length > 0) {
      this.parsedLeads.set(newItems);
      this.successMessage.set(`Successfully parsed ${newItems.length} leads from spreadsheet paste!`);
      this.importForm.patchValue({ pasted_csv: '' });
    } else {
      this.errorMessage.set('Could not parse leads. Ensure format is: Name, Phone, Email, Budget, Notes');
    }
  }

  onSubmit(): void {
    if (this.importForm.invalid) {
      this.importForm.markAllAsTouched();
      this.errorMessage.set('Please select an active target campaign.');
      return;
    }

    const validLeads = this.parsedLeads().filter(l => l.lead_name?.trim() && l.primary_phone?.trim());
    if (validLeads.length === 0) {
      this.errorMessage.set('Please provide at least one valid lead with Name and Phone number.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.importForm.value;
    const payload: OfflineExhibitionImportPayload = {
      campaign_id: Number(formVal.campaign_id),
      channel: formVal.channel || 'EXHIBITION',
      leads: validLeads
    };

    this.crmService.importOfflineExhibitionLeads(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        alert(res?.message || 'Leads imported successfully!');
        this.router.navigate(['/crm/campaigns']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to import offline exhibition leads');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/crm/campaigns']);
  }
}
