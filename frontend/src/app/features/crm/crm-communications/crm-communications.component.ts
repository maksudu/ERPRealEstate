import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  CardContainerComponent,
  CustomInputComponent,
  CustomTextareaComponent,
  CustomButtonComponent,
  SearchableSelectComponent,
  ModalComponent,
  StatusBadgeComponent
} from '../../../shared/components';
import { CrmService, CommunicationFilters } from '../../../core/services/crm.service';
import { Customer, Lead, CommunicationHistory, CustomerTimelineItem } from '../../../core/models/crm.model';

@Component({
  selector: 'app-crm-communications',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    CardContainerComponent,
    CustomInputComponent,
    CustomTextareaComponent,
    CustomButtonComponent,
    SearchableSelectComponent,
    ModalComponent,
    StatusBadgeComponent
  ],
  templateUrl: './crm-communications.component.html'
})
export class CrmCommunicationsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crmService = inject(CrmService);
  private destroyRef = inject(DestroyRef);
  readonly Math = Math;

  // Dynamic Lookup Category Codes (Spec 4.9 & Rule 1)
  readonly LOOKUP = {
    channel: 'CRM_COMMUNICATION_CHANNEL',
    deliveryStatus: 'CRM_DELIVERY_STATUS'
  };

  // State Signals
  communications = signal<CommunicationHistory[]>([]);
  timelineItems = signal<CustomerTimelineItem[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(15);
  isLoading = signal<boolean>(false);
  isLoadingTimeline = signal<boolean>(false);

  // Active View: 'timeline' | 'table'
  activeView = signal<'timeline' | 'table'>('timeline');

  // Customer & Lead Selectors for Timeline
  selectedContactType = signal<'customer' | 'lead'>('lead');
  selectedContactId = signal<number | null>(null);

  customers = signal<Customer[]>([]);
  customerOptions = computed(() =>
    this.customers().map(c => ({
      label: `${c.full_name_en} (${c.customer_code} - ${c.primary_phone})`,
      value: c.id
    }))
  );

  leads = signal<Lead[]>([]);
  leadOptions = computed(() =>
    this.leads().map(l => ({
      label: `${l.lead_name} (${l.primary_phone})`,
      value: l.id
    }))
  );

  // Filter Form
  filterForm: FormGroup = this.fb.group({
    search: [''],
    channel: [''],
    direction: [''],
    delivery_status: ['']
  });

  // Log Interaction Modal State
  isLogModalOpen = signal<boolean>(false);
  isLogging = signal<boolean>(false);

  logForm: FormGroup = this.fb.group({
    target_type: ['lead'],
    lead_id: [null],
    customer_id: [null],
    channel: ['PHONE_CALL', Validators.required],
    direction: ['OUTBOUND', Validators.required],
    subject: ['', Validators.required],
    message_body: ['', Validators.required],
    delivery_status: ['DELIVERED'],
    is_sensitive: [false],
    is_automated: [false],
    resulting_action: ['']
  });

  ngOnInit(): void {
    this.loadCustomers();
    this.loadLeads();
    this.loadCommunications();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadCommunications();
      });
  }

  loadCustomers(): void {
    this.crmService.getCustomers().subscribe({
      next: (res: Customer[]) => this.customers.set(res || []),
      error: err => console.error('Error loading customers', err)
    });
  }

  loadLeads(): void {
    this.crmService.getLeads().subscribe({
      next: (res: Lead[]) => {
        this.leads.set(res || []);
        if (res.length > 0 && !this.selectedContactId()) {
          this.selectedContactType.set('lead');
          this.selectedContactId.set(res[0].id);
          this.loadTimeline();
        }
      },
      error: err => console.error('Error loading leads', err)
    });
  }

  loadCommunications(): void {
    this.isLoading.set(true);
    const formVals = this.filterForm.value;

    const filters: CommunicationFilters = {
      search: formVals.search || undefined,
      channel: formVals.channel || undefined,
      direction: formVals.direction || undefined,
      delivery_status: formVals.delivery_status || undefined,
      page: this.page(),
      limit: this.limit()
    };

    this.crmService.getCommunications(filters).subscribe({
      next: res => {
        this.communications.set(res.items);
        this.total.set(res.total);
        this.isLoading.set(false);
      },
      error: err => {
        console.error('Error loading communications', err);
        this.isLoading.set(false);
      }
    });
  }

  loadTimeline(): void {
    const contactId = this.selectedContactId();
    if (!contactId) return;

    this.isLoadingTimeline.set(true);
    const isCustomer = this.selectedContactType() === 'customer';

    this.crmService
      .getCustomerTimeline(isCustomer ? undefined : contactId, isCustomer ? contactId : undefined)
      .subscribe({
        next: items => {
          this.timelineItems.set(items);
          this.isLoadingTimeline.set(false);
        },
        error: err => {
          console.error('Error loading timeline', err);
          this.isLoadingTimeline.set(false);
        }
      });
  }

  onContactSelected(id: any): void {
    if (!id) return;
    this.selectedContactId.set(Number(id));
    this.loadTimeline();
  }

  switchContactType(type: 'customer' | 'lead'): void {
    this.selectedContactType.set(type);
    this.selectedContactId.set(null);
    this.timelineItems.set([]);

    if (type === 'customer' && this.customers().length > 0) {
      this.selectedContactId.set(this.customers()[0].id);
      this.loadTimeline();
    } else if (type === 'lead' && this.leads().length > 0) {
      this.selectedContactId.set(this.leads()[0].id);
      this.loadTimeline();
    }
  }

  setView(view: 'timeline' | 'table'): void {
    this.activeView.set(view);
    if (view === 'table') {
      this.loadCommunications();
    } else {
      this.loadTimeline();
    }
  }

  openLogModal(): void {
    const currId = this.selectedContactId();
    const currType = this.selectedContactType();

    this.logForm.reset({
      target_type: currType,
      lead_id: currType === 'lead' ? currId : null,
      customer_id: currType === 'customer' ? currId : null,
      channel: 'PHONE_CALL',
      direction: 'OUTBOUND',
      subject: '',
      message_body: '',
      delivery_status: 'DELIVERED',
      is_sensitive: false,
      is_automated: false,
      resulting_action: ''
    });

    this.isLogModalOpen.set(true);
  }

  closeLogModal(): void {
    this.isLogModalOpen.set(false);
  }

  saveLog(): void {
    if (this.logForm.invalid) {
      this.logForm.markAllAsTouched();
      return;
    }

    this.isLogging.set(true);
    const val = this.logForm.value;
    const isCustomer = val.target_type === 'customer';

    const payload: Partial<CommunicationHistory> = {
      lead_id: isCustomer ? null : (val.lead_id ? Number(val.lead_id) : null),
      customer_id: isCustomer ? (val.customer_id ? Number(val.customer_id) : null) : null,
      channel: val.channel,
      direction: val.direction,
      subject: val.subject,
      message_body: val.message_body,
      delivery_status: val.delivery_status || 'DELIVERED',
      is_sensitive: Boolean(val.is_sensitive),
      is_automated: Boolean(val.is_automated),
      resulting_action: val.resulting_action
    };

    this.crmService.logCommunication(payload).subscribe({
      next: () => {
        this.isLogging.set(false);
        this.closeLogModal();
        this.loadCommunications();
        this.loadTimeline();
      },
      error: err => {
        console.error('Error logging communication', err);
        this.isLogging.set(false);
      }
    });
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadCommunications();
  }

  totalPages = computed(() => Math.ceil(this.total() / this.limit()) || 1);

  getChannelIcon(channel: string): string {
    switch (channel) {
      case 'PHONE_CALL': return 'ri-phone-line text-blue-500';
      case 'WHATSAPP': return 'ri-whatsapp-line text-emerald-500';
      case 'SMS': return 'ri-message-2-line text-amber-500';
      case 'EMAIL': return 'ri-mail-line text-indigo-500';
      case 'OFFICE_MEETING':
      case 'VIDEO_MEETING': return 'ri-team-line text-purple-500';
      case 'SITE_VISIT':
      case 'SHOW_APARTMENT_VISIT': return 'ri-building-line text-rose-500';
      case 'WEBSITE_INQUIRY': return 'ri-global-line text-teal-500';
      case 'FACEBOOK_LEAD': return 'ri-facebook-box-line text-sky-500';
      case 'QUOTATION_SENT': return 'ri-file-text-line text-orange-500';
      case 'INTERNAL_NOTE': return 'ri-sticky-note-line text-yellow-500';
      case 'COMPLAINT_TICKET': return 'ri-alarm-warning-line text-rose-600';
      default: return 'ri-chat-3-line text-muted-foreground';
    }
  }

  getChannelBadgeColor(channel: string): string {
    switch (channel) {
      case 'WHATSAPP': return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      case 'PHONE_CALL': return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'EMAIL': return 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20';
      case 'SMS': return 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
      case 'SITE_VISIT': return 'bg-purple-500/10 text-purple-600 border border-purple-500/20';
      default: return 'bg-secondary text-secondary-foreground border border-border';
    }
  }

  getDeliveryBadgeVariant(status?: string | null): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'DELIVERED':
      case 'READ':
      case 'CONNECTED':
      case 'COMPLETED': return 'success';
      case 'SENT':
      case 'PENDING': return 'info';
      case 'MISSED': return 'warning';
      case 'FAILED':
      case 'NO_SHOW': return 'danger';
      default: return 'neutral';
    }
  }
}
