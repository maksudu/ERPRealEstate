import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  Project, 
  AuthorityClearance, 
  BOQItem, 
  Drawing, 
  FARCalculationResult 
} from '../models/project.model';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/projects`;

  // 1. FAR Calculator (Dhaka Building Construction Rules 2008)
  calculateFAR(params: { plot_area_sqft: number; road_width_feet: number; occupancy_type?: string }): Observable<FARCalculationResult> {
    let httpParams = new HttpParams()
      .set('plot_area_sqft', params.plot_area_sqft)
      .set('road_width_feet', params.road_width_feet);
    if (params.occupancy_type) {
      httpParams = httpParams.set('occupancy_type', params.occupancy_type);
    }
    return this.http.get<FARCalculationResult>(`${this.baseUrl}/far-calculator`, { params: httpParams });
  }

  // 2. Projects Master
  getProjects(filters?: { authority?: string; status?: string; search?: string }): Observable<Project[]> {
    let params = new HttpParams();
    if (filters?.authority) params = params.set('authority', filters.authority);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.search) params = params.set('search', filters.search);
    return this.http.get<Project[]>(`${this.baseUrl}/list`, { params });
  }

  getProject(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/list/${id}`);
  }

  createProject(payload: any): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/list`, payload);
  }

  // 3. Authority Clearances
  getClearances(filters?: { project_id?: number; clearance_type?: string; status?: string }): Observable<AuthorityClearance[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.clearance_type) params = params.set('clearance_type', filters.clearance_type);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<AuthorityClearance[]>(`${this.baseUrl}/clearances`, { params });
  }

  updateClearance(id: number, payload: any): Observable<AuthorityClearance> {
    return this.http.put<AuthorityClearance>(`${this.baseUrl}/clearances/${id}`, payload);
  }

  // 4. BOQ Items
  getBOQItems(filters?: { project_id?: number; tower_id?: number; material_category?: string }): Observable<BOQItem[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.tower_id) params = params.set('tower_id', filters.tower_id);
    if (filters?.material_category) params = params.set('material_category', filters.material_category);
    return this.http.get<BOQItem[]>(`${this.baseUrl}/boq`, { params });
  }

  createBOQItem(payload: any): Observable<BOQItem> {
    return this.http.post<BOQItem>(`${this.baseUrl}/boq`, payload);
  }

  // 5. Drawings & IFC Revisions
  getDrawings(filters?: { project_id?: number; drawing_number?: string }): Observable<Drawing[]> {
    let params = new HttpParams();
    if (filters?.project_id) params = params.set('project_id', filters.project_id);
    if (filters?.drawing_number) params = params.set('drawing_number', filters.drawing_number);
    return this.http.get<Drawing[]>(`${this.baseUrl}/drawings`, { params });
  }

  createDrawingRevision(payload: any): Observable<Drawing> {
    return this.http.post<Drawing>(`${this.baseUrl}/drawings`, payload);
  }
}
