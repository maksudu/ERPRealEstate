import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';
import { CrmService } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { Customer, CustomerRequirement } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-requirement-form',
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
  templateUrl: './requirement-form.component.html'
})
export class RequirementFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Dynamic Lookup Category Codes (Spec 4.6 & Rule 1)
  readonly LOOKUP = {
    propertyType: 'CRM_PROPERTY_TYPE',
    preferredFloor: 'CRM_PREFERRED_FLOOR',
    facing: 'CRM_FACING',
    purchaseTimeline: 'CRM_PURCHASE_TIMELINE',
    paymentPreference: 'CRM_PAYMENT_PREFERENCE',
    requirementStatus: 'CRM_REQUIREMENT_STATUS'
  };

  reqId = signal<number | null>(null);
  isEditMode = computed(() => this.reqId() !== null);
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  // Relational options
  customers = signal<Customer[]>([]);
  projects = signal<Project[]>([]);
  salesReps = signal<{ id: number; full_name_en: string }[]>([]);

  form: FormGroup = this.fb.group({
    customer_id: [null, [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(191)]],
    preferred_project_id: [null],
    preferred_location: ['', [Validators.maxLength(191)]],
    property_type: ['APARTMENT'],
    budget_min_bdt: [null],
    budget_max_bdt: [null],
    area_min_sqft: [null],
    area_max_sqft: [null],
    bedrooms: [3],
    bathrooms: [3],
    preferred_floor: ['MID_FLOOR'],
    preferred_facing: ['SOUTH_FACING'],
    parking_required: [true],
    parking_count: [1],
    purchase_timeline: ['WITHIN_6_MONTHS'],
    payment_preference: ['INSTALLMENTS'],
    amenities_required: [''],
    special_notes: [''],
    assigned_sales_rep_id: [null],
    status: ['ACTIVE'],
    change_reason: ['']
  });

  customerOptions = computed(() =>
    this.customers().map(c => ({
      value: String(c.id),
      label: `${c.full_name_en} (${c.customer_code} · ${c.primary_phone})`
    }))
  );

  projectOptions = computed(() => [
    { value: '', label: 'Any / Multiple Projects' },
    ...this.projects().map(p => ({
      value: String(p.id),
      label: `${p.project_name} (${p.thana_upazila || p.district || 'Dhaka'})`
    }))
  ]);

  salesRepOptions = computed(() => [
    { value: '', label: 'Unassigned / Auto Assign' },
    ...this.salesReps().map(s => ({
      value: String(s.id),
      label: s.full_name_en
    }))
  ]);

  ngOnInit(): void {
    this.loadCustomers();
    this.loadProjects();
    this.loadSalesReps();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.reqId.set(Number(idParam));
      this.loadRequirement(Number(idParam));
    } else {
      // Check query param for preselected customer
      const qCustId = this.route.snapshot.queryParamMap.get('customer_id');
      if (qCustId) {
        this.form.patchValue({ customer_id: qCustId });
      }
    }
  }

  loadCustomers(): void {
    this.crmService.loadCustomersTable({ limit: 100, offset: 0 }).subscribe({
      next: (res) => this.customers.set(res.items || []),
      error: () => this.customers.set([])
    });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs || []),
      error: () => this.projects.set([])
    });
  }

  loadSalesReps(): void {
    this.crmService.getSalesReps().subscribe({
      next: (reps) => this.salesReps.set(reps || []),
      error: () => this.salesReps.set([])
    });
  }

  loadRequirement(id: number): void {
    this.isLoading.set(true);
    this.crmService.getRequirement(id).subscribe({
      next: (req) => {
        this.isLoading.set(false);
        this.form.patchValue({
          customer_id: String(req.customer_id),
          title: req.title,
          preferred_project_id: req.preferred_project_id ? String(req.preferred_project_id) : '',
          preferred_location: req.preferred_location || '',
          property_type: req.property_type || 'APARTMENT',
          budget_min_bdt: req.budget_min_bdt,
          budget_max_bdt: req.budget_max_bdt,
          area_min_sqft: req.area_min_sqft,
          area_max_sqft: req.area_max_sqft,
          bedrooms: req.bedrooms || 3,
          bathrooms: req.bathrooms || 3,
          preferred_floor: req.preferred_floor || 'MID_FLOOR',
          preferred_facing: req.preferred_facing || 'SOUTH_FACING',
          parking_required: req.parking_required,
          parking_count: req.parking_count || 1,
          purchase_timeline: req.purchase_timeline || 'WITHIN_6_MONTHS',
          payment_preference: req.payment_preference || 'INSTALLMENTS',
          amenities_required: req.amenities_required || '',
          special_notes: req.special_notes || '',
          assigned_sales_rep_id: req.assigned_sales_rep_id ? String(req.assigned_sales_rep_id) : '',
          status: req.status || 'ACTIVE'
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load customer requirement.');
      }
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please fill out all required fields marked with an asterisk (*).');
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);

    const val = this.form.value;
    const payload: any = {
      customer_id: Number(val.customer_id),
      title: val.title.trim(),
      preferred_project_id: val.preferred_project_id ? Number(val.preferred_project_id) : null,
      preferred_location: (val.preferred_location || '').trim() || null,
      property_type: val.property_type || 'APARTMENT',
      budget_min_bdt: val.budget_min_bdt !== null && val.budget_min_bdt !== '' ? Number(val.budget_min_bdt) : null,
      budget_max_bdt: val.budget_max_bdt !== null && val.budget_max_bdt !== '' ? Number(val.budget_max_bdt) : null,
      area_min_sqft: val.area_min_sqft !== null && val.area_min_sqft !== '' ? Number(val.area_min_sqft) : null,
      area_max_sqft: val.area_max_sqft !== null && val.area_max_sqft !== '' ? Number(val.area_max_sqft) : null,
      bedrooms: val.bedrooms ? Number(val.bedrooms) : 3,
      bathrooms: val.bathrooms ? Number(val.bathrooms) : 3,
      preferred_floor: val.preferred_floor || 'MID_FLOOR',
      preferred_facing: val.preferred_facing || 'SOUTH_FACING',
      parking_required: Boolean(val.parking_required),
      parking_count: val.parking_count ? Number(val.parking_count) : 1,
      purchase_timeline: val.purchase_timeline || 'WITHIN_6_MONTHS',
      payment_preference: val.payment_preference || 'INSTALLMENTS',
      amenities_required: (val.amenities_required || '').trim() || null,
      special_notes: (val.special_notes || '').trim() || null,
      assigned_sales_rep_id: val.assigned_sales_rep_id ? Number(val.assigned_sales_rep_id) : null,
      status: val.status || 'ACTIVE'
    };

    if (this.isEditMode()) {
      payload.change_reason = (val.change_reason || '').trim() || null;
      this.crmService.updateRequirement(this.reqId()!, payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.router.navigate(['/crm/requirements', res.id]);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update requirement profile.');
        }
      });
    } else {
      this.crmService.createRequirement(payload).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.router.navigate(['/crm/requirements', res.id]);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create requirement profile.');
        }
      });
    }
  }

  cancel(): void {
    if (this.isEditMode()) {
      this.router.navigate(['/crm/requirements', this.reqId()]);
    } else {
      this.router.navigate(['/crm/requirements']);
    }
  }
}
