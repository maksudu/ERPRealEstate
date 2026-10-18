import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Lead } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-lead-capture-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <a
            routerLink="/crm/lead-capture"
            class="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Lead Capture Register"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Spec 4.2 · Lead Capture
              </span>
              <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {{ isEditMode() ? (existingLead()?.lead_code || 'Lead #' + leadId) : 'New Lead Registration' }}
              </span>
              @if (existingLead()?.is_opted_out) {
                <app-status-badge status="OPTED OUT" variant="danger" size="sm"></app-status-badge>
              }
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">
              {{ isEditMode() ? 'Edit Lead & Requirement Profile' : 'Capture New Lead' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/crm/lead-capture"
            class="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
          >
            Back to List
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="leadForm.invalid || isSubmitting()"
            [loading]="isSubmitting()"
            (clicked)="saveLead()"
          >
            <span class="flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              {{ isEditMode() ? 'Update Lead' : 'Save Lead' }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Duplicate Warning -->
      @if (duplicateWarning()) {
        <div class="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>{{ duplicateWarning() }}</span>
        </div>
      }

      <!-- Main Form Card -->
      <app-card-container
        title="Lead Intake Form"
        subtitle="Customer contact, campaign attribution, property requirements, consent and assignment — all dropdowns are dynamic lookup values"
      >
        <form [formGroup]="leadForm" class="flex flex-col gap-8">
          <!-- 1. Lead Source & Attribution -->
          <section class="space-y-4">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              1. Lead Source & Campaign Attribution
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-searchable-select
                label="Lead Source *"
                [categoryCode]="LOOKUP.source"
                formControlName="lead_source_id"
                placeholder="Select lead source..."
                [required]="true"
              ></app-searchable-select>
              <app-custom-input
                label="Campaign Name"
                placeholder="e.g. Eid Flat Fair 2026"
                formControlName="campaign_name"
              ></app-custom-input>
              <app-custom-input
                label="UTM Source"
                placeholder="e.g. facebook, google"
                formControlName="utm_source"
              ></app-custom-input>
              <app-custom-input
                label="UTM Medium"
                placeholder="e.g. cpc, email"
                formControlName="utm_medium"
              ></app-custom-input>
              <app-custom-input
                label="UTM Campaign"
                placeholder="e.g. gulshan-launch"
                formControlName="utm_campaign"
              ></app-custom-input>
            </div>
          </section>

          <div class="border-t border-slate-200 dark:border-slate-800"></div>

          <!-- 2. Customer Contact -->
          <section class="space-y-4">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              2. Customer Contact & Consent
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-custom-input
                label="Customer Name *"
                placeholder="Prospect full name"
                formControlName="lead_name"
                [required]="true"
              ></app-custom-input>
              <app-custom-input
                label="Mobile Number *"
                placeholder="+8801XXXXXXXXX"
                formControlName="primary_phone"
                [required]="true"
                hint="10–15 digits, optional leading +"
              ></app-custom-input>
              <app-custom-input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                formControlName="email"
              ></app-custom-input>
              <app-searchable-select
                label="Preferred Contact Channel"
                [categoryCode]="LOOKUP.contactMethod"
                formControlName="preferred_contact_method"
                placeholder="Select channel..."
              ></app-searchable-select>
            </div>
            <label class="flex items-start gap-3 cursor-pointer select-none w-fit">
              <input
                type="checkbox"
                formControlName="is_consent_given"
                class="mt-0.5 rounded border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <span class="text-xs text-slate-700 dark:text-slate-300">
                Customer has given consent to be contacted via the preferred channel (Spec 4.2 — consent & communication preferences)
              </span>
            </label>
          </section>

          <div class="border-t border-slate-200 dark:border-slate-800"></div>

          <!-- 3. Property Requirements -->
          <section class="space-y-4">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              3. Property Requirement Profile
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-searchable-select
                label="Interested Project"
                [options]="projectOptions()"
                formControlName="interested_project_id"
                placeholder="Select project..."
                [allowCreateNew]="false"
              ></app-searchable-select>
              <app-searchable-select
                label="Property Type"
                [categoryCode]="LOOKUP.propertyType"
                formControlName="property_type"
                placeholder="Select property type..."
              ></app-searchable-select>
              <app-custom-input
                label="Preferred Location"
                placeholder="e.g. Gulshan, Banani"
                formControlName="preferred_location"
              ></app-custom-input>
              <app-custom-input
                label="Budget Range (Min)"
                type="number"
                placeholder="e.g. 15000000"
                formControlName="budget_range_min"
                suffixText="BDT"
              ></app-custom-input>
              <app-custom-input
                label="Budget Range (Max)"
                type="number"
                placeholder="e.g. 35000000"
                formControlName="budget_range_max"
                suffixText="BDT"
              ></app-custom-input>
              <app-custom-input
                label="Required Area"
                type="number"
                placeholder="e.g. 1200"
                formControlName="required_area_sqft"
                suffixText="sqft"
              ></app-custom-input>
              <app-custom-input
                label="Bedrooms"
                type="number"
                placeholder="e.g. 3"
                formControlName="bedrooms"
              ></app-custom-input>
              <app-custom-input
                label="Expected Purchase Date"
                type="date"
                formControlName="expected_purchase_date"
              ></app-custom-input>
            </div>
          </section>

          <div class="border-t border-slate-200 dark:border-slate-800"></div>

          <!-- 4. Priority, Stage & Assignment -->
          <section class="space-y-4">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              4. Priority, Pipeline Stage & Assignment
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-searchable-select
                label="Lead Priority *"
                [categoryCode]="LOOKUP.priority"
                formControlName="priority"
                placeholder="Select priority..."
                [required]="true"
              ></app-searchable-select>
              <app-searchable-select
                label="Lead Stage *"
                [categoryCode]="LOOKUP.stage"
                formControlName="lead_stage"
                placeholder="Select stage..."
                [required]="true"
              ></app-searchable-select>
              @if (!isEditMode()) {
                <app-searchable-select
                  label="Assign to Sales Representative"
                  [options]="salesRepOptions()"
                  formControlName="assigned_sales_rep_id"
                  placeholder="Leave unassigned (rules can assign later)"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              } @else {
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">Assigned Representative</label>
                  <div class="erp-input text-xs flex items-center justify-between">
                    <span>{{ existingLead()?.assigned_sales_rep_name || 'Unassigned' }}</span>
                    <a routerLink="/crm/lead-assignments" class="text-primary underline text-[11px] font-medium">Manage in Assignment Queue</a>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Reassignment preserves owner history (Spec 4.3)</p>
                </div>
              }
            </div>
            <app-custom-textarea
              label="Notes / Requirements Summary"
              placeholder="Customer requirements, objections, follow-up notes..."
              formControlName="notes"
              [rows]="3"
            ></app-custom-textarea>
          </section>

          <div class="border-t border-slate-200 dark:border-slate-800"></div>

          <!-- 4.4 Qualification Signals -->
          <section class="space-y-4">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              4.4 Qualification Signals (Score Assists — Never Auto-Rejects)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-searchable-select
                label="Financing Readiness"
                [options]="[{ value: 'true', label: 'Yes — Cash / Loan Approved' }, { value: 'false', label: 'No — Not Yet Ready' }]"
                formControlName="financing_ready"
                placeholder="Not provided"
                [allowCreateNew]="false"
              ></app-searchable-select>
              <app-searchable-select
                label="Decision-Maker Available"
                [options]="[{ value: 'true', label: 'Yes — Decision Maker Present' }, { value: 'false', label: 'No — Not Yet Available' }]"
                formControlName="decision_maker_available"
                placeholder="Not provided"
                [allowCreateNew]="false"
              ></app-searchable-select>
            </div>
            @if (isEditMode() && existingLead()) {
              <div class="erp-card p-3 text-xs space-y-1">
                <p class="text-[11px] text-slate-500 uppercase font-semibold">Current Qualification</p>
                <p>Score: <strong>{{ existingLead()?.lead_score }}</strong> · Grade: <strong>{{ existingLead()?.health_grade || '—' }}</strong></p>
                @if (existingLead()?.qualification_reasons) {
                  <p class="text-slate-600 dark:text-slate-400">{{ existingLead()?.qualification_reasons }}</p>
                }
                <a routerLink="/crm/lead-qualification" class="text-primary underline text-[11px] font-medium">Open Qualification Workbench</a>
              </div>
            }
          </section>

          @if (isEditMode() && existingLead()) {
            <div class="border-t border-slate-200 dark:border-slate-800"></div>
            <section class="space-y-3">
              <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                5. Consent & Opt-out Status
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="erp-card p-3">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Original Source</p>
                  <p class="mt-1 font-medium text-slate-800 dark:text-slate-200">{{ existingLead()?.original_source_id || existingLead()?.lead_source_id }}</p>
                  <p class="text-[10px] text-slate-400 mt-1">Preserved forever even on reassignment</p>
                </div>
                <div class="erp-card p-3">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Consent Given</p>
                  <p class="mt-1 font-medium" [class.text-emerald-600]="existingLead()?.is_consent_given" [class.text-rose-600]="!existingLead()?.is_consent_given">
                    {{ existingLead()?.is_consent_given ? 'Yes' : 'No' }}
                  </p>
                </div>
                <div class="erp-card p-3">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Opt-out Status</p>
                  <p class="mt-1 font-medium" [class.text-rose-600]="existingLead()?.is_opted_out" [class.text-emerald-600]="!existingLead()?.is_opted_out">
                    {{ existingLead()?.is_opted_out ? 'Opted Out' : 'Active' }}
                  </p>
                </div>
              </div>
              <label class="flex items-center gap-3 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  formControlName="is_opted_out"
                  class="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span class="text-xs text-slate-700 dark:text-slate-300">Mark as opted out (stops all marketing communication)</span>
              </label>
            </section>
          }
        </form>
      </app-card-container>
    </div>
  `
})
export class LeadCaptureFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  leadId: number | null = null;
  isEditMode = signal(false);
  isSubmitting = signal(false);
  existingLead = signal<Lead | null>(null);
  duplicateWarning = signal<string | null>(null);
  projects = signal<Project[]>([]);
  salesReps = signal<{ id: number; full_name_en: string }[]>([]);

  readonly LOOKUP = {
    source: 'CRM_LEAD_SOURCE',
    stage: 'CRM_LEAD_STAGE',
    priority: 'CRM_LEAD_PRIORITY',
    propertyType: 'CRM_PROPERTY_TYPE',
    contactMethod: 'CRM_CONTACT_METHOD'
  };

  projectOptions = signal<{ value: string; label: string }[]>([]);
  salesRepOptions = signal<{ value: string; label: string }[]>([]);

  leadForm: FormGroup = this.fb.group({
    lead_name: ['', Validators.required],
    primary_phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9\s\-]{10,15}$/)]],
    email: ['', Validators.email],
    lead_source_id: ['MANUAL_ENTRY', Validators.required],
    campaign_name: [''],
    utm_source: [''],
    utm_medium: [''],
    utm_campaign: [''],
    preferred_contact_method: ['PHONE'],
    is_consent_given: [true],
    interested_project_id: [null],
    property_type: [''],
    preferred_location: [''],
    required_area_sqft: [null],
    bedrooms: [null],
    expected_purchase_date: [''],
    budget_range_min: [null],
    budget_range_max: [null],
    assigned_sales_rep_id: [null],
    priority: ['MEDIUM', Validators.required],
    lead_stage: ['NEW', Validators.required],
    notes: [''],
    is_opted_out: [false],
    financing_ready: [null],
    decision_maker_available: [null]
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.leadId = +idParam;
      this.isEditMode.set(true);
      this.loadLead(this.leadId);
    }
    this.loadProjects();
    this.loadSalesReps();

    this.leadForm.get('primary_phone')?.valueChanges.pipe(
      debounceTime(600),
      distinctUntilChanged()
    ).subscribe(() => {
      this.duplicateWarning.set(null);
      this.checkDuplicatePhone();
    });
  }

  loadLead(id: number): void {
    this.crmService.getLead(id).subscribe({
      next: (lead) => {
        this.existingLead.set(lead);
        this.leadForm.patchValue({
          lead_name: lead.lead_name,
          primary_phone: lead.primary_phone,
          email: lead.email || '',
          lead_source_id: lead.lead_source_id,
          campaign_name: lead.campaign_name || '',
          utm_source: lead.utm_source || '',
          utm_medium: lead.utm_medium || '',
          utm_campaign: lead.utm_campaign || '',
          preferred_contact_method: lead.preferred_contact_method || 'PHONE',
          is_consent_given: lead.is_consent_given,
          interested_project_id: lead.interested_project_id != null ? String(lead.interested_project_id) : null,
          property_type: lead.property_type || '',
          preferred_location: lead.preferred_location || '',
          required_area_sqft: lead.required_area_sqft,
          bedrooms: lead.bedrooms,
          expected_purchase_date: lead.expected_purchase_date || '',
          budget_range_min: lead.budget_range_min,
          budget_range_max: lead.budget_range_max,
          priority: lead.priority,
          lead_stage: lead.lead_stage,
          notes: lead.notes || '',
          is_opted_out: lead.is_opted_out,
          financing_ready: lead.financing_ready === true ? 'true' : lead.financing_ready === false ? 'false' : null,
          decision_maker_available: lead.decision_maker_available === true ? 'true' : lead.decision_maker_available === false ? 'false' : null
        });
      },
      error: (err) => {
        alert(err?.error?.detail || 'Failed to load lead.');
        this.router.navigate(['/crm/lead-capture']);
      }
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe(p => {
      this.projects.set(p);
      this.projectOptions.set(p.map(pr => ({
        value: String(pr.id),
        label: pr.project_name
      })));
    });
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe(reps => {
      this.salesReps.set(reps);
      this.salesRepOptions.set(reps.map(r => ({ value: String(r.id), label: r.full_name_en })));
    });
  }

  checkDuplicatePhone(): void {
    const phone = this.leadForm.get('primary_phone')?.value;
    if (phone && phone.replace(/\D/g, '').length >= 10) {
      this.crmService.checkDuplicates({
        primary_phone: phone,
        exclude_lead_id: this.leadId || undefined
      }).subscribe({
        next: (res) => {
          if (res.is_duplicate && res.matching_leads.length > 0) {
            const codes = res.matching_leads.map(l => l.lead_code || `#${l.id}`).join(', ');
            this.duplicateWarning.set(`Possible duplicate lead(s) found: ${codes}. You may still save this lead.`);
          } else {
            this.duplicateWarning.set(null);
          }
        },
        error: () => this.duplicateWarning.set(null)
      });
    }
  }

  saveLead(): void {
    if (this.leadForm.invalid) {
      this.leadForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const formValue: any = { ...this.leadForm.value };

    if (formValue.interested_project_id) formValue.interested_project_id = +formValue.interested_project_id;
    if (formValue.assigned_sales_rep_id) formValue.assigned_sales_rep_id = +formValue.assigned_sales_rep_id;
    if (!formValue.email) formValue.email = null;
    if (!formValue.expected_purchase_date) formValue.expected_purchase_date = null;
    // 4.4 boolean coercion
    if (formValue.financing_ready === 'true') formValue.financing_ready = true;
    else if (formValue.financing_ready === 'false') formValue.financing_ready = false;
    else formValue.financing_ready = null;
    if (formValue.decision_maker_available === 'true') formValue.decision_maker_available = true;
    else if (formValue.decision_maker_available === 'false') formValue.decision_maker_available = false;
    else formValue.decision_maker_available = null;

    const request$ = this.isEditMode() && this.leadId
      ? this.crmService.updateLead(this.leadId, formValue)
      : this.crmService.createLead(formValue);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/crm/lead-capture']);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        alert(err?.error?.detail || err?.error?.[0]?.msg || 'Failed to save lead.');
      }
    });
  }
}
