import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-user-detail',
  template: `<p>{{ route.snapshot.data['user'].name }}</p>`,
})
export class UserDetail {
  protected readonly route = inject(ActivatedRoute);
}
