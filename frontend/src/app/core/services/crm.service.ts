import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Lead, 
  LeadActivity, 
  Customer, 
  Nominee, 
  LeadConversionMetrics 
} from '../models/crm.model';

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/crm`;

  // 1. Leads & Kanban
  getLeads(filters?: { lead_stage?: string; search?: string; sales_rep_id?: number }): Observable<Lead[]> {
    let params = new HttpParams();
    if (filters?.lead_stage) params = params.set('lead_stage', filters.lead_stage);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.sales_rep_id) params = params.set('sales_rep_id', filters.sales_rep_id);
    return this.http.get<Lead[]>(`${this.baseUrl}/leads`, { params });
  }

  createLead(payload: any): Observable<Lead> {
    return this.http.post<Lead>(`${this.baseUrl}/leads`, payload);
  }

  updateLeadStage(leadId: number, stage: string, notes?: string): Observable<Lead> {
    return this.http.put<Lead>(`${this.baseUrl}/leads/${leadId}/stage`, {
      lead_stage: stage,
      notes: notes
    });
  }

  // 2. Activities (Call Logs, Site Visit Schedulers)
  logLeadActivity(leadId: number, payload: Partial<LeadActivity>): Observable<LeadActivity> {
    return this.http.post<LeadActivity>(`${this.baseUrl}/leads/${leadId}/activities`, {
      ...payload,
      lead_id: leadId
    });
  }

  // 3. Customers KYC & Nominees
  getCustomers(filters?: { search?: string; is_nrb?: boolean }): Observable<Customer[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.is_nrb !== undefined) params = params.set('is_nrb', filters.is_nrb);
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`, { params });
  }

  createCustomer(payload: any): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/customers`, payload);
  }

  addNominee(customerId: number, payload: Nominee): Observable<Nominee> {
    return this.http.post<Nominee>(`${this.baseUrl}/customers/${customerId}/nominees`, payload);
  }

  // 4. Conversion Analytics & Reports
  getConversionMetrics(): Observable<LeadConversionMetrics> {
    return this.http.get<LeadConversionMetrics>(`${this.baseUrl}/reports/conversion`);
  }

  // 5. Facebook Webhook Simulation Trigger
  simulateFacebookLead(payload: { lead_name: string; phone_number: string; email?: string; campaign_name?: string; interested_project_code?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/webhooks/facebook`, payload);
  }
}
