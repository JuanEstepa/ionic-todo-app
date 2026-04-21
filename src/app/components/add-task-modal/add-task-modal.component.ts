/**
 * @file add-task-modal.component.ts
 * @description Modal para crear y editar tareas — se presenta como bottom sheet.
 *
 * Se usa en dos contextos:
 *  - Crear tarea nueva: se abre sin @Input(), taskTitle empieza vacío.
 *  - Editar tarea existente: se pasan initialTitle e initialCategoryId
 *    como componentProps desde el componente padre. ngOnInit los aplica
 *    al estado local y activa el modo edición (isEdit = true).
 *
 * Al guardar, el modal retorna { title, categoryId } al padre mediante
 * modalCtrl.dismiss(). El padre decide qué hacer con esos datos
 * (crear nueva tarea o actualizar la existente).
 *
 * ── DETALLES TÉCNICOS ─────────────────────────────────────────────────────
 *
 * - RemoteConfigService: controla si se muestra el botón "Nueva categoría".
 *   Si el feature flag show_categories_tab está en false, ese botón se
 *   oculta porque la página de categorías tampoco sería accesible.
 *
 * - ionViewDidEnter(): lifecycle hook de Ionic que se ejecuta cuando la
 *   animación del modal termina. Se usa para hacer foco en el input DESPUÉS
 *   de que el sheet esté completamente visible, evitando que el teclado
 *   interrumpa la animación de entrada.
 *
 * - toSignal(): convierte el Observable de categorías en un Signal para
 *   que el template lo lea directamente sin async pipe.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  Input,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonIcon, ModalController } from '@ionic/angular/standalone';
import { toSignal } from '@angular/core/rxjs-interop';
import { addIcons } from 'ionicons';
import { pricetagOutline } from 'ionicons/icons';

import { RemoteConfigService } from '../../services/remote-config.service';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-add-task-modal',
  templateUrl: './add-task-modal.component.html',
  styleUrls: ['./add-task-modal.component.scss'],
  standalone: true,
  imports: [FormsModule, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTaskModalComponent implements OnInit {
  // ─── DEPENDENCIAS ─────────────────────────────────────────────
  private readonly modalCtrl = inject(ModalController);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  /**
   * Expuesto como readonly para que el template lea el feature flag
   * show_categories_tab directamente desde el Signal del servicio.
   */
  readonly remoteConfig = inject(RemoteConfigService);

  // ─── DATOS REACTIVOS ──────────────────────────────────────────

  /** Lista de categorías disponibles para asignar a la tarea */
  readonly categories = toSignal(this.categoryService.getAllCategories(), {
    initialValue: [] as Category[],
  });

  // ─── INPUTS (modo edición) ────────────────────────────────────

  /** Título actual de la tarea cuando se abre en modo edición */
  @Input() initialTitle = '';

  /** Categoría actual de la tarea cuando se abre en modo edición */
  @Input() initialCategoryId: string | null = null;

  /** Referencia al input de texto para hacer foco al abrir el modal */
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  // ─── ESTADO LOCAL ─────────────────────────────────────────────
  taskTitle = '';
  selectedCategoryId: string | null = null;
  isEdit = false;

  constructor() {
    addIcons({ pricetagOutline });
  }

  /**
   * Inicializa el estado local con los valores recibidos por @Input().
   * Si initialTitle tiene valor, el modal está en modo edición.
   */
  ngOnInit(): void {
    this.taskTitle = this.initialTitle;
    this.selectedCategoryId = this.initialCategoryId;
    this.isEdit = !!this.initialTitle;
  }

  /**
   * Lifecycle hook de Ionic: se ejecuta cuando la animación del sheet
   * terminó. Hacer foco aquí evita que el teclado interrumpa la animación.
   */
  ionViewDidEnter(): void {
    setTimeout(() => this.titleInput.nativeElement.focus(), 100);
  }

  // ─── ACCIONES ─────────────────────────────────────────────────

  /** Selecciona o deselecciona una categoría para la tarea */
  selectCategory(id: string | null): void {
    this.selectedCategoryId = id;
  }

  /**
   * Cierra el modal y navega a la página de categorías.
   * Solo disponible cuando el feature flag show_categories_tab es true.
   */
  async goToCategories(): Promise<void> {
    await this.modalCtrl.dismiss();
    this.router.navigate(['/categories']);
  }

  /**
   * Valida que haya título y cierra el modal retornando los datos
   * al componente padre para que cree o actualice la tarea.
   */
  async save(): Promise<void> {
    if (!this.taskTitle.trim()) return;
    await this.modalCtrl.dismiss({
      title: this.taskTitle.trim(),
      categoryId: this.selectedCategoryId,
    });
  }

  /** Cierra el modal sin retornar datos — descarta los cambios */
  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(null);
  }
}
