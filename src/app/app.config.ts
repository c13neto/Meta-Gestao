import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { LucideAngularModule, Scroll, User, ChevronDown, Target, ArrowRight, Check, Pencil, Trash2, Plus } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(
      LucideAngularModule.pick({ Scroll, User, ChevronDown, Target, ArrowRight, Check, Pencil, Trash2, Plus })
    )
  ]
};
