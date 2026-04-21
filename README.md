# ionic-todo-app

App móvil de gestión de tareas construida con **Ionic + Angular 19+** como parte de una prueba técnica. Permite crear, organizar y categorizar tareas con persistencia local, un feature flag via Firebase Remote Config, y soporte para Android e iOS a través de Capacitor.

---

## Tecnologías

| Tecnología      | Versión | Uso                                        |
| --------------- | ------- | ------------------------------------------ |
| Ionic Framework | 8.x     | UI components móviles                      |
| Angular         | 19+     | Framework frontend (standalone components) |
| TypeScript      | 5.x     | Lenguaje principal                         |
| Capacitor       | 8.x     | Bridge nativo Android/iOS                  |
| Firebase        | 11.x    | Remote Config / Feature flags              |
| RxJS            | 7.x     | Estado reactivo con BehaviorSubject        |
| Angular Signals | 19+     | Estado local y computed derivados          |

---

## Requisitos previos

- Node.js v18+ (recomendado v20 LTS)
- npm v9+
- Ionic CLI: `npm install -g @ionic/cli`
- Android Studio (para compilar APK)
- Xcode 15+ en macOS (para compilar iOS)

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/JuanEstepa/ionic-todo-app.git
cd ionic-todo-app

# 2. Instalar dependencias
npm install

# 3. Correr en el navegador
ionic serve
```

La app queda disponible en `http://localhost:8100`.

---

## Compilación móvil

> Una aclaración importante: este proyecto usa **Capacitor** en lugar de Cordova. Capacitor es el sucesor oficial mantenido por el equipo de Ionic desde 2021 — ofrece mejor rendimiento, integración más limpia con herramientas nativas, y es la opción recomendada para proyectos nuevos. La prueba técnica menciona Cordova, pero dado que la app base ya venía configurada con Capacitor, mantener esa configuración es la decisión técnica correcta.

### Android (APK)

```bash
# 1. Build de producción
ionic build --prod

# 2. Sincronizar con Capacitor
npx cap sync android

# 3. Abrir en Android Studio
npx cap open android

# 4. En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

### iOS (IPA)

```bash
# 1. Build de producción
ionic build --prod

# 2. Sincronizar con Capacitor
npx cap sync ios

# 3. Abrir en Xcode
npx cap open ios

# 4. En Xcode: seleccionar simulador → Product → Build
```

**Nota sobre el IPA:** el archivo incluido en los entregables es un simulator build firmado con Apple ID personal. Distribuir en App Store requiere Apple Developer Account, lo cual está fuera del alcance de esta prueba. La app fue verificada funcionando en simulador iOS dentro de Xcode.

---

## Firebase y Remote Config

### Feature flag: `show_categories_tab`

Se implementó un feature flag con Firebase Remote Config que controla si la pestaña de Categorías aparece o no en el tab bar, sin tocar código.

| Valor en Firebase | Comportamiento                     |
| ----------------- | ---------------------------------- |
| `true`            | La pestaña "Categorías" es visible |
| `false`           | La pestaña "Categorías" desaparece |

### Cómo probarlo

1. Ir a [Firebase Console](https://console.firebase.google.com) → proyecto `ionic-todo`
2. Menú izquierdo → **Remote Config**
3. Editar el parámetro `show_categories_tab`
4. Cambiar el valor → **Publicar cambios**
5. Recargar la app — el cambio se refleja de inmediato

### Cómo está implementado

Firebase se inicializa como `APP_INITIALIZER` en `main.ts`, lo que hace que Angular espere la respuesta de Remote Config antes de renderizar cualquier componente. Esto evita el parpadeo que ocurriría si el flag se leyera después del primer render.

```typescript
// main.ts
{
  provide: APP_INITIALIZER,
  useFactory: (rc: RemoteConfigService) => () => rc.init(),
  deps: [RemoteConfigService],
  multi: true,
}
```

El intervalo de fetch está configurado según el entorno:

- **Desarrollo:** `0ms` — fetch inmediato en cada recarga
- **Producción:** `3.600.000ms` (1 hora) — respeta la cuota gratuita de Firebase

---

## Arquitectura del proyecto

```
src/app/
├── components/
│   ├── add-task-modal/       # Modal para crear/editar tareas
│   └── add-category-modal/   # Modal para crear/editar categorías
├── layout/
│   └── tabs/                 # Tab bar con feature flag integrado
├── models/
│   ├── task.model.ts         # Interface Task
│   └── category.model.ts     # Interface Category
├── pages/
│   ├── home/                 # Lista de tareas con filtros
│   └── categories/           # Gestión de categorías
└── services/
    ├── task.ts               # CRUD de tareas + BehaviorSubject + Signals
    ├── category.ts           # CRUD de categorías + categoryMap O(1)
    └── remote-config.service.ts  # Firebase Remote Config
```

### Patrones utilizados

- **Repository pattern** — servicios desacoplados de la vista
- **Reactive state** — `BehaviorSubject` + Angular Signals como fuente de verdad
- **Standalone components** — sin NgModule, imports explícitos por componente
- **OnPush change detection** — re-renders solo cuando los Signals cambian

---

## Optimizaciones de rendimiento

### 1. ChangeDetectionStrategy.OnPush

Todos los componentes usan `OnPush`. Angular solo re-renderiza cuando un Signal leído en el template cambia de valor, no en cada evento global de la app.

### 2. Computed Map para categorías — O(1)

En lugar de hacer `Array.find()` por cada tarea en cada render, `categoryInfoMap` es un `computed()` que construye un `Map<categoryId, {name, color}>` una sola vez cuando las categorías cambian. El template accede en O(1) en vez de O(n).

### 3. `@let` para evitar lecturas dobles

```html
@let info = categoryInfoMap().get(task.categoryId ?? '');
```

Lee el Map una sola vez por tarea y reutiliza el resultado en el mismo template.

### 4. Debounce de 300ms en escrituras a localStorage

`localStorage.setItem()` es síncrono y bloquea el hilo principal. Las escrituras se agrupan con un debounce de 300ms, convirtiendo una ráfaga de 5 toggles rápidos en una sola operación de disco.

### 5. Parseo único de localStorage al arrancar

`loadFromStorage()` se llama una sola vez al inicializar el servicio. Tanto el `BehaviorSubject` como el Signal se inicializan con la misma referencia, eliminando el doble `JSON.parse()`.

### 6. `track` por id en `@for`

```html
@for (task of activeTasks(); track task.id)
```

Angular reutiliza los nodos DOM existentes al actualizar la lista en vez de destruirlos y recrearlos todos.

### 7. Lazy loading con `loadComponent()`

Cada página se descarga solo cuando el usuario navega a ella, reduciendo el bundle inicial.

---

## Descarga de builds

| Plataforma | Archivo                   | Enlace                                                                                              |
| ---------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| Android    | `app-debug.apk`           | [Descargar APK](https://drive.google.com/file/d/19AyceEZm15QLfSr3p-_A34DvtoC4nUKQ/view?usp=sharing) |
| iOS        | `IonicTodo-simulator.ipa` | [Descargar IPA](https://drive.google.com/file/d/1v70sqm-CJpNgOUV_eAzlXat22OAJxgsF/view?usp=sharing) |

> El IPA es un simulator build.

---

## Respuestas a preguntas

### ¿Cuáles fueron los principales desafíos?

**Firebase Remote Config con el ciclo de vida de Angular.** El problema era que si Remote Config se inicializaba después del primer render, la UI mostraba el valor por defecto del flag y luego lo actualizaba — causando un parpadeo visible. La solución fue usar `APP_INITIALIZER` en `main.ts` para que Angular esperara la respuesta de Firebase antes de montar cualquier componente.

**Sincronizar BehaviorSubject y Signals.** El proyecto usa ambos: Observables para compatibilidad con código existente, y Signals para la ergonomía en templates modernos. El riesgo era que se desincronizaran. Se resolvió con un método privado `updateState()` en cada servicio que actualiza ambas representaciones en una sola llamada — nunca se modifica uno sin el otro.

**Generar el IPA sin Apple Developer Account.** La firma de distribución de Apple requiere una cuenta de pago. Se resolvió generando un simulator build con `xcodebuild` usando el SDK `iphonesimulator`, que produce un IPA válido para demostración sin necesitar firma de distribución.

### ¿Qué técnicas de optimización aplicaste y por qué?

Las optimizaciones se aplicaron en tres capas:

**Detección de cambios:** `OnPush` en todos los componentes. Angular solo re-renderiza cuando un Signal cambia, no en cada evento del sistema. Importante en listas largas donde completar una tarea no debería disparar el re-render de las demás.

**Templates:** Se utilizo un `computed()` que construye un Map una sola vez cuando los datos cambian, y `@let` para leer ese Map una sola vez por item.

**Persistencia:** Debounce de 300ms en escrituras a `localStorage`. Sin él, hacer toggle rápido de 5 tareas genera 5 llamadas síncronas al disco. Con él, se agrupan en una sola.

### ¿Cómo aseguraste la calidad y mantenibilidad del código?

**Una sola fuente de mutación.** El método privado `updateState()` en cada servicio es el único lugar donde se modifica el estado. Garantiza que el Signal, el BehaviorSubject y localStorage siempre estén sincronizados.

**Componentes sin lógica de negocio.** Los componentes solo se ocupan de la presentación y de delegar acciones a los servicios. Cada pieza es testeable de forma independiente.

**Inmutabilidad.** Todas las operaciones que modifican datos crean nuevos arrays (`[...tasks]`, `.map()`, `.filter()`), nunca mutan el array existente. Esto es compatible con `OnPush` y evita bugs difíciles de rastrear.

**Documentación del por qué, no del qué.** Cada decisión técnica no obvia está documentada explicando la razón detrás de ella, no solo lo que hace. Esto facilita el mantenimiento y el onboarding de nuevos desarrolladores.

**Standalone components con Angular 19+.** Los imports explícitos en cada `@Component` hacen que las dependencias de cada componente sean visibles directamente en el decorador, sin rastrear NgModules. Reduce el acoplamiento y mejora la claridad del proyecto.
