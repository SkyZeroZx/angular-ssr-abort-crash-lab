import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(),
    // The usage-notes initializer, written defensively: it never rejects.
    provideAppInitializer(async () => {
      const http = inject(HttpClient);
      try {
        await firstValueFrom(http.get('http://127.0.0.1:4400/api/user'));
      } catch {
        // start without the user
      }
    }),
    provideHttpClient(),
  ],
};
