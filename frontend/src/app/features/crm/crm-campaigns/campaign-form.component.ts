import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { CampaignCreate } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-campaign-form',
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
  templateUrl: './campaign-form.component.html'
})
export class CampaignFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Dynamic Lookup Category Codes (Rule 1 & 2)
  readonly LOOKUP = {
    campaignChannel: 'CRM_CAMPAIGN_CHANNEL',
    campaignStatus: 'CRM_CAMPAIGN_STATUS'
  };

  campaignId = signal<number | null>(null);
  isEditMode = computed(() => this.campaignId() !== null);
  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  projects = signal<Project[]>([]);
  projectOptions = computed(() => [
    { label: 'All Projects (Corporate Brand Campaign)', value: '' },
    ...this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      value: p.id
    }))
  ]);

  campaignForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    channel: ['FACEBOOK', Validators.required],
    project_id: [''],
    target_audience: [''],
    allocated_budget: [100000, [Validators.required, Validators.min(0)]],
    actual_spend: [0, [Validators.required, Validators.min(0)]],
    target_leads: [100, [Validators.required, Validators.min(0)]],
    utm_source: ['facebook'],
    utm_medium: ['paid_social'],
    utm_campaign: [''],
    utm_content: [''],
    utm_term: [''],
    landing_page_slug: [''],
    start_date: [''],
    end_date: [''],
    status: ['ACTIVE', Validators.required],
    notes: ['']
  });

  // Dynamic preview of the tracking URL
  generatedTrackingUrl = computed(() => {
    const f = this.campaignForm.value;
    const slug = f.landing_page_slug ? f.landing_page_slug.trim() : 'inquiry';
    const params: string[] = [];

    if (f.utm_source) params.push(`utm_source=${encodeURIComponent(f.utm_source)}`);
    if (f.utm_medium) params.push(`utm_medium=${encodeURIComponent(f.utm_medium)}`);
    if (f.utm_campaign) {
      params.push(`utm_campaign=${encodeURIComponent(f.utm_campaign)}`);
    } else if (f.name) {
      params.push(`utm_campaign=${encodeURIComponent(f.name.toLowerCase().replace(/\s+/g, '_').slice(0, 32))}`);
    }
    if (f.utm_content) params.push(`utm_content=${encodeURIComponent(f.utm_content)}`);
    if (f.utm_term) params.push(`utm_term=${encodeURIComponent(f.utm_term)}`);

    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return `https://blueoceansbd.com/${slug}${query}`;
  });

  ngOnInit(): void {
    this.loadProjects();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.campaignId.set(Number(idParam));
      this.loadCampaign(Number(idParam));
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: () => {}
    });
  }

  loadCampaign(id: number): void {
    this.crmService.getCampaign(id).subscribe({
      next: (c) => {
        this.campaignForm.patchValue({
          name: c.name,
          channel: c.channel,
          project_id: c.project_id || '',
          target_audience: c.target_audience || '',
          allocated_budget: c.allocated_budget,
          actual_spend: c.actual_spend,
          target_leads: c.target_leads,
          utm_source: c.utm_source || '',
          utm_medium: c.utm_medium || '',
          utm_campaign: c.utm_campaign || '',
          utm_content: c.utm_content || '',
          utm_term: c.utm_term || '',
          landing_page_slug: c.landing_page_slug || '',
          start_date: c.start_date || '',
          end_date: c.end_date || '',
          status: c.status,
          notes: c.notes || ''
        });
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to load campaign');
      }
    });
  }

  onSubmit(): void {
    if (this.campaignForm.invalid) {
      this.campaignForm.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields marked with *');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const f = this.campaignForm.value;
    const payload: CampaignCreate = {
      name: f.name,
      channel: f.channel,
      project_id: f.project_id ? Number(f.project_id) : undefined,
      target_audience: f.target_audience || undefined,
      allocated_budget: Number(f.allocated_budget),
      actual_spend: Number(f.actual_spend),
      target_leads: Number(f.target_leads),
      utm_source: f.utm_source || undefined,
      utm_medium: f.utm_medium || undefined,
      utm_campaign: f.utm_campaign || undefined,
      utm_content: f.utm_content || undefined,
      utm_term: f.utm_term || undefined,
      tracking_url: this.generatedTrackingUrl(),
      landing_page_slug: f.landing_page_slug || undefined,
      start_date: f.start_date || undefined,
      end_date: f.end_date || undefined,
      status: f.status,
      notes: f.notes || undefined
    };

    const id = this.campaignId();
    if (id) {
      this.crmService.updateCampaign(id, payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/campaigns']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update campaign');
        }
      });
    } else {
      this.crmService.createCampaign(payload).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.router.navigate(['/crm/campaigns']);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create campaign');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/crm/campaigns']);
  }
}
