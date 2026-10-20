import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import { CardContainerComponent } from '../../../shared/components';

@Component({ selector: 'app-project-handover-closure', standalone: true, imports: [CommonModule, FormsModule, RouterLink, CardContainerComponent], template: `
  <app-card-container title="Project Handover & Closure" subtitle="Manage persisted customer handover records and possession status">
    <div card-actions><a routerLink="create" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">New Handover</a></div>
    <div class="mb-4 grid gap-3 md:grid-cols-[2fr_1fr_auto_auto]"><input [(ngModel)]="search" (keyup.enter)="apply()" placeholder="Search handover, booking, customer" class="rounded-lg border px-3 py-2"><input [(ngModel)]="status" placeholder="Status" class="rounded-lg border px-3 py-2"><button (click)="apply()" class="rounded-lg bg-blue-600 px-4 py-2 text-white">Search</button><button (click)="reset()" class="rounded-lg border px-4 py-2">Reset</button></div>
    @if (error()) { <p role="alert" class="mb-3 rounded bg-rose-50 p-3 text-rose-700">{{ error() }}</p> } @if (success()) { <p role="status" class="mb-3 rounded bg-emerald-50 p-3 text-emerald-700">{{ success() }}</p> }
    <div class="overflow-x-auto rounded-xl border"><table class="w-full min-w-[800px] text-left text-sm"><thead class="bg-slate-50"><tr><th class="p-3">Tracking #</th><th class="p-3">Project / Unit</th><th class="p-3">Customer</th><th class="p-3">Booking</th><th class="p-3">Status</th><th class="p-3">Possession</th><th class="p-3">Appointment</th><th class="p-3">Actions</th></tr></thead><tbody>
      @if (loading()) { <tr><td colspan="8" class="p-8 text-center">Loading handovers...</td></tr> } @else if (!items().length) { <tr><td colspan="8" class="p-8 text-center text-slate-500">No handover records found.</td></tr> } @else { @for (r of items(); track r.id) { <tr class="border-t"><td class="p-3 font-mono">{{ r.handover_tracking_no }}</td><td class="p-3">{{ r.project_name }}<div class="text-xs text-slate-500">{{ r.unit_number }}</div></td><td class="p-3">{{ r.customer_name }}</td><td class="p-3">{{ r.booking_reference_no }}</td><td class="p-3">{{ r.status }}</td><td class="p-3">{{ r.physical_possession_status }}</td><td class="p-3">{{ r.appointment_date || '—' }}</td><td class="p-3"><a [routerLink]="[r.id, 'edit']" class="mr-3 text-blue-700">Edit</a><button (click)="remove(r)" class="text-rose-700">Delete</button></td></tr> } }
    </tbody></table></div><div class="mt-4 flex justify-between text-sm"><span>{{ total() }} records · page {{ page() }}</span><div class="flex gap-2"><button (click)="move(-1)" [disabled]="offset()===0" class="rounded border px-3 py-1 disabled:opacity-40">Previous</button><button (click)="move(1)" [disabled]="offset()+limit()>=total()" class="rounded border px-3 py-1 disabled:opacity-40">Next</button></div></div>
  </app-card-container>` })
export class ProjectHandoverClosureComponent implements OnInit {
  private api = inject(SalesService); items = signal<any[]>([]); total = signal(0); offset = signal(0); limit = signal(20); loading = signal(false); error = signal(''); success = signal(''); search = ''; status = '';
  page = () => Math.floor(this.offset() / this.limit()) + 1;
  ngOnInit() { this.success.set(history.state?.success || ''); this.load(); }
  load() { this.loading.set(true); this.error.set(''); this.api.getHandoversPaged({ search: this.search.trim() || undefined, status: this.status.trim() || undefined, limit: this.limit(), offset: this.offset() }).subscribe({ next: page => { this.items.set(page.items || []); this.total.set(page.total || 0); this.loading.set(false); }, error: e => { this.error.set(e?.error?.detail || 'Could not load handovers.'); this.loading.set(false); } }); }
  apply() { this.offset.set(0); this.load(); } reset() { this.search = ''; this.status = ''; this.apply(); } move(dir: number) { this.offset.update(n => Math.max(0, n + dir * this.limit())); this.load(); }
  remove(row: any) { if (!confirm(`Delete handover ${row.handover_tracking_no}?`)) return; this.api.deleteHandover(row.id).subscribe({ next: () => { this.success.set('Handover deleted successfully.'); if (this.items().length === 1 && this.offset()) this.offset.update(n => n - this.limit()); this.load(); }, error: e => this.error.set(e?.error?.detail || 'Could not delete handover.') }); }
}
