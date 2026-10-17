import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HrmsService, HRCockpitStats, AttendanceRecord, Employee } from '../hrms.service';

@Component({
  selector: 'app-hrms-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hrms-dashboard.component.html'
})
export class HrmsDashboardComponent implements OnInit {
  hrmsService = inject(HrmsService);

  isLoading = signal<boolean>(true);
  isPunchModalOpen = signal<boolean>(false);

  // Punch Form
  selectedEmpId = signal<number | null>(null);
  punchType = signal<string>('IN');
  punchSource = signal<string>('GPS_MOBILE');
  punchRemarks = signal<string>('');
  isSubmittingPunch = signal<boolean>(false);
  punchSuccessMsg = signal<string>('');

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.isLoading.set(true);
    this.hrmsService.loadStats().subscribe({
      next: () => {
        this.hrmsService.loadEmployees().subscribe();
        this.hrmsService.loadAttendance().subscribe();
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openPunchModal() {
    const emps = this.hrmsService.employees();
    if (emps.length > 0 && !this.selectedEmpId()) {
      this.selectedEmpId.set(emps[0].id);
    }
    this.punchSuccessMsg.set('');
    this.isPunchModalOpen.set(true);
  }

  closePunchModal() {
    this.isPunchModalOpen.set(false);
  }

  submitPunch() {
    if (!this.selectedEmpId()) return;

    this.isSubmittingPunch.set(true);
    this.hrmsService.punchAttendance({
      employee_id: this.selectedEmpId()!,
      punch_type: this.punchType(),
      source: this.punchSource(),
      geofence_lat: 23.7925,
      geofence_lng: 90.4078,
      remarks: this.punchRemarks() || 'Site Geofenced Mobile Punch'
    }).subscribe({
      next: (res) => {
        this.isSubmittingPunch.set(false);
        this.punchSuccessMsg.set(`Punch recorded successfully for ${res.employee_name || 'employee'}!`);
        this.hrmsService.loadStats().subscribe();
        this.hrmsService.loadAttendance().subscribe();
        setTimeout(() => this.closePunchModal(), 1500);
      },
      error: (err) => {
        this.isSubmittingPunch.set(false);
        alert(err?.error?.detail || 'Failed to record attendance punch.');
      }
    });
  }
}
