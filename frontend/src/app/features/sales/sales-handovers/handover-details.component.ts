import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SalesService } from '../../../core/services/sales.service';
import {
  PropertyHandover,
  HandoverPrerequisiteItem,
  HandoverInspectionItem,
  HandoverSnagItem,
  PropertyHandoverUpdatePrerequisites,
  PropertyHandoverUpdateInspection,
  PropertyHandoverUpdateUtilities,
  PropertyHandoverIssueKeys,
  PropertyHandoverUpdateWarranties,
  PropertyHandoverLogSnag,
  PropertyHandoverResolveSnag,
  PropertyHandoverScheduleAppointment,
  PropertyHandoverExecutePossession
} from '../../../core/models/sales.model';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  SelectOption
} from '../../../shared/components';

@Component({
  selector: 'app-handover-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent
  ],
  templateUrl: './handover-details.component.html'
})
export class HandoverDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salesService = inject(SalesService);

  handoverId = signal<number>(0);
  handover = signal<PropertyHandover | null>(null);
  isLoading = signal<boolean>(true);
  isActionLoading = signal<boolean>(false);
  feedbackMessage = signal<string>('');
  errorMessage = signal<string>('');

  activeTab = signal<'prerequisites' | 'inspection' | 'snags' | 'utilities' | 'keys_warranties' | 'possession'>('prerequisites');

  // Prerequisite edit modal state
  isPrereqModalOpen = signal<boolean>(false);
  contractualStatus = signal<string>('VERIFIED');
  financialStatus = signal<string>('CLEARED');
  legalStatus = signal<string>('REGISTERED');

  // Inspection item edit
  selectedInspectionIndex = signal<number | null>(null);

  // Snag Log Modal State
  isLogSnagModalOpen = signal<boolean>(false);
  snagItemName = signal<string>('');
  snagRoomLocation = signal<string>('Living Room');
  snagDescription = signal<string>('');
  snagSeverity = signal<string>('MINOR');
  snagTargetDate = signal<string>('');

  // Snag Resolve Modal State
  isResolveSnagModalOpen = signal<boolean>(false);
  selectedSnagId = signal<string>('');
  snagResolutionNotes = signal<string>('');

  // Utilities Modal State
  isUtilitiesModalOpen = signal<boolean>(false);
  elecMeterNo = signal<string>('');
  elecReading = signal<string>('');
  elecProvider = signal<string>('DESCO');
  gasMeterNo = signal<string>('');
  gasReading = signal<string>('');
  gasProvider = signal<string>('TITAS_GAS');
  waterMeterNo = signal<string>('');
  waterReading = signal<string>('');
  waterConsumerId = signal<string>('DWASA');

  // Keys Modal State
  isKeysModalOpen = signal<boolean>(false);
  mainKeys = signal<number>(3);
  bedKeys = signal<number>(6);
  bathKeys = signal<number>(3);
  mailKeys = signal<number>(2);
  rfidCards = signal<number>(2);
  parkingTags = signal<number>(1);
  keyReceiver = signal<string>('');
  keyNotes = signal<string>('');

  // Warranties Modal State
  isWarrantiesModalOpen = signal<boolean>(false);
  liftWarranty = signal<boolean>(true);
  genWarranty = signal<boolean>(true);
  sanWarranty = signal<boolean>(true);
  elecWarranty = signal<boolean>(true);
  structWarranty = signal<boolean>(true);
  dlpMonths = signal<number>(12);
  warrantyNotes = signal<string>('');

  // Appointment Modal State
  isAppointmentModalOpen = signal<boolean>(false);
  appointmentDate = signal<string>('');
  appointmentTime = signal<string>('11:00 AM');
  staffName = signal<string>('');
  engineerName = signal<string>('');
  appointmentRemarks = signal<string>('');

  // Execute Possession Modal State
  isPossessionModalOpen = signal<boolean>(false);
  possessionDate = signal<string>(new Date().toISOString().substring(0, 10));
  possessionCertificateUrl = signal<string>('');
  possessionDeclarationNotes = signal<string>('Customer inspected unit, accepted keys, RFID cards, verified meter readings, and declared satisfactory condition.');

  severityOptions: SelectOption[] = [
    { label: 'Cosmetic / Surface Touch-up', value: 'COSMETIC' },
    { label: 'Minor Hardware / Fixture Adjustment', value: 'MINOR' },
    { label: 'Major Leakage / Tile / Alignment', value: 'MAJOR' },
    { label: 'Critical Electrical / Structural', value: 'CRITICAL' }
  ];

  utilityProviderOptions: SelectOption[] = [
    { label: 'DESCO (Dhaka Electric Supply)', value: 'DESCO' },
    { label: 'DPDC (Dhaka Power Distribution)', value: 'DPDC' },
    { label: 'BREB (Rural Electrification Board)', value: 'BREB' },
    { label: 'TITAS_GAS (Titas Gas T&D Co. Ltd.)', value: 'TITAS_GAS' },
    { label: 'DWASA (Dhaka WASA Water Supply)', value: 'DWASA' },
    { label: 'CENTRAL_LPG (Central Reticulated LPG)', value: 'CENTRAL_LPG' }
  ];

  contractualOptions: SelectOption[] = [
    { label: 'Pending Review', value: 'PENDING' },
    { label: 'Verified & Reconciled', value: 'VERIFIED' },
    { label: 'Contractual Obligation Waived', value: 'WAIVED' }
  ];

  financialOptions: SelectOption[] = [
    { label: 'Pending Clearance', value: 'PENDING' },
    { label: 'Full Payment Cleared (Zero Dues)', value: 'CLEARED' },
    { label: 'Outstanding Dues Remain', value: 'OUTSTANDING_DUES' }
  ];

  legalOptions: SelectOption[] = [
    { label: 'Pending Clearance', value: 'PENDING' },
    { label: 'Registered Deed Executed', value: 'REGISTERED' },
    { label: 'Deed Registration In-Transit', value: 'DEED_PENDING' }
  ];

  // Computed signals
  prerequisitesList = computed<HandoverPrerequisiteItem[]>(() => {
    return this.handover()?.prerequisites_checklist || [];
  });

  prerequisitesProgress = computed(() => {
    const list = this.prerequisitesList();
    if (list.length === 0) return { completed: 0, total: 8, percentage: 0 };
    const completed = list.filter(i => i.completed).length;
    const total = list.length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  });

  inspectionList = computed<HandoverInspectionItem[]>(() => {
    return this.handover()?.inspection_checklist || [];
  });

  inspectionProgress = computed(() => {
    const list = this.inspectionList();
    if (list.length === 0) return { passed: 0, total: 9, percentage: 0 };
    const passed = list.filter(i => i.status === 'PASSED').length;
    const total = list.length;
    return { passed, total, percentage: Math.round((passed / total) * 100) };
  });

  openSnags = computed<HandoverSnagItem[]>(() => {
    const items = this.handover()?.snag_items || [];
    return items.filter(s => s.status === 'OPEN');
  });

  resolvedSnags = computed<HandoverSnagItem[]>(() => {
    const items = this.handover()?.snag_items || [];
    return items.filter(s => s.status === 'RESOLVED');
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.handoverId.set(id);
      this.loadDossier();
    }
  }

  loadDossier(): void {
    this.isLoading.set(true);
    this.salesService.getHandoverDossier(this.handoverId()).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.contractualStatus.set(res.contractual_completion_status || 'VERIFIED');
        this.financialStatus.set(res.financial_clearance_status || 'CLEARED');
        this.legalStatus.set(res.legal_registration_status || 'REGISTERED');

        this.elecMeterNo.set(res.electricity_meter_no || '');
        this.elecReading.set(res.electricity_meter_reading || '');
        this.elecProvider.set(res.electricity_provider || 'DESCO');

        this.gasMeterNo.set(res.gas_meter_no || '');
        this.gasReading.set(res.gas_meter_reading || '');
        this.gasProvider.set(res.gas_provider || 'TITAS_GAS');

        this.waterMeterNo.set(res.water_meter_no || '');
        this.waterReading.set(res.water_meter_reading || '');
        this.waterConsumerId.set(res.water_consumer_id || 'DWASA');

        if (res.keys_issued_json) {
          this.mainKeys.set(res.keys_issued_json.main_door_keys || 3);
          this.bedKeys.set(res.keys_issued_json.bedroom_keys || 6);
          this.bathKeys.set(res.keys_issued_json.bathroom_keys || 3);
          this.mailKeys.set(res.keys_issued_json.mailbox_key || 2);
          this.rfidCards.set(res.keys_issued_json.rfid_access_cards || 2);
          this.parkingTags.set(res.keys_issued_json.parking_rfid_tags || 1);
          this.keyReceiver.set(res.keys_issued_json.receiver_name || res.customer_name || '');
          this.keyNotes.set(res.keys_issued_json.notes || '');
        }

        if (res.warranty_documents_json) {
          this.liftWarranty.set(res.warranty_documents_json.lift_warranty ?? true);
          this.genWarranty.set(res.warranty_documents_json.generator_warranty ?? true);
          this.sanWarranty.set(res.warranty_documents_json.sanitary_warranty ?? true);
          this.elecWarranty.set(res.warranty_documents_json.electrical_warranty ?? true);
          this.structWarranty.set(res.warranty_documents_json.structural_warranty ?? true);
          this.dlpMonths.set(res.warranty_documents_json.dlp_months || 12);
          this.warrantyNotes.set(res.warranty_documents_json.warranty_provider_notes || '');
        }

        this.staffName.set(res.responsible_staff_name || '');
        this.engineerName.set(res.responsible_engineer_name || '');
        this.appointmentDate.set(res.appointment_date || '');
        this.appointmentTime.set(res.appointment_time || '11:00 AM');

        this.isLoading.set(false);
      },
      error: (err: any) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to load property handover dossier.');
      }
    });
  }

  // --- Prerequisite Toggle & Update ---
  togglePrerequisite(step: HandoverPrerequisiteItem): void {
    const list = [...this.prerequisitesList()];
    const item = list.find(i => i.step_number === step.step_number);
    if (!item) return;

    item.completed = !item.completed;
    item.completion_date = item.completed ? new Date().toISOString().substring(0, 10) : null;
    item.verified_by = item.completed ? (this.handover()?.responsible_staff_name || 'Handover Officer') : null;

    this.savePrerequisites(list);
  }

  savePrerequisites(list: HandoverPrerequisiteItem[]): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverUpdatePrerequisites = {
      prerequisites_checklist: list,
      contractual_completion_status: this.contractualStatus(),
      financial_clearance_status: this.financialStatus(),
      legal_registration_status: this.legalStatus()
    };

    this.salesService.updateHandoverPrerequisites(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isPrereqModalOpen.set(false);
        this.showFeedback('Prerequisites & compliance statuses updated successfully.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update prerequisites.');
      }
    });
  }

  // --- Inspection Item Status Cycle ---
  cycleInspectionStatus(index: number): void {
    const list = [...this.inspectionList()];
    if (!list[index]) return;

    const current = list[index].status;
    let nextStatus: 'PENDING' | 'PASSED' | 'DEFECT_NOTED' = 'PASSED';
    if (current === 'PENDING') nextStatus = 'PASSED';
    else if (current === 'PASSED') nextStatus = 'DEFECT_NOTED';
    else nextStatus = 'PENDING';

    list[index].status = nextStatus;

    this.isActionLoading.set(true);
    const payload: PropertyHandoverUpdateInspection = {
      inspection_checklist: list
    };

    this.salesService.updateHandoverInspection(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.showFeedback(`Inspection status for ${list[index].item} marked as ${nextStatus}.`);
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update inspection checklist.');
      }
    });
  }

  // --- Utilities Save ---
  saveUtilities(): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverUpdateUtilities = {
      electricity_meter_no: this.elecMeterNo() || null,
      electricity_meter_reading: this.elecReading() || null,
      electricity_provider: this.elecProvider() || 'DESCO',
      gas_meter_no: this.gasMeterNo() || null,
      gas_meter_reading: this.gasReading() || null,
      gas_provider: this.gasProvider() || 'TITAS_GAS',
      water_meter_no: this.waterMeterNo() || null,
      water_meter_reading: this.waterReading() || null,
      water_consumer_id: this.waterConsumerId() || 'DWASA'
    };

    this.salesService.updateHandoverUtilities(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isUtilitiesModalOpen.set(false);
        this.showFeedback('Utility meters and initial consumption readings recorded.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update utilities.');
      }
    });
  }

  // --- Keys Save ---
  saveKeys(): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverIssueKeys = {
      main_door_keys: Number(this.mainKeys() || 0),
      bedroom_keys: Number(this.bedKeys() || 0),
      bathroom_keys: Number(this.bathKeys() || 0),
      mailbox_key: Number(this.mailKeys() || 0),
      rfid_access_cards: Number(this.rfidCards() || 0),
      parking_rfid_tags: Number(this.parkingTags() || 0),
      receiver_name: this.keyReceiver() || this.handover()?.customer_name || 'Allottee Buyer',
      notes: this.keyNotes() || null
    };

    this.salesService.issueHandoverKeys(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isKeysModalOpen.set(false);
        this.showFeedback('Keys and RFID smart access credentials recorded.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to record key issuance.');
      }
    });
  }

  // --- Warranties Save ---
  saveWarranties(): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverUpdateWarranties = {
      lift_warranty: this.liftWarranty(),
      generator_warranty: this.genWarranty(),
      sanitary_warranty: this.sanWarranty(),
      electrical_warranty: this.elecWarranty(),
      structural_warranty: this.structWarranty(),
      dlp_months: Number(this.dlpMonths() || 12),
      warranty_provider_notes: this.warrantyNotes() || null
    };

    this.salesService.updateHandoverWarranties(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isWarrantiesModalOpen.set(false);
        this.showFeedback('Warranty cards and DLP period saved.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to update warranties.');
      }
    });
  }

  // --- Snags Handlers ---
  openLogSnagModal(): void {
    this.snagItemName.set('');
    this.snagRoomLocation.set('Living Room');
    this.snagDescription.set('');
    this.snagSeverity.set('MINOR');
    this.snagTargetDate.set('');
    this.isLogSnagModalOpen.set(true);
  }

  saveSnag(): void {
    if (!this.snagItemName() || !this.snagDescription()) {
      this.errorMessage.set('Please provide both the item name and defect description.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: PropertyHandoverLogSnag = {
      item_name: this.snagItemName(),
      room_location: this.snagRoomLocation(),
      defect_description: this.snagDescription(),
      severity: this.snagSeverity(),
      target_rectification_date: this.snagTargetDate() || null
    };

    this.salesService.logHandoverSnag(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isLogSnagModalOpen.set(false);
        this.showFeedback('Defect / snagging item logged with rectification timeline.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to log snag item.');
      }
    });
  }

  openResolveSnagModal(snagId: string): void {
    this.selectedSnagId.set(snagId);
    this.snagResolutionNotes.set('');
    this.isResolveSnagModalOpen.set(true);
  }

  saveResolveSnag(): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverResolveSnag = {
      snag_id: this.selectedSnagId(),
      rectification_notes: this.snagResolutionNotes() || 'Rectified and approved by site engineer.'
    };

    this.salesService.resolveHandoverSnag(this.handoverId(), this.selectedSnagId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isResolveSnagModalOpen.set(false);
        this.showFeedback('Snag item resolved and verified.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to resolve snag item.');
      }
    });
  }

  // --- Appointment Handlers ---
  saveAppointment(): void {
    if (!this.appointmentDate()) {
      this.errorMessage.set('Please select an appointment date.');
      return;
    }

    this.isActionLoading.set(true);
    const payload: PropertyHandoverScheduleAppointment = {
      appointment_date: this.appointmentDate(),
      appointment_time: this.appointmentTime() || undefined,
      responsible_staff_name: this.staffName() || undefined,
      responsible_engineer_name: this.engineerName() || undefined,
      remarks: this.appointmentRemarks() || undefined
    };

    this.salesService.scheduleHandoverAppointment(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isAppointmentModalOpen.set(false);
        this.showFeedback('Walkthrough and inspection appointment scheduled.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to schedule appointment.');
      }
    });
  }

  // --- Final Possession Execution Handlers ---
  savePossession(): void {
    this.isActionLoading.set(true);
    const payload: PropertyHandoverExecutePossession = {
      handover_date: this.possessionDate(),
      customer_acknowledged: true,
      customer_declaration_notes: this.possessionDeclarationNotes(),
      possession_certificate_url: this.possessionCertificateUrl() || null,
      dlp_months: 12,
      remarks: 'Full physical possession handed over. Certificate issued and booking updated to 10_HANDOVER_COMPLETE.'
    };

    this.salesService.executeHandoverPossession(this.handoverId(), payload).subscribe({
      next: (res: PropertyHandover) => {
        this.handover.set(res);
        this.isActionLoading.set(false);
        this.isPossessionModalOpen.set(false);
        this.showFeedback('Physical possession successfully handed over. Handover certificate generated.');
      },
      error: (err: any) => {
        this.isActionLoading.set(false);
        this.errorMessage.set(err?.error?.detail || 'Failed to execute possession.');
      }
    });
  }

  showFeedback(msg: string): void {
    this.feedbackMessage.set(msg);
    setTimeout(() => this.feedbackMessage.set(''), 6000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
      case 'POSSESSION_HANDED_OVER':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'READY_FOR_HANDOVER':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'INSPECTION_SCHEDULED':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'SNAGGING_IN_PROGRESS':
      case 'RECTIFICATION_PENDING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'PREREQUISITES_IN_REVIEW':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getPossessionBadgeClass(possession: string): string {
    switch (possession) {
      case 'FULL_PHYSICAL_POSSESSION':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold';
      case 'CONDITIONAL_FITOUT':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }

  getSeverityBadgeClass(sev: string): string {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 font-bold';
      case 'MAJOR':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 font-semibold';
      case 'MINOR':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  }
}
