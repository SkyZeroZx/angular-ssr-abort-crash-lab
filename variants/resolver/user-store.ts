import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface User {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly http = inject(HttpClient);

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`http://127.0.0.1:4400/users/${id}`);
  }
}
