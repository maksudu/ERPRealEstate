import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HrmsAttendanceService } from '../../../../core/services/hrms-attendance.service';
import { HrmsDepartmentService } from '../../../../core/services/hrms-department.service';
import { ProjectService } from '../../../../core/services/project.service';
import { Shift, ShiftAssignment } from '../../../../core/models/hrms-attendance.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent,
  StatusBadgeComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-shift-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent,
    StatusBadgeComponent
  ],
  templateUrl: './shift-management.component.html'
})
export class ShiftManagementComponent implements OnInit {
  attendanceService = inject(HrmsAttendanceService);
  private deptService = inject(HrmsDepartmentService);
  private projectService = inject(ProjectService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Active Tab: 'shifts' (2.1 Shift Definitions) | 'assignments' (2.2 Shift Schedules)
  activeTab = signal<'shifts' | 'assignments'>('shifts');

  // Tab 1 (2.1 Shift Definitions) State
  shiftSearch = signal<string>('');
  shiftStatusFilter = signal<string>('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  shiftLimit = signal<number>(10);
  shiftOffset = signal<number>(0);

  // Tab 2 (2.2 Shift Schedule Assignments) State
  assignmentSearch = signal<string>('');
  assignmentScopeFilter = signal<string>('ALL'); // 'ALL' | 'EMPLOYEE' | 'DEPARTMENT' | 'PROJECT_SITE'
  assignmentShiftId = signal<number | null>(null);
  assignmentLimit = signal<number>(10);
  assignmentOffset = signal<number>(0);

  // Feedback Alerts
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Delete Confirmation Modal State
  deleteModalOpen = signal<boolean>(false);
  itemToDelete = signal<{ type: 'shift' | 'assignment'; id: number; name: string } | null>(null);

  ngOnInit(): void {
    // Check router state or query param for notice / active tab
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'assignments' || tabParam === 'schedules') {
      this.activeTab.set('assignments');
    }

    const stateNotice = history.state?.hrmsNotice;
    if (stateNotice) {
      this.successMessage.set(stateNotice);
    }

    this.loadShifts();
    this.loadAssignments();
    this.deptService.loadDepartments().subscribe();
    this.projectService.getProjects().subscribe();
  }

  // --- Tab 1: Shift Definitions Logic ---
  loadShifts(): void {
    const isActiveParam = this.shiftStatusFilter() === 'ALL'
      ? undefined
      : this.shiftStatusFilter() === 'ACTIVE';

    this.attendanceService.loadShifts({
      search: this.shiftSearch().trim() || undefined,
      is_active: isActiveParam,
      limit: this.shiftLimit(),
      offset: this.shiftOffset()
    }).subscribe();
  }

  onShiftSearchChange(val: string): void {
    this.shiftSearch.set(val);
    this.shiftOffset.set(0);
    this.loadShifts();
  }

  onShiftStatusFilterChange(status: string): void {
    this.shiftStatusFilter.set(status);
    this.shiftOffset.set(0);
    this.loadShifts();
  }

  onShiftPageChange(newOffset: number): void {
    this.shiftOffset.set(newOffset);
    this.loadShifts();
  }

  goToNewShift(): void {
    this.router.navigate(['/hrms/attendance/shifts/new']);
  }

  goToEditShift(shift: Shift): void {
    this.router.navigate(['/hrms/attendance/shifts', shift.id, 'edit']);
  }

  // --- Tab 2: Shift Assignments Logic ---
  loadAssignments(): void {
    const scopeParam = this.assignmentScopeFilter() === 'ALL'
      ? undefined
      : this.assignmentScopeFilter();

    this.attendanceService.loadShiftAssignments({
      shift_id: this.assignmentShiftId() || undefined,
      assignment_type: scopeParam,
      limit: this.assignmentLimit(),
      offset: this.assignmentOffset()
    }).subscribe();
  }

  onAssignmentScopeFilterChange(scope: string): void {
    this.assignmentScopeFilter.set(scope);
    this.assignmentOffset.set(0);
    this.loadAssignments();
  }

  onAssignmentShiftFilterChange(shiftIdStr: string): void {
    const shiftId = shiftIdStr ? Number(shiftIdStr) : null;
    this.assignmentShiftId.set(shiftId);
    this.assignmentOffset.set(0);
    this.loadAssignments();
  }

  onAssignmentPageChange(newOffset: number): void {
    this.assignmentOffset.set(newOffset);
    this.loadAssignments();
  }

  goToNewAssignment(): void {
    this.router.navigate(['/hrms/attendance/shifts/assignments/new']);
  }

  goToEditAssignment(sa: ShiftAssignment): void {
    this.router.navigate(['/hrms/attendance/shifts/assignments', sa.id, 'edit']);
  }

  // --- Deletion Flow ---
  promptDeleteShift(shift: Shift): void {
    this.itemToDelete.set({
      type: 'shift',
      id: shift.id,
      name: `${shift.shift_name} (${shift.shift_code})`
    });
    this.deleteModalOpen.set(true);
  }

  promptDeleteAssignment(sa: ShiftAssignment): void {
    this.itemToDelete.set({
      type: 'assignment',
      id: sa.id,
      name: `${sa.shift_name} → ${sa.target_name || sa.target_code || 'Target'}`
    });
    this.deleteModalOpen.set(true);
  }

  confirmDelete(): void {
    const target = this.itemToDelete();
    if (!target) return;

    if (target.type === 'shift') {
      this.attendanceService.deleteShift(target.id).subscribe({
        next: () => {
          this.successMessage.set(`Shift '${target.name}' deleted successfully.`);
          this.deleteModalOpen.set(false);
          this.itemToDelete.set(null);
          this.loadShifts();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to delete shift');
          this.deleteModalOpen.set(false);
        }
      });
    } else {
      this.attendanceService.deleteShiftAssignment(target.id).subscribe({
        next: () => {
          this.successMessage.set(`Shift schedule assignment deleted successfully.`);
          this.deleteModalOpen.set(false);
          this.itemToDelete.set(null);
          this.loadAssignments();
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.detail || 'Failed to delete shift schedule assignment');
          this.deleteModalOpen.set(false);
        }
      });
    }
  }

  cancelDelete(): void {
    this.deleteModalOpen.set(false);
    this.itemToDelete.set(null);
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
