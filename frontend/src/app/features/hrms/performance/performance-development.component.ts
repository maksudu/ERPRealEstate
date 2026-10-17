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

export interface PerformanceSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-performance-development',
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
            label="Appraisal Matrix"
            (btnClick)="openMatrix()"
          ></app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ New ' + currentViewMeta().title"
            (btnClick)="openActionModal()"
          ></app-custom-button>
        </div>

        <!-- Metric KPI Strip -->
        <div class="px-6 py-4 bg-slate-50/60 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total KPIs Tracked</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">142 Metrics</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Reviews In-Progress</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">68 Staff</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Training Hours</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">420 Hrs</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Promotion Recommendations</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">11 Nominees</div>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search staff, KPI code, review cycle..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <select
              [(ngModel)]="statusFilter"
              class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active / Published</option>
              <option value="PENDING">Pending Review</option>
              <option value="COMPLETED">Finalized / Approved</option>
            </select>
          </div>
        </div>

        <!-- Data table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Tracking Ref</th>
                <th class="px-4 py-3">Employee / Target</th>
                <th class="px-4 py-3">Department & Designation</th>
                <th class="px-4 py-3">Rating / Target Score</th>
                <th class="px-4 py-3">Cycle / Timeline</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">{{ item.ref }}</td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.metricName }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.dept }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.designation }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-emerald-600 dark:text-emerald-400">{{ item.score }} / 5.0</div>
                    <div class="text-[10px] text-slate-500">{{ item.weightage }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.cycle }}</div>
                    <div class="text-[10px] text-slate-500">{{ item.period }}</div>
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
                      Evaluation Form
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
        [title]="'New ' + currentViewMeta().title + ' Entry'"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Name / KPI Objective</label>
            <app-custom-input [(ngModel)]="formName" placeholder="Enter objective title or employee name"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Target Score / Weightage</label>
            <app-custom-input [(ngModel)]="formScore" placeholder="e.g. 4.5 / 100%"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Evaluation Criteria & Details</label>
            <app-custom-textarea [(ngModel)]="formNotes" placeholder="Detailed rubric, timeline and reviewer instructions"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save & Submit" (btnClick)="submitForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class PerformanceDevelopmentComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('reviews');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  formName = '';
  formScore = '';
  formNotes = '';

  viewsMeta: { [key: string]: PerformanceSubView } = {
    'kpi-setup': { id: 'kpi-setup', title: 'KPI Setup & Library', description: 'Standardized key performance indicator definitions, targets, and departmental weightages', badge: 'Performance 9.1' },
    'reviews': { id: 'reviews', title: 'Performance Review Console', description: 'Periodic employee reviews, manager grading, and performance scorecards', badge: 'Performance 9.2' },
    'cycles': { id: 'cycles', title: 'Annual & Mid-Year Appraisal Cycles', description: 'Appraisal calendar schedule, eligibility criteria, and deadline enforcement', badge: 'Performance 9.3' },
    'evaluations': { id: 'evaluations', title: 'Manager / Supervisor Evaluation', description: 'Direct supervisor ratings, qualitative feedback, and development goals', badge: 'Performance 9.4' },
    'self-assessments': { id: 'self-assessments', title: 'Employee Self-Assessment', description: 'Employee self-rating, key accomplishments, challenges, and aspirations', badge: 'Performance 9.5' },
    'training-plans': { id: 'training-plans', title: 'Corporate Training Plans', description: 'Technical construction, safety, project management and ERP software curricula', badge: 'Performance 9.6' },
    'training-attendance': { id: 'training-attendance', title: 'Training Attendance & Certifications', description: 'Session logs, trainer evaluation, and certification issuance', badge: 'Performance 9.7' },
    'skill-matrix': { id: 'skill-matrix', title: 'Staff Competency & Skill Matrix', description: 'Department-wide technical skills, proficiencies and gap analysis', badge: 'Performance 9.8' },
    'promotions': { id: 'promotions', title: 'Promotion Recommendations', description: 'Fast-track promotions, designation upgrades and succession plans', badge: 'Performance 9.9' },
    'increments': { id: 'increments', title: 'Increment Recommendations', description: 'Merit-based annual salary increment bands linked to appraisal ratings', badge: 'Performance 9.10' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['reviews'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'KPI-2026-001', name: 'Engr. Shamsul Alam', metricName: 'On-time Pouring & Concrete QC', dept: 'Civil Construction', designation: 'Project Manager', score: '4.8', weightage: 'Weight: 35%', cycle: 'FY2026 Mid-Year', period: 'Jan - Jun 2026', status: 'COMPLETED' },
    { id: 2, ref: 'KPI-2026-002', name: 'Farzana Yesmin', metricName: 'Sales Target 50cr Achievement', dept: 'Direct Sales', designation: 'Assistant Manager', score: '4.6', weightage: 'Weight: 50%', cycle: 'FY2026 Q3', period: 'Jul - Sep 2026', status: 'ACTIVE' },
    { id: 3, ref: 'TRN-8802', name: 'AutoCAD & ETABS Mastery', metricName: 'Design Competency Workshop', dept: 'Architecture', designation: 'Design Engineers', score: '4.5', weightage: '30 Contact Hours', cycle: 'Batch 2026-B', period: 'Oct 2026', status: 'ACTIVE' },
    { id: 4, ref: 'PRM-0019', name: 'Engr. Kamal Hossain', metricName: 'Promotion: Sr. Site Engr -> Asst PM', dept: 'Civil Engineering', designation: 'Senior Site Engineer', score: '4.9', weightage: 'Merit Score: 94%', cycle: 'Annual 2026', period: 'Effective Nov 2026', status: 'PENDING' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.metricName.toLowerCase().includes(q);
      const matchSt = !st || item.status === st;
      return matchQ && matchSt;
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

  openMatrix(): void {
    alert('Opening Interactive 9-Box Competency Matrix');
  }

  openActionModal(): void {
    this.formName = '';
    this.formScore = '';
    this.formNotes = '';
    this.isModalOpen.set(true);
  }

  submitForm(): void {
    if (!this.formName) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
        name: this.formName,
        metricName: this.currentViewMeta().title,
        dept: 'Engineering & Operations',
        designation: 'Specialist',
        score: this.formScore || '4.0',
        weightage: 'Standard Weight',
        cycle: 'Current Cycle',
        period: 'Q4 2026',
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Viewing Details for ${item.name} (${item.ref})\nMetric: ${item.metricName}\nRating: ${item.score}/5.0`);
  }
}
