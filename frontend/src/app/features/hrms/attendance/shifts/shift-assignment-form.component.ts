import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HrmsAttendanceService } from '../../../../core/services/hrms-attendance.service';
import { HrmsEmployeeService } from '../../../../core/services/hrms-employee.service';
import { HrmsDepartmentService } from '../../../../core/services/hrms-department.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Shift, ShiftAssignment, ShiftAssignmentCreatePayload } from '../../../../core/models/hrms-attendance.model';
import { Employee } from '../../../../core/models/hrms-employee.model';
import { Project } from '../../../../core/models/project.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-shift-assignment-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent
  ],
  templateUrl: './shift-assignment-form.component.html'
})
export class ShiftAssignmentFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  attendanceService = inject(HrmsAttendanceService);
  employeeService = inject(HrmsEmployeeService);
  deptService = inject(HrmsDepartmentService);
  private projectService = inject(ProjectService);

  mode = signal<'create' | 'edit'>('create');
  assignmentId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Error Alerts
  errorMessage = signal<string | null>(null);

  // Form Model
  assignForm = signal<ShiftAssignmentCreatePayload>({
    shift_id: 0,
    assignment_type: 'EMPLOYEE',
    employee_id: undefined,
    employee_ids: [],
    department_id: undefined,
    project_id: undefined,
    effective_from: new Date().toISOString().substring(0, 10),
    effective_to: '',
    is_active: true,
    remarks: ''
  });

  // Multi-employee selection state
  selectedEmployeeIds = signal<number[]>([]);
  employeeSearchTerm = signal<string>('');
  projects = signal<Project[]>([]);

  // Filtered employees for multi-select
  filteredEmployees = computed(() => {
    const list = this.employeeService.employees();
    const q = this.employeeSearchTerm().trim().toLowerCase();
    if (!q) return list;
    return list.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.full_name_bn && e.full_name_bn.toLowerCase().includes(q)) ||
      (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
      (e.designation_title && e.designation_title.toLowerCase().includes(q)) ||
      (e.department_name && e.department_name.toLowerCase().includes(q))
    );
  });

  // Selected employee objects
  selectedEmployeesList = computed(() => {
    const ids = this.selectedEmployeeIds();
    const list = this.employeeService.employees();
    return list.filter(e => ids.includes(e.id));
  });

  ngOnInit(): void {
    // Load prerequisite master data
    this.attendanceService.loadShifts({ is_active: true, limit: 100 }).subscribe({
      next: (res) => {
        if (res.items.length > 0 && !this.assignForm().shift_id) {
          this.assignForm.update(f => ({ ...f, shift_id: res.items[0].id }));
        }
      }
    });
    this.employeeService.loadEmployees({ limit: 200 }).subscribe();
    this.deptService.loadDepartments().subscribe();
    this.projectService.getProjects().subscribe({
      next: (projs) => this.projects.set(projs || [])
    });

    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id) && id > 0) {
          this.mode.set('edit');
          this.assignmentId.set(id);
          this.loadAssignmentData(id);
          return;
        }
      }
      this.mode.set('create');
    });
  }

  loadAssignmentData(id: number): void {
    this.isLoading.set(true);
    this.attendanceService.getShiftAssignment(id).subscribe({
      next: (sa: ShiftAssignment) => {
        this.isLoading.set(false);
        this.assignForm.set({
          shift_id: sa.shift_id,
          assignment_type: sa.assignment_type,
          employee_id: sa.employee_id,
          employee_ids: sa.employee_id ? [sa.employee_id] : [],
          department_id: sa.department_id,
          project_id: sa.project_id,
          effective_from: sa.effective_from,
          effective_to: sa.effective_to || '',
          is_active: !!sa.is_active,
          remarks: sa.remarks || ''
        });
        if (sa.employee_id) {
          this.selectedEmployeeIds.set([sa.employee_id]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load shift schedule details');
      }
    });
  }

  // --- Multi-Employee Handlers ---
  isEmployeeSelected(id: number): boolean {
    return this.selectedEmployeeIds().includes(id);
  }

  toggleEmployeeSelection(emp: Employee): void {
    const current = this.selectedEmployeeIds();
    if (current.includes(emp.id)) {
      this.selectedEmployeeIds.set(current.filter(id => id !== emp.id));
    } else {
      this.selectedEmployeeIds.set([...current, emp.id]);
    }
  }

  removeSelectedEmployee(id: number, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedEmployeeIds.set(this.selectedEmployeeIds().filter(eid => eid !== id));
  }

  selectAllFiltered(): void {
    const filtered = this.filteredEmployees();
    const current = new Set(this.selectedEmployeeIds());
    filtered.forEach(e => current.add(e.id));
    this.selectedEmployeeIds.set(Array.from(current));
  }

  clearAllSelected(): void {
    this.selectedEmployeeIds.set([]);
  }

  // --- Form Submission ---
  submitAssignment(): void {
    const data = this.assignForm();
    if (!data.shift_id) {
      this.errorMessage.set('Please select a shift definition.');
      return;
    }

    if (!data.effective_from) {
      this.errorMessage.set('Effective From date is required.');
      return;
    }

    if (data.assignment_type === 'EMPLOYEE') {
      const selectedIds = this.selectedEmployeeIds();
      if (selectedIds.length === 0) {
        this.errorMessage.set('Please select at least one target employee.');
        return;
      }
      data.employee_ids = selectedIds;
      data.employee_id = selectedIds[0];
      data.department_id = undefined;
      data.project_id = undefined;
    } else if (data.assignment_type === 'DEPARTMENT') {
      if (!data.department_id) {
        this.errorMessage.set('Please select a target department.');
        return;
      }
      data.employee_id = undefined;
      data.employee_ids = [];
      data.project_id = undefined;
    } else if (data.assignment_type === 'PROJECT_SITE') {
      if (!data.project_id) {
        this.errorMessage.set('Please select a target project site.');
        return;
      }
      data.employee_id = undefined;
      data.employee_ids = [];
      data.department_id = undefined;
    }

    const payload: ShiftAssignmentCreatePayload = {
      ...data,
      effective_to: data.effective_to ? data.effective_to : undefined,
      remarks: data.remarks?.trim() || undefined
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    if (this.mode() === 'edit' && this.assignmentId()) {
      this.attendanceService.updateShiftAssignment(this.assignmentId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/hrms/attendance/shifts'], {
            queryParams: { tab: 'assignments' },
            state: { hrmsNotice: 'Shift schedule assignment updated successfully!' }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update shift schedule.');
        }
      });
    } else {
      this.attendanceService.createShiftAssignment(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          const count = payload.employee_ids && payload.employee_ids.length > 1
            ? `for ${payload.employee_ids.length} employees`
            : '';
          this.router.navigate(['/hrms/attendance/shifts'], {
            queryParams: { tab: 'assignments' },
            state: { hrmsNotice: `Shift schedule assigned successfully ${count}!` }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to assign shift schedule.');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/hrms/attendance/shifts'], {
      queryParams: { tab: 'assignments' }
    });
  }
}
