import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChartOfAccount,
  Voucher,
  BankReconciliation,
  TrialBalanceReport,
  ProfitLossReport,
  BalanceSheetReport,
  MushakTaxInvoice,
  TDSDeduction,
  SubRegistryCalculationRequest,
  SubRegistryCalculationResponse,
  CashBox,
  PettyCashVoucher,
  CashCountAuditRequest,
  CashTransferRequest,
  BankAccount,
  BankTransaction,
  BankTransferRequest,
  ChequeLeafItem,
  MFSProvider,
  MFSTransaction,
  MFSCallbackSimulationRequest,
  CashBankPositionKPIs,
  PaymentVoucher,
  PaymentVoucherWorkflowAction,
  PaymentVoucherKPIs
} from '../models/accounts.model';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/accounts`;

  // 1. Chart of Accounts (COA)
  getCOA(filters?: string | { account_type?: string; search?: string; parent_account_id?: number; is_leaf_account?: boolean; limit?: number; offset?: number }): Observable<ChartOfAccount[]> {
    let params = new HttpParams();
    if (typeof filters === 'string') {
      if (filters) params = params.set('account_type', filters);
    } else if (filters) {
      if (filters.account_type) params = params.set('account_type', filters.account_type);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.parent_account_id !== undefined && filters.parent_account_id !== null) params = params.set('parent_account_id', filters.parent_account_id);
      if (filters.is_leaf_account !== undefined) params = params.set('is_leaf_account', filters.is_leaf_account);
      if (filters.limit) params = params.set('limit', filters.limit);
      if (filters.offset) params = params.set('offset', filters.offset);
    }
    return this.http.get<ChartOfAccount[]>(`${this.baseUrl}/coa`, { params });
  }

  getAccountById(id: number): Observable<ChartOfAccount> {
    return this.http.get<ChartOfAccount>(`${this.baseUrl}/coa/${id}`);
  }

  createAccount(payload: any): Observable<ChartOfAccount> {
    return this.http.post<ChartOfAccount>(`${this.baseUrl}/coa`, payload);
  }

  updateAccount(id: number, payload: any): Observable<ChartOfAccount> {
    return this.http.put<ChartOfAccount>(`${this.baseUrl}/coa/${id}`, payload);
  }

  // 2. Vouchers & Double-Entry Journal
  getVouchers(filters?: { voucher_type?: string; project_id?: number; status_filter?: string; search?: string; date_from?: string; date_to?: string; limit?: number; offset?: number }): Observable<Voucher[]> {
    let params = new HttpParams();
    if (filters?.voucher_type) params = params.set('voucher_type', filters.voucher_type);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<Voucher[]>(`${this.baseUrl}/vouchers`, { params });
  }

  getVoucherById(id: number): Observable<Voucher> {
    return this.http.get<Voucher>(`${this.baseUrl}/vouchers/${id}`);
  }

  createVoucher(payload: any): Observable<Voucher> {
    return this.http.post<Voucher>(`${this.baseUrl}/vouchers`, payload);
  }

  reverseVoucher(voucherId: number): Observable<Voucher> {
    return this.http.post<Voucher>(`${this.baseUrl}/vouchers/${voucherId}/reverse`, {});
  }

  // General Ledger (GL) Inquiry
  getGeneralLedger(filters?: { account_id?: number; project_id?: number; date_from?: string; date_to?: string; search?: string; limit?: number; offset?: number }): Observable<import('../models/accounts.model').GeneralLedgerInquiryResponse> {
    let params = new HttpParams();
    if (filters?.account_id) params = params.set('account_id', filters.account_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<import('../models/accounts.model').GeneralLedgerInquiryResponse>(`${this.baseUrl}/ledger`, { params });
  }

  // 3. Bank & MFS Reconciliation
  getBankReconciliations(): Observable<BankReconciliation[]> {
    return this.http.get<BankReconciliation[]>(`${this.baseUrl}/bank-reconciliation`);
  }

  createBankReconciliation(payload: any): Observable<BankReconciliation> {
    return this.http.post<BankReconciliation>(`${this.baseUrl}/bank-reconciliation`, payload);
  }

  // 4. Financial Reports
  getTrialBalance(asOfDate?: string): Observable<TrialBalanceReport> {
    let params = new HttpParams();
    if (asOfDate) params = params.set('as_of_date', asOfDate);
    return this.http.get<TrialBalanceReport>(`${this.baseUrl}/reports/trial-balance`, { params });
  }

  getProfitLoss(filters?: { from_date?: string; to_date?: string; project_id?: number }): Observable<ProfitLossReport> {
    let params = new HttpParams();
    if (filters?.from_date) params = params.set('from_date', filters.from_date);
    if (filters?.to_date) params = params.set('to_date', filters.to_date);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    return this.http.get<ProfitLossReport>(`${this.baseUrl}/reports/profit-loss`, { params });
  }

  getBalanceSheet(asOfDate?: string): Observable<BalanceSheetReport> {
    let params = new HttpParams();
    if (asOfDate) params = params.set('as_of_date', asOfDate);
    return this.http.get<BalanceSheetReport>(`${this.baseUrl}/reports/balance-sheet`, { params });
  }

  // 5. Bangladesh VAT & Mushak 6.3 Tax Invoices
  getMushakInvoices(bookingId?: number): Observable<MushakTaxInvoice[]> {
    let params = new HttpParams();
    if (bookingId) params = params.set('booking_id', bookingId);
    return this.http.get<MushakTaxInvoice[]>(`${this.baseUrl}/vat-mushak`, { params });
  }

  generateMushakInvoice(payload: any): Observable<MushakTaxInvoice> {
    return this.http.post<MushakTaxInvoice>(`${this.baseUrl}/vat-mushak`, payload);
  }

  // 6. TDS & VDS Tax Withholding
  getTDSDeductions(filters?: { section_filter?: string; status_filter?: string }): Observable<TDSDeduction[]> {
    let params = new HttpParams();
    if (filters?.section_filter) params = params.set('section_filter', filters.section_filter);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    return this.http.get<TDSDeduction[]>(`${this.baseUrl}/tax-withholding`, { params });
  }

  createTDSDeduction(payload: any): Observable<TDSDeduction> {
    return this.http.post<TDSDeduction>(`${this.baseUrl}/tax-withholding`, payload);
  }

  depositTDSToTreasury(tdsId: number, payload: any): Observable<TDSDeduction> {
    return this.http.patch<TDSDeduction>(`${this.baseUrl}/tax-withholding/${tdsId}/deposit`, payload);
  }

  // 7. Sub-Registry & Section 53FF AIT Calculator
  calculateSubRegistryFees(payload: SubRegistryCalculationRequest): Observable<SubRegistryCalculationResponse> {
    return this.http.post<SubRegistryCalculationResponse>(`${this.baseUrl}/sub-registry-calc`, payload);
  }

  // 8. 5-Tier Hierarchical Chart of Accounts
  getCOAHierarchy(organizationId: number = 1): Observable<import('../models/accounts.model').ChartOfAccountTreeNode[]> {
    return this.http.get<import('../models/accounts.model').ChartOfAccountTreeNode[]>(`${this.baseUrl}/coa/hierarchy?organization_id=${organizationId}`);
  }

  // 9. Cost Centers & Variance
  getCostCenters(projectId?: number): Observable<import('../models/accounts.model').CostCenter[]> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<import('../models/accounts.model').CostCenter[]>(`${this.baseUrl}/cost-centers`, { params });
  }

  createCostCenter(payload: any): Observable<import('../models/accounts.model').CostCenter> {
    return this.http.post<import('../models/accounts.model').CostCenter>(`${this.baseUrl}/cost-centers`, payload);
  }

  getCostCenterVarianceReport(projectId?: number): Observable<any> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<any>(`${this.baseUrl}/cost-centers/variance`, { params });
  }

  // 10. Fiscal Years
  getFiscalYears(): Observable<import('../models/accounts.model').FiscalYear[]> {
    return this.http.get<import('../models/accounts.model').FiscalYear[]>(`${this.baseUrl}/fiscal-years`);
  }

  createFiscalYear(payload: any): Observable<import('../models/accounts.model').FiscalYear> {
    return this.http.post<import('../models/accounts.model').FiscalYear>(`${this.baseUrl}/fiscal-years`, payload);
  }

  closeFiscalYear(id: number): Observable<import('../models/accounts.model').FiscalYear> {
    return this.http.patch<import('../models/accounts.model').FiscalYear>(`${this.baseUrl}/fiscal-years/${id}/close`, {});
  }

  // 11. CWIP Capitalization
  getCWIPSummary(projectId: number): Observable<import('../models/accounts.model').CWIPSummary> {
    return this.http.get<import('../models/accounts.model').CWIPSummary>(`${this.baseUrl}/cwip/summary?project_id=${projectId}`);
  }

  capitalizeCWIP(payload: import('../models/accounts.model').CWIPCapitalizeRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cwip/capitalize`, payload);
  }

  // 12. IFRS-15 Revenue Recognition
  recognizeIFRS15Revenue(payload: import('../models/accounts.model').IFRS15RecognizeRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/ifrs15/recognize`, payload);
  }

  // 13. PDC Vault & Safe Management
  getPDCVault(filters?: { project_id?: number; status?: string }): Observable<import('../models/accounts.model').PDCVaultCheque[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<import('../models/accounts.model').PDCVaultCheque[]>(`${this.baseUrl}/pdc`, { params });
  }

  createPDC(payload: any): Observable<import('../models/accounts.model').PDCVaultCheque> {
    return this.http.post<import('../models/accounts.model').PDCVaultCheque>(`${this.baseUrl}/pdc`, payload);
  }

  updatePDCStatus(id: number, payload: { status: string; bounce_reason?: string; bank_account_id?: number }): Observable<import('../models/accounts.model').PDCVaultCheque> {
    return this.http.patch<import('../models/accounts.model').PDCVaultCheque>(`${this.baseUrl}/pdc/${id}/status`, payload);
  }

  // 14. Smart Bank Statement Auto-Matching
  autoMatchBankStatement(payload: { bank_account_id: number; statement_date: string; statement_balance: number; rows: import('../models/accounts.model').BankStatementRow[] }): Observable<import('../models/accounts.model').BankReconciliationFullResponse> {
    return this.http.post<import('../models/accounts.model').BankReconciliationFullResponse>(`${this.baseUrl}/bank-reconciliation/auto-match`, payload);
  }

  // 15. Accounts Payable (AP) & Supplier/Contractor Invoices
  getAPSummaryKPIs(projectId?: number): Observable<import('../models/accounts.model').APSummaryKPIs> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<import('../models/accounts.model').APSummaryKPIs>(`${this.baseUrl}/payables/kpis`, { params });
  }

  getAPInvoices(filters?: {
    search?: string;
    invoice_type?: string;
    status_filter?: string;
    project_id?: number;
    vendor_id?: number;
    contractor_id?: number;
    due_date_from?: string;
    due_date_to?: string;
    is_overdue?: boolean;
    limit?: number;
    offset?: number;
  }): Observable<import('../models/accounts.model').APInvoice[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.invoice_type) params = params.set('invoice_type', filters.invoice_type);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.vendor_id) params = params.set('vendor_id', filters.vendor_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.due_date_from) params = params.set('due_date_from', filters.due_date_from);
    if (filters?.due_date_to) params = params.set('due_date_to', filters.due_date_to);
    if (filters?.is_overdue) params = params.set('is_overdue', filters.is_overdue);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<import('../models/accounts.model').APInvoice[]>(`${this.baseUrl}/payables`, { params });
  }

  getAPInvoiceById(id: number): Observable<import('../models/accounts.model').APInvoice> {
    return this.http.get<import('../models/accounts.model').APInvoice>(`${this.baseUrl}/payables/${id}`);
  }

  createAPInvoice(payload: any): Observable<import('../models/accounts.model').APInvoice> {
    return this.http.post<import('../models/accounts.model').APInvoice>(`${this.baseUrl}/payables`, payload);
  }

  updateAPInvoice(id: number, payload: any): Observable<import('../models/accounts.model').APInvoice> {
    return this.http.put<import('../models/accounts.model').APInvoice>(`${this.baseUrl}/payables/${id}`, payload);
  }

  approveAPInvoice(id: number): Observable<import('../models/accounts.model').APInvoice> {
    return this.http.post<import('../models/accounts.model').APInvoice>(`${this.baseUrl}/payables/${id}/approve`, {});
  }

  recordAPPayment(invoiceId: number, payload: any): Observable<import('../models/accounts.model').APPayment> {
    return this.http.post<import('../models/accounts.model').APPayment>(`${this.baseUrl}/payables/${invoiceId}/payments`, payload);
  }

  recordAPAdjustment(invoiceId: number, payload: any): Observable<import('../models/accounts.model').APAdjustment> {
    return this.http.post<import('../models/accounts.model').APAdjustment>(`${this.baseUrl}/payables/${invoiceId}/adjustments`, payload);
  }

  getAPSupplierStatement(filters?: {
    vendor_id?: number;
    contractor_id?: number;
    payee_name?: string;
    date_from?: string;
    date_to?: string;
  }): Observable<import('../models/accounts.model').APSupplierStatement> {
    let params = new HttpParams();
    if (filters?.vendor_id) params = params.set('vendor_id', filters.vendor_id);
    if (filters?.contractor_id) params = params.set('contractor_id', filters.contractor_id);
    if (filters?.payee_name) params = params.set('payee_name', filters.payee_name);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    return this.http.get<import('../models/accounts.model').APSupplierStatement>(`${this.baseUrl}/payables/ledger/statement`, { params });
  }

  // 16. Construction Materials Inventory Issue to CWIP
  issueMaterialToConstruction(payload: import('../models/accounts.model').MaterialIssueToConstructionRequest): Observable<import('../models/accounts.model').MaterialIssueToConstructionResponse> {
    return this.http.post<import('../models/accounts.model').MaterialIssueToConstructionResponse>(`${this.baseUrl}/payables/inventory/issue-to-construction`, payload);
  }

  // 17. Accounts Receivable (AR) & Customer Demand Notices
  getARSummaryKPIs(projectId?: number, customerId?: number): Observable<import('../models/accounts.model').ARSummaryKPIs> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (customerId) params = params.set('customer_id', customerId);
    return this.http.get<import('../models/accounts.model').ARSummaryKPIs>(`${this.baseUrl}/receivables/kpis`, { params });
  }

  getARInvoices(filters?: {
    search?: string;
    invoice_type?: string;
    status_filter?: string;
    project_id?: number;
    customer_id?: number;
    due_date_from?: string;
    due_date_to?: string;
    is_overdue?: boolean;
    aging_bucket?: string;
    limit?: number;
    offset?: number;
  }): Observable<import('../models/accounts.model').ARInvoice[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.invoice_type) params = params.set('invoice_type', filters.invoice_type);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.due_date_from) params = params.set('due_date_from', filters.due_date_from);
    if (filters?.due_date_to) params = params.set('due_date_to', filters.due_date_to);
    if (filters?.is_overdue !== undefined) params = params.set('is_overdue', filters.is_overdue);
    if (filters?.aging_bucket) params = params.set('aging_bucket', filters.aging_bucket);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<import('../models/accounts.model').ARInvoice[]>(`${this.baseUrl}/receivables`, { params });
  }

  getARInvoiceById(id: number): Observable<import('../models/accounts.model').ARInvoice> {
    return this.http.get<import('../models/accounts.model').ARInvoice>(`${this.baseUrl}/receivables/${id}`);
  }

  createARInvoice(payload: any): Observable<import('../models/accounts.model').ARInvoice> {
    return this.http.post<import('../models/accounts.model').ARInvoice>(`${this.baseUrl}/receivables`, payload);
  }

  updateARInvoice(id: number, payload: any): Observable<import('../models/accounts.model').ARInvoice> {
    return this.http.put<import('../models/accounts.model').ARInvoice>(`${this.baseUrl}/receivables/${id}`, payload);
  }

  recordARReceipt(invoiceId: number, payload: any): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/${invoiceId}/receipts`, payload);
  }

  recordUnallocatedARReceipt(payload: any): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/unallocated-receipts`, payload);
  }

  recordARAdjustment(invoiceId: number, payload: any): Observable<import('../models/accounts.model').ARAdjustment> {
    return this.http.post<import('../models/accounts.model').ARAdjustment>(`${this.baseUrl}/receivables/${invoiceId}/adjustments`, payload);
  }

  getARCustomerStatement(filters?: {
    customer_id?: number;
    customer_name?: string;
    date_from?: string;
    date_to?: string;
  }): Observable<import('../models/accounts.model').ARCustomerStatement> {
    let params = new HttpParams();
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.customer_name) params = params.set('customer_name', filters.customer_name);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    return this.http.get<import('../models/accounts.model').ARCustomerStatement>(`${this.baseUrl}/receivables/customer/statement`, { params });
  }

  getARAgingReport(filters?: {
    as_of_date?: string;
    project_id?: number;
    customer_id?: number;
    invoice_type?: string;
  }): Observable<import('../models/accounts.model').ARAgingReport> {
    let params = new HttpParams();
    if (filters?.as_of_date) params = params.set('as_of_date', filters.as_of_date);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.invoice_type) params = params.set('invoice_type', filters.invoice_type);
    return this.http.get<import('../models/accounts.model').ARAgingReport>(`${this.baseUrl}/receivables/reports/aging`, { params });
  }

  // 18. Customer Receipt Allocation & Lifecycle Management
  getReceiptSummaryKPIs(projectId?: number, customerId?: number): Observable<import('../models/accounts.model').ARReceiptSummaryKPIs> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    if (customerId) params = params.set('customer_id', customerId);
    return this.http.get<import('../models/accounts.model').ARReceiptSummaryKPIs>(`${this.baseUrl}/receivables/receipts/kpis`, { params });
  }

  getARReceipts(filters?: {
    search?: string;
    status_filter?: string;
    customer_id?: number;
    project_id?: number;
    collection_method?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Observable<import('../models/accounts.model').ARReceipt[]> {
    let params = new HttpParams();
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.customer_id) params = params.set('customer_id', filters.customer_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.collection_method) params = params.set('collection_method', filters.collection_method);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<import('../models/accounts.model').ARReceipt[]>(`${this.baseUrl}/receivables/receipts`, { params });
  }

  getARReceiptById(id: number): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.get<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts/${id}`);
  }

  createCustomerReceipt(payload: any): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts`, payload);
  }

  verifyAndClearARReceipt(id: number, payload: import('../models/accounts.model').ARReceiptClearVerifyRequest): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts/${id}/verify-clear`, payload);
  }

  allocateARReceipt(id: number, payload: import('../models/accounts.model').ARMultiAllocationRequest): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts/${id}/allocate`, payload);
  }

  reverseARReceipt(id: number, payload: import('../models/accounts.model').ARReceiptReverseRequest): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts/${id}/reverse`, payload);
  }

  refundARReceipt(id: number, payload: import('../models/accounts.model').ARReceiptRefundRequest): Observable<import('../models/accounts.model').ARReceipt> {
    return this.http.post<import('../models/accounts.model').ARReceipt>(`${this.baseUrl}/receivables/receipts/${id}/refund`, payload);
  }

  getCustomerUnallocatedReceipts(customerId: number): Observable<import('../models/accounts.model').ARReceipt[]> {
    return this.http.get<import('../models/accounts.model').ARReceipt[]>(`${this.baseUrl}/receivables/customers/${customerId}/unallocated-receipts`);
  }

  getCustomerOutstandingInvoices(customerId: number): Observable<import('../models/accounts.model').ARInvoice[]> {
    return this.http.get<import('../models/accounts.model').ARInvoice[]>(`${this.baseUrl}/receivables/customers/${customerId}/outstanding-invoices`);
  }

  // 19. Cash, Bank & Mobile Financial Services (MFS) Methods
  getCashBankPositionKPIs(projectId?: number): Observable<CashBankPositionKPIs> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<CashBankPositionKPIs>(`${this.baseUrl}/cash-bank/position-kpis`, { params });
  }

  // Cash Boxes
  getCashBoxes(filters?: { project_id?: number; cashbox_type?: string; status_filter?: string; search?: string; limit?: number; offset?: number }): Observable<CashBox[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.cashbox_type) params = params.set('cashbox_type', filters.cashbox_type);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<CashBox[]>(`${this.baseUrl}/cash/boxes`, { params });
  }

  getCashBoxById(boxId: number): Observable<CashBox> {
    return this.http.get<CashBox>(`${this.baseUrl}/cash/boxes/${boxId}`);
  }

  createCashBox(payload: any): Observable<CashBox> {
    return this.http.post<CashBox>(`${this.baseUrl}/cash/boxes`, payload);
  }

  updateCashBox(boxId: number, payload: any): Observable<CashBox> {
    return this.http.put<CashBox>(`${this.baseUrl}/cash/boxes/${boxId}`, payload);
  }

  getPettyCashVouchers(filters?: { cash_box_id?: number; project_id?: number; transaction_type?: string; date_from?: string; date_to?: string; search?: string; limit?: number; offset?: number }): Observable<PettyCashVoucher[]> {
    let params = new HttpParams();
    if (filters?.cash_box_id) params = params.set('cash_box_id', filters.cash_box_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.transaction_type) params = params.set('transaction_type', filters.transaction_type);
    if (filters?.date_from) params = params.set('date_from', filters.date_from);
    if (filters?.date_to) params = params.set('date_to', filters.date_to);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<PettyCashVoucher[]>(`${this.baseUrl}/cash/vouchers`, { params });
  }

  createPettyCashVoucher(payload: any): Observable<PettyCashVoucher> {
    return this.http.post<PettyCashVoucher>(`${this.baseUrl}/cash/vouchers`, payload);
  }

  performCashCountAudit(payload: CashCountAuditRequest): Observable<PettyCashVoucher> {
    return this.http.post<PettyCashVoucher>(`${this.baseUrl}/cash/audit-count`, payload);
  }

  transferCash(payload: CashTransferRequest): Observable<PettyCashVoucher> {
    return this.http.post<PettyCashVoucher>(`${this.baseUrl}/cash/transfer`, payload);
  }

  // Bank Accounts
  getBankAccounts(filters?: { project_id?: number; account_type?: string; is_active?: boolean; search?: string; limit?: number; offset?: number }): Observable<BankAccount[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.account_type) params = params.set('account_type', filters.account_type);
    if (filters?.is_active !== undefined && filters?.is_active !== null) params = params.set('is_active', filters.is_active);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<BankAccount[]>(`${this.baseUrl}/bank/accounts`, { params });
  }

  getBankAccountById(accountId: number): Observable<BankAccount> {
    return this.http.get<BankAccount>(`${this.baseUrl}/bank/accounts/${accountId}`);
  }

  createBankAccount(payload: any): Observable<BankAccount> {
    return this.http.post<BankAccount>(`${this.baseUrl}/bank/accounts`, payload);
  }

  updateBankAccount(accountId: number, payload: any): Observable<BankAccount> {
    return this.http.put<BankAccount>(`${this.baseUrl}/bank/accounts/${accountId}`, payload);
  }

  getBankTransactions(filters?: { bank_account_id?: number; project_id?: number; transaction_type?: string; status_filter?: string; is_reconciled?: boolean; search?: string; limit?: number; offset?: number }): Observable<BankTransaction[]> {
    let params = new HttpParams();
    if (filters?.bank_account_id) params = params.set('bank_account_id', filters.bank_account_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.transaction_type) params = params.set('transaction_type', filters.transaction_type);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.is_reconciled !== undefined && filters?.is_reconciled !== null) params = params.set('is_reconciled', filters.is_reconciled);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<BankTransaction[]>(`${this.baseUrl}/bank/transactions`, { params });
  }

  createBankTransaction(payload: any): Observable<BankTransaction> {
    return this.http.post<BankTransaction>(`${this.baseUrl}/bank/transactions`, payload);
  }

  transferBankFunds(payload: BankTransferRequest): Observable<BankTransaction> {
    return this.http.post<BankTransaction>(`${this.baseUrl}/bank/transfer`, payload);
  }

  getChequeBookRegister(accountId: number): Observable<ChequeLeafItem[]> {
    return this.http.get<ChequeLeafItem[]>(`${this.baseUrl}/bank/cheque-book/${accountId}`);
  }

  // Mobile Financial Services (MFS)
  getMFSProviders(isActive?: boolean): Observable<MFSProvider[]> {
    let params = new HttpParams();
    if (isActive !== undefined && isActive !== null) params = params.set('is_active', isActive);
    return this.http.get<MFSProvider[]>(`${this.baseUrl}/mfs/providers`, { params });
  }

  createMFSProvider(payload: any): Observable<MFSProvider> {
    return this.http.post<MFSProvider>(`${this.baseUrl}/mfs/providers`, payload);
  }

  updateMFSProvider(providerId: number, payload: any): Observable<MFSProvider> {
    return this.http.put<MFSProvider>(`${this.baseUrl}/mfs/providers/${providerId}`, payload);
  }

  getMFSTransactions(filters?: { mfs_provider_id?: number; project_id?: number; status_filter?: string; settlement_batch_id?: string; search?: string; limit?: number; offset?: number }): Observable<MFSTransaction[]> {
    let params = new HttpParams();
    if (filters?.mfs_provider_id) params = params.set('mfs_provider_id', filters.mfs_provider_id);
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.status_filter) params = params.set('status_filter', filters.status_filter);
    if (filters?.settlement_batch_id) params = params.set('settlement_batch_id', filters.settlement_batch_id);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset) params = params.set('offset', filters.offset);
    return this.http.get<MFSTransaction[]>(`${this.baseUrl}/mfs/transactions`, { params });
  }

  createMFSTransaction(payload: any): Observable<MFSTransaction> {
    return this.http.post<MFSTransaction>(`${this.baseUrl}/mfs/transactions`, payload);
  }

  simulateMFSCallback(payload: MFSCallbackSimulationRequest): Observable<MFSTransaction> {
    return this.http.post<MFSTransaction>(`${this.baseUrl}/mfs/simulate-callback`, payload);
  }

  // ==========================================
  // 9. Payment Vouchers
  // ==========================================
  getPaymentVouchers(filters?: {
    project_id?: number;
    payment_method?: string;
    debit_category?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Observable<{ total: number; items: PaymentVoucher[] }> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.payment_method) params = params.set('payment_method', filters.payment_method);
    if (filters?.debit_category) params = params.set('debit_category', filters.debit_category);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.limit) params = params.set('limit', filters.limit);
    if (filters?.offset !== undefined && filters.offset !== null) params = params.set('offset', filters.offset);
    return this.http.get<{ total: number; items: PaymentVoucher[] }>(`${this.baseUrl}/payment-vouchers`, { params });
  }

  getPaymentVoucherById(id: number): Observable<PaymentVoucher> {
    return this.http.get<PaymentVoucher>(`${this.baseUrl}/payment-vouchers/${id}`);
  }

  getPaymentVoucherKPIs(projectId?: number): Observable<PaymentVoucherKPIs> {
    let params = new HttpParams();
    if (projectId) params = params.set('project_id', projectId);
    return this.http.get<PaymentVoucherKPIs>(`${this.baseUrl}/payment-vouchers/kpis`, { params });
  }

  createPaymentVoucher(payload: any): Observable<PaymentVoucher> {
    return this.http.post<PaymentVoucher>(`${this.baseUrl}/payment-vouchers`, payload);
  }

  updatePaymentVoucher(id: number, payload: any): Observable<PaymentVoucher> {
    return this.http.put<PaymentVoucher>(`${this.baseUrl}/payment-vouchers/${id}`, payload);
  }

  executePaymentVoucherWorkflow(id: number, payload: PaymentVoucherWorkflowAction): Observable<PaymentVoucher> {
    return this.http.post<PaymentVoucher>(`${this.baseUrl}/payment-vouchers/${id}/workflow`, payload);
  }
}




