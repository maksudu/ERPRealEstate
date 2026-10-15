import { Component, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
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
  imports: [CommonModule, FormsModule, CommandPaletteComponent],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  authService = inject(AuthService);

  @Output() toggleSidebar = new EventEmitter<void>();

  isDarkMode = signal<boolean>(false);
  isNotificationOpen = signal<boolean>(false);
  isProfileMenuOpen = signal<boolean>(false);

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
    this.isDarkMode.update(d => !d);
    if (this.isDarkMode()) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
