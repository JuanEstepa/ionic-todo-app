import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonContent, IonFooter, IonIcon,
  AlertController, ToastController, ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, trashOutline, pricetagsOutline, checkmarkDoneOutline } from 'ionicons/icons';

import { CategoryService } from '../../services/category';
import { TaskService } from '../../services/task';
import { Category } from '../../models/category.model';
import { AddCategoryModalComponent } from '../../components/add-category-modal/add-category-modal.component';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriesPage implements OnInit {

  private readonly categoryService = inject(CategoryService);
  private readonly taskService     = inject(TaskService);
  private readonly alertCtrl       = inject(AlertController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly modalCtrl       = inject(ModalController);

  readonly categories = toSignal(
    this.categoryService.getAllCategories(),
    { initialValue: [] as Category[] }
  );

  private readonly allTasks = toSignal(this.taskService.getAllTasks(), { initialValue: [] });

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
    addIcons({ addOutline, createOutline, trashOutline, pricetagsOutline, checkmarkDoneOutline });
  }

  ngOnInit(): void {}

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

  async openEditCategoryModal(category: Category): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddCategoryModalComponent,
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
      handle: true,
      cssClass: 'add-category-modal',
      componentProps: {
        initialName:  category.name,
        initialColor: category.color,
      },
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.name) {
      const updated = this.categoryService.updateCategory(category.id, data.name, data.color);
      if (updated) {
        this.showToast('Categoría actualizada', 'success');
      } else {
        this.showToast('Nombre inválido o ya existe', 'warning');
      }
    }
  }

  async confirmDeleteCategory(category: Category): Promise<void> {
    const count   = this.taskCountMap().get(category.id) ?? 0;
    const taskMsg = count > 0 ? `\n\n${count} tarea(s) perderán esta categoría.` : '';

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

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }
}