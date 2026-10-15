import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService, UserProfile, ProjectOption } from '../../../core/services/auth.service';
import { 
  CardContainerComponent, 
  CustomButtonComponent,
  CustomTableComponent,
  TableColumn
} from '../../../shared/components';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-rbac-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardContainerComponent,
    CustomButtonComponent
  ],
  templateUrl: './rbac-management.component.html'
})
export class RbacManagementComponent implements OnInit {
  authService = inject(AuthService);
  private http = inject(HttpClient);

  // Active User & Testing State
  targetProjectId = signal<number>(101);
  testResponse = signal<any>(null);
  testError = signal<any>(null);
  isLoadingTest = signal<boolean>(false);

  // Audit Trails State
  auditTrails = signal<any[]>([]);
  isLoadingAudit = signal<boolean>(false);

  auditColumns: TableColumn[] = [
    { field: 'id', header: 'Audit ID', width: '12%' },
    { field: 'action', header: 'Action Type', width: '15%', align: 'center' },
    { field: 'entity', header: 'Target Entity', width: '25%' },
    { field: 'service', header: 'Microservice', width: '25%' },
    { field: 'user', header: 'User ID', width: '10%', align: 'center' },
    { field: 'time', header: 'Partitioned Time', width: '13%' }
  ];

  ngOnInit(): void {
    // If not logged in, auto-login as admin by default
    if (!this.authService.isAuthenticated()) {
      this.loginAsAdmin();
    }
    this.targetProjectId.set(this.authService.activeProjectId());
  }

  loginAsAdmin(): void {
    this.authService.login({
      username: 'admin',
      password: 'AdminPassword123!'
    }).subscribe({
      next: () => {
        this.targetProjectId.set(101);
        this.testResponse.set(null);
        this.testError.set(null);
      }
    });
  }

  loginAsEngineer(): void {
    this.authService.login({
      username: 'engineer_kamal',
      password: 'SitePassword123!'
    }).subscribe({
      next: () => {
        this.targetProjectId.set(101);
        this.testResponse.set(null);
        this.testError.set(null);
      }
    });
  }

  executeScopeTest(): void {
    this.isLoadingTest.set(true);
    this.testResponse.set(null);
    this.testError.set(null);

    // Set active project id in auth service to ensure X-Project-Id header matches target
    this.authService.setProjectScope(this.targetProjectId());

    this.authService.testProjectScope().subscribe({
      next: (res) => {
        this.testResponse.set(res);
        this.isLoadingTest.set(false);
      },
      error: (err) => {
        this.testError.set(err?.error || { detail: 'Request failed', status: err.status });
        this.isLoadingTest.set(false);
      }
    });
  }
}
