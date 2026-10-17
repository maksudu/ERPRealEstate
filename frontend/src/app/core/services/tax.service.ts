import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TaxWithholdingRule,
  TaxZoneRate,
  TDSVDSCalculationRequest,
  TDSVDSCalculationResponse,
  AITSection53FFRequest,
  AITSection53FFResponse,
  Mushak63Invoice,
  Mushak65Challan,
  TaxTreasuryChallan
} from '../models/tax.model';
import { TDSDeduction } from '../models/accounts.model';

@Injectable({
  providedIn: 'root'
})
export class TaxService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/tax`;
  private accountsUrl = `${environment.apiUrl}/accounts`;

  // 1. Mushak 6.3 VAT Tax Invoices
  getMushak63Invoices(bookingId?: number): Observable<Mushak63Invoice[]> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get<Mushak63Invoice[]>(`${this.baseUrl}/mushak-6-3`, { params });
  }

  getMushak63Invoice(id: number): Observable<Mushak63Invoice> {
    return this.http.get<Mushak63Invoice>(`${this.baseUrl}/mushak-6-3/${id}`);
  }

  generateMushak63(payload: {
    booking_id: number;
    taxable_amount: number;
    customer_tin_nid?: string;
    apartment_type?: string;
  }): Observable<Mushak63Invoice> {
    return this.http.post<Mushak63Invoice>(`${this.baseUrl}/mushak-6-3`, payload);
  }

  getMushak63PdfUrl(invoiceId: number): string {
    return `${this.baseUrl}/mushak-6-3/${invoiceId}/pdf`;
  }

  // 2. Mushak 6.5 Material & Subcontractor Transfer Challans
  getMushak65Challans(projectId?: number): Observable<Mushak65Challan[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<Mushak65Challan[]>(`${this.baseUrl}/mushak-6-5`, { params });
  }

  createMushak65(payload: any): Observable<Mushak65Challan> {
    return this.http.post<Mushak65Challan>(`${this.baseUrl}/mushak-6-5`, payload);
  }

  getMushak65PdfUrl(challanId: number): string {
    return `${this.baseUrl}/mushak-6-5/${challanId}/pdf`;
  }

  // 3. Automated TDS & VDS Calculator
  calculateTDSVDS(payload: TDSVDSCalculationRequest): Observable<TDSVDSCalculationResponse> {
    return this.http.post<TDSVDSCalculationResponse>(`${this.baseUrl}/tds-calculator`, payload);
  }

  // 4. Section 53FF Advance Income Tax (AIT) Calculator
  calculateAITSection53FF(payload: AITSection53FFRequest): Observable<AITSection53FFResponse> {
    return this.http.post<AITSection53FFResponse>(`${this.baseUrl}/ait-section-53ff`, payload);
  }

  // 5. Dynamic Withholding Rules
  getWithholdingRules(): Observable<TaxWithholdingRule[]> {
    return this.http.get<TaxWithholdingRule[]>(`${this.baseUrl}/withholding-rules`);
  }

  createWithholdingRule(payload: Partial<TaxWithholdingRule>): Observable<TaxWithholdingRule> {
    return this.http.post<TaxWithholdingRule>(`${this.baseUrl}/withholding-rules`, payload);
  }

  // 6. Dynamic Section 53FF Tax Zones
  getTaxZones(): Observable<TaxZoneRate[]> {
    return this.http.get<TaxZoneRate[]>(`${this.baseUrl}/tax-zones`);
  }

  createTaxZone(payload: Partial<TaxZoneRate>): Observable<TaxZoneRate> {
    return this.http.post<TaxZoneRate>(`${this.baseUrl}/tax-zones`, payload);
  }

  // 7. Treasury Challans
  getTreasuryChallans(): Observable<TaxTreasuryChallan[]> {
    return this.http.get<TaxTreasuryChallan[]>(`${this.baseUrl}/treasury-challans`);
  }

  createTreasuryChallan(payload: Partial<TaxTreasuryChallan>): Observable<TaxTreasuryChallan> {
    return this.http.post<TaxTreasuryChallan>(`${this.baseUrl}/treasury-challans`, payload);
  }

  // 8. TDS Deductions & Statutory Certificates
  getTDSDeductions(filters?: { section_filter?: string; status_filter?: string }): Observable<TDSDeduction[]> {
    let params = new HttpParams();
    if (filters?.section_filter) params = params.set('section_filter', filters.section_filter);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<TDSDeduction[]>(`${this.accountsUrl}/tax-withholding`, { params });
  }

  createTDSDeduction(payload: any): Observable<TDSDeduction> {
    return this.http.post<TDSDeduction>(`${this.accountsUrl}/tax-withholding`, payload);
  }

  depositTDSToTreasury(tdsId: number, payload: { challan_number: string; challan_deposit_date: string }): Observable<TDSDeduction> {
    return this.http.patch<TDSDeduction>(`${this.accountsUrl}/tax-withholding/${tdsId}/deposit`, payload);
  }

  getForm54PdfUrl(tdsId: number): string {
    return `${this.baseUrl}/certificates/form-54/${tdsId}/pdf`;
  }

  getMushak66PdfUrl(tdsId: number): string {
    return `${this.baseUrl}/certificates/mushak-6-6/${tdsId}/pdf`;
  }
}
