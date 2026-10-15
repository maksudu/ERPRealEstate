import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();
  const projectId = authService.activeProjectId();

  let headersConfig: Record<string, string> = {};

  if (token) {
    headersConfig['Authorization'] = `Bearer ${token}`;
  }

  if (projectId) {
    headersConfig['X-Project-Id'] = String(projectId);
  }

  const clonedReq = req.clone({
    setHeaders: headersConfig
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Automatic refresh token rotation on token expiry
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/auth/refresh')) {
        return authService.refreshSession().pipe(
          switchMap(newTokens => {
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newTokens.access_token}`,
                'X-Project-Id': String(authService.activeProjectId())
              }
            });
            return next(retryReq);
          }),
          catchError(refreshErr => {
            authService.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
