import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardKPIs {
  total_projects: number;
  new_projects: number;
  total_buildings: number;
  total_units: number;
  new_units: number;
  total_clients: number;
  new_clients: number;
  total_bookings: number;
  new_bookings: number;
  total_sales: number;
  new_sales: number;
  total_revenue_bdt: number;
  revenue_growth_pct: number;
  pending_installments_count: number;
}

export interface RecentBookingItem {
  id: number;
  project_name: string;
  unit_no: string;
  client_name: string;
  booking_date: string;
  status: string;
  amount: number;
}

export interface UpcomingInstallmentItem {
  id: number;
  client_name: string;
  project: string;
  unit_no: string;
  due_date: string;
  amount: number;
  status: string;
}

export interface RecentContractItem {
  id: number;
  project: string;
  unit_no: string;
  client_name: string;
  sale_price: number;
  status: string;
  date: string;
}

export interface ActivityItem {
  title: string;
  subtitle: string;
  time: string;
  icon: string;
  color: string;
}

export interface DashboardSummaryResponse {
  kpis: DashboardKPIs;
  recent_bookings: RecentBookingItem[];
  upcoming_installments: UpcomingInstallmentItem[];
  recent_contracts: RecentContractItem[];
  recent_activities: ActivityItem[];
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl ? `${environment.apiUrl}/api/v1/dashboard` : '/api/v1/dashboard';

  getSummary(): Observable<DashboardSummaryResponse> {
    return this.http.get<DashboardSummaryResponse>(`${this.baseUrl}/summary`);
  }
}
