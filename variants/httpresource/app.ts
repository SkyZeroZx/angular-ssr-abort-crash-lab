import { httpResource } from '@angular/common/http';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ profile.value()?.name }}</p><router-outlet />`,
})
export class App {
  protected readonly profile = httpResource<{ name: string }>(() => 'http://127.0.0.1:4400/profile');
}
