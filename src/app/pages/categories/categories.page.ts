/**
 * @file categories.page.ts
 * @description Página de gestión de categorías.
 *
 * Permite al usuario crear, editar y eliminar categorías que se asignan
 * a las tareas. Cada categoría tiene nombre y color personalizable.
 *
 * ── PATRONES USADOS ───────────────────────────────────────────────────────
 *
 * - Standalone component con imports explícitos (sin NgModule).
 * - ChangeDetectionStrategy.OnPush: Angular solo re-renderiza cuando
 *   un Signal leído en el template cambia de valor.
 * - toSignal(): convierte los Observables de los servicios en Signals
 *   que el template lee directamente sin async pipe.
 * - taskCountMap: computed() que construye un Map<categoryId, count>
 *   una sola vez cuando las tareas cambian, en lugar de recorrer el
 *   array en cada render por cada categoría mostrada.
 * - Modales como bottom sheets: AddCategoryModalComponent se abre
 *   con breakpoints para una experiencia nativa en móvil.
 */

import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  trashOutline,
  pricetagsOutline,
  checkmarkDoneOutline,
} from 'ionicons/icons';

import { CategoryService } from '../../services/category';
import { TaskService } from '../../services/task';
import { Category } from '../../models/category.model';
import { AddCategoryModalComponent } from '../../components/add-category-modal/add-category-modal.component';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonContent, IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage implements OnInit {
  // ─── DEPENDENCIAS ─────────────────────────────────────────────
  private readonly categoryService = inject(CategoryService);
  private readonly taskService = inject(TaskService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly modalCtrl = inject(ModalController);

  // ─── SIGNALS DE DATOS ─────────────────────────────────────────

  /** Lista reactiva de categorías — se actualiza automáticamente al cambiar */
  readonly categories = toSignal(this.categoryService.getAllCategories(), {
    initialValue: [] as Category[],
  });

  /** Lista de tareas usada solo para calcular conteos por categoría */
  private readonly allTasks = toSignal(this.taskService.getAllTasks(), {
    initialValue: [],
  });

  // ─── COMPUTED ─────────────────────────────────────────────────

  /**
   * Map<categoryId, cantidad de tareas> calculado una sola vez
   * cuando allTasks() cambia. Permite que getTaskCount() sea O(1)
   * en lugar de recorrer el array completo por cada categoría renderizada.
   */
  readonly taskCountMap = computed(() => {
    const map = new Map<string, number>();
    for (const task of this.allTasks()) {
      if (task.categoryId) {
        map.set(task.categoryId, (map.get(task.categoryId) ?? 0) + 1);
      }
    }
    return map;
  });

  constructor() {
    addIcons({
      addOutline,
      createOutline,
      trashOutline,
      pricetagsOutline,
      checkmarkDoneOutline,
    });
  }

  ngOnInit(): void {}

  // ─── ACCIONES ─────────────────────────────────────────────────

  /**
   * Abre el modal de creación de categoría como bottom sheet.
   * Si el usuario guarda, delega la creación al CategoryService.
   */
  async openAddCategoryModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddCategoryModalComponent,
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
      handle: true,
      cssClass: 'add-category-modal',
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.name) {
      const created = this.categoryService.addCategory(data.name, data.color);
      if (created) {
        this.showToast(`Categoría "${created.name}" creada`, 'success');
      } else {
        this.showToast('Nombre inválido o ya existe', 'warning');
      }
    }
  }

  /**
   * Abre el modal de edición pre-rellenado con los datos actuales
   * de la categoría. Si el usuario guarda, delega la actualización
   * al CategoryService.
   *
   * @param category - Categoría a editar
   */
  async openEditCategoryModal(category: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddCategoryModalComponent,
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
      handle: true,
      cssClass: 'add-category-modal',
      componentProps: {
        initialName: category.name,
        initialColor: category.color,
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.name) {
      const updated = this.categoryService.updateCategory(
        category.id,
        data.name,
        data.color,
      );
      if (updated) {
        this.showToast('Categoría actualizada', 'success');
      } else {
        this.showToast('Nombre inválido o ya existe', 'warning');
      }
    }
  }

  /**
   * Muestra un Alert de confirmación antes de eliminar la categoría.
   * Informa cuántas tareas perderán la categoría (no se borran las tareas).
   *
   * @param category - Categoría a eliminar
   */
  async confirmDeleteCategory(category: Category): Promise<void> {
    const count = this.taskCountMap().get(category.id) ?? 0;
    const taskMsg =
      count > 0 ? `\n\n${count} tarea(s) perderán esta categoría.` : '';

    const alert = await this.alertCtrl.create({
      header: 'Eliminar categoría',
      message: `¿Eliminar "${category.name}"?${taskMsg}`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.categoryService.deleteCategory(category.id);
            this.showToast(`Categoría "${category.name}" eliminada`, 'danger');
          },
        },
      ],
    });
    await alert.present();
  }

  // ─── HELPERS PARA EL TEMPLATE ─────────────────────────────────

  /**
   * Retorna el número de tareas de una categoría leyendo el Map computado.
   * O(1) gracias a taskCountMap.
   *
   * @param categoryId - ID de la categoría
   */
  getTaskCount(categoryId: string): number {
    return this.taskCountMap().get(categoryId) ?? 0;
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
