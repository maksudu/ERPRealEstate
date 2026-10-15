import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  isDarkMode = signal<boolean>(false);
  isSidebarOpen = signal<boolean>(true);

  // Active Project Context (Bangladesh Project Scoped)
  activeProject = signal<string>('Grand Emerald Tower, Gulshan-2');

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
