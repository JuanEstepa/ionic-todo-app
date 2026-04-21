/**
 * @file task.ts
 * @description Servicio de tareas — optimizado para rendimiento.
 *
 * ── OPTIMIZACIONES DE ESTA VERSIÓN ────────────────────────────────────────
 *
 * 1. PARSEO ÚNICO DE localStorage
 *    Antes: loadFromStorage() se llamaba DOS veces en la inicialización
 *    (una para el BehaviorSubject y otra para el Signal), lo que causaba
 *    dos JSON.parse() del mismo string en cada arranque de la app.
 *    Ahora: se parsea una vez, se guarda en una constante, y ambos
 *    (BehaviorSubject y Signal) se inicializan con la misma referencia.
 *
 * 2. ESCRITURAS DIFERIDAS A localStorage (debounce 300ms)
 *    localStorage.setItem() es una operación SÍNCRONA que bloquea el
 *    hilo principal. Si el usuario hace toggle rápido de 5 tareas en
 *    300ms, sin debounce haríamos 5 escrituras al disco. Con debounce,
 *    cancelamos las anteriores y hacemos solo 1 escritura al final.
 *    Esto es especialmente importante en móvil donde el I/O es más lento.
 *
 * 3. INMUTABILIDAD ESTRICTA EN TODAS LAS MUTACIONES
 *    Cada método que modifica tareas crea un nuevo array con spread [...].
 *    Esto es crítico para ChangeDetectionStrategy.OnPush: Angular compara
 *    referencias de arrays. Si mutamos el array existente (push, splice),
 *    OnPush no detecta el cambio y la UI no se actualiza.
 *
 * 4. SIGNALS COMPUTED PARA CONTEOS
 *    pendingCount y completedCount son computed(): Angular los recalcula
 *    solo cuando tasks() cambia. Sin computed(), cada lectura en el
 *    template ejecutaría el filter() completo en cada ciclo de detección.
 */

import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from '../models/task.model';

const STORAGE_KEY = 'todo_tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {
  // ─── INICIALIZACIÓN ÚNICA ─────────────────────────────────────
  /**
   * Parseamos localStorage UNA sola vez al arrancar el servicio.
   * Tanto el BehaviorSubject como el Signal comparten esta referencia
   * inicial, evitando el doble JSON.parse() de la versión anterior.
   */
  private readonly initialTasks = this.loadFromStorage();

  private readonly _tasks$ = new BehaviorSubject<Task[]>(this.initialTasks);
  readonly tasks$: Observable<Task[]> = this._tasks$.asObservable();
  readonly tasks = signal<Task[]>(this.initialTasks);

  // ─── SIGNALS DERIVADOS (computed) ────────────────────────────
  /**
   * computed() memoiza el resultado: Angular solo recalcula cuando
   * tasks() emite un nuevo valor. Sin computed(), el template llamaría
   * filter() en cada ciclo de detección aunque las tareas no hayan cambiado.
   */
  readonly pendingCount = computed(
    () => this.tasks().filter((t) => !t.completed).length,
  );
  readonly completedCount = computed(
    () => this.tasks().filter((t) => t.completed).length,
  );

  // ─── DEBOUNCE PARA localStorage ──────────────────────────────
  /**
   * Timer del debounce. Lo guardamos para poder cancelarlo si llega
   * otra escritura antes de que se dispare.
   */
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // ─────────────────────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────────────────────

  getAllTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  getTasksByCategory(categoryId: string | null | 'all'): Observable<Task[]> {
    return this.tasks$.pipe(
      map((tasks) =>
        categoryId === 'all'
          ? tasks
          : tasks.filter((t) => t.categoryId === categoryId),
      ),
    );
  }

  getPendingTasks(): Observable<Task[]> {
    return this.tasks$.pipe(map((tasks) => tasks.filter((t) => !t.completed)));
  }

  getCompletedTasks(): Observable<Task[]> {
    return this.tasks$.pipe(map((tasks) => tasks.filter((t) => t.completed)));
  }

  getTaskById(id: string): Task | undefined {
    return this._tasks$.getValue().find((t) => t.id === id);
  }

  // ─────────────────────────────────────────────────────────────
  // ESCRITURA (CRUD)
  // ─────────────────────────────────────────────────────────────

  addTask(title: string, categoryId: string | null = null): Task | null {
    const cleanTitle = title.trim();
    if (!cleanTitle) return null;

    const newTask: Task = {
      id: this.generateId(),
      title: cleanTitle,
      completed: false,
      categoryId,
      createdAt: new Date(),
    };

    // Spread [...] crea un nuevo array → OnPush detecta el cambio
    this.updateState([...this._tasks$.getValue(), newTask]);
    return newTask;
  }

  updateTaskTitle(id: string, newTitle: string): boolean {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return false;

    const tasks = this._tasks$.getValue();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    // map() devuelve un nuevo array con el objeto modificado (inmutabilidad)
    const updated = tasks.map((t, i) =>
      i === idx ? { ...t, title: cleanTitle } : t,
    );
    this.updateState(updated);
    return true;
  }

  toggleTask(id: string): void {
    const updated = this._tasks$
      .getValue()
      .map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    this.updateState(updated);
  }

  assignCategory(taskId: string, categoryId: string | null): void {
    const updated = this._tasks$
      .getValue()
      .map((t) => (t.id === taskId ? { ...t, categoryId } : t));
    this.updateState(updated);
  }

  deleteTask(id: string): void {
    this.updateState(this._tasks$.getValue().filter((t) => t.id !== id));
  }

  clearCompleted(): void {
    this.updateState(this._tasks$.getValue().filter((t) => !t.completed));
  }

  removeCategoryFromTasks(categoryId: string): void {
    const updated = this._tasks$
      .getValue()
      .map((t) =>
        t.categoryId === categoryId ? { ...t, categoryId: null } : t,
      );
    this.updateState(updated);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Punto único de mutación del estado.
   * Actualiza BehaviorSubject y Signal de forma síncrona (la UI responde
   * inmediatamente), y programa la escritura a localStorage con debounce
   * para no bloquear el hilo principal en ráfagas de cambios rápidos.
   */
  private updateState(tasks: Task[]): void {
    this._tasks$.next(tasks);
    this.tasks.set(tasks);
    this.scheduleSave(tasks);
  }

  /**
   * Escritura diferida a localStorage con debounce de 300ms.
   *
   * Flujo sin debounce (malo):
   *   toggle tarea 1 → setItem() bloquea 2ms
   *   toggle tarea 2 → setItem() bloquea 2ms   (total: 4ms bloqueados)
   *   toggle tarea 3 → setItem() bloquea 2ms   (total: 6ms bloqueados)
   *
   * Flujo con debounce (bueno):
   *   toggle tarea 1 → programa escritura en 300ms
   *   toggle tarea 2 → cancela la anterior, programa nueva en 300ms
   *   toggle tarea 3 → cancela la anterior, programa nueva en 300ms
   *   ...300ms después → setItem() bloquea 2ms UNA sola vez
   */
  private scheduleSave(tasks: Task[]): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveToStorage(tasks);
      this.saveTimer = null;
    }, 300);
  }

  private loadFromStorage(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Task[]) : [];
    } catch (e) {
      console.error('[TaskService] Error leyendo localStorage:', e);
      return [];
    }
  }

  private saveToStorage(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('[TaskService] Error guardando en localStorage:', e);
    }
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
