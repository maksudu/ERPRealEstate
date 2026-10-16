import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Vendor,
  MaterialItem,
  SiteStore,
  StoreStock,
  PurchaseRequisition,
  ComparativeStatement,
  PurchaseOrder,
  GoodsReceipt,
  ProcurementMetrics
} from '../models/procurement.model';

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/procurement`;

  // 1. Vendors Master
  getVendors(): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(`${this.baseUrl}/vendors`);
  }

  createVendor(payload: any): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/vendors`, payload);
  }

  // 2. Materials Master
  getMaterials(): Observable<MaterialItem[]> {
    return this.http.get<MaterialItem[]>(`${this.baseUrl}/materials`);
  }

  createMaterial(payload: any): Observable<MaterialItem> {
    return this.http.post<MaterialItem>(`${this.baseUrl}/materials`, payload);
  }

  // 3. Site Stores & Inventory
  getSiteStores(projectId?: number): Observable<SiteStore[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<SiteStore[]>(`${this.baseUrl}/stores`, { params });
  }

  createSiteStore(payload: any): Observable<SiteStore> {
    return this.http.post<SiteStore>(`${this.baseUrl}/stores`, payload);
  }

  adjustStoreStock(payload: any): Observable<StoreStock> {
    return this.http.post<StoreStock>(`${this.baseUrl}/stores/stock-adjust`, payload);
  }

  // 4. Purchase Requisitions
  getRequisitions(filters?: { project_id?: number; status_filter?: string }): Observable<PurchaseRequisition[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<PurchaseRequisition[]>(`${this.baseUrl}/requisitions`, { params });
  }

  createRequisition(payload: any): Observable<PurchaseRequisition> {
    return this.http.post<PurchaseRequisition>(`${this.baseUrl}/requisitions`, payload);
  }

  // 5. Comparative Statements (CS)
  getComparativeStatements(prId?: number): Observable<ComparativeStatement[]> {
    let params = new HttpParams();
    if (prId) params = params.set('pr_id', prId);
    return this.http.get<ComparativeStatement[]>(`${this.baseUrl}/comparative-statements`, { params });
  }

  createComparativeStatement(payload: any): Observable<ComparativeStatement> {
    return this.http.post<ComparativeStatement>(`${this.baseUrl}/comparative-statements`, payload);
  }

  // 6. Purchase Orders (PO)
  getPurchaseOrders(filters?: { project_id?: number; vendor_id?: number; status_filter?: string }): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.vendor_id) params = params.set('vendor_id', filters.vendor_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<PurchaseOrder[]>(`${this.baseUrl}/purchase-orders`, { params });
  }

  generatePOFromCS(payload: any): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/generate-from-cs`, payload);
  }

  // 7. Goods Receipt Notes (GRN) & 3-Way Match
  getGoodsReceipts(filters?: { po_id?: number; match_status?: string }): Observable<GoodsReceipt[]> {
    let params = new HttpParams();
    if (filters?.po_id) params = params.set('po_id', filters.po_id);
    if (filters?.match_status) params = params.set('match_status', filters.match_status);
    return this.http.get<GoodsReceipt[]>(`${this.baseUrl}/goods-receipts`, { params });
  }

  createGoodsReceipt(payload: any): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(`${this.baseUrl}/goods-receipts`, payload);
  }

  executeThreeWayMatch(grnId: number, payload: any): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(`${this.baseUrl}/goods-receipts/${grnId}/3way-match`, payload);
  }

  // 8. Procurement KPI Metrics
  getMetrics(): Observable<ProcurementMetrics> {
    return this.http.get<ProcurementMetrics>(`${this.baseUrl}/metrics`);
  }
}
