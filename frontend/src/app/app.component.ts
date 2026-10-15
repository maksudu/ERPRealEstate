import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);

  isDarkMode = signal<boolean>(false);
  isSidebarOpen = signal<boolean>(true);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      // Auto login as admin for smooth development showcase
      this.authService.login({
        username: 'admin',
        password: 'AdminPassword123!'
      }).subscribe({ error: () => {} });
    }
  }

  toggleDarkMode(): void {
    this.isDarkMode.update(dark => !dark);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }
}
