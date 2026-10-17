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
  RFQ,
  ComparativeStatement,
  PurchaseOrder,
  GoodsReceipt,
  QualityInspection,
  MaterialIssueNote,
  StockTransfer,
  StockLedger,
  StoreValuationResponse,
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

  // 3. Site Stores & Valuation
  getSiteStores(projectId?: number, isCentral?: boolean): Observable<SiteStore[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (isCentral !== undefined) params = params.set('is_central', isCentral);
    return this.http.get<SiteStore[]>(`${this.baseUrl}/stores`, { params });
  }

  createSiteStore(payload: any): Observable<SiteStore> {
    return this.http.post<SiteStore>(`${this.baseUrl}/stores`, payload);
  }

  adjustStoreStock(payload: any): Observable<StoreStock> {
    return this.http.post<StoreStock>(`${this.baseUrl}/stores/stock-adjust`, payload);
  }

  getStoreValuationSummary(): Observable<StoreValuationResponse[]> {
    return this.http.get<StoreValuationResponse[]>(`${this.baseUrl}/stores/valuation-summary`);
  }

  getStoreLedger(storeId: number, materialId?: number): Observable<StockLedger[]> {
    let params = new HttpParams();
    if (materialId) params = params.set('material_id', materialId);
    return this.http.get<StockLedger[]>(`${this.baseUrl}/stores/${storeId}/ledger`, { params });
  }

  // 4. Purchase Requisitions (with BOQ Headroom Check)
  getRequisitions(filters?: { project_id?: number; status_filter?: string }): Observable<PurchaseRequisition[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<PurchaseRequisition[]>(`${this.baseUrl}/requisitions`, { params });
  }

  createRequisition(payload: any): Observable<PurchaseRequisition> {
    return this.http.post<PurchaseRequisition>(`${this.baseUrl}/requisitions`, payload);
  }

  // 5. Request for Quotation (RFQ)
  getRFQs(prId?: number): Observable<RFQ[]> {
    let params = new HttpParams();
    if (prId) params = params.set('pr_id', prId);
    return this.http.get<RFQ[]>(`${this.baseUrl}/rfqs`, { params });
  }

  createRFQ(payload: any): Observable<RFQ> {
    return this.http.post<RFQ>(`${this.baseUrl}/rfqs`, payload);
  }

  // 6. Comparative Statements (CS)
  getComparativeStatements(prId?: number): Observable<ComparativeStatement[]> {
    let params = new HttpParams();
    if (prId) params = params.set('pr_id', prId);
    return this.http.get<ComparativeStatement[]>(`${this.baseUrl}/comparative-statements`, { params });
  }

  createComparativeStatement(payload: any): Observable<ComparativeStatement> {
    return this.http.post<ComparativeStatement>(`${this.baseUrl}/comparative-statements`, payload);
  }

  // 7. Purchase Orders (PO)
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

  approvePurchaseOrder(poId: number, payload: any): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${poId}/approve`, payload);
  }

  // 8. Goods Receipt Notes (GRN) & Gate Entry
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

  // 9. Quality Inspection (QC)
  getQualityInspections(grnId?: number): Observable<QualityInspection[]> {
    let params = new HttpParams();
    if (grnId) params = params.set('grn_id', grnId);
    return this.http.get<QualityInspection[]>(`${this.baseUrl}/quality-inspections`, { params });
  }

  createQualityInspection(payload: any): Observable<QualityInspection> {
    return this.http.post<QualityInspection>(`${this.baseUrl}/quality-inspections`, payload);
  }

  // 10. Material Issue Notes (MIN)
  getMaterialIssues(filters?: { project_id?: number; store_id?: number }): Observable<MaterialIssueNote[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.store_id) params = params.set('store_id', filters.store_id);
    return this.http.get<MaterialIssueNote[]>(`${this.baseUrl}/material-issues`, { params });
  }

  createMaterialIssue(payload: any): Observable<MaterialIssueNote> {
    return this.http.post<MaterialIssueNote>(`${this.baseUrl}/material-issues`, payload);
  }

  // 11. Inter-Site Stock Transfers
  getStockTransfers(statusFilter?: string): Observable<StockTransfer[]> {
    let params = new HttpParams();
    if (statusFilter) params = params.set('status_filter', statusFilter);
    return this.http.get<StockTransfer[]>(`${this.baseUrl}/stock-transfers`, { params });
  }

  dispatchStockTransfer(payload: any): Observable<StockTransfer> {
    return this.http.post<StockTransfer>(`${this.baseUrl}/stock-transfers/dispatch`, payload);
  }

  receiveStockTransfer(transferId: number, payload: any): Observable<StockTransfer> {
    return this.http.put<StockTransfer>(`${this.baseUrl}/stock-transfers/${transferId}/receive`, payload);
  }

  // 12. Procurement KPI Metrics
  getMetrics(): Observable<ProcurementMetrics> {
    return this.http.get<ProcurementMetrics>(`${this.baseUrl}/metrics`);
  }
}
