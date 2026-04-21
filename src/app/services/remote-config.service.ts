/**
 * @file remote-config.service.ts
 * @description Servicio que inicializa Firebase y gestiona Remote Config.
 *
 * ── QUÉ HACE ESTE SERVICIO ────────────────────────────────────────────────
 *
 * 1. Inicializa la app Firebase UNA sola vez (patrón singleton via providedIn root).
 *    Si Firebase ya está inicializado (hot reload en dev), reutiliza la instancia.
 *
 * 2. Configura Remote Config con un intervalo mínimo de fetch:
 *    - Producción: 1 hora (valor recomendado por Firebase para no agotar la cuota).
 *    - Desarrollo:  0 ms  (fetch inmediato en cada recarga para iterar rápido).
 *
 * 3. Expone un Signal `showCategoriesTab` que los componentes leen directamente.
 *    El Signal empieza en `true` (valor seguro por defecto) y se actualiza
 *    cuando Firebase responde con el valor real del parámetro remoto.
 *
 * 4. El método init() es llamado una vez desde main.ts como APP_INITIALIZER,
 *    garantizando que Remote Config esté listo ANTES de que se renderice
 *    cualquier componente. Esto evita parpadeos en la UI.
 *
 * ── FEATURE FLAG ──────────────────────────────────────────────────────────
 *
 * Parámetro: show_categories_tab (Boolean)
 * - true  → la pestaña "Categorías" es visible en el tab bar
 * - false → la pestaña "Categorías" desaparece del tab bar
 *
 * Para demostrar el feature flag al evaluador:
 *   1. Ve a Firebase Console → Remote Config
 *   2. Cambia show_categories_tab a false → Publicar cambios
 *   3. Recarga la app → la pestaña desaparece sin tocar código
 *   4. Cámbialo a true  → Publicar → recarga → vuelve a aparecer
 */

import { Injectable, signal } from '@angular/core';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import {
  RemoteConfig,
  getRemoteConfig,
  fetchAndActivate,
  getValue,
} from 'firebase/remote-config';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RemoteConfigService {
  // ─── INSTANCIAS FIREBASE ──────────────────────────────────────
  private firebaseApp!: FirebaseApp;
  private remoteConfig!: RemoteConfig;

  // ─── SIGNALS PÚBLICOS ─────────────────────────────────────────

  /**
   * Feature flag: controla la visibilidad de la pestaña de Categorías.
   * Valor inicial true = pestaña visible mientras Firebase responde.
   * Esto evita que la pestaña "parpadee" al cargar.
   */
  readonly showCategoriesTab = signal<boolean>(true);

  // ─── INICIALIZACIÓN ───────────────────────────────────────────

  /**
   * Inicializa Firebase y obtiene los valores de Remote Config.
   *
   * Se llama como APP_INITIALIZER en main.ts, por lo que Angular
   * espera a que esta Promise resuelva antes de renderizar la app.
   *
   * Si Firebase falla (sin internet, cuota agotada, etc.), el catch
   * garantiza que la app igual carga con los valores por defecto.
   */
  async init(): Promise<void> {
    try {
      // Evitar inicializar Firebase dos veces en hot reload de desarrollo
      this.firebaseApp = getApps().length
        ? getApps()[0]
        : initializeApp(environment.firebaseConfig);

      this.remoteConfig = getRemoteConfig(this.firebaseApp);

      // Intervalo mínimo entre fetches:
      // - En dev: 0 para ver cambios en cada recarga sin esperar
      // - En prod: 3600000 ms (1 hora) para respetar la cuota gratuita de Firebase
      this.remoteConfig.settings.minimumFetchIntervalMillis =
        environment.production ? 3_600_000 : 0;

      // Valores por defecto locales: se usan si Firebase no responde
      // o si el usuario nunca ha tenido conexión.
      this.remoteConfig.defaultConfig = {
        show_categories_tab: true,
      };

      // fetchAndActivate() hace dos cosas en una llamada:
      // 1. fetch()    → descarga los valores más recientes del servidor
      // 2. activate() → los activa para que getValue() los retorne
      await fetchAndActivate(this.remoteConfig);

      // Leer el parámetro y actualizar el signal
      this.applyFlags();

      console.log(
        '[RemoteConfig] Cargado. show_categories_tab =',
        this.showCategoriesTab(),
      );
    } catch (error) {
      // Si Remote Config falla, la app sigue funcionando con defaults
      console.warn(
        '[RemoteConfig] Error al cargar, usando valores por defecto:',
        error,
      );
    }
  }

  /**
   * Lee todos los feature flags de Remote Config y actualiza los signals.
   * Centralizar aquí la lectura facilita agregar nuevos flags en el futuro:
   * solo hay que añadir una línea aquí y un signal nuevo arriba.
   */
  private applyFlags(): void {
    this.showCategoriesTab.set(
      getValue(this.remoteConfig, 'show_categories_tab').asBoolean(),
    );
  }
}
