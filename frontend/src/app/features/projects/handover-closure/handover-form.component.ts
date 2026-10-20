import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { Booking } from '../../../core/models/sales.model';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

@Component({ selector: 'app-project-handover-form', standalone: true, imports: [CommonModule, ReactiveFormsModule, RouterLink, CardContainerComponent, SearchableSelectComponent], template: `
  <app-card-container [title]="editing ? 'Edit Handover' : 'Start Property Handover'" subtitle="Create a handover dossier or update its scheduling and status">
    <a routerLink="/projects/handover-closure" class="mb-4 inline-block text-sm text-blue-700">Back to handover register</a>@if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> }
    <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-4 md:grid-cols-2">
      @if (!editing) { <app-searchable-select label="Booking" [required]="true" [options]="bookingOptions()" formControlName="booking_id" placeholder="Select booking" [allowCreateNew]="false"></app-searchable-select> }
      <label class="grid gap-1 text-sm">Responsible staff<input formControlName="responsible_staff_name" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Responsible engineer<input formControlName="responsible_engineer_name" class="rounded-lg border px-3 py-2"></label>
      @if (editing) { <label class="grid gap-1 text-sm">Status<input formControlName="status" class="rounded-lg border px-3 py-2"></label> }
      <label class="grid gap-1 text-sm">Appointment date<input type="date" formControlName="appointment_date" class="rounded-lg border px-3 py-2"></label><label class="grid gap-1 text-sm">Appointment time<input formControlName="appointment_time" class="rounded-lg border px-3 py-2"></label>
      <label class="grid gap-1 text-sm md:col-span-2">Remarks<textarea formControlName="remarks" rows="3" class="rounded-lg border px-3 py-2"></textarea></label>
      <div class="flex justify-end gap-3 md:col-span-2"><a routerLink="/projects/handover-closure" class="rounded-lg border px-4 py-2">Cancel</a><button [disabled]="saving() || form.invalid" class="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{{ saving() ? 'Saving...' : 'Save handover' }}</button></div>
    </form>
  </app-card-container>` })
export class HandoverFormComponent implements OnInit {
  private fb = inject(FormBuilder); private api = inject(SalesService); private route = inject(ActivatedRoute); private router = inject(Router); bookings = signal<Booking[]>([]); error = signal(''); saving = signal(false); editing = false; id = 0;
  bookingOptions = () => this.bookings().map(b => ({ value: b.id, label: `${b.booking_reference_no} · ${b.project_name || ''} · ${b.unit_number || ''} · ${b.customer_name || ''}` }));
  form = this.fb.group({ booking_id: [null as number | null], responsible_staff_name: [''], responsible_engineer_name: [''], status: ['NOT_STARTED'], appointment_date: [''], appointment_time: ['11:00 AM'], remarks: [''] });
  ngOnInit() { this.id = Number(this.route.snapshot.paramMap.get('id') || 0); this.editing = !!this.id; if (!this.editing) { this.form.controls.booking_id.setValidators(Validators.required); this.api.getBookings({ limit: 500 }).subscribe({ next: rows => this.bookings.set(rows || []), error: () => this.error.set('Could not load available bookings.') }); } else { this.api.getHandoverDossier(this.id).subscribe({ next: r => this.form.patchValue(r as any), error: e => this.error.set(e?.error?.detail || 'Could not load handover.') }); } }
  save() { if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; } this.saving.set(true); const v = this.form.getRawValue(); const req = this.editing ? this.api.updateHandover(this.id, { responsible_staff_name: v.responsible_staff_name || undefined, responsible_engineer_name: v.responsible_engineer_name || undefined, status: v.status || undefined, appointment_date: v.appointment_date || undefined, appointment_time: v.appointment_time || undefined, remarks: v.remarks || undefined }) : this.api.createHandover({ booking_id: Number(v.booking_id), responsible_staff_name: v.responsible_staff_name || undefined, responsible_engineer_name: v.responsible_engineer_name || undefined, appointment_date: v.appointment_date || undefined, appointment_time: v.appointment_time || undefined, remarks: v.remarks || undefined }); req.subscribe({ next: () => this.router.navigate(['/projects/handover-closure'], { state: { success: this.editing ? 'Handover updated successfully.' : 'Handover created successfully.' } }), error: e => { this.error.set(e?.error?.detail || 'Could not save handover.'); this.saving.set(false); } }); }
}
