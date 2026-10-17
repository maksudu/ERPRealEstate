import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ExecutiveOverview,
  ProjectPortfolio,
  ProjectDrillDown,
  InventoryDashboard,
  SalesAnalytics,
  BIModuleItem
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/dashboard`;

  getExecutiveOverview(): Observable<ExecutiveOverview> {
    return this.http.get<ExecutiveOverview>(`${this.baseUrl}/executive`);
  }

  getProjectsPortfolio(): Observable<ProjectPortfolio> {
    return this.http.get<ProjectPortfolio>(`${this.baseUrl}/projects`);
  }

  getProjectDrillDown(projectId: number): Observable<ProjectDrillDown> {
    return this.http.get<ProjectDrillDown>(`${this.baseUrl}/projects/${projectId}`);
  }

  getInventoryDashboard(): Observable<InventoryDashboard> {
    return this.http.get<InventoryDashboard>(`${this.baseUrl}/inventory`);
  }

  getSalesAnalytics(): Observable<SalesAnalytics> {
    return this.http.get<SalesAnalytics>(`${this.baseUrl}/sales`);
  }

  getBISubModules(): Observable<{ modules: BIModuleItem[] }> {
    return this.http.get<{ modules: BIModuleItem[] }>(`${this.baseUrl}/sub-modules`);
  }

  remindDefaulter(customerId: number, actionType: string = 'SMS'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/remind-defaulter/${customerId}?action_type=${actionType}`, {});
  }
}
