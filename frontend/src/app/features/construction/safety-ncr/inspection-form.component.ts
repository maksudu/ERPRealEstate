import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { QualityInspection, QualityChecklistItem } from '../../../core/models/construction.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-inspection-form',
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
    SearchableSelectComponent
  ],
  template: `
    <div class="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-12">
      <!-- Unified Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="p-2.5 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Quality & Defect Register"
          >
            <i class="ri-arrow-left-line text-lg"></i>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                QA / QC Work Inspection
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'WIR #' + inspectionId() : 'New Work Inspection Request (WIR)' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Inspect & Record Stage Verification' : 'Issue Work Inspection Request (WIR/ITP)' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/safety-ncr"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-xl border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="inspectionForm.invalid || isSaving()"
            (clicked)="saveInspection()"
          >
            <span class="flex items-center gap-2">
              <i class="ri-checkbox-circle-line" *ngIf="!isSaving()"></i>
              <i class="ri-loader-4-line animate-spin" *ngIf="isSaving()"></i>
              {{ isSaving() ? 'Saving...' : (isEditMode() ? 'Update & Record Verdict' : 'Submit Inspection Request') }}
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Mandatory Criteria Validation Alert -->
      <div
        *ngIf="hasMandatoryFails()"
        class="p-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-200 text-xs flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-2.5">
          <i class="ri-alert-fill text-lg text-red-500"></i>
          <div>
            <strong class="font-semibold">Mandatory Criteria Failed:</strong>
            Inspection CANNOT be marked as PASSED because one or more critical engineering criteria failed. Submitting will flag non-conformance.
          </div>
        </div>
        <span class="px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-mono text-xs font-bold">
          FAIL DETECTED
        </span>
      </div>

      <!-- Main Form Container -->
      <app-card-container
        title="Inspection and Test Plan (ITP) & Stage Parameters"
        subtitle="Work stage classification, contractor assignment, lab certificate verification, and checklist criteria"
      >
        <form [formGroup]="inspectionForm" class="flex flex-col gap-6">
          <!-- Row 1: Identification & Stage -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Inspection Request Code (WIR) *"
              placeholder="e.g. WIR-2026-0042"
              formControlName="inspection_code"
              [required]="true"
            ></app-custom-input>

            <app-searchable-select
              label="Construction Project *"
              [options]="projectOptions"
              formControlName="project_id"
              [allowCreateNew]="false"
              placeholder="Select project..."
              [required]="true"
            ></app-searchable-select>

            <app-searchable-select
              label="Work-Stage Category *"
              categoryCode="INSPECTION_STAGE"
              formControlName="stage_category"
              [allowCreateNew]="true"
              placeholder="Select stage..."
              [required]="true"
              (valueChange)="onStageCategoryChanged($event)"
            ></app-searchable-select>
          </div>

          <!-- Row 2: Location, ITP Code & Contractor -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-custom-input
              label="Exact Location / Floor & Grid *"
              placeholder="e.g. Tower A - Floor 08 (Beams B1-B8)"
              formControlName="location_details"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="ITP Reference Code"
              placeholder="e.g. ITP-CONC-001"
              formControlName="itp_code"
            ></app-custom-input>

            <app-searchable-select
              label="Responsible Trade Contractor"
              [options]="contractorOptions"
              formControlName="contractor_id"
              [allowCreateNew]="false"
              placeholder="Select contractor..."
            ></app-searchable-select>
          </div>

          <!-- Checklist Table Section -->
          <div class="p-5 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Work-Stage ITP Inspection Checklist
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Evaluate each quality item. Mandatory items (marked with asterisk) must pass for approval.
                </p>
              </div>

              <button
                type="button"
                (click)="addCustomChecklistItem()"
                class="px-3 py-1.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 text-xs font-medium border border-border flex items-center gap-1.5"
              >
                <i class="ri-add-line"></i> Add Check Criterion
              </button>
            </div>

            <div class="overflow-x-auto rounded-xl border border-border bg-card">
              <table class="w-full text-xs text-left">
                <thead class="bg-secondary/50 text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th class="py-2.5 px-4 w-12 text-center">#</th>
                    <th class="py-2.5 px-4">Quality Criterion</th>
                    <th class="py-2.5 px-3 w-32 text-center">Mandatory</th>
                    <th class="py-2.5 px-4 w-48 text-center">Verification Result</th>
                    <th class="py-2.5 px-4">Remarks / Specific Observations</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border">
                  <tr *ngFor="let item of checklistItems(); let i = index">
                    <td class="py-2.5 px-4 text-center font-mono text-muted-foreground">{{ i + 1 }}</td>
                    <td class="py-2.5 px-4 font-medium text-foreground">
                      <div class="flex items-center gap-1.5">
                        <span>{{ item.criterion }}</span>
                        <span *ngIf="item.is_mandatory" class="text-red-500 font-bold" title="Mandatory criterion">*</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        [ngClass]="item.is_mandatory ? 'bg-red-500/10 text-red-600 border border-red-500/20' : 'bg-secondary text-muted-foreground border border-border'"
                      >
                        {{ item.is_mandatory ? 'Mandatory' : 'Advisory' }}
                      </span>
                    </td>
                    <td class="py-2.5 px-4">
                      <div class="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          (click)="setChecklistResult(i, 'PASS')"
                          class="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                          [ngClass]="item.result === 'PASS' ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                        >
                          PASS
                        </button>
                        <button
                          type="button"
                          (click)="setChecklistResult(i, 'FAIL')"
                          class="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                          [ngClass]="item.result === 'FAIL' ? 'bg-red-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                        >
                          FAIL
                        </button>
                        <button
                          type="button"
                          (click)="setChecklistResult(i, 'NA')"
                          class="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                          [ngClass]="item.result === 'NA' ? 'bg-slate-600 text-white' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                        >
                          N/A
                        </button>
                      </div>
                    </td>
                    <td class="py-2.5 px-4">
                      <input
                        type="text"
                        [value]="item.remarks || ''"
                        (input)="updateChecklistRemark(i, $event)"
                        placeholder="e.g. 50mm cover verified, all rebar tied properly"
                        class="w-full px-2.5 py-1 text-xs rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Lab Tests & Material Test Cert URL -->
          <div class="p-5 rounded-2xl bg-secondary/30 border border-border flex flex-col gap-4">
            <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Material Test Certificates & Concrete Crushing Results
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Laboratory Test Report Ref"
                placeholder="e.g. BUET-CE-2026-4412"
                formControlName="laboratory_report_ref"
              ></app-custom-input>

              <app-custom-input
                label="Concrete Strength (PSI) - If Applicable"
                type="number"
                placeholder="e.g. 4250"
                formControlName="cube_test_strength_psi"
              ></app-custom-input>

              <app-custom-input
                label="Material Test Certificate URL"
                placeholder="https://.../mill_test_cert.pdf"
                formControlName="material_test_cert_url"
              ></app-custom-input>
            </div>
          </div>

          <!-- Verification Verdict & Inspector Approval -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <app-searchable-select
              label="Inspection Verdict *"
              [options]="verdictOptions"
              formControlName="verdict"
              [allowCreateNew]="false"
              placeholder="Select verdict..."
              [required]="true"
              (valueChange)="onVerdictChanged($event)"
            ></app-searchable-select>

            <app-custom-input
              label="Assigned Quality Inspector Name *"
              placeholder="e.g. Engr. Tanvir Ahmed (QA/QC)"
              formControlName="inspector_name"
              [required]="true"
            ></app-custom-input>

            <app-custom-input
              label="Contractor Representative Name"
              placeholder="e.g. Subcontractor Site Supervisor"
              formControlName="contractor_representative"
            ></app-custom-input>
          </div>

          <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="supervisorApprovalCheck"
                formControlName="supervisor_approved"
                class="w-5 h-5 rounded text-primary focus:ring-primary border-border"
              />
              <div>
                <label for="supervisorApprovalCheck" class="text-sm font-semibold text-foreground cursor-pointer">
                  Senior Resident Engineer Sign-Off
                </label>
                <p class="text-xs text-muted-foreground">
                  Formally sign off stage pour card or masonry clearance
                </p>
              </div>
            </div>

            <div class="text-xs text-muted-foreground">
              Request Date: <strong>{{ inspectionForm.get('inspection_request_date')?.value }}</strong>
            </div>
          </div>

          <app-custom-textarea
            label="Inspector Remarks & Corrective Directions"
            placeholder="Document required rectifications before concreting or stage progression..."
            formControlName="remarks"
            [rows]="3"
          ></app-custom-textarea>
        </form>
      </app-card-container>
    </div>
  `
})
export class InspectionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);

  inspectionId = signal<number | null>(null);
  isEditMode = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  projectOptions: { value: any; label: string }[] = [];
  contractorOptions: { value: any; label: string }[] = [];

  verdictOptions = [
    { value: 'PENDING', label: 'Pending Site Verification' },
    { value: 'PASSED', label: 'PASSED - Cleared for Next Stage' },
    { value: 'CONDITIONAL_APPROVAL', label: 'Conditional Approval (Minor Touch-up)' },
    { value: 'REJECTED', label: 'REJECTED - Non-Conformance NCR Issued' }
  ];

  checklistItems = signal<QualityChecklistItem[]>([
    { criterion: 'Rebar diameter, spacing and lap length verified against structural drawings', is_mandatory: true, result: 'PASS' },
    { criterion: 'Concrete cover blocks (50mm/75mm) placed at approved spacing', is_mandatory: true, result: 'PASS' },
    { criterion: 'Formwork shuttering joints leak-proof and staging propping plumb', is_mandatory: true, result: 'PASS' },
    { criterion: 'Concealed electrical conduits and MEP sleeves anchored and capped', is_mandatory: true, result: 'PASS' },
    { criterion: 'Debris, loose rust and foreign particles flushed out with air/water', is_mandatory: false, result: 'PASS' }
  ]);

  hasMandatoryFails = computed(() => {
    return this.checklistItems().some(i => i.is_mandatory && i.result === 'FAIL');
  });

  inspectionForm: FormGroup = this.fb.group({
    inspection_code: ['', Validators.required],
    project_id: [null, Validators.required],
    stage_category: ['REINFORCEMENT', Validators.required],
    location_details: ['', Validators.required],
    itp_code: ['ITP-REBAR-001'],
    contractor_id: [null],
    inspection_request_date: [new Date().toISOString().split('T')[0], Validators.required],
    inspection_date: [new Date().toISOString().split('T')[0]],
    inspector_name: ['Engr. Tanvir Ahmed (QA/QC)', Validators.required],
    contractor_representative: ['Site Supervisor'],
    verdict: ['PASSED', Validators.required],
    laboratory_report_ref: [''],
    cube_test_strength_psi: [null],
    material_test_cert_url: [''],
    supervisor_approved: [true],
    remarks: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadContractors();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.inspectionId.set(Number(id));
      this.isEditMode.set(true);
      this.loadInspectionDetails(Number(id));
    } else {
      const rand = Math.floor(1000 + Math.random() * 9000);
      this.inspectionForm.patchValue({
        inspection_code: `WIR-2026-${rand}`
      });
    }
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projectOptions = projs.map(p => ({ value: p.id, label: p.project_name }));
        if (projs.length && !this.inspectionForm.get('project_id')?.value) {
          this.inspectionForm.patchValue({ project_id: projs[0].id });
        }
      }
    });
  }

  loadContractors(): void {
    this.constructionService.getContractors().subscribe({
      next: (contractors) => {
        this.contractorOptions = [
          { value: null, label: 'Company In-house Workforce' },
          ...contractors.map(c => ({
            value: c.id,
            label: `${c.company_name} (${c.contractor_code})`
          }))
        ];
      }
    });
  }

  loadInspectionDetails(id: number): void {
    this.constructionService.getQualityInspectionById(id).subscribe({
      next: (insp) => {
        this.inspectionForm.patchValue({
          inspection_code: insp.inspection_code,
          project_id: insp.project_id,
          stage_category: insp.stage_category,
          location_details: insp.location_details,
          itp_code: insp.itp_code || '',
          contractor_id: insp.contractor_id,
          inspection_request_date: insp.inspection_request_date,
          inspection_date: insp.inspection_date || '',
          inspector_name: insp.inspector_name || 'QA/QC Engineer',
          contractor_representative: insp.contractor_representative || '',
          verdict: insp.verdict,
          laboratory_report_ref: insp.laboratory_report_ref || '',
          cube_test_strength_psi: insp.cube_test_strength_psi,
          material_test_cert_url: insp.material_test_cert_url || '',
          supervisor_approved: insp.supervisor_approved,
          remarks: insp.remarks || ''
        });
        if (insp.checklist_items && insp.checklist_items.length) {
          this.checklistItems.set(insp.checklist_items);
        }
      }
    });
  }

  onStageCategoryChanged(category: any): void {
    const cat = String(category || '').toUpperCase();
    if (cat === 'CONCRETE_CASTING') {
      this.checklistItems.set([
        { criterion: 'Slump test within specified workability limits (100mm - 125mm)', is_mandatory: true, result: 'PASS' },
        { criterion: 'Sampling of test cubes (minimum 6 cubes per pour) witnessed and labelled', is_mandatory: true, result: 'PASS' },
        { criterion: 'Mechanical vibrators available on standby with sufficient needle poker sizes', is_mandatory: true, result: 'PASS' },
        { criterion: 'Pour sequence and cold joint avoidance plan reviewed', is_mandatory: false, result: 'PASS' }
      ]);
      this.inspectionForm.patchValue({ itp_code: 'ITP-CONC-002' });
    } else if (cat === 'MASONRY') {
      this.checklistItems.set([
        { criterion: 'Auto-aerated block or 1st class brick water absorption and soaking verified', is_mandatory: true, result: 'PASS' },
        { criterion: 'Mortar mix ratio (1:4 or 1:6) batching monitored', is_mandatory: true, result: 'PASS' },
        { criterion: 'Plumb line and horizontal alignment checked across full wall run', is_mandatory: true, result: 'PASS' },
        { criterion: 'Lintel beam and tie column dowel bars embedded correctly', is_mandatory: true, result: 'PASS' }
      ]);
      this.inspectionForm.patchValue({ itp_code: 'ITP-MASON-001' });
    } else if (cat === 'WATERPROOFING') {
      this.checklistItems.set([
        { criterion: 'Surface preparation, grinding of honeycombs and fillet coving at corners', is_mandatory: true, result: 'PASS' },
        { criterion: 'Waterproofing membrane / polymer slurry coat thickness verified', is_mandatory: true, result: 'PASS' },
        { criterion: '48-hour continuous flood ponding test conducted without underside dampness', is_mandatory: true, result: 'PASS' }
      ]);
      this.inspectionForm.patchValue({ itp_code: 'ITP-WPROOF-001' });
    }
  }

  setChecklistResult(index: number, result: 'PASS' | 'FAIL' | 'NA'): void {
    const current = [...this.checklistItems()];
    current[index] = { ...current[index], result };
    this.checklistItems.set(current);

    if (this.hasMandatoryFails()) {
      this.inspectionForm.patchValue({ verdict: 'REJECTED' });
    }
  }

  updateChecklistRemark(index: number, event: any): void {
    const current = [...this.checklistItems()];
    current[index] = { ...current[index], remarks: event.target.value };
    this.checklistItems.set(current);
  }

  addCustomChecklistItem(): void {
    const criterion = prompt('Enter custom inspection criterion:');
    if (criterion && criterion.trim()) {
      const isMandatory = confirm('Is this a mandatory criterion for clearance?');
      this.checklistItems.update(items => [
        ...items,
        { criterion: criterion.trim(), is_mandatory: isMandatory, result: 'PASS' }
      ]);
    }
  }

  onVerdictChanged(verdict: any): void {
    if (String(verdict).toUpperCase() === 'PASSED' && this.hasMandatoryFails()) {
      alert('Violation: Cannot mark inspection as PASSED while mandatory criteria are failing!');
      this.inspectionForm.patchValue({ verdict: 'REJECTED' });
    }
  }

  saveInspection(): void {
    if (this.inspectionForm.invalid) return;

    if (this.inspectionForm.get('verdict')?.value === 'PASSED' && this.hasMandatoryFails()) {
      alert('Error: You cannot approve an inspection with failing mandatory criteria.');
      return;
    }

    this.isSaving.set(true);
    const f = this.inspectionForm.value;
    const payload: Partial<QualityInspection> = {
      inspection_code: f.inspection_code,
      project_id: Number(f.project_id),
      stage_category: f.stage_category,
      location_details: f.location_details,
      itp_code: f.itp_code || null,
      contractor_id: f.contractor_id ? Number(f.contractor_id) : null,
      inspection_request_date: f.inspection_request_date,
      inspection_date: f.inspection_date || null,
      inspector_name: f.inspector_name,
      contractor_representative: f.contractor_representative || null,
      checklist_items: this.checklistItems(),
      mandatory_checks_passed: !this.hasMandatoryFails(),
      verdict: f.verdict,
      laboratory_report_ref: f.laboratory_report_ref || null,
      cube_test_strength_psi: f.cube_test_strength_psi ? Number(f.cube_test_strength_psi) : null,
      material_test_cert_url: f.material_test_cert_url || null,
      supervisor_approved: Boolean(f.supervisor_approved),
      remarks: f.remarks || null
    };

    if (this.isEditMode() && this.inspectionId()) {
      this.constructionService.updateQualityInspection(this.inspectionId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'INSPECTIONS' } });
        },
        error: () => this.isSaving.set(false)
      });
    } else {
      this.constructionService.createQualityInspection(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/construction/safety-ncr'], { queryParams: { tab: 'INSPECTIONS' } });
        },
        error: () => this.isSaving.set(false)
      });
    }
  }
}
