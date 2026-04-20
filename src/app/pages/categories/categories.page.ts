import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonListHeader, IonItem, IonLabel, IonBadge,
  IonButton, IonButtons, IonIcon,
  IonItemSliding, IonItemOptions, IonItemOption,
  AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, pricetagsOutline } from 'ionicons/icons';

import { CategoryService, CATEGORY_COLORS } from '../../services/category';
import { TaskService } from '../../services/task';
import { Category } from '../../models/category.model';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonListHeader, IonItem, IonLabel, IonBadge,
    IonButton, IonButtons, IonIcon,
    IonItemSliding, IonItemOptions, IonItemOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage implements OnInit {

  private readonly categoryService = inject(CategoryService);
  private readonly taskService     = inject(TaskService);
  private readonly alertCtrl       = inject(AlertController);
  private readonly toastCtrl       = inject(ToastController);

  readonly categories = toSignal(
    this.categoryService.getAllCategories(),
    { initialValue: [] as Category[] }
  );

  private readonly allTasks = toSignal(
    this.taskService.getAllTasks(),
    { initialValue: [] }
  );

  readonly taskCountMap = computed(() => {
    const map = new Map<string, number>();
    for (const task of this.allTasks()) {
      if (task.categoryId) {
        map.set(task.categoryId, (map.get(task.categoryId) ?? 0) + 1);
      }
    }
    return map;
  });

  readonly availableColors = CATEGORY_COLORS;

  constructor() {
    addIcons({ addOutline, createOutline, trashOutline, pricetagsOutline });
  }

  ngOnInit(): void {}

  async openAddCategoryAlert(): Promise<void> {
    const colorInputs = this.availableColors.map((c, i) => ({
      type: 'radio' as const,
      label: c.label,
      value: c.value,
      checked: i === 0,
    }));

    const alert = await this.alertCtrl.create({
      header: 'Nueva categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Ej: Trabajo, Personal, Urgente...',
          attributes: { maxlength: 30 },
        },
        ...colorInputs,
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Crear',
          handler: (data) => {
            const name  = (data.name as string) ?? '';
            const color = typeof data === 'string' ? data : this.availableColors[0].value;
            const created = this.categoryService.addCategory(name, color);

            if (created) {
              this.showToast(`Categoría "${created.name}" creada`, 'success');
              return true;
            }
            this.showToast('Nombre inválido o ya existe esa categoría', 'warning');
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  async openEditCategoryAlert(category: Category): Promise<void> {
    const colorInputs = this.availableColors.map(c => ({
      type: 'radio' as const,
      label: c.label,
      value: c.value,
      checked: c.value === category.color,
    }));

    const alert = await this.alertCtrl.create({
      header: 'Editar categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category.name,
          placeholder: 'Nombre de la categoría',
          attributes: { maxlength: 30 },
        },
        ...colorInputs,
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            const name  = (data.name as string) ?? '';
            const color = typeof data === 'string' ? data : category.color;
            const updated = this.categoryService.updateCategory(category.id, name, color);

            if (updated) {
              this.showToast('Categoría actualizada', 'success');
              return true;
            }
            this.showToast('Nombre inválido o ya existe', 'warning');
            return false;
          },
        },
      ],
    });
    await alert.present();
  }

  async confirmDeleteCategory(category: Category): Promise<void> {
    const count   = this.taskCountMap().get(category.id) ?? 0;
    const taskMsg = count > 0
      ? `\n\n⚠️ ${count} tarea(s) perderán esta categoría.`
      : '';

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

  getTaskCount(categoryId: string): number {
    return this.taskCountMap().get(categoryId) ?? 0;
  }

  trackById(_: number, cat: Category): string {
    return cat.id;
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning' = 'success'
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