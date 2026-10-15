import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LookupCategory, LookupItem, QuickCreateLookupPayload } from '../models/lookup.model';

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/lookups`;

  // Reactive in-memory lookup cache to optimize repeated dropdown lookups
  private lookupCache = new Map<string, LookupItem[]>();

  /**
   * Fetches active lookup items for the given category code.
   * Leverages backend Redis cache with client-side reactive fallback.
   */
  getItems(categoryCode: string, forceRefresh = false): Observable<LookupItem[]> {
    const code = categoryCode.trim().toUpperCase();
    if (!forceRefresh && this.lookupCache.has(code)) {
      return of(this.lookupCache.get(code)!);
    }

    return this.http.get<LookupItem[]>(`${this.baseUrl}/${code}`).pipe(
      tap(items => this.lookupCache.set(code, items))
    );
  }

  /**
   * Quick creates a new lookup item from the inline modal within <app-searchable-select>.
   * Auto-invalidates the local cache so subsequent requests get fresh data.
   */
  quickCreate(categoryCode: string, payload: QuickCreateLookupPayload): Observable<LookupItem> {
    const code = categoryCode.trim().toUpperCase();
    return this.http.post<LookupItem>(`${this.baseUrl}/${code}/quick-create`, payload).pipe(
      tap(newItem => {
        // Optimistically append new item to client cache
        const current = this.lookupCache.get(code) || [];
        this.lookupCache.set(code, [...current, newItem]);
      })
    );
  }

  /**
   * Lists all lookup categories for the Settings -> Dynamic Lookups & Fields Management UI.
   */
  getCategories(includeInactive = false): Observable<LookupCategory[]> {
    return this.http.get<LookupCategory[]>(`${this.baseUrl}/categories`, {
      params: { include_inactive: includeInactive }
    });
  }

  /**
   * Creates a new lookup category dynamically from the Settings UI.
   */
  createCategory(payload: { category_code: string; category_name: string; description?: string }): Observable<LookupCategory> {
    return this.http.post<LookupCategory>(`${this.baseUrl}/categories`, payload);
  }

  /**
   * Clears in-memory lookup cache
   */
  clearCache(categoryCode?: string): void {
    if (categoryCode) {
      this.lookupCache.delete(categoryCode.trim().toUpperCase());
    } else {
      this.lookupCache.clear();
    }
  }
}
