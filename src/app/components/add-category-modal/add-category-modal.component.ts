import {
  Component,
  Input,
  ChangeDetectionStrategy,
  inject,
  ViewChild,
  ElementRef,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-add-category-modal',
  templateUrl: './add-category-modal.component.html',
  styleUrls: ['./add-category-modal.component.scss'],
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCategoryModalComponent implements OnInit {
  // Cuando se usa para editar, se pasan los valores actuales
  @Input() initialName = '';
  @Input() initialColor = '#3d3580';
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  private readonly modalCtrl = inject(ModalController);

  categoryName = '';
  selectedColor = '#3d3580';
  isEdit = false;

  ngOnInit(): void {
    this.categoryName = this.initialName;
    this.selectedColor = this.initialColor;
    this.isEdit = !!this.initialName;
  }

  onColorInput(event: Event): void {
    this.selectedColor = (event.target as HTMLInputElement).value;
  }

  async save(): Promise<void> {
    if (!this.categoryName.trim()) return;
    await this.modalCtrl.dismiss({
      name: this.categoryName.trim(),
      color: this.selectedColor,
    });
  }

  async cancel(): Promise<void> {
    await this.modalCtrl.dismiss(null);
  }

  ionViewDidEnter(): void {
    setTimeout(() => this.titleInput.nativeElement.focus(), 100);
  }
}
