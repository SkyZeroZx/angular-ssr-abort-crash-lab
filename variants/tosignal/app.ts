import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ profile()?.name }}</p><router-outlet />`,
})
export class App {
  protected readonly profile = toSignal(
    inject(HttpClient).get<{ name: string }>('http://127.0.0.1:4400/profile'),
  );
}
