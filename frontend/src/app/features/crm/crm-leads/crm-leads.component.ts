import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Lead, LeadActivity, LeadConversionMetrics } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-crm-leads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './crm-leads.component.html'
})
export class CrmLeadsComponent implements OnInit {
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  leads = signal<Lead[]>([]);
  projects = signal<Project[]>([]);
  metrics = signal<LeadConversionMetrics | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Search & Filter
  searchQuery = signal<string>('');

  // Modals
  isCreateModalOpen = signal<boolean>(false);
  isActivityModalOpen = signal<boolean>(false);
  isWebhookTestModalOpen = signal<boolean>(false);
  selectedLeadForActivity = signal<Lead | null>(null);

  // Kanban Columns
  readonly stages = [
    { key: 'NEW', title: 'New Leads', color: 'border-blue-500/60 bg-blue-500/10 text-blue-500' },
    { key: 'CONTACTED', title: 'Contacted', color: 'border-amber-500/60 bg-amber-500/10 text-amber-500' },
    { key: 'VISITED', title: 'Site Visited', color: 'border-purple-500/60 bg-purple-500/10 text-purple-500' },
    { key: 'NEGOTIATION', title: 'Negotiation', color: 'border-orange-500/60 bg-orange-500/10 text-orange-500' },
    { key: 'BOOKED', title: 'Booked / Won', color: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500' },
    { key: 'DROPPED', title: 'Dropped', color: 'border-slate-500/60 bg-slate-500/10 text-slate-400' }
  ];

  // Forms
  leadForm: FormGroup = this.fb.group({
    lead_name: ['', Validators.required],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    email: ['', [Validators.email]],
    lead_source_id: ['FACEBOOK_ADS', Validators.required],
    interested_project_id: [null],
    budget_range_min: [10000000],
    budget_range_max: [25000000],
    notes: ['']
  });

  activityForm: FormGroup = this.fb.group({
    activity_type: ['PHONE_CALL', Validators.required],
    activity_summary: ['', Validators.required],
    scheduled_at: [''],
    outcome: ['INTERESTED', Validators.required]
  });

  webhookForm: FormGroup = this.fb.group({
    lead_name: ['Farhana Rahman (FB Ad Lead)', Validators.required],
    phone_number: ['+8801722334455', Validators.required],
    email: ['farhana.rahman@outlook.com'],
    campaign_name: ['Facebook-Luxury-Gulshan-Q4', Validators.required],
    interested_project_code: ['PRJ-GULSHAN-01']
  });

  // Dynamic Lookup options for searchable select
  leadSourceOptions = [
    { value: 'FACEBOOK_ADS', label: 'Facebook Lead Ads' },
    { value: 'WHATSAPP', label: 'WhatsApp Direct Chat' },
    { value: 'WEB_FORM', label: 'Website Inquiry Form' },
    { value: 'WALK_IN', label: 'Direct Walk-in' },
    { value: 'BROKER', label: 'Authorized Broker' }
  ];

  activityTypeOptions = [
    { value: 'PHONE_CALL', label: 'Phone Call / Tele-calling' },
    { value: 'SITE_VISIT', label: 'Physical Site Inspection' },
    { value: 'WHATSAPP', label: 'WhatsApp Message / Presentation' },
    { value: 'OFFICE_MEETING', label: 'Boardroom / In-Person Meeting' }
  ];

  activityOutcomeOptions = [
    { value: 'INTERESTED', label: 'Positive Interest / Follow Up Needed' },
    { value: 'VISITED_POSITIVE', label: 'Site Visited & Shortlisted Flat' },
    { value: 'RESCHEDULED', label: 'Client Asked to Call Later' },
    { value: 'BUSY', label: 'Did Not Answer / Busy' },
    { value: 'AGREED_ON_TERMS', label: 'Price & Payment Schedule Agreed' }
  ];

  ngOnInit(): void {
    this.loadData();
    this.loadProjects();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.crmService.getLeads().subscribe({
      next: (res) => {
        this.leads.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });

    this.crmService.getConversionMetrics().subscribe({
      next: (m) => this.metrics.set(m),
      error: () => {}
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: () => {}
    });
  }

  get projectOptions() {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }));
  }

  getLeadsForStage(stage: string): Lead[] {
    const q = this.searchQuery().toLowerCase().trim();
    return this.leads().filter(l => {
      const matchesStage = l.lead_stage === stage;
      if (!matchesStage) return false;
      if (!q) return true;
      return (
        l.lead_name.toLowerCase().includes(q) ||
        l.primary_phone.includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.interested_project_name && l.interested_project_name.toLowerCase().includes(q))
      );
    });
  }

  // Kanban Stage Shift
  moveToStage(lead: Lead, newStage: string): void {
    if (lead.lead_stage === newStage) return;
    this.crmService.updateLeadStage(lead.id, newStage).subscribe({
      next: (updated) => {
        this.leads.update(current => 
          current.map(l => l.id === updated.id ? { ...l, lead_stage: updated.lead_stage, lead_score: updated.lead_score } : l)
        );
        this.crmService.getConversionMetrics().subscribe(m => this.metrics.set(m));
      }
    });
  }

  openCreateModal(): void {
    this.leadForm.reset({
      lead_name: '',
      primary_phone: '',
      email: '',
      lead_source_id: 'FACEBOOK_ADS',
      budget_range_min: 10000000,
      budget_range_max: 25000000,
      notes: ''
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  submitLead(): void {
    if (this.leadForm.invalid) return;
    this.isSubmitting.set(true);
    this.crmService.createLead(this.leadForm.value).subscribe({
      next: (created) => {
        this.leads.update(current => [created, ...current]);
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.crmService.getConversionMetrics().subscribe(m => this.metrics.set(m));
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // Call / Site Visit Logger
  openActivityModal(lead: Lead): void {
    this.selectedLeadForActivity.set(lead);
    this.activityForm.reset({
      activity_type: 'PHONE_CALL',
      activity_summary: '',
      scheduled_at: '',
      outcome: 'INTERESTED'
    });
    this.isActivityModalOpen.set(true);
  }

  closeActivityModal(): void {
    this.isActivityModalOpen.set(false);
    this.selectedLeadForActivity.set(null);
  }

  submitActivity(): void {
    const lead = this.selectedLeadForActivity();
    if (!lead || this.activityForm.invalid) return;

    this.isSubmitting.set(true);
    this.crmService.logLeadActivity(lead.id, this.activityForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeActivityModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  // Facebook Webhook Simulation
  openWebhookModal(): void {
    this.isWebhookTestModalOpen.set(true);
  }

  closeWebhookModal(): void {
    this.isWebhookTestModalOpen.set(false);
  }

  triggerFacebookWebhook(): void {
    if (this.webhookForm.invalid) return;
    this.isSubmitting.set(true);
    this.crmService.simulateFacebookLead(this.webhookForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeWebhookModal();
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }
}
