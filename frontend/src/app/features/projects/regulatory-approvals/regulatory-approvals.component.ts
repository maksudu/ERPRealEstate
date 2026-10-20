import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, AuthorityClearance, AuthorityClearancePaginationResponse } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  CustomButtonComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-regulatory-approvals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent
  ],
  template: `
    <div class="space-y-6">
      <!-- Modular Submodule Header Strip -->

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Total Permits Tracked -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Statutory Permits Tracked</span>
            <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">{{ totalCount() }} NOCs</p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
            Across RAJUK, CDA, FSCD, DoE, CAAB, WASA
          </p>
        </div>

        <!-- 2. Sanctioned & Approved -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Sanctioned & Approved</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">{{ approvedCount() }}</p>
          <p class="text-[11px] text-muted-foreground mt-1">Valid & In Good Standing</p>
        </div>

        <!-- 3. In Review / Submitted -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">In Review / Submitted</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">{{ submittedCount() }}</p>
          <p class="text-[11px] text-muted-foreground mt-1">Under Authority Scrutiny</p>
        </div>

        <!-- 4. Compliance Adherence -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Compliance Adherence</span>
            <span class="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-purple-600 dark:text-purple-400 mt-2">{{ compliancePct() }}%</p>
          <p class="text-[11px] text-muted-foreground mt-1">BNBC & Imarat Nirman Rules</p>
        </div>
      </div>

      <!-- Main Regulatory Approvals Management Card -->
      <app-card-container
        title="2.8 Regulatory Approvals & Statutory Compliance Vault"
        subtitle="Manage authority applications, submissions, correspondence, conditions, inspections, renewals, and occupancy completion certificates"
        badge="Legal & Statutory Clearances"
      >
        <!-- Top Action Buttons -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="prePopulateStandardClearances()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Auto-generate 9 standard Bangladesh regulatory clearances for the selected project"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            <span>{{ seeding() ? 'Generating...' : 'Seed Standard BD Clearances' }}</span>
          </button>

          <a
            routerLink="/projects/regulatory-approvals/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Regulatory Approval</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-secondary/30 border border-border mb-5">
          <!-- Project Filter -->
          <div>
            <app-searchable-select
              label="Development Project"
              [options]="projectFilterOptions()"
              [searchable]="true"
              [(ngModel)]="selectedProjectId"
              (selectionChange)="onFilterChange()"
              placeholder="All Projects"
            ></app-searchable-select>
          </div>

          <!-- Authority Filter -->
          <div>
            <app-searchable-select
              label="Applicable Authority"
              [options]="authorityFilterOptions"
              [searchable]="true"
              [(ngModel)]="selectedAuthority"
              (selectionChange)="onFilterChange()"
              placeholder="All Authorities"
            ></app-searchable-select>
          </div>

          <!-- Status Filter -->
          <div>
            <app-searchable-select
              label="Clearance Status"
              [options]="statusFilterOptions"
              [(ngModel)]="selectedStatus"
              (selectionChange)="onFilterChange()"
              placeholder="All Statuses"
            ></app-searchable-select>
          </div>

          <!-- Search Term -->
          <div>
            <app-custom-input
              label="Search Approvals"
              placeholder="Memo, ref no, or officer..."
              [(ngModel)]="searchTerm"
              (input)="onSearchInput()"
            ></app-custom-input>
          </div>
        </div>

        <!-- Approvals Table -->
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-secondary/60 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3">Approval ID & Scope</th>
                <th class="px-4 py-3">Authority & Jurisdiction</th>
                <th class="px-4 py-3">Linked Project</th>
                <th class="px-4 py-3">Application & Sanction Memo</th>
                <th class="px-4 py-3">Submission & Approval Date</th>
                <th class="px-4 py-3">Validity / Expiry</th>
                <th class="px-4 py-3">Compliance Officer & Next Action</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-foreground">
              @if (loading()) {
                <tr>
                  <td colspan="9" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading regulatory approvals and statutory clearances...</span>
                    </div>
                  </td>
                </tr>
              } @else if (clearances().length === 0) {
                <tr>
                  <td colspan="9" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <svg class="w-8 h-8 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p class="font-medium text-foreground">No regulatory approvals found matching current criteria.</p>
                      <p class="text-xs text-muted-foreground">Click "Record Regulatory Approval" or "Seed Standard BD Clearances" to add records.</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (c of clearances(); track c.id) {
                  <tr class="hover:bg-secondary/30 transition-colors">
                    <!-- 1. Approval ID & Scope -->
                    <td class="px-4 py-3">
                      <div class="font-bold text-foreground font-mono flex items-center gap-1.5">
                        <span>{{ c.reference_no || 'CLR-' + c.id }}</span>
                        @if (c.sanctioned_floors) {
                          <span class="text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 font-sans">
                            {{ c.sanctioned_floors }}
                          </span>
                        }
                      </div>
                      <div class="text-[11px] font-semibold text-muted-foreground mt-0.5">
                        {{ formatClearanceType(c.clearance_type_id) }}
                      </div>
                      @if (c.approval_category) {
                        <div class="text-[10px] text-muted-foreground/80">
                          Cat: {{ formatCategory(c.approval_category) }}
                        </div>
                      }
                    </td>

                    <!-- 2. Authority & Jurisdiction -->
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border"
                        [ngClass]="getAuthorityBadgeClass(c.authority_name)"
                      >
                        {{ c.authority_name || 'RAJUK' }}
                      </span>
                      @if (c.contact_officer_name) {
                        <div class="text-[10px] text-muted-foreground mt-1">
                          Officer: {{ c.contact_officer_name }}
                        </div>
                      }
                    </td>

                    <!-- 3. Linked Project -->
                    <td class="px-4 py-3">
                      <div class="font-medium text-foreground">
                        {{ c.project_name || 'Project #' + c.project_id }}
                      </div>
                      @if (c.project_code) {
                        <div class="text-[10px] text-muted-foreground font-mono">
                          Code: {{ c.project_code }}
                        </div>
                      }
                    </td>

                    <!-- 4. Application & Sanction Memo -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      @if (c.approved_memo_no) {
                        <div class="font-bold text-emerald-600 dark:text-emerald-400">
                          <span class="text-[9px] uppercase font-semibold text-muted-foreground block font-sans">Approved Memo</span>
                          {{ c.approved_memo_no }}
                        </div>
                      }
                      @if (c.application_memo_no) {
                        <div class="text-blue-600 dark:text-blue-400 mt-0.5">
                          <span class="text-[9px] uppercase font-semibold text-muted-foreground block font-sans">App Ref</span>
                          {{ c.application_memo_no }}
                        </div>
                      }
                      @if (!c.approved_memo_no && !c.application_memo_no) {
                        <span class="text-muted-foreground italic font-sans">Not Submitted</span>
                      }
                    </td>

                    <!-- 5. Submission & Approval Date -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      <div>
                        <span class="text-[9px] text-muted-foreground uppercase font-sans">Sub:</span>
                        {{ c.submission_date ? (c.submission_date | slice:0:10) : '—' }}
                      </div>
                      <div class="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <span class="text-[9px] text-muted-foreground uppercase font-sans">App:</span>
                        {{ c.approval_date ? (c.approval_date | slice:0:10) : 'Pending' }}
                      </div>
                    </td>

                    <!-- 6. Validity / Expiry -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      @if (c.expiry_date) {
                        <div [ngClass]="{'text-rose-500 font-bold': isExpired(c.expiry_date)}">
                          {{ c.expiry_date | slice:0:10 }}
                        </div>
                        @if (c.validity_months) {
                          <div class="text-[10px] text-muted-foreground font-sans">
                            Validity: {{ c.validity_months }} mos
                          </div>
                        }
                      } @else {
                        <span class="text-muted-foreground font-sans">No Expiry / Lifetime</span>
                      }
                    </td>

                    <!-- 7. Responsible Officer & Next Action -->
                    <td class="px-4 py-3 text-[11px] max-w-[200px]">
                      <div class="font-medium text-foreground truncate" [title]="c.responsible_officer || 'Unassigned'">
                        {{ c.responsible_officer || 'Unassigned' }}
                      </div>
                      @if (c.next_action) {
                        <div class="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 line-clamp-2" [title]="c.next_action">
                          Next: {{ c.next_action }}
                        </div>
                      }
                    </td>

                    <!-- 8. Status Badge -->
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                        [ngClass]="getStatusBadgeClass(c.status)"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getStatusDotClass(c.status)"></span>
                        {{ formatStatus(c.status) }}
                      </span>
                      @if (c.conditions && c.conditions.length > 0) {
                        <div class="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                          <svg class="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                          </svg>
                          <span>{{ c.conditions.length }} Conditions</span>
                        </div>
                      }
                    </td>

                    <!-- 9. Row Actions -->
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <a
                          [routerLink]="['/projects/regulatory-approvals/edit', c.id]"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-primary transition-colors"
                          title="Edit Regulatory Record & Conditions"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          (click)="deleteClearance(c)"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Delete Regulatory Clearance"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination Bar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 text-xs text-muted-foreground pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            <span>Showing {{ paginationStart() }} to {{ paginationEnd() }} of {{ totalCount() }} regulatory approvals</span>
            <span class="text-border">|</span>
            <label class="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                [(ngModel)]="limit"
                (ngModelChange)="onLimitChange()"
                class="px-2 py-1 rounded-md border border-border bg-card text-foreground font-medium"
              >
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
              </select>
            </label>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="offset() === 0 || loading()"
              class="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-40"
            >
              Previous
            </button>
            <span class="px-2 font-mono font-semibold text-foreground">
              Page {{ currentPage() }} of {{ totalPages() }}
            </span>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="offset() + limit >= totalCount() || loading()"
              class="px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </app-card-container>

      <!-- Regulatory Framework Notice -->
      <div class="p-4 rounded-xl bg-card border border-border flex items-start gap-3 shadow-2xs">
        <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="text-xs space-y-1">
          <h4 class="font-bold text-foreground">Critical Control: Version-Controlled Approved Drawing Sets & Statutory Evidence</h4>
          <p class="text-muted-foreground leading-relaxed">
            Construction teams must strictly operate from the currently authorized, sanctioned drawing set. The ERP monitors statutory applications and documentary evidence; submitting an application does not constitute granted sanction. Any material design change must trigger a formal review of the relevant authority approvals.
          </p>
        </div>
      </div>
    </div>
  `
})
export class ProjectRegulatoryApprovalsComponent implements OnInit {
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // Data signals
  clearances = signal<AuthorityClearance[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  seeding = signal<boolean>(false);

  // Aggregation signals
  totalCount = signal<number>(0);
  approvedCount = signal<number>(0);
  submittedCount = signal<number>(0);
  compliancePct = signal<number>(100);

  // Pagination parameters
  limit = 10;
  offset = signal<number>(0);

  // Filter signals
  selectedProjectId: any = null;
  selectedAuthority: string = '';
  selectedStatus: string = '';
  searchTerm: string = '';

  // Options
  authorityFilterOptions: SelectOption[] = [
    { value: '', label: 'All Authorities' },
    { value: 'RAJUK', label: 'RAJUK (Rajdhani Unnayan Kartripakkha)' },
    { value: 'CDA', label: 'CDA (Chittagong Development Authority)' },
    { value: 'KDA', label: 'KDA (Khulna Development Authority)' },
    { value: 'RDA', label: 'RDA (Rajshahi Development Authority)' },
    { value: 'FSCD', label: 'FSCD (Fire Service & Civil Defence)' },
    { value: 'DoE', label: 'DoE (Department of Environment)' },
    { value: 'CAAB', label: 'CAAB (Civil Aviation Authority Bangladesh)' },
    { value: 'WASA', label: 'WASA (Water & Sewerage Authority)' },
    { value: 'DESCO_DPDC', label: 'DESCO / DPDC Electric Utility' },
    { value: 'TITAS_GAS', label: 'Titas Gas Transmission & Distribution' }
  ];

  statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'APPROVED', label: 'Approved & Sanctioned' },
    { value: 'SUBMITTED', label: 'Submitted to Authority' },
    { value: 'IN_REVIEW', label: 'In Review' },
    { value: 'QUERY_RAISED', label: 'Query Raised' },
    { value: 'NOT_APPLIED', label: 'Not Applied' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'REJECTED', label: 'Rejected' }
  ];

  projectFilterOptions = computed<SelectOption[]>(() => {
    const list: SelectOption[] = [{ value: null, label: 'All Development Projects' }];
    this.projects().forEach(p => {
      list.push({
        value: p.id,
        label: `${p.project_name} (${p.project_code})`
      });
    });
    return list;
  });

  // Computed pagination helpers
  currentPage = computed(() => Math.floor(this.offset() / this.limit) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.limit)));
  paginationStart = computed(() => (this.totalCount() === 0 ? 0 : this.offset() + 1));
  paginationEnd = computed(() => Math.min(this.offset() + this.limit, this.totalCount()));

  ngOnInit(): void {
    this.loadProjects();
    this.loadClearances();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => {
        this.projects.set(data || []);
      }
    });
  }

  loadClearances(): void {
    this.loading.set(true);
    const params: any = {
      limit: this.limit,
      offset: this.offset()
    };

    if (this.selectedProjectId) params.project_id = Number(this.selectedProjectId);
    if (this.selectedAuthority) params.authority_name = this.selectedAuthority;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.searchTerm && this.searchTerm.trim()) params.search = this.searchTerm.trim();

    this.projectService.getClearances(params).subscribe({
      next: (resp: any) => {
        this.loading.set(false);
        if (resp && resp.items !== undefined) {
          this.clearances.set(resp.items || []);
          this.totalCount.set(resp.total || 0);
          this.approvedCount.set(resp.approved_count || 0);
          this.submittedCount.set(resp.submitted_count || 0);
          this.compliancePct.set(resp.compliance_adherence_pct !== undefined ? resp.compliance_adherence_pct : 100);
        } else if (Array.isArray(resp)) {
          this.clearances.set(resp);
          this.totalCount.set(resp.length);
          this.approvedCount.set(resp.filter((c: any) => c.status === 'APPROVED').length);
          this.submittedCount.set(resp.filter((c: any) => c.status === 'SUBMITTED' || c.status === 'IN_REVIEW').length);
          this.compliancePct.set(100);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.loadClearances();
  }

  onSearchInput(): void {
    this.offset.set(0);
    this.loadClearances();
  }

  onLimitChange(): void {
    this.offset.set(0);
    this.loadClearances();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(val => Math.max(0, val - this.limit));
      this.loadClearances();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalCount()) {
      this.offset.update(val => val + this.limit);
      this.loadClearances();
    }
  }

  prePopulateStandardClearances(): void {
    let pId = this.selectedProjectId ? Number(this.selectedProjectId) : null;
    if (!pId && this.projects().length > 0) {
      pId = this.projects()[0].id;
    }

    if (!pId) {
      alert('Please create or select a project first to seed standard regulatory clearances.');
      return;
    }

    if (!confirm('Pre-populate standard 9 Bangladeshi authority clearances (LUC, Building Plan, Fire NOC, CAAB, DoE, WASA, DPDC, Inspections, OC) for this project?')) {
      return;
    }

    this.seeding.set(true);
    this.projectService.seedStandardClearances(pId).subscribe({
      next: () => {
        this.seeding.set(false);
        this.loadClearances();
      },
      error: (err) => {
        this.seeding.set(false);
        alert(err.error?.detail || 'Failed to seed standard clearances.');
      }
    });
  }

  deleteClearance(c: AuthorityClearance): void {
    if (!confirm(`Are you sure you want to delete clearance "${c.reference_no || c.clearance_type_id}"?`)) {
      return;
    }

    this.projectService.deleteClearance(c.id).subscribe({
      next: () => {
        this.loadClearances();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to delete clearance record.');
      }
    });
  }

  // Formatters & UI helpers
  formatClearanceType(typeId: string): string {
    const map: Record<string, string> = {
      'LUC': 'Land Use Clearance (LUC)',
      'BUILDING_PLAN': 'Building Plan Sanction',
      'FIRE_NOC': 'Fire Safety NOC',
      'AVIATION_HEIGHT': 'CAAB Height Sanction',
      'ENVIRONMENTAL': 'DoE Environmental Clearance',
      'WASA': 'WASA Water & Sewerage',
      'DESCO_DPDC': 'DESCO/DPDC Substation Space',
      'CONSTRUCTION_INSPECTION': 'Construction Stage Inspection',
      'OCCUPANCY_CERT': 'Occupancy Certificate (OC)'
    };
    return map[typeId] || typeId;
  }

  formatCategory(category: string): string {
    const map: Record<string, string> = {
      'LAND_USE_PERMIT': 'Land-Use Permission',
      'BUILDING_PLAN': 'Building Plan',
      'DRAWING_APPROVAL': 'Drawing Approvals',
      'FIRE_SAFETY_CLEARANCE': 'Fire Safety Clearance',
      'ENVIRONMENTAL_CLEARANCE': 'Environmental Clearance',
      'UTILITY_SERVICE': 'Utility Service Connection',
      'CONSTRUCTION_INSPECTION': 'Construction Inspection',
      'OCCUPANCY_CERTIFICATE': 'Occupancy Certificate'
    };
    return map[category] || category;
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      'APPROVED': 'Approved & Sanctioned',
      'SUBMITTED': 'Submitted',
      'IN_REVIEW': 'In Review',
      'QUERY_RAISED': 'Query Raised',
      'NOT_APPLIED': 'Not Applied',
      'DRAFT': 'Draft',
      'EXPIRED': 'Expired',
      'REJECTED': 'Rejected',
      'RENEWAL_PENDING': 'Renewal Pending'
    };
    return map[status] || status;
  }

  getAuthorityBadgeClass(authority: string): string {
    switch (authority) {
      case 'RAJUK':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20';
      case 'CDA':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
      case 'FSCD':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
      case 'CAAB':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';
      case 'DoE':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
      case 'WASA':
        return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20';
      default:
        return 'bg-secondary text-foreground border-border';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'QUERY_RAISED':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'REJECTED':
      case 'EXPIRED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-500';
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return 'bg-blue-500';
      case 'QUERY_RAISED':
        return 'bg-amber-500';
      case 'REJECTED':
      case 'EXPIRED':
        return 'bg-rose-500';
      default:
        return 'bg-muted-foreground';
    }
  }

  isExpired(expiryDate?: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate).getTime() < Date.now();
  }
}
