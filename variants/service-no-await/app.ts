import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProfileStore } from './profile-store';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<p>{{ store.name() }}</p><router-outlet />`,
})
export class App {
  protected readonly store = inject(ProfileStore);

  ngOnInit() {
    this.store.load();
  }
}
