import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Employee, EmployeeUpdatePayload } from '../../../core/models/hrms-employee.model';
import { HrmsEmployeeService } from '../../../core/services/hrms-employee.service';
import { SearchableSelectComponent, CustomInputComponent, CustomButtonComponent } from '../../../shared/components';

@Component({
  selector: 'app-employee-emergency-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent, CustomInputComponent, CustomButtonComponent],
  template: `
    <main class="mx-auto max-w-7xl space-y-5 p-4 text-foreground sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-primary">HRMS · Employee Records</p>
          <h1 class="mt-1 text-2xl font-bold">Emergency Contacts</h1>
          <p class="mt-1 text-sm text-muted-foreground">Maintain verified emergency contact details for employees.</p>
        </div>
        @if (!formMode) {
          <app-custom-button variant="primary" label="Add Emergency Contact" (btnClick)="startCreate()"></app-custom-button>
        } @else {
          <app-custom-button variant="outline" label="Back to contacts" (btnClick)="backToList()"></app-custom-button>
        }
      </header>

      @if (successMessage()) {
        <div role="status" class="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">{{ successMessage() }}</div>
      }
      @if (errorMessage()) {
        <div role="alert" class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{{ errorMessage() }}</div>
      }

      @if (formMode) {
        <section class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div class="border-b border-border bg-muted/40 px-5 py-4">
            <h2 class="font-semibold">{{ editingEmployee ? 'Update' : 'Register' }} Emergency Contact</h2>
            <p class="mt-1 text-sm text-muted-foreground">Contact information is stored with the employee profile.</p>
          </div>
          <form class="space-y-5 p-5" (ngSubmit)="save()">
            <label class="block text-sm font-medium">Employee *
              <app-searchable-select [options]="employeeOptions()" [(ngModel)]="selectedEmployeeId" name="employee" placeholder="Search employee code or name" [disabled]="!!editingEmployee"></app-searchable-select>
            </label>
            @if (editingEmployee) {
              <div class="rounded-lg bg-muted/40 p-3 text-sm"><span class="font-semibold">{{ editingEmployee.employee_code }}</span> · {{ editingEmployee.first_name }} {{ editingEmployee.last_name }}</div>
            }
            <div class="grid gap-4 md:grid-cols-2">
              <app-custom-input label="Contact Person Name *" placeholder="e.g. Shamima Begum" [(ngModel)]="contactName" name="contactName" [required]="true"></app-custom-input>
              <app-searchable-select categoryCode="HR_EMERGENCY_RELATION" label="Relationship *" [(ngModel)]="relationship" name="relationship" [required]="true" [allowCreateNew]="true"></app-searchable-select>
              <app-custom-input label="Emergency Phone *" placeholder="+8801XXXXXXXXX" [(ngModel)]="contactPhone" name="contactPhone" [required]="true"></app-custom-input>
            </div>
            <footer class="flex justify-end gap-2 border-t border-border pt-4">
              <app-custom-button variant="outline" label="Cancel" (btnClick)="backToList()"></app-custom-button>
              <app-custom-button variant="primary" [label]="saving() ? 'Saving…' : (editingEmployee ? 'Update Contact' : 'Save Contact')" [disabled]="saving()" type="submit"></app-custom-button>
            </footer>
          </form>
        </section>
      } @else {
        <section class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div><h2 class="font-semibold">Employee Emergency Contact Register</h2><p class="text-sm text-muted-foreground">{{ total() }} employee records</p></div>
            <input class="w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" placeholder="Search employee or contact" [(ngModel)]="search" (ngModelChange)="loadEmployees(0)">
          </div>
          @if (loading()) {
            <div class="p-8 text-center text-sm text-muted-foreground">Loading emergency contacts…</div>
          } @else {
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-border text-sm">
                <thead class="bg-muted/40 text-left text-xs uppercase text-muted-foreground"><tr><th class="px-4 py-3">Employee</th><th class="px-4 py-3">Department / Designation</th><th class="px-4 py-3">Contact Person</th><th class="px-4 py-3">Relationship</th><th class="px-4 py-3">Phone</th><th class="px-4 py-3 text-right">Action</th></tr></thead>
                <tbody class="divide-y divide-border">
                  @for (employee of employees(); track employee.id) {
                    <tr class="hover:bg-muted/30">
                      <td class="px-4 py-3"><div class="font-semibold">{{ employee.first_name }} {{ employee.last_name }}</div><div class="text-xs text-muted-foreground">{{ employee.employee_code }}</div></td>
                      <td class="px-4 py-3"><div>{{ employee.department_name || '—' }}</div><div class="text-xs text-muted-foreground">{{ employee.designation_title || '—' }}</div></td>
                      <td class="px-4 py-3">{{ employee.emergency_contact_name || 'Not added' }}</td><td class="px-4 py-3">{{ employee.emergency_contact_relation || '—' }}</td><td class="px-4 py-3">{{ employee.emergency_contact_phone || '—' }}</td>
                      <td class="px-4 py-3 text-right"><app-custom-button variant="outline" size="sm" [label]="employee.emergency_contact_name ? 'Edit' : 'Add'" (btnClick)="openForm(employee)"></app-custom-button></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="px-4 py-10 text-center text-muted-foreground">No employee records found.</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
              <span>Showing {{ employees().length ? offset() + 1 : 0 }}–{{ offset() + employees().length }} of {{ total() }}</span>
              <div class="flex gap-2"><app-custom-button variant="outline" size="sm" label="Previous" [disabled]="offset() === 0" (btnClick)="loadEmployees(offset() - limit)"></app-custom-button><app-custom-button variant="outline" size="sm" label="Next" [disabled]="offset() + limit >= total()" (btnClick)="loadEmployees(offset() + limit)"></app-custom-button></div>
            </div>
          }
        </section>
      }
    </main>`
})
export class EmployeeEmergencyContactsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private employeeService = inject(HrmsEmployeeService);
  formMode = false;
  editingEmployee: Employee | null = null;
  employees = signal<Employee[]>([]);
  total = signal(0);
  offset = signal(0);
  limit = 25;
  loading = signal(false);
  saving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  search = '';
  selectedEmployeeId: number | null = null;
  contactName = '';
  relationship = '';
  contactPhone = '';

  ngOnInit(): void {
    const segments = this.route.snapshot.url.map(segment => segment.path);
    this.formMode = segments.includes('new') || segments.includes('edit');
    this.successMessage.set(history.state?.hrmsNotice || null);
    if (segments.includes('edit')) {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      this.employeeService.getEmployee(id).subscribe({ next: employee => this.setEmployee(employee), error: error => this.showError(error, 'Could not load employee contact.') });
    } else if (this.formMode) {
      this.selectedEmployeeId = Number(this.route.snapshot.queryParamMap.get('employeeId')) || null;
      this.employeeService.loadEmployees({ limit: 500, offset: 0, all: true }).subscribe({ error: error => this.showError(error, 'Could not load employees.') });
    } else this.loadEmployees(0);
  }

  employeeOptions() { return this.employeeService.employees().map(employee => ({ value: employee.id, label: `${employee.employee_code} — ${employee.first_name} ${employee.last_name}` })); }
  loadEmployees(offset: number): void {
    this.loading.set(true); this.offset.set(Math.max(0, offset)); this.errorMessage.set(null);
    this.employeeService.loadEmployees({ limit: this.limit, offset: this.offset(), search: this.search || undefined }).subscribe({
      next: response => { this.employees.set(response.items); this.total.set(response.total); this.loading.set(false); },
      error: error => { this.showError(error, 'Could not load emergency contacts.'); this.loading.set(false); }
    });
  }
  startCreate(): void { this.router.navigate(['/hrms/employees/emergency-contacts/new']); }
  openForm(employee: Employee): void {
    this.router.navigate(['/hrms/employees/emergency-contacts', employee.id, 'edit']);
  }
  private setEmployee(employee: Employee): void {
    this.editingEmployee = employee; this.selectedEmployeeId = employee.id;
    this.contactName = employee.emergency_contact_name || ''; this.relationship = employee.emergency_contact_relation || '';
    this.contactPhone = employee.emergency_contact_phone || '';
  }
  save(): void {
    if (!this.selectedEmployeeId || !this.contactName.trim() || !this.relationship || !this.contactPhone.trim()) {
      this.errorMessage.set('Select an employee and complete contact name, relationship, and phone.'); return;
    }
    this.saving.set(true); this.errorMessage.set(null);
    const payload: EmployeeUpdatePayload = { emergency_contact_name: this.contactName.trim(), emergency_contact_relation: this.relationship, emergency_contact_phone: this.contactPhone.trim() };
    this.employeeService.updateEmployee(Number(this.selectedEmployeeId), payload).subscribe({
      next: employee => this.router.navigateByUrl('/hrms/employees/emergency-contacts', { state: { hrmsNotice: `Emergency contact for ${employee.employee_code} saved successfully.` } }),
      error: error => { this.showError(error, 'Could not save emergency contact.'); this.saving.set(false); }
    });
  }
  backToList(): void { this.router.navigateByUrl('/hrms/employees/emergency-contacts'); }
  private showError(error: any, fallback: string): void { this.errorMessage.set(error?.error?.detail || error?.message || fallback); }
}
