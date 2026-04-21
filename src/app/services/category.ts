/**
 * @file category.ts
 * @description Servicio de categorías — optimizado para rendimiento.
 *
 * ── OPTIMIZACIONES DE ESTA VERSIÓN ────────────────────────────────────────
 *
 * 1. PARSEO ÚNICO DE localStorage — misma mejora que en TaskService.
 *
 * 2. ESCRITURAS DIFERIDAS (debounce 300ms) — misma mejora que en TaskService.
 *    Las categorías se editan con menos frecuencia que las tareas,
 *    pero el patrón es consistente en ambos servicios.
 *
 * 3. categoryMap COMPUTADO
 *    Antes: getCategoryById() hacía Array.find() en cada llamada.
 *    Con muchas categorías y tareas, esto se llamaba N veces por render.
 *    Ahora: categoryMap es un computed() que construye un Map<id, Category>
 *    UNA sola vez cuando categories() cambia. Las búsquedas posteriores
 *    son O(1) en lugar de O(n).
 *
 *    Sin mapa (antes):    getCategoryById('cat_123') → recorre el array
 *    Con mapa (ahora):    categoryMap().get('cat_123') → acceso directo
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { TaskService } from './task';

const STORAGE_KEY = 'todo_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_default_1', name: 'Personal', color: '#3880ff' },
  { id: 'cat_default_2', name: 'Trabajo', color: '#2dd36f' },
  { id: 'cat_default_3', name: 'Urgente', color: '#eb445a' },
];

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly taskService = inject(TaskService);

  // ─── INICIALIZACIÓN ÚNICA ─────────────────────────────────────
  private readonly initialCategories = this.loadFromStorage();

  private readonly _categories$ = new BehaviorSubject<Category[]>(
    this.initialCategories,
  );
  readonly categories$: Observable<Category[]> =
    this._categories$.asObservable();
  readonly categories = signal<Category[]>(this.initialCategories);

  // ─── SIGNALS DERIVADOS ────────────────────────────────────────

  /**
   * Map computado para búsquedas O(1) por ID.
   *
   * Se recalcula SOLO cuando categories() cambia (cuando se agrega,
   * edita o elimina una categoría). El resto del tiempo, cualquier
   * llamada a categoryMap().get(id) es acceso directo sin iterar.
   *
   * Uso en componentes:
   *   this.categoryService.categoryMap().get(task.categoryId)
   */
  readonly categoryMap = computed(() => {
    const m = new Map<string, Category>();
    for (const cat of this.categories()) {
      m.set(cat.id, cat);
    }
    return m;
  });

  readonly categoryCount = computed(() => this.categories().length);

  // ─── DEBOUNCE ─────────────────────────────────────────────────
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  // ─────────────────────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────────────────────

  getAllCategories(): Observable<Category[]> {
    return this.categories$;
  }

  getCategoriesSnapshot(): Category[] {
    return this._categories$.getValue();
  }

  /**
   * Búsqueda O(1) usando el Map computado.
   * Antes era Array.find() O(n) en cada llamada.
   */
  getCategoryById(id: string): Category | undefined {
    return this.categoryMap().get(id);
  }

  getCategoryCount(): Observable<number> {
    return this.categories$.pipe(map((cats) => cats.length));
  }

  // ─────────────────────────────────────────────────────────────
  // ESCRITURA (CRUD)
  // ─────────────────────────────────────────────────────────────

  addCategory(name: string, color: string): Category | null {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const exists = this._categories$
      .getValue()
      .some((c) => c.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) return null;

    const newCat: Category = {
      id: this.generateId(),
      name: cleanName,
      color,
    };

    this.updateState([...this._categories$.getValue(), newCat]);
    return newCat;
  }

  updateCategory(id: string, newName: string, newColor: string): boolean {
    const cleanName = newName.trim();
    if (!cleanName) return false;

    const cats = this._categories$.getValue();
    const idx = cats.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    const duplicate = cats.some(
      (c, i) => i !== idx && c.name.toLowerCase() === cleanName.toLowerCase(),
    );
    if (duplicate) return false;

    const updated = cats.map((c, i) =>
      i === idx ? { ...c, name: cleanName, color: newColor } : c,
    );
    this.updateState(updated);
    return true;
  }

  deleteCategory(id: string): void {
    this.updateState(this._categories$.getValue().filter((c) => c.id !== id));
    this.taskService.removeCategoryFromTasks(id);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────────────────────

  private updateState(categories: Category[]): void {
    this._categories$.next(categories);
    this.categories.set(categories);
    this.scheduleSave(categories);
  }

  private scheduleSave(categories: Category[]): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveToStorage(categories);
      this.saveTimer = null;
    }, 300);
  }

  private loadFromStorage(): Category[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Category[];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    } catch (e) {
      console.error('[CategoryService] Error leyendo localStorage:', e);
      return DEFAULT_CATEGORIES;
    }
  }

  private saveToStorage(categories: Category[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    } catch (e) {
      console.error('[CategoryService] Error guardando en localStorage:', e);
    }
  }

  private generateId(): string {
    return `cat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
