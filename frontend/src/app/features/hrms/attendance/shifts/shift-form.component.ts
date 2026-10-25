import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HrmsAttendanceService } from '../../../../core/services/hrms-attendance.service';
import { Shift, ShiftCreatePayload } from '../../../../core/models/hrms-attendance.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomButtonComponent
} from '../../../../shared/components';

@Component({
  selector: 'app-shift-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomButtonComponent
  ],
  templateUrl: './shift-form.component.html'
})
export class ShiftFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private attendanceService = inject(HrmsAttendanceService);

  mode = signal<'create' | 'edit'>('create');
  shiftId = signal<number | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Feedback Alerts
  errorMessage = signal<string | null>(null);

  // Form State
  shiftForm = signal<ShiftCreatePayload>({
    shift_name: '',
    shift_code: '',
    start_time: '09:00',
    end_time: '18:00',
    break_start_time: '13:00',
    break_end_time: '14:00',
    break_duration_minutes: 60,
    grace_period_minutes: 15,
    half_day_minimum_minutes: 240,
    full_day_minimum_minutes: 480,
    is_night_shift: false,
    is_active: true
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id) && id > 0) {
          this.mode.set('edit');
          this.shiftId.set(id);
          this.loadShiftData(id);
          return;
        }
      }
      this.mode.set('create');
    });
  }

  loadShiftData(id: number): void {
    this.isLoading.set(true);
    this.attendanceService.getShift(id).subscribe({
      next: (s: Shift) => {
        this.isLoading.set(false);
        this.shiftForm.set({
          shift_name: s.shift_name,
          shift_code: s.shift_code,
          start_time: s.start_time ? s.start_time.substring(0, 5) : '09:00',
          end_time: s.end_time ? s.end_time.substring(0, 5) : '18:00',
          break_start_time: s.break_start_time ? s.break_start_time.substring(0, 5) : '',
          break_end_time: s.break_end_time ? s.break_end_time.substring(0, 5) : '',
          break_duration_minutes: s.break_duration_minutes ?? 60,
          grace_period_minutes: s.grace_period_minutes ?? 15,
          half_day_minimum_minutes: s.half_day_minimum_minutes ?? 240,
          full_day_minimum_minutes: s.full_day_minimum_minutes ?? 480,
          is_night_shift: !!s.is_night_shift,
          is_active: !!s.is_active
        });
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load shift details');
      }
    });
  }

  saveShift(): void {
    const data = this.shiftForm();
    if (!data.shift_name.trim() || !data.shift_code.trim()) {
      this.errorMessage.set('Shift name and unique shift code are required.');
      return;
    }

    if (!data.start_time || !data.end_time) {
      this.errorMessage.set('Start time and End time are required.');
      return;
    }

    // Format times into HH:MM:00 for backend
    const payload: ShiftCreatePayload = {
      ...data,
      shift_code: data.shift_code.trim().toUpperCase(),
      shift_name: data.shift_name.trim(),
      start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
      end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
      break_start_time: data.break_start_time ? (data.break_start_time.length === 5 ? `${data.break_start_time}:00` : data.break_start_time) : undefined,
      break_end_time: data.break_end_time ? (data.break_end_time.length === 5 ? `${data.break_end_time}:00` : data.break_end_time) : undefined,
    };

    this.isSaving.set(true);
    this.errorMessage.set(null);

    if (this.mode() === 'edit' && this.shiftId()) {
      this.attendanceService.updateShift(this.shiftId()!, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/hrms/attendance/shifts'], {
            state: { hrmsNotice: `Shift '${payload.shift_name}' updated successfully!` }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to update shift.');
        }
      });
    } else {
      this.attendanceService.createShift(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.router.navigate(['/hrms/attendance/shifts'], {
            state: { hrmsNotice: `New Shift '${payload.shift_name}' created successfully!` }
          });
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err?.error?.detail || 'Failed to create shift.');
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/hrms/attendance/shifts']);
  }
}
