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
  StockAdjustmentRecord,
  StockLedger,
  StoreValuationResponse,
  ValuationMethodComparison,
  StockAgingReportItem,
  PeriodEndReconciliation,
  ProcurementMetrics,
  ReorderAlertItem,
  SupplierBill,
  AuditTrailItem
} from '../models/procurement.model';

@Injectable({
  providedIn: 'root'
})
export class ProcurementService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/procurement`;

  // 1. Vendors Master
  getVendors(search?: string, tradeCategory?: string, limit = 50, offset = 0): Observable<Vendor[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (tradeCategory) params = params.set('trade_category', tradeCategory);
    params = params.set('limit', limit).set('offset', offset);
    return this.http.get<Vendor[]>(`${this.baseUrl}/vendors`, { params });
  }

  createVendor(payload: any): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/vendors`, payload);
  }

  updateVendor(id: number, payload: any): Observable<Vendor> {
    return this.http.put<Vendor>(`${this.baseUrl}/vendors/${id}`, payload);
  }

  deleteVendor(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/vendors/${id}`);
  }

  vendorWorkflow(id: number, payload: { action: string; notes?: string }): Observable<Vendor> {
    return this.http.post<Vendor>(`${this.baseUrl}/vendors/${id}/workflow`, payload);
  }

  getVendorApprovalHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/vendors/${id}/history`);
  }

  getVendorExpiryAlerts(days = 60): Observable<Vendor[]> {
    return this.http.get<Vendor[]>(`${this.baseUrl}/vendors/expiry-alerts`, { params: new HttpParams().set('days', days) });
  }

  // 2. Materials Master
  getMaterials(search?: string, category?: string, limit = 50, offset = 0): Observable<MaterialItem[]> {
    let params = new HttpParams().set('limit', limit).set('offset', offset);
    if (search) params = params.set('search', search);
    if (category) params = params.set('category', category);
    return this.http.get<MaterialItem[]>(`${this.baseUrl}/materials`, { params });
  }

  createMaterial(payload: any): Observable<MaterialItem> {
    return this.http.post<MaterialItem>(`${this.baseUrl}/materials`, payload);
  }

  updateMaterial(id: number, payload: any): Observable<MaterialItem> {
    return this.http.put<MaterialItem>(`${this.baseUrl}/materials/${id}`, payload);
  }

  deleteMaterial(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/materials/${id}`);
  }

  // 3. Site Stores & Valuation
  getSiteStores(filters?: { project_id?: number; is_central?: boolean; search?: string; limit?: number; offset?: number } | number, isCentral?: boolean): Observable<SiteStore[]> {
    let params = new HttpParams();
    if (typeof filters === 'number') {
      params = params.set('project_id', filters);
      if (isCentral !== undefined) params = params.set('is_central', isCentral);
    } else if (filters) {
      if (filters.project_id) params = params.set('project_id', filters.project_id);
      if (filters.is_central !== undefined) params = params.set('is_central', filters.is_central);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.limit) params = params.set('limit', filters.limit);
      if (filters.offset) params = params.set('offset', filters.offset);
    }
    return this.http.get<SiteStore[]>(`${this.baseUrl}/stores`, { params });
  }

  getSiteStore(id: number): Observable<SiteStore> {
    return this.http.get<SiteStore>(`${this.baseUrl}/stores/${id}`);
  }

  createSiteStore(payload: any): Observable<SiteStore> {
    return this.http.post<SiteStore>(`${this.baseUrl}/stores`, payload);
  }

  updateSiteStore(id: number, payload: any): Observable<SiteStore> {
    return this.http.put<SiteStore>(`${this.baseUrl}/stores/${id}`, payload);
  }

  deleteSiteStore(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/stores/${id}`);
  }

  reserveStoreStock(payload: any): Observable<StoreStock> {
    return this.http.post<StoreStock>(`${this.baseUrl}/stores/stock-reservation`, payload);
  }

  recordCycleCount(payload: any): Observable<StoreStock> {
    return this.http.post<StoreStock>(`${this.baseUrl}/stores/cycle-count`, payload);
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
  getRequisitions(filters?: { project_id?: number; status_filter?: string; search?: string; limit?: number; offset?: number }): Observable<PurchaseRequisition[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<PurchaseRequisition[]>(`${this.baseUrl}/requisitions`, { params });
  }

  createRequisition(payload: any): Observable<PurchaseRequisition> {
    return this.http.post<PurchaseRequisition>(`${this.baseUrl}/requisitions`, payload);
  }

  getRequisitionAvailability(projectId: number, materialId: number, requestedQuantity: number): Observable<any> {
    const params = new HttpParams()
      .set('project_id', projectId)
      .set('material_id', materialId)
      .set('requested_quantity', requestedQuantity);
    return this.http.get<any>(`${this.baseUrl}/requisitions/availability`, { params });
  }

  updateRequisition(id: number, payload: any): Observable<PurchaseRequisition> {
    return this.http.put<PurchaseRequisition>(`${this.baseUrl}/requisitions/${id}`, payload);
  }

  executePRWorkflow(id: number, payload: { action: string; notes?: string; approved_quantity?: number }): Observable<PurchaseRequisition> {
    return this.http.post<PurchaseRequisition>(`${this.baseUrl}/requisitions/${id}/workflow`, payload);
  }

  getPRWorkflowHistory(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/requisitions/${id}/history`);
  }

  deleteRequisition(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/requisitions/${id}`);
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

  decideComparativeStatement(id: number, payload: { approved: boolean; decision_notes: string; awards: { vendor_id: number; quantity: number; rationale?: string }[] }): Observable<ComparativeStatement> {
    return this.http.post<ComparativeStatement>(`${this.baseUrl}/comparative-statements/${id}/committee-decision`, payload);
  }

  // 7. Purchase Orders (PO)
  getPurchaseOrders(filters?: { project_id?: number; vendor_id?: number; status_filter?: string; search?: string; limit?: number; offset?: number }): Observable<PurchaseOrder[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.vendor_id) params = params.set('vendor_id', filters.vendor_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<PurchaseOrder[]>(`${this.baseUrl}/purchase-orders`, { params });
  }

  createDirectPurchaseOrder(payload: any): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/direct`, payload);
  }

  generatePOFromCS(payload: any): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/generate-from-cs`, payload);
  }

  updatePurchaseOrder(poId: number, payload: any): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${poId}`, payload);
  }

  approvePurchaseOrder(poId: number, payload: any): Observable<PurchaseOrder> {
    return this.http.put<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${poId}/approve`, payload);
  }

  sendPurchaseOrderToSupplier(poId: number): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${poId}/send`, {});
  }

  submitDraftPurchaseOrder(poId: number): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${this.baseUrl}/purchase-orders/${poId}/submit`, {});
  }

  deletePurchaseOrder(poId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/purchase-orders/${poId}`);
  }

  // 8. Goods Receipt Notes (GRN) & Gate Entry
  getGoodsReceipts(filters?: { po_id?: number; pr_id?: number; match_status?: string; qc_status?: string; search?: string; limit?: number; offset?: number }): Observable<GoodsReceipt[]> {
    let params = new HttpParams();
    if (filters?.po_id) params = params.set('po_id', filters.po_id);
    if (filters?.pr_id) params = params.set('pr_id', filters.pr_id);
    if (filters?.match_status) params = params.set('match_status', filters.match_status);
    if (filters?.qc_status) params = params.set('qc_status', filters.qc_status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<GoodsReceipt[]>(`${this.baseUrl}/goods-receipts`, { params });
  }

  getGoodsReceipt(grnId: number): Observable<GoodsReceipt> {
    return this.http.get<GoodsReceipt>(`${this.baseUrl}/goods-receipts/${grnId}`);
  }

  createGoodsReceipt(payload: any): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(`${this.baseUrl}/goods-receipts`, payload);
  }

  updateGoodsReceipt(grnId: number, payload: any): Observable<GoodsReceipt> {
    return this.http.put<GoodsReceipt>(`${this.baseUrl}/goods-receipts/${grnId}`, payload);
  }

  deleteGoodsReceipt(grnId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/goods-receipts/${grnId}`);
  }

  executeThreeWayMatch(grnId: number, payload: any): Observable<GoodsReceipt> {
    return this.http.post<GoodsReceipt>(`${this.baseUrl}/goods-receipts/${grnId}/3way-match`, payload);
  }

  // 9. Quality Inspection (QC)
  getQualityInspections(filters?: { grn_id?: number; test_result?: string; search?: string; limit?: number; offset?: number }): Observable<QualityInspection[]> {
    let params = new HttpParams();
    if (filters?.grn_id) params = params.set('grn_id', filters.grn_id);
    if (filters?.test_result) params = params.set('test_result', filters.test_result);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<QualityInspection[]>(`${this.baseUrl}/quality-inspections`, { params });
  }

  getQualityInspection(qcId: number): Observable<QualityInspection> {
    return this.http.get<QualityInspection>(`${this.baseUrl}/quality-inspections/${qcId}`);
  }

  createQualityInspection(payload: any): Observable<QualityInspection> {
    return this.http.post<QualityInspection>(`${this.baseUrl}/quality-inspections`, payload);
  }

  updateQualityInspection(qcId: number, payload: any): Observable<QualityInspection> {
    return this.http.put<QualityInspection>(`${this.baseUrl}/quality-inspections/${qcId}`, payload);
  }

  deleteQualityInspection(qcId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/quality-inspections/${qcId}`);
  }

  // 10. Material Issue Notes (MIN)
  getMaterialIssues(filters?: { project_id?: number; store_id?: number; search?: string; limit?: number; offset?: number }): Observable<MaterialIssueNote[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.store_id) params = params.set('store_id', filters.store_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<MaterialIssueNote[]>(`${this.baseUrl}/material-issues`, { params });
  }

  getMaterialIssue(minId: number): Observable<MaterialIssueNote> {
    return this.http.get<MaterialIssueNote>(`${this.baseUrl}/material-issues/${minId}`);
  }

  createMaterialIssue(payload: any): Observable<MaterialIssueNote> {
    return this.http.post<MaterialIssueNote>(`${this.baseUrl}/material-issues`, payload);
  }

  updateMaterialIssue(minId: number, payload: any): Observable<MaterialIssueNote> {
    return this.http.put<MaterialIssueNote>(`${this.baseUrl}/material-issues/${minId}`, payload);
  }

  deleteMaterialIssue(minId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/material-issues/${minId}`);
  }

  createMaterialReturn(payload: any): Observable<MaterialIssueNote> {
    return this.http.post<MaterialIssueNote>(`${this.baseUrl}/material-issues/returns`, payload);
  }

  getConsumptionReconciliationReport(projectId?: number): Observable<any[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any[]>(`${this.baseUrl}/material-issues/reconciliation-report`, { params });
  }

  // 11. Inter-Site Stock Transfers
  getStockTransfers(paramsObj?: { search?: string; status_filter?: string; from_store_id?: number; to_store_id?: number; limit?: number; offset?: number }): Observable<StockTransfer[]> {
    let params = new HttpParams();
    if (paramsObj?.status_filter) params = params.set('status_filter', paramsObj.status_filter);
    if (paramsObj?.from_store_id) params = params.set('from_store_id', paramsObj.from_store_id);
    if (paramsObj?.to_store_id) params = params.set('to_store_id', paramsObj.to_store_id);
    if (paramsObj?.search) params = params.set('search', paramsObj.search);
    if (paramsObj?.limit) params = params.set('limit', paramsObj.limit);
    if (paramsObj?.offset !== undefined) params = params.set('offset', paramsObj.offset);
    return this.http.get<StockTransfer[]>(`${this.baseUrl}/stock-transfers`, { params });
  }

  dispatchStockTransfer(payload: any): Observable<StockTransfer> {
    return this.http.post<StockTransfer>(`${this.baseUrl}/stock-transfers/dispatch`, payload);
  }

  receiveStockTransfer(transferId: number, payload: any): Observable<StockTransfer> {
    return this.http.put<StockTransfer>(`${this.baseUrl}/stock-transfers/${transferId}/receive`, payload);
  }

  cancelStockTransfer(transferId: number, reason?: string): Observable<StockTransfer> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    return this.http.post<StockTransfer>(`${this.baseUrl}/stock-transfers/${transferId}/cancel`, {}, { params });
  }

  // Stock Adjustments
  getStockAdjustments(paramsObj?: { store_id?: number; search?: string; limit?: number; offset?: number }): Observable<StockAdjustmentRecord[]> {
    let params = new HttpParams();
    if (paramsObj?.store_id) params = params.set('store_id', paramsObj.store_id);
    if (paramsObj?.search) params = params.set('search', paramsObj.search);
    if (paramsObj?.limit) params = params.set('limit', paramsObj.limit);
    if (paramsObj?.offset !== undefined) params = params.set('offset', paramsObj.offset);
    return this.http.get<StockAdjustmentRecord[]>(`${this.baseUrl}/stock-adjustments`, { params });
  }

  reverseStockAdjustment(ledgerId: number, payload: { reversal_reason: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/stock-adjustments/${ledgerId}/reverse`, payload);
  }

  // 12. Procurement KPI Metrics
  getMetrics(): Observable<ProcurementMetrics> {
    return this.http.get<ProcurementMetrics>(`${this.baseUrl}/metrics`);
  }

  // 13. Planning & Reorder Alerts
  getReorderAlerts(paramsObj?: { store_id?: number; project_id?: number; category?: string }): Observable<ReorderAlertItem[]> {
    let params = new HttpParams();
    if (paramsObj?.store_id) params = params.set('store_id', paramsObj.store_id);
    if (paramsObj?.project_id) params = params.set('project_id', paramsObj.project_id);
    if (paramsObj?.category) params = params.set('category', paramsObj.category);
    return this.http.get<ReorderAlertItem[]>(`${this.baseUrl}/planning/reorder-alerts`, { params });
  }

  // Inventory Movement Ledger & Valuation
  getInventoryLedger(paramsObj?: { store_id?: number; material_id?: number; transaction_type?: string; search?: string; limit?: number; offset?: number }): Observable<StockLedger[]> {
    let params = new HttpParams();
    if (paramsObj?.store_id) params = params.set('store_id', paramsObj.store_id);
    if (paramsObj?.material_id) params = params.set('material_id', paramsObj.material_id);
    if (paramsObj?.transaction_type) params = params.set('transaction_type', paramsObj.transaction_type);
    if (paramsObj?.search) params = params.set('search', paramsObj.search);
    if (paramsObj?.limit) params = params.set('limit', paramsObj.limit);
    if (paramsObj?.offset !== undefined) params = params.set('offset', paramsObj.offset);
    return this.http.get<StockLedger[]>(`${this.baseUrl}/inventory-ledger`, { params });
  }

  getValuationMethodComparison(): Observable<ValuationMethodComparison[]> {
    return this.http.get<ValuationMethodComparison[]>(`${this.baseUrl}/valuation-comparison`);
  }

  getStockAgingReport(): Observable<StockAgingReportItem[]> {
    return this.http.get<StockAgingReportItem[]>(`${this.baseUrl}/stock-aging-report`);
  }

  getPeriodEndReconciliation(): Observable<PeriodEndReconciliation> {
    return this.http.get<PeriodEndReconciliation>(`${this.baseUrl}/period-end-reconciliation`);
  }

  // 14. Supplier Bills & Payment Reconciliation
  getSupplierBills(paramsObj?: { status_filter?: string; search?: string; vendor_id?: number; limit?: number; offset?: number }): Observable<SupplierBill[]> {
    let params = new HttpParams();
    if (paramsObj?.status_filter) params = params.set('status_filter', paramsObj.status_filter);
    if (paramsObj?.search) params = params.set('search', paramsObj.search);
    if (paramsObj?.vendor_id) params = params.set('vendor_id', paramsObj.vendor_id);
    if (paramsObj?.limit) params = params.set('limit', paramsObj.limit);
    if (paramsObj?.offset !== undefined) params = params.set('offset', paramsObj.offset);
    return this.http.get<SupplierBill[]>(`${this.baseUrl}/supplier-bills`, { params });
  }

  reconcileSupplierBill(grnId: number, payload: any): Observable<SupplierBill> {
    return this.http.post<SupplierBill>(`${this.baseUrl}/supplier-bills/${grnId}/reconcile`, payload);
  }

  recordSupplierBillPayment(grnId: number, payload: any): Observable<SupplierBill> {
    return this.http.post<SupplierBill>(`${this.baseUrl}/supplier-bills/${grnId}/payment`, payload);
  }

  issueSupplierDebitNote(grnId: number, payload: any): Observable<SupplierBill> {
    return this.http.post<SupplierBill>(`${this.baseUrl}/supplier-bills/${grnId}/debit-note`, payload);
  }

  // 15. Audit Trail & Ledger Reports
  getAuditTrail(limit: number = 50): Observable<AuditTrailItem[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<AuditTrailItem[]>(`${this.baseUrl}/audit-trail`, { params });
  }
}
