import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  isAuthenticated(): Observable<boolean> {
    return this.http.get('http://127.0.0.1:4400/session').pipe(map(() => true));
  }
}
