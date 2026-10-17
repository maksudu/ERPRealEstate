import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  LandBank, 
  SurveyRecord, 
  JVAgreement, 
  DeedChainVerification, 
  AreaConversionResult,
  LandKhatian,
  LandDag,
  LandDeedDocument,
  LandDocumentExpiryAlert,
  JVAutoAllocationRequest,
  JVAutoAllocationResponse
} from '../models/land.model';

@Injectable({
  providedIn: 'root'
})
export class LandService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/land`;

  // 1. Math Conversion
  convertArea(params: { katha?: number; decimal?: number; sqft?: number }): Observable<AreaConversionResult> {
    let httpParams = new HttpParams();
    if (params.katha !== undefined) httpParams = httpParams.set('katha', params.katha);
    if (params.decimal !== undefined) httpParams = httpParams.set('decimal', params.decimal);
    if (params.sqft !== undefined) httpParams = httpParams.set('sqft', params.sqft);
    return this.http.get<AreaConversionResult>(`${this.baseUrl}/math/convert`, { params: httpParams });
  }

  // 2. Land Bank Proposals
  getProposals(filters?: { status?: string; deal_type?: string; search?: string }): Observable<LandBank[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.deal_type) params = params.set('deal_type', filters.deal_type);
    if (filters?.search) params = params.set('search', filters.search);
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

  // 3. Surveys
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

  // 4. Khatians (CS, SA, RS, BS, Mutation)
  getKhatians(filters?: { land_bank_id?: number; khatian_type?: string }): Observable<LandKhatian[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.khatian_type) params = params.set('khatian_type', filters.khatian_type);
    return this.http.get<LandKhatian[]>(`${this.baseUrl}/khatians`, { params });
  }

  createKhatian(payload: any): Observable<LandKhatian> {
    return this.http.post<LandKhatian>(`${this.baseUrl}/khatians`, payload);
  }

  // 5. Dags / Plots
  getDags(filters?: { land_bank_id?: number; khatian_id?: number }): Observable<LandDag[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.khatian_id) params = params.set('khatian_id', filters.khatian_id);
    return this.http.get<LandDag[]>(`${this.baseUrl}/dags`, { params });
  }

  createDag(payload: any): Observable<LandDag> {
    return this.http.post<LandDag>(`${this.baseUrl}/dags`, payload);
  }

  // 6. Statutory Legal Documents & Expiry Alerts
  getDocuments(filters?: { land_bank_id?: number; doc_type?: string }): Observable<LandDeedDocument[]> {
    let params = new HttpParams();
    if (filters?.land_bank_id) params = params.set('land_bank_id', filters.land_bank_id);
    if (filters?.doc_type) params = params.set('doc_type', filters.doc_type);
    return this.http.get<LandDeedDocument[]>(`${this.baseUrl}/documents`, { params });
  }

  createDocument(payload: any): Observable<LandDeedDocument> {
    return this.http.post<LandDeedDocument>(`${this.baseUrl}/documents`, payload);
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

  autoAllocateJVUnits(payload: JVAutoAllocationRequest): Observable<JVAutoAllocationResponse> {
    return this.http.post<JVAutoAllocationResponse>(`${this.baseUrl}/jv-agreements/auto-allocate`, payload);
  }

  // 8. Deed Chain Verification
  verifyDeedChain(landBankId: number): Observable<DeedChainVerification> {
    return this.http.get<DeedChainVerification>(`${this.baseUrl}/deed-chain-verify/${landBankId}`);
  }
}

