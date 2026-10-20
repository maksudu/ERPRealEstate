import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MobileSiteService, MobileSiteTaskItem } from '../../../core/services/mobile-site.service';
import { MobileSiteNavComponent } from '../mobile-site-nav/mobile-site-nav.component';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mobile-site-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, MobileSiteNavComponent, CardContainerComponent, ModalComponent],
  template: `
    <div class="p-4 sm:p-6 w-full space-y-6">
      <app-mobile-site-nav />

      <!-- Main Container with Table Paging & Filter -->
      <app-card title="Construction Tasks & Milestone Tracker" subtitle="Assign work items, set completion deadlines, monitor WBS execution and record progress percentages">
        <!-- Actions Bar -->
        <div card-actions class="flex items-center gap-2.5">
          <button
            type="button"
            (click)="openCreateModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
          >
            <span>+</span> Assign New Task
          </button>
        </div>

        <!-- Filter Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onFilterChange()"
              placeholder="Search by task name, milestone, engineer..."
              class="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 w-full sm:w-72 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />

            <select
              [(ngModel)]="selectedStatus"
              (ngModelChange)="onFilterChange()"
              class="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Task Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="DELAYED">Delayed</option>
            </select>
          </div>

          <div class="text-xs text-slate-500 font-mono">
            Total Tasks: {{ totalCount }}
          </div>
        </div>

        <!-- Data Table -->
        <div class="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th class="p-3">Task Code</th>
                <th class="p-3">Task Name</th>
                <th class="p-3">Milestone Group</th>
                <th class="p-3">Project</th>
                <th class="p-3">Assigned In-Charge</th>
                <th class="p-3">Deadline</th>
                <th class="p-3">Execution Progress</th>
                <th class="p-3">Status</th>
                <th class="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (task of tasks; track task.id) {
                <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td class="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                    {{ task.task_code }}
                  </td>
                  <td class="p-3 font-semibold text-slate-900 dark:text-slate-100">
                    {{ task.task_name }}
                  </td>
                  <td class="p-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                      {{ task.milestone_name }}
                    </span>
                  </td>
                  <td class="p-3 text-slate-600 dark:text-slate-400">
                    {{ task.project_name }}
                  </td>
                  <td class="p-3 font-medium">
                    {{ task.assigned_to }}
                  </td>
                  <td class="p-3 font-mono">
                    {{ task.deadline }}
                  </td>
                  <td class="p-3 w-40">
                    <div class="flex items-center gap-2">
                      <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          class="h-2 rounded-full"
                          [ngClass]="{
                            'bg-emerald-500': task.progress_percentage === 100,
                            'bg-amber-500': task.progress_percentage > 0 && task.progress_percentage < 100,
                            'bg-slate-300': task.progress_percentage === 0
                          }"
                          [style.width.%]="task.progress_percentage"
                        ></div>
                      </div>
                      <span class="font-mono text-[11px] font-bold">{{ task.progress_percentage }}%</span>
                    </div>
                  </td>
                  <td class="p-3">
                    <span
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400': task.status === 'COMPLETED',
                        'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400': task.status === 'IN_PROGRESS',
                        'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400': task.status === 'NOT_STARTED',
                        'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400': task.status === 'DELAYED'
                      }"
                    >
                      {{ task.status }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <div class="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditModal(task)"
                        class="px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded transition"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        (click)="deleteTask(task)"
                        class="px-2 py-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="p-8 text-center text-slate-400">
                    No construction tasks found. Click "+ Assign New Task" to create one.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex items-center justify-between mt-4 text-xs text-slate-500">
          <div>
            Showing {{ Math.min(offset + 1, totalCount) }} to {{ Math.min(offset + limit, totalCount) }} of {{ totalCount }} records
          </div>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset === 0"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Previous
            </button>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset + limit >= totalCount"
              class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Next
            </button>
          </div>
        </div>
      </app-card>

      <!-- Modal Dialog for Add / Edit Task -->
      <app-modal
        [isOpen]="isModalOpen"
        [title]="editingTaskId ? 'Edit Construction Task Progress' : 'Assign New Construction Work Task'"
        (closed)="closeModal()"
      >
        <div class="space-y-4 text-xs">
          <div>
            <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Task Description / Work Item *</label>
            <input
              type="text"
              [(ngModel)]="formData.task_name"
              class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Tower Alpha 14th Floor Slab Concrete Casting"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Milestone Category *</label>
              <input
                type="text"
                [(ngModel)]="formData.milestone_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Superstructure Frame"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                [(ngModel)]="formData.project_name"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="BlueOceans Marina Bay"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Assigned In-Charge *</label>
              <input
                type="text"
                [(ngModel)]="formData.assigned_to"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-1 focus:ring-amber-500"
                placeholder="Engr. Sajjad Hossain"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Target Deadline *</label>
              <input
                type="date"
                [(ngModel)]="formData.deadline"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select
                [(ngModel)]="formData.priority"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High Priority</option>
                <option value="CRITICAL">Critical Path</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Completion Progress (%) : {{ formData.progress_percentage }}%</label>
              <input
                type="range"
                min="0"
                max="100"
                [(ngModel)]="formData.progress_percentage"
                class="w-full accent-amber-600 cursor-pointer"
              />
            </div>
            <div>
              <label class="block font-medium text-slate-700 dark:text-slate-300 mb-1">Current Execution Status</label>
              <select
                [(ngModel)]="formData.status"
                class="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="NOT_STARTED">Not Started</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed (100%)</option>
                <option value="DELAYED">Delayed / Blocked</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              (click)="closeModal()"
              class="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="saveTask()"
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-xs"
            >
              {{ editingTaskId ? 'Update Task' : 'Assign Task' }}
            </button>
          </div>
        </div>
      </app-modal>
    </div>
  `
})
export class MobileSiteTasksComponent implements OnInit {
  private service = inject(MobileSiteService);
  Math = Math;

  tasks: MobileSiteTaskItem[] = [];
  totalCount = 0;
  limit = 10;
  offset = 0;

  searchQuery = '';
  selectedStatus = 'ALL';

  isModalOpen = false;
  editingTaskId: number | null = null;
  formData: Partial<MobileSiteTaskItem> = {
    task_name: '',
    milestone_name: 'Sub-Structure Casting',
    project_name: 'BlueOceans Marina Bay',
    assigned_to: 'Engr. Sajjad Hossain',
    deadline: new Date().toISOString().slice(0, 10),
    progress_percentage: 0,
    priority: 'HIGH',
    status: 'IN_PROGRESS'
  };

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.service.getTasks({
      search: this.searchQuery,
      status: this.selectedStatus,
      limit: this.limit,
      offset: this.offset
    }).subscribe({
      next: (res) => {
        this.tasks = res.items || [];
        this.totalCount = res.total || 0;
      },
      error: (err) => console.error('Failed to load tasks', err)
    });
  }

  onFilterChange(): void {
    this.offset = 0;
    this.loadTasks();
  }

  nextPage(): void {
    if (this.offset + this.limit < this.totalCount) {
      this.offset += this.limit;
      this.loadTasks();
    }
  }

  prevPage(): void {
    if (this.offset >= this.limit) {
      this.offset -= this.limit;
      this.loadTasks();
    }
  }

  openCreateModal(): void {
    this.editingTaskId = null;
    this.formData = {
      task_name: '',
      milestone_name: 'Superstructure Frame',
      project_name: 'BlueOceans Marina Bay',
      assigned_to: 'Engr. Sajjad Hossain',
      deadline: new Date().toISOString().slice(0, 10),
      progress_percentage: 0,
      priority: 'HIGH',
      status: 'IN_PROGRESS'
    };
    this.isModalOpen = true;
  }

  openEditModal(task: MobileSiteTaskItem): void {
    this.editingTaskId = task.id;
    this.formData = { ...task };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveTask(): void {
    if (!this.formData.task_name || !this.formData.project_name || !this.formData.assigned_to) {
      alert('Please fill in Task Name, Project Name, and Assigned Engineer.');
      return;
    }

    if (this.editingTaskId) {
      this.service.updateTask(this.editingTaskId, this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadTasks();
        },
        error: (err) => console.error('Failed to update task', err)
      });
    } else {
      this.service.createTask(this.formData).subscribe({
        next: () => {
          this.closeModal();
          this.loadTasks();
        },
        error: (err) => console.error('Failed to create task', err)
      });
    }
  }

  deleteTask(task: MobileSiteTaskItem): void {
    if (confirm(`Remove task ${task.task_code} (${task.task_name})?`)) {
      this.service.deleteTask(task.id).subscribe({
        next: () => this.loadTasks(),
        error: (err) => console.error('Failed to delete task', err)
      });
    }
  }
}
