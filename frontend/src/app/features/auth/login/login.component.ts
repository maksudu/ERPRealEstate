import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm: FormGroup = this.fb.group({
    username: ['admin', [Validators.required]],
    password: ['AdminPassword123!', [Validators.required]],
    rememberMe: [true]
  });

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal<boolean>(false);

  toggleShowPassword(): void {
    this.showPassword.update(show => !show);
  }

  quickFill(username: string, pass: string, autoSubmit: boolean = false): void {
    this.loginForm.patchValue({
      username,
      password: pass
    });
    this.errorMessage.set(null);
    if (autoSubmit) {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.errorMessage.set('Please provide both username and password.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { username, password } = this.loginForm.value;

    this.authService.login({ username, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/inventory/matrix']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const detail = err?.error?.detail || 'Authentication failed. Please check your username and password.';
        this.errorMessage.set(detail);
      }
    });
  }
}
