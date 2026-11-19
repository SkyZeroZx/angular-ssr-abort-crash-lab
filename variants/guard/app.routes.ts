import { Routes } from '@angular/router';
import { authGuard } from './auth-guard';
import { Home } from './home';

export const routes: Routes = [{ path: '', component: Home, canActivate: [authGuard] }];
