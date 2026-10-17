import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HrmsService, Employee, Department, Designation } from '../hrms.service';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-list.component.html'
})
export class EmployeeListComponent implements OnInit {
  hrmsService = inject(HrmsService);

  activeTab = signal<string>('ALL'); // ALL, CORPORATE, SITE_ENGINEERING
  searchQuery = signal<string>('');
  selectedDepartmentId = signal<number | null>(null);

  // Selected Employee for 360 Drawer
  selectedEmployee = signal<Employee | null>(null);
  isDrawerOpen = signal<boolean>(false);

  // Add Employee Modal
  isAddModalOpen = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // Form Model
  newEmp = signal<Partial<Employee>>({
    first_name: '',
    last_name: '',
    official_email: '',
    phone: '',
    gender: 'MALE',
    employment_type: 'PERMANENT',
    workforce_category: 'CORPORATE',
    joining_date: new Date().toISOString().split('T')[0],
    probation_months: 6,
    department_id: 1,
    designation_id: 1,
    basic_salary: 50000,
    house_rent_allowance: 25000,
    medical_allowance: 5000,
    conveyance_allowance: 4000,
    site_hazard_allowance: 0,
    mobile_allowance: 2000,
    is_pf_eligible: true,
    is_tax_eligible: true,
    bank_name: 'City Bank PLC',
    bank_account_no: ''
  });

  filteredEmployees = computed(() => {
    let list = this.hrmsService.employees();
    const tab = this.activeTab();
    if (tab === 'CORPORATE') {
      list = list.filter(e => e.workforce_category === 'CORPORATE');
    } else if (tab === 'SITE_ENGINEERING') {
      list = list.filter(e => e.workforce_category !== 'CORPORATE');
    }

    const deptId = this.selectedDepartmentId();
    if (deptId) {
      list = list.filter(e => e.department_id === Number(deptId));
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(e => 
        e.first_name.toLowerCase().includes(q) ||
        e.last_name.toLowerCase().includes(q) ||
        e.employee_code.toLowerCase().includes(q) ||
        e.phone.includes(q)
      );
    }
    return list;
  });

  ngOnInit() {
    this.hrmsService.loadEmployees().subscribe();
    this.hrmsService.loadDepartments().subscribe();
    this.hrmsService.loadDesignations().subscribe();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  viewEmployee(emp: Employee) {
    this.selectedEmployee.set(emp);
    this.isDrawerOpen.set(true);
  }

  closeDrawer() {
    this.isDrawerOpen.set(false);
  }

  openAddModal() {
    const depts = this.hrmsService.departments();
    const desigs = this.hrmsService.designations();
    this.newEmp.update(e => ({
      ...e,
      department_id: depts.length > 0 ? depts[0].id : 1,
      designation_id: desigs.length > 0 ? desigs[0].id : 1
    }));
    this.isAddModalOpen.set(true);
  }

  closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  saveEmployee() {
    const empData = this.newEmp();
    if (!empData.first_name || !empData.phone) {
      alert('Please provide first name and phone number.');
      return;
    }

    this.isSaving.set(true);
    this.hrmsService.createEmployee(empData).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeAddModal();
        this.hrmsService.loadEmployees().subscribe();
        alert('Employee created successfully!');
      },
      error: (err) => {
        this.isSaving.set(false);
        alert(err?.error?.detail || 'Failed to save employee.');
      }
    });
  }
}
