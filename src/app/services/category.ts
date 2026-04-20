/**
 * @file category.service.ts
 * @description Servicio para la gestión de categorías de tareas.
 *
 * Cambios Angular 19+:
 *  - inject() en lugar de constructor para obtener TaskService.
 *  - Signal expuesto como readonly para consumo directo en templates.
 *  - computed() para derivar el conteo de categorías sin suscripciones manuales.
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { TaskService } from './task';

const STORAGE_KEY = 'todo_categories';

/** Paleta de colores disponibles para categorías */
export const CATEGORY_COLORS: { label: string; value: string }[] = [
  { label: 'Azul',     value: '#3880ff' },
  { label: 'Verde',    value: '#2dd36f' },
  { label: 'Rojo',     value: '#eb445a' },
  { label: 'Naranja',  value: '#ffc409' },
  { label: 'Morado',   value: '#7044ff' },
  { label: 'Turquesa', value: '#0cd1e8' },
  { label: 'Rosa',     value: '#f04141' },
  { label: 'Gris',     value: '#92949c' },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_default_1', name: 'Personal',  color: '#3880ff' },
  { id: 'cat_default_2', name: 'Trabajo',   color: '#2dd36f' },
  { id: 'cat_default_3', name: 'Urgente',   color: '#eb445a' },
];

@Injectable({ providedIn: 'root' })
export class CategoryService {

  /**
   * inject() — forma idiomática en Angular 19+ para inyectar dependencias
   * sin constructor. Equivalente a declararlo como parámetro del constructor,
   * pero más conciso y compatible con signals/functional patterns.
   */
  private readonly taskService = inject(TaskService);

  // ─────────────────────────────────────────────────────────────
  // ESTADO REACTIVO
  // ─────────────────────────────────────────────────────────────

  private readonly _categories$ = new BehaviorSubject<Category[]>(
    this.loadFromStorage()
  );

  readonly categories$: Observable<Category[]> = this._categories$.asObservable();

  /** Signal con la lista de categorías para uso con nueva sintaxis @for */
  readonly categories = signal<Category[]>(this.loadFromStorage());

  /** Signal derivado: conteo total de categorías */
  readonly categoryCount = computed(() => this.categories().length);

  // ─────────────────────────────────────────────────────────────
  // LECTURA
  // ─────────────────────────────────────────────────────────────

  getAllCategories(): Observable<Category[]> {
    return this.categories$;
  }

  /** Snapshot síncrono — útil al pre-rellenar selects en Alerts */
  getCategoriesSnapshot(): Category[] {
    return this._categories$.getValue();
  }

  getCategoryById(id: string): Category | undefined {
    return this._categories$.getValue().find(c => c.id === id);
  }

  getCategoryCount(): Observable<number> {
    return this.categories$.pipe(map(cats => cats.length));
  }

  // ─────────────────────────────────────────────────────────────
  // ESCRITURA (CRUD)
  // ─────────────────────────────────────────────────────────────

  /**
   * Crea una nueva categoría con validación de nombre único.
   *
   * @param name  - Nombre de la categoría (se normaliza a trim)
   * @param color - Color en hex de la paleta CATEGORY_COLORS
   * @returns La categoría creada, o null si la validación falla
   */
  addCategory(name: string, color: string): Category | null {
    const cleanName = name.trim();
    if (!cleanName) return null;

    const exists = this._categories$.getValue().some(
      c => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (exists) return null;

    const newCat: Category = {
      id: this.generateId(),
      name: cleanName,
      color,
    };

    this.updateState([...this._categories$.getValue(), newCat]);
    return newCat;
  }

  /**
   * Actualiza nombre y color de una categoría.
   * Valida duplicados excluyendo la propia categoría editada.
   */
  updateCategory(id: string, newName: string, newColor: string): boolean {
    const cleanName = newName.trim();
    if (!cleanName) return false;

    const cats = this._categories$.getValue();
    const idx = cats.findIndex(c => c.id === id);
    if (idx === -1) return false;

    const duplicate = cats.some(
      (c, i) => i !== idx && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicate) return false;

    const updated = [...cats];
    updated[idx] = { ...updated[idx], name: cleanName, color: newColor };
    this.updateState(updated);
    return true;
  }

  /**
   * Elimina una categoría y desvincula sus tareas automáticamente.
   * Las tareas NO se borran, quedan con categoryId = null.
   */
  deleteCategory(id: string): void {
    this.updateState(this._categories$.getValue().filter(c => c.id !== id));
    this.taskService.removeCategoryFromTasks(id);
  }

  // ─────────────────────────────────────────────────────────────
  // PRIVADOS
  // ─────────────────────────────────────────────────────────────

  /** Punto único de mutación: mantiene Observable, Signal y localStorage sincronizados */
  private updateState(categories: Category[]): void {
    this._categories$.next(categories);
    this.categories.set(categories);
    this.saveToStorage(categories);
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