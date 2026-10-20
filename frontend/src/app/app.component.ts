import { Component, signal, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { IdleTrackerService } from './core/services/idle-tracker.service';
import { TopbarComponent } from './core/layout/topbar/topbar.component';
import { SidebarComponent } from './core/layout/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TopbarComponent, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  idleTracker = inject(IdleTrackerService);
  router = inject(Router);
  
  isSidebarOpen = signal<boolean>(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  isAuthPage = signal<boolean>(false);

  constructor() {
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const onAuthPage = this.isAuthPage();
      if (isAuth && !onAuthPage) {
        this.idleTracker.start();
      } else {
        this.idleTracker.stop();
      }
    });
  }

  ngOnInit(): void {
    this.updateAuthPageState(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateAuthPageState(event.urlAfterRedirects || event.url);
      // Auto-collapse mobile drawer upon selecting any route
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        this.isSidebarOpen.set(false);
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        if (window.innerWidth < 1024 && this.isSidebarOpen()) {
          // If viewport shrunk below desktop, close drawer to prevent blocking screen
          this.isSidebarOpen.set(false);
        }
      });
    }
  }

  private updateAuthPageState(url: string): void {
    this.isAuthPage.set(url.includes('/login'));
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  ngOnDestroy(): void {
    this.idleTracker.stop();
  }
}
