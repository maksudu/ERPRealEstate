import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { TopbarComponent } from './core/layout/topbar/topbar.component';
import { SidebarComponent } from './core/layout/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopbarComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  isSidebarOpen = signal<boolean>(true);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      // Auto login as admin for immediate development & testing showcase
      this.authService.login({
        username: 'admin',
        password: 'AdminPassword123!'
      }).subscribe({ error: () => {} });
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }
}
