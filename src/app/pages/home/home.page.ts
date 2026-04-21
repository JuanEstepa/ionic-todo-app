import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
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
    IonHeader,
    IonToolbar,
    IonContent,
    IonFooter,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly alertCtrl = inject(AlertController);
  private readonly toastCtrl = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly modalCtrl = inject(ModalController);

  readonly selectedCategoryId = signal<string>('all');

  readonly allTasks = toSignal(this.taskService.getAllTasks(), {
    initialValue: [] as Task[],
  });
  readonly categories = toSignal(this.categoryService.getAllCategories(), {
    initialValue: [] as Category[],
  });

  readonly filteredTasks = computed(() => {
    const catId = this.selectedCategoryId();
    const tasks = this.allTasks();
    return catId === 'all'
      ? tasks
      : tasks.filter((t) => t.categoryId === catId);
  });

  readonly activeTasks = computed(() =>
    this.filteredTasks().filter((t) => !t.completed),
  );
  readonly completedTasks = computed(() =>
    this.filteredTasks().filter((t) => t.completed),
  );

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      createOutline,
      ellipsisVertical,
      checkmarkDoneOutline,
      pricetagsOutline,
    });
  }

  ngOnInit(): void {}

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

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

  getCategoryColor(categoryId: string | null): string {
    if (!categoryId) return '#9b98b8';
    return this.categoryService.getCategoryById(categoryId)?.color ?? '#9b98b8';
  }

  getCategoryName(categoryId: string | null): string {
    if (!categoryId) return '';
    return this.categoryService.getCategoryById(categoryId)?.name ?? '';
  }

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
