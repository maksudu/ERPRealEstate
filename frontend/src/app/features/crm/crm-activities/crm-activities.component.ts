import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, ActivityFilters } from '../../../core/services/crm.service';
import { ProjectService } from '../../../core/services/project.service';
import { LeadActivity, ActivityStatsSummary } from '../../../core/models/crm.model';
import { Project } from '../../../core/models/project.model';

@Component({
  selector: 'app-crm-activities',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-activities.component.html'
})
export class CrmActivitiesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Math = Math;

  // Dynamic Lookup Category Codes (Spec 4.7 & Rule 1)
  readonly LOOKUP = {
    activityType: 'CRM_ACTIVITY_TYPE',
    activityStatus: 'CRM_ACTIVITY_STATUS'
  };

  // State Signals
  activities = signal<LeadActivity[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(15);
  isLoading = signal<boolean>(false);
  activeView = signal<'calendar' | 'table'>('calendar');

  // Stats Signal
  stats = signal<ActivityStatsSummary>({
    total_activities: 0,
    planned_count: 0,
    completed_count: 0,
    rescheduled_count: 0,
    cancelled_count: 0,
    no_show_count: 0,
    no_show_rate_percentage: 0,
    total_site_visits: 0,
    completed_site_visits: 0,
    no_show_site_visits: 0,
    site_visit_completion_rate_percentage: 0
  });

  // Calendar State
  currentDate = signal<Date>(new Date());
  calendarDays = computed(() => {
    const curr = this.currentDate();
    const year = curr.getFullYear();
    const month = curr.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: { date: Date; isCurrentMonth: boolean; activities: LeadActivity[] }[] = [];

    // Leading days from previous month
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, activities: [] });
    }

    // Days of current month
    const totalDays = lastDay.getDate();
    const currentList = this.activities();
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = dateObj.toISOString().split('T')[0];
      const matched = currentList.filter(a => {
        if (!a.scheduled_start) return false;
        return a.scheduled_start.startsWith(dateStr);
      });
      days.push({ date: dateObj, isCurrentMonth: true, activities: matched });
    }

    // Trailing days to complete 35 or 42 cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const d = new Date(year, month + 1, j);
      days.push({ date: d, isCurrentMonth: false, activities: [] });
    }

    return days;
  });

  monthName = computed(() => {
    return this.currentDate().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  // Filter Form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    activity_type: [''],
    status: [''],
    project_id: ['']
  });

  // Project Options
  projects = signal<Project[]>([]);
  projectOptions = computed(() =>
    this.projects().map(p => ({ label: p.project_name, value: p.id }))
  );

  // Status/Outcome Modal State
  selectedActivity = signal<LeadActivity | null>(null);
  isStatusModalOpen = signal<boolean>(false);
  isSavingStatus = signal<boolean>(false);

  outcomeForm: FormGroup = this.fb.group({
    status: ['COMPLETED'],
    attendance_status: ['ATTENDED'],
    outcome: [''],
    shortlisted_units_json: [''],
    next_action: [''],
    next_follow_up_date: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
    this.loadStats();
    this.loadActivities();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadActivities();
      });
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (res: any) => {
        this.projects.set(res?.items || res || []);
      },
      error: err => console.error('Error loading projects', err)
    });
  }

  loadStats(): void {
    const projId = this.filterForm.get('project_id')?.value || undefined;
    this.crmService.getActivityStats(projId).subscribe({
      next: stats => this.stats.set(stats),
      error: err => console.error('Error loading stats', err)
    });
  }

  loadActivities(): void {
    this.isLoading.set(true);
    const formVals = this.filterForm.value;

    const filters: ActivityFilters = {
      search: formVals.search || undefined,
      activity_type: formVals.activity_type || undefined,
      status: formVals.status || undefined,
      project_id: formVals.project_id ? Number(formVals.project_id) : undefined,
      page: this.page(),
      limit: this.activeView() === 'calendar' ? 100 : this.limit()
    };

    this.crmService.getActivities(filters).subscribe({
      next: res => {
        this.activities.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading activities', err);
        this.isLoading.set(false);
      }
    });
  }

  setView(view: 'calendar' | 'table'): void {
    this.activeView.set(view);
    this.page.set(1);
    this.loadActivities();
  }

  prevMonth(): void {
    const c = new Date(this.currentDate());
    c.setMonth(c.getMonth() - 1);
    this.currentDate.set(c);
  }

  nextMonth(): void {
    const c = new Date(this.currentDate());
    c.setMonth(c.getMonth() + 1);
    this.currentDate.set(c);
  }

  today(): void {
    this.currentDate.set(new Date());
  }

  quickFilterStatus(status: string): void {
    const curr = this.filterForm.get('status')?.value;
    this.filterForm.patchValue({ status: curr === status ? '' : status });
  }

  openOutcomeModal(act: LeadActivity, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedActivity.set(act);
    this.outcomeForm.patchValue({
      status: act.status || 'COMPLETED',
      attendance_status: act.attendance_status || 'ATTENDED',
      outcome: act.outcome || '',
      shortlisted_units_json: act.shortlisted_units_json || '',
      next_action: act.next_action || '',
      next_follow_up_date: act.next_follow_up_date || ''
    });
    this.isStatusModalOpen.set(true);
  }

  closeOutcomeModal(): void {
    this.isStatusModalOpen.set(false);
    this.selectedActivity.set(null);
  }

  saveOutcome(): void {
    const act = this.selectedActivity();
    if (!act) return;

    this.isSavingStatus.set(true);
    const payload = this.outcomeForm.value;

    this.crmService.updateActivityStatus(act.id, payload).subscribe({
      next: () => {
        this.isSavingStatus.set(false);
        this.closeOutcomeModal();
        this.loadActivities();
        this.loadStats();
      },
      error: err => {
        console.error('Error updating status', err);
        this.isSavingStatus.set(false);
      }
    });
  }

  goToCreate(): void {
    this.router.navigate(['/crm/activities/new']);
  }

  goToEdit(id: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/crm/activities', id, 'edit']);
  }

  deleteActivity(id: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to cancel and remove this activity?')) {
      this.crmService.deleteActivity(id).subscribe({
        next: () => {
          this.loadActivities();
          this.loadStats();
        },
        error: err => console.error('Error deleting activity', err)
      });
    }
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadActivities();
  }

  totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  getActivityBadgeColor(type: string): string {
    switch (type) {
      case 'SITE_VISIT':
      case 'SHOW_APARTMENT_VISIT':
        return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      case 'INITIAL_INTRO_CALL':
      case 'FOLLOW_UP_CALL':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'VIDEO_MEETING':
      case 'OFFICE_APPOINTMENT':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'PRICE_NEGOTIATION':
      case 'DOCUMENT_DISCUSSION':
        return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
    }
  }

  getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'PLANNED': return 'info';
      case 'RESCHEDULED': return 'warning';
      case 'CANCELLED':
      case 'NO_SHOW': return 'danger';
      default: return 'neutral';
    }
  }
}
