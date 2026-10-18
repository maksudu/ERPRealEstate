import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HrmsOrgService } from '../../../core/services/hrms-org.service';
import { ProjectService } from '../../../core/services/project.service';
import { HrmsService } from '../hrms.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  Company, CompanyCreatePayload,
  LegalEntity, LegalEntityCreatePayload,
  Branch, BranchCreatePayload,
  ProjectOffice, ProjectOfficeCreatePayload,
  OrgNode, OrgHierarchyResponse
} from '../../../core/models/hrms-org.model';
import { Project } from '../../../core/models/project.model';
import { Employee } from '../hrms.service';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  CustomTabsComponent,
  TabItem,
  ModalComponent,
  SearchableSelectComponent,
  StatusBadgeComponent
} from '../../../shared/components';

@Component({
  selector: 'app-org-structure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    ModalComponent,
    SearchableSelectComponent,
    StatusBadgeComponent
  ],
  templateUrl: './org-structure.component.html'
})
export class OrgStructureComponent implements OnInit {
  private route = inject(ActivatedRoute);
  orgService = inject(HrmsOrgService);
  projectService = inject(ProjectService);
  hrmsService = inject(HrmsService);
  lookupService = inject(LookupService);

  // Tabs configuration
  activeTab = signal<string>('tree');

  tabs = computed<TabItem[]>(() => [
    { id: 'tree', label: 'Organization Tree', count: this.orgService.companies().length },
    { id: 'companies', label: 'Company Master', count: this.orgService.companies().length },
    { id: 'legal-entities', label: 'Legal Entities', count: this.orgService.legalEntities().length },
    { id: 'branches', label: 'Branches & Offices', count: this.orgService.branches().length },
    { id: 'project-offices', label: 'Project Site Offices', count: this.orgService.projectOffices().length },
    { id: 'settings', label: 'Dynamic Master Dropdowns' }
  ]);

  // Master lists
  projects = signal<Project[]>([]);
  employees = signal<Employee[]>([]);

  // Filter terms
  searchQuery = signal<string>('');
  selectedCompanyFilter = signal<number | null>(null);

  // Modals state
  isCompanyModalOpen = signal<boolean>(false);
  isLegalEntityModalOpen = signal<boolean>(false);
  isBranchModalOpen = signal<boolean>(false);
  isProjectOfficeModalOpen = signal<boolean>(false);
  isQuickLookupModalOpen = signal<boolean>(false);
  isDeleteConfirmModalOpen = signal<boolean>(false);

  // Edit target IDs (null when creating new)
  editingCompanyId = signal<number | null>(null);
  editingLegalEntityId = signal<number | null>(null);
  editingBranchId = signal<number | null>(null);
  editingProjectOfficeId = signal<number | null>(null);

  // Deletion context
  itemToDelete = signal<{ type: 'COMPANY' | 'BRANCH' | 'LEGAL_ENTITY' | 'PROJECT_OFFICE'; id: number; name: string } | null>(null);
  deleteErrorMsg = signal<string | null>(null);

  // Alert & feedback messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // --- Company Form Model ---
  companyForm: CompanyCreatePayload = this.getEmptyCompanyForm();

  // --- Legal Entity Form Model ---
  legalEntityForm: LegalEntityCreatePayload = this.getEmptyLegalEntityForm();

  // --- Branch Form Model ---
  branchForm: BranchCreatePayload = this.getEmptyBranchForm();

  // --- Project Office Form Model ---
  projectOfficeForm: ProjectOfficeCreatePayload = this.getEmptyProjectOfficeForm();

  // --- Quick Lookup Item Form Model ---
  quickLookupCategory = signal<string>('COMPANY_TYPE');
  quickItemCode = signal<string>('');
  quickItemNameEn = signal<string>('');
  quickItemNameBn = signal<string>('');
  quickColorBadge = signal<string>('#10b981');

  // Select Options Computed Signals (Formatted for <app-searchable-select>)
  companyOptions = computed(() => {
    return this.orgService.companies().map(c => ({
      value: c.id,
      label: `${c.company_name} (${c.company_code})`,
      subLabel: `${c.company_type.replace('_', ' ')} • ${c.currency}`
    }));
  });

  legalEntityOptions = computed(() => {
    return this.orgService.legalEntities().map(e => ({
      value: e.id,
      label: `${e.registered_name} (${e.entity_code})`,
      subLabel: `BIN: ${e.bin_number || 'N/A'} • ${e.legal_form}`
    }));
  });

  projectOptions = computed(() => {
    return this.projects().map(p => ({
      value: p.id,
      label: `${p.project_name} (${p.project_code})`,
      subLabel: `${p.status} • Area: ${p.plot_area_sqft || 0} sqft`
    }));
  });

  employeeOptions = computed(() => {
    return this.employees().map(emp => ({
      value: emp.id,
      label: `${emp.first_name} ${emp.last_name} (${emp.employee_code})`,
      subLabel: `${emp.department_id ? 'Dept ' + emp.department_id : ''} • ${emp.workforce_category}`
    }));
  });

  ngOnInit(): void {
    this.route.url.subscribe(segments => {
      const last = segments[segments.length - 1]?.path;
      if (last === 'companies') this.activeTab.set('companies');
      else if (last === 'legal-entities') this.activeTab.set('legal-entities');
      else if (last === 'branches') this.activeTab.set('branches');
      else if (last === 'project-offices') this.activeTab.set('project-offices');
      else if (last === 'cost-centers') this.activeTab.set('tree');
    });
    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab && ['tree', 'companies', 'legal-entities', 'branches', 'project-offices', 'settings'].includes(tab)) {
        this.activeTab.set(tab);
      }
    });
    this.refreshAllData();
  }

  refreshAllData(): void {
    this.orgService.loadOrgTree().subscribe();
    this.orgService.loadCompanies().subscribe();
    this.orgService.loadLegalEntities().subscribe();
    this.orgService.loadBranches().subscribe();
    this.orgService.loadProjectOffices().subscribe();

    this.projectService.getProjects().subscribe({
      next: (res) => this.projects.set(res),
      error: () => {}
    });

    this.hrmsService.loadEmployees().subscribe({
      next: (res) => this.employees.set(res),
      error: () => {}
    });
  }

  onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
    this.clearAlerts();
  }

  clearAlerts(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.deleteErrorMsg.set(null);
  }

  // ==========================================
  // COMPANY OPERATIONS
  // ==========================================
  openCreateCompanyModal(): void {
    this.editingCompanyId.set(null);
    this.companyForm = this.getEmptyCompanyForm();
    this.clearAlerts();
    this.isCompanyModalOpen.set(true);
  }

  openEditCompanyModal(comp: Company): void {
    this.editingCompanyId.set(comp.id);
    this.companyForm = {
      company_code: comp.company_code,
      company_name: comp.company_name,
      short_name: comp.short_name,
      company_type: comp.company_type,
      parent_company_id: comp.parent_company_id,
      country: comp.country,
      currency: comp.currency,
      time_zone: comp.time_zone,
      logo: comp.logo,
      status: comp.status,
      default_language: comp.default_language,
      financial_year_start_month: comp.financial_year_start_month,
      date_format: comp.date_format,
      number_format: comp.number_format,
      employee_code_prefix: comp.employee_code_prefix,
      approval_policies: comp.approval_policies || {},
      payroll_config: comp.payroll_config || {},
      report_access: comp.report_access || {},
      is_active: comp.is_active
    };
    this.clearAlerts();
    this.isCompanyModalOpen.set(true);
  }

  saveCompany(): void {
    if (!this.companyForm.company_code || !this.companyForm.company_name || !this.companyForm.short_name) {
      this.errorMessage.set('Please fill in required fields: Company Code, Company Name, and Short Name.');
      return;
    }

    const compId = this.editingCompanyId();
    if (compId) {
      this.orgService.updateCompany(compId, this.companyForm).subscribe({
        next: (res) => {
          this.isCompanyModalOpen.set(false);
          this.successMessage.set(`Company '${res.company_name}' updated successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update company.');
        }
      });
    } else {
      this.orgService.createCompany(this.companyForm).subscribe({
        next: (res) => {
          this.isCompanyModalOpen.set(false);
          this.successMessage.set(`Company '${res.company_name}' registered successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to register company.');
        }
      });
    }
  }

  toggleCompanyStatus(comp: Company): void {
    const newStatus = comp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.orgService.updateCompany(comp.id, { status: newStatus, is_active: newStatus === 'ACTIVE' }).subscribe({
      next: () => {
        this.successMessage.set(`Company '${comp.company_name}' status set to ${newStatus}. Historical records preserved.`);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to change company status.');
      }
    });
  }

  promptDeleteCompany(comp: Company): void {
    this.itemToDelete.set({
      type: 'COMPANY',
      id: comp.id,
      name: comp.company_name
    });
    this.deleteErrorMsg.set(null);
    this.isDeleteConfirmModalOpen.set(true);
  }

  // ==========================================
  // LEGAL ENTITY OPERATIONS
  // ==========================================
  openCreateLegalEntityModal(): void {
    this.editingLegalEntityId.set(null);
    this.legalEntityForm = this.getEmptyLegalEntityForm();
    if (this.orgService.companies().length > 0) {
      this.legalEntityForm.company_id = this.orgService.companies()[0].id;
    }
    this.clearAlerts();
    this.isLegalEntityModalOpen.set(true);
  }

  openEditLegalEntityModal(entity: LegalEntity): void {
    this.editingLegalEntityId.set(entity.id);
    this.legalEntityForm = {
      company_id: entity.company_id,
      entity_code: entity.entity_code,
      registered_name: entity.registered_name,
      registration_number: entity.registration_number,
      registration_date: entity.registration_date,
      legal_form: entity.legal_form,
      registered_office_address: entity.registered_office_address,
      tin_number: entity.tin_number,
      bin_number: entity.bin_number,
      trade_license_number: entity.trade_license_number,
      trade_license_expiry: entity.trade_license_expiry,
      rjsc_registration_details: entity.rjsc_registration_details,
      authorized_signatory_name: entity.authorized_signatory_name,
      authorized_signatory_designation: entity.authorized_signatory_designation,
      statutory_documents: entity.statutory_documents || [],
      effective_date: entity.effective_date,
      is_default: entity.is_default,
      status: entity.status
    };
    this.clearAlerts();
    this.isLegalEntityModalOpen.set(true);
  }

  saveLegalEntity(): void {
    if (!this.legalEntityForm.company_id || !this.legalEntityForm.entity_code || !this.legalEntityForm.registered_name) {
      this.errorMessage.set('Please fill in required fields: Owning Company, Entity Code, and Registered Name.');
      return;
    }

    const id = this.editingLegalEntityId();
    if (id) {
      this.orgService.updateLegalEntity(id, this.legalEntityForm).subscribe({
        next: (res) => {
          this.isLegalEntityModalOpen.set(false);
          this.successMessage.set(`Legal Entity '${res.registered_name}' updated successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update legal entity.');
        }
      });
    } else {
      this.orgService.createLegalEntity(this.legalEntityForm).subscribe({
        next: (res) => {
          this.isLegalEntityModalOpen.set(false);
          this.successMessage.set(`Legal Entity '${res.registered_name}' registered successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to register legal entity.');
        }
      });
    }
  }

  promptDeleteLegalEntity(entity: LegalEntity): void {
    this.itemToDelete.set({
      type: 'LEGAL_ENTITY',
      id: entity.id,
      name: entity.registered_name
    });
    this.deleteErrorMsg.set(null);
    this.isDeleteConfirmModalOpen.set(true);
  }

  // ==========================================
  // BRANCH OPERATIONS
  // ==========================================
  openCreateBranchModal(): void {
    this.editingBranchId.set(null);
    this.branchForm = this.getEmptyBranchForm();
    if (this.orgService.companies().length > 0) {
      this.branchForm.company_id = this.orgService.companies()[0].id;
    }
    this.clearAlerts();
    this.isBranchModalOpen.set(true);
  }

  openEditBranchModal(branch: Branch): void {
    this.editingBranchId.set(branch.id);
    this.branchForm = {
      company_id: branch.company_id,
      branch_code: branch.branch_code,
      branch_name: branch.branch_name,
      branch_type: branch.branch_type,
      legal_entity_id: branch.legal_entity_id,
      manager_employee_id: branch.manager_employee_id,
      phone: branch.phone,
      email: branch.email,
      division: branch.division,
      district: branch.district,
      upazila_thana: branch.upazila_thana,
      address: branch.address,
      is_head_office: branch.is_head_office,
      opening_date: branch.opening_date,
      closing_date: branch.closing_date,
      default_cost_center: branch.default_cost_center,
      status: branch.status
    };
    this.clearAlerts();
    this.isBranchModalOpen.set(true);
  }

  saveBranch(): void {
    if (!this.branchForm.company_id || !this.branchForm.branch_code || !this.branchForm.branch_name) {
      this.errorMessage.set('Please fill in required fields: Owning Company, Branch Code, and Branch Name.');
      return;
    }

    const id = this.editingBranchId();
    if (id) {
      this.orgService.updateBranch(id, this.branchForm).subscribe({
        next: (res) => {
          this.isBranchModalOpen.set(false);
          this.successMessage.set(`Branch '${res.branch_name}' updated successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update branch.');
        }
      });
    } else {
      this.orgService.createBranch(this.branchForm).subscribe({
        next: (res) => {
          this.isBranchModalOpen.set(false);
          this.successMessage.set(`Branch '${res.branch_name}' created successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to create branch.');
        }
      });
    }
  }

  toggleBranchStatus(branch: Branch): void {
    const newStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.orgService.updateBranch(branch.id, { status: newStatus }).subscribe({
      next: () => {
        this.successMessage.set(`Branch '${branch.branch_name}' status set to ${newStatus}.`);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to change branch status.');
      }
    });
  }

  promptDeleteBranch(branch: Branch): void {
    this.itemToDelete.set({
      type: 'BRANCH',
      id: branch.id,
      name: branch.branch_name
    });
    this.deleteErrorMsg.set(null);
    this.isDeleteConfirmModalOpen.set(true);
  }

  // ==========================================
  // PROJECT OFFICE OPERATIONS
  // ==========================================
  openCreateProjectOfficeModal(): void {
    this.editingProjectOfficeId.set(null);
    this.projectOfficeForm = this.getEmptyProjectOfficeForm();
    if (this.orgService.companies().length > 0) {
      this.projectOfficeForm.company_id = this.orgService.companies()[0].id;
    }
    if (this.projects().length > 0) {
      this.projectOfficeForm.project_id = this.projects()[0].id;
    }
    this.clearAlerts();
    this.isProjectOfficeModalOpen.set(true);
  }

  openEditProjectOfficeModal(po: ProjectOffice): void {
    this.editingProjectOfficeId.set(po.id);
    this.projectOfficeForm = {
      office_code: po.office_code,
      office_name: po.office_name,
      company_id: po.company_id,
      legal_entity_id: po.legal_entity_id,
      project_id: po.project_id,
      office_type: po.office_type,
      site_in_charge_employee_id: po.site_in_charge_employee_id,
      phone: po.phone,
      email: po.email,
      division: po.division,
      district: po.district,
      upazila_thana: po.upazila_thana,
      address: po.address,
      opening_date: po.opening_date,
      expected_closing_date: po.expected_closing_date,
      operational_status: po.operational_status,
      default_cost_center: po.default_cost_center,
      supporting_documents: po.supporting_documents || []
    };
    this.clearAlerts();
    this.isProjectOfficeModalOpen.set(true);
  }

  saveProjectOffice(): void {
    if (!this.projectOfficeForm.company_id || !this.projectOfficeForm.project_id || !this.projectOfficeForm.office_code || !this.projectOfficeForm.office_name) {
      this.errorMessage.set('Please fill in required fields: Linked Project, Owning Company, Office Code, and Office Name.');
      return;
    }

    const id = this.editingProjectOfficeId();
    if (id) {
      this.orgService.updateProjectOffice(id, this.projectOfficeForm).subscribe({
        next: (res) => {
          this.isProjectOfficeModalOpen.set(false);
          this.successMessage.set(`Project Office '${res.office_name}' updated successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to update project office.');
        }
      });
    } else {
      this.orgService.createProjectOffice(this.projectOfficeForm).subscribe({
        next: (res) => {
          this.isProjectOfficeModalOpen.set(false);
          this.successMessage.set(`Project Office '${res.office_name}' registered successfully.`);
        },
        error: (err) => {
          this.errorMessage.set(err.error?.detail || 'Failed to register project office.');
        }
      });
    }
  }

  promptDeleteProjectOffice(po: ProjectOffice): void {
    this.itemToDelete.set({
      type: 'PROJECT_OFFICE',
      id: po.id,
      name: po.office_name
    });
    this.deleteErrorMsg.set(null);
    this.isDeleteConfirmModalOpen.set(true);
  }

  // ==========================================
  // CONFIRM DELETION / SAFE DEACTIVATION
  // ==========================================
  confirmDeleteAction(hardDelete: boolean): void {
    const item = this.itemToDelete();
    if (!item) return;

    if (item.type === 'COMPANY') {
      this.orgService.deleteCompany(item.id, hardDelete).subscribe({
        next: (res) => {
          this.isDeleteConfirmModalOpen.set(false);
          this.successMessage.set(res.message);
        },
        error: (err) => {
          this.deleteErrorMsg.set(err.error?.detail || 'Action failed due to business rule validation.');
        }
      });
    } else if (item.type === 'BRANCH') {
      this.orgService.deleteBranch(item.id, hardDelete).subscribe({
        next: (res) => {
          this.isDeleteConfirmModalOpen.set(false);
          this.successMessage.set(res.message);
        },
        error: (err) => {
          this.deleteErrorMsg.set(err.error?.detail || 'Action failed due to validation rule.');
        }
      });
    } else if (item.type === 'LEGAL_ENTITY') {
      this.orgService.deleteLegalEntity(item.id).subscribe({
        next: (res) => {
          this.isDeleteConfirmModalOpen.set(false);
          this.successMessage.set(res.message);
        },
        error: (err) => {
          this.deleteErrorMsg.set(err.error?.detail || 'Action failed.');
        }
      });
    } else if (item.type === 'PROJECT_OFFICE') {
      this.orgService.deleteProjectOffice(item.id).subscribe({
        next: (res) => {
          this.isDeleteConfirmModalOpen.set(false);
          this.successMessage.set(res.message);
        },
        error: (err) => {
          this.deleteErrorMsg.set(err.error?.detail || 'Action failed.');
        }
      });
    }
  }

  // ==========================================
  // QUICK ADD DYNAMIC DROPDOWN ITEM
  // ==========================================
  openQuickLookupModal(categoryCode: string): void {
    this.quickLookupCategory.set(categoryCode);
    this.quickItemCode.set('');
    this.quickItemNameEn.set('');
    this.quickItemNameBn.set('');
    this.quickColorBadge.set('#10b981');
    this.isQuickLookupModalOpen.set(true);
  }

  saveQuickLookupItem(): void {
    if (!this.quickItemNameEn()) {
      return;
    }
    const code = this.quickItemCode() || this.quickItemNameEn().toUpperCase().replace(/[^A-Z0-9]/g, '_');
    this.lookupService.quickCreate(this.quickLookupCategory(), {
      item_code: code,
      item_name_en: this.quickItemNameEn(),
      item_name_bn: this.quickItemNameBn() || this.quickItemNameEn(),
      color_badge: this.quickColorBadge()
    }).subscribe({
      next: (item) => {
        this.isQuickLookupModalOpen.set(false);
        this.successMessage.set(`Added "${item.item_name_en}" to ${this.quickLookupCategory()} dropdown options!`);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.detail || 'Failed to add dropdown item.');
      }
    });
  }

  // Form factory defaults
  private getEmptyCompanyForm(): CompanyCreatePayload {
    return {
      company_code: '',
      company_name: '',
      short_name: '',
      company_type: 'OPERATING_COMPANY',
      parent_company_id: null,
      country: 'Bangladesh',
      currency: 'BDT',
      time_zone: 'Asia/Dhaka',
      logo: null,
      status: 'ACTIVE',
      default_language: 'en',
      financial_year_start_month: 7,
      date_format: 'DD/MM/YYYY',
      number_format: 'en-IN',
      employee_code_prefix: 'BRE-',
      approval_policies: {},
      payroll_config: { working_days_per_week: 6, standard_hours_per_day: 8, pf_rate_percent: 8.33 },
      report_access: {},
      is_active: true
    };
  }

  private getEmptyLegalEntityForm(): LegalEntityCreatePayload {
    return {
      company_id: 1,
      entity_code: '',
      registered_name: '',
      registration_number: '',
      registration_date: null,
      legal_form: 'PVT_LTD',
      registered_office_address: '',
      tin_number: '',
      bin_number: '',
      trade_license_number: '',
      trade_license_expiry: null,
      rjsc_registration_details: '',
      authorized_signatory_name: '',
      authorized_signatory_designation: '',
      statutory_documents: [],
      effective_date: null,
      is_default: false,
      status: 'ACTIVE'
    };
  }

  private getEmptyBranchForm(): BranchCreatePayload {
    return {
      company_id: 1,
      branch_code: '',
      branch_name: '',
      branch_type: 'SALES_OFFICE',
      legal_entity_id: null,
      manager_employee_id: null,
      phone: '',
      email: '',
      division: 'DHAKA',
      district: 'DHAKA',
      upazila_thana: 'GULSHAN',
      address: '',
      is_head_office: false,
      opening_date: null,
      closing_date: null,
      default_cost_center: '',
      status: 'ACTIVE'
    };
  }

  private getEmptyProjectOfficeForm(): ProjectOfficeCreatePayload {
    return {
      office_code: '',
      office_name: '',
      company_id: 1,
      legal_entity_id: null,
      project_id: 1,
      office_type: 'CONSTRUCTION_SITE',
      site_in_charge_employee_id: null,
      phone: '',
      email: '',
      division: 'DHAKA',
      district: 'DHAKA',
      upazila_thana: 'GULSHAN',
      address: '',
      opening_date: null,
      expected_closing_date: null,
      operational_status: 'ACTIVE_MOBILIZED',
      default_cost_center: '',
      supporting_documents: []
    };
  }
}
