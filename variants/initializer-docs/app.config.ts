import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { firstValueFrom, tap } from 'rxjs';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    provideAppInitializer(() => {
      const http = inject(HttpClient);
      return firstValueFrom(
        http
          .get('http://127.0.0.1:4400/api/user')
          .pipe(tap((user) => { void user; })),
      );
    }),
    provideHttpClient(),
  ],
};
