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
  private readonly modalCtrl = inject(ModalController);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  readonly remoteConfig = inject(RemoteConfigService);
  readonly categories = toSignal(this.categoryService.getAllCategories(), {
    initialValue: [] as Category[],
  });

  @Input() initialTitle = '';
  @Input() initialCategoryId: string | null = null;
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  taskTitle = '';
  selectedCategoryId: string | null = null;
  isEdit = false;

  ngOnInit(): void {
    this.taskTitle = this.initialTitle;
    this.selectedCategoryId = this.initialCategoryId;
    this.isEdit = !!this.initialTitle;
  }

  constructor() {
    addIcons({ pricetagOutline });
  }

  ionViewDidEnter(): void {
    setTimeout(() => this.titleInput.nativeElement.focus(), 100);
  }

  selectCategory(id: string | null): void {
    this.selectedCategoryId = id;
  }

  async goToCategories(): Promise<void> {
    await this.modalCtrl.dismiss();
    this.router.navigate(['/categories']);
  }

  async save(): Promise<void> {
    if (!this.taskTitle.trim()) return;
    await this.modalCtrl.dismiss({
      title: this.taskTitle.trim(),
      categoryId: this.selectedCategoryId,
    });
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(null);
  }
}
