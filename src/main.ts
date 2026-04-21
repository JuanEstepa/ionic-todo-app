/**
 * @file main.ts
 * @description Punto de entrada — inicializa Angular y Firebase.
 *
 * ── CAMBIO RESPECTO A LA VERSIÓN ANTERIOR ─────────────────────────────────
 *
 * Se agrega APP_INITIALIZER con RemoteConfigService.init().
 *
 * APP_INITIALIZER es un token de Angular que recibe una función que retorna
 * una Promise. Angular ESPERA a que esa Promise resuelva antes de renderizar
 * el primer componente. Esto garantiza que cuando TabsComponent se monte y
 * lea showCategoriesTab(), el valor ya viene de Firebase y no del default.
 *
 * Sin APP_INITIALIZER: la app renderiza con el valor default (true) y luego
 * actualiza cuando Firebase responde → la pestaña aparece y desaparece → UX mala.
 *
 * Con APP_INITIALIZER: Firebase responde PRIMERO → la app renderiza con el
 * valor correcto desde el inicio → sin parpadeos.
 */

import { enableProdMode, APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import {
  IonicRouteStrategy,
  provideIonicAngular,
} from '@ionic/angular/standalone';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { RemoteConfigService } from './app/services/remote-config.service.ts';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },

    provideIonicAngular(),

    provideRouter(routes, withPreloading(PreloadAllModules)),

    /**
     * APP_INITIALIZER — ejecuta RemoteConfigService.init() antes del
     * primer render. useFactory recibe el servicio inyectado y retorna
     * la función que Angular debe esperar.
     * deps: [RemoteConfigService] le dice a Angular qué inyectar.
     * multi: true permite registrar varios initializers sin pisarse.
     */
    {
      provide: APP_INITIALIZER,
      useFactory: (rc: RemoteConfigService) => () => rc.init(),
      deps: [RemoteConfigService],
      multi: true,
    },
  ],
});
