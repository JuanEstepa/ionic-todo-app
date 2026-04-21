/**
 * @file tabs.component.ts
 * @description Layout principal con tab bar — integrado con Remote Config.
 *
 * ── CAMBIO RESPECTO A LA VERSIÓN ANTERIOR ─────────────────────────────────
 *
 * Se inyecta RemoteConfigService y se expone su signal showCategoriesTab
 * directamente al template.
 *
 * El template usa @if (showCategoriesTab()) para mostrar u ocultar
 * el tab button de Categorías. Como es un Signal, Angular actualiza
 * la UI automáticamente si el valor cambia en tiempo de ejecución
 * sin necesidad de markForCheck() ni suscripciones manuales.
 */

import { Component, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkDoneOutline,
  addOutline,
  pricetagsOutline,
} from 'ionicons/icons';

import { TaskService } from '../../services/task';
import { RemoteConfigService } from '../../services/remote-config.service.ts';
import { AddTaskModalComponent } from '../../components/add-task-modal/add-task-modal.component';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.component.html',
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class TabsComponent {
  private readonly modalCtrl = inject(ModalController);
  private readonly taskService = inject(TaskService);

  /**
   * RemoteConfigService inyectado para leer el feature flag.
   * Se expone como readonly para que el template acceda al signal.
   */
  readonly remoteConfig = inject(RemoteConfigService);

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
