import { HttpClient } from '@angular/common/http';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ profile() }}</p><router-outlet />`,
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly profile = signal('');

  constructor() {
    effect(async () => {
      const { name } = await firstValueFrom(
        this.http.get<{ name: string }>('http://127.0.0.1:4400/profile'),
      );
      this.profile.set(name);
    });
  }
}
