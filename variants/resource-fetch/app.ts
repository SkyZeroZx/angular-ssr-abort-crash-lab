import { Component, resource } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ profile.value()?.name }}</p><router-outlet />`,
})
export class App {
  protected readonly profile = resource({
    loader: ({ abortSignal }) =>
      fetch('http://127.0.0.1:4400/profile', { signal: abortSignal }).then(
        (response) => response.json() as Promise<{ name: string }>,
      ),
  });
}
