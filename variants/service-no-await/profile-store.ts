import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly http = inject(HttpClient);
  readonly name = signal('');

  async load() {
    const { name } = await firstValueFrom(
      this.http.get<{ name: string }>('http://127.0.0.1:4400/profile'),
    );
    this.name.set(name);
  }
}
