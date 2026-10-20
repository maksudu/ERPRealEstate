import { Component, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { CommandPaletteComponent } from '../command-palette/command-palette.component';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'success' | 'warning' | 'info';
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CommandPaletteComponent],
  templateUrl: './topbar.component.html',
  host: {
    class: 'sticky top-0 z-40 block w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs'
  }
})
export class TopbarComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  @Output() toggleSidebar = new EventEmitter<void>();

  isDarkMode = () => this.themeService.isDark();
  isNotificationOpen = signal<boolean>(false);
  isProfileMenuOpen = signal<boolean>(false);
  isFullscreen = signal<boolean>(false);

  ngOnInit(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', () => {
        this.isFullscreen.set(!!document.fullscreenElement);
      });
    }
  }

  toggleFullscreen(): void {
    if (typeof document === 'undefined') return;
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('Error attempting to enable fullscreen:', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(err => {
            console.warn('Error attempting to exit fullscreen:', err);
          });
        }
      }
    } catch (err) {
      console.warn('Fullscreen API error:', err);
    }
  }

  // Notifications
  notifications = signal<NotificationItem[]>([
    {
      id: '1',
      title: 'RAJUK Clearance Approved',
      message: 'Grand Emerald Tower: Height clearance approved by Civil Aviation.',
      time: '10m ago',
      unread: true,
      type: 'success'
    },
    {
      id: '2',
      title: 'PDC Cheque Clearing Alert',
      message: 'Cheque #40982 from Buyer Arif Hossain due for clearing tomorrow.',
      time: '1h ago',
      unread: true,
      type: 'warning'
    },
    {
      id: '3',
      title: 'Sub-Registry 53FF Tax Slab Updated',
      message: 'Gulshan mouza tax updated under Section 53FF of Income Tax Act 2023.',
      time: '3h ago',
      unread: false,
      type: 'info'
    }
  ]);

  unreadCount = () => this.notifications().filter(n => n.unread).length;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleNotification(): void {
    this.isNotificationOpen.update(v => !v);
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(v => !v);
  }

  markAllAsRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, unread: false })));
  }

  loginAs(role: 'admin' | 'engineer'): void {
    this.isProfileMenuOpen.set(false);
    if (role === 'admin') {
      this.authService.login({ username: 'admin', password: 'AdminPassword123!' }).subscribe();
    } else {
      this.authService.login({ username: 'engineer_kamal', password: 'SitePassword123!' }).subscribe();
    }
  }

  logout(): void {
    this.isProfileMenuOpen.set(false);
    this.authService.logout();
  }
}
