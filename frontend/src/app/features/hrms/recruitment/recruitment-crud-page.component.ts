import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import {
  HrmsRecruitmentService,
  RecruitmentPayload,
  RecruitmentRecord,
  RecruitmentType
} from '../../../core/services/hrms-recruitment.service';

interface RecruitmentField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'time' | 'textarea' | 'applicant';
  placeholder?: string;
}

interface RecruitmentPageConfig {
  title: string;
  eyebrow: string;
  intro: string;
  singular: string;
  departmentLabel: string;
  summaryLabel?: string;
  summaryField?: string;
  fields: RecruitmentField[];
}

@Component({
  selector: 'app-recruitment-crud-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  template: `
    <main class="min-h-screen bg-[#f5f7f8] text-slate-800">
      <div class="mx-auto max-w-[1440px] px-4 py-5 sm:px-7 lg:px-10">
        <header class="mb-6 flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[.2em] text-teal-700">{{ config.eyebrow }} <span class="text-slate-400">/ PEOPLE OPERATIONS</span></p>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">{{ config.title }}</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{{ config.intro }}</p>
          </div>
          <button type="button" (click)="openCreate()" class="inline-flex shrink-0 items-center justify-center gap-2 bg-teal-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2">
            <span class="text-lg leading-none">+</span> New {{ config.singular }}
          </button>
        </header>

        <nav aria-label="Recruitment workspaces" class="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
          @for (item of navigation; track item.type) {
            <a [routerLink]="item.route" [attr.aria-current]="recordType === item.type ? 'page' : null"
               class="shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition"
               [class.border-teal-700]="recordType === item.type" [class.text-teal-800]="recordType === item.type"
               [class.border-transparent]="recordType !== item.type" [class.text-slate-500]="recordType !== item.type"
               [class.hover:text-slate-900]="recordType !== item.type">{{ item.label }}</a>
          }
        </nav>

        <section aria-label="Recruitment records">
          <div class="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="relative w-full max-w-md">
              <label for="record-search" class="sr-only">Search records</label>
              <span aria-hidden="true" class="pointer-events-none absolute left-3 top-2.5 text-slate-400">⌕</span>
              <input id="record-search" type="search" [(ngModel)]="searchQuery" (ngModelChange)="searchChanged()"
                     placeholder="Search code, title or department"
                     class="w-full border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
            </div>
            <div class="flex flex-wrap items-center gap-2" aria-label="Filter by status">
              @for (status of statusOptions; track status.value) {
                <button type="button" (click)="setStatus(status.value)"
                        class="border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-teal-700"
                        [class.border-teal-800]="statusFilter === status.value" [class.bg-teal-800]="statusFilter === status.value"
                        [class.text-white]="statusFilter === status.value" [class.border-slate-300]="statusFilter !== status.value"
                        [class.bg-white]="statusFilter !== status.value" [class.text-slate-600]="statusFilter !== status.value">
                  {{ status.label }}
                </button>
              }
            </div>
          </div>

          @if (successMessage()) {
            <div role="status" class="mb-4 flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <span>{{ successMessage() }}</span><button type="button" (click)="successMessage.set('')" aria-label="Dismiss success message">×</button>
            </div>
          }
          @if (errorMessage()) {
            <div role="alert" class="mb-4 flex items-center justify-between border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <span>{{ errorMessage() }}</span><button type="button" (click)="errorMessage.set('')" aria-label="Dismiss error message">×</button>
            </div>
          }

          <div class="border border-slate-200 bg-white shadow-[0_2px_12px_rgba(15,23,42,.035)]">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 class="text-sm font-semibold text-slate-900">{{ config.title }} register</h2>
                <p class="mt-1 text-xs text-slate-500">Records are stored in the HRMS database and scoped to your organization.</p>
              </div>
              <span class="text-xs font-medium tabular-nums text-slate-500">{{ total() }} record{{ total() === 1 ? '' : 's' }}</span>
            </div>
            @if (loading()) {
              <div class="space-y-3 p-5" aria-live="polite" aria-label="Loading records">
                @for (row of [1, 2, 3]; track row) { <div class="h-12 animate-pulse bg-slate-100"></div> }
              </div>
            } @else if (records().length) {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[760px] text-left text-sm">
                  <thead class="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th class="px-5 py-3">Reference</th><th class="px-5 py-3">Title / Candidate</th>
                      <th class="px-5 py-3">{{ config.departmentLabel }}</th><th class="px-5 py-3">Status</th>
                      <th class="px-5 py-3">Last updated</th><th class="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (record of records(); track record.id) {
                      <tr class="transition hover:bg-teal-50/30">
                        <td class="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-teal-800">{{ record.code }}</td>
                        <td class="px-5 py-4"><div class="max-w-xs truncate font-semibold text-slate-900">{{ record.title }}</div><div class="mt-1 text-xs text-slate-500">{{ detailSummary(record) }}</div></td>
                        <td class="px-5 py-4 text-slate-600">{{ record.department || '—' }}</td>
                        <td class="px-5 py-4"><span class="inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold" [class]="statusClasses(record.status)"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>{{ humanize(record.status) }}</span></td>
                        <td class="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{{ record.updated_at ? (record.updated_at | date:'d MMM y') : '—' }}</td>
                        <td class="whitespace-nowrap px-5 py-4 text-right">
                          <button type="button" (click)="openView(record)" class="px-2 py-1 text-xs font-semibold text-slate-700 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-700">View</button>
                          <button type="button" (click)="openEdit(record)" class="px-2 py-1 text-xs font-semibold text-teal-800 hover:underline focus:outline-none focus:ring-2 focus:ring-teal-700">Edit</button>
                          <button type="button" (click)="remove(record)" class="ml-2 px-2 py-1 text-xs font-semibold text-rose-700 hover:underline focus:outline-none focus:ring-2 focus:ring-rose-600">Delete</button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="px-6 py-16 text-center">
                @if (searchQuery || statusFilter) {
                  <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-slate-200 bg-slate-50 text-xl text-slate-500">⌕</div>
                  <h3 class="font-semibold text-slate-900">No matching records</h3>
                  <p class="mt-1 text-sm text-slate-500">Try another search or clear the status filter.</p>
                  <button type="button" (click)="clearFilters()" class="mt-4 text-sm font-semibold text-teal-800 hover:underline">Clear filters</button>
                } @else {
                  <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-teal-200 bg-teal-50 text-xl font-light text-teal-800">+</div>
                  <h3 class="font-semibold text-slate-900">Your {{ config.singular.toLowerCase() }} register is ready</h3>
                  <p class="mx-auto mt-1 max-w-sm text-sm text-slate-500">Add the first record to start tracking this stage of recruitment.</p>
                  <button type="button" (click)="openCreate()" class="mt-5 border border-teal-800 px-4 py-2.5 text-sm font-semibold text-teal-900 transition hover:bg-teal-50">Create first record</button>
                }
              </div>
            }
            <footer class="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
              <span>Showing {{ records().length ? offset + 1 : 0 }}–{{ offset + records().length }} of {{ total() }}</span>
              <div class="flex gap-2">
                <button type="button" [disabled]="offset === 0 || loading()" (click)="changePage(-1)" class="border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <button type="button" [disabled]="offset + pageSize >= total() || loading()" (click)="changePage(1)" class="border border-slate-300 px-3 py-1.5 font-medium disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </footer>
          </div>
        </section>
      </div>

      @if (formOpen()) {
        <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 sm:items-center" (click)="closeForm()">
          <section role="dialog" aria-modal="true" [attr.aria-label]="editingId ? 'Edit ' + config.singular : 'New ' + config.singular"
                   class="my-6 w-full max-w-2xl border border-slate-200 bg-white shadow-2xl" (click)="$event.stopPropagation()">
            <header class="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div><p class="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">{{ viewOnly ? 'RECORD DETAILS' : editingId ? 'UPDATE RECORD' : 'NEW RECORD' }}</p><h2 class="mt-1 text-xl font-semibold text-slate-950">{{ viewOnly ? 'View ' : editingId ? 'Edit ' : 'Create ' }}{{ config.singular }}</h2><p class="mt-1 text-xs text-slate-500">Changes are saved to the shared recruitment register.</p></div>
              <button type="button" (click)="closeForm()" aria-label="Close form" class="p-1 text-2xl leading-none text-slate-400 hover:text-slate-800">×</button>
            </header>
            <form (ngSubmit)="save()" class="space-y-5 px-6 py-5">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block text-xs font-semibold text-slate-700">Reference code <span class="font-normal text-slate-400">· optional</span>
                  <input name="code" [(ngModel)]="form.code" [readonly]="viewOnly" maxlength="40" placeholder="Generated automatically if blank" class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
                </label>
                <label class="block text-xs font-semibold text-slate-700">Status
                  <input name="status" [(ngModel)]="form.status" [readonly]="viewOnly" required maxlength="32" placeholder="Draft, active, completed..." class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
                </label>
                <label class="block text-xs font-semibold text-slate-700 sm:col-span-2">{{ config.singular }} title / name <span class="text-rose-600">*</span>
                  <input name="title" [(ngModel)]="form.title" [readonly]="viewOnly" required maxlength="200" placeholder="Enter a clear title or candidate name" class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
                </label>
                <label class="block text-xs font-semibold text-slate-700 sm:col-span-2">{{ config.departmentLabel }}
                  <input name="department" [(ngModel)]="form.department" [readonly]="viewOnly" maxlength="120" placeholder="Department, role or team" class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
                </label>
                @for (field of config.fields; track field.key) {
                  <label class="block text-xs font-semibold text-slate-700" [ngClass]="field.type === 'textarea' ? 'sm:col-span-2' : ''">{{ field.label }}
                    @if (field.type === 'applicant') {
                      <app-searchable-select
                        class="mt-1.5 block font-normal"
                        [ngModel]="form.details[field.key]"
                        (ngModelChange)="form.details[field.key] = $event"
                        [ngModelOptions]="{standalone: true}"
                        [options]="applicantOptions()"
                        [allowCreateNew]="false"
                        [disabled]="viewOnly"
                        [label]="field.label"
                        [placeholder]="field.placeholder || 'Search applicants'"
                        hint="Options are loaded from the organization applicant database.">
                      </app-searchable-select>
                    } @else if (field.type === 'textarea') {
                      <textarea [name]="field.key" [(ngModel)]="form.details[field.key]" [readonly]="viewOnly" rows="3" [placeholder]="field.placeholder || ''" class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"></textarea>
                    } @else {
                      <input [name]="field.key" [type]="field.type || 'text'" [(ngModel)]="form.details[field.key]" [readonly]="viewOnly" [placeholder]="field.placeholder || ''" class="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm font-normal focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700">
                    }
                  </label>
                }
              </div>
              @if (formError()) { <p role="alert" class="border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{{ formError() }}</p> }
              <div class="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 pt-4 sm:flex-row">
                <button type="button" (click)="closeForm()" class="border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
                @if (!viewOnly) {
                  <button type="submit" [disabled]="saving()" class="bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:cursor-wait disabled:opacity-60">{{ saving() ? 'Saving…' : editingId ? 'Save changes' : 'Create record' }}</button>
                }
              </div>
            </form>
          </section>
        </div>
      }
    </main>
  `
})
export class RecruitmentCrudPageComponent implements OnInit, OnDestroy {
  @Input({ required: true }) recordType!: RecruitmentType;

  private service = inject(HrmsRecruitmentService);
  private searchTimer?: ReturnType<typeof setTimeout>;
  readonly pageSize = 20;

  records = signal<RecruitmentRecord[]>([]);
  total = signal(0);
  loading = signal(false);
  saving = signal(false);
  formOpen = signal(false);
  applicantOptions = signal<SelectOption[]>([]);
  searchQuery = '';
  statusFilter = '';
  offset = 0;
  editingId: number | null = null;
  viewOnly = false;
  successMessage = signal('');
  errorMessage = signal('');
  formError = signal('');
  form: RecruitmentPayload = this.emptyForm();

  readonly navigation: { type: RecruitmentType; label: string; route: string }[] = [
    { type: 'requisitions', label: 'Requisitions', route: '/hrms/recruitment/requisitions' },
    { type: 'vacancies', label: 'Vacancies', route: '/hrms/recruitment/vacancies' },
    { type: 'applicants', label: 'Applicants', route: '/hrms/recruitment/applicants' },
    { type: 'interviews', label: 'Interviews', route: '/hrms/recruitment/interviews' },
    { type: 'evaluations', label: 'Evaluations', route: '/hrms/recruitment/evaluations' },
    { type: 'selection', label: 'Selection', route: '/hrms/recruitment/selection' },
    { type: 'offer-letters', label: 'Offer Letters', route: '/hrms/recruitment/offer-letters' },
    { type: 'appointment-letters', label: 'Appointment Letters', route: '/hrms/recruitment/appointment-letters' },
    { type: 'joining-checklist', label: 'Joining Checklist', route: '/hrms/recruitment/joining-checklist' },
    { type: 'onboarding', label: 'Onboarding', route: '/hrms/recruitment/onboarding' }
  ];
  readonly statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'In progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' }
  ];
  private readonly pageConfigs: Record<RecruitmentType, RecruitmentPageConfig> = {
    requisitions: { title: 'Manpower requisitions', eyebrow: 'RECRUITMENT 4.1', intro: 'Translate approved workforce plans into clear, accountable hiring requests.', singular: 'requisition', departmentLabel: 'Department', fields: [
      { key: 'headcount', label: 'Positions requested', type: 'number' }, { key: 'employment_type', label: 'Employment type', placeholder: 'Permanent / contract' },
      { key: 'target_date', label: 'Target joining date', type: 'date' }, { key: 'justification', label: 'Business justification', type: 'textarea' }
    ] },
    vacancies: { title: 'Job vacancies', eyebrow: 'RECRUITMENT 4.2', intro: 'Publish open positions with consistent role, location and closing-date details.', singular: 'vacancy', departmentLabel: 'Hiring department', fields: [
      { key: 'location', label: 'Work location' }, { key: 'employment_type', label: 'Employment type' }, { key: 'openings', label: 'Open positions', type: 'number' },
      { key: 'closing_date', label: 'Application deadline', type: 'date' }, { key: 'salary_range', label: 'Salary range (BDT)' }
    ] },
    applicants: { title: 'Applicant database', eyebrow: 'RECRUITMENT 4.3', intro: 'Keep candidate contact details, experience and source together as the pipeline progresses.', singular: 'applicant', departmentLabel: 'Applied role / team', fields: [
      { key: 'email', label: 'Email address', type: 'email' }, { key: 'phone', label: 'Phone number' }, { key: 'experience', label: 'Experience (years)', type: 'number' },
      { key: 'education', label: 'Highest qualification' }, { key: 'source', label: 'Candidate source' }
    ] },
    interviews: { title: 'Interview schedule', eyebrow: 'RECRUITMENT 4.4', intro: 'Coordinate candidate meetings with clear schedules, panels and interview formats.', singular: 'interview', departmentLabel: 'Role / department', fields: [
      { key: 'applicant', label: 'Applicant name' }, { key: 'interview_date', label: 'Interview date', type: 'date' }, { key: 'interview_time', label: 'Interview time', type: 'time' },
      { key: 'mode', label: 'Interview format', placeholder: 'On-site / video call' }, { key: 'panel', label: 'Interview panel' }
    ] },
    evaluations: { title: 'Interview evaluations', eyebrow: 'RECRUITMENT 4.5', intro: 'Record structured panel feedback and keep scoring visible for fair decisions.', singular: 'evaluation', departmentLabel: 'Role / department', fields: [
      { key: 'applicant', label: 'Applicant name' }, { key: 'interviewer', label: 'Evaluator' }, { key: 'technical_score', label: 'Technical score (0–100)', type: 'number' },
      { key: 'communication_score', label: 'Communication score (0–100)', type: 'number' }, { key: 'recommendation', label: 'Panel recommendation' }, { key: 'feedback', label: 'Evaluation notes', type: 'textarea' }
    ] },
    selection: { title: 'Candidate selection', eyebrow: 'RECRUITMENT 4.6', intro: 'Document final decisions, merit outcomes and next steps for selected candidates.', singular: 'selection record', departmentLabel: 'Role / department', fields: [
      { key: 'applicant', label: 'Selected candidate' }, { key: 'final_score', label: 'Final merit score', type: 'number' }, { key: 'decision', label: 'Decision' },
      { key: 'offered_salary', label: 'Proposed salary (BDT)', type: 'number' }, { key: 'joining_date', label: 'Expected joining date', type: 'date' }, { key: 'notes', label: 'Decision notes', type: 'textarea' }
    ] },
    'offer-letters': { title: 'Offer letters', eyebrow: 'RECRUITMENT 4.7', intro: 'Track candidate offers, compensation terms, issue dates and response deadlines in one register.', singular: 'offer letter', departmentLabel: 'Position / department', summaryLabel: 'Offer date', summaryField: 'offer_date', fields: [
      { key: 'applicant_id', label: 'Applicant', type: 'applicant', placeholder: 'Find an applicant from the recruitment register' },
      { key: 'position', label: 'Position offered' }, { key: 'offer_date', label: 'Offer date', type: 'date' },
      { key: 'offered_salary', label: 'Monthly salary (BDT)', type: 'number' }, { key: 'employment_type', label: 'Employment type' },
      { key: 'valid_until', label: 'Response deadline', type: 'date' }, { key: 'terms', label: 'Offer terms', type: 'textarea' }
    ] },
    'appointment-letters': { title: 'Appointment letters', eyebrow: 'RECRUITMENT 4.8', intro: 'Record issued appointment terms and planned joining dates for approved candidates.', singular: 'appointment letter', departmentLabel: 'Position / department', summaryLabel: 'Issue date', summaryField: 'issue_date', fields: [
      { key: 'applicant_id', label: 'Applicant', type: 'applicant', placeholder: 'Find an applicant from the recruitment register' },
      { key: 'position', label: 'Appointed position' }, { key: 'issue_date', label: 'Issue date', type: 'date' },
      { key: 'joining_date', label: 'Joining date', type: 'date' }, { key: 'monthly_salary', label: 'Monthly salary (BDT)', type: 'number' },
      { key: 'probation_months', label: 'Probation period (months)', type: 'number' }, { key: 'employment_type', label: 'Employment type' }
    ] },
    'joining-checklist': { title: 'Joining checklist', eyebrow: 'RECRUITMENT 4.9', intro: 'Coordinate pre-joining paperwork, access and equipment with clear owners and due dates.', singular: 'joining checklist item', departmentLabel: 'Position / department', summaryLabel: 'Due date', summaryField: 'due_date', fields: [
      { key: 'applicant_id', label: 'Applicant', type: 'applicant', placeholder: 'Find an applicant from the recruitment register' },
      { key: 'checklist_item', label: 'Checklist item' }, { key: 'due_date', label: 'Due date', type: 'date' },
      { key: 'completed_date', label: 'Completed date', type: 'date' }, { key: 'owner', label: 'Responsible owner' },
      { key: 'evidence', label: 'Notes / evidence', type: 'textarea' }
    ] },
    onboarding: { title: 'Employee onboarding', eyebrow: 'RECRUITMENT 4.10', intro: 'Follow each new hire’s induction milestones, assigned support and progress to completion.', singular: 'onboarding milestone', departmentLabel: 'Position / department', summaryLabel: 'Start date', summaryField: 'start_date', fields: [
      { key: 'applicant_id', label: 'Applicant', type: 'applicant', placeholder: 'Find an applicant from the recruitment register' },
      { key: 'start_date', label: 'Onboarding start date', type: 'date' }, { key: 'milestone', label: 'Current milestone' },
      { key: 'mentor', label: 'Assigned buddy / mentor' }, { key: 'completion_date', label: 'Target completion date', type: 'date' },
      { key: 'progress_notes', label: 'Progress notes', type: 'textarea' }
    ] }
  };

  get config(): RecruitmentPageConfig {
    return this.pageConfigs[this.recordType];
  }

  ngOnInit(): void {
    this.load();
    if (this.config.fields.some(field => field.type === 'applicant')) {
      this.service.list('applicants', { limit: 100, offset: 0 }).subscribe({
        next: page => this.applicantOptions.set(page.items.map(record => ({
          value: record.id,
          label: record.title,
          subLabel: record.code
        }))),
        error: error => this.errorMessage.set(this.apiError(error, 'Unable to load applicant options.'))
      });
    }
  }

  ngOnDestroy(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.list(this.recordType, {
      limit: this.pageSize,
      offset: this.offset,
      search: this.searchQuery.trim(),
      status: this.statusFilter
    }).subscribe({
      next: page => {
        this.records.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: error => {
        this.errorMessage.set(this.apiError(error, 'Unable to load recruitment records.'));
        this.loading.set(false);
      }
    });
  }

  searchChanged(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.offset = 0;
      this.load();
    }, 300);
  }

  setStatus(status: string): void {
    this.statusFilter = status;
    this.offset = 0;
    this.load();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.offset = 0;
    this.load();
  }

  changePage(direction: number): void {
    this.offset = Math.max(0, this.offset + direction * this.pageSize);
    this.load();
  }

  openCreate(): void {
    this.editingId = null;
    this.viewOnly = false;
    this.form = this.emptyForm();
    this.formOpen.set(true);
    this.formError.set('');
  }

  openEdit(record: RecruitmentRecord): void {
    this.viewOnly = false;
    this.editingId = record.id;
    this.form = {
      code: record.code,
      title: record.title,
      department: record.department || '',
      status: record.status,
      details: { ...record.details }
    };
    this.formOpen.set(true);
    this.formError.set('');
  }

  openView(record: RecruitmentRecord): void {
    this.viewOnly = true;
    this.editingId = record.id;
    this.form = {
      code: record.code,
      title: record.title,
      department: record.department || '',
      status: record.status,
      details: { ...record.details }
    };
    this.formOpen.set(true);
    this.formError.set('');
  }

  closeForm(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  save(): void {
    if (!this.form.title.trim()) {
      this.formError.set('A title or candidate name is required.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    this.errorMessage.set('');
    const payload: RecruitmentPayload = {
      ...this.form,
      code: this.form.code.trim(),
      title: this.form.title.trim(),
      department: this.form.department?.trim() || null,
      status: this.form.status.trim().toUpperCase(),
      details: { ...this.form.details }
    };
    const request = this.editingId
      ? this.service.update(this.recordType, this.editingId, payload)
      : this.service.create(this.recordType, payload);
    request.subscribe({
      next: saved => {
        this.successMessage.set(`${this.config.singular} ${this.editingId ? 'updated' : 'created'} successfully (${saved.code}).`);
        this.formOpen.set(false);
        this.saving.set(false);
        this.searchQuery = '';
        this.statusFilter = '';
        this.offset = 0;
        this.load();
      },
      error: error => {
        this.formError.set(this.apiError(error, 'Unable to save this record.'));
        this.saving.set(false);
      }
    });
  }

  remove(record: RecruitmentRecord): void {
    if (!window.confirm(`Delete ${record.code} — ${record.title}? This cannot be undone.`)) return;
    this.errorMessage.set('');
    this.service.delete(this.recordType, record.id).subscribe({
      next: () => {
        this.successMessage.set(`${this.config.singular} ${record.code} deleted successfully.`);
        if (this.records().length === 1 && this.offset > 0) this.offset -= this.pageSize;
        this.load();
      },
      error: error => this.errorMessage.set(this.apiError(error, 'Unable to delete this record.'))
    });
  }

  detailSummary(record: RecruitmentRecord): string {
    const summary = this.config.summaryField ? record.details?.[this.config.summaryField] : null;
    if (summary !== null && summary !== undefined && summary !== '') {
      return `${this.config.summaryLabel || 'Details'}: ${String(summary)}`;
    }
    const value = Object.entries(record.details || {})
      .find(([key, item]) => !key.endsWith('_id') && item !== null && item !== '')?.[1];
    return value ? String(value) : 'No additional details';
  }

  statusClasses(status: string): string {
    const normalized = status.toUpperCase();
    if (['ACTIVE', 'SELECTED', 'APPROVED'].includes(normalized)) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (['COMPLETED', 'HIRED'].includes(normalized)) return 'border-blue-200 bg-blue-50 text-blue-800';
    if (['REJECTED', 'CANCELLED'].includes(normalized)) return 'border-rose-200 bg-rose-50 text-rose-800';
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  humanize(value: string): string {
    return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private emptyForm(): RecruitmentPayload {
    return { code: '', title: '', department: '', status: 'DRAFT', details: {} };
  }

  private apiError(error: any, fallback: string): string {
    const detail = error?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((item: any) => item.msg).join(', ');
    return fallback;
  }
}
