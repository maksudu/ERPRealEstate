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
    <!-- Dedicated Full-Screen Routed Lead Capture Component Wrapped in Single Card Container -->
    <app-card-container
      [title]="isEditMode() ? 'Edit Lead & Requirement Profile' : 'Capture New Lead'"
      [subtitle]="'Omnichannel lead registration (Spec 4.2) — ' + (isEditMode() ? (existingLead()?.lead_code || 'Lead #' + leadId) : 'New prospect intake with duplicate detection & dynamic lookups')"
    >
      <!-- Action Buttons in Card Container Header -->
      <div card-actions class="flex flex-wrap items-center gap-2">
        <a
          routerLink="/crm/lead-capture"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <i class="ri-arrow-left-line text-sm"></i>
          <span>Back to List</span>
        </a>
        <app-custom-button
          variant="primary"
          size="sm"
          [disabled]="leadForm.invalid || isSubmitting()"
          [loading]="isSubmitting()"
          (clicked)="saveLead()"
        >
          <span class="flex items-center gap-1.5">
            <i class="ri-save-line text-sm"></i>
            <span>{{ isEditMode() ? 'Update Lead' : 'Save Lead' }}</span>
          </span>
        </app-custom-button>
      </div>

      <div class="flex flex-col gap-6">
        <!-- Spec & Status Banner -->
        <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Spec 4.2 · Omnichannel Ingestion
            </span>
            <span class="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {{ isEditMode() ? (existingLead()?.lead_code || 'Lead #' + leadId) : 'New Inbound Record' }}
            </span>
            @if (existingLead()?.is_opted_out) {
              <app-status-badge status="OPTED OUT" variant="danger" size="sm"></app-status-badge>
            }
          </div>
          <div class="text-[11px] text-slate-500 dark:text-slate-400">
            All dropdown options are managed dynamically with inline creation support.
          </div>
        </div>

        <!-- Duplicate Warning Alert -->
        @if (duplicateWarning()) {
          <div class="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 shadow-xs">
            <i class="ri-alert-line text-amber-500 text-base shrink-0 mt-0.5"></i>
            <div>
              <p class="font-semibold">Potential Duplicate Detected</p>
              <p class="mt-0.5 text-slate-600 dark:text-slate-300">{{ duplicateWarning() }}</p>
            </div>
          </div>
        }

        <!-- Main Lead Form -->
        <form [formGroup]="leadForm" class="flex flex-col gap-8">
          <!-- 1. Lead Source & Attribution -->
          <section class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-primary"></span>
                1. Lead Source & Attribution (Spec 4.2 Channels)
              </h3>
              <span class="text-[11px] text-slate-400">11 Omnichannel Sources</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-searchable-select
                label="Lead Source *"
                [categoryCode]="LOOKUP.source"
                formControlName="lead_source_id"
                placeholder="Select lead source..."
                [allowCreateNew]="true"
                [required]="true"
              ></app-searchable-select>
              <app-custom-input
                label="Campaign Name"
                placeholder="e.g. Eid Flat Fair 2026 / Gulshan Launch"
                formControlName="campaign_name"
              ></app-custom-input>
              <app-custom-input
                label="Lead Date / Time Received"
                type="datetime-local"
                formControlName="lead_date"
              ></app-custom-input>
              <app-custom-input
                label="UTM Source"
                placeholder="e.g. facebook, google, email"
                formControlName="utm_source"
              ></app-custom-input>
              <app-custom-input
                label="UTM Medium"
                placeholder="e.g. cpc, display, referral"
                formControlName="utm_medium"
              ></app-custom-input>
              <app-custom-input
                label="UTM Campaign"
                placeholder="e.g. summer-promo-2026"
                formControlName="utm_campaign"
              ></app-custom-input>
            </div>
          </section>

          <!-- 2. Customer Contact & Consent -->
          <section class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                2. Customer Contact & Communication Consent
              </h3>
              <span class="text-[11px] text-slate-400">Direct Contact Details</span>
            </div>
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
                hint="10–15 digits, automated duplicate check enabled"
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
                [allowCreateNew]="true"
              ></app-searchable-select>
              <div class="sm:col-span-2 flex items-center pt-6">
                <label class="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    formControlName="is_consent_given"
                    class="mt-0.5 rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <span class="text-xs text-slate-700 dark:text-slate-300">
                    Customer has given consent to receive calls, SMS and WhatsApp messages regarding real estate inquiries (Spec 4.2).
                  </span>
                </label>
              </div>
            </div>
          </section>

          <!-- 3. Property Requirements Profile -->
          <section class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                3. Property Requirement Profile
              </h3>
              <span class="text-[11px] text-slate-400">Customer Specification</span>
            </div>
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
                placeholder="Apartment, Commercial, Shop..."
                [allowCreateNew]="true"
              ></app-searchable-select>
              <app-custom-input
                label="Preferred Location"
                placeholder="e.g. Gulshan, Banani, Dhanmondi, Uttara"
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
                placeholder="e.g. 1850"
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

          <!-- 4. Priority, Stage & Assignment Routing -->
          <section class="space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                4. Priority, Pipeline Stage & Assignment
              </h3>
              <span class="text-[11px] text-slate-400">Distribution Controls</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <app-searchable-select
                label="Lead Priority *"
                [categoryCode]="LOOKUP.priority"
                formControlName="priority"
                placeholder="Select priority..."
                [allowCreateNew]="true"
                [required]="true"
              ></app-searchable-select>
              <app-searchable-select
                label="Lead Stage *"
                [categoryCode]="LOOKUP.stage"
                formControlName="lead_stage"
                placeholder="Select stage..."
                [allowCreateNew]="true"
                [required]="true"
              ></app-searchable-select>
              @if (!isEditMode()) {
                <app-searchable-select
                  label="Assign to Sales Representative"
                  [options]="salesRepOptions()"
                  formControlName="assigned_sales_rep_id"
                  placeholder="Leave unassigned (auto-assign rules apply)"
                  [allowCreateNew]="false"
                ></app-searchable-select>
              } @else {
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">Assigned Representative</label>
                  <div class="erp-input text-xs flex items-center justify-between rounded-xl">
                    <span class="font-medium">{{ existingLead()?.assigned_sales_rep_name || 'Unassigned' }}</span>
                    <a routerLink="/crm/lead-assignments" class="text-primary underline text-[11px] font-medium">Manage in Assignment Queue</a>
                  </div>
                  <p class="text-[11px] text-slate-500 dark:text-slate-400">Reassignment preserves previous owners and complete history (Spec 4.3)</p>
                </div>
              }
            </div>
            <app-custom-textarea
              label="Notes & Customer Comments"
              placeholder="Customer requirements, special requests, follow-up summary..."
              formControlName="notes"
              [rows]="3"
            ></app-custom-textarea>
          </section>

          <!-- 5. Consent & Opt-Out Audit (Edit Mode) -->
          @if (isEditMode() && existingLead()) {
            <section class="space-y-3 pt-2">
              <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                  5. Source Preservation & Opt-Out Status
                </h3>
                <span class="text-[11px] text-slate-400">Spec 4.2 Compliance</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Original Source</p>
                  <p class="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {{ existingLead()?.original_source_id || existingLead()?.lead_source_id }}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-1">Preserved even if lead ownership changes</p>
                </div>
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Consent Status</p>
                  <p class="mt-1 font-bold" [class.text-emerald-600]="existingLead()?.is_consent_given" [class.text-rose-600]="!existingLead()?.is_consent_given">
                    {{ existingLead()?.is_consent_given ? 'CONSENT GIVEN' : 'NO CONSENT' }}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-1">Recorded during initial intake</p>
                </div>
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <p class="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Marketing Opt-Out</p>
                  <p class="mt-1 font-bold" [class.text-rose-600]="existingLead()?.is_opted_out" [class.text-emerald-600]="!existingLead()?.is_opted_out">
                    {{ existingLead()?.is_opted_out ? 'OPTED OUT' : 'ACTIVE PROSPECT' }}
                  </p>
                  <p class="text-[10px] text-slate-400 mt-1">Stops promotional campaigns</p>
                </div>
              </div>
              <label class="flex items-center gap-3 cursor-pointer select-none w-fit pt-1">
                <input
                  type="checkbox"
                  formControlName="is_opted_out"
                  class="rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                />
                <span class="text-xs text-slate-700 dark:text-slate-300">
                  Mark as opted out (immediately removes prospect from active marketing cadences)
                </span>
              </label>
            </section>
          }
        </form>
      </div>
    </app-card-container>
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
    lead_date: [this.formatCurrentDateTime()],
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
    is_opted_out: [false]
  });

  formatCurrentDateTime(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

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
        let leadDateVal = '';
        if (lead.created_at) {
          const d = new Date(lead.created_at);
          const pad = (n: number) => String(n).padStart(2, '0');
          leadDateVal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        this.leadForm.patchValue({
          lead_name: lead.lead_name,
          primary_phone: lead.primary_phone,
          email: lead.email || '',
          lead_source_id: lead.lead_source_id,
          campaign_name: lead.campaign_name || '',
          lead_date: leadDateVal || this.formatCurrentDateTime(),
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
          is_opted_out: lead.is_opted_out
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
            this.duplicateWarning.set(`Possible duplicate lead(s) found: ${codes}. You may still proceed and save if this is an intentional secondary inquiry.`);
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
    // Don't send lead_date to update if not in schema
    delete formValue.lead_date;

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
