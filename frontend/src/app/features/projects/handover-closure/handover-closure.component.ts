import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { Project } from '../../../core/models/project.model';
import { ProjectNavComponent } from '../project-nav/project-nav.component';
import { CardContainerComponent, SearchableSelectComponent } from '../../../shared/components';

export interface HandoverRecord {
  id: number;
  project_id: number;
  project_name: string;
  unit_number: string;
  buyer_name: string;
  occupancy_cert_memo: string;
  snag_items_count: number;
  snags_resolved_count: number;
  keys_handed_over: boolean;
  handover_date: string;
  handover_status: 'INSPECTION_PENDING' | 'SNAG_RECTIFICATION' | 'READY_FOR_KEYS' | 'HANDED_OVER';
}

@Component({
  selector: 'app-project-handover-closure',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ProjectNavComponent,
    CardContainerComponent,
    SearchableSelectComponent
  ],
  template: `
    <div class="space-y-5">
      <app-project-nav activeCode="2.15"></app-project-nav>

      <!-- KPI Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Total Completed Units</p>
          <p class="text-xl font-bold font-display text-slate-900 dark:text-slate-100 mt-1">104 Flats</p>
          <p class="text-[10px] text-slate-400">Occupancy Certificate Received</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Handed Over to Buyers</p>
          <p class="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">{{ handedOverCount() }} Flats</p>
          <p class="text-[10px] text-slate-400">Keys & Deed Protocol Signed</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Snags Rectified Rate</p>
          <p class="text-xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">96.5%</p>
          <p class="text-[10px] text-slate-400">Quality Punch List Rectification</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <p class="text-[11px] font-semibold text-slate-500 uppercase">Maintenance Society</p>
          <p class="text-xl font-bold font-display text-purple-600 dark:text-purple-400 mt-1">Active</p>
          <p class="text-[10px] text-slate-400">Owners Association Handover</p>
        </div>
      </div>

      <!-- Main Container -->
      <app-card-container
        title="2.15 Project Handover & Formal Closure Register"
        subtitle="Occupancy certificates (RAJUK OC), flat pre-handover snag lists, utility transfer, and owners association handover"
        badge="Closure & Keys"
      >
        <div card-actions class="flex items-center gap-2">
          <button
            (click)="openAddModal()"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span>Record Unit Handover</span>
          </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              <tr>
                <th class="px-4 py-3">Unit Number & Project</th>
                <th class="px-4 py-3">Allotted Buyer</th>
                <th class="px-4 py-3">Occupancy Cert (OC)</th>
                <th class="px-4 py-3">Punch List / Snags</th>
                <th class="px-4 py-3">Handover Date</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              @for (h of handovers(); track h.id) {
                <tr class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td class="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    <span class="font-bold text-emerald-600 text-sm font-mono">{{ h.unit_number }}</span>
                    <div class="text-[11px] text-slate-500">{{ h.project_name }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-800 dark:text-slate-200">{{ h.buyer_name }}</div>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    <div class="text-blue-600 font-bold">{{ h.occupancy_cert_memo }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="font-medium">{{ h.snags_resolved_count }} of {{ h.snag_items_count }} Snags Resolved</div>
                    <div class="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden mt-1">
                      <div class="bg-emerald-500 h-full rounded-full" [style.width.%]="(h.snags_resolved_count / h.snag_items_count) * 100"></div>
                    </div>
                  </td>
                  <td class="px-4 py-3 font-mono">
                    {{ h.handover_date || 'Pending Final Protocol' }}
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      [ngClass]="{
                        'bg-emerald-50 text-emerald-700 border-emerald-200': h.handover_status === 'HANDED_OVER',
                        'bg-blue-50 text-blue-700 border-blue-200': h.handover_status === 'READY_FOR_KEYS',
                        'bg-amber-50 text-amber-700 border-amber-200': h.handover_status === 'SNAG_RECTIFICATION' || h.handover_status === 'INSPECTION_PENDING'
                      }"
                    >
                      {{ h.handover_status }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button (click)="toggleHandover(h)" class="text-emerald-600 hover:text-emerald-800 font-semibold text-xs">
                      {{ h.keys_handed_over ? 'View Protocol' : 'Handover Keys' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-card-container>

      <!-- Modal -->
      @if (isModalOpen()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">Record Flat Handover Protocol</h2>
            <form [formGroup]="handoverForm" (ngSubmit)="saveHandover()" class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Unit Number <span class="text-rose-500">*</span></label>
                  <input type="text" formControlName="unit_number" placeholder="e.g. Flat 12A" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Buyer / Allottee Name <span class="text-rose-500">*</span></label>
                  <input type="text" formControlName="buyer_name" placeholder="e.g. Dr. Salman Khan" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">RAJUK Occupancy Certificate (OC) Memo No.</label>
                <input type="text" formControlName="occupancy_cert_memo" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-blue-600" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold mb-1">Total Snags Identified</label>
                  <input type="number" formControlName="snag_items_count" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
                <div>
                  <label class="block text-xs font-semibold mb-1">Snags Resolved</label>
                  <input type="number" formControlName="snags_resolved_count" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-semibold mb-1">Handover Status</label>
                <select formControlName="handover_status" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold">
                  <option value="READY_FOR_KEYS">Ready for Keys Protocol</option>
                  <option value="HANDED_OVER">Keys Handed Over (Closed)</option>
                  <option value="SNAG_RECTIFICATION">Snag Rectification In Progress</option>
                </select>
              </div>
              <div class="flex items-center justify-end gap-2 pt-3">
                <button type="button" (click)="isModalOpen.set(false)" class="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">Cancel</button>
                <button type="submit" class="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-xs">Save Handover</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProjectHandoverClosureComponent implements OnInit {
  private projectService = inject(ProjectService);
  private fb = inject(FormBuilder);

  isModalOpen = signal<boolean>(false);

  handovers = signal<HandoverRecord[]>([
    {
      id: 1,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      unit_number: 'FLAT-11A',
      buyer_name: 'Barrister Rafiqul Haque',
      occupancy_cert_memo: 'RAJUK/OC/2026/889',
      snag_items_count: 5,
      snags_resolved_count: 5,
      keys_handed_over: true,
      handover_date: '2026-03-20',
      handover_status: 'HANDED_OVER'
    },
    {
      id: 2,
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      unit_number: 'FLAT-11B',
      buyer_name: 'Dr. Amina Begum',
      occupancy_cert_memo: 'RAJUK/OC/2026/889',
      snag_items_count: 4,
      snags_resolved_count: 4,
      keys_handed_over: false,
      handover_date: '',
      handover_status: 'READY_FOR_KEYS'
    }
  ]);

  handedOverCount = computed(() => this.handovers().filter(h => h.handover_status === 'HANDED_OVER').length);

  handoverForm: FormGroup = this.fb.group({
    unit_number: ['FLAT-12A', Validators.required],
    buyer_name: ['', Validators.required],
    occupancy_cert_memo: ['RAJUK/OC/2026/889'],
    snag_items_count: [3],
    snags_resolved_count: [3],
    handover_status: ['READY_FOR_KEYS']
  });

  ngOnInit(): void {}

  openAddModal(): void {
    this.handoverForm.reset({
      unit_number: 'FLAT-12B',
      buyer_name: '',
      occupancy_cert_memo: 'RAJUK/OC/2026/889',
      snag_items_count: 2,
      snags_resolved_count: 2,
      handover_status: 'READY_FOR_KEYS'
    });
    this.isModalOpen.set(true);
  }

  saveHandover(): void {
    if (this.handoverForm.invalid) return;
    const v = this.handoverForm.value;
    const newH: HandoverRecord = {
      id: Date.now(),
      project_id: 1,
      project_name: 'Green Valley Twin Towers',
      unit_number: v.unit_number,
      buyer_name: v.buyer_name,
      occupancy_cert_memo: v.occupancy_cert_memo,
      snag_items_count: Number(v.snag_items_count),
      snags_resolved_count: Number(v.snags_resolved_count),
      keys_handed_over: v.handover_status === 'HANDED_OVER',
      handover_date: v.handover_status === 'HANDED_OVER' ? new Date().toISOString().split('T')[0] : '',
      handover_status: v.handover_status
    };
    this.handovers.update(list => [newH, ...list]);
    this.isModalOpen.set(false);
  }

  toggleHandover(h: HandoverRecord): void {
    if (!h.keys_handed_over) {
      this.handovers.update(list => list.map(item => item.id === h.id ? {
        ...item,
        keys_handed_over: true,
        handover_status: 'HANDED_OVER',
        handover_date: new Date().toISOString().split('T')[0]
      } : item));
    }
  }
}
