import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConstructionService } from '../../../core/services/construction.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import { Subcontractor, WBSNode } from '../../../core/models/construction.model';
import { Project } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent
} from '../../../shared/components';

@Component({
  selector: 'app-dpr-form',
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
    <div class="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-12">
      <!-- Unified Top Header with Navigation -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/dpr"
            class="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-colors inline-flex items-center justify-center shadow-xs"
            title="Back to Daily Progress Reports"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </a>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Site Diary Operations
              </span>
              <span class="text-xs text-muted-foreground font-mono">
                {{ isEditMode() ? 'Editing DPR #' + dprId() : 'New Log Entry' }}
              </span>
            </div>
            <h1 class="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">
              {{ isEditMode() ? 'Edit Daily Progress Report (DPR)' : 'Log Daily Progress Report (DPR)' }}
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/construction/dpr"
            class="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
          >
            Cancel
          </a>
          <app-custom-button
            variant="primary"
            [disabled]="dprForm.invalid || isSaving()"
            (clicked)="saveDPR()"
          >
            <span class="flex items-center gap-2">
              @if (isSaving()) {
                <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                </svg>
                Saving...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                {{ isEditMode() ? 'Update DPR Entry' : 'Submit & Log DPR' }}
              }
            </span>
          </app-custom-button>
        </div>
      </div>

      <!-- Main Standalone Form Card -->
      <app-card-container
        [title]="'Site Activity & Daily Progress Log'"
        [subtitle]="'Structural activity progress, weather logs, concrete/steel usage, machinery and labor muster entries'"
      >
        <form [formGroup]="dprForm" class="flex flex-col gap-6">
          <!-- Section 1: Project & Location Context -->
          <div class="space-y-4">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              1. Project, Milestone & Site Conditions
            </h3>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <app-searchable-select
                label="Construction Project *"
                [options]="projectOptions"
                formControlName="project_id"
                [allowCreateNew]="false"
                placeholder="Select project..."
              >
              </app-searchable-select>

              <app-searchable-select
                label="WBS Milestone Node"
                [options]="wbsOptions"
                formControlName="wbs_node_id"
                [allowCreateNew]="false"
                placeholder="Select WBS node..."
              >
              </app-searchable-select>

              <app-custom-input
                label="Report Date *"
                type="date"
                formControlName="report_date"
              >
              </app-custom-input>

              <app-searchable-select
                label="Weather Conditions *"
                [options]="weatherOptions"
                formControlName="weather_condition_id"
                [allowCreateNew]="true"
                categoryCode="CONSTRUCTION_WEATHER"
                placeholder="Select weather..."
              >
              </app-searchable-select>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Floor / Unit Location *"
                placeholder="e.g. Tower 1 - 5th Floor Slab (Grid A1 to C4)"
                formControlName="floor_unit_location"
              >
              </app-custom-input>

              <app-custom-input
                label="Machinery Deployed"
                placeholder="e.g. 1x Putzmeister 42m Pump, 2x High-Frequency Vibrators"
                formControlName="machinery_deployed"
              >
              </app-custom-input>
            </div>

            <app-custom-textarea
              label="Structural & Civil Activities Completed Today *"
              placeholder="Detail the activities executed (e.g. Reinforcement tying for 5th floor beams, shuttering inspection, casting clearance, curing...)"
              formControlName="structural_activity_summary"
              [rows]="3"
            >
            </app-custom-textarea>
          </div>

          <!-- Section 2: Material Consumption Records -->
          <div class="space-y-4 pt-4 border-t border-border">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              2. Major Material Usage Today
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <app-custom-input
                label="Concrete Poured (CFT)"
                type="number"
                placeholder="0"
                formControlName="concrete_casting_cft"
              >
              </app-custom-input>

              <app-custom-input
                label="Steel Rod Consumed (MT)"
                type="number"
                placeholder="0.00"
                formControlName="steel_rod_consumed_mt"
              >
              </app-custom-input>

              <app-custom-input
                label="Cement Consumed (Bags)"
                type="number"
                placeholder="0"
                formControlName="cement_consumed_bags"
              >
              </app-custom-input>
            </div>
          </div>

          <!-- Section 3: Subcontractor Labor Muster Roll Table -->
          <div class="space-y-4 pt-4 border-t border-border">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                  3. Subcontractor Labor Muster Roll
                </h3>
                <p class="text-xs text-muted-foreground mt-0.5">Record headcounts and daily wage allotments per trade contractor</p>
              </div>
              <button
                type="button"
                (click)="addLaborRow()"
                class="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                + Add Trade Worker Row
              </button>
            </div>

            <div class="overflow-x-auto border border-border rounded-xl">
              <table class="w-full text-left text-xs">
                <thead class="bg-secondary/60 text-muted-foreground uppercase tracking-wider font-semibold">
                  <tr>
                    <th class="px-4 py-3">Trade Subcontractor</th>
                    <th class="px-4 py-3">Trade Specialization</th>
                    <th class="px-4 py-3 text-center w-28">Headcount</th>
                    <th class="px-4 py-3 text-right w-36">Daily Wage (BDT)</th>
                    <th class="px-4 py-3 text-right w-36">Total Wage</th>
                    <th class="px-4 py-3 text-center w-16">Remove</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border bg-card">
                  @for (ctrl of laborArray.controls; track $index) {
                    <tr [formGroup]="$any(ctrl)">
                      <td class="p-2">
                        <select
                          formControlName="contractor_id"
                          class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option [ngValue]="null">Select Subcontractor...</option>
                          @for (c of contractors(); track c.id) {
                            <option [ngValue]="c.id">{{ c.company_name }} ({{ c.contractor_code }})</option>
                          }
                        </select>
                      </td>
                      <td class="p-2">
                        <select
                          formControlName="trade_category"
                          class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="CIVIL_MASONRY">Civil & Masonry</option>
                          <option value="REBAR_TYING">Rebar Tying & Cutting</option>
                          <option value="SHUTTERING_CARPENTER">Shuttering & Formwork</option>
                          <option value="PLUMBING_SANITARY">Plumbing & Sanitary</option>
                          <option value="ELECTRICAL_CONDUITING">Electrical Conduiting</option>
                          <option value="TILE_MARBLE">Tile & Marble Work</option>
                          <option value="PAINTING_POLISH">Painting & Polishing</option>
                          <option value="GENERAL_LABOR">General Site Helper / Labor</option>
                        </select>
                      </td>
                      <td class="p-2 text-center">
                        <input
                          type="number"
                          min="1"
                          formControlName="worker_count"
                          class="w-20 px-2 py-1.5 text-center text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                      </td>
                      <td class="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          formControlName="daily_wage_rate"
                          class="w-28 px-2 py-1.5 text-right text-xs rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                      </td>
                      <td class="p-2 text-right font-mono font-semibold text-foreground">
                        BDT {{ (ctrl.get('worker_count')?.value || 0) * (ctrl.get('daily_wage_rate')?.value || 0) | number:'1.2-2' }}
                      </td>
                      <td class="p-2 text-center">
                        <button
                          type="button"
                          (click)="removeLaborRow($index)"
                          class="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove Row"
                        >
                          &times;
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-4 py-8 text-center text-muted-foreground">
                        No subcontractor labor entries added. Click "+ Add Trade Worker Row" to add daily headcounts.
                      </td>
                    </tr>
                  }
                </tbody>
                @if (laborArray.length > 0) {
                  <tfoot class="bg-secondary/40 font-semibold text-xs border-t border-border">
                    <tr>
                      <td colspan="2" class="px-4 py-2 text-muted-foreground">Muster Roll Total:</td>
                      <td class="px-4 py-2 text-center font-mono text-primary font-bold">{{ getTotalWorkers() }} Workers</td>
                      <td></td>
                      <td class="px-4 py-2 text-right font-mono text-foreground font-bold">BDT {{ getTotalWageBill() | number:'1.2-2' }}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                }
              </table>
            </div>
          </div>

          <!-- Section 4: Safety Incidents & Site Media -->
          <div class="space-y-4 pt-4 border-t border-border">
            <h3 class="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              4. Safety Incidents & Photos
            </h3>

            <div class="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
              <label class="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  formControlName="safety_incident_logged"
                  class="w-4 h-4 rounded text-rose-600 border-border focus:ring-rose-500"
                />
                <span class="text-xs font-bold text-foreground">Flag a Site Safety / Near-Miss Incident</span>
              </label>

              @if (dprForm.get('safety_incident_logged')?.value) {
                <app-custom-textarea
                  label="Safety Incident Details *"
                  placeholder="Describe incident: location, personnel involved, immediate first-aid, preventive actions..."
                  formControlName="safety_incident_notes"
                  [rows]="2"
                >
                </app-custom-textarea>
              }
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <app-custom-input
                label="Site Photo URL (CDN / Storage Link)"
                placeholder="https://storage.enterprise-erp.com/site-photos/dpr-01.jpg"
                formControlName="site_photo_url"
              >
              </app-custom-input>

              <app-custom-input
                label="Photo Description / Caption"
                placeholder="e.g. Beam B4-C4 casting completed & vibrated"
                formControlName="site_photo_caption"
              >
              </app-custom-input>
            </div>
          </div>

          <!-- Form Action Buttons -->
          <div class="pt-6 border-t border-border flex items-center justify-end gap-3">
            <a
              routerLink="/construction/dpr"
              class="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg border border-border transition-colors"
            >
              Cancel
            </a>
            <app-custom-button
              variant="primary"
              [disabled]="dprForm.invalid || isSaving()"
              (clicked)="saveDPR()"
            >
              <span class="flex items-center gap-2">
                @if (isSaving()) {
                  <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  Saving...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  {{ isEditMode() ? 'Update DPR Entry' : 'Submit & Log DPR' }}
                }
              </span>
            </app-custom-button>
          </div>
        </form>
      </app-card-container>
    </div>
  `
})
export class DprFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private constructionService = inject(ConstructionService);
  private projectService = inject(ProjectService);
  private lookupService = inject(LookupService);

  isEditMode = signal<boolean>(false);
  dprId = signal<number | null>(null);
  isSaving = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  projects = signal<Project[]>([]);
  wbsNodes = signal<WBSNode[]>([]);
  contractors = signal<Subcontractor[]>([]);

  projectOptions: { value: any; label: string }[] = [];
  wbsOptions: { value: any; label: string }[] = [];

  weatherOptions = [
    { value: 'SUNNY', label: '☀️ Sunny / Clear Weather' },
    { value: 'OVERCAST', label: '⛅ Overcast / Heavy Cloud' },
    { value: 'RAIN_LIGHT', label: '🌦️ Light Rain (Work Continued)' },
    { value: 'RAIN_HEAVY', label: '⛈️ Heavy Downpour (Work Halted)' },
    { value: 'STORMY', label: '🌪️ Storm / High Wind Alert' }
  ];

  dprForm: FormGroup = this.fb.group({
    project_id: [null, Validators.required],
    wbs_node_id: [null],
    report_date: [new Date().toISOString().split('T')[0], Validators.required],
    weather_condition_id: ['SUNNY', Validators.required],
    floor_unit_location: ['', Validators.required],
    machinery_deployed: [''],
    structural_activity_summary: ['', Validators.required],
    concrete_casting_cft: [0, [Validators.min(0)]],
    steel_rod_consumed_mt: [0, [Validators.min(0)]],
    cement_consumed_bags: [0, [Validators.min(0)]],
    safety_incident_logged: [false],
    safety_incident_notes: [''],
    site_photo_url: [''],
    site_photo_caption: [''],
    labor_entries: this.fb.array([])
  });

  get laborArray(): FormArray {
    return this.dprForm.get('labor_entries') as FormArray;
  }

  ngOnInit(): void {
    this.loadInitialMasters();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.dprId.set(id);
        this.loadDprForEdit(id);
      }
    } else {
      // Seed default labor row
      this.addLaborRow();
    }
  }

  loadInitialMasters(): void {
    this.projectService.getProjects().subscribe({
      next: (projs) => {
        this.projects.set(projs);
        this.projectOptions = projs.map(p => ({
          value: p.id,
          label: `${p.project_name} (${p.project_code || 'PRJ-' + p.id})`
        }));
      }
    });

    this.constructionService.getContractors().subscribe({
      next: (conts) => this.contractors.set(conts)
    });

    this.constructionService.getWBSNodes().subscribe({
      next: (nodes) => {
        this.wbsNodes.set(nodes);
        this.wbsOptions = nodes.map(n => ({
          value: n.id,
          label: `${n.node_code} - ${n.node_name}`
        }));
      }
    });
  }

  loadDprForEdit(id: number): void {
    this.isLoading.set(true);
    this.constructionService.getDPRReportById(id).subscribe({
      next: (dpr) => {
        this.isLoading.set(false);
        this.dprForm.patchValue({
          project_id: dpr.project_id,
          wbs_node_id: dpr.wbs_node_id,
          report_date: dpr.report_date,
          weather_condition_id: dpr.weather_condition_id,
          floor_unit_location: dpr.floor_unit_location,
          machinery_deployed: dpr.machinery_deployed,
          structural_activity_summary: dpr.structural_activity_summary,
          concrete_casting_cft: dpr.concrete_casting_cft,
          steel_rod_consumed_mt: dpr.steel_rod_consumed_mt,
          cement_consumed_bags: dpr.cement_consumed_bags,
          safety_incident_logged: dpr.safety_incident_logged,
          safety_incident_notes: dpr.safety_incident_notes
        });

        // Patch photos if any
        if (dpr.site_photos && dpr.site_photos.length > 0) {
          this.dprForm.patchValue({
            site_photo_url: dpr.site_photos[0].url || '',
            site_photo_caption: dpr.site_photos[0].caption || ''
          });
        }

        // Patch labor muster entries
        this.laborArray.clear();
        if (dpr.labor_entries && dpr.labor_entries.length > 0) {
          for (const l of dpr.labor_entries) {
            this.laborArray.push(this.fb.group({
              contractor_id: [l.contractor_id],
              trade_category: [l.trade_category || 'CIVIL_MASONRY', Validators.required],
              worker_count: [l.worker_count || 1, [Validators.required, Validators.min(1)]],
              daily_wage_rate: [l.daily_wage_rate || 800, [Validators.required, Validators.min(0)]]
            }));
          }
        } else {
          this.addLaborRow();
        }
      },
      error: () => this.isLoading.set(false)
    });
  }

  addLaborRow(): void {
    this.laborArray.push(this.fb.group({
      contractor_id: [this.contractors().length > 0 ? this.contractors()[0].id : null],
      trade_category: ['CIVIL_MASONRY', Validators.required],
      worker_count: [4, [Validators.required, Validators.min(1)]],
      daily_wage_rate: [800, [Validators.required, Validators.min(0)]]
    }));
  }

  removeLaborRow(index: number): void {
    this.laborArray.removeAt(index);
  }

  getTotalWorkers(): number {
    return this.laborArray.controls.reduce((acc, ctrl) => acc + (Number(ctrl.get('worker_count')?.value) || 0), 0);
  }

  getTotalWageBill(): number {
    return this.laborArray.controls.reduce((acc, ctrl) => {
      const count = Number(ctrl.get('worker_count')?.value) || 0;
      const rate = Number(ctrl.get('daily_wage_rate')?.value) || 0;
      return acc + (count * rate);
    }, 0);
  }

  saveDPR(): void {
    if (this.dprForm.invalid) {
      this.dprForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const formVal = this.dprForm.value;

    const photos: { url: string; caption: string }[] = [];
    if (formVal.site_photo_url) {
      photos.push({
        url: formVal.site_photo_url,
        caption: formVal.site_photo_caption || 'Site Activity'
      });
    }

    const payload = {
      project_id: Number(formVal.project_id),
      wbs_node_id: formVal.wbs_node_id ? Number(formVal.wbs_node_id) : null,
      report_date: formVal.report_date,
      weather_condition_id: formVal.weather_condition_id,
      floor_unit_location: formVal.floor_unit_location,
      machinery_deployed: formVal.machinery_deployed,
      structural_activity_summary: formVal.structural_activity_summary,
      concrete_casting_cft: Number(formVal.concrete_casting_cft) || 0,
      steel_rod_consumed_mt: Number(formVal.steel_rod_consumed_mt) || 0,
      cement_consumed_bags: Number(formVal.cement_consumed_bags) || 0,
      safety_incident_logged: Boolean(formVal.safety_incident_logged),
      safety_incident_notes: formVal.safety_incident_notes,
      site_photos: photos,
      labor_entries: formVal.labor_entries.map((l: any) => ({
        contractor_id: l.contractor_id ? Number(l.contractor_id) : null,
        trade_category: l.trade_category,
        worker_count: Number(l.worker_count) || 1,
        daily_wage_rate: Number(l.daily_wage_rate) || 800
      }))
    };

    const action$ = this.isEditMode() && this.dprId()
      ? this.constructionService.updateDPRReport(this.dprId()!, payload)
      : this.constructionService.createDPRReport(payload);

    action$.subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/construction/dpr']);
      },
      error: () => this.isSaving.set(false)
    });
  }
}
