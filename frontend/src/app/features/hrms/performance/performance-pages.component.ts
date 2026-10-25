import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  CardContainerComponent,
  CustomButtonComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  SearchableSelectComponent,
  SelectOption,
  StatusBadgeComponent,
} from '../../../shared/components';
import { LookupService } from '../../../core/services/lookup.service';
import { HrmsService } from '../hrms.service';
import {
  PerformancePayload,
  PerformanceRecord,
  PerformanceService,
  PerformanceType,
} from './performance.service';

export interface PerformanceField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'money' | 'select';
  categoryCode?: string;
  optionsType?: 'departments' | 'designations' | 'employees' | 'training-courses';
  options?: SelectOption[];
  allowCreateNew?: boolean;
  createRoute?: string;
  hint?: string;
}

export interface PerformancePageConfig {
  type: PerformanceType;
  title: string;
  description: string;
  eyebrow: string;
  action: string;
  requiresEmployee: boolean;
  fields: PerformanceField[];
}

export const performanceFiscalYear = (value = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(value);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
};

export const PAGE_CONFIG: Record<PerformanceType, PerformancePageConfig> = {
  'kpi-setup': {
    type: 'kpi-setup',
    title: 'KPI Library & Framework',
    description: 'Set measurable, weighted key performance indicators aligned with project milestones and corporate objectives.',
    eyebrow: '01 / PERFORMANCE FRAMEWORK',
    action: 'New KPI Metric',
    requiresEmployee: false,
    fields: [
      { key: 'metric_code', label: 'KPI Reference Code', hint: 'e.g. KPI-SITE-001, KPI-FIN-004' },
      { key: 'department', label: 'Department / Division', type: 'select', optionsType: 'departments', createRoute: '/hrms/departments/new', allowCreateNew: true },
      { key: 'unit', label: 'Measurement Unit', type: 'select', categoryCode: 'HR_PERF_UNIT', allowCreateNew: true },
      { key: 'target_value', label: 'Target Value', type: 'number', hint: 'Numerical target to achieve' },
      { key: 'weight_pct', label: 'Weight (%)', type: 'number', hint: 'Weighted contribution (0–100%)' },
      { key: 'cadence', label: 'Measurement Cadence', type: 'select', categoryCode: 'HR_PERF_CADENCE', allowCreateNew: true },
      { key: 'guidance', label: 'Scoring Guidance & Objective', type: 'textarea', hint: 'Describe how performance against this KPI will be objectively assessed.' },
    ],
  },
  reviews: {
    type: 'reviews',
    title: 'Performance Review Console',
    description: 'Manage comprehensive appraisal reviews across the July–June performance year for all workforce tiers.',
    eyebrow: '02 / APPRAISALS',
    action: 'Start Review',
    requiresEmployee: true,
    fields: [
      { key: 'review_stage', label: 'Appraisal Review Stage', type: 'select', categoryCode: 'HR_PERF_REVIEW_STAGE', allowCreateNew: true },
      { key: 'reviewer_name', label: 'Appraising Reviewer', type: 'select', optionsType: 'employees' },
      { key: 'strengths', label: 'Key Strengths & Notable Achievements', type: 'textarea', hint: 'Highlight quantifiable project achievements and positive leadership impact.' },
      { key: 'development_needs', label: 'Development Priorities & Next Milestones', type: 'textarea', hint: 'Specify improvement areas, training interventions, or project goals.' },
    ],
  },
  cycles: {
    type: 'cycles',
    title: 'Appraisal Cycles & Windows',
    description: 'Configure and publish corporate review windows, submission deadlines, and eligibility criteria.',
    eyebrow: '03 / CALENDAR & ELIGIBILITY',
    action: 'Create Cycle',
    requiresEmployee: false,
    fields: [
      { key: 'cycle_kind', label: 'Appraisal Cycle Type', type: 'select', categoryCode: 'HR_PERF_CYCLE_KIND', allowCreateNew: true },
      { key: 'opening_date', label: 'Cycle Opening Date', type: 'date' },
      { key: 'closing_date', label: 'Cycle Closing Date', type: 'date' },
      { key: 'eligible_population', label: 'Eligible Population Rule', type: 'select', categoryCode: 'HR_PERF_ELIGIBLE_POPULATION', allowCreateNew: true },
      { key: 'approval_deadline', label: 'Final Management Approval Deadline', type: 'date' },
      { key: 'instructions', label: 'Cycle Instructions & Policy Notes', type: 'textarea', hint: 'Guidelines for managers, self-rating guidelines, and deadline penalties.' },
    ],
  },
  evaluations: {
    type: 'evaluations',
    title: 'Manager Evaluations',
    description: 'Structured manager assessments evaluating project deliverables, technical conduct, and KPI outcomes.',
    eyebrow: '04 / SUPERVISOR INPUT',
    action: 'Record Evaluation',
    requiresEmployee: true,
    fields: [
      { key: 'reviewer_name', label: 'Evaluating Supervisor / HOD', type: 'select', optionsType: 'employees' },
      { key: 'delivery_evidence', label: 'Deliverables & Execution Evidence', type: 'textarea', hint: 'Document site milestones, quality certifications, or financial deliverables met.' },
      { key: 'teamwork_notes', label: 'Teamwork, Safety & Professional Conduct', type: 'textarea', hint: 'Assessment of collaboration, safety compliance on site, and organizational values.' },
      { key: 'next_quarter_goal', label: 'Next Quarter Focus & Growth Target', type: 'textarea', hint: 'Agreed target milestones for the upcoming review quarter.' },
    ],
  },
  'self-assessments': {
    type: 'self-assessments',
    title: 'Employee Self-Assessments',
    description: 'Enable employees to reflect on key accomplishments, project challenges, and career aspirations.',
    eyebrow: '05 / EMPLOYEE VOICE',
    action: 'New Self-Assessment',
    requiresEmployee: true,
    fields: [
      { key: 'key_achievements', label: 'Key Accomplishments & Delivered Value', type: 'textarea', hint: 'What key contributions or solutions did you deliver during this fiscal period?' },
      { key: 'challenges', label: 'Obstacles Encountered & Support Needed', type: 'textarea', hint: 'What bottlenecks impacted delivery and what enablement do you require?' },
      { key: 'career_aspirations', label: 'Career Aspirations & Leadership Interest', type: 'textarea', hint: 'Where do you see your career progression within the BlueOceans group?' },
      { key: 'learning_request', label: 'Requested Training, Certifications, or Tools', type: 'textarea', hint: 'Technical skills, software licenses, or certifications requested.' },
    ],
  },
  'training-plans': {
    type: 'training-plans',
    title: 'Training Plans & Curricula',
    description: 'Plan institutional and practical learning programs for engineering, safety, compliance, and corporate skills.',
    eyebrow: '06 / LEARNING & DEVELOPMENT',
    action: 'Plan Training',
    requiresEmployee: false,
    fields: [
      { key: 'curriculum', label: 'Course Curriculum / Module Title', hint: 'e.g. High-Rise Construction Safety & Scaffold Inspection' },
      { key: 'audience', label: 'Target Audience / Department', type: 'select', optionsType: 'departments', createRoute: '/hrms/departments/new', allowCreateNew: true },
      { key: 'training_mode', label: 'Delivery Mode', type: 'select', categoryCode: 'HR_PERF_TRAINING_MODE', allowCreateNew: true },
      { key: 'trainer', label: 'Trainer / Training Institution Provider', hint: 'e.g. BUET Bureau of Research, Internal Safety Lead' },
      { key: 'contact_hours', label: 'Total Training Contact Hours', type: 'number', hint: 'Duration in classroom or practical hours' },
      { key: 'budget_bdt', label: 'Allocated Budget (BDT ৳)', type: 'money', hint: 'Cost for training materials, venue, and instructor' },
      { key: 'learning_outcome', label: 'Expected Job Competency Outcome', type: 'textarea', hint: 'Measurable standard expected after course completion.' },
    ],
  },
  'training-attendance': {
    type: 'training-attendance',
    title: 'Training Attendance & Certifications',
    description: 'Log workforce participation, training completion records, and formal credentials earned.',
    eyebrow: '07 / COMPLETION RECORDS',
    action: 'Log Attendance',
    requiresEmployee: true,
    fields: [
      { key: 'course_name', label: 'Training Course / Session Title', type: 'select', optionsType: 'training-courses', allowCreateNew: true, hint: 'Select from planned courses or add a new training course' },
      { key: 'trainer', label: 'Trainer / Certifying Body', hint: 'Instructor or certifying organization' },
      { key: 'hours_attended', label: 'Total Hours Attended', type: 'number' },
      { key: 'completion_result', label: 'Completion Result', type: 'select', categoryCode: 'HR_PERF_COMPLETION_RESULT', allowCreateNew: true },
      { key: 'certificate_reference', label: 'Certificate Reference / Credential ID', hint: 'Official certificate tracking number' },
      { key: 'feedback', label: 'Participant Feedback & Assessment', type: 'textarea', hint: 'Participant evaluation of program quality and applicability.' },
    ],
  },
  'skill-matrix': {
    type: 'skill-matrix',
    title: 'Competency & Skill Matrix',
    description: 'Benchmark individual competencies against job grade requirements to drive targeted career development.',
    eyebrow: '08 / CAPABILITY & SUCCESSION',
    action: 'Add Competency Record',
    requiresEmployee: true,
    fields: [
      { key: 'skill_name', label: 'Competency / Technical Skill Name', type: 'select', categoryCode: 'HR_PERF_SKILL_NAME', allowCreateNew: true, hint: 'Select from standard competencies or enter custom skill' },
      { key: 'proficiency', label: 'Current Proficiency Level', type: 'select', categoryCode: 'HR_PERF_SKILL_PROFICIENCY', allowCreateNew: true },
      { key: 'target_proficiency', label: 'Required Target Proficiency', type: 'select', categoryCode: 'HR_PERF_SKILL_PROFICIENCY', allowCreateNew: true },
      { key: 'evidence', label: 'Evidence / Verified Project Artifacts', type: 'textarea', hint: 'Details of certifications, projects delivered, or technical assessments.' },
      { key: 'gap_action', label: 'Recommended Action to Bridge Gap', type: 'textarea', hint: 'Planned mentoring, shadowing, or certification assignment.' },
    ],
  },
  promotions: {
    type: 'promotions',
    title: 'Promotion Recommendations',
    description: 'Formulate substantiated cases for employee promotion and job grade progression.',
    eyebrow: '09 / TALENT ADVANCEMENT',
    action: 'Recommend Promotion',
    requiresEmployee: true,
    fields: [
      { key: 'current_designation', label: 'Current Designation', type: 'select', optionsType: 'designations', createRoute: '/hrms/designations/new' },
      { key: 'proposed_designation', label: 'Proposed Designation', type: 'select', optionsType: 'designations', createRoute: '/hrms/designations/new', allowCreateNew: true },
      { key: 'proposed_grade', label: 'Proposed Grade Band', type: 'select', categoryCode: 'HR_PERF_PROMOTION_GRADE', allowCreateNew: true },
      { key: 'readiness_evidence', label: 'Readiness & Justification Evidence', type: 'textarea', hint: 'Demonstrated capability to take on higher accountability and team oversight.' },
      { key: 'effective_date', label: 'Proposed Effective Date', type: 'date' },
    ],
  },
  increments: {
    type: 'increments',
    title: 'Merit Increment Recommendations',
    description: 'Calculate and recommend merit-based annual salary adjustments based on appraisal performance bands.',
    eyebrow: '10 / COMPENSATION REVIEW',
    action: 'Recommend Increment',
    requiresEmployee: true,
    fields: [
      { key: 'current_salary_bdt', label: 'Current Monthly Gross Salary (BDT ৳)', type: 'money' },
      { key: 'recommended_increment_pct', label: 'Recommended Increment (%)', type: 'number', hint: 'Percentage increase based on appraisal outcome' },
      { key: 'recommended_gross_bdt', label: 'New Proposed Monthly Gross (BDT ৳)', type: 'money' },
      { key: 'merit_band', label: 'Merit Rating Band', type: 'select', categoryCode: 'HR_PERF_MERIT_BAND', allowCreateNew: true },
      { key: 'recommendation_rationale', label: 'Merit Recommendation Rationale', type: 'textarea', hint: 'Detailed business justification for the proposed salary adjustment.' },
    ],
  },
};

@Component({
  selector: 'app-performance-workspace',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomButtonComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <app-card-container
        [title]="config.title"
        [subtitle]="config.description"
        [badge]="config.eyebrow"
        paddingClass="p-0"
      >
        <!-- Card Header Actions -->
        <div card-actions class="flex items-center gap-2">
          @if (mode === 'list') {
            <app-custom-button
              variant="primary"
              size="sm"
              [label]="'+ ' + config.action"
              (btnClick)="navigateNew()"
            ></app-custom-button>
          } @else {
            <app-custom-button
              variant="secondary"
              size="sm"
              label="← Back to List"
              (btnClick)="navigateList()"
            ></app-custom-button>
          }
        </div>

        <!-- Feedback Messages -->
        @if (successMessage) {
          <div class="mx-4 sm:mx-6 mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">✓</span>
              <span class="font-medium">{{ successMessage }}</span>
            </div>
            <button type="button" (click)="successMessage = ''" class="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 font-bold ml-2">✕</button>
          </div>
        }
        @if (errorMessage) {
          <div class="mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">✕</span>
              <span class="font-medium">{{ errorMessage }}</span>
            </div>
            <button type="button" (click)="errorMessage = ''" class="text-rose-600 hover:text-rose-800 dark:text-rose-400 font-bold ml-2">✕</button>
          </div>
        }

        <!-- 1. LIST MODE -->
        @if (mode === 'list') {
          <div class="p-4 sm:p-6 space-y-4">
            <!-- Search & Dynamic Filters -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div class="flex-1 flex items-center gap-2 min-w-0">
                <div class="relative flex-1">
                  <input
                    type="text"
                    [(ngModel)]="searchInput"
                    (keyup.enter)="applySearch()"
                    placeholder="Search by reference, title, or employee..."
                    class="erp-input text-xs w-full pl-8"
                  />
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                </div>
                <app-custom-button
                  variant="secondary"
                  size="sm"
                  label="Search"
                  (btnClick)="applySearch()"
                ></app-custom-button>
                @if (searchTerm) {
                  <button
                    type="button"
                    (click)="clearSearch()"
                    class="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 underline whitespace-nowrap ml-1"
                  >
                    Clear
                  </button>
                }
              </div>

              <!-- Status Dropdown (Loaded via API) -->
              <div class="flex items-center gap-2 shrink-0">
                <div class="w-48">
                  <app-searchable-select
                    [options]="statusFilterOptions"
                    [allowCreateNew]="false"
                    [(ngModel)]="statusFilter"
                    (ngModelChange)="onFilterChange()"
                    placeholder="All Statuses"
                  ></app-searchable-select>
                </div>
              </div>
            </div>

            <!-- Data Table / Empty / Loading -->
            @if (loading) {
              <div class="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mb-2"></div>
                <p>Loading performance records from API...</p>
              </div>
            } @else if (records.length === 0) {
              <div class="py-16 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8">
                <div class="w-12 h-12 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-xl mb-3">
                  📋
                </div>
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">No records found</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                  {{ searchTerm ? 'No performance records matched your search query.' : 'No records have been recorded for this performance area yet.' }}
                </p>
                <app-custom-button
                  variant="primary"
                  size="sm"
                  [label]="'+ ' + config.action"
                  (btnClick)="navigateNew()"
                ></app-custom-button>
              </div>
            } @else {
              <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                      <tr>
                        <th class="py-3 px-4">Reference &amp; Title</th>
                        <th class="py-3 px-4">Employee / Target</th>
                        <th class="py-3 px-4">Fiscal Period</th>
                        <th class="py-3 px-4">Rating / Score</th>
                        <th class="py-3 px-4">Status</th>
                        <th class="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60">
                      @for (record of records; track record.id) {
                        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                          <td class="py-3 px-4">
                            <span class="font-mono text-[11px] text-amber-600 dark:text-amber-400 block font-semibold">{{ record.reference }}</span>
                            <strong class="text-slate-900 dark:text-slate-100 text-xs">{{ record.title }}</strong>
                          </td>
                          <td class="py-3 px-4">
                            @if (record.employee_name) {
                              <div class="font-medium text-slate-900 dark:text-slate-100">{{ record.employee_name }}</div>
                              <div class="text-[10px] text-slate-500 font-mono">{{ record.employee_code }}</div>
                            } @else {
                              <span class="text-slate-500 italic">Department-wide</span>
                            }
                          </td>
                          <td class="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {{ record.fiscal_year || '—' }}
                          </td>
                          <td class="py-3 px-4">
                            @if (record.score !== null) {
                              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                ★ {{ record.score }} / 5.0
                              </span>
                            } @else {
                              <span class="text-slate-400">—</span>
                            }
                          </td>
                          <td class="py-3 px-4">
                            <app-status-badge [status]="record.status"></app-status-badge>
                          </td>
                          <td class="py-3 px-4 text-right">
                            <div class="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                (click)="navigateDetail(record.id)"
                                class="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                View
                              </button>
                              @if (record.status === 'DRAFT' || record.status === 'RETURNED') {
                                <button
                                  type="button"
                                  (click)="navigateEdit(record.id)"
                                  class="px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-lg border border-amber-200 dark:border-amber-800"
                                >
                                  Edit
                                </button>
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Pagination Bar -->
                <div class="px-4 py-3 bg-slate-50/70 dark:bg-slate-850/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                  <div>
                    Showing <strong class="text-slate-900 dark:text-slate-100">{{ offset + 1 }}</strong> to
                    <strong class="text-slate-900 dark:text-slate-100">{{ Math.min(offset + pageSize, total) }}</strong> of
                    <strong class="text-slate-900 dark:text-slate-100">{{ total }}</strong> records
                  </div>
                  <div class="flex items-center gap-2">
                    <app-custom-button
                      variant="secondary"
                      size="sm"
                      label="Previous"
                      [disabled]="offset === 0"
                      (btnClick)="changePage(-1)"
                    ></app-custom-button>
                    <app-custom-button
                      variant="secondary"
                      size="sm"
                      label="Next"
                      [disabled]="offset + pageSize >= total"
                      (btnClick)="changePage(1)"
                    ></app-custom-button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- 2. DETAIL MODE -->
        @else if (mode === 'detail') {
          @if (loading) {
            <div class="py-16 text-center text-xs text-slate-500">
              <div class="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mb-2"></div>
              <p>Loading record details...</p>
            </div>
          } @else if (record) {
            <div class="p-4 sm:p-6 space-y-6">
              <!-- Detail Header Banner -->
              <div class="p-4 bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">{{ record.reference }}</span>
                    <span class="text-slate-300 dark:text-slate-700">·</span>
                    <span class="text-xs text-slate-500">{{ record.fiscal_year || 'FY Not Specified' }}</span>
                  </div>
                  <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ record.title }}</h2>
                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ record.employee_name ? record.employee_name + ' (' + record.employee_code + ')' : 'Department-Wide Metric' }}
                  </p>
                </div>
                <div class="flex items-center gap-3">
                  <app-status-badge [status]="record.status" size="md"></app-status-badge>
                  @if (record.score !== null) {
                    <div class="px-3 py-1.5 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 text-xs font-bold">
                      Rating: {{ record.score }} / 5.0
                    </div>
                  }
                </div>
              </div>

              <!-- Fact Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Period Range</span>
                  <strong class="text-xs text-slate-800 dark:text-slate-200 block">
                    {{ record.period_start ? (record.period_start | date:'d MMM y') : '—' }} –
                    {{ record.period_end ? (record.period_end | date:'d MMM y') : '—' }}
                  </strong>
                </div>
                <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Due Date</span>
                  <strong class="text-xs text-slate-800 dark:text-slate-200 block">
                    {{ record.due_date ? (record.due_date | date:'d MMM y') : 'Not Set' }}
                  </strong>
                </div>
                <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Submitted At</span>
                  <strong class="text-xs text-slate-800 dark:text-slate-200 block font-mono">
                    {{ record.created_at ? (record.created_at | date:'d MMM y, h:mm a') : '—' }}
                  </strong>
                </div>
                <div class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                  <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Last Updated</span>
                  <strong class="text-xs text-slate-800 dark:text-slate-200 block font-mono">
                    {{ record.updated_at ? (record.updated_at | date:'d MMM y, h:mm a') : '—' }}
                  </strong>
                </div>
              </div>

              <!-- Specific Fields Grid -->
              <div class="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                  Performance Specifics &amp; Evidence
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (field of config.fields; track field.key) {
                    <div [class.col-span-full]="field.type === 'textarea'" class="p-3 bg-slate-50/60 dark:bg-slate-850/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-0.5">{{ field.label }}</span>
                      <div class="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                        {{ detailValue(field) }}
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Actions Bar -->
              <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <app-custom-button
                  variant="secondary"
                  size="sm"
                  label="← Back to Workspace"
                  (btnClick)="navigateList()"
                ></app-custom-button>

                <div class="flex items-center gap-2">
                  @if (record.status === 'DRAFT' || record.status === 'RETURNED') {
                    <app-custom-button
                      variant="outline"
                      size="sm"
                      label="Edit Record"
                      (btnClick)="navigateEdit(record.id)"
                    ></app-custom-button>
                    <app-custom-button
                      variant="danger"
                      size="sm"
                      label="Delete Draft"
                      [disabled]="saving"
                      (btnClick)="deleteRecord()"
                    ></app-custom-button>
                    <app-custom-button
                      variant="primary"
                      size="sm"
                      label="Submit for Review"
                      [disabled]="saving"
                      (btnClick)="transition('SUBMIT')"
                    ></app-custom-button>
                  }
                  @if (record.status === 'SUBMITTED') {
                    <app-custom-button
                      variant="outline"
                      size="sm"
                      label="Return for Revision"
                      [disabled]="saving"
                      (btnClick)="transition('RETURN')"
                    ></app-custom-button>
                    <app-custom-button
                      variant="danger"
                      size="sm"
                      label="Reject"
                      [disabled]="saving"
                      (btnClick)="transition('REJECT')"
                    ></app-custom-button>
                    <app-custom-button
                      variant="primary"
                      size="sm"
                      [label]="(recordType === 'promotions' || recordType === 'increments') ? 'Approve Recommendation' : 'Approve Record'"
                      [disabled]="saving"
                      (btnClick)="transition('APPROVE')"
                    ></app-custom-button>
                  }
                </div>
              </div>
            </div>
          }
        }

        <!-- 3. FORM MODE (NEW / EDIT) -->
        @else {
          <form (ngSubmit)="saveRecord()" class="p-4 sm:p-6 space-y-6">
            <div class="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <span class="text-[10px] font-bold tracking-wider text-amber-600 uppercase">
                  {{ mode === 'edit' ? 'MODIFY PERFORMANCE RECORD' : 'CREATE NEW RECORD' }}
                </span>
                <h2 class="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {{ mode === 'edit' ? 'Update ' + config.title : 'New ' + config.title }}
                </h2>
              </div>
              <span class="text-xs text-slate-500 font-mono">
                Fiscal Year {{ form.fiscal_year }}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Record Title (Wide) -->
              <div class="col-span-full">
                <app-custom-input
                  label="Record Title / Core Objective"
                  [required]="true"
                  [(ngModel)]="form.title"
                  name="title"
                  placeholder="e.g. FY26 Quality Safety & Handover KPI"
                ></app-custom-input>
              </div>

              <!-- Employee Selector (if required) - Loaded via API -->
              @if (config.requiresEmployee) {
                <div class="col-span-full">
                  <div class="flex items-center justify-between mb-1.5">
                    <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                      Target Employee <span class="text-rose-500 font-bold">*</span>
                    </label>
                    <a routerLink="/hrms/employees/new" target="_blank" class="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <span>+ Add New Employee</span>
                    </a>
                  </div>
                  <app-searchable-select
                    name="employee_id"
                    [(ngModel)]="form.employee_id"
                    [options]="employeeOptions"
                    [required]="true"
                    [allowCreateNew]="false"
                    placeholder="Search employee by name or employee code..."
                  ></app-searchable-select>
                  @if (!employeeOptions.length && !employeeLoading) {
                    <p class="mt-1 text-xs text-rose-500">{{ employeeError || 'No active employees found in directory.' }}</p>
                  }
                </div>
              }

              <!-- Fiscal Year Dropdown (Loaded via API) -->
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                    Bangladesh Financial Year (July–June) <span class="text-rose-500 font-bold">*</span>
                  </label>
                  <a routerLink="/settings/lookups" target="_blank" class="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <span>+ Add Year</span>
                  </a>
                </div>
                <app-searchable-select
                  name="fiscal_year"
                  categoryCode="HR_FISCAL_YEAR"
                  [(ngModel)]="form.fiscal_year"
                  [options]="fiscalYearOptions"
                  [required]="true"
                  [allowCreateNew]="true"
                  placeholder="Select or enter fiscal year (e.g. 2026-27)..."
                ></app-searchable-select>
              </div>

              <!-- Score / Rating -->
              <div>
                <app-custom-input
                  type="number"
                  label="Rating / Performance Score (0.00 – 5.00)"
                  [(ngModel)]="form.score"
                  name="score"
                  placeholder="0.00 – 5.00"
                  hint="Optional rating out of 5.00"
                ></app-custom-input>
              </div>

              <!-- Period Start & End -->
              <div>
                <app-custom-input
                  type="date"
                  label="Evaluation Period Start"
                  [(ngModel)]="form.period_start"
                  name="period_start"
                ></app-custom-input>
              </div>

              <div>
                <app-custom-input
                  type="date"
                  label="Evaluation Period End"
                  [(ngModel)]="form.period_end"
                  name="period_end"
                ></app-custom-input>
              </div>

              <!-- Target Due Date -->
              <div class="col-span-full sm:col-span-1">
                <app-custom-input
                  type="date"
                  label="Submission / Milestone Due Date"
                  [(ngModel)]="form.due_date"
                  name="due_date"
                ></app-custom-input>
              </div>

              <!-- Dynamic Config Fields for this specific Workspace (Loaded via API) -->
              @for (field of config.fields; track field.key) {
                <div [class.col-span-full]="field.type === 'textarea'">
                  @if (field.type === 'textarea') {
                    <app-custom-textarea
                      [label]="field.label"
                      [placeholder]="field.hint || 'Add relevant details and evidence...'"
                      [(ngModel)]="form.details[field.key]"
                      [name]="field.key"
                      [rows]="3"
                    ></app-custom-textarea>
                  } @else if (field.type === 'select' || field.categoryCode || field.optionsType) {
                    <div>
                      <div class="flex items-center justify-between mb-1.5">
                        <label class="block text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wide">
                          {{ field.label }}
                        </label>
                        @if (field.createRoute) {
                          <a [routerLink]="field.createRoute" target="_blank" class="text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1">
                            <span>+ Add New</span>
                          </a>
                        }
                      </div>
                      <app-searchable-select
                        [name]="field.key"
                        [categoryCode]="field.categoryCode || ''"
                        [options]="getFieldOptions(field)"
                        [allowCreateNew]="field.allowCreateNew !== false"
                        [createRoute]="field.createRoute || ''"
                        [(ngModel)]="form.details[field.key]"
                        [placeholder]="'Select ' + field.label.toLowerCase() + '...'"
                      ></app-searchable-select>
                      @if (field.hint) {
                        <p class="mt-1 text-xs text-slate-500">{{ field.hint }}</p>
                      }
                    </div>
                  } @else if (field.type === 'money') {
                    <app-custom-input
                      type="number"
                      [label]="field.label"
                      suffixText="BDT ৳"
                      [(ngModel)]="form.details[field.key]"
                      (ngModelChange)="onMoneyFieldChange(field.key)"
                      [name]="field.key"
                      [placeholder]="field.hint || '0.00'"
                    ></app-custom-input>
                  } @else if (field.type === 'number') {
                    <app-custom-input
                      type="number"
                      [label]="field.label"
                      [(ngModel)]="form.details[field.key]"
                      (ngModelChange)="onNumberFieldChange(field.key)"
                      [name]="field.key"
                      [placeholder]="field.hint || '0'"
                    ></app-custom-input>
                  } @else if (field.type === 'date') {
                    <app-custom-input
                      type="date"
                      [label]="field.label"
                      [(ngModel)]="form.details[field.key]"
                      [name]="field.key"
                    ></app-custom-input>
                  } @else {
                    <app-custom-input
                      [label]="field.label"
                      [(ngModel)]="form.details[field.key]"
                      [name]="field.key"
                      [placeholder]="field.hint || 'Enter ' + field.label.toLowerCase()"
                    ></app-custom-input>
                  }
                </div>
              }
            </div>

            @if (recordType === 'promotions' || recordType === 'increments') {
              <div class="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
                <span class="text-base">ℹ️</span>
                <div>
                  <strong>Advisory Recommendation:</strong> Approving this recommendation registers management consent. Official pay rate modifications must follow the controlled Salary Revision &amp; Payroll workflow.
                </div>
              </div>
            }

            <!-- Form Actions -->
            <div class="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <app-custom-button
                variant="secondary"
                type="button"
                label="Cancel"
                (btnClick)="navigateList()"
              ></app-custom-button>

              <app-custom-button
                variant="primary"
                type="submit"
                [disabled]="saving || !form.title.trim() || (config.requiresEmployee && !form.employee_id)"
                [loading]="saving"
                [label]="mode === 'edit' ? 'Update Performance Record' : 'Save & Submit Draft'"
              ></app-custom-button>
            </div>
          </form>
        }
      </app-card-container>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `],
})
export class PerformanceWorkspaceComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) recordType!: PerformanceType;

  private service = inject(PerformanceService);
  private hrmsService = inject(HrmsService);
  private lookupService = inject(LookupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptions = new Subscription();

  readonly Math = Math;
  config: PerformancePageConfig = PAGE_CONFIG.reviews;
  mode: 'list' | 'new' | 'edit' | 'detail' = 'list';
  recordId: number | null = null;
  records: PerformanceRecord[] = [];
  record: PerformanceRecord | null = null;

  // Options populated purely from APIs
  employeeOptions: SelectOption[] = [];
  departmentOptions: SelectOption[] = [];
  designationOptions: SelectOption[] = [];
  trainingCourseOptions: SelectOption[] = [];
  statusFilterOptions: SelectOption[] = [{ value: '', label: 'All Statuses' }];
  fiscalYearOptions: SelectOption[] = [];
  employeeError = '';

  total = 0;
  offset = 0;
  pageSize = 15;
  searchInput = '';
  searchTerm = '';
  statusFilter = '';

  loading = false;
  saving = false;
  employeeLoading = false;
  errorMessage = '';
  successMessage = '';
  form: PerformancePayload = this.emptyForm();


  ngOnInit(): void {
    this.successMessage = window.history.state?.performanceNotice || '';
    this.subscriptions.add(this.route.url.subscribe(segments => this.resolveMode(segments.map(s => s.path))));
    this.subscriptions.add(this.route.paramMap.subscribe(params => {
      const val = params.get('id');
      this.recordId = val ? Number(val) : null;
      if (this.recordId && this.mode !== 'list' && this.mode !== 'new') this.loadRecord();
    }));

    // Trigger purely dynamic API calls for all dropdown datasets
    this.loadEmployees();
    this.loadDepartments();
    this.loadDesignations();
    this.loadTrainingCourses();
    this.loadStatuses();
    this.loadFiscalYears();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recordType'] && this.recordType) {
      this.config = PAGE_CONFIG[this.recordType] || PAGE_CONFIG.reviews;
      this.form = this.emptyForm();
      if (this.mode === 'list') this.loadList();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private resolveMode(segments: string[]): void {
    const fullUrl = this.router.url;
    const idSegment = segments.find(s => /^\d+$/.test(s));
    this.recordId = idSegment ? Number(idSegment) : null;

    if (fullUrl.endsWith('/new') || segments.includes('new')) {
      this.mode = 'new';
      this.record = null;
      this.form = this.emptyForm();
    } else if (fullUrl.includes('/edit') || segments.includes('edit')) {
      this.mode = 'edit';
      if (this.recordId) this.loadRecord();
    } else if (this.recordId) {
      this.mode = 'detail';
      this.loadRecord();
    } else {
      this.mode = 'list';
      this.record = null;
      this.loadList();
    }
  }



  navigateNew(): void {
    this.router.navigate(['/hrms/performance', this.recordType, 'new']);
  }

  navigateEdit(id: number): void {
    this.router.navigate(['/hrms/performance', this.recordType, id, 'edit']);
  }

  navigateDetail(id: number): void {
    this.router.navigate(['/hrms/performance', this.recordType, id]);
  }

  navigateList(): void {
    this.router.navigate(['/hrms/performance', this.recordType]);
  }

  private emptyForm(): PerformancePayload {
    return {
      title: '',
      employee_id: null,
      fiscal_year: performanceFiscalYear(),
      period_start: null,
      period_end: null,
      due_date: null,
      score: null,
      details: {},
    };
  }

  // Pure API-driven dropdown data loaders:
  loadEmployees(): void {
    this.employeeLoading = true;
    this.employeeError = '';
    this.subscriptions.add(this.service.employees().subscribe({
      next: res => {
        this.employeeOptions = (res.items || []).map(emp => ({
          value: emp.id,
          label: `${emp.first_name} ${emp.last_name || ''}`.trim(),
          subLabel: emp.employee_code + (emp.department_name ? ` · ${emp.department_name}` : ''),
        }));
        this.employeeLoading = false;
      },
      error: () => {
        this.employeeLoading = false;
        this.employeeError = 'Employee directory could not be loaded.';
      },
    }));
  }

  loadDepartments(): void {
    this.subscriptions.add(this.hrmsService.loadDepartments().subscribe({
      next: depts => {
        this.departmentOptions = (depts || []).map(d => ({
          value: d.name_en,
          label: d.name_en,
          subLabel: d.department_code,
        }));
      },
      error: () => {},
    }));
  }

  loadDesignations(): void {
    this.subscriptions.add(this.hrmsService.loadDesignations().subscribe({
      next: desigs => {
        this.designationOptions = (desigs || []).map(d => ({
          value: d.title_en,
          label: d.title_en,
          subLabel: d.grade_level ? `Grade ${d.grade_level}` : undefined,
        }));
      },
      error: () => {},
    }));
  }

  loadTrainingCourses(): void {
    this.subscriptions.add(this.service.list('training-plans', { limit: 100, offset: 0 }).subscribe({
      next: resp => {
        this.trainingCourseOptions = (resp.items || []).map(i => ({
          value: i.title,
          label: i.title,
          subLabel: (i.details?.['curriculum'] as string) || i.reference,
        }));
      },
      error: () => {},
    }));
  }

  loadStatuses(): void {
    this.subscriptions.add(this.lookupService.getItems('HR_PERFORMANCE_STATUS').subscribe({
      next: items => {
        if (items && items.length > 0) {
          this.statusFilterOptions = [
            { value: '', label: 'All Statuses' },
            ...items.map(i => ({
              value: i.item_code,
              label: i.item_name_en,
              subLabel: i.item_name_bn,
            })),
          ];
        }
      },
      error: () => {},
    }));
  }

  loadFiscalYears(): void {
    this.subscriptions.add(this.lookupService.getItems('HR_FISCAL_YEAR').subscribe({
      next: items => {
        if (items && items.length > 0) {
          this.fiscalYearOptions = items.map(i => ({
            value: i.item_code,
            label: i.item_name_en,
            subLabel: i.item_name_bn,
          }));
        }
      },
      error: () => {},
    }));
  }

  getFieldOptions(field: PerformanceField): SelectOption[] {
    if (field.optionsType === 'departments') {
      return this.departmentOptions;
    }
    if (field.optionsType === 'designations') {
      return this.designationOptions;
    }
    if (field.optionsType === 'employees') {
      return this.employeeOptions;
    }
    if (field.optionsType === 'training-courses') {
      return this.trainingCourseOptions;
    }
    return field.options || [];
  }

  loadList(): void {
    if (!this.recordType) return;
    this.loading = true;
    this.errorMessage = '';
    this.subscriptions.add(this.service.list(this.recordType, {
      limit: this.pageSize,
      offset: this.offset,
      search: this.searchTerm || undefined,
      status: this.statusFilter || undefined,
    }).subscribe({
      next: page => {
        this.records = page.items;
        this.total = page.total;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Could not load performance records.';
      },
    }));
  }

  applySearch(): void {
    this.searchTerm = this.searchInput.trim();
    this.offset = 0;
    this.loadList();
  }

  clearSearch(): void {
    this.searchInput = '';
    this.searchTerm = '';
    this.offset = 0;
    this.loadList();
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadList();
  }

  changePage(direction: number): void {
    this.offset = Math.max(0, this.offset + direction * this.pageSize);
    this.loadList();
  }

  private loadRecord(): void {
    if (!this.recordId) return;
    this.loading = true;
    this.errorMessage = '';
    this.subscriptions.add(this.service.get(this.recordType, this.recordId).subscribe({
      next: rec => {
        this.record = rec;
        this.form = this.toForm(rec);
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.detail || 'Could not load record details.';
      },
    }));
  }

  private toForm(rec: PerformanceRecord): PerformancePayload {
    return {
      title: rec.title,
      employee_id: rec.employee_id,
      fiscal_year: rec.fiscal_year,
      period_start: rec.period_start,
      period_end: rec.period_end,
      due_date: rec.due_date,
      score: rec.score,
      details: { ...(rec.details || {}) },
    };
  }

  onNumberFieldChange(key: string): void {
    if (this.recordType === 'increments' && (key === 'recommended_increment_pct' || key === 'current_salary_bdt')) {
      const base = Number(this.form.details['current_salary_bdt']) || 0;
      const pct = Number(this.form.details['recommended_increment_pct']) || 0;
      if (base > 0 && pct > 0) {
        this.form.details['recommended_gross_bdt'] = Math.round(base * (1 + pct / 100));
      }
    }
  }

  onMoneyFieldChange(key: string): void {
    this.onNumberFieldChange(key);
  }

  saveRecord(): void {
    if (!this.form.title.trim() || (this.config.requiresEmployee && !this.form.employee_id)) {
      this.errorMessage = 'Please provide required fields before saving.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const req = this.mode === 'edit' && this.recordId
      ? this.service.update(this.recordType, this.recordId, this.payload())
      : this.service.create(this.recordType, this.payload());

    this.subscriptions.add(req.subscribe({
      next: rec => {
        this.saving = false;
        this.successMessage = `Performance record "${rec.reference}" successfully saved!`;
        setTimeout(() => this.navigateList(), 1000);
      },
      error: err => {
        this.saving = false;
        this.errorMessage = err.error?.detail || 'Failed to save performance record.';
      },
    }));
  }

  deleteRecord(): void {
    if (!this.recordId || !confirm('Are you sure you want to delete this draft performance record?')) return;
    this.saving = true;
    this.errorMessage = '';
    this.subscriptions.add(this.service.delete(this.recordType, this.recordId).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Performance record deleted successfully.';
        this.navigateList();
      },
      error: err => {
        this.saving = false;
        this.errorMessage = err.error?.detail || 'Could not delete performance record.';
      },
    }));
  }

  transition(action: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'RETURN'): void {
    if (!this.recordId) return;
    const remarks = prompt(`Enter optional remarks for ${action.toLowerCase()}:`) || undefined;
    this.saving = true;
    this.errorMessage = '';
    this.subscriptions.add(this.service.transition(this.recordType, this.recordId, action, remarks).subscribe({
      next: rec => {
        this.record = rec;
        this.saving = false;
        this.successMessage = `Record successfully moved to ${rec.status}.`;
      },
      error: err => {
        this.saving = false;
        this.errorMessage = err.error?.detail || `Could not ${action.toLowerCase()} this record.`;
      },
    }));
  }

  detailValue(field: PerformanceField): string {
    if (!this.record) return '—';
    const val = this.record.details?.[field.key];
    if (val === null || val === undefined || val === '') return '—';
    if (field.type === 'money') {
      return `৳ ${Number(val).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (field.type === 'date') {
      return new Date(String(val)).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(val);
  }

  private payload(): PerformancePayload {
    return {
      title: this.form.title.trim(),
      employee_id: this.config.requiresEmployee ? this.form.employee_id : null,
      fiscal_year: this.form.fiscal_year?.trim() || null,
      period_start: this.form.period_start || null,
      period_end: this.form.period_end || null,
      due_date: this.form.due_date || null,
      score: this.form.score !== null && this.form.score !== undefined && this.form.score !== ('' as any)
        ? Number(this.form.score)
        : null,
      details: this.form.details || {},
    };
  }
}

// Dedicated Page Components for each route in app.routes.ts
@Component({
  selector: 'app-performance-kpi-setup-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="kpi-setup"></app-performance-workspace>',
})
export class PerformanceKpiSetupPageComponent {}

@Component({
  selector: 'app-performance-reviews-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="reviews"></app-performance-workspace>',
})
export class PerformanceReviewsPageComponent {}

@Component({
  selector: 'app-performance-cycles-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="cycles"></app-performance-workspace>',
})
export class PerformanceCyclesPageComponent {}

@Component({
  selector: 'app-performance-evaluations-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="evaluations"></app-performance-workspace>',
})
export class PerformanceEvaluationsPageComponent {}

@Component({
  selector: 'app-performance-self-assessments-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="self-assessments"></app-performance-workspace>',
})
export class PerformanceSelfAssessmentsPageComponent {}

@Component({
  selector: 'app-performance-training-plans-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="training-plans"></app-performance-workspace>',
})
export class PerformanceTrainingPlansPageComponent {}

@Component({
  selector: 'app-performance-training-attendance-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="training-attendance"></app-performance-workspace>',
})
export class PerformanceTrainingAttendancePageComponent {}

@Component({
  selector: 'app-performance-skill-matrix-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="skill-matrix"></app-performance-workspace>',
})
export class PerformanceSkillMatrixPageComponent {}

@Component({
  selector: 'app-performance-promotions-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="promotions"></app-performance-workspace>',
})
export class PerformancePromotionsPageComponent {}

@Component({
  selector: 'app-performance-increments-page',
  standalone: true,
  imports: [PerformanceWorkspaceComponent],
  template: '<app-performance-workspace recordType="increments"></app-performance-workspace>',
})
export class PerformanceIncrementsPageComponent {}
