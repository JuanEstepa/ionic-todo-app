import { Component } from '@angular/core';
import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonFab, IonFabButton,
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { checkmarkDoneOutline, addOutline, pricetagsOutline } from 'ionicons/icons';
import { ModalController } from '@ionic/angular/standalone';
import { AddTaskModalComponent } from '../../components/add-task-modal/add-task-modal.component';
import { TaskService } from '../../services/task';
import { inject } from '@angular/core';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsComponent {
  private readonly modalCtrl   = inject(ModalController);
  private readonly taskService = inject(TaskService);

  constructor() {
    addIcons({ checkmarkDoneOutline, addOutline, pricetagsOutline });
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
    }
  }
}