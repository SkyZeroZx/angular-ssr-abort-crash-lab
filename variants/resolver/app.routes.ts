import { Routes } from '@angular/router';
import { UserDetail } from './user-detail';
import { userResolver } from './user-resolver';

export const routes: Routes = [
  {
    path: 'user/:id',
    component: UserDetail,
    resolve: {
      user: userResolver,
    },
  },
];
