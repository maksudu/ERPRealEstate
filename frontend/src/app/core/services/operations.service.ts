import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Broker,
  BrokerCommission,
  CourtCase,
  MachineryAsset,
  ImportBatch
} from '../models/operations.model';

@Injectable({
  providedIn: 'root'
})
export class OperationsService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  // 1. Brokers & Commissions
  getBrokers(status?: string): Observable<Broker[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<Broker[]>(`${this.baseUrl}/brokers`, { params });
  }

  createBroker(payload: Partial<Broker>): Observable<Broker> {
    return this.http.post<Broker>(`${this.baseUrl}/brokers`, payload);
  }

  getCommissions(brokerId?: number): Observable<BrokerCommission[]> {
    let params = new HttpParams();
    if (brokerId) params = params.set('broker_id', brokerId);
    return this.http.get<BrokerCommission[]>(`${this.baseUrl}/brokers/commissions`, { params });
  }

  createCommission(payload: {
    broker_id: number;
    booking_id: number;
    total_unit_value: number;
    commission_percent: number;
  }): Observable<BrokerCommission> {
    return this.http.post<BrokerCommission>(`${this.baseUrl}/brokers/commissions`, payload);
  }

  releaseCommissionTranche(
    commissionId: number,
    payload: { tranche_stage: string; notes?: string }
  ): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/brokers/commissions/${commissionId}/release`, payload);
  }

  // 2. Legal Cases & Litigation
  getCourtCases(filters?: { project_id?: number; case_type?: string }): Observable<CourtCase[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.case_type) params = params.set('case_type', filters.case_type);
    return this.http.get<CourtCase[]>(`${this.baseUrl}/legal/cases`, { params });
  }

  createCourtCase(payload: Partial<CourtCase>): Observable<CourtCase> {
    return this.http.post<CourtCase>(`${this.baseUrl}/legal/cases`, payload);
  }

  updateCourtCaseStatus(id: number, newStatus: string, summaryUpdate?: string): Observable<CourtCase> {
    let params = new HttpParams().set('new_status', newStatus);
    if (summaryUpdate) params = params.set('summary_update', summaryUpdate);
    return this.http.put<CourtCase>(`${this.baseUrl}/legal/cases/${id}/status`, null, { params });
  }

  // 3. Machinery & Plant Fleet
  getMachineryAssets(category?: string): Observable<MachineryAsset[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);
    return this.http.get<MachineryAsset[]>(`${this.baseUrl}/machinery/assets`, { params });
  }

  createMachineryAsset(payload: Partial<MachineryAsset>): Observable<MachineryAsset> {
    return this.http.post<MachineryAsset>(`${this.baseUrl}/machinery/assets`, payload);
  }

  assignMachineryProject(
    id: number,
    payload: { project_id?: number; meter_reading?: number; new_status?: string }
  ): Observable<MachineryAsset> {
    let params = new HttpParams();
    if (payload.project_id) params = params.set('project_id', payload.project_id);
    if (payload.meter_reading !== undefined) params = params.set('meter_reading', payload.meter_reading);
    if (payload.new_status) params = params.set('new_status', payload.new_status);
    return this.http.put<MachineryAsset>(`${this.baseUrl}/machinery/assets/${id}/assign`, null, { params });
  }

  // 4. Data Migration Batches
  getImportBatches(entityType?: string): Observable<ImportBatch[]> {
    let params = new HttpParams();
    if (entityType) params = params.set('entity_type', entityType);
    return this.http.get<ImportBatch[]>(`${this.baseUrl}/migration/batches`, { params });
  }

  uploadImportBatch(payload: Partial<ImportBatch>): Observable<ImportBatch> {
    return this.http.post<ImportBatch>(`${this.baseUrl}/migration/import`, payload);
  }
}
