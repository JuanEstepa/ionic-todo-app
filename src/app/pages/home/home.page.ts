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
import { RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
  IonList, IonItem, IonLabel, IonBadge, IonChip,
  IonButton, IonButtons, IonIcon, IonInput, IonCheckbox,
  IonSegment, IonSegmentButton, IonItemSliding,
  IonItemOptions, IonItemOption,
  AlertController, ToastController, ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, trashOutline, createOutline, ellipsisVertical,
  checkmarkDoneOutline, pricetagOutline,
} from 'ionicons/icons';

import { TaskService } from '../../services/task';
import { CategoryService } from '../../services/category';
import { Task } from '../../models/task.model';
import { Category } from '../../models/category.model';

type StatusFilter = 'all' | 'pending' | 'completed';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonFooter,
    IonList, IonItem, IonLabel, IonBadge, IonChip,
    IonButton, IonButtons, IonIcon, IonInput, IonCheckbox,
    IonSegment, IonSegmentButton, IonItemSliding,
    IonItemOptions, IonItemOption, RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {

  private readonly taskService     = inject(TaskService);
  private readonly categoryService = inject(CategoryService);
  private readonly alertCtrl       = inject(AlertController);
  private readonly toastCtrl       = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);

  readonly selectedCategoryId = signal<string>('all');
  readonly selectedStatus = signal<StatusFilter>('all');

  newTaskTitle = '';

  readonly allTasks    = toSignal(this.taskService.getAllTasks(),    { initialValue: [] as Task[] });
  readonly categories  = toSignal(this.categoryService.getAllCategories(), { initialValue: [] as Category[] });
  readonly pendingCount = this.taskService.pendingCount;

  readonly filteredTasks = computed(() => {
    let tasks = this.allTasks();

    const catId = this.selectedCategoryId();
    if (catId !== 'all') {
      tasks = tasks.filter(t => t.categoryId === catId);
    }

    const status = this.selectedStatus();
    if (status === 'pending')   tasks = tasks.filter(t => !t.completed);
    if (status === 'completed') tasks = tasks.filter(t => t.completed);

    return tasks;
  });

  constructor() {
    addIcons({
      addOutline, trashOutline, createOutline,
      ellipsisVertical, checkmarkDoneOutline, pricetagOutline,
    });
  }

  ngOnInit(): void {}

  onCategoryChange(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

  onStatusChange(status: StatusFilter): void {
    this.selectedStatus.set(status);
  }

  async addTask(): Promise<void> {
    const result = this.taskService.addTask(
      this.newTaskTitle,
      this.selectedCategoryId() === 'all' ? null : this.selectedCategoryId()
    );

    if (result) {
      this.newTaskTitle = '';
      await this.showToast('Tarea agregada', 'success');
    } else {
      await this.showToast('Escribe un nombre para la tarea', 'warning');
    }
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
            this.showToast('Tarea eliminada', 'danger');
          },
        },
      ],
    });
    await alert.present();
  }

  async editTask(task: Task): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Editar tarea',
      inputs: [
        {
          name: 'title',
          type: 'text',
          value: task.title,
          placeholder: 'Nombre de la tarea',
        },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: (data) => {
            if (this.taskService.updateTaskTitle(task.id, data.title)) {
              this.showToast('Tarea actualizada', 'success');
            }
          },
        },
      ],
    });
    await alert.present();
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
          text: 'Cambiar categoría',
          icon: 'pricetag-outline',
          handler: () => this.changeCategoryAlert(task),
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

  async changeCategoryAlert(task: Task): Promise<void> {
    const categories = this.categoryService.getCategoriesSnapshot();

    const inputs = [
      {
        type: 'radio' as const,
        label: 'Sin categoría',
        value: null,
        checked: task.categoryId === null,
      },
      ...categories.map(cat => ({
        type: 'radio' as const,
        label: cat.name,
        value: cat.id,
        checked: task.categoryId === cat.id,
      })),
    ];

    const alert = await this.alertCtrl.create({
      header: 'Seleccionar categoría',
      inputs,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Asignar',
          handler: (categoryId) => {
            this.taskService.assignCategory(task.id, categoryId ?? null);
            this.showToast('Categoría actualizada', 'success');
          },
        },
      ],
    });
    await alert.present();
  }

  async clearCompleted(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Limpiar completadas',
      message: '¿Eliminar todas las tareas completadas?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar todas',
          role: 'destructive',
          handler: () => {
            this.taskService.clearCompleted();
            this.showToast('Tareas completadas eliminadas', 'danger');
          },
        },
      ],
    });
    await alert.present();
  }

  trackById(_: number, task: Task): string {
    return task.id;
  }

  getCategoryColor(categoryId: string | null): string {
    if (!categoryId) return '#92949c';
    return this.categoryService.getCategoryById(categoryId)?.color ?? '#92949c';
  }

  getCategoryName(categoryId: string | null): string {
    if (!categoryId) return '';
    return this.categoryService.getCategoryById(categoryId)?.name ?? '';
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