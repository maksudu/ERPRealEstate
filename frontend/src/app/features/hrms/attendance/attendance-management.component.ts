import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService, AttendanceRecord, LeaveRecord } from '../hrms.service';

@Component({
  selector: 'app-attendance-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-management.component.html'
})
export class AttendanceManagementComponent implements OnInit {
  hrmsService = inject(HrmsService);

  activeTab = signal<string>('PUNCHES'); // PUNCHES, LEAVES
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  leaveStatusFilter = signal<string>('ALL');

  // Leave Modal
  isLeaveModalOpen = signal<boolean>(false);
  isApplying = signal<boolean>(false);
  newLeave = signal<{
    employee_id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    reason: string;
  }>({
    employee_id: 1,
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  ngOnInit() {
    this.refreshPunches();
    this.refreshLeaves();
    this.hrmsService.loadEmployees().subscribe((emps) => {
      if (emps.length > 0) {
        this.newLeave.update(l => ({ ...l, employee_id: emps[0].id }));
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  refreshPunches() {
    this.hrmsService.loadAttendance(this.selectedDate()).subscribe();
  }

  refreshLeaves() {
    const status = this.leaveStatusFilter() === 'ALL' ? undefined : this.leaveStatusFilter();
    this.hrmsService.loadLeaves(status).subscribe();
  }

  openLeaveModal() {
    this.isLeaveModalOpen.set(true);
  }

  closeLeaveModal() {
    this.isLeaveModalOpen.set(false);
  }

  submitLeave() {
    const data = this.newLeave();
    if (!data.reason) {
      alert('Please provide a reason for the leave application.');
      return;
    }

    this.isApplying.set(true);
    this.hrmsService.applyLeave(data).subscribe({
      next: () => {
        this.isApplying.set(false);
        this.closeLeaveModal();
        this.refreshLeaves();
        alert('Leave application submitted successfully!');
      },
      error: (err) => {
        this.isApplying.set(false);
        alert(err?.error?.detail || 'Failed to apply for leave.');
      }
    });
  }

  reviewLeave(leaveId: number, status: string) {
    const remarks = prompt(`Enter remarks for ${status.toLowerCase()} this leave request:`, 'Approved by Management');
    if (remarks === null) return;

    this.hrmsService.reviewLeave(leaveId, status, remarks).subscribe({
      next: () => {
        alert(`Leave ${status.toLowerCase()} successfully.`);
        this.refreshLeaves();
      },
      error: (err) => alert(err?.error?.detail || 'Failed to review leave.')
    });
  }
}
