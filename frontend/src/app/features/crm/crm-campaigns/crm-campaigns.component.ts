import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import {
  Campaign,
  CampaignMarketingDashboardKpis,
  MarketingTouchpoint,
  SuppressionEntry,
  SuppressionEntryCreate
} from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-crm-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-campaigns.component.html'
})
export class CrmCampaignsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Dynamic Lookup Categories (Rule 1 & 2)
  readonly LOOKUP = {
    campaignChannel: 'CRM_CAMPAIGN_CHANNEL',
    campaignStatus: 'CRM_CAMPAIGN_STATUS',
    suppressionReason: 'CRM_SUPPRESSION_REASON'
  };

  // Active Tab: 'campaigns' | 'touchpoints' | 'suppression'
  activeTab = signal<'campaigns' | 'touchpoints' | 'suppression'>('campaigns');

  // KPIs
  kpis = signal<CampaignMarketingDashboardKpis | null>(null);

  // Campaigns Table State
  campaigns = signal<Campaign[]>([]);
  totalCampaigns = signal<number>(0);
  isLoadingCampaigns = signal<boolean>(false);
  campaignPage = signal<number>(1);
  campaignLimit = signal<number>(10);
  campaignTotalPages = computed(() => Math.ceil(this.totalCampaigns() / this.campaignLimit()) || 1);

  // Projects filter
  projects = signal<Project[]>([]);
  projectOptions = computed(() => [
    { label: 'All Projects', value: '' },
    ...this.projects().map(p => ({
      label: `${p.project_name} (${p.project_code || 'PRJ'})`,
      value: p.id
    }))
  ]);

  campaignFilterForm: FormGroup = this.fb.group({
    search: [''],
    channel: ['ALL'],
    status: ['ALL'],
    project_id: ['']
  });

  // Touchpoints State
  touchpoints = signal<MarketingTouchpoint[]>([]);
  isLoadingTouchpoints = signal<boolean>(false);

  // Suppression State
  suppressionEntries = signal<SuppressionEntry[]>([]);
  totalSuppression = signal<number>(0);
  isLoadingSuppression = signal<boolean>(false);
  suppressionPage = signal<number>(1);
  suppressionLimit = signal<number>(10);
  suppressionTotalPages = computed(() => Math.ceil(this.totalSuppression() / this.suppressionLimit()) || 1);

  suppressionFilterForm: FormGroup = this.fb.group({
    search: [''],
    reason: ['ALL']
  });

  // Add to Suppression Modal
  isSuppressionModalOpen = signal<boolean>(false);
  suppressionForm: FormGroup = this.fb.group({
    phone: [''],
    email: [''],
    customer_name: [''],
    suppression_reason: ['DO_NOT_CALL'],
    source_note: ['']
  });
  isSubmittingSuppression = signal<boolean>(false);

  ngOnInit(): void {
    this.loadKpis();
    this.loadProjects();
    this.loadCampaigns();

    this.campaignFilterForm.valueChanges.subscribe(() => {
      this.campaignPage.set(1);
      this.loadCampaigns();
    });

    this.suppressionFilterForm.valueChanges.subscribe(() => {
      this.suppressionPage.set(1);
      this.loadSuppressionList();
    });
  }

  loadKpis(): void {
    this.crmService.getCampaignDashboardKpis().subscribe({
      next: (res) => this.kpis.set(res),
      error: () => {}
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res || []),
      error: () => {}
    });
  }

  loadCampaigns(): void {
    this.isLoadingCampaigns.set(true);
    const f = this.campaignFilterForm.value;

    this.crmService.getCampaigns({
      search: f.search || undefined,
      channel: f.channel && f.channel !== 'ALL' ? f.channel : undefined,
      status: f.status && f.status !== 'ALL' ? f.status : undefined,
      project_id: f.project_id ? Number(f.project_id) : undefined,
      page: this.campaignPage(),
      limit: this.campaignLimit()
    }).subscribe({
      next: (res) => {
        this.campaigns.set(res.items || []);
        this.totalCampaigns.set(res.total || 0);
        this.isLoadingCampaigns.set(false);
      },
      error: () => this.isLoadingCampaigns.set(false)
    });
  }

  loadTouchpoints(): void {
    this.isLoadingTouchpoints.set(true);
    this.crmService.getMarketingTouchpoints().subscribe({
      next: (res) => {
        this.touchpoints.set(res || []);
        this.isLoadingTouchpoints.set(false);
      },
      error: () => this.isLoadingTouchpoints.set(false)
    });
  }

  loadSuppressionList(): void {
    this.isLoadingSuppression.set(true);
    const f = this.suppressionFilterForm.value;

    this.crmService.getSuppressionList({
      search: f.search || undefined,
      reason: f.reason && f.reason !== 'ALL' ? f.reason : undefined,
      page: this.suppressionPage(),
      limit: this.suppressionLimit()
    }).subscribe({
      next: (res) => {
        this.suppressionEntries.set(res.items || []);
        this.totalSuppression.set(res.total || 0);
        this.isLoadingSuppression.set(false);
      },
      error: () => this.isLoadingSuppression.set(false)
    });
  }

  switchTab(tab: 'campaigns' | 'touchpoints' | 'suppression'): void {
    this.activeTab.set(tab);
    if (tab === 'touchpoints') this.loadTouchpoints();
    if (tab === 'suppression') this.loadSuppressionList();
  }

  createCampaign(): void {
    this.router.navigate(['/crm/campaigns/new']);
  }

  editCampaign(camp: Campaign): void {
    this.router.navigate(['/crm/campaigns', camp.id, 'edit']);
  }

  importOfflineLeads(): void {
    this.router.navigate(['/crm/campaigns/import']);
  }

  deleteCampaign(id: number): void {
    if (confirm('Are you sure you want to delete this marketing campaign?')) {
      this.crmService.deleteCampaign(id).subscribe({
        next: () => {
          this.loadCampaigns();
          this.loadKpis();
        },
        error: (err) => alert(err?.error?.detail || 'Failed to delete campaign')
      });
    }
  }

  openSuppressionModal(): void {
    this.suppressionForm.reset({
      phone: '',
      email: '',
      customer_name: '',
      suppression_reason: 'DO_NOT_CALL',
      source_note: ''
    });
    this.isSuppressionModalOpen.set(true);
  }

  closeSuppressionModal(): void {
    this.isSuppressionModalOpen.set(false);
  }

  submitSuppression(): void {
    if (this.suppressionForm.invalid) return;
    this.isSubmittingSuppression.set(true);

    const payload: SuppressionEntryCreate = this.suppressionForm.value;
    this.crmService.createSuppressionEntry(payload).subscribe({
      next: () => {
        this.isSubmittingSuppression.set(false);
        this.closeSuppressionModal();
        this.loadSuppressionList();
      },
      error: (err) => {
        this.isSubmittingSuppression.set(false);
        alert(err?.error?.detail || 'Failed to add contact to suppression list');
      }
    });
  }

  deleteSuppression(id: number): void {
    if (confirm('Reactivate this customer contact for marketing communications?')) {
      this.crmService.deleteSuppressionEntry(id).subscribe({
        next: () => this.loadSuppressionList(),
        error: () => alert('Failed to deactivate suppression')
      });
    }
  }

  getStatusVariant(status: string): 'info' | 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PLANNING':
        return 'info';
      case 'PAUSED':
        return 'warning';
      case 'COMPLETED':
      case 'CANCELLED':
        return 'danger';
      default:
        return 'info';
    }
  }

  formatBdt(amount: number): string {
    return '৳' + (amount || 0).toLocaleString('en-IN');
  }
}
