import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import { HrmsDepartmentService } from '../../core/services/hrms-department.service';
import { HrmsPositionService } from '../../core/services/hrms-position.service';
import { HrmsService, Employee } from './hrms.service';
import { DepartmentHeadAssignPayload, DepartmentMoveParentPayload, HeadPermissions } from '../../core/models/hrms-department.model';
import { DesignationCreatePayload, SalaryGradeCreatePayload } from '../../core/models/hrms-position.model';
import { SearchableSelectComponent } from '../../shared/components';

type FormKind = 'head' | 'hierarchy' | 'designation' | 'grade';

@Component({
  selector: 'app-hrms-master-form', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SearchableSelectComponent],
  template: `
    <main class="mx-auto max-w-5xl p-6">
      <a class="text-sm text-blue-700" [routerLink]="backLink">← Back to list</a>
      <section class="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <header class="border-b border-slate-200 px-6 py-5">
          <p class="text-sm font-semibold text-emerald-700">HRMS Master Data</p>
          <h1 class="mt-1 text-xl font-bold text-slate-900">{{ title }}</h1>
          <p class="mt-1 text-sm text-slate-500">Complete the required fields and save your changes.</p>
        </header>
        <div class="space-y-4 p-6">
          @if (error) { <div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</div> }
          @if (kind === 'head') {
            <label class="block text-sm font-medium">Department
              <app-searchable-select [options]="departmentOptions" [(ngModel)]="departmentId" placeholder="Select department"></app-searchable-select>
            </label>
            <label class="block text-sm font-medium">Department Head (Employee) *
              <app-searchable-select [options]="employeeOptions" [(ngModel)]="head.employee_id" placeholder="Select active employee"></app-searchable-select>
            </label>
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm">Assignment Type<app-searchable-select [options]="assignmentOptions" [(ngModel)]="head.assignment_type" placeholder="Select assignment type"></app-searchable-select></label>
              <label class="text-sm">Effective From<input class="mt-1 w-full rounded border p-2" type="date" [(ngModel)]="head.effective_from"></label>
            </div>
            <label class="block text-sm">Remarks<textarea class="mt-1 w-full rounded border p-2" rows="3" [(ngModel)]="head.remarks"></textarea></label>
          }
          @if (kind === 'hierarchy') {
            <div class="rounded-lg bg-slate-50 p-3 text-sm">Changing reporting line for <strong>{{ departmentName }}</strong></div>
            <label class="block text-sm font-medium">Parent Department
              <app-searchable-select [options]="parentOptions" [(ngModel)]="move.parent_department_id" placeholder="Top level department"></app-searchable-select>
            </label>
            <label class="block text-sm">Effective Date<input class="mt-1 w-full rounded border p-2" type="date" [(ngModel)]="move.effective_date"></label>
            <label class="block text-sm">Remarks<textarea class="mt-1 w-full rounded border p-2" rows="3" [(ngModel)]="move.remarks"></textarea></label>
          }
          @if (kind === 'designation') {
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm">Department *<app-searchable-select [options]="departmentOptions" [(ngModel)]="designation.department_id" placeholder="Select department"></app-searchable-select></label>
              <label class="text-sm">Salary Grade<app-searchable-select [options]="gradeOptions" [(ngModel)]="designation.salary_grade_id" placeholder="Select salary grade (optional)"></app-searchable-select></label>
              <label class="text-sm">Designation Code *<input class="mt-1 w-full rounded border p-2" [(ngModel)]="designation.designation_code"></label>
              <label class="text-sm">Title (English) *<input class="mt-1 w-full rounded border p-2" [(ngModel)]="designation.title_en"></label>
              <label class="text-sm">Title (Bangla)<input class="mt-1 w-full rounded border p-2" [(ngModel)]="designation.title_bn"></label>
              <label class="text-sm">Employee Level<input class="mt-1 w-full rounded border p-2" [(ngModel)]="designation.employee_level"></label>
              <label class="text-sm">Grade Level<input class="mt-1 w-full rounded border p-2" [(ngModel)]="designation.grade_level"></label>
              <label class="text-sm">Minimum Salary<input class="mt-1 w-full rounded border p-2" type="number" [(ngModel)]="designation.min_salary"></label>
              <label class="text-sm">Maximum Salary<input class="mt-1 w-full rounded border p-2" type="number" [(ngModel)]="designation.max_salary"></label>
            </div>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="designation.is_active"> Active</label>
          }
          @if (kind === 'grade') {
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="text-sm">Grade Code *<input class="mt-1 w-full rounded border p-2" [(ngModel)]="grade.grade_code"></label>
              <label class="text-sm">Grade Name *<input class="mt-1 w-full rounded border p-2" [(ngModel)]="grade.grade_name"></label>
              <label class="text-sm">Employee Level<input class="mt-1 w-full rounded border p-2" [(ngModel)]="grade.employee_level"></label>
              <label class="text-sm">Minimum Salary<input class="mt-1 w-full rounded border p-2" type="number" [(ngModel)]="grade.min_salary"></label>
              <label class="text-sm">Maximum Salary<input class="mt-1 w-full rounded border p-2" type="number" [(ngModel)]="grade.max_salary"></label>
            </div>
            <section class="rounded-lg border border-slate-200 p-4">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div><h2 class="font-semibold">Statutory Allowance Package</h2><p class="text-xs text-slate-500">Add, rename, or remove allowance components for this grade.</p></div>
                <button type="button" class="rounded border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700" (click)="addAllowance()">+ Add allowance</button>
              </div>
              @for (allowance of grade.allowance_package; track $index) {
                <div class="mb-3 grid items-end gap-3 rounded-md bg-slate-50 p-3 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
                  <label class="text-sm">Allowance Name<input class="mt-1 w-full rounded border p-2" [name]="'allowance_name_' + $index" [(ngModel)]="allowance.name" placeholder="e.g. Medical Allowance"></label>
                  <label class="text-sm">Amount / Rate<input class="mt-1 w-full rounded border p-2" [name]="'allowance_amount_' + $index" type="number" min="0" [(ngModel)]="allowance.amount"></label>
                  <label class="text-sm">Calculation
                    <app-searchable-select [options]="allowanceCalculationOptions" [name]="'allowance_type_' + $index" [(ngModel)]="allowance.calculation_type" placeholder="Select type"></app-searchable-select>
                  </label>
                  <button type="button" class="rounded border border-red-200 px-3 py-2 text-sm text-red-700" (click)="removeAllowance($index)" aria-label="Remove allowance">Remove</button>
                </div>
              } @empty {
                <p class="rounded bg-slate-50 p-4 text-sm text-slate-500">No allowances configured. Add an allowance component to continue.</p>
              }
            </section>
            <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="grade.is_active"> Active</label>
          }
        </div>
        <footer class="flex justify-end gap-3 border-t bg-slate-50 px-6 py-4">
          <button class="rounded border bg-white px-4 py-2" [routerLink]="backLink">Cancel</button>
          <button class="rounded bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-50" [disabled]="saving" (click)="save()">{{ saving ? 'Saving…' : 'Save' }}</button>
        </footer>
      </section>
    </main>`
})
export class HrmsMasterFormComponent implements OnInit {
  private route = inject(ActivatedRoute); private router = inject(Router);
  private deptService = inject(HrmsDepartmentService); private positionService = inject(HrmsPositionService); private hrmsService = inject(HrmsService);
  kind: FormKind = 'head'; id = 0; departmentId: number | null = null; departmentName = ''; saving = false; error = '';
  departments = this.deptService.departments; employees = signal<Employee[]>([]); grades: any[] = [];
  head: DepartmentHeadAssignPayload = { employee_id: 0, assignment_type: 'PERMANENT', effective_from: new Date().toISOString().slice(0, 10), permissions_json: this.defaultPermissions(), remarks: '' };
  move: DepartmentMoveParentPayload = { parent_department_id: null, effective_date: new Date().toISOString().slice(0, 10), remarks: '' };
  designation: DesignationCreatePayload = { department_id: 0, designation_code: '', title_en: '', title_bn: '', salary_grade_id: null, grade_level: 'GRADE_4', employee_level: 'EXECUTIVE', min_salary: 25000, max_salary: 150000, description: '', is_active: true };
  grade: SalaryGradeCreatePayload = { grade_code: '', grade_name: '', employee_level: 'EXECUTIVE', min_salary: 30000, max_salary: 180000, default_house_rent_pct: 50, default_medical_allowance: 4000, default_conveyance: 5000, allowance_package: [], description: '', is_active: true };
  allowanceCalculationOptions = [{ value: 'FIXED', label: 'Fixed amount (BDT)' }, { value: 'PERCENT', label: 'Percentage (%)' }];
  get title(): string { return ({ head: 'Assign Department Head', hierarchy: 'Change Department Reporting Line', designation: 'Designation', grade: 'Salary Grade' } as const)[this.kind]; }
  get backLink(): string { return this.kind === 'head' ? '/hrms/departments/heads' : this.kind === 'hierarchy' ? '/hrms/departments/hierarchy' : this.kind === 'grade' ? '/hrms/payroll/structures' : '/hrms/designations'; }
  get departmentOptions() { return this.departments().map(d => ({ value: d.id, label: `${d.department_code} - ${d.name_en}` })); }
  get parentOptions() { return this.departments().filter(d => d.id !== this.id).map(d => ({ value: d.id, label: `${d.department_code} - ${d.name_en}` })); }
  get employeeOptions() { return this.employees().map(e => ({ value: e.id, label: `${e.employee_code} - ${e.first_name} ${e.last_name}` })); }
  get gradeOptions() { return this.grades.map(g => ({ value: g.id, label: `${g.grade_code} - ${g.grade_name}` })); }
  get assignmentOptions() { return [{ value: 'PERMANENT', label: 'Permanent' }, { value: 'ACTING', label: 'Acting' }, { value: 'INTERIM', label: 'Interim' }]; }

  ngOnInit(): void {
    this.kind = this.route.snapshot.data['formKind'] as FormKind;
    this.id = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.departmentId = Number(this.route.snapshot.queryParamMap.get('departmentId') || this.id) || null;
    this.deptService.loadDepartments().subscribe({ next: () => this.loadExistingDepartment() });
    this.hrmsService.loadEmployees().subscribe({ next: rows => this.employees.set(rows) });
    this.positionService.loadSalaryGrades({ limit: 500, offset: 0 }).subscribe({ next: () => this.grades = this.positionService.salaryGrades() });
    if (this.kind === 'designation') this.positionService.loadDesignations({ limit: 500, offset: 0 }).subscribe({ next: () => this.loadDesignation() });
    if (this.kind === 'grade' && this.id) this.loadGrade();
  }
  private loadExistingDepartment(): void {
    const dept = this.departments().find(d => d.id === this.id);
    this.departmentName = dept?.name_en || '';
    if (this.kind === 'hierarchy' && dept) this.move.parent_department_id = dept.parent_department_id || null;
    if (this.kind === 'head' && this.departmentId) {
      this.deptService.loadHeadHistory(this.departmentId).subscribe({ next: rows => { const current = rows.find(r => r.is_current); if (current) this.head = { employee_id: current.employee_id, assignment_type: current.assignment_type, effective_from: current.effective_from, effective_to: current.effective_to || null, permissions_json: { ...this.defaultPermissions(), ...current.permissions_json }, remarks: current.remarks || '' }; } });
    }
  }
  private loadDesignation(): void { const d = this.positionService.designations().find(item => item.id === this.id); if (d) this.designation = { ...this.designation, ...d }; }
  private loadGrade(): void {
    this.positionService.getSalaryGrade(this.id).subscribe({
      next: g => {
        const legacyAllowances = [
          { name: 'House Rent', amount: g.default_house_rent_pct, calculation_type: 'PERCENT' as const },
          { name: 'Medical Allowance', amount: g.default_medical_allowance, calculation_type: 'FIXED' as const },
          { name: 'Conveyance', amount: g.default_conveyance, calculation_type: 'FIXED' as const }
        ];
        this.grade = { ...this.grade, ...g, allowance_package: g.allowance_package?.length ? g.allowance_package.map(item => ({ ...item })) : legacyAllowances };
      },
      error: e => this.error = e?.error?.detail || e?.message || 'Could not load salary grade.'
    });
  }
  addAllowance(): void { this.grade.allowance_package = [...(this.grade.allowance_package || []), { name: '', amount: 0, calculation_type: 'FIXED' }]; }
  removeAllowance(index: number): void { this.grade.allowance_package = (this.grade.allowance_package || []).filter((_, i) => i !== index); }
  save(): void {
    this.error = '';
    if (this.kind === 'head') {
      if (!this.departmentId || !this.head.employee_id) { this.error = 'Department and active employee are required.'; return; }
      this.submit(this.deptService.assignDepartmentHead(this.departmentId, this.head), 'Department head assigned successfully.'); return;
    }
    if (this.kind === 'hierarchy') {
      if (!this.id) { this.error = 'Select a department before changing its reporting line.'; return; }
      this.submit(this.deptService.moveDepartmentParent(this.id, this.move), 'Department reporting line updated successfully.'); return;
    }
    if (this.kind === 'designation') {
      if (!this.designation.department_id || !this.designation.designation_code || !this.designation.title_en) { this.error = 'Department, designation code, and title are required.'; return; }
      const request = this.id ? this.positionService.updateDesignation(this.id, this.designation) : this.positionService.createDesignation(this.designation);
      this.submit(request, this.id ? 'Designation updated successfully.' : 'Designation created successfully.'); return;
    }
    if (!this.grade.grade_code || !this.grade.grade_name) { this.error = 'Grade code and name are required.'; return; }
    const allowances = (this.grade.allowance_package || []).map(item => ({ ...item, name: item.name.trim() }));
    if (allowances.some(item => !item.name || !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0)) { this.error = 'Enter a name and a non-negative amount for each allowance.'; return; }
    const payload = { ...this.grade, allowance_package: allowances };
    const houseRent = allowances.find(item => item.name.toLowerCase() === 'house rent');
    const medical = allowances.find(item => item.name.toLowerCase() === 'medical allowance');
    const conveyance = allowances.find(item => item.name.toLowerCase() === 'conveyance');
    if (houseRent) payload.default_house_rent_pct = houseRent.amount;
    if (medical) payload.default_medical_allowance = medical.amount;
    if (conveyance) payload.default_conveyance = conveyance.amount;
    const request = this.id ? this.positionService.updateSalaryGrade(this.id, payload) : this.positionService.createSalaryGrade(payload);
    this.submit(request, this.id ? 'Salary grade updated successfully.' : 'Salary grade created successfully.');
  }
  private submit(request: any, notice: string): void { this.saving = true; request.subscribe({ next: () => this.router.navigateByUrl(this.backLink, { state: { hrmsNotice: notice } }), error: (e: any) => { this.error = e?.error?.detail || e?.message || 'Could not save changes.'; this.saving = false; } }); }
  private defaultPermissions(): HeadPermissions { return { view_employees: true, approve_leave: true, approve_overtime: true, review_attendance: true, initiate_transfer: false, recommend_salary: false, view_payroll_cost: true, approve_expenses: true, expense_limit: 50000 }; }
}
