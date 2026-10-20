import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { Project, Drawing, DrawingPaginationResponse } from '../../../core/models/project.model';
import {
  CardContainerComponent,
  SearchableSelectComponent,
  CustomInputComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-project-drawings-documents',
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
      <!-- Modular Project Nav Strip -->

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Total Sheets in Vault -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Documents in Vault</span>
            <span class="p-1.5 rounded-lg bg-primary/10 text-primary">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-foreground mt-2">{{ totalCount() }} Sheets</p>
          <p class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary"></span>
            Across 11 Project Disciplines & Packages
          </p>
        </div>

        <!-- 2. Active IFC Approved -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active IFC Approved (Site)</span>
            <span class="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-2">{{ ifcCount() }}</p>
          <p class="text-[11px] text-muted-foreground mt-1">Issued for Construction (Live)</p>
        </div>

        <!-- 3. Superseded Obsolete -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Superseded (Obsolete)</span>
            <span class="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-2">{{ supersededCount() }}</p>
          <p class="text-[11px] text-muted-foreground mt-1">Voided / Retained for Audit</p>
        </div>

        <!-- 4. Under Technical Review -->
        <div class="bg-card border border-border rounded-xl p-4 shadow-2xs">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Under Technical Vetting</span>
            <span class="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </span>
          </div>
          <p class="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-2">{{ underReviewCount() }}</p>
          <p class="text-[11px] text-muted-foreground mt-1">Awaiting Chief Engineer Sign-off</p>
        </div>
      </div>

      <!-- Main Drawings & Document Management Container -->
      <app-card-container
        title="2.9 Architectural Drawings & Engineering Documents Vault"
        subtitle="Issued for Construction (IFC) revision engine with automatic superseding lock, CAD/PDF repository, and audit trail"
        badge="IFC Repository"
      >
        <!-- Top Action Buttons -->
        <div card-actions class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            (click)="prePopulateStandardDrawings()"
            [disabled]="seeding()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            title="Auto-seed 12 standard architectural, structural, MEP, and BOQ drawings for selected project"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
            </svg>
            <span>{{ seeding() ? 'Generating...' : 'Seed Standard Drawing Set' }}</span>
          </button>

          <a
            routerLink="/projects/drawings-documents/create"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Register Drawing / Document</span>
          </a>
        </div>

        <!-- Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 rounded-xl bg-secondary/30 border border-border mb-5">
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

          <!-- Category Filter -->
          <div>
            <app-searchable-select
              label="Document Category"
              [options]="categoryFilterOptions"
              [searchable]="true"
              [(ngModel)]="selectedCategory"
              (selectionChange)="onFilterChange()"
              placeholder="All Categories"
            ></app-searchable-select>
          </div>

          <!-- Discipline Filter -->
          <div>
            <app-searchable-select
              label="Discipline"
              [options]="disciplineFilterOptions"
              [(ngModel)]="selectedDiscipline"
              (selectionChange)="onFilterChange()"
              placeholder="All Disciplines"
            ></app-searchable-select>
          </div>

          <!-- Status Filter -->
          <div>
            <app-searchable-select
              label="IFC / Lifecycle Status"
              [options]="statusFilterOptions"
              [(ngModel)]="selectedStatus"
              (selectionChange)="onFilterChange()"
              placeholder="All Statuses"
            ></app-searchable-select>
          </div>

          <!-- Search Query -->
          <div>
            <app-custom-input
              label="Search Vault"
              placeholder="Drawing no, title, author..."
              [(ngModel)]="searchTerm"
              (input)="onSearchInput()"
            ></app-custom-input>
          </div>
        </div>

        <!-- Drawings Table -->
        <div class="overflow-x-auto rounded-xl border border-border">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-secondary/60 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th class="px-4 py-3">Drawing No & Rev</th>
                <th class="px-4 py-3">Document Title & Scope</th>
                <th class="px-4 py-3">Discipline & Package</th>
                <th class="px-4 py-3">Spatial Level</th>
                <th class="px-4 py-3">Consultant / Author</th>
                <th class="px-4 py-3">File & Format</th>
                <th class="px-4 py-3">IFC Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border text-foreground">
              @if (loading()) {
                <tr>
                  <td colspan="8" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Loading architectural drawings and document repository...</span>
                    </div>
                  </td>
                </tr>
              } @else if (drawings().length === 0) {
                <tr>
                  <td colspan="8" class="px-4 py-12 text-center text-muted-foreground">
                    <div class="flex flex-col items-center justify-center gap-2">
                      <svg class="w-8 h-8 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <p class="font-medium text-foreground">No drawings or documents found matching current criteria.</p>
                      <p class="text-xs text-muted-foreground">Click "Register Drawing / Document" or "Seed Standard Drawing Set" to populate records.</p>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (d of drawings(); track d.id) {
                  <tr class="hover:bg-secondary/30 transition-colors"
                    [ngClass]="{'opacity-60 bg-secondary/10': d.is_superseded || d.status === 'SUPERSEDED'}"
                  >
                    <!-- 1. Drawing No & Rev -->
                    <td class="px-4 py-3">
                      <div class="font-bold font-mono text-foreground flex items-center gap-1.5">
                        <span [ngClass]="{'line-through text-muted-foreground': d.is_superseded || d.status === 'SUPERSEDED'}">
                          {{ d.drawing_number }}
                        </span>
                        <span class="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono"
                          [ngClass]="{
                            'bg-primary/10 text-primary border border-primary/20': !d.is_superseded && d.status !== 'SUPERSEDED',
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20': d.is_superseded || d.status === 'SUPERSEDED'
                          }"
                        >
                          {{ d.revision_number }}
                        </span>
                      </div>
                      @if (d.is_superseded || d.status === 'SUPERSEDED') {
                        <div class="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">
                          OBSOLETE (SUPERSEDED)
                        </div>
                      }
                      @if (d.is_confidential) {
                        <div class="text-[9px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                          <span>Confidential</span>
                        </div>
                      }
                    </td>

                    <!-- 2. Document Title & Category -->
                    <td class="px-4 py-3 max-w-[240px]">
                      <div class="font-medium text-foreground line-clamp-1" [title]="d.drawing_title">
                        {{ d.drawing_title }}
                      </div>
                      <div class="text-[10px] text-muted-foreground mt-0.5 truncate" [title]="formatCategory(d.drawing_category_id)">
                        {{ formatCategory(d.drawing_category_id) }}
                      </div>
                      @if (d.revision_notes) {
                        <div class="text-[9px] text-muted-foreground/80 italic mt-0.5 truncate" [title]="d.revision_notes">
                          Notes: {{ d.revision_notes }}
                        </div>
                      }
                    </td>

                    <!-- 3. Discipline & Package -->
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border"
                        [ngClass]="getDisciplineBadgeClass(d.discipline)"
                      >
                        {{ d.discipline }}
                      </span>
                      @if (d.construction_package) {
                        <div class="text-[10px] text-muted-foreground mt-1 truncate max-w-[140px]" [title]="d.construction_package">
                          Pkg: {{ d.construction_package }}
                        </div>
                      }
                    </td>

                    <!-- 4. Spatial Scope -->
                    <td class="px-4 py-3 text-[11px]">
                      <div class="font-medium text-foreground">
                        {{ d.floor_level || 'Site Master' }}
                      </div>
                      <div class="text-[10px] text-muted-foreground">
                        {{ d.tower_name || d.project_name || 'Project #' + d.project_id }}
                      </div>
                    </td>

                    <!-- 5. Consultant / Author -->
                    <td class="px-4 py-3 text-[11px]">
                      <div class="font-medium text-foreground truncate max-w-[150px]" [title]="d.author || 'Internal Drafter'">
                        {{ d.author || 'Internal Drafter' }}
                      </div>
                      <div class="text-[10px] text-muted-foreground font-mono">
                        Iss: {{ d.issue_date ? (d.issue_date | slice:0:10) : '—' }}
                      </div>
                    </td>

                    <!-- 6. File & Format -->
                    <td class="px-4 py-3 font-mono text-[11px]">
                      <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                          [ngClass]="getFileTypeBadgeClass(d.file_type || 'PDF')"
                        >
                          {{ d.file_type || 'PDF' }}
                        </span>
                        <span class="text-[10px] text-muted-foreground">
                          {{ d.file_size_mb || 0 }} MB
                        </span>
                      </div>
                      <div class="text-[10px] text-muted-foreground font-sans mt-0.5 flex items-center gap-1">
                        <svg class="w-3 h-3 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        <span>{{ d.download_count }} downloads</span>
                      </div>
                    </td>

                    <!-- 7. IFC Status -->
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                        [ngClass]="getStatusBadgeClass(d.status, d.is_approved_for_construction, d.is_superseded)"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="getStatusDotClass(d.status, d.is_approved_for_construction, d.is_superseded)"></span>
                        {{ formatStatus(d.status, d.is_approved_for_construction, d.is_superseded) }}
                      </span>
                      @if (d.approved_by) {
                        <div class="text-[9px] text-muted-foreground mt-1 truncate max-w-[130px]" [title]="'Approved by ' + d.approved_by">
                          Vetted: {{ d.approved_by }}
                        </div>
                      }
                    </td>

                    <!-- 8. Actions -->
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <!-- Download / View Button -->
                        <button
                          type="button"
                          (click)="downloadDrawing(d)"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                          title="View / Download Drawing File"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                          </svg>
                        </button>

                        <!-- Edit Button -->
                        <a
                          [routerLink]="['/projects/drawings-documents/edit', d.id]"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-primary transition-colors"
                          title="Edit Drawing Record & Revision"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                        </a>

                        <!-- Delete Button -->
                        <button
                          type="button"
                          (click)="deleteDrawing(d)"
                          class="p-1.5 rounded-lg border border-border bg-secondary hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Delete Drawing Record"
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

        <!-- Pagination Controls -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-5 text-xs text-muted-foreground pt-4 border-t border-border">
          <div class="flex items-center gap-2">
            <span>Showing {{ paginationStart() }} to {{ paginationEnd() }} of {{ totalCount() }} drawings</span>
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

      <!-- Historical Audit & IFC Protocol Info Box -->
      <div class="p-4 rounded-xl bg-card border border-border flex items-start gap-3 shadow-2xs">
        <div class="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
        </div>
        <div class="text-xs space-y-1">
          <h4 class="font-bold text-foreground">Critical Control: Version Retention & Automated IFC Superseding</h4>
          <p class="text-muted-foreground leading-relaxed">
            When a new drawing revision is stamped as <em>Issued for Construction (IFC)</em>, all preceding revisions under that drawing number are instantly locked and marked as obsolete. Obsolete sheets remain permanently archived in this repository for statutory compliance, contractual variation reconciliation, and historical audit purposes.
          </p>
        </div>
      </div>
    </div>
  `
})
export class ProjectDrawingsDocumentsComponent implements OnInit {
  private projectService = inject(ProjectService);

  // Data signals
  drawings = signal<Drawing[]>([]);
  projects = signal<Project[]>([]);
  loading = signal<boolean>(false);
  seeding = signal<boolean>(false);

  // Aggregation signals
  totalCount = signal<number>(0);
  ifcCount = signal<number>(0);
  underReviewCount = signal<number>(0);
  supersededCount = signal<number>(0);
  asBuiltCount = signal<number>(0);
  confidentialCount = signal<number>(0);

  // Pagination parameters
  limit = 10;
  offset = signal<number>(0);

  // Filters
  selectedProjectId: any = null;
  selectedCategory: string = '';
  selectedDiscipline: string = '';
  selectedStatus: string = '';
  searchTerm: string = '';

  categoryFilterOptions: SelectOption[] = [
    { value: '', label: 'All Categories' },
    { value: 'CONCEPT_ARCHITECTURAL', label: '1. Concept & Architectural Drawings' },
    { value: 'STRUCTURAL_CALC', label: '2. Structural Drawings & Calculations' },
    { value: 'ELECTRICAL_PLUMBING', label: '3. Electrical & Plumbing Drawings (MEP)' },
    { value: 'HVAC_FIRE_SAFETY', label: '4. HVAC & Fire-Safety Plans' },
    { value: 'SOIL_SURVEY', label: '5. Soil Investigation & Survey Reports' },
    { value: 'BOQ_SPECIFICATIONS', label: '6. Bill of Quantities (BOQ) & Specs' },
    { value: 'CONSTRUCTION_SHOP', label: '7. Construction Drawings & Shop Drawings' },
    { value: 'AUTHORITY_APPROVED', label: '8. Approved Plans & Authority Correspondence' },
    { value: 'METHOD_INSPECTION', label: '9. Method Statements & Inspection Reports' },
    { value: 'CONTRACT_VARIATION', label: '10. Contractor Agreements & Variations' },
    { value: 'AS_BUILT_HANDOVER', label: '11. As-Built Drawings & Handover Set' }
  ];

  disciplineFilterOptions: SelectOption[] = [
    { value: '', label: 'All Disciplines' },
    { value: 'ARCHITECTURAL', label: 'Architectural' },
    { value: 'STRUCTURAL', label: 'Structural' },
    { value: 'ELECTRICAL', label: 'Electrical & Substation' },
    { value: 'PLUMBING', label: 'Plumbing & Drainage' },
    { value: 'HVAC', label: 'HVAC & Mechanical' },
    { value: 'FIRE_SAFETY', label: 'Fire Safety & Hydrant' },
    { value: 'CIVIL_SURVEY', label: 'Civil Survey & Soil Geotech' },
    { value: 'BOQ_SPEC', label: 'BOQ & Cost Specifications' },
    { value: 'CONTRACTUAL', label: 'Legal & Contractual' }
  ];

  statusFilterOptions: SelectOption[] = [
    { value: '', label: 'All Statuses' },
    { value: 'APPROVED_FOR_CONSTRUCTION', label: 'Approved for Construction (IFC Active)' },
    { value: 'UNDER_REVIEW', label: 'Under Technical Vetting' },
    { value: 'SUPERSEDED', label: 'Superseded (Obsolete)' },
    { value: 'DRAFT', label: 'Draft / In Progress' },
    { value: 'AS_BUILT', label: 'As-Built Certified' }
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

  currentPage = computed(() => Math.floor(this.offset() / this.limit) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.limit)));
  paginationStart = computed(() => (this.totalCount() === 0 ? 0 : this.offset() + 1));
  paginationEnd = computed(() => Math.min(this.offset() + this.limit, this.totalCount()));

  ngOnInit(): void {
    this.loadProjects();
    this.loadDrawings();
  }

  loadProjects(): void {
    this.projectService.getProjects().subscribe({
      next: (data) => this.projects.set(data || [])
    });
  }

  loadDrawings(): void {
    this.loading.set(true);
    const params: any = {
      limit: this.limit,
      offset: this.offset()
    };

    if (this.selectedProjectId) params.project_id = Number(this.selectedProjectId);
    if (this.selectedCategory) params.drawing_category_id = this.selectedCategory;
    if (this.selectedDiscipline) params.discipline = this.selectedDiscipline;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.searchTerm && this.searchTerm.trim()) params.search = this.searchTerm.trim();

    this.projectService.getDrawings(params).subscribe({
      next: (resp: DrawingPaginationResponse) => {
        this.loading.set(false);
        if (resp && resp.items !== undefined) {
          this.drawings.set(resp.items || []);
          this.totalCount.set(resp.total || 0);
          this.ifcCount.set(resp.ifc_count || 0);
          this.underReviewCount.set(resp.under_review_count || 0);
          this.supersededCount.set(resp.superseded_count || 0);
          this.asBuiltCount.set(resp.as_built_count || 0);
          this.confidentialCount.set(resp.confidential_count || 0);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.offset.set(0);
    this.loadDrawings();
  }

  onSearchInput(): void {
    this.offset.set(0);
    this.loadDrawings();
  }

  onLimitChange(): void {
    this.offset.set(0);
    this.loadDrawings();
  }

  prevPage(): void {
    if (this.offset() > 0) {
      this.offset.update(val => Math.max(0, val - this.limit));
      this.loadDrawings();
    }
  }

  nextPage(): void {
    if (this.offset() + this.limit < this.totalCount()) {
      this.offset.update(val => val + this.limit);
      this.loadDrawings();
    }
  }

  prePopulateStandardDrawings(): void {
    let pId = this.selectedProjectId ? Number(this.selectedProjectId) : null;
    if (!pId && this.projects().length > 0) {
      pId = this.projects()[0].id;
    }

    if (!pId) {
      alert('Please select or create a project first to seed standard engineering drawings.');
      return;
    }

    if (!confirm('Pre-populate standard 12 architectural, structural, MEP, BOQ and RAJUK drawings for this project?')) {
      return;
    }

    this.seeding.set(true);
    this.projectService.seedStandardDrawings(pId).subscribe({
      next: () => {
        this.seeding.set(false);
        this.loadDrawings();
      },
      error: (err) => {
        this.seeding.set(false);
        alert(err.error?.detail || 'Failed to seed standard drawings.');
      }
    });
  }

  downloadDrawing(d: Drawing): void {
    this.projectService.recordDrawingDownload(d.id).subscribe({
      next: (resp) => {
        d.download_count = resp.download_count;
        alert(`Downloaded file: ${d.file_name || d.drawing_number + '.' + (d.file_type || 'pdf').toLowerCase()} (Total downloads: ${d.download_count})`);
      }
    });
  }

  deleteDrawing(d: Drawing): void {
    if (!confirm(`Are you sure you want to delete drawing "${d.drawing_number} (${d.revision_number})"?`)) {
      return;
    }

    this.projectService.deleteDrawing(d.id).subscribe({
      next: () => {
        this.loadDrawings();
      },
      error: (err) => {
        alert(err.error?.detail || 'Failed to delete drawing.');
      }
    });
  }

  // Formatters & UI Badges
  formatCategory(cat: string): string {
    const map: Record<string, string> = {
      'CONCEPT_ARCHITECTURAL': 'Concept & Architectural',
      'STRUCTURAL_CALC': 'Structural Calculations',
      'ELECTRICAL_PLUMBING': 'Electrical & Plumbing (MEP)',
      'HVAC_FIRE_SAFETY': 'HVAC & Fire Safety',
      'SOIL_SURVEY': 'Soil Survey & Geotech',
      'BOQ_SPECIFICATIONS': 'BOQ & Specifications',
      'CONSTRUCTION_SHOP': 'Construction & Shop Drawing',
      'AUTHORITY_APPROVED': 'Authority Approved Sanction',
      'METHOD_INSPECTION': 'Method Statements & QA',
      'CONTRACT_VARIATION': 'Contracts & Variation Orders',
      'AS_BUILT_HANDOVER': 'As-Built Handover Set'
    };
    return map[cat] || cat;
  }

  formatStatus(status: string, isIfc: boolean, isSuperseded: boolean): string {
    if (isSuperseded || status === 'SUPERSEDED') return 'Superseded (Obsolete)';
    if (isIfc || status === 'APPROVED_FOR_CONSTRUCTION') return 'IFC Approved (Site Active)';
    if (status === 'UNDER_REVIEW') return 'Under Technical Review';
    if (status === 'AS_BUILT') return 'As-Built Certified';
    return 'Draft / Preliminary';
  }

  getStatusBadgeClass(status: string, isIfc: boolean, isSuperseded: boolean): string {
    if (isSuperseded || status === 'SUPERSEDED') {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (isIfc || status === 'APPROVED_FOR_CONSTRUCTION') {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    if (status === 'UNDER_REVIEW') {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
    if (status === 'AS_BUILT') {
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
    return 'bg-secondary text-muted-foreground border-border';
  }

  getStatusDotClass(status: string, isIfc: boolean, isSuperseded: boolean): string {
    if (isSuperseded || status === 'SUPERSEDED') return 'bg-amber-500';
    if (isIfc || status === 'APPROVED_FOR_CONSTRUCTION') return 'bg-emerald-500';
    if (status === 'UNDER_REVIEW') return 'bg-blue-500';
    if (status === 'AS_BUILT') return 'bg-purple-500';
    return 'bg-muted-foreground';
  }

  getDisciplineBadgeClass(discipline: string): string {
    switch (discipline) {
      case 'ARCHITECTURAL':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'STRUCTURAL':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'ELECTRICAL':
      case 'PLUMBING':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
      case 'FIRE_SAFETY':
      case 'HVAC':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'CIVIL_SURVEY':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'BOQ_SPEC':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      default:
        return 'bg-secondary text-foreground border-border';
    }
  }

  getFileTypeBadgeClass(fileType: string): string {
    switch (fileType.toUpperCase()) {
      case 'PDF':
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
      case 'DWG':
      case 'DXF':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'IFC':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'XLSX':
      case 'CSV':
        return 'bg-teal-500/10 text-teal-600 border border-teal-500/20';
      default:
        return 'bg-secondary text-muted-foreground border border-border';
    }
  }
}
