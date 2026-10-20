import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Booking,
  BookingCancellation,
  UnitTransfer,
  BookingJointBuyer,
  SalesMetrics,
  PriceNegotiationProposal,
  DiscountLimitPolicy,
  BookingPaymentCollection,
  OutstandingPaymentNotice,
  LegalDocumentTemplate,
  SalesLegalDocument,
  PaginatedSalesLegalDocuments,
  CustomerSalesLedgerEntry,
  CustomerAgingSummary,
  CustomerPropertyLedgerSummary,
  CustomerStatement,
  PaginatedCustomerSalesLedger,
  CustomerLedgerAdjustment,
  CustomerLedgerAdjustmentCreate,
  PaginatedLedgerAdjustments,
  BookingCancellationCreate,
  BookingCancellationApprovalAction,
  BookingCancellationDisburseRefund,
  PaginatedBookingCancellations,
  UnitTransferCreate,
  UnitTransferApprovalAction,
  PaginatedUnitTransfers,
  RegistrationChecklistTemplate,
  DeedRegistration,
  DeedRegistrationCreate,
  DeedRegistrationUpdateChecklist,
  DeedRegistrationScheduleAppointment,
  DeedRegistrationRecordSubmission,
  DeedRegistrationLegalValidation,
  DeedRegistrationLogIssue,
  DeedRegistrationResolveIssue,
  PaginatedDeedRegistrations,
  PropertyHandover,
  PropertyHandoverCreate,
  PropertyHandoverUpdatePrerequisites,
  PropertyHandoverUpdateInspection,
  PropertyHandoverUpdateUtilities,
  PropertyHandoverIssueKeys,
  PropertyHandoverUpdateWarranties,
  PropertyHandoverLogSnag,
  PropertyHandoverResolveSnag,
  PropertyHandoverScheduleAppointment,
  PropertyHandoverExecutePossession,
  PaginatedPropertyHandovers,
  PropertyReportItem,
  PropertyReportResponse,
  PropertyReportFilterParams
} from '../models/sales.model';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/sales`;

  // 1. Bookings Master
  getBookings(filters?: { 
    project_id?: number; 
    status?: string; 
    search?: string; 
    discount_status?: string;
    workflow_stage?: string;
    limit?: number;
    offset?: number;
  }): Observable<Booking[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.discount_status) params = params.set('discount_status', filters.discount_status);
    if (filters?.workflow_stage) params = params.set('workflow_stage', filters.workflow_stage);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<Booking[]>(`${this.baseUrl}/bookings`, { params });
  }

  getBooking(bookingId: number): Observable<Booking> {
    return this.http.get<Booking>(`${this.baseUrl}/bookings/${bookingId}`);
  }

  createBooking(payload: any): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings`, payload);
  }

  updateBooking(bookingId: number, payload: any): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/bookings/${bookingId}`, payload);
  }

  deleteBooking(bookingId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookings/${bookingId}`);
  }

  confirmBooking(bookingId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${bookingId}/confirm`, {});
  }

  releaseReservation(bookingId: number): Observable<Booking> {
    return this.http.post<Booking>(`${this.baseUrl}/bookings/${bookingId}/release-reservation`, {});
  }

  addJointBuyer(bookingId: number, payload: BookingJointBuyer): Observable<BookingJointBuyer> {
    return this.http.post<BookingJointBuyer>(`${this.baseUrl}/bookings/${bookingId}/joint-buyers`, payload);
  }

  removeJointBuyer(bookingId: number, jbId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookings/${bookingId}/joint-buyers/${jbId}`);
  }

  addNominee(bookingId: number, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings/${bookingId}/nominees`, payload);
  }

  removeNominee(bookingId: number, nomId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookings/${bookingId}/nominees/${nomId}`);
  }

  // 2. Multi-Level Discount Approvals (Spec 5.4 Price Negotiation & Commercial Authorizations)
  getPendingDiscountApprovals(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${this.baseUrl}/discounts/pending`);
  }

  processDiscountAction(bookingId: number, payload: { decision: string; approval_notes?: string; biometric_token?: string }): Observable<Booking> {
    return this.http.put<Booking>(`${this.baseUrl}/discounts/${bookingId}/action`, payload);
  }

  getDiscountProposals(filters?: {
    search?: string;
    project_id?: number;
    status?: string;
    required_tier?: string;
    limit?: number;
    offset?: number;
  }): Observable<PriceNegotiationProposal[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.required_tier) params = params.set('required_tier', filters.required_tier);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PriceNegotiationProposal[]>(`${this.baseUrl}/discounts/proposals`, { params });
  }

  getDiscountProposal(id: number): Observable<PriceNegotiationProposal> {
    return this.http.get<PriceNegotiationProposal>(`${this.baseUrl}/discounts/proposals/${id}`);
  }

  createDiscountProposal(payload: any): Observable<PriceNegotiationProposal> {
    return this.http.post<PriceNegotiationProposal>(`${this.baseUrl}/discounts/proposals`, payload);
  }

  reviewDiscountProposal(id: number, payload: {
    decision: string;
    approved_by_name?: string;
    approval_comments?: string;
    approved_discount_amount?: number;
    biometric_token?: string;
  }): Observable<PriceNegotiationProposal> {
    return this.http.put<PriceNegotiationProposal>(`${this.baseUrl}/discounts/proposals/${id}/review`, payload);
  }

  getDiscountLimitPolicies(): Observable<DiscountLimitPolicy[]> {
    return this.http.get<DiscountLimitPolicy[]>(`${this.baseUrl}/discounts/policies`);
  }

  createDiscountLimitPolicy(payload: any): Observable<DiscountLimitPolicy> {
    return this.http.post<DiscountLimitPolicy>(`${this.baseUrl}/discounts/policies`, payload);
  }

  deleteDiscountLimitPolicy(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/discounts/policies/${id}`);
  }

  // 3. WeasyPrint Bilingual Deed PDF Download
  downloadDeedPdf(bookingId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/bookings/${bookingId}/deed-pdf`, {
      responseType: 'blob'
    });
  }

  // 4. Spec 5.9 Cancellation and Refund Management
  getCancellations(): Observable<BookingCancellation[]> {
    return this.http.get<BookingCancellation[]>(`${this.baseUrl}/cancellations`);
  }

  getCancellationsPaged(filters?: {
    search?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedBookingCancellations> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedBookingCancellations>(`${this.baseUrl}/cancellations/paged`, { params });
  }

  getCancellationDossier(cancellationId: number): Observable<BookingCancellation> {
    return this.http.get<BookingCancellation>(`${this.baseUrl}/cancellations/${cancellationId}`);
  }

  createCancellation(payload: BookingCancellationCreate): Observable<BookingCancellation> {
    return this.http.post<BookingCancellation>(`${this.baseUrl}/cancellations`, payload);
  }

  approveCancellation(cancellationId: number, payload: BookingCancellationApprovalAction): Observable<BookingCancellation> {
    return this.http.post<BookingCancellation>(`${this.baseUrl}/cancellations/${cancellationId}/approve`, payload);
  }

  disburseCancellationRefund(cancellationId: number, payload: BookingCancellationDisburseRefund): Observable<BookingCancellation> {
    return this.http.post<BookingCancellation>(`${this.baseUrl}/cancellations/${cancellationId}/disburse-refund`, payload);
  }

  notifyCancellationCustomer(cancellationId: number): Observable<BookingCancellation> {
    return this.http.post<BookingCancellation>(`${this.baseUrl}/cancellations/${cancellationId}/notify-customer`, {});
  }

  // 5. Spec 5.10 Property Transfer and Buyer Change
  getTransfersPaged(filters?: {
    search?: string;
    transfer_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedUnitTransfers> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.transfer_type) params = params.set('transfer_type', filters.transfer_type);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedUnitTransfers>(`${this.baseUrl}/transfers/paged`, { params });
  }

  getTransferDossier(transferId: number): Observable<UnitTransfer> {
    return this.http.get<UnitTransfer>(`${this.baseUrl}/transfers/${transferId}`);
  }

  createTransfer(payload: UnitTransferCreate): Observable<UnitTransfer> {
    return this.http.post<UnitTransfer>(`${this.baseUrl}/transfers`, payload);
  }

  approveTransfer(transferId: number, payload: UnitTransferApprovalAction): Observable<UnitTransfer> {
    return this.http.post<UnitTransfer>(`${this.baseUrl}/transfers/${transferId}/approve`, payload);
  }

  processTransfer(payload: any): Observable<UnitTransfer> {
    return this.http.post<UnitTransfer>(`${this.baseUrl}/transfers`, payload);
  }

  // 6. Metrics
  getSalesMetrics(): Observable<SalesMetrics> {
    return this.http.get<SalesMetrics>(`${this.baseUrl}/metrics`);
  }

  // 7. Spec 5.5 Booking Money & Down Payment Collections
  getBookingCollections(filters?: {
    booking_id?: number;
    customer_id?: number;
    collection_type?: string;
    payment_mode?: string;
    clearance_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<BookingPaymentCollection[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.collection_type) params = params.set('collection_type', filters.collection_type);
    if (filters?.payment_mode) params = params.set('payment_mode', filters.payment_mode);
    if (filters?.clearance_status) params = params.set('clearance_status', filters.clearance_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<BookingPaymentCollection[]>(`${this.baseUrl}/collections`, { params });
  }

  getBookingCollection(id: number): Observable<BookingPaymentCollection> {
    return this.http.get<BookingPaymentCollection>(`${this.baseUrl}/collections/${id}`);
  }

  createBookingCollection(payload: any): Observable<BookingPaymentCollection> {
    return this.http.post<BookingPaymentCollection>(`${this.baseUrl}/collections`, payload);
  }

  updateCollectionClearance(id: number, payload: {
    clearance_status: string;
    clearance_date?: string;
    dishonour_reason?: string;
    deposited_account_name?: string;
  }): Observable<BookingPaymentCollection> {
    return this.http.put<BookingPaymentCollection>(`${this.baseUrl}/collections/${id}/clearance`, payload);
  }

  requestCollectionReversal(id: number, payload: {
    reversal_reason: string;
    requested_by?: string;
  }): Observable<BookingPaymentCollection> {
    return this.http.post<BookingPaymentCollection>(`${this.baseUrl}/collections/${id}/reversal`, payload);
  }

  approveCollectionReversal(id: number, payload: {
    decision: string;
    approved_by?: string;
    comments?: string;
  }): Observable<BookingPaymentCollection> {
    return this.http.put<BookingPaymentCollection>(`${this.baseUrl}/collections/${id}/reversal-action`, payload);
  }

  reconcileCollection(id: number, payload: {
    reconciliation_date: string;
    deposited_account_name: string;
    gl_voucher_reference?: string;
  }): Observable<BookingPaymentCollection> {
    return this.http.put<BookingPaymentCollection>(`${this.baseUrl}/collections/${id}/reconciliation`, payload);
  }

  getOutstandingNotices(): Observable<OutstandingPaymentNotice[]> {
    return this.http.get<OutstandingPaymentNotice[]>(`${this.baseUrl}/collections/outstanding-notices`);
  }

  sendOutstandingPaymentAlert(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/collections/outstanding-notices/${bookingId}/send-alert`, {});
  }

  // 8. Spec 5.6 Sales Agreements & Deed Preparation
  getSalesDocuments(filters?: {
    booking_id?: number;
    customer_id?: number;
    document_type?: string;
    legal_review_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<SalesLegalDocument[]> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.document_type) params = params.set('document_type', filters.document_type);
    if (filters?.legal_review_status) params = params.set('legal_review_status', filters.legal_review_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<SalesLegalDocument[]>(`${this.baseUrl}/documents`, { params });
  }

  getSalesDocumentsPaged(filters?: {
    booking_id?: number;
    customer_id?: number;
    document_type?: string;
    legal_review_status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedSalesLegalDocuments> {
    let params = new HttpParams();
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.document_type) params = params.set('document_type', filters.document_type);
    if (filters?.legal_review_status) params = params.set('legal_review_status', filters.legal_review_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedSalesLegalDocuments>(`${this.baseUrl}/documents/paged`, { params });
  }

  downloadDocumentPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/documents/${id}/pdf`, { responseType: 'blob' });
  }

  getSalesDocument(id: number): Observable<SalesLegalDocument> {
    return this.http.get<SalesLegalDocument>(`${this.baseUrl}/documents/${id}`);
  }

  generateSalesDocument(payload: any): Observable<SalesLegalDocument> {
    return this.http.post<SalesLegalDocument>(`${this.baseUrl}/documents/generate`, payload);
  }

  reviewSalesDocument(id: number, payload: {
    decision: string;
    reviewed_by?: string;
    notes?: string;
  }): Observable<SalesLegalDocument> {
    return this.http.put<SalesLegalDocument>(`${this.baseUrl}/documents/${id}/review`, payload);
  }

  signSalesDocument(id: number, payload: {
    party: string;
    first_party_signatory_name?: string;
    second_party_signatory_name?: string;
    witness_1_name?: string;
    witness_2_name?: string;
    execution_date?: string;
  }): Observable<SalesLegalDocument> {
    return this.http.put<SalesLegalDocument>(`${this.baseUrl}/documents/${id}/sign`, payload);
  }

  updateDeedChecklist(id: number, checklist_status_json: any): Observable<SalesLegalDocument> {
    return this.http.put<SalesLegalDocument>(`${this.baseUrl}/documents/${id}/checklist`, { checklist_status_json });
  }

  getDocumentTemplates(document_type?: string): Observable<LegalDocumentTemplate[]> {
    let params = new HttpParams();
    if (document_type) params = params.set('document_type', document_type);
    return this.http.get<LegalDocumentTemplate[]>(`${this.baseUrl}/document-templates`, { params });
  }

  createDocumentTemplate(payload: any): Observable<LegalDocumentTemplate> {
    return this.http.post<LegalDocumentTemplate>(`${this.baseUrl}/document-templates`, payload);
  }

  // 9. Spec 5.8 Customer-wise Sales Ledger & Statement Engine
  getSalesLedgerPaged(filters?: {
    customer_id?: number;
    booking_id?: number;
    project_id?: number;
    transaction_type?: string;
    reconciliation_status?: string;
    search?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedCustomerSalesLedger> {
    let params = new HttpParams();
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.transaction_type) params = params.set('transaction_type', filters.transaction_type);
    if (filters?.reconciliation_status) params = params.set('reconciliation_status', filters.reconciliation_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.from_date) params = params.set('from_date', filters.from_date);
    if (filters?.to_date) params = params.set('to_date', filters.to_date);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedCustomerSalesLedger>(`${this.baseUrl}/ledger/paged`, { params });
  }

  getCustomerStatement(customerId: number, bookingId?: number): Observable<CustomerStatement> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get<CustomerStatement>(`${this.baseUrl}/ledger/customers/${customerId}/statement`, { params });
  }

  getBookingStatement(bookingId: number): Observable<CustomerStatement> {
    return this.http.get<CustomerStatement>(`${this.baseUrl}/ledger/bookings/${bookingId}/statement`);
  }

  createLedgerAdjustment(payload: CustomerLedgerAdjustmentCreate): Observable<CustomerLedgerAdjustment> {
    return this.http.post<CustomerLedgerAdjustment>(`${this.baseUrl}/ledger/adjustments`, payload);
  }

  getLedgerAdjustmentsPaged(filters?: {
    customer_id?: number;
    booking_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedLedgerAdjustments> {
    let params = new HttpParams();
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.booking_id) params = params.set('booking_id', filters.booking_id);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedLedgerAdjustments>(`${this.baseUrl}/ledger/adjustments/paged`, { params });
  }

  exportCustomerStatementPdf(customerId: number, bookingId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get(`${this.baseUrl}/ledger/customers/${customerId}/export-pdf`, {
      params,
      responseType: 'blob'
    });
  }

  exportCustomerStatementExcel(customerId: number, bookingId?: number): Observable<Blob> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get(`${this.baseUrl}/ledger/customers/${customerId}/export-excel`, {
      params,
      responseType: 'blob'
    });
  }

  triggerSalesLedgerSync(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sales/ledger/sync`, {});
  }

  // 10. Spec 5.11 Registration and Deed Tracking
  getRegistrationTemplates(property_type?: string): Observable<RegistrationChecklistTemplate[]> {
    let params = new HttpParams();
    if (property_type) params = params.set('property_type', property_type);
    return this.http.get<RegistrationChecklistTemplate[]>(`${this.baseUrl}/registrations/templates`, { params });
  }

  createRegistrationTemplate(payload: any): Observable<RegistrationChecklistTemplate> {
    return this.http.post<RegistrationChecklistTemplate>(`${this.baseUrl}/registrations/templates`, payload);
  }

  getRegistrationsPaged(filters?: {
    search?: string;
    status?: string;
    deed_type?: string;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedDeedRegistrations> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.deed_type) params = params.set('deed_type', filters.deed_type);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedDeedRegistrations>(`${this.baseUrl}/registrations/paged`, { params });
  }

  getRegistrationDossier(id: number): Observable<DeedRegistration> {
    return this.http.get<DeedRegistration>(`${this.baseUrl}/registrations/${id}`);
  }

  createRegistration(payload: DeedRegistrationCreate): Observable<DeedRegistration> {
    return this.http.post<DeedRegistration>(`${this.baseUrl}/registrations`, payload);
  }

  updateRegistrationChecklistItem(id: number, payload: DeedRegistrationUpdateChecklist): Observable<DeedRegistration> {
    return this.http.put<DeedRegistration>(`${this.baseUrl}/registrations/${id}/checklist`, payload);
  }

  scheduleRegistrationAppointment(id: number, payload: DeedRegistrationScheduleAppointment): Observable<DeedRegistration> {
    return this.http.put<DeedRegistration>(`${this.baseUrl}/registrations/${id}/appointment`, payload);
  }

  recordRegistrationSubmission(id: number, payload: DeedRegistrationRecordSubmission): Observable<DeedRegistration> {
    return this.http.put<DeedRegistration>(`${this.baseUrl}/registrations/${id}/submission`, payload);
  }

  validateRegistrationLegal(id: number, payload: DeedRegistrationLegalValidation): Observable<DeedRegistration> {
    return this.http.put<DeedRegistration>(`${this.baseUrl}/registrations/${id}/legal-validation`, payload);
  }

  logRegistrationLegalIssue(id: number, payload: DeedRegistrationLogIssue): Observable<DeedRegistration> {
    return this.http.post<DeedRegistration>(`${this.baseUrl}/registrations/${id}/issues`, payload);
  }

  resolveRegistrationLegalIssue(id: number, issueId: string, payload: DeedRegistrationResolveIssue): Observable<DeedRegistration> {
    return this.http.put<DeedRegistration>(`${this.baseUrl}/registrations/${id}/issues/${issueId}/resolve`, payload);
  }

  // 11. Spec 5.12 Property Handover Management
  getHandoversPaged(filters?: {
    search?: string;
    status?: string;
    possession_status?: string;
    project_id?: number;
    limit?: number;
    offset?: number;
  }): Observable<PaginatedPropertyHandovers> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.possession_status) params = params.set('possession_status', filters.possession_status);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined) params = params.set('offset', filters.offset);
    return this.http.get<PaginatedPropertyHandovers>(`${this.baseUrl}/handovers/paged`, { params });
  }

  getHandoverDossier(id: number): Observable<PropertyHandover> {
    return this.http.get<PropertyHandover>(`${this.baseUrl}/handovers/${id}`);
  }

  createHandover(payload: PropertyHandoverCreate): Observable<PropertyHandover> {
    return this.http.post<PropertyHandover>(`${this.baseUrl}/handovers`, payload);
  }

  updateHandover(id: number, payload: Partial<PropertyHandoverCreate> & { status?: string }): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}`, payload);
  }

  deleteHandover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/handovers/${id}`);
  }

  updateHandoverPrerequisites(id: number, payload: PropertyHandoverUpdatePrerequisites): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/prerequisites`, payload);
  }

  updateHandoverInspection(id: number, payload: PropertyHandoverUpdateInspection): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/inspection`, payload);
  }

  updateHandoverUtilities(id: number, payload: PropertyHandoverUpdateUtilities): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/utilities`, payload);
  }

  issueHandoverKeys(id: number, payload: PropertyHandoverIssueKeys): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/keys`, payload);
  }

  updateHandoverWarranties(id: number, payload: PropertyHandoverUpdateWarranties): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/warranties`, payload);
  }

  logHandoverSnag(id: number, payload: PropertyHandoverLogSnag): Observable<PropertyHandover> {
    return this.http.post<PropertyHandover>(`${this.baseUrl}/handovers/${id}/snags`, payload);
  }

  resolveHandoverSnag(id: number, snagId: string, payload: PropertyHandoverResolveSnag): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/snags/${snagId}/resolve`, payload);
  }

  scheduleHandoverAppointment(id: number, payload: PropertyHandoverScheduleAppointment): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/appointment`, payload);
  }

  executeHandoverPossession(id: number, payload: PropertyHandoverExecutePossession): Observable<PropertyHandover> {
    return this.http.put<PropertyHandover>(`${this.baseUrl}/handovers/${id}/execute-possession`, payload);
  }

  // =========================================================================
  // 5.13 PROPERTY & SALES PORTFOLIO INTELLIGENCE REPORT & EXPORTS
  // =========================================================================

  private buildPropertyReportParams(filters?: PropertyReportFilterParams): HttpParams {
    let params = new HttpParams();
    if (!filters) return params;
    if (filters.search) params = params.set('search', filters.search);
    if (filters.project_id) params = params.set('project_id', filters.project_id.toString());
    if (filters.unit_type) params = params.set('unit_type', filters.unit_type);
    if (filters.inventory_status) params = params.set('inventory_status', filters.inventory_status);
    if (filters.workflow_stage) params = params.set('workflow_stage', filters.workflow_stage);
    if (filters.possession_status) params = params.set('possession_status', filters.possession_status);
    if (filters.facing) params = params.set('facing', filters.facing);
    if (filters.min_price !== undefined && filters.min_price !== null) params = params.set('min_price', filters.min_price.toString());
    if (filters.max_price !== undefined && filters.max_price !== null) params = params.set('max_price', filters.max_price.toString());
    if (filters.min_area !== undefined && filters.min_area !== null) params = params.set('min_area', filters.min_area.toString());
    if (filters.max_area !== undefined && filters.max_area !== null) params = params.set('max_area', filters.max_area.toString());
    if (filters.limit !== undefined && filters.limit !== null) params = params.set('limit', filters.limit.toString());
    if (filters.offset !== undefined && filters.offset !== null) params = params.set('offset', filters.offset.toString());
    return params;
  }

  getPropertyReportSummary(filters?: PropertyReportFilterParams): Observable<PropertyReportResponse> {
    const params = this.buildPropertyReportParams(filters);
    return this.http.get<PropertyReportResponse>(`${this.baseUrl}/reports/property-summary`, { params });
  }

  downloadPropertyReportExcel(filters?: PropertyReportFilterParams): Observable<Blob> {
    const params = this.buildPropertyReportParams(filters);
    return this.http.get(`${this.baseUrl}/reports/property-report/export-excel`, {
      params,
      responseType: 'blob'
    });
  }

  downloadPropertyReportPdf(filters?: PropertyReportFilterParams): Observable<Blob> {
    const params = this.buildPropertyReportParams(filters);
    return this.http.get(`${this.baseUrl}/reports/property-report/export-pdf`, {
      params,
      responseType: 'blob'
    });
  }
}



