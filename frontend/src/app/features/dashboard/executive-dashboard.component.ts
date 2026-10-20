import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DashboardService, DashboardSummaryResponse } from '../../core/services/dashboard.service';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './executive-dashboard.component.html',
  styleUrls: []
})
export class ExecutiveDashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);

  isLoading = signal<boolean>(true);
  data = signal<DashboardSummaryResponse | null>(null);

  // Current formatted time & date
  currentDateStr = signal<string>('');

  // Selected filters
  salesPeriodFilter = signal<'12m' | '6m' | '30d'>('12m');
  propertySalesYearFilter = signal<'this_year' | 'last_year'>('this_year');

  ngOnInit(): void {
    this.updateClock();
    this.loadDashboardData();
  }

  updateClock(): void {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    this.currentDateStr.set(`${dayName}, ${date} ${monthName} ${year} | ${hours}:${minutes} ${ampm}`);
  }

  loadDashboardData(): void {
    this.isLoading.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (res) => {
        this.data.set(res);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard summary', err);
        // Fallback default mock data if backend not reachable
        this.data.set({
          kpis: {
            total_projects: 8,
            new_projects: 1,
            total_buildings: 24,
            total_units: 642,
            new_units: 5,
            total_clients: 1432,
            new_clients: 12,
            total_bookings: 278,
            new_bookings: 8,
            total_sales: 86,
            new_sales: 3,
            total_revenue_bdt: 4620000,
            revenue_growth_pct: 18,
            pending_installments_count: 32
          },
          recent_bookings: [
            { id: 1, project_name: 'Green Valley Villa', unit_no: 'A-101', client_name: 'Md. Hasan', booking_date: '21 Oct 2025', status: 'Confirmed', amount: 12500000 },
            { id: 2, project_name: 'Skyline Residences', unit_no: 'B-202', client_name: 'Fatema Akter', booking_date: '20 Oct 2025', status: 'Pending', amount: 10800000 },
            { id: 3, project_name: 'Riverside Apartment', unit_no: 'C-301', client_name: 'Kamrul Islam', booking_date: '19 Oct 2025', status: 'Confirmed', amount: 9500000 },
            { id: 4, project_name: 'Lake View Housing', unit_no: 'B-104', client_name: 'Sadia Rahman', booking_date: '18 Oct 2025', status: 'On Hold', amount: 8750000 },
            { id: 5, project_name: 'City Square Tower', unit_no: 'D-602', client_name: 'Tariq Rahman', booking_date: '17 Oct 2025', status: 'Confirmed', amount: 15200000 }
          ],
          upcoming_installments: [
            { id: 1, client_name: 'Md. Hasan', project: 'Green Valley Villa', unit_no: 'A-101', due_date: '25 Oct 2025', amount: 500000, status: 'Due' },
            { id: 2, client_name: 'Fatema Akter', project: 'Skyline Residences', unit_no: 'B-202', due_date: '28 Oct 2025', amount: 450000, status: 'Due' },
            { id: 3, client_name: 'Kamrul Islam', project: 'Riverside Apartment', unit_no: 'C-301', due_date: '30 Oct 2025', amount: 600000, status: 'Upcoming' },
            { id: 4, client_name: 'Sadia Rahman', project: 'Lake View Housing', unit_no: 'B-104', due_date: '02 Nov 2025', amount: 375000, status: 'Upcoming' },
            { id: 5, client_name: 'Tariq Rahman', project: 'City Square Tower', unit_no: 'D-602', due_date: '05 Nov 2025', amount: 750000, status: 'Upcoming' }
          ],
          recent_contracts: [
            { id: 1, project: 'Green Valley Villa', unit_no: 'A-101', client_name: 'Md. Hasan', sale_price: 12500000, status: 'Confirmed', date: '21 Oct 2025' },
            { id: 2, project: 'Skyline Residences', unit_no: 'B-202', client_name: 'Fatema Akter', sale_price: 10800000, status: 'Confirmed', date: '20 Oct 2025' },
            { id: 3, project: 'Riverside Apartment', unit_no: 'C-301', client_name: 'Kamrul Islam', sale_price: 9500000, status: 'Pending', date: '19 Oct 2025' },
            { id: 4, project: 'Lake View Housing', unit_no: 'B-104', client_name: 'Sadia Rahman', sale_price: 8750000, status: 'Confirmed', date: '18 Oct 2025' },
            { id: 5, project: 'City Square Tower', unit_no: 'D-602', client_name: 'Tariq Rahman', sale_price: 15200000, status: 'Confirmed', date: '17 Oct 2025' }
          ],
          recent_activities: [
            { title: 'New client registration', subtitle: 'Rahim Uddin', time: '10:24 AM', icon: 'user', color: 'emerald' },
            { title: 'Booking confirmed', subtitle: 'Plot-12, Green Valley', time: '09:45 AM', icon: 'home', color: 'blue' },
            { title: 'Payment received', subtitle: 'Invoice #INV-1025', time: '09:12 AM', icon: 'cash', color: 'purple' },
            { title: 'Maintenance request', subtitle: 'Tower A, Unit 502', time: '08:30 AM', icon: 'wrench', color: 'rose' },
            { title: 'New inquiry', subtitle: 'Ayesha Siddiqua', time: '07:15 AM', icon: 'inquiry', color: 'amber' }
          ]
        });
        this.isLoading.set(false);
      }
    });
  }
}
