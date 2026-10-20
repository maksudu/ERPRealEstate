import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LandService } from '../../../core/services/land.service';
import {
  LandNegotiation,
  NegotiationMeeting,
  NegotiationTermVersion,
  NegotiationTermsApprovalRequest,
  NegotiationOfferRevisionRequest,
  NegotiationAlertsResponse,
  LandParcel,
  Landowner
} from '../../../core/models/land.model';
import { CardContainerComponent } from '../../../shared/components/card-container/card-container.component';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { CustomInputComponent } from '../../../shared/components/custom-input/custom-input.component';
import { CustomTextareaComponent } from '../../../shared/components/custom-textarea/custom-textarea.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { StatusBadgeComponent, StatusVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-negotiation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    SearchableSelectComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './negotiation.component.html',
  styleUrls: []
})
export class NegotiationComponent implements OnInit {
  private landService = inject(LandService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  activeTab: 'deals' | 'versions' | 'meetings' | 'alerts' = 'deals';

  // Master Data
  negotiations: LandNegotiation[] = [];
  parcels: LandParcel[] = [];
  landowners: Landowner[] = [];
  parcelOptions: { value: any; label: string; subLabel?: string }[] = [];
  landownerOptions: { value: any; label: string; subLabel?: string }[] = [];

  stageOptions: SelectOption[] = [
    { value: 'INITIAL_OFFER', label: '1. Initial Offer (প্রাথমিক প্রস্তাব)' },
    { value: 'LANDOWNER_COUNTER', label: '2. Landowner Counteroffer (মালিকের পাল্টা প্রস্তাব)' },
    { value: 'MANAGEMENT_REVIEW', label: '3. Management Review (ব্যবস্থাপনা পর্যালোচনা)' },
    { value: 'REVISED_OFFER', label: '4. Revised Offer (সংশোধিত প্রস্তাব)' },
    { value: 'FINAL_TERMS_AGREED', label: '5. Final Terms Agreed (চূড়ান্ত শর্তাবলী সম্পন্ন)' }
  ];

  statusOptions: SelectOption[] = [
    { value: 'DRAFTING', label: 'Drafting (খসড়া চুক্তি)' },
    { value: 'LEGAL_VETTING', label: 'Legal Vetting (আইনি যাচাইকরণ)' },
    { value: 'MANAGEMENT_APPROVED', label: 'Management Approved (ব্যবস্থাপনা অনুমোদিত)' },
    { value: 'EXECUTED_REGISTERED', label: 'Executed & Registered (চুক্তি সম্পাদিত ও নিবন্ধিত)' },
    { value: 'TERMINATED', label: 'Terminated / Cancelled (বাতিলকৃত)' },
    { value: 'EXPIRED', label: 'Expired (মেয়াদোত্তীর্ণ)' }
  ];

  // Selected Negotiation for Deep Dive
  activeNegotiation: LandNegotiation | null = null;
  selectedNegotiationIdForVersions: number | null = null;
  selectedNegotiationIdForMeetings: number | null = null;

  // Alerts Data
  alertsData: NegotiationAlertsResponse | null = null;
  isLoadingAlerts = false;

  // Filters & Pagination for Deals Table
  searchTerm = '';
  selectedParcelFilter: string = '';
  selectedStageFilter: string = '';
  selectedStatusFilter: string = '';
  onlyDelayedFilter = false;
  currentPage = 1;
  pageSize = 10;
  isLoading = false;

  // Modals for deep-dive actions (Revisions, Meetings, Approvals)
  isReviseTermsModalOpen = false;
  isMeetingModalOpen = false;
  isApproveModalOpen = false;
  isSubmitting = false;

  revisionFormData: NegotiationOfferRevisionRequest = {
    offered_by_party: 'DEVELOPER',
    proposed_price_bdt: 0,
    proposed_advance_bdt: 0,
    proposed_timeline_days: 30,
    revision_summary: '',
    created_by_officer: 'Commercial Acquisition Lead'
  };

  meetingFormData: any = {
    meeting_date: new Date().toISOString().substring(0, 10),
    meeting_venue: 'Developer Head Office Conference Room',
    developer_attendees: '',
    landowner_attendees: '',
    discussion_minutes: '',
    follow_up_tasks: '',
    next_meeting_date: null
  };

  approvalFormData: NegotiationTermsApprovalRequest = {
    approved_by: 'Managing Director / Commercial Board',
    final_agreed_amount_bdt: 0,
    approval_notes: ''
  };

  ngOnInit(): void {
    this.loadParcels();
    this.loadLandowners();
    this.loadNegotiations();
    this.loadAlerts();
  }

  // --- Data Loading ---
  loadParcels(): void {
    this.landService.getParcels().subscribe({
      next: (res) => {
        this.parcels = Array.isArray(res) ? res : (res as any).items || [];
        this.parcelOptions = this.parcels.map(p => ({
          value: p.id,
          label: `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || 'Land'} (${p.total_area_decimal || 0} Dec)`
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading parcels', err)
    });
  }

  loadLandowners(): void {
    this.landService.getLandowners().subscribe({
      next: (res) => {
        this.landowners = Array.isArray(res) ? res : [];
        this.landownerOptions = this.landowners.map(l => ({
          value: l.id,
          label: `${l.landowner_code} - ${l.full_name_en} (${l.phone_number || 'No Phone'})`
        }));
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading landowners', err)
    });
  }

  loadNegotiations(): void {
    this.isLoading = true;
    const skip = (this.currentPage - 1) * this.pageSize;
    const params: any = {
      skip,
      limit: this.pageSize
    };
    if (this.searchTerm) params.search = this.searchTerm;
    if (this.selectedParcelFilter) params.parcel_id = this.selectedParcelFilter;
    if (this.selectedStageFilter) params.negotiation_stage = this.selectedStageFilter;
    if (this.selectedStatusFilter) params.agreement_status = this.selectedStatusFilter;
    if (this.onlyDelayedFilter) params.is_delayed = true;

    this.landService.getNegotiations(params).subscribe({
      next: (res) => {
        this.negotiations = Array.isArray(res) ? res : [];
        if (this.negotiations.length > 0 && !this.activeNegotiation) {
          this.activeNegotiation = this.negotiations[0];
          this.selectedNegotiationIdForVersions = this.negotiations[0].id;
          this.selectedNegotiationIdForMeetings = this.negotiations[0].id;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading negotiations', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadAlerts(): void {
    this.isLoadingAlerts = true;
    this.landService.getNegotiationAlerts().subscribe({
      next: (res) => {
        this.alertsData = res;
        this.isLoadingAlerts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading negotiation alerts', err);
        this.isLoadingAlerts = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- Tab Selection ---
  selectTab(tab: 'deals' | 'versions' | 'meetings' | 'alerts'): void {
    this.activeTab = tab;
    if (tab === 'alerts') {
      this.loadAlerts();
    }
  }

  // --- Filtering & Pagination ---
  applyFilters(): void {
    this.currentPage = 1;
    this.loadNegotiations();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedParcelFilter = '';
    this.selectedStageFilter = '';
    this.selectedStatusFilter = '';
    this.onlyDelayedFilter = false;
    this.currentPage = 1;
    this.loadNegotiations();
  }

  nextPage(): void {
    this.currentPage++;
    this.loadNegotiations();
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadNegotiations();
    }
  }

  // --- Negotiation Selection for Detail View ---
  selectNegotiation(neg: LandNegotiation): void {
    this.activeNegotiation = neg;
    this.selectedNegotiationIdForVersions = neg.id;
    this.selectedNegotiationIdForMeetings = neg.id;
  }

  onVersionNegotiationChange(): void {
    if (this.selectedNegotiationIdForVersions) {
      const found = this.negotiations.find(n => n.id === Number(this.selectedNegotiationIdForVersions));
      if (found) this.activeNegotiation = found;
    }
  }

  onMeetingNegotiationChange(): void {
    if (this.selectedNegotiationIdForMeetings) {
      const found = this.negotiations.find(n => n.id === Number(this.selectedNegotiationIdForMeetings));
      if (found) this.activeNegotiation = found;
    }
  }

  // --- Navigation & Filters ---
  navigateToCreate(): void {
    this.router.navigate(['/land/negotiation/create']);
  }

  navigateToEdit(neg: LandNegotiation): void {
    this.router.navigate(['/land/negotiation', neg.id, 'edit']);
  }

  onParcelFilterChange(event: any): void {
    const val = event?.value ?? event?.id ?? (typeof event === 'string' ? event : '');
    this.selectedParcelFilter = val !== null && val !== undefined ? String(val) : '';
    this.applyFilters();
  }

  onStageFilterChange(event: any): void {
    const val = event?.value || event?.item_code || (typeof event === 'string' ? event : '');
    this.selectedStageFilter = val || '';
    this.applyFilters();
  }

  onStatusFilterChange(event: any): void {
    const val = event?.value || event?.item_code || (typeof event === 'string' ? event : '');
    this.selectedStatusFilter = val || '';
    this.applyFilters();
  }

  deleteNegotiation(id: number): void {
    if (confirm('Are you sure you want to delete this negotiation register and all its commercial revisions and meeting records?')) {
      this.landService.deleteNegotiation(id).subscribe({
        next: () => {
          if (this.activeNegotiation?.id === id) {
            this.activeNegotiation = null;
          }
          this.loadNegotiations();
          this.loadAlerts();
        },
        error: (err) => {
          console.error('Error deleting negotiation', err);
          alert('Failed to delete negotiation');
        }
      });
    }
  }

  // --- Revise Commercial Terms Modal ---
  openReviseTermsModal(neg: LandNegotiation): void {
    this.activeNegotiation = neg;
    const defaultProposed = neg.current_offer_amount_bdt || neg.developer_target_price_bdt || 0;
    this.revisionFormData = {
      offered_by_party: 'DEVELOPER',
      proposed_price_bdt: defaultProposed,
      proposed_advance_bdt: neg.proposed_advance_bdt || 0,
      proposed_timeline_days: 30,
      revision_summary: '',
      created_by_officer: 'Commercial Deal Lead'
    };
    this.isReviseTermsModalOpen = true;
  }

  saveTermRevision(): void {
    if (!this.activeNegotiation) return;
    if (!this.revisionFormData.proposed_price_bdt || this.revisionFormData.proposed_price_bdt <= 0) {
      alert('Please specify a valid proposed price.');
      return;
    }
    if (!this.revisionFormData.revision_summary) {
      alert('Please provide a revision summary explaining the reason for this commercial update.');
      return;
    }

    this.isSubmitting = true;
    this.landService.reviseNegotiationTerms(this.activeNegotiation.id, this.revisionFormData).subscribe({
      next: (res) => {
        this.activeNegotiation = res;
        this.isSubmitting = false;
        this.isReviseTermsModalOpen = false;
        this.loadNegotiations();
      },
      error: (err) => {
        console.error('Error revising terms', err);
        alert('Failed to submit commercial revision');
        this.isSubmitting = false;
      }
    });
  }

  // --- Meeting Minutes Modal ---
  openMeetingModal(neg: LandNegotiation): void {
    this.activeNegotiation = neg;
    this.meetingFormData = {
      meeting_date: new Date().toISOString().substring(0, 10),
      meeting_venue: 'Developer Head Office Boardroom',
      developer_attendees: 'Land Acquisition Director, Legal Counsel, Project Lead',
      landowner_attendees: this.getLandownerName(neg.landowner_id) || 'Primary Landowner & Legal Representative',
      discussion_minutes: '',
      follow_up_tasks: 'Draft revised payment timeline, request mutation porcha copy',
      next_meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    };
    this.isMeetingModalOpen = true;
  }

  saveMeeting(): void {
    if (!this.activeNegotiation) return;
    if (!this.meetingFormData.discussion_minutes) {
      alert('Please provide the discussion minutes of the meeting.');
      return;
    }

    this.isSubmitting = true;
    this.landService.createNegotiationMeeting(this.activeNegotiation.id, this.meetingFormData).subscribe({
      next: (res) => {
        if (!this.activeNegotiation!.meetings) {
          this.activeNegotiation!.meetings = [];
        }
        this.activeNegotiation!.meetings.unshift(res);
        this.isSubmitting = false;
        this.isMeetingModalOpen = false;
        this.loadNegotiations();
      },
      error: (err) => {
        console.error('Error logging meeting', err);
        alert('Failed to record meeting minutes');
        this.isSubmitting = false;
      }
    });
  }

  deleteMeeting(meetingId: number): void {
    if (!this.activeNegotiation) return;
    if (confirm('Delete this meeting entry?')) {
      this.landService.deleteNegotiationMeeting(this.activeNegotiation.id, meetingId).subscribe({
        next: () => {
          this.activeNegotiation!.meetings = this.activeNegotiation!.meetings.filter(m => m.id !== meetingId);
          this.loadNegotiations();
        },
        error: (err) => {
          console.error('Error deleting meeting', err);
          alert('Failed to delete meeting');
        }
      });
    }
  }

  // --- Authorized Commercial Approval Modal ---
  openApproveModal(neg: LandNegotiation): void {
    this.activeNegotiation = neg;
    const finalAmount = neg.final_agreed_amount_bdt > 0 ? neg.final_agreed_amount_bdt : neg.current_offer_amount_bdt;
    this.approvalFormData = {
      approved_by: 'Authorized Commercial Officer / Board',
      final_agreed_amount_bdt: finalAmount,
      approval_notes: 'Terms verified against valuation report and approved for execution.'
    };
    this.isApproveModalOpen = true;
  }

  saveApproval(): void {
    if (!this.activeNegotiation) return;
    if (!this.approvalFormData.approved_by) {
      alert('Please provide authorized approver name.');
      return;
    }

    this.isSubmitting = true;
    this.landService.approveNegotiationTerms(this.activeNegotiation.id, this.approvalFormData).subscribe({
      next: (res) => {
        this.activeNegotiation = res;
        this.isSubmitting = false;
        this.isApproveModalOpen = false;
        this.loadNegotiations();
        this.loadAlerts();
      },
      error: (err) => {
        console.error('Error approving terms', err);
        alert('Failed to approve commercial terms');
        this.isSubmitting = false;
      }
    });
  }

  // --- Helper & Metric Functions ---
  getTotalActiveNegotiations(): number {
    return this.negotiations.filter(n => n.agreement_status !== 'TERMINATED' && n.agreement_status !== 'EXPIRED').length;
  }

  getTotalAgreedDeals(): number {
    return this.negotiations.filter(n => n.negotiation_stage === 'FINAL_TERMS_AGREED' || n.agreement_status === 'EXECUTED_REGISTERED').length;
  }

  getTotalDelayedDeals(): number {
    return this.alertsData?.total_delayed || this.negotiations.filter(n => n.is_delayed).length;
  }

  getTotalExpiringAgreements(): number {
    return this.alertsData?.total_expiring || 0;
  }

  getParcelName(parcelId: number): string {
    const p = this.parcels.find(x => x.id === parcelId);
    return p ? `${p.parcel_id || 'Parcel #' + p.id} - ${p.project_name || p.mouza_name || ''}` : `Parcel #${parcelId}`;
  }

  getLandownerName(landownerId?: number | null): string {
    if (!landownerId) return 'Not Assigned';
    const l = this.landowners.find(x => x.id === landownerId);
    return l ? `${l.full_name_en} (${l.landowner_code})` : `Landowner #${landownerId}`;
  }

  getStatusVariant(status: string): StatusVariant {
    switch (status) {
      case 'FINAL_TERMS_AGREED':
      case 'EXECUTED_REGISTERED':
      case 'APPROVED':
      case 'BOARD_APPROVED':
        return 'success';
      case 'READY_FOR_EXECUTION':
      case 'MANAGEMENT_REVIEW':
      case 'COUNTER_OFFER':
      case 'DUE_DILIGENCE_REVIEW':
        return 'warning';
      case 'TERMINATED':
      case 'EXPIRED':
      case 'DELAYED':
        return 'danger';
      case 'DRAFTING':
      case 'LEGAL_VETTING':
      case 'INITIAL_OFFER':
        return 'info';
      default:
        return 'neutral';
    }
  }

  getOfferBadgeVariant(party: string): StatusVariant {
    switch (party?.toUpperCase()) {
      case 'DEVELOPER':
        return 'info';
      case 'LANDOWNER':
        return 'warning';
      case 'BOARD_APPROVED':
        return 'success';
      case 'MEDIATOR':
        return 'purple';
      default:
        return 'neutral';
    }
  }
}
