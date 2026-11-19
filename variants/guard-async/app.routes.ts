import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { CanActivateFn, Routes } from '@angular/router';
import { firstValueFrom } from 'rxjs';

@Component({ selector: 'app-home', template: `<p>home</p>` })
export class Home {}

// The guide's guard, written with async/await.
export const authGuard: CanActivateFn = async () => {
  const http = inject(HttpClient);
  await firstValueFrom(http.get('http://127.0.0.1:4400/session'));
  return true;
};

export const routes: Routes = [{ path: '', component: Home, canActivate: [authGuard] }];
