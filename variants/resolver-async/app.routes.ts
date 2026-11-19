import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, ResolveFn, Routes } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-detail',
  template: `<p>{{ route.snapshot.data['user'].name }}</p>`,
})
export class UserDetail {
  protected readonly route = inject(ActivatedRoute);
}

// The guide's resolver, written with async/await.
export const userResolver: ResolveFn<{ name: string }> = async (route) => {
  const http = inject(HttpClient);
  return firstValueFrom(
    http.get<{ name: string }>(`http://127.0.0.1:4400/users/${route.paramMap.get('id')}`),
  );
};

export const routes: Routes = [
  { path: 'user/:id', component: UserDetail, resolve: { user: userResolver } },
];
