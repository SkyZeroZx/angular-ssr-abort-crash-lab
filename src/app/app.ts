import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly title = signal('aborted-render-process');
  protected readonly profile = signal('');

  async ngOnInit() {
    const { name } = await firstValueFrom(
      this.http.get<{ name: string }>('http://127.0.0.1:4400/profile'),
    );
    this.profile.set(name);
  }
}
