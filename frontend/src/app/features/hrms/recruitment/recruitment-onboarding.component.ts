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
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

export interface RecruitmentSubView {
  id: string;
  title: string;
  description: string;
  badge: string;
}

@Component({
  selector: 'app-recruitment-onboarding',
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
      <!-- Cockpit Header Card Container -->
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
            label="Export PDF/Excel"
            (btnClick)="exportReport()"
          >
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          </app-custom-button>
          <app-custom-button
            variant="primary"
            size="sm"
            [label]="'+ New ' + getCreateLabel()"
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
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Open Requisitions</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">14 Active</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Candidate Pipeline</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">86 Applicants</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Interviews Scheduled</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">12 This Week</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <div class="text-[11px] font-medium text-slate-500 dark:text-slate-400">Joined / Onboarding</div>
              <div class="text-base font-bold text-slate-900 dark:text-slate-100">8 Employees</div>
            </div>
          </div>
        </div>

        <!-- Search & Filter Controls -->
        <div class="p-6 pb-2">
          <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div class="w-full sm:w-80">
              <app-custom-input
                placeholder="Search candidates, vacancies, codes..."
                [(ngModel)]="searchQuery"
              ></app-custom-input>
            </div>
            <div class="flex items-center gap-2">
              <select
                [(ngModel)]="statusFilter"
                class="px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active / In-Progress</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Data Table -->
        <div class="p-6 pt-2 overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead class="bg-slate-100/70 dark:bg-slate-800/60 uppercase font-semibold text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th class="px-4 py-3 rounded-l-lg">Tracking Ref / ID</th>
                <th class="px-4 py-3">Position / Candidate</th>
                <th class="px-4 py-3">Department & Branch</th>
                <th class="px-4 py-3">Timeline / Date</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              @for (item of filteredItems(); track item.id) {
                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                  <td class="px-4 py-3 font-mono font-semibold text-amber-600 dark:text-amber-400">
                    {{ item.ref }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-bold text-slate-900 dark:text-slate-100">{{ item.name }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.role }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.department }}</div>
                    <div class="text-[11px] text-slate-500">{{ item.location }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div>{{ item.date }}</div>
                    <div class="text-[10px] text-slate-500">{{ item.extra }}</div>
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
                      View / Process
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Action Modal -->
      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'Process ' + currentViewMeta().title"
        (closeModal)="isModalOpen.set(false)"
      >
        <div class="space-y-4 text-xs">
          <p class="text-slate-600 dark:text-slate-400">
            Configure record details for <strong>{{ currentViewMeta().title }}</strong>.
          </p>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Title / Full Name</label>
            <app-custom-input [(ngModel)]="modalFormName" placeholder="Enter title or candidate name"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Department</label>
            <app-custom-input [(ngModel)]="modalFormDept" placeholder="e.g. Civil Engineering / Architecture"></app-custom-input>
          </div>
          <div>
            <label class="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Operational Notes</label>
            <app-custom-textarea [(ngModel)]="modalFormNotes" placeholder="Remarks, candidate score or requirements"></app-custom-textarea>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <app-custom-button variant="outline" label="Cancel" (btnClick)="isModalOpen.set(false)"></app-custom-button>
            <app-custom-button variant="primary" label="Save & Submit" (btnClick)="submitModalForm()"></app-custom-button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class RecruitmentOnboardingComponent implements OnInit {
  private route = inject(ActivatedRoute);

  currentSubView = signal<string>('requisitions');
  searchQuery = signal<string>('');
  statusFilter = signal<string>('');
  isModalOpen = signal<boolean>(false);

  modalFormName = '';
  modalFormDept = '';
  modalFormNotes = '';

  viewsMeta: { [key: string]: RecruitmentSubView } = {
    'requisitions': { id: 'requisitions', title: 'Manpower Requisition (MR)', description: 'Departmental manpower vacancy requests, justifications and management approvals', badge: 'Recruitment 4.1' },
    'vacancies': { id: 'vacancies', title: 'Job Vacancy Master', description: 'Internal and external job circulars, position specs and closing deadlines', badge: 'Recruitment 4.2' },
    'applicants': { id: 'applicants', title: 'Applicant & Resume Database', description: 'Curated pool of candidates, CV parsing, qualifications and tracking', badge: 'Recruitment 4.3' },
    'interviews': { id: 'interviews', title: 'Interview Schedule & Calendar', description: 'Interview panel arrangement, written test and viva time slots', badge: 'Recruitment 4.4' },
    'evaluations': { id: 'evaluations', title: 'Interview Evaluation & Scoring', description: 'Technical competency, behavioral rating and panel recommendation', badge: 'Recruitment 4.5' },
    'selection': { id: 'selection', title: 'Candidate Selection & Merit List', description: 'Final shortlisted candidates approved for formal job offering', badge: 'Recruitment 4.6' },
    'offer-letters': { id: 'offer-letters', title: 'Offer Letter Generation', description: 'Automated salary breakdown, joining terms and digital acceptance tracking', badge: 'Recruitment 4.7' },
    'appointment-letters': { id: 'appointment-letters', title: 'Official Appointment Letters', description: 'Formal contract issuance, legal terms and service rule acknowledgment', badge: 'Recruitment 4.8' },
    'joining-checklist': { id: 'joining-checklist', title: 'Joining Checklist & Verification', description: 'NID, academic certificates, police clearance, medical fitness and photos', badge: 'Recruitment 4.9' },
    'onboarding': { id: 'onboarding', title: 'Employee Onboarding & Induction', description: 'IT provisioning, workstation allotment, company policy tour and buddy program', badge: 'Recruitment 4.10' }
  };

  currentViewMeta = computed(() => {
    return this.viewsMeta[this.currentSubView()] || this.viewsMeta['requisitions'];
  });

  items = signal<any[]>([
    { id: 1, ref: 'MR-2026-089', name: 'Senior Structural Engineer', role: 'Full-Time Position', department: 'Civil Engineering', location: 'Gulshan Head Office', date: '2026-10-15', extra: 'Target Join: Nov 1', status: 'ACTIVE' },
    { id: 2, ref: 'APP-9402', name: 'Engr. Mahfuzur Rahman', role: 'Applicant (B.Sc BUET)', department: 'Project Operations', location: 'Grand Emerald Tower Site', date: '2026-10-16', extra: 'Panel Score: 88/100', status: 'APPROVED' },
    { id: 3, ref: 'INT-3310', name: 'Architect Nadia Sultana', role: 'Design Lead Interview', department: 'Architecture & Modeling', location: 'Boardroom A / Zoom', date: '2026-10-19', extra: '2:30 PM - 3:30 PM', status: 'PENDING' },
    { id: 4, ref: 'OFF-1102', name: 'Tanvir Ahmed', role: 'Site Accounts Officer', department: 'Accounts & Audit', location: 'Chittagong Branch', date: '2026-10-14', extra: 'Offered: 45,000 BDT', status: 'COMPLETED' }
  ]);

  filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    return this.items().filter(item => {
      const matchQ = !q || item.name.toLowerCase().includes(q) || item.ref.toLowerCase().includes(q) || item.department.toLowerCase().includes(q);
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

  getCreateLabel(): string {
    return this.currentViewMeta().title.split('(')[0].trim();
  }

  openActionModal(): void {
    this.modalFormName = '';
    this.modalFormDept = '';
    this.modalFormNotes = '';
    this.isModalOpen.set(true);
  }

  submitModalForm(): void {
    if (!this.modalFormName) return;
    this.items.update(list => [
      {
        id: Date.now(),
        ref: 'REC-' + Math.floor(1000 + Math.random() * 9000),
        name: this.modalFormName,
        role: this.currentViewMeta().title,
        department: this.modalFormDept || 'Operations',
        location: 'Enterprise Head Office',
        date: new Date().toISOString().split('T')[0],
        extra: 'Direct Entry',
        status: 'ACTIVE'
      },
      ...list
    ]);
    this.isModalOpen.set(false);
  }

  viewDetails(item: any): void {
    alert(`Viewing Details for ${item.name} (${item.ref})\nRole: ${item.role}\nDepartment: ${item.department}`);
  }

  exportReport(): void {
    alert(`Exporting ${this.currentViewMeta().title} to Excel/PDF.`);
  }
}
