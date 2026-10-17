import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ExecutiveBICockpit,
  PortfolioValuation,
  CashRunwayHorizon,
  SalesVelocityItem,
  ProjectProfitabilityComparison,
  ProjectOverdueHeatmapRow
} from '../models/bi.model';

@Injectable({
  providedIn: 'root'
})
export class BIService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/bi`;

  // 1. Unified Executive Cockpit
  getCockpitSummary(): Observable<ExecutiveBICockpit> {
    return this.http.get<ExecutiveBICockpit>(`${this.baseUrl}/cockpit`);
  }

  // 2. Portfolio Valuation Breakdown
  getValuation(): Observable<PortfolioValuation> {
    return this.http.get<PortfolioValuation>(`${this.baseUrl}/valuation`);
  }

  // 3. Cash Runway Simulation by Horizon (90, 180, 365 Days)
  getCashRunway(horizonDays: number = 90): Observable<CashRunwayHorizon> {
    const params = new HttpParams().set('horizon_days', horizonDays.toString());
    return this.http.get<CashRunwayHorizon>(`${this.baseUrl}/runway`, { params });
  }

  // 4. Sales Velocity Analysis
  getSalesVelocity(): Observable<SalesVelocityItem[]> {
    return this.http.get<SalesVelocityItem[]>(`${this.baseUrl}/sales-velocity`);
  }

  // 5. Project Profitability & EVM Performance
  getProfitabilityAndEVM(): Observable<ProjectProfitabilityComparison[]> {
    return this.http.get<ProjectProfitabilityComparison[]>(`${this.baseUrl}/profitability-evm`);
  }

  // 6. Overdue Aging Matrix Heatmap
  getOverdueHeatmap(): Observable<ProjectOverdueHeatmapRow[]> {
    return this.http.get<ProjectOverdueHeatmapRow[]>(`${this.baseUrl}/overdue-heatmap`);
  }

  // 7. 1-Click Board Presentation PDF Export
  exportBoardPresentationPdf(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/board-pdf`, { responseType: 'blob' });
  }

  // 8. 1-Click Excel Financial Audit Workbook Export
  exportAuditExcelWorkbook(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/audit-excel`, { responseType: 'blob' });
  }
}
