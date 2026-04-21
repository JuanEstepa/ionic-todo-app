/**
 * @file home.page.ts
 * @description Página principal — optimizada para rendimiento.
 *
 * ── OPTIMIZACIONES DE ESTA VERSIÓN ────────────────────────────────────────
 *
 * 1. ELIMINACIÓN DE FUNCIONES EN EL TEMPLATE (el cambio más importante)
 *
 *    El problema:
 *    En el template anterior existían llamadas como:
 *      getCategoryColor(task.categoryId)
 *      getCategoryName(task.categoryId)
 *
 *    Angular ejecuta estas funciones en CADA ciclo de change detection,
 *    para CADA tarea visible. Con 50 tareas → 100 llamadas por ciclo.
 *    Con OnPush el impacto es menor, pero sigue siendo innecesario.
 *
 *    La solución:
 *    categoryInfoMap es un computed() que construye un Map<categoryId, {name, color}>
 *    UNA sola vez cuando las categorías cambian. El template accede con
 *    categoryInfoMap().get(task.categoryId) que es O(1) y no es una función
 *    sino una lectura de Signal — Angular la trata de forma óptima.
 *
 * 2. COMPUTED PARA FILTRADO
 *    filteredTasks, activeTasks y completedTasks son computed() que se
 *    recalculan solo cuando allTasks() o selectedCategoryId() cambian.
 *    No hay suscripciones manuales ni pipes en el template.
 *
 * 3. ChangeDetectionStrategy.OnPush
 *    Angular solo re-renderiza este componente cuando:
 *    - Un Signal leído en el template cambia de valor
 *    - Se emite un evento de usuario (@Output, event binding)
 *    - Se llama explícitamente a markForCheck()
 *    Esto elimina re-renders innecesarios en cada ciclo global de la app.
 *
 * 4. track por id en @for
 *    Angular reutiliza los nodos DOM existentes al reordenar/actualizar
 *    la lista. Sin track, destruiría y recrearía todos los elementos
 *    aunque solo haya cambiado uno.
 */

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonIcon,
  IonCheckbox,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  AlertController,
  ToastController,
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  createOutline,
  ellipsisVertical,
  checkmarkDoneOutline,
  pricetagsOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

import { TaskService } from '../../services/task';
import { CategoryService } from '../../services/category';
import { Task } from '../../models/task.model';
import { Category } from '../../models/category.model';
import { AddTaskModalComponent } from '../../components/add-task-modal/add-task-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonIcon,
    IonCheckbox,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  // ─── DEPENDENCIAS ─────────────────────────────────────────────
  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly modalCtrl = inject(ModalController);

  // ─── ESTADO LOCAL ─────────────────────────────────────────────
  readonly selectedCategoryId = signal<string>('all');

  // ─── SIGNALS DE DATOS ─────────────────────────────────────────
  readonly allTasks = toSignal(this.taskService.getAllTasks(), {
    initialValue: [] as Task[],
  });
  readonly categories = toSignal(this.categoryService.getAllCategories(), {
    initialValue: [] as Category[],
  });

  // ─── COMPUTED: FILTRADO ───────────────────────────────────────

  /**
   * Lista filtrada por categoría seleccionada.
   * Se recalcula solo cuando allTasks() o selectedCategoryId() cambian.
   */
  readonly filteredTasks = computed(() => {
    const catId = this.selectedCategoryId();
    const tasks = this.allTasks();
    return catId === 'all'
      ? tasks
      : tasks.filter((t) => t.categoryId === catId);
  });

  /**
   * Tareas pendientes del filtro activo.
   * Depende de filteredTasks() — se recalcula en cadena automáticamente.
   */
  readonly activeTasks = computed(() =>
    this.filteredTasks().filter((t) => !t.completed),
  );
  readonly completedTasks = computed(() =>
    this.filteredTasks().filter((t) => t.completed),
  );

  // ─── COMPUTED: MAPA DE CATEGORÍAS ────────────────────────────

  /**
   * OPTIMIZACIÓN CLAVE: Map<categoryId, {name, color}> pre-construido.
   *
   * El template YA NO llama getCategoryColor() ni getCategoryName()
   * en cada tarea. En cambio lee este Map que se construye una sola vez
   * cuando la lista de categorías cambia.
   *
   * Antes (O(n) por tarea por render):
   *   getCategoryColor(task.categoryId) → Array.find() en cada llamada
   *
   * Ahora (O(1) por tarea, O(n) solo cuando cambian categorías):
   *   categoryInfoMap().get(task.categoryId)?.color
   */
  readonly categoryInfoMap = computed(() => {
    const m = new Map<string, { name: string; color: string }>();
    for (const cat of this.categories()) {
      m.set(cat.id, { name: cat.name, color: cat.color });
    }
    return m;
  });

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      createOutline,
      ellipsisVertical,
      checkmarkDoneOutline,
      pricetagsOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {}

  // ─── FILTROS ──────────────────────────────────────────────────

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

  // ─── ACCIONES ─────────────────────────────────────────────────

  toggleTask(taskId: string): void {
    this.taskService.toggleTask(taskId);
  }

  async deleteTask(task: Task): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar tarea',
      message: `¿Eliminar "${task.title}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.taskService.deleteTask(task.id);
            this.showToast(`Tarea "${task.title}" eliminada`, 'danger');
          },
        },
      ],
    });
    await alert.present();
  }

  async editTask(task: Task): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddTaskModalComponent,
      breakpoints: [0, 0.6, 0.85],
      initialBreakpoint: 0.6,
      handle: true,
      cssClass: 'add-task-sheet',
      componentProps: {
        initialTitle: task.title,
        initialCategoryId: task.categoryId,
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.title) {
      this.taskService.updateTaskTitle(task.id, data.title);
      if (data.categoryId !== undefined) {
        this.taskService.assignCategory(task.id, data.categoryId);
      }
      await this.showToast('Tarea actualizada', 'success');
    }
  }

  async openTaskOptions(task: Task): Promise<void> {
    const actionSheet = await this.actionSheetCtrl.create({
      header: task.title,
      buttons: [
        {
          text: 'Editar',
          icon: 'create-outline',
          handler: () => this.editTask(task),
        },
        {
          text: task.completed ? 'Marcar pendiente' : 'Marcar completada',
          icon: 'checkmark-done-outline',
          handler: () => this.toggleTask(task.id),
        },
        {
          text: 'Eliminar',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => this.deleteTask(task),
        },
        { text: 'Cancelar', role: 'cancel' },
      ],
    });
    await actionSheet.present();
  }

  async openAddTaskSheet(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddTaskModalComponent,
      breakpoints: [0, 0.6, 0.85],
      initialBreakpoint: 0.6,
      handle: true,
      cssClass: 'add-task-sheet',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.title) {
      this.taskService.addTask(data.title, data.categoryId ?? null);
      await this.showToast('Tarea agregada', 'success');
    }
  }

  // ─── PRIVADOS ─────────────────────────────────────────────────

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success',
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
