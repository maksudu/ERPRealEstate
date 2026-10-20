import { Injectable, inject, signal, NgZone } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleTrackerService {
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // Configuration (In milliseconds)
  // Default: 15 minutes idle time before warning, 60 seconds countdown warning
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WARNING_DURATION_SEC = 60; // 60 seconds countdown
  private readonly THROTTLE_MS = 1000; // throttle activity capture to once per sec

  // Reactive State Signals
  isWarningModalOpen = signal<boolean>(false);
  countdownSeconds = signal<number>(this.WARNING_DURATION_SEC);
  isTracking = signal<boolean>(false);

  private idleTimer: any = null;
  private countdownInterval: any = null;
  private lastActivityTimestamp = Date.now();
  private lastThrottledRecord = 0;
  private isDestroyed = false;

  private readonly activityEvents = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
    'wheel'
  ];

  private boundActivityHandler = this.onUserActivity.bind(this);
  private boundStorageHandler = this.onStorageChange.bind(this);

  /**
   * Start tracking user idle activity when authenticated
   */
  start(): void {
    if (typeof window === 'undefined') return;
    if (this.isTracking()) return;

    this.isTracking.set(true);
    this.isDestroyed = false;
    this.lastActivityTimestamp = Date.now();
    this.recordActivityToStorage();

    // Listen to user events outside Angular zone to avoid triggering change detection on every mouse move
    this.ngZone.runOutsideAngular(() => {
      this.activityEvents.forEach(evt => {
        window.addEventListener(evt, this.boundActivityHandler, { passive: true });
      });
      window.addEventListener('storage', this.boundStorageHandler);
    });

    this.resetTimer();
  }

  /**
   * Stop tracking and clean up timers and listeners
   */
  stop(): void {
    if (typeof window === 'undefined') return;
    this.isTracking.set(false);
    this.isDestroyed = true;
    this.clearAllTimers();

    this.activityEvents.forEach(evt => {
      window.removeEventListener(evt, this.boundActivityHandler);
    });
    window.removeEventListener('storage', this.boundStorageHandler);

    this.ngZone.run(() => {
      this.isWarningModalOpen.set(false);
      this.countdownSeconds.set(this.WARNING_DURATION_SEC);
    });
  }

  /**
   * Reset idle timer upon active user interactions
   */
  resetTimer(): void {
    this.clearAllTimers();
    this.lastActivityTimestamp = Date.now();

    if (this.isWarningModalOpen()) {
      this.ngZone.run(() => {
        this.isWarningModalOpen.set(false);
        this.countdownSeconds.set(this.WARNING_DURATION_SEC);
      });
    }

    // Schedule warning phase
    this.idleTimer = setTimeout(() => {
      this.triggerWarning();
    }, this.IDLE_TIMEOUT_MS);
  }

  /**
   * User confirmed to stay logged in from the modal
   */
  stayLoggedIn(): void {
    this.recordActivityToStorage();
    this.resetTimer();
  }

  /**
   * User chose to logout immediately from the warning dialog
   */
  logoutNow(): void {
    this.stop();
    this.authService.idleLogout();
  }

  /**
   * Handles user input events (throttled)
   */
  private onUserActivity(): void {
    const now = Date.now();
    // Do not reset automatically if countdown modal is already showing (user must click "Stay Logged In")
    if (this.isWarningModalOpen()) {
      return;
    }

    if (now - this.lastThrottledRecord > this.THROTTLE_MS) {
      this.lastThrottledRecord = now;
      this.lastActivityTimestamp = now;
      this.recordActivityToStorage();
      this.resetTimer();
    }
  }

  /**
   * Broadcast and synchronize idle tracking across multiple browser tabs
   */
  private recordActivityToStorage(): void {
    try {
      localStorage.setItem('erp_last_user_activity', Date.now().toString());
    } catch {}
  }

  /**
   * React to activity changes in other browser tabs
   */
  private onStorageChange(event: StorageEvent): void {
    if (event.key === 'erp_last_user_activity') {
      const remoteActivity = parseInt(event.newValue || '0', 10);
      if (remoteActivity > this.lastActivityTimestamp) {
        this.lastActivityTimestamp = remoteActivity;
        this.resetTimer();
      }
    } else if (event.key === 'erp_idle_logout_event') {
      // Another tab performed an idle logout — sync immediately
      this.stop();
      this.ngZone.run(() => {
        this.authService.idleLogout();
      });
    }
  }

  /**
   * Open the countdown warning dialog
   */
  private triggerWarning(): void {
    this.ngZone.run(() => {
      this.isWarningModalOpen.set(true);
      this.countdownSeconds.set(this.WARNING_DURATION_SEC);
    });

    // Start 1-second interval ticker for the countdown
    this.countdownInterval = setInterval(() => {
      const remaining = this.countdownSeconds() - 1;
      this.ngZone.run(() => {
        this.countdownSeconds.set(remaining);
      });

      if (remaining <= 0) {
        this.executeAutoLogout();
      }
    }, 1000);
  }

  /**
   * Trigger the actual auto-logout on timeout expiration
   */
  private executeAutoLogout(): void {
    this.stop();
    this.ngZone.run(() => {
      this.authService.idleLogout();
    });
  }

  private clearAllTimers(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}
