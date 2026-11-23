import { Routes } from '@angular/router';
import { Profile } from './profile';

export const routes: Routes = [
  { path: '', component: Profile },
  { path: 'users/:id', component: Profile },
];
