/**
 * @file task.service.ts
 * @description Servicio central para la gestión de tareas (To-Do).
 *
 * Cambios Angular 19+:
 *  - inject() reemplaza la inyección por constructor.
 *  - Signals (signal, computed) complementan el BehaviorSubject para
 *    exponer estado derivado de forma más ergonómica en templates modernos.
 *  - toSignal() convierte el Observable en un Signal para uso directo
 *    con la nueva sintaxis de control flow (@for, @if).
 *
 * Patrón: Repository + Reactive State (BehaviorSubject + Signals).
 */

import { Injectable, computed, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Task } from '../models/task.model';

const STORAGE_KEY = 'todo_tasks';

@Injectable({ providedIn: 'root' })
export class TaskService {

  // ─────────────────────────────────────────────────────────────
  // ESTADO REACTIVO
  // ─────────────────────────────────────────────────────────────

  /**
   * BehaviorSubject privado: fuente de verdad de la lista de tareas.
   * Cualquier mutación pasa por updateState() para garantizar
   * que memoria y localStorage estén siempre sincronizados.
   */
  private readonly _tasks$ = new BehaviorSubject<Task[]>(this.loadFromStorage());

  /** Observable público para suscripciones con async pipe */
  readonly tasks$: Observable<Task[]> = this._tasks$.asObservable();

  /**
   * Signal que expone la lista completa como estado reactivo.
   * Los componentes con nueva sintaxis @for pueden leerlo sin async pipe.
   */
  readonly tasks = signal<Task[]>(this.loadFromStorage());

  /** Signal derivado: número de tareas pendientes (para badges) */
  readonly pendingCount = computed(() =>
    this.tasks().filter(t => !t.completed).length
  );

  /** Signal derivado: número de tareas completadas */
  readonly completedCount = computed(() =>
    this.tasks().filter(t => t.completed).length
  );

  // ─────────────────────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────────────────────

  getAllTasks(): Observable<Task[]> {
    return this.tasks$;
  }

  /**
   * Observable filtrado por categoría.
   * 'all' retorna todas; null retorna tareas sin categoría.
   */
  getTasksByCategory(categoryId: string | null | 'all'): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks =>
        categoryId === 'all'
          ? tasks
          : tasks.filter(t => t.categoryId === categoryId)
      )
    );
  }

  getPendingTasks(): Observable<Task[]> {
    return this.tasks$.pipe(map(tasks => tasks.filter(t => !t.completed)));
  }

  getCompletedTasks(): Observable<Task[]> {
    return this.tasks$.pipe(map(tasks => tasks.filter(t => t.completed)));
  }

  getTaskById(id: string): Task | undefined {
    return this._tasks$.getValue().find(t => t.id === id);
  }

  // ─────────────────────────────────────────────────────────────
  // ESCRITURA (CRUD)
  // ─────────────────────────────────────────────────────────────

  /**
   * Crea una nueva tarea y la agrega al estado.
   *
   * @param title      - Texto de la tarea (se sanitiza quitando espacios)
   * @param categoryId - Categoría opcional; null si no se asigna
   * @returns La tarea creada, o null si el título está vacío
   */
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

    this.updateState([...this._tasks$.getValue(), newTask]);
    return newTask;
  }

  /**
   * Actualiza el título de una tarea existente.
   * Usa spread operator para mantener inmutabilidad del objeto.
   */
  updateTaskTitle(id: string, newTitle: string): boolean {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return false;

    const tasks = this._tasks$.getValue();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;

    const updated = [...tasks];
    updated[idx] = { ...updated[idx], title: cleanTitle };
    this.updateState(updated);
    return true;
  }

  /** Alterna el estado completado/pendiente de una tarea */
  toggleTask(id: string): void {
    const updated = this._tasks$.getValue().map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    this.updateState(updated);
  }

  /** Asigna o quita la categoría de una tarea */
  assignCategory(taskId: string, categoryId: string | null): void {
    const updated = this._tasks$.getValue().map(t =>
      t.id === taskId ? { ...t, categoryId } : t
    );
    this.updateState(updated);
  }

  /** Elimina una tarea por ID */
  deleteTask(id: string): void {
    this.updateState(this._tasks$.getValue().filter(t => t.id !== id));
  }

  /** Elimina todas las tareas completadas de una vez */
  clearCompleted(): void {
    this.updateState(this._tasks$.getValue().filter(t => !t.completed));
  }

  /**
   * Desvincula una categoría eliminada de todas las tareas que la tenían.
   * Llamado por CategoryService al borrar una categoría.
   */
  removeCategoryFromTasks(categoryId: string): void {
    const updated = this._tasks$.getValue().map(t =>
      t.categoryId === categoryId ? { ...t, categoryId: null } : t
    );
    this.updateState(updated);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /**
   * Punto único de mutación: actualiza BehaviorSubject, Signal y localStorage.
   * Al mantener ambas representaciones (Observable + Signal) sincronizadas
   * desde aquí, los componentes que usen cualquiera de los dos siempre
   * ven el mismo estado.
   */
  private updateState(tasks: Task[]): void {
    this._tasks$.next(tasks);
    this.tasks.set(tasks);
    this.saveToStorage(tasks);
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