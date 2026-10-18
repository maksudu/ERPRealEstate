import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import { Lead, LeadActivity, LeadConversionMetrics, LeadScoreBreakdown, PipelineStage } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';
import { LookupItem } from '../../../core/models/lookup.model';
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
  private lookupService = inject(LookupService);
  private fb = inject(FormBuilder);

  leads = signal<Lead[]>([]);
  projects = signal<Project[]>([]);
  lookupSources = signal<LookupItem[]>([]);
  metrics = signal<LeadConversionMetrics | null>(null);
  isLoading = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  // Search & Filter
  searchQuery = signal<string>('');
  selectedProjectFilter = signal<number | null>(null);

  // Modals
  isCreateModalOpen = signal<boolean>(false);
  isActivityModalOpen = signal<boolean>(false);
  isWebhookTestModalOpen = signal<boolean>(false);
  isWebsiteInquiryModalOpen = signal<boolean>(false);
  isScoreModalOpen = signal<boolean>(false);

  selectedLeadForActivity = signal<Lead | null>(null);
  selectedLeadScore = signal<LeadScoreBreakdown | null>(null);

  // Prompt 09: 7-Stage Sales Funnel
  readonly stages: { key: PipelineStage; title: string; color: string; badgeClass: string }[] = [
    { key: 'NEW', title: 'New Leads', color: 'border-blue-500/60 bg-blue-500/10 text-blue-500', badgeClass: 'bg-blue-500/15 text-blue-400' },
    { key: 'CONTACTED', title: 'Contacted', color: 'border-amber-500/60 bg-amber-500/10 text-amber-500', badgeClass: 'bg-amber-500/15 text-amber-400' },
    { key: 'SITE_VISIT_SCHEDULED', title: 'Site Visit Scheduled', color: 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400', badgeClass: 'bg-indigo-500/15 text-indigo-400' },
    { key: 'SITE_VISIT_COMPLETED', title: 'Site Visit Completed', color: 'border-purple-500/60 bg-purple-500/10 text-purple-400', badgeClass: 'bg-purple-500/15 text-purple-400' },
    { key: 'NEGOTIATION', title: 'Negotiation', color: 'border-orange-500/60 bg-orange-500/10 text-orange-400', badgeClass: 'bg-orange-500/15 text-orange-400' },
    { key: 'TOKEN_BOOKED', title: 'Token Booked', color: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-400' },
    { key: 'LOST', title: 'Lost / Dropped', color: 'border-slate-500/60 bg-slate-500/10 text-slate-400', badgeClass: 'bg-slate-500/15 text-slate-400' }
  ];

  // Forms
  leadForm: FormGroup = this.fb.group({
    lead_name: ['', Validators.required],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{10,15}$/)]],
    email: ['', [Validators.email]],
    lead_source_id: ['WALK_IN', Validators.required],
    interested_project_id: [null],
    budget_range_min: [15000000],
    budget_range_max: [25000000],
    notes: ['']
  });

  activityForm: FormGroup = this.fb.group({
    activity_type: ['PHONE_CALL', Validators.required],
    activity_summary: ['', Validators.required],
    scheduled_at: [''],
    outcome: ['INTERESTED', Validators.required]
  });

  facebookWebhookForm: FormGroup = this.fb.group({
    lead_name: ['Barrister Rafiqul Islam (FB Luxury Ad)', Validators.required],
    phone_number: ['+8801711223344', Validators.required],
    email: ['rafiqul.islam@supremecourt.gov.bd'],
    campaign_name: ['Facebook-Luxury-Gulshan-Q4', Validators.required],
    interested_project_code: ['PRJ-GULSHAN-01']
  });

  websiteInquiryForm: FormGroup = this.fb.group({
    full_name: ['Dr. Farzana Choudhury', Validators.required],
    phone_number: ['+8801819334455', Validators.required],
    email: ['farzana.choudhury@evercare.bd', [Validators.email]],
    project_code: ['PRJ-GULSHAN-01'],
    budget_range_min: [18000000],
    budget_range_max: [28000000],
    preferred_unit_type: ['4BHK Duplex'],
    message: ['Looking for South-facing 4-bedroom duplex with 2 car parking bays.'],
    utm_campaign: ['Website-Gulshan-Prelaunch']
  });

  // Dynamic Options
  projectOptions = computed(() =>
    this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`
    }))
  );

  leadSourceOptions = computed(() => {
    if (this.lookupSources().length > 0) {
      return this.lookupSources().map(s => ({
        value: s.item_code,
        label: s.item_name_en
      }));
    }
    return [
      { value: 'FACEBOOK_ADS', label: 'Facebook Lead Ads' },
      { value: 'WEB_FORM', label: 'Website Inquiry Form' },
      { value: 'WALK_IN', label: 'Direct Walk-in' },
      { value: 'WHATSAPP', label: 'WhatsApp Business Chat' },
      { value: 'BROKER', label: 'Authorized Broker' },
      { value: 'REFERRAL', label: 'Client Referral' }
    ];
  });

  activityTypeOptions = [
    { value: 'PHONE_CALL', label: 'Phone Call / Tele-calling' },
    { value: 'SITE_VISIT', label: 'Physical Site Inspection' },
    { value: 'WHATSAPP', label: 'WhatsApp Message / Presentation' },
    { value: 'OFFICE_MEETING', label: 'Corporate Office Meeting' },
    { value: 'DISCOUNT_NEGOTIATION', label: 'Escalated Discount Negotiation' }
  ];

  activityOutcomeOptions = [
    { value: 'INTERESTED', label: 'Positive Interest / Follow Up Needed' },
    { value: 'VISITED_POSITIVE', label: 'Site Visited & Shortlisted Flat' },
    { value: 'RESCHEDULED', label: 'Client Asked to Call Later' },
    { value: 'BUSY', label: 'Did Not Answer / Busy' },
    { value: 'AGREED_ON_TERMS', label: 'Price & Payment Schedule Agreed' }
  ];

  filteredLeads = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const pId = this.selectedProjectFilter();
    return this.leads().filter(l => {
      const matchesSearch = !q ||
        l.lead_name.toLowerCase().includes(q) ||
        l.primary_phone.toLowerCase().includes(q) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.interested_project_name && l.interested_project_name.toLowerCase().includes(q));

      const matchesProject = !pId || l.interested_project_id === pId;
      return matchesSearch && matchesProject;
    });
  });

  ngOnInit(): void {
    this.loadData();
    this.loadProjects();
    this.loadLookups();
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
    this.projectService.getProjects().subscribe(p => this.projects.set(p));
  }

  loadLookups(): void {
    this.lookupService.getItems('CRM_LEAD_SOURCE').subscribe({
      next: (items) => this.lookupSources.set(items),
      error: () => {}
    });
  }

  getLeadsByStage(stageKey: PipelineStage): Lead[] {
    return this.filteredLeads().filter(l => {
      const st = l.lead_stage;
      if (stageKey === 'SITE_VISIT_COMPLETED') {
        return st === 'SITE_VISIT_COMPLETED' || st === 'VISITED';
      }
      if (stageKey === 'TOKEN_BOOKED') {
        return st === 'TOKEN_BOOKED' || st === 'BOOKED';
      }
      if (stageKey === 'LOST') {
        return st === 'LOST' || st === 'DROPPED';
      }
      return st === stageKey;
    });
  }

  openCreateModal(): void {
    this.leadForm.reset({
      lead_source_id: 'WALK_IN',
      budget_range_min: 15000000,
      budget_range_max: 25000000
    });
    this.isCreateModalOpen.set(true);
  }

  openWebsiteModal(): void {
    this.isWebsiteInquiryModalOpen.set(true);
  }

  openWebhookModal(): void {
    this.isWebhookTestModalOpen.set(true);
  }

  openActivityModal(lead: Lead): void {
    this.selectedLeadForActivity.set(lead);
    this.activityForm.reset({
      activity_type: 'PHONE_CALL',
      outcome: 'INTERESTED'
    });
    this.isActivityModalOpen.set(true);
  }

  viewScoreBreakdown(lead: Lead): void {
    this.crmService.getLeadScoringBreakdown(lead.id).subscribe({
      next: (breakdown) => {
        this.selectedLeadScore.set(breakdown);
        this.isScoreModalOpen.set(true);
      },
      error: () => {
        // Fallback calculation preview
        this.selectedLeadScore.set({
          lead_id: lead.id,
          lead_name: lead.lead_name,
          total_score: lead.lead_score || 50,
          budget_fit_score: 20,
          contact_completeness_score: lead.email ? 25 : 15,
          source_quality_score: 20,
          engagement_progression_score: 15,
          lead_stage: lead.lead_stage,
          health_grade: lead.lead_score >= 80 ? 'HOT' : (lead.lead_score >= 50 ? 'WARM' : 'COLD'),
          recommended_action: 'Automated engagement in progress.'
        });
        this.isScoreModalOpen.set(true);
      }
    });
  }

  submitLead(): void {
    if (this.leadForm.invalid) {
      this.leadForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.crmService.createLead(this.leadForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isCreateModalOpen.set(false);
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  submitWebsiteInquiry(): void {
    if (this.websiteInquiryForm.invalid) {
      this.websiteInquiryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.crmService.submitWebsiteInquiry(this.websiteInquiryForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isWebsiteInquiryModalOpen.set(false);
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  submitFacebookSimulation(): void {
    if (this.facebookWebhookForm.invalid) {
      this.facebookWebhookForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.crmService.simulateFacebookLead(this.facebookWebhookForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isWebhookTestModalOpen.set(false);
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  submitActivity(): void {
    const lead = this.selectedLeadForActivity();
    if (!lead || this.activityForm.invalid) return;

    this.isSubmitting.set(true);
    this.crmService.logLeadActivity(lead.id, this.activityForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isActivityModalOpen.set(false);
        this.loadData();
      },
      error: () => this.isSubmitting.set(false)
    });
  }

  moveStage(lead: Lead, targetStage: PipelineStage): void {
    if (lead.lead_stage === targetStage) return;
    this.crmService.updateLeadStage(lead.id, targetStage, `Stage moved to ${targetStage} by user`).subscribe({
      next: () => this.loadData(),
      error: () => {}
    });
  }

  getScoreBadgeColor(score: number): string {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (score >= 55) return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  }
}
