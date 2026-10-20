import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  LandBank, 
  Landowner,
  LandownerDuplicateCheckRequest,
  LandownerDuplicateCheckResponse,
  LandownerNegotiationNoteRequest,
  LandParcel,
  LandownerParcelLink,
  LandFeasibilityReport,
  LandProposalComparisonItem,
  SurveyRecord, 
  JVAgreement, 
  DeedChainVerification, 
  AreaConversionResult,
  LandKhatian,
  LandDag,
  LandDeedDocument,
  LandDocumentExpiryAlert,
  JVAutoAllocationRequest,
  JVAutoAllocationResponse,
  MeasurementConvention,
  RegionalConversionRequest,
  RegionalConversionResponse,
  DocumentVerifyRequest,
  DocumentChecklistResponse,
  JointOwnershipShareSummary,
  LegalDueDiligence,
  DueDiligenceItem,
  DueDiligenceExceptionApprovalRequest,
  LandValuation,
  PaginatedResponse,
  AcquisitionExpenseItem,
  AcquisitionCosting,
  CostingApprovalRequest,
  ValuationApprovalRequest,
  ValuationComparisonSummary,
  LandNegotiation,
  NegotiationMeeting,
  NegotiationTermVersion,
  NegotiationTermsApprovalRequest,
  NegotiationOfferRevisionRequest,
  NegotiationAlertsResponse,
  LandPaymentSchedule,
  LandPaymentTransaction,
  PaymentApprovalRequest,
  PaymentDisbursementRequest,
  PaymentReversalRequest,
  PaymentScheduleAutoGenerateRequest,
  PaymentReconciliationSummary
} from '../models/land.model';

@Injectable({
  providedIn: 'root'
})
export class LandService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/land`;

  // 1. Math Conversion
  convertArea(params: { katha?: number; decimal?: number; sqft?: number; bigha?: number }): Observable<AreaConversionResult> {
    let httpParams = new HttpParams();
    if (params.katha !== undefined) httpParams = httpParams.set('katha', params.katha);
    if (params.decimal !== undefined) httpParams = httpParams.set('decimal', params.decimal);
    if (params.sqft !== undefined) httpParams = httpParams.set('sqft', params.sqft);
    if (params.bigha !== undefined) httpParams = httpParams.set('bigha', params.bigha);
    return this.http.get<AreaConversionResult>(`${this.baseUrl}/math/convert`, { params: httpParams });
  }

  // 2. Landowner and Seller Management (2.1)
  getLandowners(filters?: { owner_type?: string; status?: string; search?: string; skip?: number; limit?: number }): Observable<Landowner[]> {
    let params = new HttpParams();
    if (filters?.owner_type) params = params.set('owner_type', filters.owner_type);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip);
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit);
    return this.http.get<Landowner[]>(`${this.baseUrl}/landowners`, { params });
  }

  getLandowner(id: number): Observable<Landowner> {
    return this.http.get<Landowner>(`${this.baseUrl}/landowners/${id}`);
  }

  createLandowner(payload: Partial<Landowner>): Observable<Landowner> {
    return this.http.post<Landowner>(`${this.baseUrl}/landowners`, payload);
  }

  updateLandowner(id: number, payload: Partial<Landowner>): Observable<Landowner> {
    return this.http.put<Landowner>(`${this.baseUrl}/landowners/${id}`, payload);
  }

  deleteLandowner(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/landowners/${id}`);
  }

  checkLandownerDuplicate(payload: LandownerDuplicateCheckRequest): Observable<LandownerDuplicateCheckResponse> {
    return this.http.post<LandownerDuplicateCheckResponse>(`${this.baseUrl}/landowners/check-duplicate`, payload);
  }

  addLandownerNegotiationNote(id: number, payload: LandownerNegotiationNoteRequest): Observable<Landowner> {
    return this.http.post<Landowner>(`${this.baseUrl}/landowners/${id}/negotiation-notes`, payload);
  }

  // 3. Land Parcel and Location Registry (2.3)
  getParcels(filters?: { status?: string; mouza?: string; search?: string; skip?: number; limit?: number }): Observable<LandParcel[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.mouza) params = params.set('mouza', filters.mouza);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip);
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit);
    return this.http.get<LandParcel[]>(`${this.baseUrl}/parcels`, { params });
  }

  getParcel(id: number): Observable<LandParcel> {
    return this.http.get<LandParcel>(`${this.baseUrl}/parcels/${id}`);
  }

  createParcel(payload: Partial<LandParcel> & { input_unit?: string; input_value?: number }): Observable<LandParcel> {
    return this.http.post<LandParcel>(`${this.baseUrl}/parcels`, payload);
  }

  updateParcel(id: number, payload: Partial<LandParcel>): Observable<LandParcel> {
    return this.http.put<LandParcel>(`${this.baseUrl}/parcels/${id}`, payload);
  }

  deleteParcel(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/parcels/${id}`);
  }

  getJointOwnershipLinks(filters?: { 
    parcel_id?: number; 
    landowner_id?: number; 
    consent_status?: string; 
    search?: string; 
    skip?: number; 
    limit?: number 
  }): Observable<LandownerParcelLink[]> {
    let params = new HttpParams();
    if (filters?.parcel_id) params = params.set('parcel_id', filters.parcel_id);
    if (filters?.landowner_id) params = params.set('landowner_id', filters.landowner_id);
    if (filters?.consent_status) params = params.set('consent_status', filters.consent_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip);
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit);
    return this.http.get<LandownerParcelLink[]>(`${this.baseUrl}/joint-ownership-links`, { params });
  }

  getParcelOwners(parcelId: number): Observable<LandownerParcelLink[]> {
    return this.http.get<LandownerParcelLink[]>(`${this.baseUrl}/parcels/${parcelId}/owners`);
  }

  auditParcelJointOwnership(parcelId: number): Observable<JointOwnershipShareSummary> {
    return this.http.get<JointOwnershipShareSummary>(`${this.baseUrl}/parcels/${parcelId}/joint-ownership-audit`);
  }

  linkOwnerToParcel(parcelId: number, payload: any): Observable<LandownerParcelLink> {
    return this.http.post<LandownerParcelLink>(`${this.baseUrl}/parcels/${parcelId}/owners`, payload);
  }

  updateJointOwnershipLink(linkId: number, payload: any): Observable<LandownerParcelLink> {
    return this.http.put<LandownerParcelLink>(`${this.baseUrl}/joint-ownership-links/${linkId}`, payload);
  }

  deleteJointOwnershipLink(linkId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/joint-ownership-links/${linkId}`);
  }

  unlinkOwnerFromParcel(parcelId: number, linkId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/parcels/${parcelId}/owners/${linkId}`);
  }

  // 4. Land Search and Acquisition Proposals (2.2)
  getProposals(filters?: { status?: string; workflow_stage?: string; deal_type?: string; search?: string; skip?: number; limit?: number }): Observable<LandBank[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.workflow_stage) params = params.set('workflow_stage', filters.workflow_stage);
    if (filters?.deal_type) params = params.set('deal_type', filters.deal_type);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip);
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit);
    return this.http.get<LandBank[]>(`${this.baseUrl}/proposals`, { params });
  }

  getProposal(id: number): Observable<LandBank> {
    return this.http.get<LandBank>(`${this.baseUrl}/proposals/${id}`);
  }

  createProposal(payload: any): Observable<LandBank> {
    return this.http.post<LandBank>(`${this.baseUrl}/proposals`, payload);
  }

  updateProposal(id: number, payload: any): Observable<LandBank> {
    return this.http.put<LandBank>(`${this.baseUrl}/proposals/${id}`, payload);
  }

  deleteProposal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/proposals/${id}`);
  }

  compareProposals(): Observable<LandProposalComparisonItem[]> {
    return this.http.get<LandProposalComparisonItem[]>(`${this.baseUrl}/proposals/compare`);
  }

  getProposalFeasibilityReport(proposalId: number): Observable<LandFeasibilityReport> {
    return this.http.get<LandFeasibilityReport>(`${this.baseUrl}/proposals/${proposalId}/feasibility-report`);
  }

  advanceWorkflowStage(proposalId: number, stage: string): Observable<LandBank> {
    return this.http.patch<LandBank>(`${this.baseUrl}/proposals/${proposalId}/workflow-stage`, null, {
      params: { workflow_stage: stage }
    });
  }

  // 5. Surveys & Khatians
  getSurveys(filters?: { land_bank_id?: number; survey_type?: string }): Observable<SurveyRecord[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.survey_type) params = params.set('survey_type', filters.survey_type);
    return this.http.get<SurveyRecord[]>(`${this.baseUrl}/surveys`, { params });
  }

  createSurvey(landBankId: number, payload: any): Observable<SurveyRecord> {
    return this.http.post<SurveyRecord>(`${this.baseUrl}/surveys`, payload, {
      params: { land_bank_id: landBankId }
    });
  }

  getKhatians(filters?: { land_bank_id?: number; khatian_type?: string }): Observable<LandKhatian[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.khatian_type) params = params.set('khatian_type', filters.khatian_type);
    return this.http.get<LandKhatian[]>(`${this.baseUrl}/khatians`, { params });
  }

  createKhatian(payload: any): Observable<LandKhatian> {
    return this.http.post<LandKhatian>(`${this.baseUrl}/khatians`, payload);
  }

  getDags(filters?: { land_bank_id?: number; khatian_id?: number }): Observable<LandDag[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.khatian_id) params = params.set('khatian_id', filters.khatian_id);
    return this.http.get<LandDag[]>(`${this.baseUrl}/dags`, { params });
  }

  createDag(payload: any): Observable<LandDag> {
    return this.http.post<LandDag>(`${this.baseUrl}/dags`, payload);
  }

  // 5.1 Measurement Conventions & Regional Conversion (2.4)
  getMeasurementConventions(): Observable<MeasurementConvention[]> {
    return this.http.get<MeasurementConvention[]>(`${this.baseUrl}/measurement-conventions`);
  }

  createMeasurementConvention(payload: any): Observable<MeasurementConvention> {
    return this.http.post<MeasurementConvention>(`${this.baseUrl}/measurement-conventions`, payload);
  }

  updateMeasurementConvention(id: number, payload: any): Observable<MeasurementConvention> {
    return this.http.put<MeasurementConvention>(`${this.baseUrl}/measurement-conventions/${id}`, payload);
  }

  convertRegional(payload: RegionalConversionRequest): Observable<RegionalConversionResponse> {
    return this.http.post<RegionalConversionResponse>(`${this.baseUrl}/math/convert-regional`, payload);
  }

  // 6. Statutory Legal Documents & Independent Verification (2.5)
  getDocuments(filters?: { 
    land_bank_id?: number; 
    parcel_id?: number; 
    landowner_id?: number; 
    document_category?: string; 
    verification_status?: string; 
    search?: string;
  }): Observable<LandDeedDocument[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.parcel_id) params = params.set('parcel_id', filters.parcel_id);
    if (filters?.landowner_id) params = params.set('landowner_id', filters.landowner_id);
    if (filters?.document_category) params = params.set('document_category', filters.document_category);
    if (filters?.verification_status) params = params.set('verification_status', filters.verification_status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<LandDeedDocument[]>(`${this.baseUrl}/documents`, { params });
  }

  getDocumentById(id: number): Observable<LandDeedDocument> {
    return this.http.get<LandDeedDocument>(`${this.baseUrl}/documents/${id}`);
  }

  createDocument(payload: any): Observable<LandDeedDocument> {
    return this.http.post<LandDeedDocument>(`${this.baseUrl}/documents`, payload);
  }

  updateDocument(id: number, payload: any): Observable<LandDeedDocument> {
    return this.http.put<LandDeedDocument>(`${this.baseUrl}/documents/${id}`, payload);
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/documents/${id}`);
  }

  verifyDocument(id: number, payload: DocumentVerifyRequest): Observable<LandDeedDocument> {
    return this.http.post<LandDeedDocument>(`${this.baseUrl}/documents/${id}/verify`, payload);
  }

  simulateDocumentOcr(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/documents/${id}/ocr-simulate`, {});
  }

  getDocumentChecklist(parcelId: number): Observable<DocumentChecklistResponse> {
    return this.http.get<DocumentChecklistResponse>(`${this.baseUrl}/parcels/${parcelId}/document-checklist`);
  }

  getDocumentExpiryAlerts(): Observable<LandDocumentExpiryAlert[]> {
    return this.http.get<LandDocumentExpiryAlert[]>(`${this.baseUrl}/documents/expiry-alerts`);
  }

  // 7. JV Agreements & Auto-Allocation Matrix
  getJVAgreements(filters?: { land_bank_id?: number; status?: string }): Observable<JVAgreement[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<JVAgreement[]>(`${this.baseUrl}/jv-agreements`, { params });
  }

  createJVAgreement(payload: any): Observable<JVAgreement> {
    return this.http.post<JVAgreement>(`${this.baseUrl}/jv-agreements`, payload);
  }

  updateJVAgreement(id: number, payload: any): Observable<JVAgreement> {
    return this.http.put<JVAgreement>(`${this.baseUrl}/jv-agreements/${id}`, payload);
  }

  deleteJVAgreement(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/jv-agreements/${id}`);
  }

  autoAllocateJVUnits(payload: JVAutoAllocationRequest): Observable<JVAutoAllocationResponse> {
    return this.http.post<JVAutoAllocationResponse>(`${this.baseUrl}/jv-agreements/auto-allocate`, payload);
  }

  // 8. Legal Due Diligence and Encumbrance Tracking (Module 2.7)
  getLegalDueDiligenceList(filters?: { 
    parcel_id?: number; 
    risk_level?: string; 
    clearance_status?: string; 
    search?: string; 
    skip?: number; 
    limit?: number 
  }): Observable<LegalDueDiligence[]> {
    let params = new HttpParams();
    if (filters?.parcel_id) params = params.set('parcel_id', filters.parcel_id);
    if (filters?.risk_level) params = params.set('risk_level', filters.risk_level);
    if (filters?.clearance_status) params = params.set('clearance_status', filters.clearance_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.skip !== undefined) params = params.set('skip', filters.skip);
    if (filters?.limit !== undefined) params = params.set('limit', filters.limit);
    return this.http.get<LegalDueDiligence[]>(`${this.baseUrl}/legal-due-diligence`, { params });
  }

  getLegalDueDiligenceById(id: number): Observable<LegalDueDiligence> {
    return this.http.get<LegalDueDiligence>(`${this.baseUrl}/legal-due-diligence/${id}`);
  }

  getParcelDueDiligence(parcelId: number): Observable<LegalDueDiligence | null> {
    return this.http.get<LegalDueDiligence | null>(`${this.baseUrl}/parcels/${parcelId}/legal-due-diligence`);
  }

  createLegalDueDiligence(payload: any): Observable<LegalDueDiligence> {
    return this.http.post<LegalDueDiligence>(`${this.baseUrl}/legal-due-diligence`, payload);
  }

  updateLegalDueDiligence(id: number, payload: any): Observable<LegalDueDiligence> {
    return this.http.put<LegalDueDiligence>(`${this.baseUrl}/legal-due-diligence/${id}`, payload);
  }

  addDueDiligenceItem(diligenceId: number, payload: any): Observable<DueDiligenceItem> {
    return this.http.post<DueDiligenceItem>(`${this.baseUrl}/legal-due-diligence/${diligenceId}/items`, payload);
  }

  updateDueDiligenceItem(diligenceId: number, itemId: number, payload: any): Observable<DueDiligenceItem> {
    return this.http.put<DueDiligenceItem>(`${this.baseUrl}/legal-due-diligence/${diligenceId}/items/${itemId}`, payload);
  }

  approveDueDiligenceException(diligenceId: number, payload: DueDiligenceExceptionApprovalRequest): Observable<LegalDueDiligence> {
    return this.http.post<LegalDueDiligence>(`${this.baseUrl}/legal-due-diligence/${diligenceId}/exception-approval`, payload);
  }

  // 9. Deed Chain Verification
  verifyDeedChain(landBankId: number): Observable<DeedChainVerification> {
    return this.http.get<DeedChainVerification>(`${this.baseUrl}/deed-chain-verify/${landBankId}`);
  }

  // 10. Land Valuation & Acquisition Costing (Module 2.8)
  getLandValuations(params?: any): Observable<PaginatedResponse<LandValuation>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<LandValuation>>(`${this.baseUrl}/valuations`, { params: httpParams });
  }

  getLandValuationById(id: number): Observable<LandValuation> {
    return this.http.get<LandValuation>(`${this.baseUrl}/valuations/${id}`);
  }

  createLandValuation(payload: any): Observable<LandValuation> {
    return this.http.post<LandValuation>(`${this.baseUrl}/valuations`, payload);
  }

  updateLandValuation(id: number, payload: any): Observable<LandValuation> {
    return this.http.put<LandValuation>(`${this.baseUrl}/valuations/${id}`, payload);
  }

  deleteLandValuation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/valuations/${id}`);
  }

  approveLandValuation(id: number, payload: ValuationApprovalRequest): Observable<LandValuation> {
    return this.http.post<LandValuation>(`${this.baseUrl}/valuations/${id}/approve`, payload);
  }

  getParcelValuationComparison(parcelId: number): Observable<ValuationComparisonSummary> {
    return this.http.get<ValuationComparisonSummary>(`${this.baseUrl}/parcels/${parcelId}/valuation-comparison`);
  }

  getAcquisitionCostings(params?: any): Observable<PaginatedResponse<AcquisitionCosting>> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<PaginatedResponse<AcquisitionCosting>>(`${this.baseUrl}/acquisition-costings`, { params: httpParams });
  }

  getAcquisitionCostingById(id: number): Observable<AcquisitionCosting> {
    return this.http.get<AcquisitionCosting>(`${this.baseUrl}/acquisition-costings/${id}`);
  }

  createAcquisitionCosting(payload: any): Observable<AcquisitionCosting> {
    return this.http.post<AcquisitionCosting>(`${this.baseUrl}/acquisition-costings`, payload);
  }

  updateAcquisitionCosting(id: number, payload: any): Observable<AcquisitionCosting> {
    return this.http.put<AcquisitionCosting>(`${this.baseUrl}/acquisition-costings/${id}`, payload);
  }

  deleteAcquisitionCosting(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/acquisition-costings/${id}`);
  }

  approveAcquisitionCosting(id: number, payload: CostingApprovalRequest): Observable<AcquisitionCosting> {
    return this.http.post<AcquisitionCosting>(`${this.baseUrl}/acquisition-costings/${id}/approve`, payload);
  }

  addAcquisitionExpenseItem(costingId: number, payload: any): Observable<AcquisitionExpenseItem> {
    return this.http.post<AcquisitionExpenseItem>(`${this.baseUrl}/acquisition-costings/${costingId}/expenses`, payload);
  }

  updateAcquisitionExpenseItem(costingId: number, expenseId: number, payload: any): Observable<AcquisitionExpenseItem> {
    return this.http.put<AcquisitionExpenseItem>(`${this.baseUrl}/acquisition-costings/${costingId}/expenses/${expenseId}`, payload);
  }

  deleteAcquisitionExpenseItem(costingId: number, expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/acquisition-costings/${costingId}/expenses/${expenseId}`);
  }

  // 14. Landowner Negotiation & Agreement Management (2.9)
  getNegotiationAlerts(): Observable<NegotiationAlertsResponse> {
    return this.http.get<NegotiationAlertsResponse>(`${this.baseUrl}/negotiations/alerts/delayed-and-expiring`);
  }

  getNegotiations(params?: any): Observable<LandNegotiation[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<LandNegotiation[]>(`${this.baseUrl}/negotiations`, { params: httpParams });
  }

  getNegotiationById(id: number): Observable<LandNegotiation> {
    return this.http.get<LandNegotiation>(`${this.baseUrl}/negotiations/${id}`);
  }

  createNegotiation(payload: any): Observable<LandNegotiation> {
    return this.http.post<LandNegotiation>(`${this.baseUrl}/negotiations`, payload);
  }

  updateNegotiation(id: number, payload: any): Observable<LandNegotiation> {
    return this.http.put<LandNegotiation>(`${this.baseUrl}/negotiations/${id}`, payload);
  }

  deleteNegotiation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/negotiations/${id}`);
  }

  reviseNegotiationTerms(id: number, payload: NegotiationOfferRevisionRequest): Observable<LandNegotiation> {
    return this.http.post<LandNegotiation>(`${this.baseUrl}/negotiations/${id}/revise-terms`, payload);
  }

  approveNegotiationTerms(id: number, payload: NegotiationTermsApprovalRequest): Observable<LandNegotiation> {
    return this.http.post<LandNegotiation>(`${this.baseUrl}/negotiations/${id}/approve`, payload);
  }

  createNegotiationMeeting(negotiationId: number, payload: any): Observable<NegotiationMeeting> {
    return this.http.post<NegotiationMeeting>(`${this.baseUrl}/negotiations/${negotiationId}/meetings`, payload);
  }

  deleteNegotiationMeeting(negotiationId: number, meetingId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/negotiations/${negotiationId}/meetings/${meetingId}`);
  }

  // 15. Land Payment Schedules and Outstanding Balances (2.10)
  getPaymentReconciliationSummary(parcelId?: number): Observable<PaymentReconciliationSummary> {
    let httpParams = new HttpParams();
    if (parcelId) httpParams = httpParams.set('parcel_id', parcelId);
    return this.http.get<PaymentReconciliationSummary>(`${this.baseUrl}/payment-schedules/reconciliation`, { params: httpParams });
  }

  getPaymentSchedules(params?: any): Observable<LandPaymentSchedule[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<LandPaymentSchedule[]>(`${this.baseUrl}/payment-schedules`, { params: httpParams });
  }

  getPaymentScheduleById(id: number): Observable<LandPaymentSchedule> {
    return this.http.get<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules/${id}`);
  }

  createPaymentSchedule(payload: any): Observable<LandPaymentSchedule> {
    return this.http.post<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules`, payload);
  }

  autoGeneratePaymentSchedules(payload: PaymentScheduleAutoGenerateRequest): Observable<LandPaymentSchedule[]> {
    return this.http.post<LandPaymentSchedule[]>(`${this.baseUrl}/payment-schedules/auto-generate`, payload);
  }

  updatePaymentSchedule(id: number, payload: any): Observable<LandPaymentSchedule> {
    return this.http.put<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules/${id}`, payload);
  }

  deletePaymentSchedule(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/payment-schedules/${id}`);
  }

  approvePaymentSchedule(id: number, payload: PaymentApprovalRequest): Observable<LandPaymentSchedule> {
    return this.http.post<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules/${id}/approve`, payload);
  }

  disbursePayment(id: number, payload: PaymentDisbursementRequest): Observable<LandPaymentSchedule> {
    return this.http.post<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules/${id}/disburse`, payload);
  }

  reversePaymentTransaction(scheduleId: number, txnId: number, payload: PaymentReversalRequest): Observable<LandPaymentSchedule> {
    return this.http.post<LandPaymentSchedule>(`${this.baseUrl}/payment-schedules/${scheduleId}/transactions/${txnId}/reverse`, payload);
  }

  // 12. Land Reports & Analytics Engine (All 15 Reports)
  getReportCatalog(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/reports/catalog`);
  }

  getReportFilterOptions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/reports/filter-options`);
  }

  getLandReport(reportType: string, filters?: any): Observable<any> {
    let params = new HttpParams();
    if (filters) {
      if (filters.start_date) params = params.set('start_date', filters.start_date);
      if (filters.end_date) params = params.set('end_date', filters.end_date);
      if (filters.project_id) params = params.set('project_id', filters.project_id);
      if (filters.location) params = params.set('location', filters.location);
      if (filters.acquisition_status) params = params.set('acquisition_status', filters.acquisition_status);
      if (filters.company_id) params = params.set('company_id', filters.company_id);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.skip !== undefined) params = params.set('skip', filters.skip);
      if (filters.limit !== undefined) params = params.set('limit', filters.limit);
    }
    return this.http.get<any>(`${this.baseUrl}/reports/${reportType}`, { params });
  }

  // 13. Land Intelligence Dashboard Analytics
  getDashboardAnalytics(period: string = 'Last 30 Days'): Observable<any> {
    const params = new HttpParams().set('period', period);
    return this.http.get<any>(`${this.baseUrl}/dashboard/analytics`, { params });
  }
}


