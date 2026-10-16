import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
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
  router = inject(Router);
  isSidebarOpen = signal<boolean>(true);
  isAuthPage = signal<boolean>(false);

  ngOnInit(): void {
    this.updateAuthPageState(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateAuthPageState(event.urlAfterRedirects || event.url);
    });
  }

  private updateAuthPageState(url: string): void {
    this.isAuthPage.set(url.includes('/login'));
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }
}
