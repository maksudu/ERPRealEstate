import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CardContainerComponent,
  CustomTabsComponent,
  TabItem,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  StatusBadgeComponent,
  ModalComponent
} from '../../../shared/components';
import { HrmsAttendanceService } from '../../../core/services/hrms-attendance.service';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { HrmsDepartmentService } from '../../../core/services/hrms-department.service';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { ProjectService } from '../../../core/services/project.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  Shift,
  ShiftCreatePayload,
  ShiftAssignment,
  ShiftAssignmentCreatePayload,
  BiometricDevice,
  BiometricDeviceCreatePayload,
  HolidayCalendar,
  HolidayCalendarCreatePayload,
  SiteGeofence,
  SiteGeofenceCreatePayload,
  AttendanceCorrection,
  AttendanceCorrectionCreatePayload,
  AttendanceRecord,
  AttendancePunchPayload
} from '../../../core/models/hrms-attendance.model';
import { LookupItem } from '../../../core/models/lookup.model';

@Component({
  selector: 'app-attendance-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    StatusBadgeComponent,
    ModalComponent
  ],
  templateUrl: './attendance-management.component.html'
})
export class AttendanceManagementComponent implements OnInit {
  private route = inject(ActivatedRoute);
  attendanceService = inject(HrmsAttendanceService);
  employeeService = inject(HrmsEmployeeService);
  departmentService = inject(HrmsDepartmentService);
  orgService = inject(HrmsOrgService);
  projectService = inject(ProjectService);
  lookupService = inject(LookupService);

  // Active Main Tab
  activeTab = signal<string>('punches');

  tabs: TabItem[] = [
    { id: 'punches', label: 'Attendance Register', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'shifts', label: 'Shifts & Schedules', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'devices', label: 'ZKTeco Biometrics', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { id: 'corrections', label: 'Missing Punches & Corrections', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'holidays', label: 'Holiday Calendar', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'geofences', label: 'Site Geofencing', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { id: 'settings', label: 'Dynamic Lookups', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }
  ];

  // Feedback notifications
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filter Signals for Attendance Register
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  selectedDepartmentId = signal<number | null>(null);
  selectedShiftId = signal<number | null>(null);
  selectedStatus = signal<string>('');
  searchQuery = signal<string>('');
  attPage = signal<number>(0);
  attLimit = signal<number>(20);

  // Filter Signals for Shifts
  shiftSearch = signal<string>('');

  // Filter Signals for Biometrics
  deviceSearch = signal<string>('');
  deviceStatusFilter = signal<string>('');

  // Filter Signals for Corrections
  correctionStatusFilter = signal<string>('');

  // Filter Signals for Holidays
  holidayYear = signal<number>(new Date().getFullYear());
  holidayTypeFilter = signal<string>('');

  // Filter Signals for Geofences
  geofenceProjectId = signal<number | null>(null);

  // Settings Dynamic Lookup Category
  selectedLookupCategory = signal<string>('HR_ATTENDANCE_STATUS');
  lookupItems = signal<LookupItem[]>([]);

  // Selection Options Signals for Dynamic Dropdowns
  employeeOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);
  departmentOptions = signal<{ value: number; label: string }[]>([]);
  shiftOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);
  branchOptions = signal<{ value: number; label: string }[]>([]);
  projectOptions = signal<{ value: number; label: string }[]>([]);
  geofenceOptions = signal<{ value: number; label: string; subLabel?: string }[]>([]);

  // ==========================================
  // --- Modals State ---
  // ==========================================
  // 1. Record Punch Modal
  isPunchModalOpen = signal<boolean>(false);
  punchForm = signal<AttendancePunchPayload>({
    employee_id: 0,
    punch_type: 'IN',
    punch_date: new Date().toISOString().split('T')[0],
    punch_time: new Date().toISOString().slice(0, 19),
    source: 'WEB_PUNCH',
    geofence_lat: undefined,
    geofence_lng: undefined,
    site_id: undefined,
    remarks: ''
  });

  // 2. Daily Attendance Batch Processor Modal
  isProcessModalOpen = signal<boolean>(false);
  processForm = signal<{ process_date: string; department_id?: number }>({
    process_date: new Date().toISOString().split('T')[0],
    department_id: undefined
  });

  // 3. Shift Definition Modal (Create / Edit)
  isShiftModalOpen = signal<boolean>(false);
  editingShiftId = signal<number | null>(null);
  shiftForm = signal<ShiftCreatePayload>({
    shift_name: '',
    shift_code: '',
    start_time: '09:00:00',
    end_time: '18:00:00',
    break_start_time: '13:00:00',
    break_end_time: '14:00:00',
    break_duration_minutes: 60,
    grace_period_minutes: 15,
    half_day_minimum_minutes: 240,
    full_day_minimum_minutes: 480,
    is_night_shift: false,
    is_active: true
  });

  // 4. Shift Assignment Modal
  isAssignModalOpen = signal<boolean>(false);
  assignForm = signal<ShiftAssignmentCreatePayload>({
    shift_id: 0,
    assignment_type: 'EMPLOYEE',
    employee_id: undefined,
    department_id: undefined,
    project_id: undefined,
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: undefined,
    is_active: true,
    remarks: ''
  });

  // 5. Biometric Device Modal
  isDeviceModalOpen = signal<boolean>(false);
  editingDeviceId = signal<number | null>(null);
  deviceForm = signal<BiometricDeviceCreatePayload>({
    device_name: '',
    device_serial: '',
    device_model: 'ZKTECO_INBIO_460',
    ip_address: '192.168.1.201',
    port: 4370,
    location: '',
    assigned_branch_id: undefined,
    assigned_project_id: undefined,
    status: 'ONLINE',
    is_active: true
  });

  // 6. Device Sync / Simulated Punch Import Modal
  isDeviceSyncModalOpen = signal<boolean>(false);
  selectedSyncDeviceId = signal<number | null>(null);
  syncLogPunches = signal<string>('');

  // 7. Attendance Correction Request Modal
  isCorrectionModalOpen = signal<boolean>(false);
  correctionForm = signal<AttendanceCorrectionCreatePayload>({
    employee_id: 0,
    attendance_id: undefined,
    request_date: new Date().toISOString().split('T')[0],
    requested_clock_in: new Date().toISOString().slice(0, 16),
    requested_clock_out: new Date().toISOString().slice(0, 16),
    reason: ''
  });

  // 8. Manager Verification Modal
  isVerifyModalOpen = signal<boolean>(false);
  selectedCorrectionForVerify = signal<AttendanceCorrection | null>(null);
  managerRemarks = signal<string>('Verified and validated against site supervisor log');

  // 9. HR Approval Modal
  isApproveModalOpen = signal<boolean>(false);
  selectedCorrectionForApprove = signal<AttendanceCorrection | null>(null);
  hrRemarks = signal<string>('Approved and adjusted in payroll attendance ledger');

  // 10. Holiday Modal
  isHolidayModalOpen = signal<boolean>(false);
  editingHolidayId = signal<number | null>(null);
  holidayForm = signal<HolidayCalendarCreatePayload>({
    holiday_name: '',
    holiday_type: 'PUBLIC_HOLIDAY',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    applicable_branch_id: undefined,
    applicable_project_id: undefined,
    is_recurring_yearly: false,
    description: '',
    is_active: true
  });

  // 11. Site Geofence Modal
  isGeofenceModalOpen = signal<boolean>(false);
  editingGeofenceId = signal<number | null>(null);
  geofenceForm = signal<SiteGeofenceCreatePayload>({
    project_id: 0,
    site_name: '',
    latitude: 23.7925,
    longitude: 90.4078,
    radius_meters: 250,
    is_active: true
  });

  // 12. Quick Lookup Creation Modal (Dynamic creation from dropdown)
  isQuickLookupModalOpen = signal<boolean>(false);
  quickLookupCategoryCode = signal<string>('');
  quickLookupEnglishName = signal<string>('');
  quickLookupBanglaName = signal<string>('');

  ngOnInit() {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'shifts' || last === 'rosters') {
        this.activeTab.set('shifts');
      } else if (last === 'biometric') {
        this.activeTab.set('devices');
      } else if (last === 'corrections' || last === 'missing-punches') {
        this.activeTab.set('corrections');
      } else if (last === 'holiday-calendar') {
        this.activeTab.set('holidays');
      } else if (last === 'mobile-checkin') {
        this.activeTab.set('geofences');
      } else if (last === 'logs' || last === 'site-attendance' || last === 'late-early') {
        this.activeTab.set('punches');
      }
      this.refreshCurrentTab();
    });
    this.loadAllDropdownOptions();
    this.refreshCurrentTab();
  }

  // Tab Switcher
  setActiveTab(tabId: string) {
    this.activeTab.set(tabId);
    this.clearAlerts();
    this.refreshCurrentTab();
  }

  refreshCurrentTab() {
    const tab = this.activeTab();
    if (tab === 'punches') {
      this.refreshAttendance();
      this.refreshDailySummary();
    } else if (tab === 'shifts') {
      this.refreshShifts();
      this.refreshShiftAssignments();
    } else if (tab === 'devices') {
      this.refreshDevices();
    } else if (tab === 'corrections') {
      this.refreshCorrections();
      this.refreshMissingPunches();
    } else if (tab === 'holidays') {
      this.refreshHolidays();
    } else if (tab === 'geofences') {
      this.refreshGeofences();
    } else if (tab === 'settings') {
      this.refreshLookupCategoryItems();
    }
  }

  // Load Dropdown Options dynamically
  loadAllDropdownOptions() {
    // 1. Employees
    this.employeeService.loadEmployees({ all: true }).subscribe({
      next: (res) => {
        const opts = (res.items || []).map(e => ({
          value: e.id,
          label: `${e.first_name} ${e.last_name}`,
          subLabel: `${e.employee_code} • ${e.department_name || 'No Dept'}`
        }));
        this.employeeOptions.set(opts);
        if (opts.length > 0 && !this.punchForm().employee_id) {
          this.punchForm.update(f => ({ ...f, employee_id: opts[0].value }));
          this.correctionForm.update(f => ({ ...f, employee_id: opts[0].value }));
        }
      }
    });

    // 2. Departments
    this.departmentService.loadDepartments().subscribe({
      next: (depts) => {
        this.departmentOptions.set((depts || []).map(d => ({
          value: d.id,
          label: d.name_en
        })));
      }
    });

    // 3. Shifts
    this.attendanceService.loadShifts({ is_active: true }).subscribe({
      next: (res) => {
        const opts = (res.items || []).map(s => ({
          value: s.id,
          label: s.shift_name,
          subLabel: `${s.shift_code} (${s.start_time} - ${s.end_time})`
        }));
        this.shiftOptions.set(opts);
        if (opts.length > 0 && !this.assignForm().shift_id) {
          this.assignForm.update(f => ({ ...f, shift_id: opts[0].value }));
        }
      }
    });

    // 4. Branches
    this.orgService.loadBranches().subscribe({
      next: (branches) => {
        this.branchOptions.set((branches || []).map(b => ({
          value: b.id,
          label: b.branch_name
        })));
      }
    });

    // 5. Projects
    this.projectService.getProjects().subscribe({
      next: (projects) => {
        const opts = (projects || []).map(p => ({
          value: p.id,
          label: p.project_name
        }));
        this.projectOptions.set(opts);
        if (opts.length > 0 && !this.geofenceForm().project_id) {
          this.geofenceForm.update(f => ({ ...f, project_id: opts[0].value }));
        }
      }
    });

    // 6. Geofences
    this.attendanceService.loadSiteGeofences().subscribe({
      next: (res) => {
        this.geofenceOptions.set((res.items || []).map(g => ({
          value: g.id,
          label: g.site_name,
          subLabel: `Radius: ${g.radius_meters}m`
        })));
      }
    });
  }

  // ==========================================
  // --- Attendance Register Logic ---
  // ==========================================
  refreshAttendance() {
    this.attendanceService.loadAttendance({
      punch_date: this.selectedDate(),
      department_id: this.selectedDepartmentId() || undefined,
      shift_id: this.selectedShiftId() || undefined,
      status: this.selectedStatus() || undefined,
      search: this.searchQuery() || undefined,
      limit: this.attLimit(),
      offset: this.attPage() * this.attLimit()
    }).subscribe();
  }

  refreshDailySummary() {
    this.attendanceService.loadDailySummary(this.selectedDate()).subscribe();
  }

  onDateChange(newDate: string) {
    this.selectedDate.set(newDate);
    this.attPage.set(0);
    this.refreshAttendance();
    this.refreshDailySummary();
  }

  onFilterChange() {
    this.attPage.set(0);
    this.refreshAttendance();
  }

  prevAttPage() {
    if (this.attPage() > 0) {
      this.attPage.update(p => p - 1);
      this.refreshAttendance();
    }
  }

  nextAttPage() {
    const total = this.attendanceService.totalAttendance();
    if ((this.attPage() + 1) * this.attLimit() < total) {
      this.attPage.update(p => p + 1);
      this.refreshAttendance();
    }
  }

  openPunchModal(presetEmployeeId?: number) {
    const now = new Date();
    this.punchForm.set({
      employee_id: presetEmployeeId || (this.employeeOptions()[0]?.value || 0),
      punch_type: 'IN',
      punch_date: this.selectedDate(),
      punch_time: now.toISOString().slice(0, 19),
      source: 'WEB_PUNCH',
      geofence_lat: undefined,
      geofence_lng: undefined,
      site_id: undefined,
      remarks: ''
    });
    this.isPunchModalOpen.set(true);
  }

  closePunchModal() {
    this.isPunchModalOpen.set(false);
  }

  submitPunch() {
    const data = this.punchForm();
    if (!data.employee_id) {
      this.errorMessage.set('Please select an employee.');
      return;
    }

    this.attendanceService.punchAttendance(data).subscribe({
      next: (res) => {
        this.successMessage.set(`Attendance punch recorded successfully for ${res.employee_name || 'Employee'}. Status: ${res.status}`);
        this.closePunchModal();
        this.refreshAttendance();
        this.refreshDailySummary();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Failed to record punch.');
      }
    });
  }

  openProcessModal() {
    this.processForm.set({
      process_date: this.selectedDate(),
      department_id: this.selectedDepartmentId() || undefined
    });
    this.isProcessModalOpen.set(true);
  }

  closeProcessModal() {
    this.isProcessModalOpen.set(false);
  }

  submitDailyProcess() {
    const form = this.processForm();
    this.attendanceService.processDailyAttendance(form.process_date, form.department_id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Daily attendance batch processing completed!');
        this.closeProcessModal();
        this.refreshAttendance();
        this.refreshDailySummary();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.detail || 'Attendance batch processing failed.');
      }
    });
  }

  // ==========================================
  // --- Shifts & Assignments Logic ---
  // ==========================================
  refreshShifts() {
    this.attendanceService.loadShifts({
      search: this.shiftSearch() || undefined
    }).subscribe();
  }

  refreshShiftAssignments() {
    this.attendanceService.loadShiftAssignments().subscribe();
  }

  openShiftModal(shift?: Shift) {
    if (shift) {
      this.editingShiftId.set(shift.id);
      this.shiftForm.set({
        shift_name: shift.shift_name,
        shift_code: shift.shift_code,
        start_time: shift.start_time,
        end_time: shift.end_time,
        break_start_time: shift.break_start_time,
        break_end_time: shift.break_end_time,
        break_duration_minutes: shift.break_duration_minutes,
        grace_period_minutes: shift.grace_period_minutes,
        half_day_minimum_minutes: shift.half_day_minimum_minutes,
        full_day_minimum_minutes: shift.full_day_minimum_minutes,
        is_night_shift: shift.is_night_shift,
        is_active: shift.is_active
      });
    } else {
      this.editingShiftId.set(null);
      this.shiftForm.set({
        shift_name: '',
        shift_code: '',
        start_time: '09:00:00',
        end_time: '18:00:00',
        break_start_time: '13:00:00',
        break_end_time: '14:00:00',
        break_duration_minutes: 60,
        grace_period_minutes: 15,
        half_day_minimum_minutes: 240,
        full_day_minimum_minutes: 480,
        is_night_shift: false,
        is_active: true
      });
    }
    this.isShiftModalOpen.set(true);
  }

  closeShiftModal() {
    this.isShiftModalOpen.set(false);
  }

  submitShift() {
    const data = this.shiftForm();
    if (!data.shift_name || !data.shift_code) {
      this.errorMessage.set('Shift name and unique code are required.');
      return;
    }

    const editId = this.editingShiftId();
    if (editId) {
      this.attendanceService.updateShift(editId, data).subscribe({
        next: () => {
          this.successMessage.set(`Shift '${data.shift_name}' updated successfully!`);
          this.closeShiftModal();
          this.refreshShifts();
          this.loadAllDropdownOptions();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to update shift.')
      });
    } else {
      this.attendanceService.createShift(data).subscribe({
        next: () => {
          this.successMessage.set(`Shift '${data.shift_name}' created successfully!`);
          this.closeShiftModal();
          this.refreshShifts();
          this.loadAllDropdownOptions();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to create shift.')
      });
    }
  }

  deleteShift(id: number) {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    this.attendanceService.deleteShift(id).subscribe({
      next: () => {
        this.successMessage.set('Shift deleted successfully.');
        this.refreshShifts();
        this.loadAllDropdownOptions();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to delete shift.')
    });
  }

  openAssignModal() {
    this.assignForm.set({
      shift_id: this.shiftOptions()[0]?.value || 0,
      assignment_type: 'EMPLOYEE',
      employee_id: this.employeeOptions()[0]?.value || undefined,
      department_id: undefined,
      project_id: undefined,
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: undefined,
      is_active: true,
      remarks: ''
    });
    this.isAssignModalOpen.set(true);
  }

  closeAssignModal() {
    this.isAssignModalOpen.set(false);
  }

  submitShiftAssignment() {
    const data = this.assignForm();
    if (!data.shift_id) {
      this.errorMessage.set('Please select a shift to assign.');
      return;
    }

    this.attendanceService.createShiftAssignment(data).subscribe({
      next: () => {
        this.successMessage.set('Shift schedule assigned successfully!');
        this.closeAssignModal();
        this.refreshShiftAssignments();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to assign shift schedule.')
    });
  }

  deleteShiftAssignment(id: number) {
    if (!confirm('Remove this shift schedule assignment?')) return;
    this.attendanceService.deleteShiftAssignment(id).subscribe({
      next: () => {
        this.successMessage.set('Shift assignment removed.');
        this.refreshShiftAssignments();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to remove assignment.')
    });
  }

  // ==========================================
  // --- ZKTeco Biometrics Logic ---
  // ==========================================
  refreshDevices() {
    this.attendanceService.loadBiometricDevices({
      search: this.deviceSearch() || undefined,
      status: this.deviceStatusFilter() || undefined
    }).subscribe();
  }

  openDeviceModal(dev?: BiometricDevice) {
    if (dev) {
      this.editingDeviceId.set(dev.id);
      this.deviceForm.set({
        device_name: dev.device_name,
        device_serial: dev.device_serial,
        device_model: dev.device_model,
        ip_address: dev.ip_address,
        port: dev.port,
        location: dev.location,
        assigned_branch_id: dev.assigned_branch_id,
        assigned_project_id: dev.assigned_project_id,
        status: dev.status,
        is_active: dev.is_active
      });
    } else {
      this.editingDeviceId.set(null);
      this.deviceForm.set({
        device_name: '',
        device_serial: '',
        device_model: 'ZKTECO_INBIO_460',
        ip_address: '192.168.1.201',
        port: 4370,
        location: '',
        assigned_branch_id: undefined,
        assigned_project_id: undefined,
        status: 'ONLINE',
        is_active: true
      });
    }
    this.isDeviceModalOpen.set(true);
  }

  closeDeviceModal() {
    this.isDeviceModalOpen.set(false);
  }

  submitDevice() {
    const data = this.deviceForm();
    if (!data.device_name || !data.ip_address) {
      this.errorMessage.set('Device name and IP Address are mandatory.');
      return;
    }

    const editId = this.editingDeviceId();
    if (editId) {
      this.attendanceService.updateBiometricDevice(editId, data).subscribe({
        next: () => {
          this.successMessage.set(`Biometric device '${data.device_name}' updated!`);
          this.closeDeviceModal();
          this.refreshDevices();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to update device.')
      });
    } else {
      this.attendanceService.createBiometricDevice(data).subscribe({
        next: () => {
          this.successMessage.set(`Biometric device '${data.device_name}' registered successfully!`);
          this.closeDeviceModal();
          this.refreshDevices();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to register device.')
      });
    }
  }

  deleteDevice(id: number) {
    if (!confirm('Are you sure you want to delete this biometric device?')) return;
    this.attendanceService.deleteBiometricDevice(id).subscribe({
      next: () => {
        this.successMessage.set('Biometric device deleted.');
        this.refreshDevices();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to delete device.')
    });
  }

  testDeviceConnection(id: number) {
    this.attendanceService.testDeviceConnection(id).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Connection ping successful!');
        this.refreshDevices();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Ping connection failed.')
    });
  }

  openDeviceSyncModal(deviceId: number) {
    this.selectedSyncDeviceId.set(deviceId);
    // Provide sample logs template for demonstration
    this.syncLogPunches.set(
`[
  { "employee_code": "EMP-001", "punch_time": "${this.selectedDate()}T08:55:00" },
  { "employee_code": "EMP-002", "punch_time": "${this.selectedDate()}T09:40:00" },
  { "employee_code": "EMP-001", "punch_time": "${this.selectedDate()}T18:05:00" }
]`
    );
    this.isDeviceSyncModalOpen.set(true);
  }

  closeDeviceSyncModal() {
    this.isDeviceSyncModalOpen.set(false);
  }

  triggerDeviceSync() {
    const devId = this.selectedSyncDeviceId();
    if (!devId) return;

    let parsedLogs = undefined;
    if (this.syncLogPunches().trim()) {
      try {
        parsedLogs = JSON.parse(this.syncLogPunches());
      } catch (e) {
        this.errorMessage.set('Invalid JSON format for biometric log records.');
        return;
      }
    }

    this.attendanceService.syncBiometricDevice(devId, parsedLogs).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'Terminal sync executed successfully!');
        this.closeDeviceSyncModal();
        this.refreshDevices();
        this.refreshAttendance();
        this.refreshDailySummary();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to sync biometric device.')
    });
  }

  // ==========================================
  // --- Missing Punches & Corrections Logic ---
  // ==========================================
  refreshCorrections() {
    this.attendanceService.loadAttendanceCorrections({
      status: this.correctionStatusFilter() || undefined
    }).subscribe();
  }

  refreshMissingPunches() {
    this.attendanceService.loadMissingPunches(this.selectedDate(), this.selectedDate()).subscribe();
  }

  openCorrectionModal(attendance?: AttendanceRecord) {
    const now = new Date();
    this.correctionForm.set({
      employee_id: attendance?.employee_id || (this.employeeOptions()[0]?.value || 0),
      attendance_id: attendance?.id || undefined,
      request_date: attendance?.punch_date || this.selectedDate(),
      requested_clock_in: attendance?.clock_in ? attendance.clock_in.slice(0, 16) : `${this.selectedDate()}T09:00`,
      requested_clock_out: attendance?.clock_out ? attendance.clock_out.slice(0, 16) : `${this.selectedDate()}T18:00`,
      reason: ''
    });
    this.isCorrectionModalOpen.set(true);
  }

  closeCorrectionModal() {
    this.isCorrectionModalOpen.set(false);
  }

  submitCorrectionRequest() {
    const data = this.correctionForm();
    if (!data.employee_id || !data.reason) {
      this.errorMessage.set('Please select an employee and state a valid reason.');
      return;
    }

    this.attendanceService.requestCorrection(data).subscribe({
      next: () => {
        this.successMessage.set('Attendance correction request submitted for Manager Verification!');
        this.closeCorrectionModal();
        this.refreshCorrections();
        this.refreshMissingPunches();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to submit correction request.')
    });
  }

  openVerifyModal(c: AttendanceCorrection) {
    this.selectedCorrectionForVerify.set(c);
    this.managerRemarks.set('Verified against site supervisor physical attendance log sheet');
    this.isVerifyModalOpen.set(true);
  }

  closeVerifyModal() {
    this.isVerifyModalOpen.set(false);
  }

  submitVerification(isApproved: boolean) {
    const c = this.selectedCorrectionForVerify();
    if (!c) return;

    this.attendanceService.verifyCorrection(c.id, this.managerRemarks(), isApproved).subscribe({
      next: () => {
        this.successMessage.set(`Correction request #${c.id} marked as ${isApproved ? 'VERIFIED' : 'REJECTED'}.`);
        this.closeVerifyModal();
        this.refreshCorrections();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to verify correction.')
    });
  }

  openApproveModal(c: AttendanceCorrection) {
    this.selectedCorrectionForApprove.set(c);
    this.hrRemarks.set('Approved and attendance ledger automatically reconciled');
    this.isApproveModalOpen.set(true);
  }

  closeApproveModal() {
    this.isApproveModalOpen.set(false);
  }

  submitHRApproval(isApproved: boolean) {
    const c = this.selectedCorrectionForApprove();
    if (!c) return;

    this.attendanceService.approveCorrection(c.id, this.hrRemarks(), isApproved).subscribe({
      next: () => {
        this.successMessage.set(`Correction request #${c.id} ${isApproved ? 'APPROVED & SYNCHRONIZED' : 'REJECTED'}.`);
        this.closeApproveModal();
        this.refreshCorrections();
        this.refreshAttendance();
        this.refreshDailySummary();
        this.refreshMissingPunches();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to process HR approval.')
    });
  }

  // ==========================================
  // --- Holiday Calendar Logic ---
  // ==========================================
  refreshHolidays() {
    this.attendanceService.loadHolidays({
      year: this.holidayYear(),
      holiday_type: this.holidayTypeFilter() || undefined
    }).subscribe();
  }

  openHolidayModal(hol?: HolidayCalendar) {
    if (hol) {
      this.editingHolidayId.set(hol.id);
      this.holidayForm.set({
        holiday_name: hol.holiday_name,
        holiday_type: hol.holiday_type,
        start_date: hol.start_date,
        end_date: hol.end_date,
        applicable_branch_id: hol.applicable_branch_id,
        applicable_project_id: hol.applicable_project_id,
        is_recurring_yearly: hol.is_recurring_yearly,
        description: hol.description || '',
        is_active: hol.is_active
      });
    } else {
      this.editingHolidayId.set(null);
      this.holidayForm.set({
        holiday_name: '',
        holiday_type: 'PUBLIC_HOLIDAY',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        applicable_branch_id: undefined,
        applicable_project_id: undefined,
        is_recurring_yearly: false,
        description: '',
        is_active: true
      });
    }
    this.isHolidayModalOpen.set(true);
  }

  closeHolidayModal() {
    this.isHolidayModalOpen.set(false);
  }

  submitHoliday() {
    const data = this.holidayForm();
    if (!data.holiday_name || !data.start_date || !data.end_date) {
      this.errorMessage.set('Holiday name and date range are mandatory.');
      return;
    }

    const editId = this.editingHolidayId();
    if (editId) {
      this.attendanceService.updateHoliday(editId, data).subscribe({
        next: () => {
          this.successMessage.set(`Holiday '${data.holiday_name}' updated!`);
          this.closeHolidayModal();
          this.refreshHolidays();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to update holiday.')
      });
    } else {
      this.attendanceService.createHoliday(data).subscribe({
        next: () => {
          this.successMessage.set(`Holiday '${data.holiday_name}' created successfully!`);
          this.closeHolidayModal();
          this.refreshHolidays();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to create holiday.')
      });
    }
  }

  deleteHoliday(id: number) {
    if (!confirm('Are you sure you want to delete this holiday entry?')) return;
    this.attendanceService.deleteHoliday(id).subscribe({
      next: () => {
        this.successMessage.set('Holiday removed from calendar.');
        this.refreshHolidays();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to delete holiday.')
    });
  }

  // ==========================================
  // --- Site Geofencing Logic ---
  // ==========================================
  refreshGeofences() {
    this.attendanceService.loadSiteGeofences({
      project_id: this.geofenceProjectId() || undefined
    }).subscribe();
  }

  openGeofenceModal(geo?: SiteGeofence) {
    if (geo) {
      this.editingGeofenceId.set(geo.id);
      this.geofenceForm.set({
        project_id: geo.project_id,
        site_name: geo.site_name,
        latitude: geo.latitude,
        longitude: geo.longitude,
        radius_meters: geo.radius_meters,
        is_active: geo.is_active
      });
    } else {
      this.editingGeofenceId.set(null);
      this.geofenceForm.set({
        project_id: this.projectOptions()[0]?.value || 0,
        site_name: '',
        latitude: 23.7925,
        longitude: 90.4078,
        radius_meters: 250,
        is_active: true
      });
    }
    this.isGeofenceModalOpen.set(true);
  }

  closeGeofenceModal() {
    this.isGeofenceModalOpen.set(false);
  }

  submitGeofence() {
    const data = this.geofenceForm();
    if (!data.project_id || !data.site_name || !data.radius_meters) {
      this.errorMessage.set('Project, site name, and radius (meters) are required.');
      return;
    }

    const editId = this.editingGeofenceId();
    if (editId) {
      this.attendanceService.updateSiteGeofence(editId, data).subscribe({
        next: () => {
          this.successMessage.set(`Site geofence '${data.site_name}' updated!`);
          this.closeGeofenceModal();
          this.refreshGeofences();
          this.loadAllDropdownOptions();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to update geofence.')
      });
    } else {
      this.attendanceService.createSiteGeofence(data).subscribe({
        next: () => {
          this.successMessage.set(`Site geofence '${data.site_name}' established successfully!`);
          this.closeGeofenceModal();
          this.refreshGeofences();
          this.loadAllDropdownOptions();
        },
        error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to create site geofence.')
      });
    }
  }

  deleteGeofence(id: number) {
    if (!confirm('Are you sure you want to remove this site geofence perimeter?')) return;
    this.attendanceService.deleteSiteGeofence(id).subscribe({
      next: () => {
        this.successMessage.set('Site geofence perimeter deleted.');
        this.refreshGeofences();
        this.loadAllDropdownOptions();
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to delete site geofence.')
    });
  }

  // ==========================================
  // --- Dynamic Lookups Settings Tab Logic ---
  // ==========================================
  refreshLookupCategoryItems() {
    const catCode = this.selectedLookupCategory();
    this.lookupService.getItems(catCode, true).subscribe({
      next: (items) => this.lookupItems.set(items),
      error: () => this.lookupItems.set([])
    });
  }

  onLookupCategoryChange(newCategory: string) {
    this.selectedLookupCategory.set(newCategory);
    this.refreshLookupCategoryItems();
  }

  openQuickLookupModal(categoryCode: string) {
    this.quickLookupCategoryCode.set(categoryCode);
    this.quickLookupEnglishName.set('');
    this.quickLookupBanglaName.set('');
    this.isQuickLookupModalOpen.set(true);
  }

  closeQuickLookupModal() {
    this.isQuickLookupModalOpen.set(false);
  }

  submitQuickLookupItem() {
    const catCode = this.quickLookupCategoryCode();
    const en = this.quickLookupEnglishName().trim();
    if (!en) {
      this.errorMessage.set('Lookup item name is required.');
      return;
    }

    this.lookupService.quickCreate(catCode, {
      item_name_en: en,
      item_name_bn: this.quickLookupBanglaName().trim() || undefined
    }).subscribe({
      next: (newItem) => {
        this.successMessage.set(`New dropdown item '${newItem.item_name_en}' added to ${catCode}!`);
        this.closeQuickLookupModal();
        if (this.activeTab() === 'settings') {
          this.refreshLookupCategoryItems();
        }
      },
      error: (err) => this.errorMessage.set(err?.error?.detail || 'Failed to create lookup item.')
    });
  }

  // Form Field Updaters (Safe for Angular template parser)
  updatePunchField(field: keyof AttendancePunchPayload, value: any) {
    this.punchForm.update(f => ({ ...f, [field]: value }));
  }

  updateProcessField(field: 'process_date' | 'department_id', value: any) {
    this.processForm.update(f => ({ ...f, [field]: value }));
  }

  updateShiftField(field: keyof ShiftCreatePayload, value: any) {
    this.shiftForm.update(f => ({ ...f, [field]: value }));
  }

  updateAssignField(field: keyof ShiftAssignmentCreatePayload, value: any) {
    this.assignForm.update(f => ({ ...f, [field]: value }));
  }

  updateDeviceField(field: keyof BiometricDeviceCreatePayload, value: any) {
    this.deviceForm.update(f => ({ ...f, [field]: value }));
  }

  updateCorrectionField(field: keyof AttendanceCorrectionCreatePayload, value: any) {
    this.correctionForm.update(f => ({ ...f, [field]: value }));
  }

  updateHolidayField(field: keyof HolidayCalendarCreatePayload, value: any) {
    this.holidayForm.update(f => ({ ...f, [field]: value }));
  }

  updateGeofenceField(field: keyof SiteGeofenceCreatePayload, value: any) {
    this.geofenceForm.update(f => ({ ...f, [field]: value }));
  }

  clearAlerts() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  exportAttendanceCSV() {
    const records = this.attendanceService.attendanceRecords();
    if (!records.length) {
      alert('No attendance records available for export.');
      return;
    }

    const headers = ['Employee Code', 'Employee Name', 'Department', 'Shift', 'Date', 'Clock In', 'Clock Out', 'Work Hours', 'Late Mins', 'Status', 'Geofence Verified', 'Source'];
    const rows = records.map(r => [
      `"${r.employee_code || ''}"`,
      `"${r.employee_name || ''}"`,
      `"${r.department_name || ''}"`,
      `"${r.shift_name || ''}"`,
      `"${r.punch_date}"`,
      `"${r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : ''}"`,
      `"${r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : ''}"`,
      r.working_hours,
      r.late_minutes,
      `"${r.status}"`,
      r.is_geofence_verified ? 'YES' : 'NO',
      `"${r.source}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${this.selectedDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
