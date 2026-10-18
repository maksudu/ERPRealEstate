import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';

export interface ProjectHrSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-project-hr',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="space-y-6">
      <app-card-container
        [title]="currentViewMeta().title"
        [subtitle]="currentViewMeta().description"
        [badge]="currentViewMeta().badge"
        paddingClass="p-0"
      >
        <div card-actions class="flex items-center gap-2">
          <app-custom-button
            variant="outline"
            size="sm"
            label="Project Cost Rollup"
            (btnClick)="openCostRollup()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ Allocate ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Deployed Site Staff</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">124 Personnel</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Project Payroll (M)</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">৳ 5.82 M</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Timesheet Logged Hours</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">22,400 Hrs</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Shared Engineers Ratio</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">18 Engineers</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search staff, project name, cost code..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Projects</option>
              <option value="ACTIVE">Grand Emerald Tower (Gulshan)</option>
              <option value="PENDING">Skyline Heights (Banani)</option>
              <option value="COMPLETED">Sapphire Residency (Dhanmondi)</option>
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Allocation Ref</th>
                <th class="px-4 py-3">Employee / Role</th>
                <th class="px-4 py-3">Assigned Real Estate Project</th>
                <th class="px-4 py-3">Cost Weight / Proportion</th>
                <th class="px-4 py-3">Monthly Allocated Cost</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.employeeName }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.role }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-semibold text-slate-900 dark:text-slate-100">{{ item.projectName }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.costCenter }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-emerald-600 dark:text-emerald-400">{{ item.allocationPct }}% Dedicated</div>
                    <div class="text-[10px] text-slate-500">{{ item.timesheetHours }} Hrs / month</div>
                  </td>
                  <td class="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                    ৳ {{ item.cost | number }}
                  </td>
                  <td class="px-4 py-3">
                    <app-status-badge [status]="item.status"></app-status-badge>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      (click)="viewDetails(item)"
                      class="px-2.5 py-1 text-xs font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                    >
                      Cost Breakdown
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'Allocate ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Staff Employee</label>
            <app-custom-input [(ngModel)]="formEmp" placeholder="Employee Name & Code"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Project / Site Name</label>
            <app-custom-input [(ngModel)]="formProject" placeholder="e.g. Grand Emerald Tower (Gulshan)"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Allocation Percentage (1-100%) & Notes</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Cost allocation split, duration and billing code"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save Allocation" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class ProjectHrAllocationComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('assignments');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formEmp = '';
  formProject = '';
  formNotes = '';

  viewsMeta: { [key: string]: ProjectHrSubView } = {
    'assignments': { id: 'assignments', title: 'Project Employee Assignment', description: 'Deployment of engineers, site supervisors, storekeepers and safety officers to project sites', badge: 'Project HR 14.1' },
    'rosters': { id: 'rosters', title: 'Site Staff Shift & Duty Roster', description: 'Site duty shifts, day/night concrete pouring rosters, and weekly off scheduling', badge: 'Project HR 14.2' },
    'labour-allocation': { id: 'labour-allocation', title: 'Subcontractor Labour Allocation', description: 'Headcount distribution across construction tasks (Formwork, Steel, Masonry, Plumbing)', badge: 'Project HR 14.3' },
    'timesheets': { id: 'timesheets', title: 'Project-wise Employee Timesheets', description: 'Daily hours logged by technical staff against WBS and BOQ construction milestones', badge: 'Project HR 14.4' },
    'overtime': { id: 'overtime', title: 'Project-Specific Overtime Tracking', description: 'Site overtime hours, slab casting overtime and direct project cost charging', badge: 'Project HR 14.5' },
    'shared-allocation': { id: 'shared-allocation', title: 'Shared Employee Proportionate Allocation', description: 'Cost-sharing matrix for engineers and architects divided across multiple projects', badge: 'Project HR 14.6' },
    'payroll-costs': { id: 'payroll-costs', title: 'Project Payroll Cost Accounting', description: 'Direct capitalization of site salaries into project WIP (Work-in-Progress) ledger', badge: 'Project HR 14.7' },
    'dept-costs': { id: 'dept-costs', title: 'Department Cost Allocation & Overhead', description: 'Apportionment of head office engineering and design payroll overheads into active projects', badge: 'Project HR 14.8' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['assignments'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'PA-2026-01', employeeName: 'Engr. Tareq Hasan', role: 'Project In-Charge', projectName: 'Grand Emerald Tower (Gulshan)', costCenter: 'CC-GET-01', allocationPct: 100, timesheetHours: 208, cost: 95000, status: 'ACTIVE' },
    { id: 2, ref: 'PA-2026-02', employeeName: 'Ar. Farzana Sultana', role: 'Chief Architect (Shared)', projectName: 'Skyline Heights (50%) & Emerald (50%)', costCenter: 'CC-SH-02', allocationPct: 50, timesheetHours: 104, cost: 65000, status: 'ACTIVE' },
    { id: 3, ref: 'PA-2026-03', employeeName: 'Kamal Hossain', role: 'Quality Control Engineer', projectName: 'Sapphire Residency', costCenter: 'CC-SR-03', allocationPct: 100, timesheetHours: 215, cost: 58000, status: 'ACTIVE' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    return this.items().filter(item => {
      return !q || item.employeeName.toLowerCase().includes(q) || item.projectName.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q);
    });
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const path = segments[segments.length - 1]?.path;
      if (path && this.viewsMeta[path]) {
        this.currentSubView.set(path);
      }
    });
    this.route.queryParamMap.subscribe(params => {
      const view = params.get('view');
      if (view && this.viewsMeta[view]) {
        this.currentSubView.set(view);
      }
    });
  }

  openCostRollup(): void {
    alert('Opening Interactive Project WIP Payroll Cost Capitalization Rollup');
  }

  openActionModal(): void {
    this.formEmp = '';
    this.formProject = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formEmp) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'PA-' + Math.floor(1000 + Math.random() * 9000),
        employeeName: this.formEmp,
        role: 'Site Specialist',
        projectName: this.formProject || 'Assigned Project',
        costCenter: 'CC-GEN-01',
        allocationPct: 100,
        timesheetHours: 200,
        cost: 60000,
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Cost Details for ${item.employeeName}\nProject: ${item.projectName}\nMonthly Cost: ৳ ${item.cost}`);
  }
}
