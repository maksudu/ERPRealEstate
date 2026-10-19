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
import { CrmService, TaskFilters } from '../../../core/services/crm.service';
import { FollowUpTask, DailyTodoSummary } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-tasks',
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
  templateUrl: './crm-tasks.component.html'
})
export class CrmTasksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly Math = Math;

  // Dynamic Lookup Category Codes (Spec 4.8 & Rule 1)
  readonly LOOKUP = {
    taskCategory: 'CRM_TASK_CATEGORY',
    taskPriority: 'CRM_TASK_PRIORITY',
    taskStatus: 'CRM_TASK_STATUS'
  };

  // State Signals
  tasks = signal<FollowUpTask[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(15);
  isLoading = signal<boolean>(false);

  // Active Tab: 'daily' | 'overdue' | 'all'
  activeTab = signal<'daily' | 'overdue' | 'all'>('daily');

  // Daily Todo Summary Signal
  dailySummary = signal<DailyTodoSummary>({
    total_due_today: 0,
    total_overdue: 0,
    total_completed_today: 0,
    high_priority_count: 0,
    tasks: []
  });

  // Filter Form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    task_category: [''],
    priority: [''],
    status: [''],
    due_filter: ['']
  });

  // Task Completion Modal State
  selectedTask = signal<FollowUpTask | null>(null);
  isCompleteModalOpen = signal<boolean>(false);
  isCompleting = signal<boolean>(false);

  completeForm: FormGroup = this.fb.group({
    completion_outcome: ['COMPLETED'],
    completion_notes: [''],
    create_next_task: [false],
    next_task_title: [''],
    next_task_category: ['GENERAL_FOLLOW_UP'],
    next_task_due_date: ['']
  });

  // Escalation Modal State
  isEscalateModalOpen = signal<boolean>(false);
  isEscalating = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDailySummary();
    this.loadTasks();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadTasks();
      });
  }

  loadDailySummary(): void {
    this.crmService.getDailyTodoSummary().subscribe({
      next: summary => this.dailySummary.set(summary),
      error: err => console.error('Error loading daily summary', err)
    });
  }

  loadTasks(): void {
    this.isLoading.set(true);
    const formVals = this.filterForm.value;

    let dueFilter = formVals.due_filter || undefined;
    if (this.activeTab() === 'overdue') {
      dueFilter = 'overdue';
    } else if (this.activeTab() === 'daily') {
      dueFilter = 'today';
    }

    const filters: TaskFilters = {
      search: formVals.search || undefined,
      task_category: formVals.task_category || undefined,
      priority: formVals.priority || undefined,
      status: formVals.status || undefined,
      due_filter: dueFilter,
      page: this.page(),
      limit: this.limit()
    };

    this.crmService.getTasks(filters).subscribe({
      next: res => {
        this.tasks.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading tasks', err);
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: 'daily' | 'overdue' | 'all'): void {
    this.activeTab.set(tab);
    this.page.set(1);
    this.loadTasks();
  }

  quickFilterDue(filter: string): void {
    const curr = this.filterForm.get('due_filter')?.value;
    this.filterForm.patchValue({ due_filter: curr === filter ? '' : filter });
  }

  openCompleteModal(task: FollowUpTask, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedTask.set(task);
    this.completeForm.reset({
      completion_outcome: 'Follow-up call completed with positive response',
      completion_notes: '',
      create_next_task: false,
      next_task_title: `Next step for ${task.lead_name || task.customer_name || 'Client'}`,
      next_task_category: 'QUOTATION_DISCUSSION',
      next_task_due_date: ''
    });
    this.isCompleteModalOpen.set(true);
  }

  closeCompleteModal(): void {
    this.isCompleteModalOpen.set(false);
    this.selectedTask.set(null);
  }

  saveComplete(): void {
    const task = this.selectedTask();
    if (!task) return;

    this.isCompleting.set(true);
    const val = this.completeForm.value;

    this.crmService.completeTask(task.id, val).subscribe({
      next: () => {
        this.isCompleting.set(false);
        this.closeCompleteModal();
        this.loadTasks();
        this.loadDailySummary();
      },
      error: err => {
        console.error('Error completing task', err);
        this.isCompleting.set(false);
      }
    });
  }

  escalateTask(task: FollowUpTask, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (confirm(`Escalate overdue task "${task.title}" to Sales Manager immediately?`)) {
      this.crmService.escalateTask(task.id).subscribe({
        next: () => {
          this.loadTasks();
          this.loadDailySummary();
        },
        error: err => console.error('Error escalating task', err)
      });
    }
  }

  deleteTask(id: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (confirm('Are you sure you want to delete this task?')) {
      this.crmService.deleteTask(id).subscribe({
        next: () => {
          this.loadTasks();
          this.loadDailySummary();
        },
        error: err => console.error('Error deleting task', err)
      });
    }
  }

  goToCreate(): void {
    this.router.navigate(['/crm/tasks/new']);
  }

  goToEdit(id: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/crm/tasks', id, 'edit']);
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadTasks();
  }

  totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  getPriorityBadge(priority: string): { label: string; class: string } {
    switch (priority) {
      case 'URGENT':
        return { label: 'URGENT', class: 'bg-rose-500/10 text-rose-600 border border-rose-500/20' };
      case 'HIGH':
        return { label: 'HIGH', class: 'bg-amber-500/10 text-amber-600 border border-amber-500/20' };
      case 'MEDIUM':
        return { label: 'MEDIUM', class: 'bg-blue-500/10 text-blue-600 border border-blue-500/20' };
      default:
        return { label: 'LOW', class: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' };
    }
  }

  getStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'OVERDUE': return 'danger';
      case 'PENDING': return 'warning';
      default: return 'neutral';
    }
  }
}
