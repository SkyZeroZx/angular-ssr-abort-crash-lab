import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ profile() }}</p><router-outlet />`,
})
export class App {
  private readonly http = inject(HttpClient);
  protected readonly profile = signal('');

  ngOnInit() {
    this.http
      .get<{ name: string }>('http://127.0.0.1:4400/profile')
      .subscribe(({ name }) => this.profile.set(name));
  }
}
